<?php
// api/doctor/appointments.php
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
require_once '../../models/Doctor.php';
require_once '../../models/Appointment.php';
require_once '../../models/User.php';
require_once '../../models/Queue.php';

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

// التحقق من أن المستخدم هو دكتور
$userModel = new User($db);
$user = $userModel->findByID($userID);

if (!$user || $user['userType'] !== 'doctor') {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "Access denied. Doctor account required."
    ]);
    exit;
}

// جلب doctorID من userID
$doctorModel = new Doctor($db);
$doctor = $doctorModel->findByUserID($userID);

if (!$doctor) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Doctor profile not found"
    ]);
    exit;
}

$appointmentModel = new Appointment($db);
$queueModel = new Queue($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // جلب مواعيد الطبيب
        $date = $_GET['date'] ?? null;
        $status = $_GET['status'] ?? null;

        $appointments = $appointmentModel->getByDoctor($doctor['doctorID'], $date, $status);

        // تنسيق البيانات للإرجاع مع إضافة معلومات قائمة الانتظار
        $formattedAppointments = [];
        foreach ($appointments as $app) {
            // جلب موقع المريض في قائمة الانتظار إذا كان موجوداً
            $queuePosition = null;
            if ($app['status'] === 'checked-in' || $app['status'] === 'waiting') {
                $queueData = $queueModel->getPatientPosition($app['patientID']);
                if ($queueData && $queueData['inQueue']) {
                    $queuePosition = $queueData['position'];
                }
            }

            $formattedAppointments[] = [
                'appointmentID' => $app['appointmentID'],
                'patientID' => $app['patientID'],
                'patientName' => $app['patientName'] ?? 'Unknown',
                'appointmentDate' => $app['appointmentDate'],
                'status' => $app['status'],
                'type' => $app['type'],
                'reason' => $app['reason'],
                'queuePosition' => $queuePosition,
                'queueStatus' => $app['queueStatus'] ?? null,
                'actualWaitTime' => $app['actualWaitTime'] ?? null
            ];
        }

        echo json_encode([
            "success" => true,
            "data" => $formattedAppointments,
            "count" => count($formattedAppointments)
        ]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? null;

        // تحديث حالة الموعد
        if ($action === 'update-status') {
            if (empty($input['appointmentID']) || empty($input['status'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Appointment ID and status are required"
                ]);
                exit;
            }

            // التحقق من أن الموعد يخص هذا الطبيب
            $appointment = $appointmentModel->findByID($input['appointmentID']);
            if (!$appointment || $appointment['doctorID'] != $doctor['doctorID']) {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "error" => "You don't have permission to update this appointment"
                ]);
                exit;
            }

            $validStatuses = ['confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];
            if (!in_array($input['status'], $validStatuses)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Invalid status"
                ]);
                exit;
            }

            $updated = $appointmentModel->updateStatus($input['appointmentID'], $input['status']);

            // إذا كانت الحالة 'in-progress' أو 'completed'، تحديث قائمة الانتظار
            if ($updated && ($input['status'] === 'in-progress' || $input['status'] === 'completed')) {
                // العثور على queueID المرتبط بهذا الموعد
                $queueQuery = "SELECT queueID FROM queue WHERE appointmentID = :appointmentID";
                $queueStmt = $db->prepare($queueQuery);
                $queueStmt->bindParam(':appointmentID', $input['appointmentID']);
                $queueStmt->execute();
                $queueResult = $queueStmt->fetch();

                if ($queueResult) {
                    $queueModel->updateStatus(
                        $queueResult['queueID'],
                        $input['status'] === 'in-progress' ? 'in-consultation' : 'completed'
                    );
                }
            }

            if ($updated) {
                echo json_encode([
                    "success" => true,
                    "message" => "Appointment status updated to " . $input['status']
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "error" => "Failed to update appointment status"
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid action"
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
