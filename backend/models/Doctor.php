<?php
class Doctor
{
    private $conn;
    private $table = "Doctors";

    public $doctorID;
    public $userID;
    public $fullName;
    public $specialization;
    public $licenseNumber;
    public $qualifications;
    public $department;
    public $yearsOfExperience;
    public $consultationFee;
    public $isAvailable;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // إنشاء طبيب جديد
    public function create($data)
    {
        $doctorID = 'DOC_' . uniqid() . '_' . time();

        $query = "INSERT INTO " . $this->table . " 
                  (doctorID, userID, fullName, specialization, licenseNumber, 
                   qualifications, department, yearsOfExperience, consultationFee, isAvailable) 
                  VALUES (:doctorID, :userID, :fullName, :specialization, :licenseNumber, 
                          :qualifications, :department, :yearsOfExperience, :consultationFee, :isAvailable)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":doctorID", $doctorID);
        $stmt->bindParam(":userID", $data['userID']);
        $stmt->bindParam(":fullName", $data['fullName']);
        $stmt->bindParam(":specialization", $data['specialization']);
        $stmt->bindParam(":licenseNumber", $data['licenseNumber']);
        $stmt->bindParam(":qualifications", $data['qualifications']);
        $stmt->bindParam(":department", $data['department']);
        $stmt->bindParam(":yearsOfExperience", $data['yearsOfExperience']);
        $stmt->bindParam(":consultationFee", $data['consultationFee']);
        $stmt->bindParam(":isAvailable", $data['isAvailable']);

        if ($stmt->execute()) {
            return $doctorID;
        }
        return false;
    }

    // البحث بواسطة userID
    public function findByUserID($userID)
    {
        $query = "SELECT d.*, u.email, u.phone 
                  FROM " . $this->table . " d 
                  JOIN Users u ON d.userID = u.userID 
                  WHERE d.userID = :userID LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userID", $userID);
        $stmt->execute();

        return $stmt->fetch();
    }

    // البحث بواسطة doctorID
    public function findByID($doctorID)
    {
        $query = "SELECT d.*, u.email, u.phone 
                  FROM " . $this->table . " d 
                  JOIN Users u ON d.userID = u.userID 
                  WHERE d.doctorID = :doctorID LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":doctorID", $doctorID);
        $stmt->execute();

        return $stmt->fetch();
    }

    // جلب جميع الأطباء
    public function getAll($specialization = null, $limit = 100, $offset = 0)
    {
        $query = "SELECT d.*, u.email, u.phone 
                  FROM " . $this->table . " d 
                  JOIN Users u ON d.userID = u.userID";

        if ($specialization) {
            $query .= " WHERE d.specialization = :specialization";
        }

        $query .= " ORDER BY d.fullName LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);

        if ($specialization) {
            $stmt->bindParam(":specialization", $specialization);
        }

        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    // البحث بالأطباء حسب التخصص
    public function getBySpecialization($specialization)
    {
        $query = "SELECT d.*, u.email, u.phone 
                  FROM " . $this->table . " d 
                  JOIN Users u ON d.userID = u.userID 
                  WHERE d.specialization = :specialization AND d.isAvailable = 1 
                  ORDER BY d.fullName";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":specialization", $specialization);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    // تحديث حالة الطبيب
    public function updateAvailability($doctorID, $isAvailable)
    {
        $query = "UPDATE " . $this->table . " 
                  SET isAvailable = :isAvailable 
                  WHERE doctorID = :doctorID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":doctorID", $doctorID);
        $stmt->bindParam(":isAvailable", $isAvailable);

        return $stmt->execute();
    }

    // البحث بالاسم
    public function searchByName($name)
    {
        $query = "SELECT d.*, u.email, u.phone 
                  FROM " . $this->table . " d 
                  JOIN Users u ON d.userID = u.userID 
                  WHERE d.fullName LIKE :name AND d.isAvailable = 1 
                  ORDER BY d.fullName 
                  LIMIT 20";

        $stmt = $this->conn->prepare($query);
        $searchTerm = "%" . $name . "%";
        $stmt->bindParam(":name", $searchTerm);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
