<?php
require_once __DIR__ . '/../models/Doctor.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Appointment.php';

class DoctorController
{
    private $conn;
    private $doctor;
    private $user;
    private $appointment;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->doctor = new Doctor($db);
        $this->user = new User($db);
        $this->appointment = new Appointment($db);
    }

    // [الحصول على ملف الطبيب الشخصي] (dir="rtl")
    public function getProfile($request)
    {
        try {
            $user = $request->user;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $doctor = $this->doctor->findByUserID($user['userID']);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            // جلب مواعيد اليوم
            $today = date('Y-m-d');
            $todayAppointments = $this->appointment->getByDoctor($doctor['doctorID'], $today);

            // جلب المواعيد القادمة
            $upcomingAppointments = $this->appointment->getUpcoming($doctor['doctorID'], null, 7);

            $this->sendResponse(200, [
                'success' => true,
                'data' => [
                    'doctor' => $doctor,
                    'todayAppointments' => $todayAppointments,
                    'upcomingAppointments' => $upcomingAppointments,
                    'stats' => [
                        'totalToday' => count($todayAppointments),
                        'totalUpcoming' => count($upcomingAppointments)
                    ]
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching profile: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على جميع الأطباء] (dir="rtl")
    public function getAllDoctors($request)
    {
        try {
            $specialization = $request->params['specialization'] ?? null;
            $page = isset($request->params['page']) ? (int)$request->params['page'] : 1;
            $limit = isset($request->params['limit']) ? (int)$request->params['limit'] : 20;

            $offset = ($page - 1) * $limit;
            $doctors = $this->doctor->getAll($specialization, $limit, $offset);

            // الحصول على إجمالي عدد الأطباء
            $countQuery = "SELECT COUNT(*) as total FROM Doctors";
            if ($specialization) {
                $countQuery .= " WHERE specialization = :specialization";
            }

            $stmt = $this->conn->prepare($countQuery);
            if ($specialization) {
                $stmt->bindParam(':specialization', $specialization);
            }
            $stmt->execute();
            $total = $stmt->fetch()['total'];

            $this->sendResponse(200, [
                'success' => true,
                'data' => $doctors,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => (int)$total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching doctors: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على طبيب بواسطة ID] (dir="rtl")
    public function getDoctorByID($request)
    {
        try {
            $doctorID = $request->pathParams->id;

            $doctor = $this->doctor->findByID($doctorID);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            $this->sendResponse(200, [
                'success' => true,
                'data' => $doctor
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching doctor: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على الأطباء حسب التخصص] (dir="rtl")
    public function getDoctorsBySpecialization($request)
    {
        try {
            $specialization = $request->pathParams->specialization;

            if (empty($specialization)) {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Specialization is required'
                ]);
                return;
            }

            $doctors = $this->doctor->getBySpecialization($specialization);

            $this->sendResponse(200, [
                'success' => true,
                'data' => $doctors,
                'total' => count($doctors),
                'specialization' => $specialization
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching doctors by specialization: ' . $e->getMessage()
            ]);
        }
    }

    // [البحث عن طبيب بالاسم] (dir="rtl")
    public function searchDoctors($request)
    {
        try {
            $query = $request->params['q'] ?? '';

            if (empty($query)) {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Search query is required'
                ]);
                return;
            }

            $doctors = $this->doctor->searchByName($query);

            $this->sendResponse(200, [
                'success' => true,
                'data' => $doctors,
                'total' => count($doctors)
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error searching doctors: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على مواعيد الطبيب] (dir="rtl")
    public function getAppointments($request)
    {
        try {
            $user = $request->user;
            $date = $request->params['date'] ?? null;
            $status = $request->params['status'] ?? null;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $doctor = $this->doctor->findByUserID($user['userID']);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            $appointments = $this->appointment->getByDoctor($doctor['doctorID'], $date, $status);

            $this->sendResponse(200, [
                'success' => true,
                'data' => $appointments,
                'total' => count($appointments),
                'doctorName' => $doctor['fullName']
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching appointments: ' . $e->getMessage()
            ]);
        }
    }

    // [تحديث حالة الطبيب] (dir="rtl")
    public function updateAvailability($request)
    {
        try {
            $user = $request->user;
            $isAvailable = $request->input->isAvailable ?? 1;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $doctor = $this->doctor->findByUserID($user['userID']);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            $updated = $this->doctor->updateAvailability($doctor['doctorID'], $isAvailable);

            if ($updated) {
                $status = $isAvailable ? 'available' : 'unavailable';
                $this->sendResponse(200, [
                    'success' => true,
                    'message' => 'Doctor is now ' . $status
                ]);
            } else {
                $this->sendResponse(500, [
                    'success' => false,
                    'message' => 'Failed to update availability'
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error updating availability: ' . $e->getMessage()
            ]);
        }
    }

    // [تحديث حالة موعد] (dir="rtl")
    public function updateAppointmentStatus($request)
    {
        try {
            $user = $request->user;
            $appointmentID = $request->pathParams->id;
            $status = $request->input->status ?? '';

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $doctor = $this->doctor->findByUserID($user['userID']);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            $validStatuses = ['confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'];

            if (!in_array($status, $validStatuses)) {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Invalid status'
                ]);
                return;
            }

            // التحقق من وجود الموعد
            $appointment = $this->appointment->findByID($appointmentID);
            if (!$appointment) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Appointment not found'
                ]);
                return;
            }

            // التحقق من أن الموعد يخص هذا الطبيب
            if ($appointment['doctorID'] != $doctor['doctorID']) {
                $this->sendResponse(403, [
                    'success' => false,
                    'message' => 'Access denied'
                ]);
                return;
            }

            $updated = $this->appointment->updateStatus($appointmentID, $status);

            if ($updated) {
                $this->sendResponse(200, [
                    'success' => true,
                    'message' => 'Appointment status updated to ' . $status
                ]);
            } else {
                $this->sendResponse(500, [
                    'success' => false,
                    'message' => 'Failed to update appointment status'
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error updating appointment: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على إحصائيات الطبيب] (dir="rtl")
    public function getStats($request)
    {
        try {
            $user = $request->user;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $doctor = $this->doctor->findByUserID($user['userID']);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            // جلب جميع المواعيد
            $allAppointments = $this->appointment->getByDoctor($doctor['doctorID']);

            $total = count($allAppointments);
            $completed = 0;
            $cancelled = 0;
            $pending = 0;
            $noShow = 0;

            foreach ($allAppointments as $app) {
                switch ($app['status']) {
                    case 'completed':
                        $completed++;
                        break;
                    case 'cancelled':
                        $cancelled++;
                        break;
                    case 'no-show':
                        $noShow++;
                        break;
                    default:
                        $pending++;
                }
            }

            // مواعيد اليوم
            $today = date('Y-m-d');
            $todayAppointments = $this->appointment->getByDoctor($doctor['doctorID'], $today);

            // مواعيد هذا الأسبوع
            $weekStart = date('Y-m-d', strtotime('monday this week'));
            $weekEnd = date('Y-m-d', strtotime('sunday this week'));

            $weekQuery = "SELECT COUNT(*) as total FROM Appointments 
                         WHERE doctorID = :doctorID 
                         AND DATE(appointmentDate) BETWEEN :start AND :end";
            $stmt = $this->conn->prepare($weekQuery);
            $stmt->bindParam(':doctorID', $doctor['doctorID']);
            $stmt->bindParam(':start', $weekStart);
            $stmt->bindParam(':end', $weekEnd);
            $stmt->execute();
            $weekTotal = $stmt->fetch()['total'];

            $this->sendResponse(200, [
                'success' => true,
                'data' => [
                    'total_appointments' => $total,
                    'completed_appointments' => $completed,
                    'cancelled_appointments' => $cancelled,
                    'pending_appointments' => $pending,
                    'no_show_appointments' => $noShow,
                    'today_appointments' => count($todayAppointments),
                    'week_appointments' => (int)$weekTotal,
                    'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
                    'cancellation_rate' => $total > 0 ? round(($cancelled / $total) * 100, 2) : 0
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching stats: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على جدول مواعيد الطبيب] (dir="rtl")
    public function getSchedule($request)
    {
        try {
            $user = $request->user;
            $startDate = $request->params['start'] ?? date('Y-m-d');
            $endDate = $request->params['end'] ?? date('Y-m-d', strtotime('+7 days'));

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $doctor = $this->doctor->findByUserID($user['userID']);

            if (!$doctor) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Doctor not found'
                ]);
                return;
            }

            $query = "SELECT a.*, p.fullName as patientName, p.phone as patientPhone
                     FROM Appointments a
                     JOIN Patients p ON a.patientID = p.patientID
                     WHERE a.doctorID = :doctorID
                     AND DATE(a.appointmentDate) BETWEEN :startDate AND :endDate
                     ORDER BY a.appointmentDate";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':doctorID', $doctor['doctorID']);
            $stmt->bindParam(':startDate', $startDate);
            $stmt->bindParam(':endDate', $endDate);
            $stmt->execute();

            $appointments = $stmt->fetchAll();

            // تنظيم المواعيد حسب التاريخ
            $schedule = [];
            foreach ($appointments as $app) {
                $date = date('Y-m-d', strtotime($app['appointmentDate']));
                if (!isset($schedule[$date])) {
                    $schedule[$date] = [];
                }
                $schedule[$date][] = $app;
            }

            $this->sendResponse(200, [
                'success' => true,
                'data' => $schedule,
                'total' => count($appointments),
                'dateRange' => [
                    'start' => $startDate,
                    'end' => $endDate
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching schedule: ' . $e->getMessage()
            ]);
        }
    }

    // [إرسال الرد] (dir="rtl")
    private function sendResponse($statusCode, $data)
    {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }
}
