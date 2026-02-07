<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../config/database.php';
require_once '../models/Doctor.php';

$database = new Database();
$db = $database->getConnection();

$doctor = new Doctor($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // جلب طبيب محدد
        if (isset($_GET['doctorID'])) {
            $doctorData = $doctor->findByID($_GET['doctorID']);

            if ($doctorData) {
                echo json_encode([
                    "success" => true,
                    "doctor" => $doctorData
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Doctor not found"]);
            }
        }
        // جلب الأطباء حسب التخصص
        elseif (isset($_GET['specialization'])) {
            $doctors = $doctor->getBySpecialization($_GET['specialization']);
            echo json_encode([
                "success" => true,
                "doctors" => $doctors,
                "count" => count($doctors)
            ]);
        }
        // البحث بالاسم
        elseif (isset($_GET['search'])) {
            $results = $doctor->searchByName($_GET['search']);
            echo json_encode([
                "success" => true,
                "doctors" => $results
            ]);
        }
        // جلب جميع الأطباء
        else {
            $specialization = isset($_GET['specialty']) ? $_GET['specialty'] : null;
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

            $doctors = $doctor->getAll($specialization, $limit, $offset);
            echo json_encode([
                "success" => true,
                "doctors" => $doctors,
                "count" => count($doctors)
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
