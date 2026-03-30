<?php
class User
{
    private $conn;
    private $table = "Users";

    public $userID;
    public $username;
    public $password;
    public $email;
    public $phone;
    public $userType;
    public $created_at;
    public $updated_at;
    public $is_active;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // إنشاء مستخدم جديد
    public function create($data)
    {
        //$userID = 'USR_' . uniqid() . '_' . time();
        $userID = 'USR_' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        $query = "INSERT INTO " . $this->table . " 
                  (userID, username, password, email, phone, userType, is_active) 
                  VALUES (:userID, :username, :password, :email, :phone, :userType, :is_active)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":userID", $userID);
        $stmt->bindParam(":username", $data['username']);
        $stmt->bindParam(":password", $data['password']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":userType", $data['userType']);
        $stmt->bindParam(":is_active", $data['is_active']);

        if ($stmt->execute()) {
            return $userID;
        }
        return false;
    }

    // البحث بالبريد الإلكتروني
    public function findByEmail($email)
    {
        $query = "SELECT * FROM " . $this->table . " WHERE email = :email LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        return $stmt->fetch();
    }
    // [البحث بمعرف المستخدم] (dir="rtl") --> هذه الدالة المطلوبة لـ AuthMiddleware
    public function findByID($userID)
    {
        $query = "SELECT * FROM " . $this->table . " WHERE userID = :userID LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userID", $userID);
        $stmt->execute();

        return $stmt->fetch();
    }

    // البحث باسم المستخدم
    public function findByUsername($username)
    {
        $query = "SELECT * FROM " . $this->table . " WHERE username = :username LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->execute();

        return $stmt->fetch();
    }

    // التحقق من وجود البريد الإلكتروني
    public function emailExists($email)
    {
        $query = "SELECT userID FROM " . $this->table . " WHERE email = :email LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    // التحقق من وجود اسم المستخدم
    public function usernameExists($username)
    {
        $query = "SELECT userID FROM " . $this->table . " WHERE username = :username LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }


    // تحديث حالة المستخدم
    public function updateStatus($userID, $is_active)
    {
        $query = "UPDATE " . $this->table . " 
                  SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP 
                  WHERE userID = :userID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userID", $userID);
        $stmt->bindParam(":is_active", $is_active);

        return $stmt->execute();
    }

    // تحديث كلمة المرور
    public function updatePassword($userID, $newPassword)
    {
        $query = "UPDATE " . $this->table . " 
                  SET password = :password, updated_at = CURRENT_TIMESTAMP 
                  WHERE userID = :userID";

        $stmt = $this->conn->prepare($query);
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":userID", $userID);

        return $stmt->execute();
    }

    /**
     * تحديث بيانات المستخدم
     * @param string $userID معرف المستخدم
     * @param array $data بيانات التحديث
     * @return bool نجاح أو فشل
     */
    public function update($userID, $data)
    {
        $fields = [];
        $params = [':userID' => $userID];

        $allowedFields = ['email', 'phone', 'is_active'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (isset($data['password'])) {
            $fields[] = "password = :password";
            $params[':password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (empty($fields)) {
            return false;
        }

        $fields[] = "updated_at = NOW()";

        $query = "UPDATE " . $this->table . " SET " . implode(', ', $fields) . " WHERE userID = :userID";
        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        return $stmt->execute();
    }



    // حذف مستخدم
    public function delete($userID)
    {
        $query = "DELETE FROM " . $this->table . " WHERE userID = :userID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userID", $userID);

        return $stmt->execute();
    }

    // جلب جميع المستخدمين بحسب النوع
    public function getByType($userType, $limit = 100, $offset = 0)
    {
        $query = "SELECT * FROM " . $this->table . " 
                  WHERE userType = :userType 
                  ORDER BY created_at DESC 
                  LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userType", $userType);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }


    /**
     * جلب إحصائيات المستخدمين للأدمن
     * @return array إحصائيات المستخدمين
     */
    public function getUserStats()
    {
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN userType = 'patient' THEN 1 ELSE 0 END) as patients,
                    SUM(CASE WHEN userType = 'doctor' THEN 1 ELSE 0 END) as doctors,
                    SUM(CASE WHEN userType = 'admin' THEN 1 ELSE 0 END) as admins,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
                  FROM " . $this->table;

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
