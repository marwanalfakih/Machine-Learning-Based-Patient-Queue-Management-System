<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../../config/db.php';
require_once '../shared/auth_helper.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من التوكن والحصول على userID
$userID = validateToken();

// التحقق من أن المستخدم مريض
$patientInfo = getPatientData($db, $userID);
$patient = $patientInfo['patient'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed"
    ]);
    exit;
}

// التأكد من وجود جدول المحادثات
try {
    $db->exec("CREATE TABLE IF NOT EXISTS AIChatbotSessions (
        sessionID VARCHAR(50) PRIMARY KEY,
        patientID VARCHAR(50) NOT NULL,
        startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        endTime DATETIME NULL,
        sessionStatus ENUM('active', 'completed', 'escalated') DEFAULT 'active',
        FOREIGN KEY (patientID) REFERENCES patients(patientID) ON DELETE CASCADE
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS ChatMessages (
        messageID VARCHAR(50) PRIMARY KEY,
        sessionID VARCHAR(50) NOT NULL,
        senderType ENUM('patient', 'ai', 'doctor') NOT NULL,
        messageContent TEXT NOT NULL,
        messageTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionID) REFERENCES AIChatbotSessions(sessionID) ON DELETE CASCADE
    )");
} catch (Exception $e) {
    // الجداول موجودة مسبقاً
}

// إنشاء جلسة جديدة
$sessionID = 'CHAT_' . uniqid() . '_' . time();

$query = "INSERT INTO AIChatbotSessions (sessionID, patientID, startTime, sessionStatus) 
          VALUES (:sessionID, :patientID, NOW(), 'active')";

$stmt = $db->prepare($query);
$stmt->bindParam(':sessionID', $sessionID);
$stmt->bindParam(':patientID', $patient['patientID']);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "sessionID" => $sessionID
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to create session"
    ]);
}
