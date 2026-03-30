<?php
// controllers/AdminController.php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Doctor.php';
require_once __DIR__ . '/../models/Patient.php';
require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../models/Queue.php';
require_once __DIR__ . '/../models/AIPrediction.php';

class AdminController
{
    private $db;
    private $userModel;
    private $doctorModel;
    private $patientModel;
    private $appointmentModel;
    private $queueModel;
    private $aiModel;

    public function __construct($db)
    {
        $this->db = $db;
        $this->userModel = new User($db);
        $this->doctorModel = new Doctor($db);
        $this->patientModel = new Patient($db);
        $this->appointmentModel = new Appointment($db);
        $this->queueModel = new Queue($db);
        $this->aiModel = new AIPrediction($db);
    }

    // لوحة التحكم الرئيسية
    public function getDashboard($request)
    {
        try {
            $stats = [
                'users' => $this->userModel->getUserStats(),
                'doctors' => $this->doctorModel->getDoctorStats(),
                'doctorSpecialties' => $this->doctorModel->getSpecializationDistribution(),
                'patients' => $this->patientModel->getPatientStats(),
                'recentPatients' => $this->patientModel->getRecentPatients(5),
                'appointments' => $this->appointmentModel->getAppointmentStats(),
                'queue' => $this->queueModel->getQueueStats(),
                'ai' => $this->aiModel->getStats(),
                'upcomingAppointments' => $this->appointmentModel->getUpcoming(null, null, 7)
            ];

            // النشاطات الأخيرة
            $query = "SELECT l.*, u.username 
                      FROM systemlogs l
                      LEFT JOIN users u ON l.userID = u.userID
                      ORDER BY l.logTime DESC
                      LIMIT 20";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $stats['recentActivities'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "stats" => $stats]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // جلب جميع الأطباء
    public function getDoctors($request)
    {
        try {
            $limit = isset($request->params->limit) ? (int)$request->params->limit : 100;
            $offset = isset($request->params->offset) ? (int)$request->params->offset : 0;

            $doctors = $this->doctorModel->getAll(null, $limit, $offset);

            echo json_encode([
                "success" => true,
                "doctors" => $doctors,
                "total" => count($doctors)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // جلب طبيب محدد
    public function getDoctor($request)
    {
        try {
            $doctorID = $request->pathParams->id ?? null;

            if (!$doctorID) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
                return;
            }

            $doctor = $this->doctorModel->findByID($doctorID);

            if (!$doctor) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Doctor not found"]);
                return;
            }

            echo json_encode(["success" => true, "doctor" => $doctor]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // إنشاء طبيب جديد
    public function createDoctor($request)
    {
        try {
            $input = (array)$request->input;

            $required = ['username', 'password', 'email', 'fullName', 'specialization', 'licenseNumber'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "$field is required"]);
                    return;
                }
            }

            // التحقق من عدم تكرار اسم المستخدم
            $existingUser = $this->userModel->findByUsername($input['username']);
            if ($existingUser) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Username already exists"]);
                return;
            }

            // التحقق من عدم تكرار البريد الإلكتروني
            $existingEmail = $this->userModel->findByEmail($input['email']);
            if ($existingEmail) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Email already exists"]);
                return;
            }

            $this->db->beginTransaction();

            // إنشاء حساب مستخدم
            $userID = 'USR_DOC_' . uniqid() . '_' . time();
            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);

            $userQuery = "INSERT INTO users (userID, username, password, email, phone, userType, created_at, is_active) 
                          VALUES (:userID, :username, :password, :email, :phone, 'doctor', NOW(), 1)";
            $userStmt = $this->db->prepare($userQuery);
            $userStmt->bindParam(':userID', $userID);
            $userStmt->bindParam(':username', $input['username']);
            $userStmt->bindParam(':password', $hashedPassword);
            $userStmt->bindParam(':email', $input['email']);
            $phone = $input['phone'] ?? null;
            $userStmt->bindParam(':phone', $phone);
            $userStmt->execute();

            // إنشاء ملف طبيب
            $doctorID = 'DOC_' . uniqid();

            $doctorQuery = "INSERT INTO doctors 
                            (doctorID, userID, fullName, specialization, licenseNumber, qualifications, 
                             department, yearsOfExperience, consultationFee, isAvailable)
                            VALUES 
                            (:doctorID, :userID, :fullName, :specialization, :licenseNumber, :qualifications,
                             :department, :yearsOfExperience, :consultationFee, 1)";
            $doctorStmt = $this->db->prepare($doctorQuery);
            $doctorStmt->bindParam(':doctorID', $doctorID);
            $doctorStmt->bindParam(':userID', $userID);
            $doctorStmt->bindParam(':fullName', $input['fullName']);
            $doctorStmt->bindParam(':specialization', $input['specialization']);
            $doctorStmt->bindParam(':licenseNumber', $input['licenseNumber']);
            $qualifications = $input['qualifications'] ?? null;
            $doctorStmt->bindParam(':qualifications', $qualifications);
            $department = $input['department'] ?? null;
            $doctorStmt->bindParam(':department', $department);
            $yearsOfExperience = $input['yearsOfExperience'] ?? 0;
            $doctorStmt->bindParam(':yearsOfExperience', $yearsOfExperience);
            $consultationFee = $input['consultationFee'] ?? 0;
            $doctorStmt->bindParam(':consultationFee', $consultationFee);
            $doctorStmt->execute();

            $this->db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Doctor created successfully",
                "doctorID" => $doctorID
            ]);
        } catch (Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // تحديث طبيب
    public function updateDoctor($request)
    {
        try {
            $doctorID = $request->pathParams->id ?? null;
            $input = (array)$request->input;

            if (!$doctorID) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
                return;
            }

            $doctor = $this->doctorModel->findByID($doctorID);
            if (!$doctor) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Doctor not found"]);
                return;
            }

            $doctorData = [];
            $fields = [
                'fullName',
                'specialization',
                'licenseNumber',
                'qualifications',
                'department',
                'yearsOfExperience',
                'consultationFee'
            ];

            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $doctorData[$field] = $input[$field];
                }
            }

            if (empty($doctorData)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "No fields to update"]);
                return;
            }

            $updated = $this->doctorModel->update($doctorID, $doctorData);

            if ($updated) {
                echo json_encode(["success" => true, "message" => "Doctor updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update doctor"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // حذف طبيب
    public function deleteDoctor($request)
    {
        try {
            $doctorID = $request->pathParams->id ?? null;

            if (!$doctorID) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
                return;
            }

            $doctor = $this->doctorModel->findByID($doctorID);
            if (!$doctor) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Doctor not found"]);
                return;
            }

            $deleted = $this->doctorModel->delete($doctorID);

            if ($deleted) {
                echo json_encode(["success" => true, "message" => "Doctor deleted successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to delete doctor"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // تفعيل/تعطيل طبيب
    public function toggleDoctorStatus($request)
    {
        try {
            $doctorID = $request->pathParams->id ?? null;
            $input = (array)$request->input;

            if (!$doctorID) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Doctor ID is required"]);
                return;
            }

            $isAvailable = isset($input['isAvailable']) ? (int)$input['isAvailable'] : 1;

            $query = "UPDATE doctors SET isAvailable = :isAvailable WHERE doctorID = :doctorID";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':isAvailable', $isAvailable);
            $stmt->bindParam(':doctorID', $doctorID);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Doctor status updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to update doctor status"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // جلب جميع المرضى
    public function getPatients($request)
    {
        try {
            $limit = isset($request->params->limit) ? (int)$request->params->limit : 100;
            $offset = isset($request->params->offset) ? (int)$request->params->offset : 0;

            $patients = $this->patientModel->getAll($limit, $offset);

            echo json_encode([
                "success" => true,
                "patients" => $patients,
                "total" => count($patients)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
    }

    // باقي الدوال... (getPatient, updatePatient, deletePatient, getAppointments, etc)
}
