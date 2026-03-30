<?php
// api/patient/appointments.php

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Appointment.php';
require_once '../../models/Patient.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من التوكن
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

if (empty($token)) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Token is required"
    ]);
    exit;
}

// فك تشفير التوكن
try {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception("Invalid token format");
    }

    $payload = json_decode(base64_decode($parts[1]), true);

    if (!$payload || !isset($payload['userID'])) {
        throw new Exception("Invalid token payload");
    }

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        throw new Exception("Token has expired");
    }

    $userID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Authentication failed: " . $e->getMessage()
    ]);
    exit;
}

// جلب patientID من userID
$patientModel = new Patient($db);
$patient = $patientModel->findByUserID($userID);

if (!$patient) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Patient profile not found"
    ]);
    exit;
}

$appointmentModel = new Appointment($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // جلب مواعيد المريض
        $status = $_GET['status'] ?? null;
        $appointments = $appointmentModel->getByPatient($patient['patientID'], $status);

        // تنسيق البيانات للإرجاع
        $formattedAppointments = [];
        foreach ($appointments as $app) {
            $formattedAppointments[] = [
                'appointmentID' => $app['appointmentID'],
                'appointmentDate' => $app['appointmentDate'],
                //'appointmentDate' => date('c', strtotime($app['appointmentDate'])),
                //'appointmentDate' => gmdate('c', strtotime($app['appointmentDate'])),
                'status' => $app['status'],
                'type' => $app['type'],
                'reason' => $app['reason'],
                'doctorName' => $app['doctorName'] ?? 'Unknown',
                'department' => $app['specialization'] ?? 'General',
                'doctorID' => $app['doctorID']
            ];
        }

        echo json_encode([
            "success" => true,
            "appointments" => $formattedAppointments
        ]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);

        // التحقق من وجود إجراء
        $action = isset($input['action']) ? $input['action'] : null;

        // ========== حجز موعد جديد ==========
        if (!$action) {
            // التحقق من البيانات المطلوبة
            $required = ['doctorID', 'appointmentDate', 'type', 'reason'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode([
                        "success" => false,
                        "error" => ucfirst($field) . " is required"
                    ]);
                    exit;
                }
            }

            // التحقق من صحة التاريخ
            $appointmentDateTime = $input['appointmentDate'];
            if (isset($input['appointmentTime']) && !empty($input['appointmentTime'])) {
                $appointmentDateTime = $input['appointmentDate'] . ' ' . $input['appointmentTime'];
            }

            // التحقق من عدم حجز موعد مكرر
            $existingAppointments = $appointmentModel->getByPatient($patient['patientID'], 'scheduled');
            foreach ($existingAppointments as $existing) {
                if ($existing['appointmentDate'] == $appointmentDateTime) {
                    http_response_code(400);
                    echo json_encode([
                        "success" => false,
                        "error" => "You already have an appointment at this time"
                    ]);
                    exit;
                }
            }

            $appointmentData = [
                'patientID' => $patient['patientID'],
                'doctorID' => $input['doctorID'],
                'appointmentDate' => $appointmentDateTime,
                'type' => $input['type'],
                'reason' => $input['reason'],
                'notes' => $input['notes'] ?? '',
                'status' => 'scheduled'
            ];

            $appointmentID = $appointmentModel->create($appointmentData);

            if ($appointmentID) {
                // تسجيل النشاط
                try {
                    $logQuery = "INSERT INTO SystemLogs (userID, actionType, actionDescription, entityType, entityID) 
                                VALUES (:userID, 'appointment_booking', 'Booked new appointment', 'appointment', :appointmentID)";
                    $logStmt = $db->prepare($logQuery);
                    $logStmt->bindParam(':userID', $userID);
                    $logStmt->bindParam(':appointmentID', $appointmentID);
                    $logStmt->execute();
                } catch (Exception $e) {
                    // فشل التسجيل لا يمنع نجاح الحجز
                }

                echo json_encode([
                    "success" => true,
                    "message" => "Appointment booked successfully",
                    "appointmentID" => $appointmentID
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "error" => "Failed to book appointment"
                ]);
            }
        }

        // ========== إلغاء موعد مع حذفه من قائمة الانتظار ==========
        elseif ($action === 'cancel') {
            if (empty($input['appointmentID'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Appointment ID is required"
                ]);
                exit;
            }

            // التحقق من أن الموعد يخص هذا المريض
            $appointment = $appointmentModel->findByID($input['appointmentID']);
            if (!$appointment || $appointment['patientID'] != $patient['patientID']) {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "error" => "You don't have permission to cancel this appointment"
                ]);
                exit;
            }

            // بدء معاملة قاعدة بيانات لضمان تنفيذ جميع العمليات بنجاح
            $db->beginTransaction();

            try {
                // 1. التحقق مما إذا كان الموعد في قائمة الانتظار
                $queueQuery = "SELECT queueID FROM Queue WHERE appointmentID = :appointmentID AND status IN ('waiting', 'checked-in')";
                $queueStmt = $db->prepare($queueQuery);
                $queueStmt->bindParam(':appointmentID', $input['appointmentID']);
                $queueStmt->execute();

                $inQueue = $queueStmt->rowCount() > 0;

                if ($inQueue) {
                    // 2. إزالة من قائمة الانتظار
                    $deleteQueueQuery = "DELETE FROM Queue WHERE appointmentID = :appointmentID";
                    $deleteQueueStmt = $db->prepare($deleteQueueQuery);
                    $deleteQueueStmt->bindParam(':appointmentID', $input['appointmentID']);
                    $deleteQueueStmt->execute();

                    // 3. إعادة ترقيم قائمة الانتظار للأطباء المتأثرين
                    // نستخدم استعلام JOIN للحصول على doctorID من جدول Appointments
                    $updatePositionsQuery = "UPDATE Queue q
                                            INNER JOIN Appointments a ON q.appointmentID = a.appointmentID
                                            SET q.queuePosition = (
                                                SELECT COUNT(*) FROM Queue q2
                                                INNER JOIN Appointments a2 ON q2.appointmentID = a2.appointmentID
                                                WHERE a2.doctorID = a.doctorID
                                                AND q2.checkInTime < q.checkInTime
                                            )
                                            WHERE a.doctorID = (SELECT doctorID FROM Appointments WHERE appointmentID = :appointmentID)";

                    $updatePositionsStmt = $db->prepare($updatePositionsQuery);
                    $updatePositionsStmt->bindParam(':appointmentID', $input['appointmentID']);
                    $updatePositionsStmt->execute();
                }

                // 4. تحديث حالة الموعد إلى 'cancelled'
                $cancelled = $appointmentModel->updateStatus($input['appointmentID'], 'cancelled');

                if (!$cancelled) {
                    throw new Exception("Failed to cancel appointment");
                }

                // 5. تسجيل النشاط
                $logQuery = "INSERT INTO SystemLogs (userID, actionType, actionDescription, entityType, entityID) 
                            VALUES (:userID, 'appointment_cancelled', 'Cancelled appointment and removed from queue', 'appointment', :appointmentID)";
                $logStmt = $db->prepare($logQuery);
                $logStmt->bindParam(':userID', $userID);
                $logStmt->bindParam(':appointmentID', $input['appointmentID']);
                $logStmt->execute();

                // تأكيد المعاملة
                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => $inQueue ?
                        "Appointment cancelled successfully and removed from queue" :
                        "Appointment cancelled successfully"
                ]);
            } catch (Exception $e) {
                // في حالة وجود خطأ، التراجع عن جميع التغييرات
                $db->rollBack();

                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "error" => "Failed to cancel appointment: " . $e->getMessage()
                ]);
            }
        }

        // ========== تحديث موعد مع تحديث قائمة الانتظار إذا لزم الأمر ==========
        elseif ($action === 'update') {
            if (empty($input['appointmentID'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Appointment ID is required"
                ]);
                exit;
            }

            // التحقق من البيانات المطلوبة
            $required = ['doctorID', 'appointmentDate', 'type', 'reason'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode([
                        "success" => false,
                        "error" => ucfirst($field) . " is required"
                    ]);
                    exit;
                }
            }

            // التحقق من أن الموعد يخص هذا المريض
            $appointment = $appointmentModel->findByID($input['appointmentID']);
            if (!$appointment || $appointment['patientID'] != $patient['patientID']) {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "error" => "You don't have permission to update this appointment"
                ]);
                exit;
            }

            // التحقق من أن الموعد ليس مكتملاً أو ملغى
            if ($appointment['status'] === 'completed') {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Cannot update a completed appointment"
                ]);
                exit;
            }

            if ($appointment['status'] === 'cancelled') {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Cannot update a cancelled appointment"
                ]);
                exit;
            }

            // التحقق من صحة التاريخ
            $appointmentDateTime = $input['appointmentDate'];
            if (isset($input['appointmentTime']) && !empty($input['appointmentTime'])) {
                $appointmentDateTime = $input['appointmentDate'] . ' ' . $input['appointmentTime'];
            }

            // التحقق من عدم وجود تعارض مع موعد آخر (باستثناء هذا الموعد نفسه)
            $existingAppointments = $appointmentModel->getByPatient($patient['patientID'], 'scheduled');
            foreach ($existingAppointments as $existing) {
                if ($existing['appointmentID'] != $input['appointmentID'] && $existing['appointmentDate'] == $appointmentDateTime) {
                    http_response_code(400);
                    echo json_encode([
                        "success" => false,
                        "error" => "You already have another appointment at this time"
                    ]);
                    exit;
                }
            }

            // بدء معاملة قاعدة البيانات
            $db->beginTransaction();

            try {
                // تحديث الموعد
                $updateSuccess = $appointmentModel->update($input['appointmentID'], [
                    'doctorID' => $input['doctorID'],
                    'appointmentDate' => $appointmentDateTime,
                    'type' => $input['type'],
                    'reason' => $input['reason'],
                    'notes' => $input['notes'] ?? ''
                ]);

                if (!$updateSuccess) {
                    throw new Exception("Failed to update appointment");
                }

                // إذا كان الموعد في قائمة الانتظار، قم بتحديث معلوماته
                $queueQuery = "SELECT queueID FROM Queue WHERE appointmentID = :appointmentID";
                $queueStmt = $db->prepare($queueQuery);
                $queueStmt->bindParam(':appointmentID', $input['appointmentID']);
                $queueStmt->execute();

                if ($queueStmt->rowCount() > 0) {
                    // تحديث معلومات الموعد في قائمة الانتظار
                    $updateQueueQuery = "UPDATE Queue 
                                        SET estimatedStartTime = :appointmentDate
                                        WHERE appointmentID = :appointmentID";
                    $updateQueueStmt = $db->prepare($updateQueueQuery);
                    $updateQueueStmt->bindParam(':appointmentDate', $appointmentDateTime);
                    $updateQueueStmt->bindParam(':appointmentID', $input['appointmentID']);
                    $updateQueueStmt->execute();
                }

                // تسجيل النشاط
                $logQuery = "INSERT INTO SystemLogs (userID, actionType, actionDescription, entityType, entityID) 
                            VALUES (:userID, 'appointment_updated', 'Updated appointment', 'appointment', :appointmentID)";
                $logStmt = $db->prepare($logQuery);
                $logStmt->bindParam(':userID', $userID);
                $logStmt->bindParam(':appointmentID', $input['appointmentID']);
                $logStmt->execute();

                // تأكيد المعاملة
                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Appointment updated successfully"
                ]);
            } catch (Exception $e) {
                // في حالة وجود خطأ، التراجع عن جميع التغييرات
                $db->rollBack();

                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "error" => "Failed to update appointment: " . $e->getMessage()
                ]);
            }
        }

        // ========== إجراء غير معروف ==========
        else {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid action. Supported actions: cancel, update"
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "error" => "Method not allowed"
        ]);
}
