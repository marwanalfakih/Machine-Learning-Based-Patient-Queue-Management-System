<?php
// api/doctor/patient-details.php
header("Access-Control-Allow-Origin: http://localhost:3000");
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
require_once '../../models/Patient.php';
require_once '../../models/User.php';
require_once '../../models/Doctor.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من التوكن
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

if (empty($token)) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Token is required"
    ]);
    exit;
}

// فك تشفير التوكن
try {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception("Invalid token format");
    }

    $payload = json_decode(base64_decode($parts[1]), true);

    if (!$payload || !isset($payload['userID'])) {
        throw new Exception("Invalid token payload");
    }

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        throw new Exception("Token has expired");
    }

    $userID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Authentication failed: " . $e->getMessage()
    ]);
    exit;
}

// التحقق من أن المستخدم هو دكتور
$userModel = new User($db);
$user = $userModel->findByID($userID);

if (!$user || $user['userType'] !== 'doctor') {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "Access denied. Doctor account required."
    ]);
    exit;
}

// التحقق من وجود patientID
if (!isset($_GET['patientID'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Patient ID is required"
    ]);
    exit;
}

$patientID = $_GET['patientID'];

// جلب بيانات المريض
$patientModel = new Patient($db);
$patient = $patientModel->findByID($patientID);

if (!$patient) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Patient not found"
    ]);
    exit;
}

// جلب البريد الإلكتروني والهاتف من جدول users
$patientUser = $userModel->findByID($patient['userID']);

// حساب العمر من تاريخ الميلاد
$age = null;
if ($patient['dateOfBirth']) {
    $birthDate = new DateTime($patient['dateOfBirth']);
    $today = new DateTime();
    $age = $today->diff($birthDate)->y;
}

// جلب آخر المواعيد للمريض
$appointmentsQuery = "SELECT a.appointmentDate, a.status, a.type, d.fullName as doctorName
                     FROM appointments a
                     JOIN doctors d ON a.doctorID = d.doctorID
                     WHERE a.patientID = :patientID
                     ORDER BY a.appointmentDate DESC
                     LIMIT 5";
$appointmentsStmt = $db->prepare($appointmentsQuery);
$appointmentsStmt->bindParam(':patientID', $patientID);
$appointmentsStmt->execute();
$recentAppointments = $appointmentsStmt->fetchAll();

// جلب السجلات الطبية الأخيرة
$recordsQuery = "SELECT recordDate, diagnosis, treatmentNotes
                 FROM medicalrecords
                 WHERE patientID = :patientID
                 ORDER BY recordDate DESC
                 LIMIT 3";
$recordsStmt = $db->prepare($recordsQuery);
$recordsStmt->bindParam(':patientID', $patientID);
$recordsStmt->execute();
$recentRecords = $recordsStmt->fetchAll();

// تجهيز البيانات للإرجاع
$patientData = [
    'patientID' => $patient['patientID'],
    'fullName' => $patient['fullName'],
    'email' => $patientUser['email'] ?? null,
    'phone' => $patientUser['phone'] ?? null,
    'dateOfBirth' => $patient['dateOfBirth'],
    'age' => $age,
    'gender' => $patient['gender'],
    'bloodType' => $patient['bloodType'],
    'address' => $patient['address'],
    'emergencyContact' => $patient['emergencyContact'],
    'medicalHistory' => $patient['medicalHistory'],
    'allergies' => $patient['allergies'],
    'initials' => substr($patient['fullName'], 0, 2),
    'recentAppointments' => $recentAppointments,
    'recentRecords' => $recentRecords
];

echo json_encode([
    "success" => true,
    "patient" => $patientData
]);
