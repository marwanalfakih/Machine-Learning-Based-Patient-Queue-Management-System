<?php
//header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

// السماح لطلبات OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../config/constants.php';
require_once '../../controllers/AuthController.php';

try {
    // فحص اتصال قاعدة البيانات
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    $authController = new AuthController($db);

    // قراءة البيانات المرسلة
    $input = file_get_contents('php://input');

    if (empty($input)) {
        throw new Exception("No data received");
    }

    $data = json_decode($input);

    if (!$data) {
        throw new Exception("Invalid JSON data");
    }

    // التحقق من وجود بيانات الدخول
    if (!isset($data->email) || !isset($data->password)) {
        throw new Exception("Email and password are required");
    }

    // معالجة طلب تسجيل الدخول
    if (isset($data->action) && $data->action === 'login') {
        $authController->login($data);
    } else {
        throw new Exception("Invalid action. Use 'login'");
    }
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
