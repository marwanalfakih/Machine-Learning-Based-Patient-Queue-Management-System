<?php
require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../models/Patient.php';
require_once __DIR__ . '/../models/Doctor.php';

class AppointmentController
{
    private $conn;
    private $appointment;
    private $patient;
    private $doctor;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->appointment = new Appointment($db);
        $this->patient = new Patient($db);
        $this->doctor = new Doctor($db);
    }

    // [الحصول على موعد بواسطة ID] (dir="rtl")
    public function getByID($request)
    {
        try {
            $appointmentID = $request->pathParams->id;

            $appointment = $this->appointment->findByID($appointmentID);

            if (!$appointment) {
                $this->sendResponse(404, [
                    'success' => false,
                    'message' => 'Appointment not found'
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

    // [الحصول على المواعيد القادمة] (dir="rtl")
    public function getUpcoming($request)
    {
        try {
            $doctorID = $request->params['doctorID'] ?? null;
            $patientID = $request->params['patientID'] ?? null;
            $days = $request->params['days'] ?? 7;

            $appointments = $this->appointment->getUpcoming($doctorID, $patientID, $days);

            $this->sendResponse(200, [
                'success' => true,
                'data' => $appointments,
                'total' => count($appointments),
                'days' => (int)$days
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error fetching upcoming appointments: ' . $e->getMessage()
            ]);
        }
    }

    // [التحقق من توفر الموعد] (dir="rtl")
    public function checkAvailability($request)
    {
        try {
            $doctorID = $request->params['doctorID'] ?? null;
            $date = $request->params['date'] ?? null;
            $time = $request->params['time'] ?? null;

            if (!$doctorID || !$date) {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Doctor ID and date are required'
                ]);
                return;
            }

            // جلب مواعيد الطبيب في هذا التاريخ
            $appointments = $this->appointment->getByDoctor($doctorID, $date);

            if ($time) {
                // التحقق من توفر الوقت المحدد
                $isAvailable = true;
                foreach ($appointments as $app) {
                    if ($app['status'] !== 'cancelled' && $app['appointmentDate'] == $date . ' ' . $time) {
                        $isAvailable = false;
                        break;
                    }
                }

                $this->sendResponse(200, [
                    'success' => true,
                    'data' => [
                        'isAvailable' => $isAvailable,
                        'doctorID' => $doctorID,
                        'date' => $date,
                        'time' => $time
                    ]
                ]);
            } else {
                // إرجاع المواعيد المحجوزة
                $bookedSlots = [];
                foreach ($appointments as $app) {
                    if ($app['status'] !== 'cancelled') {
                        $bookedSlots[] = date('H:i', strtotime($app['appointmentDate']));
                    }
                }

                $this->sendResponse(200, [
                    'success' => true,
                    'data' => [
                        'doctorID' => $doctorID,
                        'date' => $date,
                        'bookedSlots' => $bookedSlots,
                        'totalAppointments' => count($appointments)
                    ]
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error checking availability: ' . $e->getMessage()
            ]);
        }
    }

    // [تأكيد حضور المريض] (dir="rtl")
    public function checkIn($request)
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
            $patient = $this->patient->findByUserID($user['userID']);
            if ($appointment['patientID'] != $patient['patientID']) {
                $this->sendResponse(403, [
                    'success' => false,
                    'message' => 'Access denied'
                ]);
                return;
            }

            // التحقق من إمكانية تأكيد الحضور
            if ($appointment['status'] === 'completed') {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Appointment is already completed'
                ]);
                return;
            }

            if ($appointment['status'] === 'cancelled') {
                $this->sendResponse(400, [
                    'success' => false,
                    'message' => 'Cannot check in to a cancelled appointment'
                ]);
                return;
            }

            $updated = $this->appointment->updateStatus($appointmentID, 'checked-in');

            if ($updated) {
                $this->sendResponse(200, [
                    'success' => true,
                    'message' => 'Patient checked in successfully',
                    'data' => [
                        'appointmentID' => $appointmentID,
                        'patientName' => $appointment['patientName'],
                        'doctorName' => $appointment['doctorName']
                    ]
                ]);
            } else {
                $this->sendResponse(500, [
                    'success' => false,
                    'message' => 'Failed to check in patient'
                ]);
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Error checking in: ' . $e->getMessage()
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
