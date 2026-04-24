<?php
// api/patient/queue_ai.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

require_once '../../config/db.php';
require_once '../../models/Queue.php';
require_once 'shared/auth_helper.php';
require_once '../../models/Patient.php';

$database = new Database();
$db = $database->getConnection();

$userID = validateToken();
$patientInfo = getPatientData($db, $userID);
$patient = $patientInfo['patient'];

$queueModel = new Queue($db);
$queueData = $queueModel->getPatientPosition($patient['patientID']);

// ========== استلام بيانات GPS من الطلب ==========
$useAI = isset($_GET['use_ai']) ? filter_var($_GET['use_ai'], FILTER_VALIDATE_BOOLEAN) : false;
$lat = isset($_GET['lat']) ? floatval($_GET['lat']) : null;
$lng = isset($_GET['lng']) ? floatval($_GET['lng']) : null;

if ($useAI && $queueData && isset($queueData['inQueue']) && $queueData['inQueue']) {

    $doctorID = $queueData['doctorID'];
    $currentPosition = $queueData['position'];

    // جلب بيانات queue من قاعدة البيانات
    $statsQuery = "SELECT 
                    COUNT(*) as total_patients,
                    SUM(CASE WHEN queuePosition < :position AND q.status = 'waiting' THEN 1 ELSE 0 END) as patients_ahead,
                    (SELECT yearsOfExperience FROM doctors WHERE doctorID = :doctorID) as doctor_experience
                  FROM queue q
                  JOIN appointments a ON q.appointmentID = a.appointmentID
                  WHERE a.doctorID = :doctorID 
                    AND DATE(q.checkinTime) = CURDATE()
                    AND q.status IN ('waiting', 'checked-in')";

    $statsStmt = $db->prepare($statsQuery);
    $statsStmt->bindParam(':doctorID', $doctorID);
    $statsStmt->bindParam(':position', $currentPosition);
    $statsStmt->execute();
    $queueStats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // استدعاء AI
    $aiResult = callAIPrediction(
        $doctorID,
        $currentPosition,
        $patient['patientID'],
        $lat,
        $lng,
        $queueStats['total_patients'] ?? 1,
        $queueStats['patients_ahead'] ?? ($currentPosition - 1),
        $queueStats['doctor_experience'] ?? 5
    );

    if ($aiResult && $aiResult['success']) {
        $queueData['ai_enabled'] = true;
        $queueData['ai_prediction'] = [
            'total_wait_minutes' => $aiResult['predicted_time'],
            'clinic_wait_minutes' => $aiResult['clinic_wait_time'],
            'confidence' => 'high',
            'model' => 'tabpfn'
        ];
        $queueData['estimatedWait'] = $aiResult['predicted_time'] . ' mins';
    }
}

echo json_encode(["success" => true, "queue" => $queueData]);

function callAIPrediction($doctorID, $position, $patientID, $lat, $lng, $total_patients, $patients_ahead, $doctor_experience)
{
    // إحداثيات المستشفى (نفس الموجودة في checkin.php)
    $hospitalLat = 21.24545;
    $hospitalLng = 40.41980;

    // حساب المسافة
    $distance = calculateDistance($lat, $lng, $hospitalLat, $hospitalLng);
    $eta_minutes = ($distance / 1000 / 40) * 60; // 40 km/h

    $ch = curl_init('http://localhost:5001/api/predict');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'doctorID' => $doctorID,
        'queuePosition' => $position,
        'patientID' => $patientID,
        'distance_km' => $distance / 1000,
        'eta_minutes' => $eta_minutes,
        'total_patients' => $total_patients,
        'patients_ahead' => $patients_ahead,
        'doctor_experience' => $doctor_experience
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

function calculateDistance($lat1, $lon1, $lat2, $lon2)
{
    $earthRadius = 6371000;
    $latFrom = deg2rad($lat1);
    $lonFrom = deg2rad($lon1);
    $latTo = deg2rad($lat2);
    $lonTo = deg2rad($lon2);
    $latDelta = $latTo - $latFrom;
    $lonDelta = $lonTo - $lonFrom;
    $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
        cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
    return $angle * $earthRadius;
}
