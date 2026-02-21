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
        // جلب المؤشرات الحيوية
        $query = "SELECT recordDate, vitalSigns 
                  FROM MedicalRecords 
                  WHERE patientID = :patientID AND vitalSigns IS NOT NULL
                  ORDER BY recordDate DESC
                  LIMIT 15";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':patientID', $patient['patientID']);
        $stmt->execute();

        $vitals = [];
        while ($row = $stmt->fetch()) {
            $vitalData = json_decode($row['vitalSigns'], true);
            if ($vitalData) {
                $vitals[] = [
                    'recordDate' => $row['recordDate'],
                    'bloodPressure' => $vitalData['bloodPressure'] ?? null,
                    'heartRate' => $vitalData['heartRate'] ?? null,
                    'temperature' => $vitalData['temperature'] ?? null,
                    'weight' => $vitalData['weight'] ?? null,
                    'height' => $vitalData['height'] ?? null,
                    'bmi' => calculateBMI($vitalData['weight'] ?? null, $vitalData['height'] ?? null)
                ];
            }
        }

        echo json_encode([
            "success" => true,
            "vitals" => $vitals
        ]);
        break;

    case 'POST':
        // إضافة قراءة جديدة (تسجيل في السجل)
        $data = json_decode(file_get_contents("php://input"));

        $notes = "Recorded: ";
        if (!empty($data->bloodPressure)) $notes .= "BP:{$data->bloodPressure} ";
        if (!empty($data->heartRate)) $notes .= "HR:{$data->heartRate} ";
        if (!empty($data->temperature)) $notes .= "Temp:{$data->temperature}°C ";
        if (!empty($data->weight)) $notes .= "Weight:{$data->weight}kg ";

        // تسجيل في سجل النظام
        $query = "INSERT INTO SystemLogs (userID, actionType, actionDescription) 
                  VALUES (:userID, 'vital_signs', :notes)";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':userID', $userID);
        $stmt->bindParam(':notes', $notes);

        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "Vital signs recorded successfully"
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to record vital signs"
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

function calculateBMI($weight, $height)
{
    if (!$weight || !$height || $height == 0) return null;
    $heightInM = $height / 100;
    return round($weight / ($heightInM * $heightInM), 1);
}
