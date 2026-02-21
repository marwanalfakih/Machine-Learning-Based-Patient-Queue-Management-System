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

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed"
    ]);
    exit;
}

// جلب السجلات الطبية
$query = "SELECT mr.*, d.fullName as doctorName, d.specialization,
                 a.appointmentDate, a.type as appointmentType
          FROM MedicalRecords mr
          JOIN Doctors d ON mr.doctorID = d.doctorID
          JOIN Appointments a ON mr.appointmentID = a.appointmentID
          WHERE mr.patientID = :patientID
          ORDER BY mr.recordDate DESC";

$stmt = $db->prepare($query);
$stmt->bindParam(':patientID', $patient['patientID']);
$stmt->execute();

$records = [];
while ($row = $stmt->fetch()) {
    $records[] = [
        'recordID' => $row['recordID'],
        'recordDate' => $row['recordDate'],
        'doctorName' => $row['doctorName'],
        'doctorSpecialization' => $row['specialization'],
        'appointmentDate' => $row['appointmentDate'],
        'appointmentType' => $row['appointmentType'],
        'diagnosis' => $row['diagnosis'],
        'symptoms' => $row['symptoms'],
        'treatmentNotes' => $row['treatmentNotes'],
        'vitalSigns' => json_decode($row['vitalSigns'], true),
        'followupRequired' => (bool)$row['followupRequired'],
        'followupDate' => $row['followupDate']
    ];
}

echo json_encode([
    "success" => true,
    "records" => $records
]);
