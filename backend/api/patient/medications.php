<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

switch ($method) {
    case 'GET':
        // جلب الأدوية
        $query = "SELECT p.*, mr.recordDate, d.fullName as doctorName
                  FROM Prescriptions p
                  JOIN MedicalRecords mr ON p.recordID = mr.recordID
                  JOIN Doctors d ON mr.doctorID = d.doctorID
                  WHERE mr.patientID = :patientID AND p.isActive = 1
                  ORDER BY p.prescribedDate DESC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':patientID', $patient['patientID']);
        $stmt->execute();

        $medications = [];
        while ($row = $stmt->fetch()) {
            $medications[] = [
                'medicationID' => $row['prescriptionID'],
                'medicationName' => $row['medicationName'],
                'dosage' => $row['dosage'],
                'frequency' => $row['frequency'],
                'duration' => $row['duration'],
                'instructions' => $row['instructions'],
                'prescribedDate' => $row['prescribedDate'],
                'doctorName' => $row['doctorName'],
                'isActive' => (bool)$row['isActive']
            ];
        }

        echo json_encode([
            "success" => true,
            "medications" => $medications
        ]);
        break;

    case 'POST':
        // تسجيل تناول الدواء
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->medicationID)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Medication ID required"
            ]);
            exit;
        }

        // تسجيل في سجل النظام
        $query = "INSERT INTO SystemLogs (userID, actionType, actionDescription, entityType, entityID) 
                  VALUES (:userID, 'medication_taken', 'Marked medication as taken', 'medication', :medicationID)";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':userID', $userID);
        $stmt->bindParam(':medicationID', $data->medicationID);

        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "Medication marked as taken"
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to log medication"
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "error" => "Method not allowed"
        ]);
}
