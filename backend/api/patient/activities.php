<?php
header("Access-Control-Allow-Origin: *");
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
require_once 'shared/auth_helper.php';

$database = new Database();
$db = $database->getConnection();

// التحقق من التوكن والحصول على userID
$userID = validateToken();

// التحقق من أن المستخدم مريض
$patientInfo = getPatientData($db, $userID);
$patient = $patientInfo['patient'];
$user = $patientInfo['user'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed"
    ]);
    exit;
}

// جلب النشاطات من سجل النظام
$query = "SELECT * FROM SystemLogs 
          WHERE userID = :userID
          ORDER BY logTime DESC 
          LIMIT 15";

$stmt = $db->prepare($query);
$stmt->bindParam(':userID', $userID);
$stmt->execute();

$activities = [];
while ($row = $stmt->fetch()) {
    $activities[] = [
        'id' => $row['logID'],
        'type' => mapActionType($row['actionType']),
        'description' => $row['actionDescription'],
        'time' => timeAgo($row['logTime']),
        'icon' => getIconForAction($row['actionType'])
    ];
}

echo json_encode([
    "success" => true,
    "activities" => $activities
]);

// دوال مساعدة
function mapActionType($actionType)
{
    $map = [
        'login' => 'general',
        'registration' => 'general',
        'appointment_booking' => 'appointment',
        'appointment_cancelled' => 'appointment',
        'medication_taken' => 'medication',
        'lab_results' => 'lab',
        'checkin' => 'checkin',
        'vital_signs' => 'vitals'
    ];
    return $map[$actionType] ?? 'general';
}

function getIconForAction($actionType)
{
    $map = [
        'login' => 'fa-sign-in-alt',
        'registration' => 'fa-user-plus',
        'appointment_booking' => 'fa-calendar-check',
        'appointment_cancelled' => 'fa-calendar-times',
        'medication_taken' => 'fa-pills',
        'lab_results' => 'fa-flask',
        'checkin' => 'fa-map-marker-alt',
        'vital_signs' => 'fa-heartbeat'
    ];
    return $map[$actionType] ?? 'fa-circle';
}

function timeAgo($datetime)
{
    $time = strtotime($datetime);
    $now = time();
    $diff = $now - $time;

    if ($diff < 60) return 'Just now';
    if ($diff < 3600) return floor($diff / 60) . ' minutes ago';
    if ($diff < 86400) return floor($diff / 3600) . ' hours ago';
    if ($diff < 604800) return floor($diff / 86400) . ' days ago';
    return date('M j, Y', $time);
}
