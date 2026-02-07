<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Patient.php';
require_once __DIR__ . '/../models/Doctor.php';
require_once __DIR__ . '/../config/constants.php';

class AuthController
{
    private $conn;
    private $user;
    private $patient;
    private $doctor;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->user = new User($db);
        $this->patient = new Patient($db);
        $this->doctor = new Doctor($db);
    }

    // تسجيل مستخدم جديد
    public function register($data)
    {
        try {
            // التحقق من البيانات المدخلة
            $requiredFields = ['email', 'password', 'username', 'userType'];
            foreach ($requiredFields as $field) {
                if (empty($data->$field)) {
                    throw new Exception("$field is required");
                }
            }

            // التحقق من صحة البريد الإلكتروني
            if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Invalid email format");
            }

            // التحقق من قوة كلمة المرور
            if (strlen($data->password) < 8) {
                throw new Exception("Password must be at least 8 characters");
            }

            // التحقق من عدم وجود مستخدم بنفس البريد الإلكتروني
            if ($this->user->emailExists($data->email)) {
                throw new Exception("Email already exists");
            }

            // التحقق من عدم وجود مستخدم بنفس اسم المستخدم
            if ($this->user->usernameExists($data->username)) {
                throw new Exception("Username already taken");
            }

            // إنشاء المستخدم في جدول Users
            $userData = [
                'username' => $data->username,
                'email' => $data->email,
                'password' => password_hash($data->password, PASSWORD_BCRYPT),
                'phone' => $data->phone ?? '',
                'userType' => $data->userType,
                'is_active' => $data->userType === 'patient' ? 1 : 0 // الأطباء بحاجة للموافقة
            ];

            $userID = $this->user->create($userData);

            if (!$userID) {
                throw new Exception("Failed to create user account");
            }

            // إنشاء بيانات إضافية بناءً على الدور
            if ($data->userType === 'patient' && isset($data->patient_data)) {
                $patientData = [
                    'userID' => $userID,
                    'fullName' => $data->patient_data->fullName ?? '',
                    'dateOfBirth' => $data->patient_data->dateOfBirth ?? '',
                    'gender' => $data->patient_data->gender ?? '',
                    'address' => $data->patient_data->address ?? '',
                    'emergencyContact' => $data->patient_data->emergencyContact ?? '',
                    'bloodType' => $data->patient_data->bloodType ?? '',
                    'medicalHistory' => $data->patient_data->medicalHistory ?? '',
                    'allergies' => $data->patient_data->allergies ?? ''
                ];

                $patientID = $this->patient->create($patientData);

                if (!$patientID) {
                    // حذف المستخدم إذا فشل إنشاء المريض
                    $this->user->delete($userID);
                    throw new Exception("Failed to create patient profile");
                }
            } elseif ($data->userType === 'doctor' && isset($data->doctor_data)) {
                $doctorData = [
                    'userID' => $userID,
                    'fullName' => $data->doctor_data->fullName ?? '',
                    'specialization' => $data->doctor_data->specialization ?? '',
                    'licenseNumber' => $data->doctor_data->licenseNumber ?? '',
                    'qualifications' => $data->doctor_data->qualifications ?? '',
                    'department' => $data->doctor_data->department ?? '',
                    'yearsOfExperience' => $data->doctor_data->yearsOfExperience ?? 0,
                    'consultationFee' => $data->doctor_data->consultationFee ?? 0,
                    'isAvailable' => $data->doctor_data->isAvailable ?? 0
                ];

                $doctorID = $this->doctor->create($doctorData);

                if (!$doctorID) {
                    // حذف المستخدم إذا فشل إنشاء الطبيب
                    $this->user->delete($userID);
                    throw new Exception("Failed to create doctor profile");
                }
            }

            // تسجيل في السجل
            $this->logActivity($userID, 'registration', 'User registered successfully');

            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => $data->userType === 'patient'
                    ? "Registration successful. You can now login."
                    : "Registration submitted. Waiting for admin approval.",
                "userID" => $userID
            ]);
        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => $e->getMessage()
            ]);
        }
    }

    // تسجيل الدخول
    public function login($data)
    {
        try {
            if (empty($data->email) || empty($data->password)) {
                throw new Exception("Email and password are required");
            }

            $user = $this->user->findByEmail($data->email);

            if (!$user) {
                throw new Exception("Invalid email or password");
            }

            // التحقق من حالة الحساب
            if (!$user['is_active']) {
                throw new Exception("Account is inactive. Please contact support.");
            }

            // التحقق من كلمة المرور
            if (!password_verify($data->password, $user['password'])) {
                $pp = $user['password'];
                throw new Exception("Invalid email or password");
            }

            // إنشاء توكن JWT
            $token = $this->generateJWT([
                'userID' => $user['userID'],
                'username' => $user['username'],
                'email' => $user['email'],
                'userType' => $user['userType']
            ]);

            // جلب بيانات إضافية بناءً على الدور
            $userDetails = $this->getUserDetails($user['userID'], $user['userType']);

            // تسجيل في السجل
            $this->logActivity($user['userID'], 'login', 'User logged in successfully');

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Login successful",
                "token" => $token,
                "user" => [
                    "userID" => $user['userID'],
                    "username" => $user['username'],
                    "email" => $user['email'],
                    "phone" => $user['phone'],
                    "userType" => $user['userType'],
                    "created_at" => $user['created_at'],
                    "details" => $userDetails
                ]
            ]);
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "error" => $e->getMessage()
            ]);
        }
    }

    // توليد توكن JWT
    private function generateJWT($payload)
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['exp'] = time() + (60 * 60 * 24); // 24 ساعة
        $payload = json_encode($payload);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    // جلب تفاصيل المستخدم بناءً على الدور
    private function getUserDetails($userID, $userType)
    {
        if ($userType === 'patient') {
            return $this->patient->findByUserID($userID);
        } elseif ($userType === 'doctor') {
            return $this->doctor->findByUserID($userID);
        } elseif ($userType === 'admin') {
            // جلب بيانات المسؤول
            $query = "SELECT * FROM Admins WHERE userID = :userID";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":userID", $userID);
            $stmt->execute();
            return $stmt->fetch();
        }
        return null;
    }

    // التحقق من التوكن
    public function verifyToken()
    {
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            throw new Exception("Token is required");
        }

        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                throw new Exception("Invalid token format");
            }

            $signature = hash_hmac('sha256', $parts[0] . "." . $parts[1], JWT_SECRET, true);
            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

            if ($base64UrlSignature !== $parts[2]) {
                throw new Exception("Invalid token signature");
            }

            $payload = json_decode(base64_decode($parts[1]), true);

            // التحقق من انتهاء الصلاحية
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                throw new Exception("Token has expired");
            }

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Token is valid",
                "user" => $payload
            ]);
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "error" => $e->getMessage()
            ]);
        }
    }

    // تسجيل النشاطات
    private function logActivity($userID, $actionType, $description)
    {
        try {
            $query = "INSERT INTO SystemLogs (userID, actionType, actionDescription, ipAddress, userAgent) 
                      VALUES (:userID, :actionType, :description, :ipAddress, :userAgent)";

            $stmt = $this->conn->prepare($query);

            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

            $stmt->bindParam(":userID", $userID);
            $stmt->bindParam(":actionType", $actionType);
            $stmt->bindParam(":description", $description);
            $stmt->bindParam(":ipAddress", $ipAddress);
            $stmt->bindParam(":userAgent", $userAgent);

            $stmt->execute();
        } catch (Exception $e) {
            error_log("Failed to log activity: " . $e->getMessage());
        }
    }
}
