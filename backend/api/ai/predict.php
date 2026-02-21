<?php
// backend/api/ai/predict.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/AIPrediction.php';
require_once '../../models/Doctor.php';
require_once '../../controllers/AIController.php';
require_once '../../middleware/AuthMiddleware.php';

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

// فك التوكن (مبسط - في الإنتاج استخدم مكتبة JWT)
try {
    $parts = explode('.', $token);
    $payload = json_decode(base64_decode($parts[1]), true);
    $userID = $payload['userID'];
    $userType = $payload['userType'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Invalid token"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$doctorID = $data['doctorID'] ?? null;
$queuePosition = $data['queuePosition'] ?? 1;
$patientID = $data['patientID'] ?? null;

// محاولة الاتصال بخدمة Python
$pythonPrediction = getPythonPrediction($doctorID, $queuePosition);

if ($pythonPrediction && $pythonPrediction['success']) {
    // استخدام تنبؤ Python
    $predictedTime = $pythonPrediction['predictedWaitTime'];
    $confidence = $pythonPrediction['confidence'];
    $modelUsed = $pythonPrediction['model']['name'];
    $modelAccuracy = $pythonPrediction['model']['accuracy'];
    $features = $pythonPrediction['features'] ?? null;
} else {
    // نموذج PHP الاحتياطي (قواعد بسيطة)
    $hour = (int)date('H');
    $dayOfWeek = (int)date('w');

    // المعادلة الأساسية: 15 دقيقة لكل مريض
    $baseTime = 15;
    $factors = [];

    // ساعات الذروة (9-11 صباحاً، 3-5 مساءً)
    if (($hour >= 9 && $hour <= 11) || ($hour >= 15 && $hour <= 17)) {
        $baseTime = 20;
        $factors[] = 'peak_hours';
    }

    // أيام العمل (الأحد - الخميس)
    if ($dayOfWeek >= 0 && $dayOfWeek <= 4) {
        $baseTime = $baseTime * 1.1;
        $factors[] = 'weekday';
    }

    // تحسين بناءً على بيانات الطبيب إذا كانت متوفرة
    if ($doctorID) {
        $doctorModel = new Doctor($db);
        $doctor = $doctorModel->findByID($doctorID);
        if ($doctor && isset($doctor['avgConsultationTime'])) {
            $baseTime = $doctor['avgConsultationTime'];
        }
    }

    $predictedTime = $queuePosition * $baseTime;
    $confidence = 'low';
    $modelUsed = 'php_rules';
    $modelAccuracy = 70;
    $features = ['factors' => $factors];
}

// حفظ التنبؤ في قاعدة البيانات
$predictionModel = new AIPrediction($db);
$predictionID = $predictionModel->create([
    'patientID' => $patientID,
    'doctorID' => $doctorID,
    'predictedTime' => round($predictedTime),
    'queuePosition' => $queuePosition,
    'confidence' => $confidence,
    'hour' => (int)date('H'),
    'dayOfWeek' => (int)date('w'),
    'modelType' => $modelUsed,
    'features' => $features
]);

echo json_encode([
    'success' => true,
    'predictedWaitTime' => round($predictedTime, 1),
    'confidence' => $confidence,
    'unit' => 'minutes',
    'model' => [
        'name' => $modelUsed,
        'accuracy' => $modelAccuracy,
        'type' => strpos($modelUsed, 'python') !== false ? 'Machine Learning' : 'Rule-based'
    ],
    'features' => $features,
    'predictionID' => $predictionID
]);

/**
 * الاتصال بخدمة Python
 */
function getPythonPrediction($doctorID, $position)
{
    $ch = curl_init('http://localhost:5001/api/predict');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'doctorID' => $doctorID,
        'queuePosition' => $position
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2); // مهلة قصيرة

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        return json_decode($response, true);
    }

    return null;
}
