<?php
// backend/api/ai/models.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';

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
    http_response_code(401); // تصحيح: http_response_code وليس http_code_response
    echo json_encode(["success" => false, "error" => "Invalid token"]);
    exit;
}

// الحصول على معلومات نماذج Python
$pythonModels = getPythonModels();

// نماذج PHP
$phpModels = [
    [
        'name' => 'Rule-based Model',
        'type' => 'PHP Rules',
        'description' => 'Simple rules based on peak hours and queue position',
        'accuracy' => 75.0,
        'active' => true,
        'features' => ['hour', 'day_of_week', 'queue_position']
    ]
];

$models = $phpModels;
if ($pythonModels && isset($pythonModels['models'])) {
    $models = array_merge($models, $pythonModels['models']);
}

echo json_encode([
    'success' => true,
    'models' => $models,
    'active_model' => 'neural_network',
    'python_service' => $pythonModels ? 'available' : 'unavailable'
]);

function getPythonModels()
{
    $ch = curl_init('http://localhost:5001/api/models');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);


    if ($httpCode === 200 && $response) {
        return json_decode($response, true);
    }

    return null;
}
