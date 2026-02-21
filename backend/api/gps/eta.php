<?php
// api/gps/eta.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Queue.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من التوكن
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

if (empty($token)) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Token required"]);
    exit;
}

// فك التوكن
try {
    $parts = explode('.', $token);
    $payload = json_decode(base64_decode($parts[1]), true);
    $userID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Invalid token"]);
    exit;
}

// جلب آخر موقع للمريض
$query = "SELECT * FROM SystemLogs 
          WHERE userID = :userID AND actionType = 'gps_checkin' 
          ORDER BY logTime DESC LIMIT 1";
$stmt = $db->prepare($query);
$stmt->bindParam(':userID', $userID);
$stmt->execute();
$lastLocation = $stmt->fetch();

if (!$lastLocation) {
    echo json_encode(["success" => false, "error" => "No location data"]);
    exit;
}

// تحديث وقت الوصول كل دقيقة
$queueModel = new Queue($db);
// يمكن تحديث وقت الوصول هنا

echo json_encode([
    "success" => true,
    "lastUpdate" => $lastLocation['logTime']
]);
