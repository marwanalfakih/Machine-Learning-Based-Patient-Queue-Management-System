<?php
// api/doctor/schedule.php
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

// تحديد نطاق التاريخ
$startDate = isset($_GET['start']) ? $_GET['start'] : date('Y-m-d');
$endDate = isset($_GET['end']) ? $_GET['end'] : date('Y-m-d', strtotime('+7 days'));

// جلب المواعيد في النطاق
$query = "SELECT a.*, p.fullName as patientName
          FROM appointments a
          JOIN patients p ON a.patientID = p.patientID
          WHERE a.doctorID = :doctorID
          AND DATE(a.appointmentDate) BETWEEN :startDate AND :endDate
          ORDER BY a.appointmentDate ASC";

$stmt = $db->prepare($query);
$stmt->bindParam(':doctorID', $doctor['doctorID']);
$stmt->bindParam(':startDate', $startDate);
$stmt->bindParam(':endDate', $endDate);
$stmt->execute();

$appointments = [];
while ($row = $stmt->fetch()) {
    $appointments[] = [
        'appointmentID' => $row['appointmentID'],
        'patientName' => $row['patientName'],
        'appointmentDate' => $row['appointmentDate'],
        'status' => $row['status'],
        'type' => $row['type']
    ];
}

echo json_encode([
    "success" => true,
    "appointments" => $appointments,
    "count" => count($appointments)
]);
