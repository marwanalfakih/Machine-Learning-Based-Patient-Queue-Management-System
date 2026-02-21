<?php
// api/shared/departments.php

// رؤوس CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

// معالجة طلبات OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// التحقق من أن الطلب GET فقط
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed. Only GET requests are supported."
    ]);
    exit;
}

require_once '../../config/db.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من وجود التوكن (اختياري للمسارات العامة)
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

$userID = null;
$userType = null;

// إذا كان هناك توكن، يمكننا التحقق منه (اختياري)
if (!empty($token)) {
    try {
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            if ($payload && isset($payload['userID'])) {
                $userID = $payload['userID'];
                $userType = $payload['userType'] ?? null;
            }
        }
    } catch (Exception $e) {
        // إذا فشل التحقق من التوكن، نستمر كزائر
    }
}

try {
    // محاولة جلب الأقسام من جدول الأطباء أولاً
    $query = "SELECT DISTINCT department FROM doctors WHERE department IS NOT NULL AND department != '' ORDER BY department";
    $stmt = $db->prepare($query);
    $stmt->execute();

    $departments = [];
    while ($row = $stmt->fetch()) {
        $departments[] = $row['department'];
    }

    // إذا لم يتم العثور على أقسام، نستخدم الأقسام الافتراضية
    if (empty($departments)) {
        $departments = [
            "Cardiology",
            "Neurology",
            "Pediatrics",
            "Orthopedics",
            "Dermatology",
            "Ophthalmology",
            "Dentistry",
            "Internal Medicine",
            "Pulmonology",
            "Gastroenterology",
            "Psychiatry",
            "Radiology",
            "Oncology",
            "ENT",
            "Urology",
            "Gynecology",
            "Endocrinology",
            "Rheumatology",
            "Nephrology",
            "Hematology"
        ];
    }

    // ترتيب الأقسام أبجدياً
    sort($departments);

    // تسجيل النشاط إذا كان هناك مستخدم مسجل
    if ($userID) {
        try {
            $logQuery = "INSERT INTO SystemLogs (userID, actionType, actionDescription, ipAddress) 
                        VALUES (:userID, 'view_departments', 'Viewed departments list', :ip)";
            $logStmt = $db->prepare($logQuery);
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $logStmt->bindParam(':userID', $userID);
            $logStmt->bindParam(':ip', $ip);
            $logStmt->execute();
        } catch (Exception $e) {
            // فشل التسجيل لا يمنع الاستجابة
        }
    }

    echo json_encode([
        "success" => true,
        "departments" => $departments,
        "count" => count($departments)
    ]);
} catch (Exception $e) {
    error_log("Error in departments.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to fetch departments: " . $e->getMessage()
    ]);
}
