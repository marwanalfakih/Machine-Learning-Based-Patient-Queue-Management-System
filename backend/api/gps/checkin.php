<?php
// api/gps/checkin.php
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
define('HOSPITAL_LAT', 30.03043); // taif مجمع الملك فيصل الطبي
define('HOSPITAL_LNG', 31.23149);
//define('HOSPITAL_LAT', 21.24545); // taif مجمع الملك فيصل الطبي
//define('HOSPITAL_LNG', 40.41980);
define('CHECKIN_RADIUS', 5000); // 5 كم للاختبار
define('MIN_ACCURACY', 500); // دقة مقبولة

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

// فك تشفير التوكن
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

// التحقق من الطلب
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
$travelMode = $input['travelMode'] ?? 'walking'; // walking, driving, transit

// حساب المسافة باستخدام صيغة Haversine
function calculateDistance($lat1, $lon1, $lat2, $lon2)
{
    $earthRadius = 6371000; // متر

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

$distance = calculateDistance($latitude, $longitude, HOSPITAL_LAT, HOSPITAL_LNG);

// حساب وقت الوصول التقديري بناءً على وسيلة النقل
function calculateEstimatedTime($distance, $mode)
{
    $speeds = [
        'walking' => 1.4, // متر/ثانية (5 كم/س)
        'driving' => 13.9, // متر/ثانية (50 كم/س)
        'transit' => 8.3, // متر/ثانية (30 كم/س)
        'bicycling' => 5.6 // متر/ثانية (20 كم/س)
    ];

    $speed = $speeds[$mode] ?? $speeds['walking'];
    $timeSeconds = $distance / $speed;

    return [
        'seconds' => round($timeSeconds),
        'minutes' => round($timeSeconds / 60),
        'formatted' => formatTime($timeSeconds)
    ];
}

function formatTime($seconds)
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

$estimatedTime = calculateEstimatedTime($distance, $travelMode);

// التحقق من الدقة
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

// إضافة إلى قائمة الانتظار أو تحديث إذا كان موجوداً
$queueModel = new Queue($db);
$queueData = $queueModel->getPatientPosition($patient['patientID']);

// ========== متغيرات AI ==========
$aiPredictedWait = null;
$aiConfidence = null;
$aiModel = null;

if (!$queueData || !$queueData['inQueue']) {
    // إضافة جديد
    $queueID = $queueModel->addToQueue($todaysAppointment['appointmentID']);

    // الحصول على توقع AI لوقت الانتظار
    $aiPrediction = getAIPrediction(
        $todaysAppointment['doctorID'],
        $queueData ? $queueData['position'] + 1 : 1,
        $patient['patientID']
    );

    // تحديث وقت الانتظار باستخدام AI إذا كان متاحاً
    if ($aiPrediction && isset($aiPrediction['predictedWaitTime'])) {
        $estimatedWait = $aiPrediction['predictedWaitTime'];
        $aiConfidence = $aiPrediction['confidence'] ?? 'medium';
        $aiModel = $aiPrediction['model']['name'] ?? 'neural_network';

        // تحديث وقت الانتظار في قاعدة البيانات
        $queueModel->updateEstimatedWaitTime($queueID, $estimatedWait);
    } else {
        $estimatedWait = 15; // قيمة افتراضية
        $queueModel->updateEstimatedWaitTime($queueID, $estimatedWait);
    }

    // تحديث وقت الوصول التقديري
    $updateQuery = "UPDATE queue SET estimatedArrivalTime = :eta WHERE queueID = :queueID";
    $updateStmt = $db->prepare($updateQuery);
    $eta = $estimatedTime['seconds'];
    $updateStmt->bindParam(':eta', $eta);
    $updateStmt->bindParam(':queueID', $queueID);
    $updateStmt->execute();

    // جلب البيانات المحدثة
    $queueData = $queueModel->getPatientPosition($patient['patientID']);

    // إضافة توقعات AI إلى queueData
    if ($aiPrediction) {
        $queueData['aiPredictedWait'] = $aiPrediction['predictedWaitTime'];
        $queueData['aiConfidence'] = $aiConfidence;
        $queueData['aiModel'] = $aiModel;
    }
} else {
    // تحديث وقت الوصول للموجود
    $updateQuery = "UPDATE queue SET estimatedArrivalTime = :eta WHERE queueID = :queueID";
    $updateStmt = $db->prepare($updateQuery);
    $eta = $estimatedTime['seconds'];
    $updateStmt->bindParam(':eta', $eta);
    $updateStmt->bindParam(':queueID', $queueData['queueID']);
    $updateStmt->execute();

    // الحصول على توقع AI محدث للمستخدم الموجود
    $aiPrediction = getAIPrediction(
        $todaysAppointment['doctorID'],
        $queueData['position'],
        $patient['patientID']
    );

    if ($aiPrediction && isset($aiPrediction['predictedWaitTime'])) {
        // تحديث وقت الانتظار باستخدام AI
        $queueModel->updateEstimatedWaitTime($queueData['queueID'], $aiPrediction['predictedWaitTime']);

        // إضافة توقعات AI إلى queueData
        $queueData['aiPredictedWait'] = $aiPrediction['predictedWaitTime'];
        $queueData['aiConfidence'] = $aiPrediction['confidence'] ?? 'medium';
        $queueData['aiModel'] = $aiPrediction['model']['name'] ?? 'neural_network';
        $queueData['estimatedWait'] = $aiPrediction['predictedWaitTime'] . ' mins';
    }

    $queueData['estimatedArrivalTime'] = $estimatedTime['formatted'];
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

// إضافة النشاط
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

// إرجاع الاستجابة مع بيانات AI
echo json_encode([
    "success" => true,
    "message" => "Check-in successful",
    "data" => [
        "queueID" => $queueData['queueID'],
        "position" => $queueData['position'],
        "estimatedWait" => $queueData['estimatedWait'],
        "patientsAhead" => $queueData['patientsAhead'],
        "distance" => round($distance),
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

// ========== دالة الحصول على توقع AI ==========
function getAIPrediction($doctorID, $position, $patientID)
{
    // محاولة الاتصال بخدمة Python AI
    $ch = curl_init('http://localhost:5001/api/predict');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'doctorID' => $doctorID,
        'queuePosition' => $position,
        'patientID' => $patientID
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2); // مهلة قصيرة

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if ($data && isset($data['predictedWaitTime'])) {
            return $data;
        }
    }

    // إذا فشلت خدمة Python، استخدم نموذج PHP الاحتياطي
    return getPHPFallbackPrediction($doctorID, $position);
}

// ========== دالة احتياطية للتنبؤ باستخدام PHP ==========
function getPHPFallbackPrediction($doctorID, $position)
{
    // نموذج بسيط: 15 دقيقة لكل مريض مع تعديل حسب الساعة
    $hour = (int)date('H');
    $baseTime = 15;

    // ساعات الذروة (9-11 صباحاً، 3-5 مساءً)
    if (($hour >= 9 && $hour <= 11) || ($hour >= 15 && $hour <= 17)) {
        $baseTime = 20;
    }

    // عطلة نهاية الأسبوع (أقل ازدحاماً)
    $dayOfWeek = (int)date('w');
    if ($dayOfWeek == 5 || $dayOfWeek == 6) { // الجمعة والسبت
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
