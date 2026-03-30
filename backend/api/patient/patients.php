<?php
// api/patient/patients.php
// إضافة رؤوس CORS في بداية الملف
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

// إذا كان الطلب OPTIONS (preflight) - يعود بنجاح فوري
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Patient.php';
require_once '../../models/User.php';



$database = new Database();
$db = $database->getConnection();

$patient = new Patient($db);
$userModel = new User($db);

// الحصول على التوكن من الـ Header
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

// استخراج التوكن (إزالة "Bearer ")
$token = str_replace('Bearer ', '', $authHeader);

// التحقق من التوكن
if (empty($token)) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Token is required"
    ]);
    exit;
}

// فك تشفير التوكن للحصول على userID
try {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception("Invalid token format");
    }

    $payload = json_decode(base64_decode($parts[1]), true);

    if (!$payload || !isset($payload['userID'])) {
        throw new Exception("Invalid token payload");
    }

    // التحقق من انتهاء الصلاحية
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        throw new Exception("Token has expired");
    }

    $userID = $payload['userID'];

    // التحقق من وجود المستخدم في قاعدة البيانات
    $user = $userModel->findByID($userID);
    if (!$user) {
        throw new Exception("User not found");
    }
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Authentication failed: " . $e->getMessage()
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // جلب معلومات المريض باستخدام userID من التوكن
        $patientData = $patient->findByUserID($userID);

        if ($patientData) {
            // حساب الأحرف الأولى للاسم
            $initials = '';
            $nameParts = explode(' ', $patientData['fullName']);
            foreach ($nameParts as $part) {
                if (!empty($part)) {
                    $initials .= strtoupper($part[0]);
                }
            }
            $patientData['initials'] = substr($initials, 0, 2);

            // إضافة البريد الإلكتروني والهاتف من جدول users
            $patientData['email'] = $user['email'];
            $patientData['phone'] = $user['phone'];

            echo json_encode([
                "success" => true,
                "patient" => $patientData
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "error" => "Patient not found for user ID: " . $userID
            ]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if (isset($data->action)) {
            if ($data->action === 'update') {
                // تحديث بيانات المريض
                $patientData = $patient->findByUserID($userID);
                if (!$patientData) {
                    http_response_code(404);
                    echo json_encode([
                        "success" => false,
                        "error" => "Patient not found"
                    ]);
                    exit;
                }

                $updateData = [];
                if (isset($data->fullName)) $updateData['fullName'] = $data->fullName;
                if (isset($data->dateOfBirth)) $updateData['dateOfBirth'] = $data->dateOfBirth;
                if (isset($data->gender)) $updateData['gender'] = $data->gender;
                if (isset($data->address)) $updateData['address'] = $data->address;
                if (isset($data->emergencyContact)) $updateData['emergencyContact'] = $data->emergencyContact;
                if (isset($data->bloodType)) $updateData['bloodType'] = $data->bloodType;
                if (isset($data->medicalHistory)) $updateData['medicalHistory'] = $data->medicalHistory;
                if (isset($data->allergies)) $updateData['allergies'] = $data->allergies;

                $result = $patient->update($patientData['patientID'], $updateData);

                if ($result) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Patient updated successfully"
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "success" => false,
                        "error" => "Failed to update patient"
                    ]);
                }
            }
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "error" => "Method not allowed"
        ]);
}
