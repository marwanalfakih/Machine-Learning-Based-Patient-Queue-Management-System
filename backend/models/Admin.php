<?php
// models/Admin.php
class Admin
{
    private $conn;
    private $table = "admins";

    public $adminID;
    public $userID;
    public $fullName;
    public $department;
    public $role;
    public $permissions;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * إنشاء أدمن جديد
     * @param array $data بيانات الأدمن
     * @return string|bool معرف الأدمن أو false عند الفشل
     */
    public function create($data)
    {
        //$adminID = 'ADM_' . uniqid();
        $adminID = 'ADM_' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        $query = "INSERT INTO " . $this->table . " 
                  (adminID, userID, fullName, department, role, permissions) 
                  VALUES (:adminID, :userID, :fullName, :department, :role, :permissions)";

        $stmt = $this->conn->prepare($query);

        $permissions = isset($data['permissions']) ? json_encode($data['permissions']) : null;

        $stmt->bindParam(":adminID", $adminID);
        $stmt->bindParam(":userID", $data['userID']);
        $stmt->bindParam(":fullName", $data['fullName']);
        $stmt->bindParam(":department", $data['department']);
        $stmt->bindParam(":role", $data['role']);
        $stmt->bindParam(":permissions", $permissions);

        if ($stmt->execute()) {
            return $adminID;
        }
        return false;
    }

    /**
     * البحث بواسطة adminID
     * @param string $adminID معرف الأدمن
     * @return array|null بيانات الأدمن أو null
     */
    public function findByID($adminID)
    {
        $query = "SELECT a.*, u.username, u.email, u.phone, u.created_at, u.is_active
                  FROM " . $this->table . " a
                  JOIN users u ON a.userID = u.userID
                  WHERE a.adminID = :adminID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":adminID", $adminID);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'adminID' => $row['adminID'],
                'userID' => $row['userID'],
                'fullName' => $row['fullName'],
                'username' => $row['username'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'department' => $row['department'],
                'role' => $row['role'],
                'permissions' => json_decode($row['permissions'], true),
                'isActive' => (bool)$row['is_active'],
                'createdAt' => $row['created_at']
            ];
        }

        return null;
    }

    /**
     * البحث بواسطة userID
     * @param string $userID معرف المستخدم
     * @return array|null بيانات الأدمن أو null
     */
    public function findByUserID($userID)
    {
        $query = "SELECT a.*, u.username, u.email, u.phone, u.created_at, u.is_active
                  FROM " . $this->table . " a
                  JOIN users u ON a.userID = u.userID
                  WHERE a.userID = :userID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userID", $userID);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        return null;
    }

    /**
     * جلب جميع الأدمن
     * @return array قائمة الأدمن
     */
    public function getAll()
    {
        $query = "SELECT a.*, u.username, u.email, u.phone, u.created_at, u.is_active
                  FROM " . $this->table . " a
                  JOIN users u ON a.userID = u.userID
                  WHERE u.userType = 'admin'
                  ORDER BY a.fullName ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        $admins = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $admins[] = [
                'adminID' => $row['adminID'],
                'userID' => $row['userID'],
                'fullName' => $row['fullName'],
                'username' => $row['username'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'department' => $row['department'],
                'role' => $row['role'],
                'permissions' => json_decode($row['permissions'], true),
                'isActive' => (bool)$row['is_active'],
                'createdAt' => $row['created_at'],
                'initials' => substr($row['fullName'], 0, 2)
            ];
        }

        return $admins;
    }

    /**
     * تحديث بيانات الأدمن
     * @param string $adminID معرف الأدمن
     * @param array $data بيانات التحديث
     * @return bool نجاح أو فشل
     */
    public function update($adminID, $data)
    {
        $fields = [];
        $params = [':adminID' => $adminID];

        $allowedFields = ['fullName', 'department', 'role', 'permissions'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'permissions') {
                    $fields[] = "$field = :$field";
                    $params[":$field"] = json_encode($data[$field]);
                } else {
                    $fields[] = "$field = :$field";
                    $params[":$field"] = $data[$field];
                }
            }
        }

        if (empty($fields)) {
            return false;
        }

        $query = "UPDATE " . $this->table . " SET " . implode(', ', $fields) . " WHERE adminID = :adminID";
        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        return $stmt->execute();
    }

    /**
     * حذف أدمن
     * @param string $adminID معرف الأدمن
     * @return bool نجاح أو فشل
     */
    public function delete($adminID)
    {
        $query = "DELETE FROM " . $this->table . " WHERE adminID = :adminID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':adminID', $adminID);
        return $stmt->execute();
    }

    /**
     * التحقق من صلاحية الأدمن
     * @param string $adminID معرف الأدمن
     * @param string $permission الصلاحية المطلوبة
     * @return bool هل لديه الصلاحية
     */
    public function hasPermission($adminID, $permission)
    {
        $admin = $this->findByID($adminID);

        if (!$admin || !$admin['permissions']) {
            return false;
        }

        $permissions = $admin['permissions'];

        // تحقق من وجود الصلاحية في الهيكل المتداخل
        $parts = explode('.', $permission);
        $current = $permissions;

        foreach ($parts as $part) {
            if (!isset($current[$part])) {
                return false;
            }
            $current = $current[$part];
        }

        return $current === true;
    }
}
