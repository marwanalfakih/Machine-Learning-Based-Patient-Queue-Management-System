<?php
//  api/patient/queue.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Queue.php';
require_once 'shared/auth_helper.php';
require_once '../../models/Patient.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من التوكن والحصول على userID
$userID = validateToken(); // هذه ستخرج بـ JSON إذا فشلت

// التحقق من أن المستخدم مريض وجلب بياناته
$patientInfo = getPatientData($db, $userID);
$patient = $patientInfo['patient'];
$user = $patientInfo['user'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed"
    ]);
    exit;
}

// جلب بيانات قائمة الانتظار
$queueModel = new Queue($db);
$queueData = $queueModel->getPatientPosition($patient['patientID']);

// ========== إضافة توقعات AI ==========
/*
if ($queueData && isset($queueData['inQueue']) && $queueData['inQueue']) {
    // استدعاء AI للحصول على توقع أفضل
    $aiPrediction = getAIPrediction(
        $queueData['doctorID'] ?? null,
        $queueData['position'] ?? 1,
        $patient['patientID']
    );

    if ($aiPrediction && isset($aiPrediction['predictedWaitTime'])) {
        $queueData['aiPredictedWait'] = $aiPrediction['predictedWaitTime'];
        $queueData['aiConfidence'] = $aiPrediction['confidence'] ?? 'medium';
        $queueData['aiModel'] = $aiPrediction['model']['name'] ?? 'unknown';

        // استخدام توقع AI إذا كان أفضل
        if (
            isset($queueData['estimatedWaitMinutes']) &&
            abs($aiPrediction['predictedWaitTime'] - $queueData['estimatedWaitMinutes']) > 3
        ) {
            $queueData['estimatedWait'] = $aiPrediction['predictedWaitTime'] . ' mins (AI)';
        }
    }
}
    */

// إرجاع النتيجة
echo json_encode([
    "success" => true,
    "queue" => $queueData
]);

// ========== دالة مساعدة للاتصال بـ AI ==========
function getAIPrediction($doctorID, $position, $patientID)
{
    // إذا لم يكن هناك doctorID أو position، لا نستدعي AI
    if (!$doctorID || !$position) {
        return null;
    }

    $ch = curl_init('http://localhost:8000/api/ai/predict.php');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'doctorID' => $doctorID,
        'queuePosition' => $position,
        'patientID' => $patientID
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: ' . ($_SERVER['HTTP_AUTHORIZATION'] ?? '')
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);


    if ($httpCode === 200 && $response) {
        return json_decode($response, true);
    }

    return null;
}
