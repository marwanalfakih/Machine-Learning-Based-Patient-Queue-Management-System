<?php
// api/admin/dashboard.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/User.php';
require_once '../../models/Doctor.php';
require_once '../../models/Patient.php';
require_once '../../models/Appointment.php';
require_once '../../models/Queue.php';
require_once '../../models/AIPrediction.php';

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

    $currentUserID = $payload['userID'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Authentication failed: " . $e->getMessage()]);
    exit;
}

// التحقق من أن المستخدم هو أدمن
$userModel = new User($db);
$currentUser = $userModel->findByID($currentUserID);

if (!$currentUser || $currentUser['userType'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access denied. Admin account required."]);
    exit;
}

try {
    $stats = [];

    // إحصائيات المستخدمين
    $userModel = new User($db);
    $stats['users'] = $userModel->getUserStats();

    // إحصائيات الأطباء
    $doctorModel = new Doctor($db);
    $stats['doctors'] = $doctorModel->getDoctorStats();
    $stats['doctorSpecialties'] = $doctorModel->getSpecializationDistribution();

    // إحصائيات المرضى
    $patientModel = new Patient($db);
    $stats['patients'] = $patientModel->getPatientStats();
    $stats['recentPatients'] = $patientModel->getRecentPatients(5);

    // إحصائيات المواعيد
    $appointmentModel = new Appointment($db);
    $stats['appointments'] = $appointmentModel->getAppointmentStats();

    // إحصائيات قائمة الانتظار
    $queueModel = new Queue($db);
    $stats['queue'] = $queueModel->getQueueStats();

    // إحصائيات AI
    $aiModel = new AIPrediction($db);
    $stats['ai'] = $aiModel->getStats();

    // المواعيد القادمة
    $stats['upcomingAppointments'] = $appointmentModel->getUpcoming(null, null, 7);

    // النشاطات الأخيرة من systemlogs
    $query = "SELECT l.*, u.username 
              FROM systemlogs l
              LEFT JOIN users u ON l.userID = u.userID
              ORDER BY l.logTime DESC
              LIMIT 20";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $stats['recentActivities'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "stats" => $stats]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
