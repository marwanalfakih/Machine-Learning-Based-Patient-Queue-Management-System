<?php
class Patient
{
    private $conn;
    private $table = "Patients";

    public $patientID;
    public $userID;
    public $fullName;
    public $dateOfBirth;
    public $gender;
    public $address;
    public $emergencyContact;
    public $bloodType;
    public $medicalHistory;
    public $allergies;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // إنشاء مريض جديد
    public function create($data)
    {
        //$patientID = 'PAT_' . uniqid() . '_' . time();
        $patientID = 'PAT_' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        $query = "INSERT INTO " . $this->table . " 
                  (patientID, userID, fullName, dateOfBirth, gender, address, 
                   emergencyContact, bloodType, medicalHistory, allergies) 
                  VALUES (:patientID, :userID, :fullName, :dateOfBirth, :gender, :address, 
                          :emergencyContact, :bloodType, :medicalHistory, :allergies)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":patientID", $patientID);
        $stmt->bindParam(":userID", $data['userID']);
        $stmt->bindParam(":fullName", $data['fullName']);
        $stmt->bindParam(":dateOfBirth", $data['dateOfBirth']);
        $stmt->bindParam(":gender", $data['gender']);
        $stmt->bindParam(":address", $data['address']);
        $stmt->bindParam(":emergencyContact", $data['emergencyContact']);
        $stmt->bindParam(":bloodType", $data['bloodType']);
        $stmt->bindParam(":medicalHistory", $data['medicalHistory']);
        $stmt->bindParam(":allergies", $data['allergies']);

        if ($stmt->execute()) {
            return $patientID;
        }
        return false;
    }

    // البحث بواسطة userID
    public function findByUserID($userID)
    {
        $query = "SELECT p.*, u.email, u.phone, u.created_at as registration_date 
                  FROM " . $this->table . " p 
                  JOIN Users u ON p.userID = u.userID 
                  WHERE p.userID = :userID LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userID", $userID);
        $stmt->execute();

        return $stmt->fetch();
    }

    // البحث بواسطة patientID
    public function findByID($patientID)
    {
        $query = "SELECT p.*, u.email, u.phone, u.username, u.created_at, u.is_active 
                  FROM " . $this->table . " p 
                  JOIN Users u ON p.userID = u.userID 
                  WHERE p.patientID = :patientID LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":patientID", $patientID);
        $stmt->execute();

        return $stmt->fetch();
    }

    // البحث بواسطة patientID
    public function findByIDForAdmin($patientID)
    {
        $query = "SELECT p.*, u.email, u.phone, u.username, u.created_at, u.is_active, r.recordID 
                  FROM " . $this->table . " p 
                  JOIN Users u ON p.userID = u.userID 
                  JOIN medicalrecords r ON p.patientID = r.patientID
                  WHERE p.patientID = :patientID LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":patientID", $patientID);
        $stmt->execute();

        return $stmt->fetch();
    }


    // تحديث بيانات المريض
    public function update($patientID, $data)
    {
        $query = "UPDATE " . $this->table . " 
                  SET fullName = :fullName, 
                      dateOfBirth = :dateOfBirth, 
                      gender = :gender, 
                      address = :address, 
                      emergencyContact = :emergencyContact, 
                      bloodType = :bloodType, 
                      medicalHistory = :medicalHistory, 
                      allergies = :allergies 
                  WHERE patientID = :patientID";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":patientID", $patientID);
        $stmt->bindParam(":fullName", $data['fullName']);
        $stmt->bindParam(":dateOfBirth", $data['dateOfBirth']);
        $stmt->bindParam(":gender", $data['gender']);
        $stmt->bindParam(":address", $data['address']);
        $stmt->bindParam(":emergencyContact", $data['emergencyContact']);
        $stmt->bindParam(":bloodType", $data['bloodType']);
        $stmt->bindParam(":medicalHistory", $data['medicalHistory']);
        $stmt->bindParam(":allergies", $data['allergies']);

        return $stmt->execute();
    }

    // جلب جميع المرضى
    public function getAll($limit = 100, $offset = 0)
    {
        $query = "SELECT p.*, u.email, u.phone, u.is_active 
                  FROM " . $this->table . " p 
                  JOIN Users u ON p.userID = u.userID 
                  ORDER BY p.fullName 
                  LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    // البحث بالاسم
    public function searchByName($name)
    {
        $query = "SELECT p.*, u.email, u.phone 
                  FROM " . $this->table . " p 
                  JOIN Users u ON p.userID = u.userID 
                  WHERE p.fullName LIKE :name 
                  ORDER BY p.fullName 
                  LIMIT 50";

        $stmt = $this->conn->prepare($query);
        $searchTerm = "%" . $name . "%";
        $stmt->bindParam(":name", $searchTerm);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * حذف مريض
     * @param string $patientID معرف المريض
     * @return bool نجاح أو فشل
     */
    public function delete($patientID)
    {
        $query = "DELETE FROM " . $this->table . " WHERE patientID = :patientID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':patientID', $patientID);
        return $stmt->execute();
    }

    /**
     * الحصول على إحصائيات المرضى للأدمن
     * @return array إحصائيات المرضى
     */
    public function getPatientStats()
    {
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) < 18 THEN 1 ELSE 0 END) as children,
                    SUM(CASE WHEN TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) BETWEEN 18 AND 60 THEN 1 ELSE 0 END) as adults,
                    SUM(CASE WHEN TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) > 60 THEN 1 ELSE 0 END) as seniors,
                    COUNT(DISTINCT bloodType) as bloodTypes
                  FROM " . $this->table;

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * جلب أحدث المرضى المسجلين
     * @param int $limit عدد النتائج
     * @return array قائمة أحدث المرضى
     */
    public function getRecentPatients($limit = 10)
    {
        $query = "SELECT p.*, u.email, u.phone, u.created_at
                  FROM " . $this->table . " p 
                  JOIN users u ON p.userID = u.userID
                  ORDER BY u.created_at DESC
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
