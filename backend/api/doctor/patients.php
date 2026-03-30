<?php
// api/doctor/patients.php
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
require_once '../../models/Doctor.php';
require_once '../../models/Patient.php';
require_once '../../models/User.php';

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

// جلب doctorID من userID
$doctorModel = new Doctor($db);
$doctor = $doctorModel->findByUserID($userID);

if (!$doctor) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Doctor profile not found"
    ]);
    exit;
}

// جلب جميع المرضى الذين لديهم مواعيد مع هذا الطبيب
$query = "SELECT DISTINCT 
            p.patientID, 
            p.fullName, 
            p.dateOfBirth,
            p.gender,
            p.bloodType,
            p.medicalHistory,
            p.allergies,
            u.email,
            u.phone,
            MAX(a.appointmentDate) as lastVisit,
            COUNT(a.appointmentID) as totalVisits
          FROM appointments a
          JOIN patients p ON a.patientID = p.patientID
          JOIN users u ON p.userID = u.userID
          WHERE a.doctorID = :doctorID
          GROUP BY p.patientID
          ORDER BY lastVisit DESC";

$stmt = $db->prepare($query);
$stmt->bindParam(':doctorID', $doctor['doctorID']);
$stmt->execute();

$patients = [];
while ($row = $stmt->fetch()) {
    // حساب العمر
    $age = null;
    if ($row['dateOfBirth']) {
        $birthDate = new DateTime($row['dateOfBirth']);
        $today = new DateTime();
        $age = $today->diff($birthDate)->y;
    }

    $patients[] = [
        'patientID' => $row['patientID'],
        'fullName' => $row['fullName'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'age' => $age,
        'gender' => $row['gender'],
        'bloodType' => $row['bloodType'],
        'medicalHistory' => $row['medicalHistory'],
        'allergies' => $row['allergies'],
        'lastVisit' => $row['lastVisit'],
        'totalVisits' => (int)$row['totalVisits'],
        'initials' => substr($row['fullName'], 0, 2)
    ];
}

echo json_encode([
    "success" => true,
    "patients" => $patients,
    "count" => count($patients)
]);
