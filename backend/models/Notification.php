<?php
// models/Notification.php
class Notification
{
    private $conn;
    private $table = "notifications";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function create($data)
    {
        //$notificationID = 'NOT_' . uniqid() . '_' . time();
        $notificationID = 'NOT_' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        $query = "INSERT INTO " . $this->table . "
                  (notificationID, userID, notificationType, title, message, data, status, channel, sentTime)
                  VALUES (:notificationID, :userID, :type, :title, :message, :data, 'sent', 'in_app', NOW())";

        $stmt = $this->conn->prepare($query);
        $dataJson = isset($data['data']) ? json_encode($data['data']) : null;

        $stmt->bindParam(':notificationID', $notificationID);
        $stmt->bindParam(':userID', $data['userID']);
        $stmt->bindParam(':type', $data['type']);
        $stmt->bindParam(':title', $data['title']);
        $stmt->bindParam(':message', $data['message']);
        $stmt->bindParam(':data', $dataJson);

        return $stmt->execute();
    }

    public function getUserNotifications($userID, $limit = 20)
    {
        $query = "SELECT * FROM " . $this->table . "
                  WHERE userID = :userID
                  ORDER BY sentTime DESC
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userID', $userID);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function markAsRead($notificationID)
    {
        $query = "UPDATE " . $this->table . "
                  SET status = 'read', readTime = NOW()
                  WHERE notificationID = :notificationID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':notificationID', $notificationID);
        return $stmt->execute();
    }
}
