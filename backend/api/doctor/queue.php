<?php
// api/doctor/queue.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../../models/Doctor.php';
require_once '../../models/Queue.php';
require_once '../../models/Appointment.php';
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

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed"
    ]);
    exit;
}

// الحصول على معاملات الطلب
$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$department = isset($_GET['department']) ? $_GET['department'] : null;

// جلب قائمة الانتظار لهذا الطبيب
$query = "SELECT 
            q.queueID,
            q.queuePosition,
            q.estimatedWaitTime,
            q.estimatedArrivalTime,
            q.checkinTime,
            q.status as queueStatus,
            q.priority,
            q.ai_predicted_wait,
            q.ai_confidence,
            q.ai_model,
            a.appointmentID,
            a.appointmentDate,
            a.status as appointmentStatus,
            a.type,
            a.reason,
            p.patientID,
            p.fullName as patientName,
            p.dateOfBirth,
            p.gender,
            p.bloodType,
            p.medicalHistory,
            p.allergies,
            u.phone,
            TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURDATE()) as age
          FROM queue q
          JOIN appointments a ON q.appointmentID = a.appointmentID
          JOIN patients p ON a.patientID = p.patientID
          JOIN users u ON p.userID = u.userID
          WHERE a.doctorID = :doctorID
            AND DATE(q.checkinTime) = :date
            AND q.status IN ('waiting', 'in-consultation')
          ORDER BY 
            CASE 
                WHEN q.priority = 'emergency' THEN 1
                WHEN q.priority = 'high' THEN 2
                WHEN q.priority = 'normal' THEN 3
                ELSE 4
            END,
            q.queuePosition ASC";

$stmt = $db->prepare($query);
$stmt->bindParam(':doctorID', $doctor['doctorID']);
$stmt->bindParam(':date', $date);
$stmt->execute();

$queue = [];
$totalWaitTime = 0;
$patientCount = 0;

while ($row = $stmt->fetch()) {
    // حساب وقت الانتظار المتبقي (إذا كان متاحاً)
    $estimatedRemaining = $row['estimatedWaitTime'];

    // حساب وقت الانتظار المتبقي بناءً على الموقع إذا لم يكن متاحاً
    if (!$estimatedRemaining) {
        $estimatedRemaining = $row['queuePosition'] * 15; // 15 دقيقة لكل مريض
    }

    // تنسيق وقت الوصول التقديري
    $estimatedArrivalTime = null;
    if (!empty($row['estimatedArrivalTime'])) {
        $seconds = $row['estimatedArrivalTime'];
        if ($seconds < 60) {
            $estimatedArrivalTime = floor($seconds) . ' sec';
        } elseif ($seconds < 3600) {
            $minutes = floor($seconds / 60);
            $secs = $seconds % 60;
            $estimatedArrivalTime = $minutes . ' min ' . ($secs > 0 ? $secs . ' sec' : '');
        } else {
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            $estimatedArrivalTime = $hours . ' hr ' . $minutes . ' min';
        }
    }

    $queue[] = [
        'queueID' => $row['queueID'],
        'position' => (int)$row['queuePosition'],
        'estimatedWait' => $estimatedRemaining . ' mins',
        'estimatedWaitMinutes' => (int)$estimatedRemaining,
        'estimatedArrivalTime' => $estimatedArrivalTime,
        'checkinTime' => $row['checkinTime'],
        'status' => $row['queueStatus'],
        'priority' => $row['priority'],

        // بيانات AI
        'aiPredictedWait' => $row['ai_predicted_wait'] ?? null,
        'aiConfidence' => $row['ai_confidence'] ?? null,
        'aiModel' => $row['ai_model'] ?? null,

        // بيانات الموعد
        'appointmentID' => $row['appointmentID'],
        'appointmentDate' => $row['appointmentDate'],
        'appointmentStatus' => $row['appointmentStatus'],
        'appointmentType' => $row['type'],
        'reason' => $row['reason'],

        // بيانات المريض
        'patientID' => $row['patientID'],
        'patientName' => $row['patientName'],
        'patientAge' => $row['age'] ?? null,
        'patientGender' => $row['gender'],
        'patientBloodType' => $row['bloodType'],
        'patientPhone' => $row['phone'],
        'patientMedicalHistory' => $row['medicalHistory'],
        'patientAllergies' => $row['allergies'],
        'patientInitials' => substr($row['patientName'], 0, 2)
    ];

    $totalWaitTime += $estimatedRemaining;
    $patientCount++;
}

// حساب متوسط وقت الانتظار
$averageWaitTime = $patientCount > 0 ? round($totalWaitTime / $patientCount) : 0;

// إحصائيات إضافية
$statsQuery = "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN priority = 'emergency' THEN 1 ELSE 0 END) as emergency,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END) as normal
               FROM queue q
               JOIN appointments a ON q.appointmentID = a.appointmentID
               WHERE a.doctorID = :doctorID
                 AND DATE(q.checkinTime) = :date
                 AND q.status IN ('waiting', 'in-consultation')";

$statsStmt = $db->prepare($statsQuery);
$statsStmt->bindParam(':doctorID', $doctor['doctorID']);
$statsStmt->bindParam(':date', $date);
$statsStmt->execute();
$stats = $statsStmt->fetch();

echo json_encode([
    "success" => true,
    "date" => $date,
    "queue" => $queue,
    "stats" => [
        "total" => (int)($stats['total'] ?? 0),
        "emergency" => (int)($stats['emergency'] ?? 0),
        "high" => (int)($stats['high'] ?? 0),
        "normal" => (int)($stats['normal'] ?? 0),
        "averageWaitTime" => $averageWaitTime,
        "totalPatients" => $patientCount
    ],
    "doctor" => [
        "id" => $doctor['doctorID'],
        "name" => $doctor['fullName'],
        "specialization" => $doctor['specialization']
    ]
]);
