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
        // حجز موعد جديد
        $input = json_decode(file_get_contents('php://input'), true);

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
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "error" => "Method not allowed"
        ]);
}
