<?php
// api/admin/patients.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/User.php';
require_once '../../models/Patient.php';
require_once '../../models/Appointment.php';

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

$patientModel = new Patient($db);
$appointmentModel = new Appointment($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['patientID'])) {
            // جلب مريض محدد
            $patient = $patientModel->findByIDForAdmin($_GET['patientID']);

            if (!$patient) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Patient not found"]);
                exit;
            }

            // جلب المواعيد السابقة
            $patient['recentAppointments'] = $appointmentModel->getByPatient($_GET['patientID'], null, 10);

            echo json_encode(["success" => true, "patient" => $patient]);
        } elseif (isset($_GET['recent'])) {
            // جلب أحدث المرضى
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $patients = $patientModel->getRecentPatients($limit);
            echo json_encode(["success" => true, "patients" => $patients]);
        } else {
            // جلب جميع المرضى
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $patients = $patientModel->getAll($limit, $offset);

            // إجمالي عدد المرضى
            $totalQuery = "SELECT COUNT(*) as total FROM patients";
            $stmt = $db->prepare($totalQuery);
            $stmt->execute();
            $total = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "patients" => $patients,
                "total" => (int)$total['total']
            ]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['patientID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Patient ID is required"]);
            exit;
        }

        $db->beginTransaction();

        try {
            // جلب patient الحالي
            $patient = $patientModel->findByID($input['patientID']);
            if (!$patient) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Patient not found"]);
                exit;
            }

            // تحديث بيانات المستخدم
            $userData = [];
            if (isset($input['email']) && $input['email'] !== $patient['email']) {
                // التحقق من عدم تكرار البريد الإلكتروني
                $existingEmail = $userModel->findByEmail($input['email']);
                if ($existingEmail && $existingEmail['userID'] !== $patient['userID']) {
                    throw new Exception("Email already exists");
                }
                $userData['email'] = $input['email'];
            }

            if (isset($input['phone'])) {
                $userData['phone'] = $input['phone'];
            }

            if (isset($input['isActive'])) {
                $userData['is_active'] = $input['isActive'] ? 1 : 0;
            }

            if (!empty($userData)) {
                $userUpdated = $userModel->update($patient['userID'], $userData);
                if (!$userUpdated) {
                    throw new Exception("Failed to update user");
                }
            }

            // تحديث بيانات المريض
            $patientData = [];
            $fields = [
                'fullName',
                'dateOfBirth',
                'gender',
                'address',
                'emergencyContact',
                'bloodType',
                'medicalHistory',
                'allergies'
            ];

            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $patientData[$field] = $input[$field];
                }
            }

            if (!empty($patientData)) {
                $patientUpdated = $patientModel->update($input['patientID'], $patientData);
                if (!$patientUpdated) {
                    throw new Exception("Failed to update patient profile");
                }
            }

            $db->commit();

            echo json_encode(["success" => true, "message" => "Patient updated successfully"]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to update patient: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['patientID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Patient ID is required"]);
            exit;
        }

        $db->beginTransaction();

        try {
            // جلب patient الحالي
            $patient = $patientModel->findByID($input['patientID']);
            if (!$patient) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Patient not found"]);
                exit;
            }

            // حذف ملف المريض
            $patientDeleted = $patientModel->delete($input['patientID']);
            if (!$patientDeleted) {
                throw new Exception("Failed to delete patient profile");
            }

            // حذف المستخدم
            $userDeleted = $userModel->delete($patient['userID']);
            if (!$userDeleted) {
                throw new Exception("Failed to delete user");
            }

            $db->commit();

            echo json_encode(["success" => true, "message" => "Patient deleted successfully"]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to delete patient: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
