<?php
// api/doctor/analytics.php
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

// تحديد الفترة
$period = isset($_GET['period']) ? $_GET['period'] : 'month';
$interval = '30 DAY';
if ($period === 'week') {
    $interval = '7 DAY';
} elseif ($period === 'year') {
    $interval = '365 DAY';
}

// إحصائيات عامة
$statsQuery = "SELECT 
                COUNT(DISTINCT a.patientID) as totalPatients,
                SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completedAppointments,
                SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelledAppointments,
                AVG(CASE WHEN a.status = 'completed' THEN TIMESTAMPDIFF(MINUTE, a.appointmentDate, a.updated_at) ELSE NULL END) as avgConsultationTime,
                COUNT(a.appointmentID) as totalAppointments
               FROM appointments a
               WHERE a.doctorID = :doctorID
               AND a.appointmentDate >= DATE_SUB(NOW(), INTERVAL $interval)";

$statsStmt = $db->prepare($statsQuery);
$statsStmt->bindParam(':doctorID', $doctor['doctorID']);
$statsStmt->execute();
$stats = $statsStmt->fetch();

// حساب متوسط وقت الانتظار من جدول queue
$waitQuery = "SELECT AVG(q.actualWaitTime) as avgWaitTime
              FROM queue q
              JOIN appointments a ON q.appointmentID = a.appointmentID
              WHERE a.doctorID = :doctorID
              AND q.actualWaitTime IS NOT NULL
              AND q.checkinTime >= DATE_SUB(NOW(), INTERVAL $interval)";

$waitStmt = $db->prepare($waitQuery);
$waitStmt->bindParam(':doctorID', $doctor['doctorID']);
$waitStmt->execute();
$waitResult = $waitStmt->fetch();

// حساب الإيرادات (افتراضي 50$ لكل موعد مكتمل)
$revenue = ($stats['completedAppointments'] ?? 0) * 50;

// إحصائيات يومية
$dailyQuery = "SELECT 
                DATE(a.appointmentDate) as day,
                COUNT(a.appointmentID) as count
               FROM appointments a
               WHERE a.doctorID = :doctorID
               AND a.appointmentDate >= DATE_SUB(NOW(), INTERVAL $interval)
               GROUP BY DATE(a.appointmentDate)
               ORDER BY day ASC";

$dailyStmt = $db->prepare($dailyQuery);
$dailyStmt->bindParam(':doctorID', $doctor['doctorID']);
$dailyStmt->execute();

$dailyData = [];
while ($row = $dailyStmt->fetch()) {
    $dailyData[] = [
        'day' => date('M d', strtotime($row['day'])),
        'count' => (int)$row['count']
    ];
}

// توزيع المواعيد حسب الساعة
$hourlyQuery = "SELECT 
                HOUR(a.appointmentDate) as hour,
                COUNT(a.appointmentID) as count
               FROM appointments a
               WHERE a.doctorID = :doctorID
               AND a.appointmentDate >= DATE_SUB(NOW(), INTERVAL $interval)
               GROUP BY HOUR(a.appointmentDate)
               ORDER BY hour ASC";

$hourlyStmt = $db->prepare($hourlyQuery);
$hourlyStmt->bindParam(':doctorID', $doctor['doctorID']);
$hourlyStmt->execute();

$hourlyData = [];
while ($row = $hourlyStmt->fetch()) {
    $hourlyData[] = [
        'hour' => $row['hour'] . ':00',
        'count' => (int)$row['count']
    ];
}

echo json_encode([
    "success" => true,
    "stats" => [
        'totalPatients' => (int)($stats['totalPatients'] ?? 0),
        'completedAppointments' => (int)($stats['completedAppointments'] ?? 0),
        'cancelledAppointments' => (int)($stats['cancelledAppointments'] ?? 0),
        'averageWaitTime' => round($waitResult['avgWaitTime'] ?? 0),
        'averageConsultationTime' => round($stats['avgConsultationTime'] ?? 0),
        'revenue' => $revenue,
        'patientSatisfaction' => 95 // قيمة افتراضية
    ],
    'dailyData' => $dailyData,
    'hourlyData' => $hourlyData
]);
