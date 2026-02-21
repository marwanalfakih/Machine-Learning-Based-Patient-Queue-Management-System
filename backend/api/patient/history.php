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

// جلب بيانات المريض الأساسية
$patientData = $patientInfo['patient'];

// جلب الحالات المرضية من السجلات
$query = "SELECT DISTINCT diagnosis, recordDate 
          FROM MedicalRecords 
          WHERE patientID = :patientID AND diagnosis IS NOT NULL AND diagnosis != ''
          ORDER BY recordDate DESC";

$stmt = $db->prepare($query);
$stmt->bindParam(':patientID', $patient['patientID']);
$stmt->execute();

$conditions = [];
while ($row = $stmt->fetch()) {
    $conditions[] = [
        'name' => $row['diagnosis'],
        'diagnosedDate' => date('Y-m-d', strtotime($row['recordDate'])),
        'status' => 'Active',
        'isChronic' => false, // يمكن تحديد ذلك من البيانات
        'notes' => ''
    ];
}

// تحويل الحساسية من نص إلى مصفوفة
$allergies = [];
if (!empty($patientData['allergies'])) {
    $allergyList = explode(',', $patientData['allergies']);
    foreach ($allergyList as $allergy) {
        $allergies[] = [
            'name' => trim($allergy),
            'severity' => 'Mild',
            'reaction' => 'Not specified'
        ];
    }
}

// العمليات الجراحية (يمكن جلبها من جدول منفصل)
$surgeries = [];

// التاريخ العائلي (يمكن جلبها من جدول منفصل)
$familyHistory = [];

$history = [
    'bloodType' => $patientData['bloodType'] ?? 'Unknown',
    'conditions' => $conditions,
    'allergies' => $allergies,
    'surgeries' => $surgeries,
    'family' => $familyHistory
];

echo json_encode([
    "success" => true,
    "history" => $history
]);
