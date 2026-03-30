<?php
// api/admin/appointments.php
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
require_once '../../models/Appointment.php';
require_once '../../models/Doctor.php';
require_once '../../models/Patient.php';
require_once '../../models/Queue.php';

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

$appointmentModel = new Appointment($db);
$doctorModel = new Doctor($db);
$patientModel = new Patient($db);
$queueModel = new Queue($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['appointmentID'])) {
            // جلب موعد محدد
            $appointment = $appointmentModel->findByID($_GET['appointmentID']);

            if (!$appointment) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Appointment not found"]);
                exit;
            }

            echo json_encode(["success" => true, "appointment" => $appointment]);
        } elseif (isset($_GET['date'])) {
            // جلب مواعيد حسب التاريخ
            $date = $_GET['date'];
            $appointments = $appointmentModel->getByDate($date);

            // حساب الإحصائيات لهذا اليوم
            $stats = [
                'total' => count($appointments),
                'scheduled' => 0,
                'confirmed' => 0,
                'checked_in' => 0,
                'in_progress' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'no_show' => 0
            ];

            foreach ($appointments as $app) {
                if (isset($stats[$app['status']])) {
                    $stats[$app['status']]++;
                }
            }

            echo json_encode([
                "success" => true,
                "date" => $date,
                "appointments" => $appointments,
                "stats" => $stats
            ]);
        } elseif (isset($_GET['doctorID'])) {
            // جلب مواعيد طبيب محدد
            $doctorID = $_GET['doctorID'];
            $date = $_GET['date'] ?? null;
            $appointments = $appointmentModel->getByDoctor($doctorID, $date);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments
            ]);
        } elseif (isset($_GET['patientID'])) {
            // جلب مواعيد مريض محدد
            $patientID = $_GET['patientID'];
            $appointments = $appointmentModel->getByPatient($patientID);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments
            ]);
        } elseif (isset($_GET['upcoming'])) {
            // جلب المواعيد القادمة
            $days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
            $appointments = $appointmentModel->getUpcoming(null, null, $days);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments
            ]);
        } else {
            // جلب جميع المواعيد
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $status = isset($_GET['status']) ? $_GET['status'] : null;

            $query = "SELECT a.*, 
                             p.fullName as patientName,
                             d.fullName as doctorName,
                             d.specialization,
                             q.queuePosition,
                             q.checkinTime,
                             q.status as queueStatus
                      FROM appointments a
                      JOIN patients p ON a.patientID = p.patientID
                      JOIN doctors d ON a.doctorID = d.doctorID
                      LEFT JOIN queue q ON a.appointmentID = q.appointmentID
                      WHERE 1=1";

            $params = [];

            if ($status) {
                $query .= " AND a.status = :status";
                $params[':status'] = $status;
            }

            $query .= " ORDER BY a.appointmentDate DESC LIMIT :limit OFFSET :offset";

            $stmt = $db->prepare($query);

            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }

            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // إجمالي عدد المواعيد
            $totalQuery = "SELECT COUNT(*) as total FROM appointments";
            $totalStmt = $db->prepare($totalQuery);
            $totalStmt->execute();
            $total = $totalStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "appointments" => $appointments,
                "total" => (int)$total['total']
            ]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        if ($action === 'create') {
            // إنشاء موعد جديد
            $required = ['patientID', 'doctorID', 'appointmentDate'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "$field is required"]);
                    exit;
                }
            }

            // التحقق من وجود المريض
            $patient = $patientModel->findByID($input['patientID']);
            if (!$patient) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Patient not found"]);
                exit;
            }

            // التحقق من وجود الطبيب
            $doctor = $doctorModel->findByID($input['doctorID']);
            if (!$doctor) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor not found"]);
                exit;
            }

            // التحقق من عدم وجود تعارض
            $existingAppointments = $appointmentModel->getByDoctor($input['doctorID'], date('Y-m-d', strtotime($input['appointmentDate'])));
            $conflict = array_filter($existingAppointments, function ($app) use ($input) {
                return $app['appointmentDate'] === $input['appointmentDate'] &&
                    !in_array($app['status'], ['cancelled', 'completed']);
            });

            if (!empty($conflict)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor is not available at this time"]);
                exit;
            }

            $appointmentData = [
                'patientID' => $input['patientID'],
                'doctorID' => $input['doctorID'],
                'appointmentDate' => $input['appointmentDate'],
                'type' => $input['type'] ?? 'consultation',
                'reason' => $input['reason'] ?? '',
                'notes' => $input['notes'] ?? '',
                'status' => 'scheduled'
            ];

            $appointmentID = $appointmentModel->create($appointmentData);

            if ($appointmentID) {
                echo json_encode([
                    "success" => true,
                    "message" => "Appointment created successfully",
                    "appointmentID" => $appointmentID
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to create appointment"]);
            }
        } elseif ($action === 'update-status') {
            // تحديث حالة الموعد
            if (empty($input['appointmentID']) || empty($input['status'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Appointment ID and status are required"]);
                exit;
            }

            $validStatuses = ['scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];
            if (!in_array($input['status'], $validStatuses)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid status"]);
                exit;
            }

            $updated = $appointmentModel->updateStatus($input['appointmentID'], $input['status']);

            if ($updated) {
                echo json_encode(["success" => true, "message" => "Appointment status updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update appointment status"]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid action"]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['appointmentID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Appointment ID is required"]);
            exit;
        }

        $updated = $appointmentModel->update($input['appointmentID'], $input);

        if ($updated) {
            echo json_encode(["success" => true, "message" => "Appointment updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to update appointment"]);
        }
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['appointmentID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Appointment ID is required"]);
            exit;
        }

        $db->beginTransaction();

        try {
            // حذف من قائمة الانتظار إذا موجود
            $queueQuery = "SELECT queueID FROM queue WHERE appointmentID = :appointmentID";
            $queueStmt = $db->prepare($queueQuery);
            $queueStmt->bindParam(':appointmentID', $input['appointmentID']);
            $queueStmt->execute();

            if ($queueStmt->rowCount() > 0) {
                $queueModel->removeFromQueue($queueStmt->fetch()['queueID']);
            }

            // حذف الموعد
            $query = "DELETE FROM appointments WHERE appointmentID = :appointmentID";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':appointmentID', $input['appointmentID']);
            $stmt->execute();

            $db->commit();

            echo json_encode(["success" => true, "message" => "Appointment deleted successfully"]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to delete appointment: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
