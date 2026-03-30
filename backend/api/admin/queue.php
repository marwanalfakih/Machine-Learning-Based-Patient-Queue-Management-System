<?php
// api/admin/queue.php
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
require_once '../../models/Queue.php';
require_once '../../models/Doctor.php';

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

$queueModel = new Queue($db);
$doctorModel = new Doctor($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
        $doctorID = isset($_GET['doctorID']) ? $_GET['doctorID'] : null;

        // جلب قائمة الانتظار
        $queue = $queueModel->getCurrentQueue($date, $doctorID);

        // إحصائيات
        $stats = $queueModel->getQueueStats($date);

        // جلب قائمة الأطباء للفلتر
        $doctors = $doctorModel->getAll();

        echo json_encode([
            "success" => true,
            "date" => $date,
            "queue" => $queue,
            "stats" => $stats,
            "doctors" => $doctors
        ]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        if ($action === 'update-order') {
            // تحديث ترتيب قائمة الانتظار
            if (empty($input['queue']) || !is_array($input['queue'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Queue data is required"]);
                exit;
            }

            $updated = $queueModel->updateQueueOrder($input['queue']);

            if ($updated) {
                echo json_encode(["success" => true, "message" => "Queue order updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update queue order"]);
            }
        } elseif ($action === 'update-status') {
            // تحديث حالة مريض في القائمة
            if (empty($input['queueID']) || empty($input['status'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Queue ID and status are required"]);
                exit;
            }

            $updated = $queueModel->updateStatus($input['queueID'], $input['status'], $input['actualWait'] ?? null);

            if ($updated) {
                echo json_encode(["success" => true, "message" => "Queue status updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update queue status"]);
            }
        } elseif ($action === 'update-priority') {
            // تحديث أولوية مريض
            if (empty($input['queueID']) || empty($input['priority'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Queue ID and priority are required"]);
                exit;
            }

            $validPriorities = ['normal', 'high', 'emergency'];
            if (!in_array($input['priority'], $validPriorities)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid priority"]);
                exit;
            }

            $query = "UPDATE queue SET priority = :priority, statusUpdateTime = NOW() WHERE queueID = :queueID";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':priority', $input['priority']);
            $stmt->bindParam(':queueID', $input['queueID']);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Priority updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update priority"]);
            }
        } elseif ($action === 'update-wait-time') {
            // تحديث وقت الانتظار
            if (empty($input['queueID']) || !isset($input['waitTime'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Queue ID and wait time are required"]);
                exit;
            }

            $updated = $queueModel->updateEstimatedWaitTime($input['queueID'], $input['waitTime']);

            if ($updated) {
                echo json_encode(["success" => true, "message" => "Wait time updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update wait time"]);
            }
        } else {
            // تحديث حقول متعددة
            if (empty($input['queueID'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Queue ID is required"]);
                exit;
            }

            $fields = [];
            $params = [':queueID' => $input['queueID']];

            $allowedFields = ['queuePosition', 'estimatedWaitTime', 'estimatedArrivalTime', 'status', 'priority'];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $fields[] = "$field = :$field";
                    $params[":$field"] = $input[$field];
                }
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "No fields to update"]);
                exit;
            }

            $fields[] = "statusUpdateTime = NOW()";

            $query = "UPDATE queue SET " . implode(', ', $fields) . " WHERE queueID = :queueID";
            $stmt = $db->prepare($query);

            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Queue updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update queue"]);
            }
        }
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['queueID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Queue ID is required"]);
            exit;
        }

        $removed = $queueModel->removeFromQueue($input['queueID']);

        if ($removed) {
            echo json_encode(["success" => true, "message" => "Patient removed from queue"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to remove from queue"]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
