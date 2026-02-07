<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../config/database.php';
require_once '../models/Patient.php';
require_once '../controllers/AuthController.php';

$database = new Database();
$db = $database->getConnection();

$patient = new Patient($db);
$authController = new AuthController($db);

$method = $_SERVER['REQUEST_METHOD'];

// التحقق من التوكن
try {
    $authController->verifyToken();
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["error" => $e->getMessage()]);
    exit;
}

switch ($method) {
    case 'GET':
        // جلب معلومات المريض
        if (isset($_GET['patientID'])) {
            $patientData = $patient->findByID($_GET['patientID']);

            if ($patientData) {
                echo json_encode([
                    "success" => true,
                    "patient" => $patientData
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Patient not found"]);
            }
        }
        // البحث بالاسم
        elseif (isset($_GET['search'])) {
            $results = $patient->searchByName($_GET['search']);
            echo json_encode([
                "success" => true,
                "patients" => $results
            ]);
        }
        // جلب جميع المرضى
        else {
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

            $patients = $patient->getAll($limit, $offset);
            echo json_encode([
                "success" => true,
                "patients" => $patients,
                "count" => count($patients)
            ]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if (isset($data->action)) {
            if ($data->action === 'update') {
                // تحديث بيانات المريض
                $result = $patient->update($data->patientID, (array)$data->data);

                if ($result) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Patient updated successfully"
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to update patient"]);
                }
            }
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
