<?php
class Appointment
{
    private $conn;
    private $table = "Appointments";

    public $appointmentID;
    public $patientID;
    public $doctorID;
    public $appointmentDate;
    public $status;
    public $type;
    public $reason;
    public $notes;
    public $created_at;
    public $updated_at;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // إنشاء موعد جديد
    public function create($data)
    {
        $appointmentID = 'APT_' . uniqid() . '_' . time();

        $query = "INSERT INTO " . $this->table . " 
                  (appointmentID, patientID, doctorID, appointmentDate, status, type, reason, notes) 
                  VALUES (:appointmentID, :patientID, :doctorID, :appointmentDate, :status, :type, :reason, :notes)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":appointmentID", $appointmentID);
        $stmt->bindParam(":patientID", $data['patientID']);
        $stmt->bindParam(":doctorID", $data['doctorID']);
        $stmt->bindParam(":appointmentDate", $data['appointmentDate']);
        $stmt->bindParam(":status", $data['status']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":reason", $data['reason']);
        $stmt->bindParam(":notes", $data['notes']);

        if ($stmt->execute()) {
            return $appointmentID;
        }
        return false;
    }

    // جلب موعد بواسطة ID
    public function findByID($appointmentID)
    {
        $query = "SELECT a.*, 
                         p.fullName as patientName, 
                         d.fullName as doctorName,
                         d.specialization,
                         d.consultationFee
                  FROM " . $this->table . " a
                  JOIN Patients p ON a.patientID = p.patientID
                  JOIN Doctors d ON a.doctorID = d.doctorID
                  WHERE a.appointmentID = :appointmentID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":appointmentID", $appointmentID);
        $stmt->execute();

        return $stmt->fetch();
    }

    // جلب مواعيد المريض
    public function getByPatient($patientID, $status = null, $limit = 50)
    {
        $query = "SELECT a.*, 
                         d.fullName as doctorName,
                         d.specialization,
                         d.consultationFee,
                         q.queuePosition,
                         q.estimatedWaitTime
                  FROM " . $this->table . " a
                  JOIN Doctors d ON a.doctorID = d.doctorID
                  LEFT JOIN Queue q ON a.appointmentID = q.appointmentID
                  WHERE a.patientID = :patientID";

        if ($status) {
            $query .= " AND a.status = :status";
        }

        $query .= " ORDER BY a.appointmentDate DESC LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":patientID", $patientID);

        if ($status) {
            $stmt->bindParam(":status", $status);
        }

        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    // جلب مواعيد الطبيب
    public function getByDoctor($doctorID, $date = null, $status = null)
    {
        $query = "SELECT a.*, 
                         p.fullName as patientName,
                         p.dateOfBirth,
                         p.bloodType,
                         q.queuePosition,
                         q.status as queueStatus
                  FROM " . $this->table . " a
                  JOIN Patients p ON a.patientID = p.patientID
                  LEFT JOIN Queue q ON a.appointmentID = q.appointmentID
                  WHERE a.doctorID = :doctorID";

        if ($date) {
            $query .= " AND DATE(a.appointmentDate) = :date";
        }

        if ($status) {
            $query .= " AND a.status = :status";
        }

        $query .= " ORDER BY a.appointmentDate";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":doctorID", $doctorID);

        if ($date) {
            $stmt->bindParam(":date", $date);
        }

        if ($status) {
            $stmt->bindParam(":status", $status);
        }

        $stmt->execute();

        return $stmt->fetchAll();
    }

    // تحديث حالة الموعد
    public function updateStatus($appointmentID, $status)
    {
        $query = "UPDATE " . $this->table . " 
                  SET status = :status, updated_at = CURRENT_TIMESTAMP 
                  WHERE appointmentID = :appointmentID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":appointmentID", $appointmentID);
        $stmt->bindParam(":status", $status);

        return $stmt->execute();
    }

    // إلغاء الموعد
    public function cancel($appointmentID, $reason = null)
    {
        $query = "UPDATE " . $this->table . " 
                  SET status = 'cancelled', 
                      notes = CONCAT(IFNULL(notes, ''), ' Cancellation reason: ', :reason),
                      updated_at = CURRENT_TIMESTAMP 
                  WHERE appointmentID = :appointmentID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":appointmentID", $appointmentID);
        $stmt->bindParam(":reason", $reason);

        return $stmt->execute();
    }

    // جلب المواعيد القادمة
    public function getUpcoming($doctorID = null, $patientID = null, $days = 7)
    {
        $query = "SELECT a.*, 
                         p.fullName as patientName, 
                         d.fullName as doctorName,
                         d.specialization,
                         q.queuePosition
                  FROM " . $this->table . " a
                  JOIN Patients p ON a.patientID = p.patientID
                  JOIN Doctors d ON a.doctorID = d.doctorID
                  LEFT JOIN Queue q ON a.appointmentID = q.appointmentID
                  WHERE a.appointmentDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL :days DAY)
                    AND a.status IN ('scheduled', 'confirmed', 'checked-in')";

        if ($doctorID) {
            $query .= " AND a.doctorID = :doctorID";
        }

        if ($patientID) {
            $query .= " AND a.patientID = :patientID";
        }

        $query .= " ORDER BY a.appointmentDate";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":days", $days, PDO::PARAM_INT);

        if ($doctorID) {
            $stmt->bindParam(":doctorID", $doctorID);
        }

        if ($patientID) {
            $stmt->bindParam(":patientID", $patientID);
        }

        $stmt->execute();

        return $stmt->fetchAll();
    }
}
