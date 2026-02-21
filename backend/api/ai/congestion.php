<?php
// backend/api/ai/congestion.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/AIPrediction.php';
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

try {
    $parts = explode('.', $token);
    $payload = json_decode(base64_decode($parts[1]), true);
    $userID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Invalid token"]);
    exit;
}

$hours = isset($_GET['hours']) ? intval($_GET['hours']) : 6;

// محاولة الاتصال بخدمة Python
$pythonPredictions = getPythonCongestion($hours);

if ($pythonPredictions && $pythonPredictions['success']) {
    echo json_encode($pythonPredictions);
    exit;
}

// إذا فشلت Python، استخدم البيانات التاريخية
$predictions = [];
$currentHour = (int)date('H');
$currentDay = (int)date('w');

for ($i = 0; $i < $hours; $i++) {
    $targetHour = ($currentHour + $i) % 24;
    $targetDay = $currentDay;

    // تعديل اليوم إذا تعدى منتصف الليل
    if ($currentHour + $i >= 24) {
        $targetDay = ($currentDay + 1) % 7;
    }

    // جلب متوسط البيانات التاريخية لهذه الساعة
    $query = "SELECT 
                AVG(queuePosition) as avg_position,
                COUNT(*) as sample_count
              FROM ai_predictions
              WHERE hour = :hour AND dayOfWeek = :day
              AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':hour', $targetHour);
    $stmt->bindParam(':day', $targetDay);
    $stmt->execute();
    $history = $stmt->fetch();

    if ($history && $history['sample_count'] > 0) {
        $avgPosition = $history['avg_position'];
        $predictedWait = $avgPosition * 15;
        $confidence = $history['sample_count'] > 50 ? 'high' : ($history['sample_count'] > 20 ? 'medium' : 'low');
    } else {
        // تقدير افتراضي
        if (($targetHour >= 9 && $targetHour <= 11) || ($targetHour >= 15 && $targetHour <= 17)) {
            $avgPosition = 15;
            $predictedWait = 30;
        } else {
            $avgPosition = 8;
            $predictedWait = 15;
        }
        $confidence = 'low';
    }

    $predictions[] = [
        'hour' => $targetHour,
        'day' => $targetDay,
        'predictedPatients' => round($avgPosition),
        'predictedWaitTime' => round($predictedWait),
        'confidence' => $confidence,
        'congestionLevel' => $avgPosition > 15 ? 'High' : ($avgPosition > 8 ? 'Medium' : 'Low'),
        'timestamp' => date('Y-m-d H:i:s', strtotime("+$i hours"))
    ];
}

echo json_encode([
    'success' => true,
    'predictions' => $predictions,
    'source' => 'historical_data'
]);

function getPythonCongestion($hours)
{
    $ch = curl_init('http://localhost:5001/api/congestion?hours=' . $hours);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        return json_decode($response, true);
    }

    return null;
}
