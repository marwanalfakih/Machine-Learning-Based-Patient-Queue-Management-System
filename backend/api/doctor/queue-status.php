<?php
// api/doctor/queue-status.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Doctor.php';
require_once '../../models/Queue.php';
require_once '../../models/Appointment.php';
require_once '../../models/User.php';

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
    $payload = json_decode(base64_decode($parts[1]), true);
    $userID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Authentication failed"
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

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed"
    ]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action === 'start-consultation') {
    // بدء استشارة لمريض
    $queueID = $input['queueID'] ?? '';
    $appointmentID = $input['appointmentID'] ?? '';

    if (!$queueID || !$appointmentID) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Queue ID and Appointment ID are required"
        ]);
        exit;
    }

    // التحقق من أن الموعد يخص هذا الطبيب
    $checkQuery = "SELECT appointmentID FROM appointments 
                   WHERE appointmentID = :appointmentID AND doctorID = :doctorID";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':appointmentID', $appointmentID);
    $checkStmt->bindParam(':doctorID', $doctor['doctorID']);
    $checkStmt->execute();

    if (!$checkStmt->fetch()) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "error" => "You don't have permission to update this appointment"
        ]);
        exit;
    }

    // تحديث حالة الموعد
    $updateAppointment = "UPDATE appointments SET status = 'in-progress' WHERE appointmentID = :appointmentID";
    $appStmt = $db->prepare($updateAppointment);
    $appStmt->bindParam(':appointmentID', $appointmentID);
    $appStmt->execute();

    // تحديث حالة قائمة الانتظار
    $updateQueue = "UPDATE queue SET status = 'in-consultation' WHERE queueID = :queueID";
    $queueStmt = $db->prepare($updateQueue);
    $queueStmt->bindParam(':queueID', $queueID);
    $queueStmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Consultation started successfully"
    ]);
} elseif ($action === 'complete-consultation') {
    // إنهاء استشارة مريض
    $queueID = $input['queueID'] ?? '';
    $appointmentID = $input['appointmentID'] ?? '';
    $actualWaitTime = $input['actualWaitTime'] ?? null;

    if (!$queueID || !$appointmentID) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Queue ID and Appointment ID are required"
        ]);
        exit;
    }

    // التحقق من أن الموعد يخص هذا الطبيب
    $checkQuery = "SELECT appointmentID FROM appointments 
                   WHERE appointmentID = :appointmentID AND doctorID = :doctorID";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':appointmentID', $appointmentID);
    $checkStmt->bindParam(':doctorID', $doctor['doctorID']);
    $checkStmt->execute();

    if (!$checkStmt->fetch()) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "error" => "You don't have permission to update this appointment"
        ]);
        exit;
    }

    // تحديث حالة الموعد
    $updateAppointment = "UPDATE appointments SET status = 'completed' WHERE appointmentID = :appointmentID";
    $appStmt = $db->prepare($updateAppointment);
    $appStmt->bindParam(':appointmentID', $appointmentID);
    $appStmt->execute();

    // تحديث حالة قائمة الانتظار مع وقت الانتظار الفعلي
    $updateQueue = "UPDATE queue SET status = 'completed', actualWaitTime = :actualWaitTime 
                    WHERE queueID = :queueID";
    $queueStmt = $db->prepare($updateQueue);
    $queueStmt->bindParam(':queueID', $queueID);
    $queueStmt->bindParam(':actualWaitTime', $actualWaitTime);
    $queueStmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Consultation completed successfully"
    ]);
} elseif ($action === 'skip-patient') {
    // تخطي مريض (no-show)
    $queueID = $input['queueID'] ?? '';
    $appointmentID = $input['appointmentID'] ?? '';

    if (!$queueID || !$appointmentID) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Queue ID and Appointment ID are required"
        ]);
        exit;
    }

    // التحقق من أن الموعد يخص هذا الطبيب
    $checkQuery = "SELECT appointmentID FROM appointments 
                   WHERE appointmentID = :appointmentID AND doctorID = :doctorID";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':appointmentID', $appointmentID);
    $checkStmt->bindParam(':doctorID', $doctor['doctorID']);
    $checkStmt->execute();

    if (!$checkStmt->fetch()) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "error" => "You don't have permission to update this appointment"
        ]);
        exit;
    }

    // تحديث حالة الموعد إلى no-show
    $updateAppointment = "UPDATE appointments SET status = 'no-show' WHERE appointmentID = :appointmentID";
    $appStmt = $db->prepare($updateAppointment);
    $appStmt->bindParam(':appointmentID', $appointmentID);
    $appStmt->execute();

    // تحديث حالة قائمة الانتظار
    $updateQueue = "UPDATE queue SET status = 'cancelled' WHERE queueID = :queueID";
    $queueStmt = $db->prepare($updateQueue);
    $queueStmt->bindParam(':queueID', $queueID);
    $queueStmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Patient marked as no-show"
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Invalid action"
    ]);
}
