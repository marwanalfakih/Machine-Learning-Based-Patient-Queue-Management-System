<?php
// api/doctor/prescriptions.php
header("Access-Control-Allow-Origin: http://localhost:3000");
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
require_once '../../models/Doctor.php';
require_once '../../models/Patient.php';
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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // جلب الوصفات الطبية
        $query = "SELECT p.*, 
                         pt.fullName as patientName,
                         mr.recordDate,
                         mr.diagnosis
                  FROM prescriptions p
                  JOIN medicalrecords mr ON p.recordID = mr.recordID
                  JOIN patients pt ON mr.patientID = pt.patientID
                  WHERE mr.doctorID = :doctorID
                  ORDER BY p.prescribedDate DESC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':doctorID', $doctor['doctorID']);
        $stmt->execute();

        $prescriptions = [];
        while ($row = $stmt->fetch()) {
            $prescriptions[] = [
                'prescriptionID' => $row['prescriptionID'],
                'recordID' => $row['recordID'],
                'patientName' => $row['patientName'],
                'medicationName' => $row['medicationName'],
                'dosage' => $row['dosage'],
                'frequency' => $row['frequency'],
                'duration' => $row['duration'],
                'instructions' => $row['instructions'],
                'prescribedDate' => $row['prescribedDate'],
                'isActive' => (bool)$row['isActive']
            ];
        }

        echo json_encode([
            "success" => true,
            "prescriptions" => $prescriptions,
            "count" => count($prescriptions)
        ]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? null;

        if ($action === 'create') {
            // إنشاء وصفة طبية جديدة
            if (!isset($input['patientID']) || !isset($input['medicationName'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "error" => "Patient ID and medication name are required"
                ]);
                exit;
            }

            // البحث عن آخر سجل طبي للمريض
            $recordQuery = "SELECT recordID FROM medicalrecords 
                            WHERE patientID = :patientID AND doctorID = :doctorID
                            ORDER BY recordDate DESC LIMIT 1";
            $recordStmt = $db->prepare($recordQuery);
            $recordStmt->bindParam(':patientID', $input['patientID']);
            $recordStmt->bindParam(':doctorID', $doctor['doctorID']);
            $recordStmt->execute();
            $record = $recordStmt->fetch();

            if (!$record) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "error" => "No medical record found for this patient"
                ]);
                exit;
            }

            $prescriptionID = 'PRE_' . uniqid() . '_' . time();

            $query = "INSERT INTO prescriptions 
                      (prescriptionID, recordID, medicationName, dosage, frequency, duration, instructions, prescribedDate, isActive)
                      VALUES 
                      (:prescriptionID, :recordID, :medicationName, :dosage, :frequency, :duration, :instructions, NOW(), 1)";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':prescriptionID', $prescriptionID);
            $stmt->bindParam(':recordID', $record['recordID']);
            $stmt->bindParam(':medicationName', $input['medicationName']);
            $stmt->bindParam(':dosage', $input['dosage']);
            $stmt->bindParam(':frequency', $input['frequency']);
            $stmt->bindParam(':duration', $input['duration']);
            $stmt->bindParam(':instructions', $input['instructions']);

            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Prescription created successfully",
                    "prescriptionID" => $prescriptionID
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "error" => "Failed to create prescription"
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Invalid action"
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
