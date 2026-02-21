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

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->sessionID) || !isset($data->message)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Session ID and message required"
    ]);
    exit;
}

// حفظ رسالة المستخدم
$messageID = 'MSG_' . uniqid() . '_' . time();
$query = "INSERT INTO ChatMessages (messageID, sessionID, senderType, messageContent, messageTime) 
          VALUES (:messageID, :sessionID, 'patient', :message, NOW())";

$stmt = $db->prepare($query);
$stmt->bindParam(':messageID', $messageID);
$stmt->bindParam(':sessionID', $data->sessionID);
$stmt->bindParam(':message', $data->message);
$stmt->execute();

// إنشاء رد تلقائي
$response = generateAIResponse($data->message, $patient['fullName']);

// حفظ رد AI
$aiMessageID = 'MSG_' . uniqid() . '_' . time();
$query = "INSERT INTO ChatMessages (messageID, sessionID, senderType, messageContent, messageTime) 
          VALUES (:messageID, :sessionID, 'ai', :response, NOW())";

$stmt = $db->prepare($query);
$stmt->bindParam(':messageID', $aiMessageID);
$stmt->bindParam(':sessionID', $data->sessionID);
$stmt->bindParam(':response', $response);
$stmt->execute();

echo json_encode([
    "success" => true,
    "response" => $response
]);

function generateAIResponse($message, $patientName)
{
    $message = strtolower($message);
    $firstName = explode(' ', $patientName)[0];

    // كشف الكلمات المفتاحية
    $hasEmergency = strpos($message, 'emergency') !== false ||
        strpos($message, 'urgent') !== false ||
        strpos($message, 'severe') !== false;

    $hasAppointment = strpos($message, 'appointment') !== false ||
        strpos($message, 'book') !== false ||
        strpos($message, 'schedule') !== false;

    $hasMedication = strpos($message, 'medication') !== false ||
        strpos($message, 'pill') !== false ||
        strpos($message, 'medicine') !== false ||
        strpos($message, 'drug') !== false;

    $hasSymptom = strpos($message, 'symptom') !== false ||
        strpos($message, 'pain') !== false ||
        strpos($message, 'feel') !== false ||
        strpos($message, 'hurt') !== false;

    $hasGreeting = strpos($message, 'hello') !== false ||
        strpos($message, 'hi') !== false ||
        strpos($message, 'hey') !== false ||
        strpos($message, 'good morning') !== false;

    // توليد الرد المناسب
    if ($hasEmergency) {
        return "⚠️ **IMPORTANT:** If you're experiencing a medical emergency, please call emergency services (911) immediately!\n\nI'm an AI assistant and cannot provide emergency care. Please seek immediate medical attention.";
    }

    if ($hasGreeting) {
        return "Hello $firstName! 👋 I'm your AI health assistant. How can I help you today? You can ask me about:\n\n• Symptoms and health concerns\n• Booking appointments\n• Medication information\n• General health tips";
    }

    if ($hasAppointment) {
        return "You can book an appointment through the 'Book Appointment' section in your dashboard. I can help you with:\n\n• Finding available doctors\n• Choosing the right specialty\n• Understanding appointment types\n\nWould you like me to guide you through the process?";
    }

    if ($hasMedication) {
        return "For medication-related questions, please check your Medication Tracker. Remember to:\n\n• Take medications exactly as prescribed\n• Never change dosage without consulting your doctor\n• Report any side effects to your healthcare provider\n\nIs there a specific medication you'd like to know more about?";
    }

    if ($hasSymptom) {
        return "I understand you're asking about symptoms. While I can provide general information, please remember that I'm not a substitute for professional medical advice.\n\nWould you like to:\n\n• Learn about common symptoms\n• Schedule an appointment with a doctor\n• Get information about when to see a doctor";
    }

    // رد افتراضي
    return "Thank you for your message, $firstName. I'm here to help with general health questions. You can ask me about:\n\n• Symptoms and when to see a doctor\n• Booking and managing appointments\n• Medication information and reminders\n• General health and wellness tips\n\nHow can I assist you today?";
}
