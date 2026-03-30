<?php
// api/admin/reports.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

$method = $_SERVER['REQUEST_METHOD'];
$reportType = isset($_GET['type']) ? $_GET['type'] : 'appointments';
$startDate = isset($_GET['startDate']) ? $_GET['startDate'] : date('Y-m-d', strtotime('-30 days'));
$endDate = isset($_GET['endDate']) ? $_GET['endDate'] : date('Y-m-d');

switch ($reportType) {
    case 'appointments':
        getAppointmentsReport($db, $startDate, $endDate);
        break;

    case 'patients':
        getPatientsReport($db, $startDate, $endDate);
        break;

    case 'doctors':
        getDoctorsReport($db, $startDate, $endDate);
        break;

    case 'revenue':
        getRevenueReport($db, $startDate, $endDate);
        break;

    case 'queue':
        getQueueReport($db, $startDate, $endDate);
        break;

    case 'ai':
        getAIReport($db, $startDate, $endDate);
        break;

    default:
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid report type"]);
        break;
}

function getAppointmentsReport($db, $startDate, $endDate)
{
    try {
        // إحصائيات عامة
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = 'checked-in' THEN 1 ELSE 0 END) as checked_in,
                    SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_show
                  FROM appointments
                  WHERE DATE(appointmentDate) BETWEEN :startDate AND :endDate";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // تفاصيل المواعيد
        $query = "SELECT a.*, 
                         p.fullName as patientName,
                         d.fullName as doctorName,
                         d.specialization
                  FROM appointments a
                  JOIN patients p ON a.patientID = p.patientID
                  JOIN doctors d ON a.doctorID = d.doctorID
                  WHERE DATE(a.appointmentDate) BETWEEN :startDate AND :endDate
                  ORDER BY a.appointmentDate DESC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // إحصائيات يومية
        $dailyQuery = "SELECT 
                        DATE(appointmentDate) as date,
                        COUNT(*) as count,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                       FROM appointments
                       WHERE DATE(appointmentDate) BETWEEN :startDate AND :endDate
                       GROUP BY DATE(appointmentDate)
                       ORDER BY date";

        $dailyStmt = $db->prepare($dailyQuery);
        $dailyStmt->bindParam(':startDate', $startDate);
        $dailyStmt->bindParam(':endDate', $endDate);
        $dailyStmt->execute();
        $daily = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "summary" => $summary,
                "appointments" => $appointments,
                "daily" => $daily,
                "period" => [
                    "start" => $startDate,
                    "end" => $endDate
                ]
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function getPatientsReport($db, $startDate, $endDate)
{
    try {
        // إحصائيات المرضى الجدد
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male,
                    SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female,
                    SUM(CASE WHEN TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) < 18 THEN 1 ELSE 0 END) as children,
                    SUM(CASE WHEN TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) BETWEEN 18 AND 60 THEN 1 ELSE 0 END) as adults,
                    SUM(CASE WHEN TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) > 60 THEN 1 ELSE 0 END) as seniors
                  FROM patients p
                  JOIN users u ON p.userID = u.userID
                  WHERE DATE(u.created_at) BETWEEN :startDate AND :endDate";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // قائمة المرضى الجدد
        $query = "SELECT p.*, u.email, u.phone, u.created_at
                  FROM patients p
                  JOIN users u ON p.userID = u.userID
                  WHERE DATE(u.created_at) BETWEEN :startDate AND :endDate
                  ORDER BY u.created_at DESC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // إحصائيات يومية للتسجيل
        $dailyQuery = "SELECT 
                        DATE(u.created_at) as date,
                        COUNT(*) as count
                       FROM patients p
                       JOIN users u ON p.userID = u.userID
                       WHERE DATE(u.created_at) BETWEEN :startDate AND :endDate
                       GROUP BY DATE(u.created_at)
                       ORDER BY date";

        $dailyStmt = $db->prepare($dailyQuery);
        $dailyStmt->bindParam(':startDate', $startDate);
        $dailyStmt->bindParam(':endDate', $endDate);
        $dailyStmt->execute();
        $daily = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "summary" => $summary,
                "patients" => $patients,
                "daily" => $daily,
                "period" => [
                    "start" => $startDate,
                    "end" => $endDate
                ]
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function getDoctorsReport($db, $startDate, $endDate)
{
    try {
        // أداء الأطباء
        $query = "SELECT 
                    d.doctorID,
                    d.fullName,
                    d.specialization,
                    d.department,
                    d.yearsOfExperience,
                    d.consultationFee,
                    COUNT(a.appointmentID) as totalAppointments,
                    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completedAppointments,
                    SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelledAppointments,
                    SUM(CASE WHEN a.status = 'no-show' THEN 1 ELSE 0 END) as noShowAppointments,
                    SUM(d.consultationFee) as totalRevenue
                  FROM doctors d
                  LEFT JOIN appointments a ON d.doctorID = a.doctorID
                      AND DATE(a.appointmentDate) BETWEEN :startDate AND :endDate
                  GROUP BY d.doctorID
                  ORDER BY completedAppointments DESC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "doctors" => $doctors,
                "period" => [
                    "start" => $startDate,
                    "end" => $endDate
                ]
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function getRevenueReport($db, $startDate, $endDate)
{
    try {
        // إحصائيات الإيرادات
        $query = "SELECT 
                    SUM(d.consultationFee) as totalRevenue,
                    AVG(d.consultationFee) as avgRevenue,
                    COUNT(a.appointmentID) as totalAppointments,
                    COUNT(DISTINCT a.doctorID) as activeDoctors
                  FROM appointments a
                  JOIN doctors d ON a.doctorID = d.doctorID
                  WHERE a.status = 'completed'
                    AND DATE(a.appointmentDate) BETWEEN :startDate AND :endDate";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // إيرادات يومية
        $dailyQuery = "SELECT 
                        DATE(a.appointmentDate) as date,
                        COUNT(*) as appointments,
                        SUM(d.consultationFee) as revenue,
                        AVG(d.consultationFee) as avgPerAppointment
                       FROM appointments a
                       JOIN doctors d ON a.doctorID = d.doctorID
                       WHERE a.status = 'completed'
                         AND DATE(a.appointmentDate) BETWEEN :startDate AND :endDate
                       GROUP BY DATE(a.appointmentDate)
                       ORDER BY date";

        $dailyStmt = $db->prepare($dailyQuery);
        $dailyStmt->bindParam(':startDate', $startDate);
        $dailyStmt->bindParam(':endDate', $endDate);
        $dailyStmt->execute();
        $daily = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

        // إيرادات حسب التخصص
        $specialtyQuery = "SELECT 
                            d.specialization,
                            COUNT(*) as appointments,
                            SUM(d.consultationFee) as revenue
                           FROM appointments a
                           JOIN doctors d ON a.doctorID = d.doctorID
                           WHERE a.status = 'completed'
                             AND DATE(a.appointmentDate) BETWEEN :startDate AND :endDate
                           GROUP BY d.specialization
                           ORDER BY revenue DESC";

        $specialtyStmt = $db->prepare($specialtyQuery);
        $specialtyStmt->bindParam(':startDate', $startDate);
        $specialtyStmt->bindParam(':endDate', $endDate);
        $specialtyStmt->execute();
        $bySpecialty = $specialtyStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "summary" => [
                    "totalRevenue" => (float)($summary['totalRevenue'] ?? 0),
                    "avgRevenue" => (float)($summary['avgRevenue'] ?? 0),
                    "totalAppointments" => (int)($summary['totalAppointments'] ?? 0),
                    "activeDoctors" => (int)($summary['activeDoctors'] ?? 0)
                ],
                "daily" => $daily,
                "bySpecialty" => $bySpecialty,
                "period" => [
                    "start" => $startDate,
                    "end" => $endDate
                ]
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function getQueueReport($db, $startDate, $endDate)
{
    try {
        // إحصائيات قائمة الانتظار
        $query = "SELECT 
                    COUNT(*) as totalPatients,
                    AVG(estimatedWaitTime) as avgWaitTime,
                    MAX(estimatedWaitTime) as maxWaitTime,
                    AVG(actualWaitTime) as avgActualWaitTime,
                    SUM(CASE WHEN priority = 'emergency' THEN 1 ELSE 0 END) as emergency,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as highPriority,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                  FROM queue
                  WHERE DATE(checkinTime) BETWEEN :startDate AND :endDate";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':startDate', $startDate);
        $stmt->bindParam(':endDate', $endDate);
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // إحصائيات يومية
        $dailyQuery = "SELECT 
                        DATE(checkinTime) as date,
                        COUNT(*) as total,
                        AVG(estimatedWaitTime) as avgWait,
                        MAX(estimatedWaitTime) as maxWait,
                        SUM(CASE WHEN priority = 'emergency' THEN 1 ELSE 0 END) as emergency,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                       FROM queue
                       WHERE DATE(checkinTime) BETWEEN :startDate AND :endDate
                       GROUP BY DATE(checkinTime)
                       ORDER BY date";

        $dailyStmt = $db->prepare($dailyQuery);
        $dailyStmt->bindParam(':startDate', $startDate);
        $dailyStmt->bindParam(':endDate', $endDate);
        $dailyStmt->execute();
        $daily = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "summary" => $summary,
                "daily" => $daily,
                "period" => [
                    "start" => $startDate,
                    "end" => $endDate
                ]
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}
function getAIReport($db, $startDate, $endDate)
{
    try {
        $aiModel = new AIPrediction($db);

        $data = [
            "stats" => $aiModel->getStats(),
            "models" => $aiModel->getModelStats(),
            "accuracy" => $aiModel->getAccuracy(),
            "hourly" => $aiModel->getHourlyStats(),
            "period" => [
                "start" => $startDate,
                "end" => $endDate
            ]
        ];

        echo json_encode(["success" => true, "data" => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}
