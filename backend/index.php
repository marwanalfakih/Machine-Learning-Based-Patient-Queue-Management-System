<?php
/*header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

echo json_encode([
    "status" => "Backend is running"
]);*/


// index.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");


echo json_encode([
    "status" => "Backend is running"
]);
// معالجة طلبات OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// تحميل ملفات الإعدادات
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/constants.php';

// تحميل الموديلات
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/Patient.php';
require_once __DIR__ . '/models/Doctor.php';
require_once __DIR__ . '/models/Appointment.php';

// إنشاء اتصال قاعدة البيانات
try {
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Database connection failed');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}

// تحميل التوجيه
require_once __DIR__ . '/router.php';

// إنشاء كائن التوجيه
$router = new Router($db);

// =========== مسارات المصادقة (عامة) ===========
$router->addRoute('POST', '/auth/register', 'AuthController', 'register');
$router->addRoute('POST', '/auth/login', 'AuthController', 'login');
$router->addRoute('POST', '/auth/verify', 'AuthController', 'verifyToken');

// =========== مسارات المريض (محمية) ===========
$router->addRoute('GET', '/patient/profile', 'PatientController', 'getProfile', ['patient']);
$router->addRoute('PUT', '/patient/profile', 'PatientController', 'updateProfile', ['patient']);
$router->addRoute('GET', '/patient/appointments', 'PatientController', 'getAppointments', ['patient']);
$router->addRoute('GET', '/patient/appointments/:id', 'PatientController', 'getAppointment', ['patient']);
$router->addRoute('POST', '/patient/appointments', 'PatientController', 'createAppointment', ['patient']);
$router->addRoute('DELETE', '/patient/appointments/:id', 'PatientController', 'cancelAppointment', ['patient']);
$router->addRoute('GET', '/patient/stats', 'PatientController', 'getStats', ['patient']);
$router->addRoute('GET', '/patient/search', 'PatientController', 'searchPatients', ['patient']);

// =========== مسارات الطبيب (محمية) ===========
$router->addRoute('GET', '/doctor/profile', 'DoctorController', 'getProfile', ['doctor']);
$router->addRoute('GET', '/doctor/appointments', 'DoctorController', 'getAppointments', ['doctor']);
$router->addRoute('PUT', '/doctor/availability', 'DoctorController', 'updateAvailability', ['doctor']);
$router->addRoute('PUT', '/doctor/appointments/:id/status', 'DoctorController', 'updateAppointmentStatus', ['doctor']);
$router->addRoute('GET', '/doctor/stats', 'DoctorController', 'getStats', ['doctor']);
$router->addRoute('GET', '/doctor/schedule', 'DoctorController', 'getSchedule', ['doctor']);

// =========== مسارات المواعيد (محمية) ===========
$router->addRoute('GET', '/appointments/upcoming', 'AppointmentController', 'getUpcoming', ['patient', 'doctor']);
$router->addRoute('GET', '/appointments/availability', 'AppointmentController', 'checkAvailability', ['patient', 'doctor']);
$router->addRoute('POST', '/appointments/:id/checkin', 'AppointmentController', 'checkIn', ['patient']);

// =========== مسارات عامة (بدون مصادقة) ===========
$router->addRoute('GET', '/doctors', 'DoctorController', 'getAllDoctors');
$router->addRoute('GET', '/doctors/specialization/:specialization', 'DoctorController', 'getDoctorsBySpecialization');
$router->addRoute('GET', '/doctors/:id', 'DoctorController', 'getDoctorByID');

// معالجة الطلب
$router->handleRequest();
