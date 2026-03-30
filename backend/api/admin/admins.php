<?php
// api/admin/admins.php
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
require_once '../../models/Admin.php';

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

$adminModel = new Admin($db);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['adminID'])) {
            // جلب أدمن محدد
            $admin = $adminModel->findByID($_GET['adminID']);

            if ($admin) {
                echo json_encode(["success" => true, "admin" => $admin]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Admin not found"]);
            }
        } else {
            // جلب جميع الأدمن
            $admins = $adminModel->getAll();
            echo json_encode(["success" => true, "admins" => $admins]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        if ($action === 'create') {
            // إنشاء أدمن جديد
            $required = ['username', 'password', 'email', 'fullName'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "$field is required"]);
                    exit;
                }
            }

            // التحقق من عدم تكرار اسم المستخدم أو البريد الإلكتروني
            $existingUser = $userModel->findByUsername($input['username']);
            if ($existingUser) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Username already exists"]);
                exit;
            }

            $existingEmail = $userModel->findByEmail($input['email']);
            if ($existingEmail) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Email already exists"]);
                exit;
            }

            $db->beginTransaction();

            try {
                // إنشاء حساب مستخدم
                $userData = [
                    'username' => $input['username'],
                    'password' => $input['password'],
                    'email' => $input['email'],
                    'phone' => $input['phone'] ?? null,
                    'userType' => 'admin'
                ];

                $userID = $userModel->create($userData);

                if (!$userID) {
                    throw new Exception("Failed to create user");
                }

                // إنشاء ملف أدمن
                $adminData = [
                    'userID' => $userID,
                    'fullName' => $input['fullName'],
                    'department' => $input['department'] ?? null,
                    'role' => $input['role'] ?? 'Administrator',
                    'permissions' => $input['permissions'] ?? null
                ];

                $adminID = $adminModel->create($adminData);

                if (!$adminID) {
                    throw new Exception("Failed to create admin profile");
                }

                $db->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Admin created successfully",
                    "adminID" => $adminID,
                    "userID" => $userID
                ]);
            } catch (Exception $e) {
                $db->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to create admin: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid action"]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['adminID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Admin ID is required"]);
            exit;
        }

        $db->beginTransaction();

        try {
            // جلب admin الحالي
            $admin = $adminModel->findByID($input['adminID']);
            if (!$admin) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Admin not found"]);
                exit;
            }

            // تحديث بيانات المستخدم
            $userData = [];
            if (isset($input['email'])) {
                // التحقق من عدم تكرار البريد الإلكتروني
                $existingEmail = $userModel->findByEmail($input['email']);
                if ($existingEmail && $existingEmail['userID'] !== $admin['userID']) {
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

            if (isset($input['password']) && !empty($input['password'])) {
                $userData['password'] = $input['password'];
            }

            if (!empty($userData)) {
                $userUpdated = $userModel->update($admin['userID'], $userData);
                if (!$userUpdated) {
                    throw new Exception("Failed to update user");
                }
            }

            // تحديث بيانات الأدمن
            $adminData = [];
            if (isset($input['fullName'])) {
                $adminData['fullName'] = $input['fullName'];
            }
            if (isset($input['department'])) {
                $adminData['department'] = $input['department'];
            }
            if (isset($input['role'])) {
                $adminData['role'] = $input['role'];
            }
            if (isset($input['permissions'])) {
                $adminData['permissions'] = $input['permissions'];
            }

            if (!empty($adminData)) {
                $adminUpdated = $adminModel->update($input['adminID'], $adminData);
                if (!$adminUpdated) {
                    throw new Exception("Failed to update admin profile");
                }
            }

            $db->commit();

            echo json_encode(["success" => true, "message" => "Admin updated successfully"]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to update admin: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['adminID'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Admin ID is required"]);
            exit;
        }

        // لا يمكن حذف حسابك الخاص
        $admin = $adminModel->findByID($input['adminID']);
        if (!$admin) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Admin not found"]);
            exit;
        }

        if ($admin['userID'] === $currentUserID) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Cannot delete your own account"]);
            exit;
        }

        $db->beginTransaction();

        try {
            // حذف ملف الأدمن
            $adminDeleted = $adminModel->delete($input['adminID']);
            if (!$adminDeleted) {
                throw new Exception("Failed to delete admin profile");
            }

            // حذف المستخدم
            $userDeleted = $userModel->delete($admin['userID']);
            if (!$userDeleted) {
                throw new Exception("Failed to delete user");
            }

            $db->commit();

            echo json_encode(["success" => true, "message" => "Admin deleted successfully"]);
        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to delete admin: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
        break;
}
