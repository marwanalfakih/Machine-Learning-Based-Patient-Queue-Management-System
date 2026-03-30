<?php
// api/admin/doctors.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

error_log("===== Admin Doctors API Called =====");
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Doctor.php';
require_once '../../models/Appointment.php';
require_once '../../models/User.php';
require_once '../../middleware/AuthMiddleware.php';

$database = new Database();
$db = $database->getConnection();

// الحصول على التوكن من الهيدر
$headers = getallheaders();
$token = isset($headers['Authorization']) ? $headers['Authorization'] : '';
error_log("Authorization Header: " . $token);

if (empty($token)) {
    error_log("No token provided");
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Token is required"]);
    exit;
}

// التحقق من التوكن
$auth = new AuthMiddleware($db);
$authResult = $auth->validateToken($token);
error_log("Token validation result: " . json_encode($authResult));

if (!$authResult['success']) {
    error_log("Auth failed: " . $authResult['message']);
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => $authResult['message']
    ]);
    exit;
}

$currentUser = $authResult['user'];
error_log("Current User: " . json_encode($currentUser));

// التحقق من أن المستخدم أدمن
if ($currentUser['userType'] !== 'admin') {
    error_log("Access denied - user type: " . $currentUser['userType']);
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "Access denied. Admin account required."
    ]);
    exit;
}

error_log("Admin access granted for user: " . $currentUser['username']);

$doctorModel = new Doctor($db);
$appointmentModel = new Appointment($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['doctorID'])) {
            // جلب طبيب محدد
            $doctor = $doctorModel->findByID($_GET['doctorID']);

            if (!$doctor) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Doctor not found"]);
                exit;
            }

            // جلب إحصائيات إضافية
            $appointments = $appointmentModel->getByDoctor($_GET['doctorID']);
            $todayAppointments = array_filter($appointments, function ($app) {
                return date('Y-m-d', strtotime($app['appointmentDate'])) === date('Y-m-d');
            });

            $doctor['stats'] = [
                'totalAppointments' => count($appointments),
                'todayAppointments' => count($todayAppointments),
                'completedAppointments' => count(array_filter($appointments, function ($app) {
                    return $app['status'] === 'completed';
                }))
            ];

            echo json_encode(["success" => true, "doctor" => $doctor]);
        } elseif (isset($_GET['specialization'])) {
            // جلب أطباء حسب التخصص
            $doctors = $doctorModel->getBySpecialization($_GET['specialization']);
            echo json_encode(["success" => true, "doctors" => $doctors, "count" => count($doctors)]);
        } elseif (isset($_GET['search'])) {
            // بحث بالاسم
            $doctors = $doctorModel->searchByName($_GET['search']);
            echo json_encode(["success" => true, "doctors" => $doctors, "count" => count($doctors)]);
        } else {
            // جلب جميع الأطباء
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $specialization = isset($_GET['filter']) ? $_GET['filter'] : null;

            $doctors = $doctorModel->getAll($specialization, $limit, $offset);

            // إجمالي عدد الأطباء
            $totalQuery = "SELECT COUNT(*) as total FROM doctors";
            $stmt = $db->prepare($totalQuery);
            $stmt->execute();
            $total = $stmt->fetch(PDO::FETCH_ASSOC);

            // تنسيق البيانات للإرجاع
            $formattedDoctors = [];
            foreach ($doctors as $doc) {
                $formattedDoctors[] = [
                    'doctorID' => $doc['doctorID'],
                    'userID' => $doc['userID'],
                    'fullName' => $doc['fullName'],
                    'username' => $doc['username'] ?? '',
                    'email' => $doc['email'] ?? '',
                    'phone' => $doc['phone'] ?? '',
                    'specialization' => $doc['specialization'],
                    'licenseNumber' => $doc['licenseNumber'],
                    'qualifications' => $doc['qualifications'],
                    'department' => $doc['department'],
                    'yearsOfExperience' => (int)$doc['yearsOfExperience'],
                    'consultationFee' => (float)$doc['consultationFee'],
                    'isAvailable' => (bool)$doc['isAvailable'],
                    'isActive' => (bool)($doc['is_active'] ?? true),
                    'totalAppointments' => (int)($doc['totalAppointments'] ?? 0),
                    'todayAppointments' => (int)($doc['todayAppointments'] ?? 0),
                    'initials' => substr($doc['fullName'], 0, 2)
                ];
            }

            echo json_encode([
                "success" => true,
                "doctors" => $formattedDoctors,
                "total" => (int)$total['total']
            ]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        if ($action === 'create') {
            // إنشاء طبيب جديد
            $required = ['username', 'password', 'email', 'fullName', 'specialization', 'licenseNumber'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "$field is required"]);
                    exit;
                }
            }

            // التحقق من عدم تكرار اسم المستخدم
            $userModel = new User($db);
            $existingUser = $userModel->findByUsername($input['username']);
            if ($existingUser) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Username already exists"]);
                exit;
            }

            // التحقق من عدم تكرار البريد الإلكتروني
            $existingEmail = $userModel->findByEmail($input['email']);
            if ($existingEmail) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Email already exists"]);
                exit;
            }

            $db->beginTransaction();

            try {
                // إنشاء حساب مستخدم
                $userID = 'USR_DOC_' . uniqid() . '_' . time();
                $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);

                $userQuery = "INSERT INTO users (userID, username, password, email, phone, userType, created_at, is_active) 
                              VALUES (:userID, :username, :password, :email, :phone, 'doctor', NOW(), 1)";
                $userStmt = $db->prepare($userQuery);
                $userStmt->bindParam(':userID', $userID);
                $userStmt->bindParam(':username', $input['username']);
                $userStmt->bindParam(':password', $hashedPassword);
                $userStmt->bindParam(':email', $input['email']);
                $phone = $input['phone'] ?? null;
                $userStmt->bindParam(':phone', $phone);
                $userStmt->execute();

                // إنشاء ملف طبيب
                $doctorID = 'DOC_' . uniqid();

                $doctorQuery = "INSERT INTO doctors 
                                (doctorID, userID, fullName, specialization, licenseNumber, qualifications, 
                                 department, yearsOfExperience, consultationFee, isAvailable)
                                VALUES 
                                (:doctorID, :userID, :fullName, :specialization, :licenseNumber, :qualifications,
                                 :department, :yearsOfExperience, :consultationFee, 1)";
                $doctorStmt = $db->prepare($doctorQuery);
                $doctorStmt->bindParam(':doctorID', $doctorID);
                $doctorStmt->bindParam(':userID', $userID);
                $doctorStmt->bindParam(':fullName', $input['fullName']);
                $doctorStmt->bindParam(':specialization', $input['specialization']);
                $doctorStmt->bindParam(':licenseNumber', $input['licenseNumber']);
                $qualifications = $input['qualifications'] ?? null;
                $doctorStmt->bindParam(':qualifications', $qualifications);
                $department = $input['department'] ?? null;
                $doctorStmt->bindParam(':department', $department);
                $yearsOfExperience = $input['yearsOfExperience'] ?? 0;
                $doctorStmt->bindParam(':yearsOfExperience', $yearsOfExperience);
                $consultationFee = $input['consultationFee'] ?? 0;
                $doctorStmt->bindParam(':consultationFee', $consultationFee);
                $doctorStmt->execute();

                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Doctor created successfully",
                    "doctorID" => $doctorID
                ]);
            } catch (Exception $e) {
                $db->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to create doctor: " . $e->getMessage()]);
            }
        } elseif ($action === 'toggle-availability') {
            if (empty($input['doctorID'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
                exit;
            }

            $isAvailable = isset($input['isAvailable']) ? (int)$input['isAvailable'] : 1;
            $query = "UPDATE doctors SET isAvailable = :isAvailable WHERE doctorID = :doctorID";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':isAvailable', $isAvailable);
            $stmt->bindParam(':doctorID', $input['doctorID']);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Doctor availability updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update doctor availability"]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid action"]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['doctorID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
            exit;
        }

        // جلب doctor الحالي
        $doctor = $doctorModel->findByID($input['doctorID']);
        if (!$doctor) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Doctor not found"]);
            exit;
        }

        // تحديث بيانات الطبيب فقط (بدون تحديث المستخدم)
        $doctorData = [];
        $fields = [
            'fullName',
            'specialization',
            'licenseNumber',
            'qualifications',
            'department',
            'yearsOfExperience',
            'consultationFee',
            'isAvailable'
        ];

        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $doctorData[$field] = $input[$field];
            }
        }

        if (empty($doctorData)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "No fields to update"]);
            exit;
        }

        $updated = $doctorModel->update($input['doctorID'], $doctorData);

        if ($updated) {
            echo json_encode(["success" => true, "message" => "Doctor updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to update doctor"]);
        }
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['doctorID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
            exit;
        }

        // التحقق من وجود مواعيد مستقبلية
        $doctor = $doctorModel->findByID($input['doctorID']);
        if (!$doctor) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Doctor not found"]);
            exit;
        }

        $appointments = $appointmentModel->getByDoctor($input['doctorID']);
        $upcomingAppointments = array_filter($appointments, function ($app) {
            return strtotime($app['appointmentDate']) > time() &&
                in_array($app['status'], ['scheduled', 'confirmed']);
        });

        if (count($upcomingAppointments) > 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Cannot delete doctor with upcoming appointments"]);
            exit;
        }

        $deleted = $doctorModel->delete($input['doctorID']);

        if ($deleted) {
            echo json_encode(["success" => true, "message" => "Doctor deleted successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to delete doctor"]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
