<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../config/constants.php';
require_once '../../controllers/AuthController.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    $authController = new AuthController($db);

    $input = file_get_contents('php://input');

    if (empty($input)) {
        throw new Exception("No data received");
    }

    $data = json_decode($input);

    if (!$data) {
        throw new Exception("Invalid JSON data");
    }

    if (!isset($data->action)) {
        throw new Exception("Action is required");
    }

    // معالجة طلب التسجيل
    if ($data->action === 'register') {
        $authController->register($data);
    } else if ($data->action === 'verify') {
        $authController->verifyToken();
    } else {
        throw new Exception("Invalid action. Use 'register' or 'verify'");
    }
} catch (Exception $e) {
    error_log("Auth error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
