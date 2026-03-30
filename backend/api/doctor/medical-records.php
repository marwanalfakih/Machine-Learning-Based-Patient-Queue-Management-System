<?php
// api/doctor/medical-records.php
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
        // جلب السجلات الطبية
        $query = "SELECT mr.*, 
                         p.fullName as patientName,
                         p.patientID,
                         a.appointmentDate
                  FROM medicalrecords mr
                  JOIN patients p ON mr.patientID = p.patientID
                  JOIN appointments a ON mr.appointmentID = a.appointmentID
                  WHERE mr.doctorID = :doctorID
                  ORDER BY mr.recordDate DESC";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':doctorID', $doctor['doctorID']);
        $stmt->execute();

        $records = [];
        while ($row = $stmt->fetch()) {
            $records[] = [
                'recordID' => $row['recordID'],
                'patientID' => $row['patientID'],
                'patientName' => $row['patientName'],
                'appointmentDate' => $row['appointmentDate'],
                'recordDate' => $row['recordDate'],
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
            "records" => $records,
            "count" => count($records)
        ]);
        break;

    case 'POST':
        // إنشاء سجل طبي جديد
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['patientID']) || !isset($input['appointmentID'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Patient ID and Appointment ID are required"
            ]);
            exit;
        }

        // التحقق من أن الموعد يخص هذا الطبيب
        $checkQuery = "SELECT appointmentID FROM appointments 
                       WHERE appointmentID = :appointmentID AND doctorID = :doctorID";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':appointmentID', $input['appointmentID']);
        $checkStmt->bindParam(':doctorID', $doctor['doctorID']);
        $checkStmt->execute();

        if (!$checkStmt->fetch()) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "You don't have permission to create records for this appointment"
            ]);
            exit;
        }

        $recordID = 'REC_' . uniqid() . '_' . time();

        $vitalSigns = isset($input['vitalSigns']) ? json_encode($input['vitalSigns']) : null;

        $query = "INSERT INTO medicalrecords 
                  (recordID, patientID, doctorID, appointmentID, diagnosis, symptoms, 
                   treatmentNotes, vitalSigns, followupRequired, followupDate)
                  VALUES 
                  (:recordID, :patientID, :doctorID, :appointmentID, :diagnosis, :symptoms,
                   :treatmentNotes, :vitalSigns, :followupRequired, :followupDate)";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':recordID', $recordID);
        $stmt->bindParam(':patientID', $input['patientID']);
        $stmt->bindParam(':doctorID', $doctor['doctorID']);
        $stmt->bindParam(':appointmentID', $input['appointmentID']);
        $stmt->bindParam(':diagnosis', $input['diagnosis']);
        $stmt->bindParam(':symptoms', $input['symptoms']);
        $stmt->bindParam(':treatmentNotes', $input['treatmentNotes']);
        $stmt->bindParam(':vitalSigns', $vitalSigns);
        $stmt->bindParam(':followupRequired', $input['followupRequired']);
        $stmt->bindParam(':followupDate', $input['followupDate']);

        if ($stmt->execute()) {
            // تحديث حالة الموعد إلى مكتمل
            $updateQuery = "UPDATE appointments SET status = 'completed' WHERE appointmentID = :appointmentID";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindParam(':appointmentID', $input['appointmentID']);
            $updateStmt->execute();

            echo json_encode([
                "success" => true,
                "message" => "Medical record created successfully",
                "recordID" => $recordID
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to create medical record"
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
