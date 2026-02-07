<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../config/database.php';
require_once '../models/Appointment.php';
require_once '../controllers/AuthController.php';

$database = new Database();
$db = $database->getConnection();

$appointment = new Appointment($db);
$authController = new AuthController($db);

$method = $_SERVER['REQUEST_METHOD'];

// التحقق من التوكن للطلبات التي تحتاج مصادقة
if ($method !== 'GET' || isset($_GET['patientID']) || isset($_GET['doctorID'])) {
    try {
        $authController->verifyToken();
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(["error" => $e->getMessage()]);
        exit;
    }
}

switch ($method) {
    case 'GET':
        // جلب موعد محدد
        if (isset($_GET['appointmentID'])) {
            $appointmentData = $appointment->findByID($_GET['appointmentID']);

            if ($appointmentData) {
                echo json_encode([
                    "success" => true,
                    "appointment" => $appointmentData
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Appointment not found"]);
            }
        }
        // جلب مواعيد المريض
        elseif (isset($_GET['patientID'])) {
            $status = isset($_GET['status']) ? $_GET['status'] : null;
            $appointments = $appointment->getByPatient($_GET['patientID'], $status);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments,
                "count" => count($appointments)
            ]);
        }
        // جلب مواعيد الطبيب
        elseif (isset($_GET['doctorID'])) {
            $date = isset($_GET['date']) ? $_GET['date'] : null;
            $status = isset($_GET['status']) ? $_GET['status'] : null;
            $appointments = $appointment->getByDoctor($_GET['doctorID'], $date, $status);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments,
                "count" => count($appointments)
            ]);
        }
        // جلب المواعيد القادمة
        else {
            $doctorID = isset($_GET['doctor']) ? $_GET['doctor'] : null;
            $patientID = isset($_GET['patient']) ? $_GET['patient'] : null;
            $days = isset($_GET['days']) ? intval($_GET['days']) : 7;

            $appointments = $appointment->getUpcoming($doctorID, $patientID, $days);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments,
                "count" => count($appointments)
            ]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        // إنشاء موعد جديد
        if (isset($data->action) && $data->action === 'book') {
            $appointmentData = [
                'patientID' => $data->patientID,
                'doctorID' => $data->doctorID,
                'appointmentDate' => $data->appointmentDate,
                'status' => 'scheduled',
                'type' => $data->type ?? 'consultation',
                'reason' => $data->reason ?? '',
                'notes' => $data->notes ?? ''
            ];

            $appointmentID = $appointment->create($appointmentData);

            if ($appointmentID) {
                // إنشاء تسجيل في قائمة الانتظار
                $this->createQueueEntry($appointmentID, $data->doctorID, $data->patientID);

                echo json_encode([
                    "success" => true,
                    "message" => "Appointment booked successfully",
                    "appointmentID" => $appointmentID
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to book appointment"]);
            }
        }
        // تحديث حالة الموعد
        elseif (isset($data->action) && $data->action === 'update-status') {
            $result = $appointment->updateStatus($data->appointmentID, $data->status);

            if ($result) {
                echo json_encode([
                    "success" => true,
                    "message" => "Appointment status updated"
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to update appointment"]);
            }
        }
        // إلغاء الموعد
        elseif (isset($data->action) && $data->action === 'cancel') {
            $result = $appointment->cancel($data->appointmentID, $data->reason ?? null);

            if ($result) {
                // تحديث قائمة الانتظار
                $this->updateQueueStatus($data->appointmentID, 'cancelled');

                echo json_encode([
                    "success" => true,
                    "message" => "Appointment cancelled successfully"
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to cancel appointment"]);
            }
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

// دالة مساعدة لإنشاء تسجيل في قائمة الانتظار
function createQueueEntry($appointmentID, $doctorID, $patientID)
{
    global $db;

    // حساب موقع جديد في قائمة الانتظار
    $query = "SELECT COALESCE(MAX(queuePosition), 0) + 1 as newPosition 
              FROM Queue 
              WHERE DATE(created_at) = CURDATE()";

    $stmt = $db->prepare($query);
    $stmt->execute();
    $result = $stmt->fetch();
    $newPosition = $result['newPosition'];

    // تقدير وقت الانتظار (15 دقيقة لكل مريض)
    $estimatedWaitTime = $newPosition * 15;

    $queueID = 'QUE_' . uniqid() . '_' . time();

    $query = "INSERT INTO Queue 
              (queueID, appointmentID, queuePosition, estimatedWaitTime, status, priority) 
              VALUES (:queueID, :appointmentID, :queuePosition, :estimatedWaitTime, 'waiting', 'normal')";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":queueID", $queueID);
    $stmt->bindParam(":appointmentID", $appointmentID);
    $stmt->bindParam(":queuePosition", $newPosition);
    $stmt->bindParam(":estimatedWaitTime", $estimatedWaitTime);

    return $stmt->execute();
}

// دالة مساعدة لتحديث حالة قائمة الانتظار
function updateQueueStatus($appointmentID, $status)
{
    global $db;

    $query = "UPDATE Queue SET status = :status WHERE appointmentID = :appointmentID";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":appointmentID", $appointmentID);
    $stmt->bindParam(":status", $status);

    return $stmt->execute();
}
