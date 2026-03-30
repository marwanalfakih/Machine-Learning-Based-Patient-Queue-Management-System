<?php
// middleware/AuthMiddleware.php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../config/constants.php';


class AuthMiddleware
{
    private $conn;
    private $user;
    //private $jwt_secret = "smart_healthcare_secret_key_2026"; // يجب أن يكون نفس المفتاح في AuthController

    public function __construct($db)
    {
        $this->conn = $db;
        $this->user = new User($db);
    }

    // التحقق من صحة التوكن
    public function validateToken($token)
    {
        try {
            error_log("AuthMiddleware: Validating token");
            if (empty($token)) {
                error_log("AuthMiddleware: Empty token");
                return [
                    'success' => false,
                    'message' => 'No token provided'
                ];
            }

            // إزالة "Bearer " إذا وجدت
            $token = str_replace('Bearer ', '', $token);
            error_log("AuthMiddleware: Token after cleanup: " . substr($token, 0, 30) . "...");


            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                error_log("AuthMiddleware: Invalid token format - parts count: " . count($parts));
                return [
                    'success' => false,
                    'message' => 'Invalid token format'
                ];
            }

            // التحقق من التوقيع
            $signature = hash_hmac('sha256', $parts[0] . "." . $parts[1], JWT_SECRET, true);

            // $signature = hash_hmac('sha256', $parts[0] . "." . $parts[1], $this->jwt_secret, true);
            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

            if ($base64UrlSignature !== $parts[2]) {
                return [
                    'success' => false,
                    'message' => 'Invalid token signature'
                ];
            }

            // فك تشفير الـ payload
            $payload = json_decode(base64_decode($parts[1]), true);
            error_log("AuthMiddleware: Token payload: " . json_encode($payload));

            if (!$payload || !isset($payload['userID'])) {
                error_log("AuthMiddleware: Invalid token payload - missing userID");
                return [
                    'success' => false,
                    'message' => 'Invalid token payload'
                ];
            }


            // التحقق من انتهاء الصلاحية
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                error_log("AuthMiddleware: Token expired - exp: " . $payload['exp'] . ", now: " . time());
                return [
                    'success' => false,
                    'message' => 'Token has expired'
                ];
            }

            // التحقق من وجود المستخدم
            $user = $this->user->findByID($payload['userID']);
            if (!$user) {
                error_log("AuthMiddleware: User not found for ID: " . $payload['userID']);
                return [
                    'success' => false,
                    'message' => 'User not found'
                ];
            }

            error_log("AuthMiddleware: User found: " . $user['username']);

            // التحقق من حالة الحساب
            if (!$user['is_active']) {
                error_log("AuthMiddleware: Account is inactive for user: " . $user['username']);
                return [
                    'success' => false,
                    'message' => 'Account is inactive'
                ];
            }

            return [
                'success' => true,
                'user' => $user,
                'payload' => $payload
            ];
        } catch (Exception $e) {
            error_log("AuthMiddleware: Exception - " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Authentication failed: ' . $e->getMessage()
            ];
        }
    }

    // التحقق من الصلاحيات حسب نوع المستخدم
    public function checkRole($user, $allowedRoles)
    {
        if (empty($allowedRoles)) {
            return true;
        }

        return in_array($user['userType'], $allowedRoles);
    }
}
