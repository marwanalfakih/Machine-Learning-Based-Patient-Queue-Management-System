<?php
// api/doctor/doctors.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Doctor.php';

$database = new Database();
$db = $database->getConnection();

$doctor = new Doctor($db);

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

// التحقق من التوكن (اختياري)
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

// يمكن التحقق من التوكن إذا لزم الأمر
if (!empty($token)) {
    try {
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            // يمكن استخدام $payload إذا لزم الأمر
        }
    } catch (Exception $e) {
        // تجاهل أخطاء التوكن
    }
}

// معالجة الطلبات
try {
    // جلب طبيب محدد
    if (isset($_GET['doctorID'])) {
        $doctorData = $doctor->findByID($_GET['doctorID']);

        if ($doctorData) {
            echo json_encode([
                "success" => true,
                "doctor" => $doctorData
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "error" => "Doctor not found"
            ]);
        }
    }
    // جلب الأطباء حسب التخصص أو القسم
    elseif (isset($_GET['specialization']) || isset($_GET['department'])) {
        $specialization = isset($_GET['specialization']) ? $_GET['specialization'] : $_GET['department'];
        $doctors = $doctor->getBySpecialization($specialization);

        // تنسيق البيانات للإرجاع
        $formattedDoctors = [];
        foreach ($doctors as $doc) {
            $formattedDoctors[] = [
                'doctorID' => $doc['doctorID'],
                'fullName' => $doc['fullName'],
                'specialization' => $doc['specialization'],
                'department' => $doc['department'] ?? $doc['specialization'],
                'consultationFee' => $doc['consultationFee'] ?? 50,
                'yearsOfExperience' => $doc['yearsOfExperience'] ?? 0,
                'qualifications' => $doc['qualifications'] ?? '',
                'isAvailable' => $doc['isAvailable'] ?? true
            ];
        }

        echo json_encode([
            "success" => true,
            "doctors" => $formattedDoctors,
            "count" => count($formattedDoctors)
        ]);
    }
    // البحث بالاسم
    elseif (isset($_GET['search'])) {
        $results = $doctor->searchByName($_GET['search']);

        $formattedResults = [];
        foreach ($results as $doc) {
            $formattedResults[] = [
                'doctorID' => $doc['doctorID'],
                'fullName' => $doc['fullName'],
                'specialization' => $doc['specialization'],
                'consultationFee' => $doc['consultationFee'] ?? 50
            ];
        }

        echo json_encode([
            "success" => true,
            "doctors" => $formattedResults,
            "count" => count($formattedResults)
        ]);
    }
    // جلب جميع الأطباء
    else {
        $specialization = isset($_GET['specialty']) ? $_GET['specialty'] : null;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

        $doctors = $doctor->getAll($specialization, $limit, $offset);

        $formattedDoctors = [];
        foreach ($doctors as $doc) {
            $formattedDoctors[] = [
                'doctorID' => $doc['doctorID'],
                'fullName' => $doc['fullName'],
                'specialization' => $doc['specialization'],
                'consultationFee' => $doc['consultationFee'] ?? 50,
                'isAvailable' => $doc['isAvailable'] ?? true
            ];
        }

        echo json_encode([
            "success" => true,
            "doctors" => $formattedDoctors,
            "count" => count($formattedDoctors)
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Server error: " . $e->getMessage()
    ]);
}
