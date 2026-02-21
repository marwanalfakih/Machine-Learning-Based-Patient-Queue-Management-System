<?php
require_once __DIR__ . '/../models/Patient.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Appointment.php';

class PatientController
{
    private $conn;
    private $patient;
    private $user;
    private $appointment;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->patient = new Patient($db);
        $this->user = new User($db);
        $this->appointment = new Appointment($db);
    }

    // [الحصول على ملف المريض الشخصي] (dir="rtl")
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

            $patient = $this->patient->findByUserID($user['userID']);

            if (!$patient) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Patient not found'
                ]);
                return;
            }

            // جلب المواعيد القادمة
            $upcomingAppointments = $this->appointment->getUpcoming(null, $patient['patientID'], 30);

            $this->sendResponse(200, [
                'success' => true,
                'data' => [
                    'patient' => $patient,
                    'upcomingAppointments' => $upcomingAppointments,
                    'totalAppointments' => count($upcomingAppointments)
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching profile: ' . $e->getMessage()
            ]);
        }
    }

    // [تحديث بيانات المريض] (dir="rtl")
    public function updateProfile($request)
    {
        try {
            $user = $request->user;
            $data = $request->input;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $patient = $this->patient->findByUserID($user['userID']);

            if (!$patient) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Patient not found'
                ]);
                return;
            }

            // التحقق من صحة البيانات
            if (empty($data->fullName)) {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Full name is required'
                ]);
                return;
            }

            $updateData = [
                'fullName' => $data->fullName,
                'dateOfBirth' => $data->dateOfBirth ?? $patient['dateOfBirth'],
                'gender' => $data->gender ?? $patient['gender'],
                'address' => $data->address ?? $patient['address'],
                'emergencyContact' => $data->emergencyContact ?? $patient['emergencyContact'],
                'bloodType' => $data->bloodType ?? $patient['bloodType'],
                'medicalHistory' => $data->medicalHistory ?? $patient['medicalHistory'],
                'allergies' => $data->allergies ?? $patient['allergies']
            ];

            $updated = $this->patient->update($patient['patientID'], $updateData);

            if ($updated) {
                $this->sendResponse(200, [
                    'success' => true,
                    'message' => 'Profile updated successfully'
                ]);
            } else {
                $this->sendResponse(500, [
                    'success' => false,
                    'message' => 'Failed to update profile'
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error updating profile: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على جميع مواعيد المريض] (dir="rtl")
    public function getAppointments($request)
    {
        try {
            $user = $request->user;
            $status = $request->params['status'] ?? null;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $patient = $this->patient->findByUserID($user['userID']);

            if (!$patient) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Patient not found'
                ]);
                return;
            }

            $appointments = $this->appointment->getByPatient($patient['patientID'], $status);

            // تصنيف المواعيد
            $upcoming = [];
            $past = [];
            $today = date('Y-m-d');

            foreach ($appointments as $app) {
                $appDate = date('Y-m-d', strtotime($app['appointmentDate']));
                if ($appDate >= $today && !in_array($app['status'], ['completed', 'cancelled'])) {
                    $upcoming[] = $app;
                } else {
                    $past[] = $app;
                }
            }

            $this->sendResponse(200, [
                'success' => true,
                'data' => [
                    'all' => $appointments,
                    'upcoming' => $upcoming,
                    'past' => $past,
                    'total' => count($appointments)
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching appointments: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على موعد محدد] (dir="rtl")
    public function getAppointment($request)
    {
        try {
            $user = $request->user;
            $appointmentID = $request->pathParams->id;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $appointment = $this->appointment->findByID($appointmentID);

            if (!$appointment) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Appointment not found'
                ]);
                return;
            }

            // التحقق من أن الموعد يخص هذا المريض
            $patient = $this->patient->findByUserID($user['userID']);
            if ($appointment['patientID'] != $patient['patientID']) {
                $this->sendResponse(403, [
                    'success' => false,
                    'message' => 'Access denied'
                ]);
                return;
            }

            $this->sendResponse(200, [
                'success' => true,
                'data' => $appointment
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching appointment: ' . $e->getMessage()
            ]);
        }
    }

    // [إنشاء موعد جديد] (dir="rtl")
    public function createAppointment($request)
    {
        try {
            $user = $request->user;
            $data = $request->input;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $patient = $this->patient->findByUserID($user['userID']);

            if (!$patient) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Patient not found'
                ]);
                return;
            }

            // التحقق من صحة البيانات
            $required = ['doctorID', 'appointmentDate', 'type', 'reason'];
            foreach ($required as $field) {
                if (empty($data->$field)) {
                    $this->sendResponse(400, [
                        'success' => false,
                        'message' => ucfirst($field) . ' is required'
                    ]);
                    return;
                }
            }

            // التحقق من عدم وجود موعد مكرر
            $existingAppointments = $this->appointment->getByPatient($patient['patientID'], 'scheduled');
            foreach ($existingAppointments as $app) {
                if ($app['appointmentDate'] == $data->appointmentDate && $app['doctorID'] == $data->doctorID) {
                    $this->sendResponse(400, [
                        'success' => false,
                        'message' => 'You already have an appointment at this time'
                    ]);
                    return;
                }
            }

            $appointmentData = [
                'patientID' => $patient['patientID'],
                'doctorID' => $data->doctorID,
                'appointmentDate' => $data->appointmentDate,
                'type' => $data->type,
                'reason' => $data->reason,
                'notes' => $data->notes ?? '',
                'status' => 'scheduled'
            ];

            $appointmentID = $this->appointment->create($appointmentData);

            if ($appointmentID) {
                $this->sendResponse(201, [
                    'success' => true,
                    'message' => 'Appointment created successfully',
                    'appointmentID' => $appointmentID
                ]);
            } else {
                $this->sendResponse(500, [
                    'success' => false,
                    'message' => 'Failed to create appointment'
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error creating appointment: ' . $e->getMessage()
            ]);
        }
    }

    // [إلغاء موعد] (dir="rtl")
    public function cancelAppointment($request)
    {
        try {
            $user = $request->user;
            $appointmentID = $request->pathParams->id;
            $reason = $request->input->reason ?? null;

            if (!$user) {
                $this->sendResponse(401, [
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
                return;
            }

            $patient = $this->patient->findByUserID($user['userID']);

            if (!$patient) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Patient not found'
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

            // التحقق من أن الموعد يخص هذا المريض
            if ($appointment['patientID'] != $patient['patientID']) {
                $this->sendResponse(403, [
                    'success' => false,
                    'message' => 'Access denied'
                ]);
                return;
            }

            // التحقق من إمكانية الإلغاء
            if ($appointment['status'] === 'completed') {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Cannot cancel a completed appointment'
                ]);
                return;
            }

            if ($appointment['status'] === 'cancelled') {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Appointment is already cancelled'
                ]);
                return;
            }

            $cancelled = $this->appointment->cancel($appointmentID, $reason);

            if ($cancelled) {
                $this->sendResponse(200, [
                    'success' => true,
                    'message' => 'Appointment cancelled successfully'
                ]);
            } else {
                $this->sendResponse(500, [
                    'success' => false,
                    'message' => 'Failed to cancel appointment'
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error cancelling appointment: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على إحصائيات المريض] (dir="rtl")
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

            $patient = $this->patient->findByUserID($user['userID']);

            if (!$patient) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Patient not found'
                ]);
                return;
            }

            // جلب جميع المواعيد
            $appointments = $this->appointment->getByPatient($patient['patientID']);

            $total = count($appointments);
            $completed = 0;
            $cancelled = 0;
            $upcoming = 0;

            foreach ($appointments as $app) {
                if ($app['status'] === 'completed') {
                    $completed++;
                } elseif ($app['status'] === 'cancelled') {
                    $cancelled++;
                } elseif (in_array($app['status'], ['scheduled', 'confirmed'])) {
                    $upcoming++;
                }
            }

            $this->sendResponse(200, [
                'success' => true,
                'data' => [
                    'total_appointments' => $total,
                    'completed_appointments' => $completed,
                    'cancelled_appointments' => $cancelled,
                    'upcoming_appointments' => $upcoming,
                    'attendance_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching stats: ' . $e->getMessage()
            ]);
        }
    }

    // [البحث عن مرضى] (dir="rtl")
    public function searchPatients($request)
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

            $patients = $this->patient->searchByName($query);

            $this->sendResponse(200, [
                'success' => true,
                'data' => $patients,
                'total' => count($patients)
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error searching patients: ' . $e->getMessage()
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
