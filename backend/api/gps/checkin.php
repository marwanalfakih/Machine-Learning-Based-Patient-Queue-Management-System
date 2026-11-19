<?php
// api/gps/checkin.php

ob_start();

error_reporting(0);
ini_set('display_errors', 0);

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
require_once '../../models/Patient.php';
require_once '../../models/Appointment.php';
require_once '../../models/Queue.php';
require_once '../../models/Notification.php';
require_once '../../models/AIPrediction.php';

// إحداثيات المستشفى
define('HOSPITAL_LAT', 21.24545);
define('HOSPITAL_LNG', 40.41980);
define('MIN_ACCURACY', 10000);

$database = new Database();
$db = $database->getConnection();


// التحقق من التوكن
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

if (empty($token)) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Token is required"]);
    exit;
}

try {
    $parts = explode('.', $token);
    $payload = json_decode(base64_decode($parts[1]), true);
    $userID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Authentication failed"]);
    exit;
}

// جلب بيانات المريض
$patientModel = new Patient($db);
$patient = $patientModel->findByUserID($userID);

if (!$patient) {
    http_response_code(404);
    echo json_encode(["success" => false, "error" => "Patient not found"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['latitude']) || !isset($input['longitude']) || !isset($input['accuracy'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Location data required"]);
    exit;
}


$latitude = floatval($input['latitude']);
$longitude = floatval($input['longitude']);

$accuracy = floatval($input['accuracy']);
$travelMode = $input['travelMode'] ?? 'driving';

// حساب المسافة
function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
{
    $earthRadius = 6371000;
    $latFrom = deg2rad($lat1);
    $lonFrom = deg2rad($lon1);
    $latTo = deg2rad($lat2);
    $lonTo = deg2rad($lon2);
    $latDelta = $latTo - $latFrom;
    $lonDelta = $lonTo - $lonFrom;
    $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
        cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
    return $angle * $earthRadius;
}

function calculateEstimatedTime(float $distance, string $mode): array
{
    $speeds = [
        'walking' => 1.4,
        'driving' => 13.9,
        'transit' => 8.3,
        'bicycling' => 5.6
    ];
    $speed = $speeds[$mode] ?? $speeds['driving'];
    $timeSeconds = $distance / $speed;
    return [
        'seconds' => round($timeSeconds),
        'minutes' => round($timeSeconds / 60),
        'formatted' => formatTime($timeSeconds)
    ];
}

function formatTime(float $seconds): string
{
    if ($seconds < 60) {
        return floor($seconds) . ' sec';
    } elseif ($seconds < 3600) {
        $minutes = floor($seconds / 60);
        $secs = $seconds % 60;
        return $minutes . ' min ' . ($secs > 0 ? $secs . ' sec' : '');
    } else {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        return $hours . ' hr ' . $minutes . ' min';
    }
}

$distance = calculateDistance($latitude, $longitude, HOSPITAL_LAT, HOSPITAL_LNG);
$estimatedTime = calculateEstimatedTime($distance, $travelMode);
//$distance_km = $distance / 1000;
$distance_km = round($distance / 1000, 2);
$eta_minutes = $estimatedTime['minutes'];

if ($accuracy > MIN_ACCURACY) {
    echo json_encode([
        "success" => false,
        "error" => "Location accuracy too low",
        "accuracy" => $accuracy,
        "required_accuracy" => MIN_ACCURACY,
        "location" => [
            "latitude" => $latitude,
            "longitude" => $longitude,
            "distance" => round($distance),
            "estimatedTime" => $estimatedTime
        ]
    ]);
    exit;
}

// جلب موعد اليوم
$today = date('Y-m-d');
$appointmentModel = new Appointment($db);
$appointments = $appointmentModel->getByPatient($patient['patientID'], 'scheduled');

$todaysAppointment = null;
foreach ($appointments as $app) {
    $appDate = date('Y-m-d', strtotime($app['appointmentDate']));
    if ($appDate === $today) {
        $todaysAppointment = $app;
        break;
    }
}

if (!$todaysAppointment) {

    echo json_encode([
        "success" => false,
        "error" => "No appointment today",
        "location" => [
            "latitude" => $latitude,
            "longitude" => $longitude,
            "distance" => round($distance),
            "estimatedTime" => $estimatedTime,
            "hospitalLocation" => [
                "lat" => HOSPITAL_LAT,
                "lng" => HOSPITAL_LNG
            ]
        ]
    ]);
    exit;
}

//-------------------------------------

// =============================================
// TIME VALIDATION: Check-in only allowed within 1 hour before appointment
// =============================================

$appointment_time = new DateTime($todaysAppointment['appointmentDate']);
$current_time = new DateTime();

// Check-in window starts 1 hour before appointment
$checkin_window_start = clone $appointment_time;
$checkin_window_start->modify('-1 hour');
//$checkin_window_start->modify('-30 minutes');

// Case 1: Too early (more than 1 hour before appointment)
if ($current_time < $checkin_window_start) {
    // Calculate remaining time until check-in window opens
    $remaining_seconds = $checkin_window_start->getTimestamp() - $current_time->getTimestamp();
    $remaining_minutes = ceil($remaining_seconds / 60);


    echo json_encode([
        "success" => false,
        //"error" => "checkin_too_early",
        "error" => "checkin_too_early" . $current_time->format('h:i A'),
        "message" => "You cannot check in yet",
        "details" => [
            "appointment_time" => $appointment_time->format('h:i A'),
            "checkin_allowed_from" => $checkin_window_start->format('h:i A'),
            "current_time" => $current_time->format('h:i A'),
            "remaining_minutes" => $remaining_minutes,
            "suggestion" => "Please try again after {$remaining_minutes}"
        ]
    ]);
    exit;
}

// Case 2: Late arrival (after appointment time)
if ($current_time > $appointment_time) {
    echo json_encode([
        "success" => false,
        "error" => "appointment_passed",
        "message" => "You have missed your appointment",
        "details" => [
            "appointment_time" => $appointment_time->format('h:i A'),
            "current_time" => $current_time->format('h:i A'),
            "suggestion" => "Please go to reception to reschedule your appointment"
        ]
    ]);
    exit;
}



//----------------------------------


// Add to GPS Check-ins table
$checkinID = 'CHK_' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

$insertGPSQuery = "INSERT INTO gpscheckins (
    checkinID, patientID, appointmentID, latitude, longitude, 
    checkinTime, status, distanceFromFacility, estimatedArrivalTime, autoCheckedIn
) VALUES (
    :checkinID, :patientID, :appointmentID, :latitude, :longitude,
    NOW(), 'approved', :distance, :eta, 1
)";

$insertStmt = $db->prepare($insertGPSQuery);
$insertStmt->bindParam(':checkinID', $checkinID);
$insertStmt->bindParam(':patientID', $patient['patientID']);
$insertStmt->bindParam(':appointmentID', $todaysAppointment['appointmentID']);
$insertStmt->bindParam(':latitude', $latitude);
$insertStmt->bindParam(':longitude', $longitude);
$insertStmt->bindParam(':distance', $distance);
$insertStmt->bindParam(':eta', $estimatedTime['seconds']);
$insertStmt->execute();
// =================================================================================


$queueModel = new Queue($db);
$queueData = $queueModel->getPatientPosition($patient['patientID']);

// ========== جلب إحصائيات قائمة الانتظار ========================================
$position = $queueData ? ($queueData['position'] + 1) : 1;
if ($queueData && $queueData['inQueue']) {
    $position = $queueData['position'];
}

$statsQuery = "SELECT 
                COUNT(*) as total_patients,
                SUM(CASE WHEN queuePosition < :position AND q.status = 'waiting' THEN 1 ELSE 0 END) as patients_ahead,
                (SELECT yearsOfExperience FROM doctors WHERE doctorID = :doctorID) as doctor_experience
              FROM queue q
              JOIN appointments a ON q.appointmentID = a.appointmentID
              WHERE a.doctorID = :doctorID 
                AND DATE(q.checkinTime) = CURDATE()
                AND q.status IN ('waiting', 'checked-in')";

$statsStmt = $db->prepare($statsQuery);
$statsStmt->bindParam(':doctorID', $todaysAppointment['doctorID']);
$statsStmt->bindParam(':position', $position);
$statsStmt->execute();
$queueStats = $statsStmt->fetch(PDO::FETCH_ASSOC);

$total_patients = $queueStats['total_patients'] ?? 1;
$patients_ahead = $queueStats['patients_ahead'] ?? ($position - 1);
$doctor_experience = $queueStats['doctor_experience'] ?? 5;

// ========== متغيرات AI ==========
$aiPredictedWait = null;
$aiConfidence = null;
$aiModel = null;

if (!$queueData || !$queueData['inQueue']) {
    // إضافة مريض جديد إلى قائمة الانتظار
    $queueID = $queueModel->addToQueue($todaysAppointment['appointmentID']);

    // استدعاء AI مع جميع البيانات
    $aiPrediction = getAIPrediction(
        $todaysAppointment['doctorID'],
        $position,
        $patient['patientID'],
        $distance_km,
        $eta_minutes,
        $total_patients,
        $patients_ahead,
        $doctor_experience
    );

    if ($aiPrediction && isset($aiPrediction['predictedWaitTime'])) {
        $estimatedWait = $aiPrediction['predictedWaitTime'];
        $aiConfidence = $aiPrediction['confidence'] ?? 'medium';
        $aiModel = $aiPrediction['model']['name'] ?? 'TabPFN';

        $queueModel->updateEstimatedWaitTime($queueID, $estimatedWait);

        $updateAIQuery = "UPDATE queue SET 
                          ai_predicted_wait = :aiWait,
                          ai_confidence = :confidence,
                          ai_model = :model
                          WHERE queueID = :queueID";
        $updateAIStmt = $db->prepare($updateAIQuery);
        $updateAIStmt->bindParam(':aiWait', $estimatedWait);
        $updateAIStmt->bindParam(':confidence', $aiConfidence);
        $updateAIStmt->bindParam(':model', $aiModel);
        $updateAIStmt->bindParam(':queueID', $queueID);
        $updateAIStmt->execute();
    } else {
        $estimatedWait = 15;
        $queueModel->updateEstimatedWaitTime($queueID, $estimatedWait);
    }

    // حفظ بيانات GPS
    $updateQuery = "UPDATE queue SET estimatedArrivalTime = :eta, distance_km = :distance_km WHERE queueID = :queueID";
    $updateStmt = $db->prepare($updateQuery);
    $eta = $estimatedTime['seconds'];
    $updateStmt->bindParam(':eta', $eta);
    $updateStmt->bindParam(':distance_km', $distance_km);
    $updateStmt->bindParam(':queueID', $queueID);
    $updateStmt->execute();

    $queueData = $queueModel->getPatientPosition($patient['patientID']);

    if ($aiPrediction) {
        $queueData['aiPredictedWait'] = $aiPrediction['predictedWaitTime'];
        $queueData['aiConfidence'] = $aiConfidence;
        $queueData['aiModel'] = $aiModel;
    }

    // ========== إعادة ترتيب قائمة الانتظار (للمريض الجديد) ==========
    reorderQueueByETA($db, $todaysAppointment['doctorID']);
    // ==============================================================
} else {
    // تحديث مريض موجود
    $updateQuery = "UPDATE queue SET estimatedArrivalTime = :eta, distance_km = :distance_km WHERE queueID = :queueID";
    $updateStmt = $db->prepare($updateQuery);
    $eta = $estimatedTime['seconds'];
    $updateStmt->bindParam(':eta', $eta);
    $updateStmt->bindParam(':distance_km', $distance_km);
    $updateStmt->bindParam(':queueID', $queueData['queueID']);
    $updateStmt->execute();

    $aiPrediction = getAIPrediction(
        $todaysAppointment['doctorID'],
        $queueData['position'],
        $patient['patientID'],
        $distance_km,
        $eta_minutes,
        $total_patients,
        $patients_ahead,
        $doctor_experience
    );

    if ($aiPrediction && isset($aiPrediction['predictedWaitTime'])) {
        $estimatedWait = $aiPrediction['predictedWaitTime'];
        $aiConfidence = $aiPrediction['confidence'] ?? 'medium';
        $aiModel = $aiPrediction['model']['name'] ?? 'unknown';

        $queueModel->updateEstimatedWaitTime($queueData['queueID'], $estimatedWait);

        $updateAIQuery = "UPDATE queue SET 
                          ai_predicted_wait = :aiWait,
                          ai_confidence = :confidence,
                          ai_model = :model
                          WHERE queueID = :queueID";
        $updateAIStmt = $db->prepare($updateAIQuery);
        $updateAIStmt->bindParam(':aiWait', $estimatedWait);
        $updateAIStmt->bindParam(':confidence', $aiConfidence);
        $updateAIStmt->bindParam(':model', $aiModel);
        $updateAIStmt->bindParam(':queueID', $queueData['queueID']);
        $updateAIStmt->execute();

        $queueData['aiPredictedWait'] = $aiPrediction['predictedWaitTime'];
        $queueData['aiConfidence'] = $aiConfidence;
        $queueData['aiModel'] = $aiModel;
        $queueData['estimatedWait'] = $aiPrediction['predictedWaitTime'] . ' mins';
    }

    $queueData['estimatedArrivalTime'] = $estimatedTime['formatted'];

    // ========== إعادة ترتيب قائمة الانتظار (للمريض الموجود) ==========
    reorderQueueByETA($db, $todaysAppointment['doctorID']);
    // ================================================================
}

// إنشاء إشعار
$notificationModel = new Notification($db);
$notificationModel->create([
    'userID' => $userID,
    'type' => 'checkin_success',
    'title' => '📍 Check-in Successful',
    'message' => "You're " . round($distance) . "m from hospital. ETA: " . $estimatedTime['formatted'],
    'data' => [
        'position' => $queueData['position'],
        'estimatedWait' => $queueData['estimatedWait'],
        'estimatedArrival' => $estimatedTime['formatted'],
        'distance' => round($distance),
        'aiPredictedWait' => $queueData['aiPredictedWait'] ?? null
    ]
]);

// تسجيل النشاط
$logQuery = "INSERT INTO SystemLogs (userID, actionType, actionDescription) 
             VALUES (:userID, 'gps_checkin', :description)";
$logStmt = $db->prepare($logQuery);
$description = "GPS check-in - Distance: " . round($distance) . "m, ETA: " . $estimatedTime['formatted'];
if (isset($queueData['aiPredictedWait'])) {
    $description .= ", AI Prediction: " . $queueData['aiPredictedWait'] . " mins";
}
$logStmt->bindParam(':userID', $userID);
$logStmt->bindParam(':description', $description);
$logStmt->execute();

// إرجاع النتيجة
echo json_encode([
    "success" => true,
    "message" => "Check-in successful",
    "data" => [
        "queueID" => $queueData['queueID'],
        "position" => $queueData['position'],
        "estimatedWait" => $queueData['estimatedWait'],
        "patientsAhead" => $queueData['patientsAhead'],
        "distance" => round($distance),
        "distance_km" => round($distance_km, 2),
        "eta_minutes" => $eta_minutes,
        "estimatedArrivalTime" => $estimatedTime['formatted'],
        "estimatedArrivalSeconds" => $estimatedTime['seconds'],
        "aiPredictedWait" => $queueData['aiPredictedWait'] ?? null,
        "aiConfidence" => $queueData['aiConfidence'] ?? null,
        "aiModel" => $queueData['aiModel'] ?? null,
        "checkinTime" => date('Y-m-d H:i:s'),
        "location" => [
            "patientLat" => $latitude,
            "patientLng" => $longitude,
            "hospitalLat" => HOSPITAL_LAT,
            "hospitalLng" => HOSPITAL_LNG
        ]
    ]
]);

// ========== دوال AI ==========

function getAIPrediction(int $doctorID, $position, $patientID, $distance_km, $eta_minutes, $total_patients, $patients_ahead, $doctor_experience)
{
    $ch = curl_init('http://localhost:5001/api/predict');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'doctorID' => $doctorID,
        'queuePosition' => $position,
        'patientID' => $patientID,
        'distance_km' => $distance_km,
        'eta_minutes' => $eta_minutes,
        'total_patients' => $total_patients,
        'patients_ahead' => $patients_ahead,
        'doctor_experience' => $doctor_experience
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);


    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if ($data && isset($data['predictedWaitTime'])) {
            return $data;
        }
    }

    return getPHPFallbackPrediction($doctorID, $position);
}

function getPHPFallbackPrediction($doctorID, $position)
{
    $hour = (int)date('H');
    $baseTime = 15;

    if (($hour >= 9 && $hour <= 11) || ($hour >= 15 && $hour <= 17)) {
        $baseTime = 20;
    }

    $dayOfWeek = (int)date('w');
    if ($dayOfWeek == 5 || $dayOfWeek == 6) {
        $baseTime = 12;
    }

    $predictedTime = $position * $baseTime;

    return [
        'predictedWaitTime' => round($predictedTime),
        'confidence' => 'low',
        'model' => [
            'name' => 'php_fallback',
            'accuracy' => 70
        ]
    ];
}

// ========== دالة إعادة ترتيب قائمة الانتظار حسب وقت الوصول ==========
function reorderQueueByETA($db, $doctorID)
{
    // جلب جميع المرضى في قائمة الانتظار مرتبين حسب وقت الوصول (الأقرب أولاً)
    $query = "SELECT q.queueID, q.estimatedArrivalTime 
              FROM queue q
              JOIN appointments a ON q.appointmentID = a.appointmentID
              WHERE a.doctorID = :doctorID 
                AND DATE(q.checkinTime) = CURDATE()
                AND q.status = 'waiting'
              ORDER BY q.estimatedArrivalTime ASC, q.queuePosition ASC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':doctorID', $doctorID);
    $stmt->execute();
    $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // إعادة ترقيم المرضى (الأقرب وقت وصول يأخذ الرقم 1)
    $position = 1;
    foreach ($patients as $patient) {
        $updateQuery = "UPDATE queue SET queuePosition = :pos WHERE queueID = :queueID";
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->bindParam(':pos', $position);
        $updateStmt->bindParam(':queueID', $patient['queueID']);
        $updateStmt->execute();
        $position++;
    }
}
