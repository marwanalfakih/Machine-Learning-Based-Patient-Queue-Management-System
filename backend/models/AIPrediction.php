<?php
// backend/models/AIPrediction.php
class AIPrediction
{
    private $conn;
    private $table = "ai_predictions";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * إنشاء تنبؤ جديد
     */
    public function create($data)
    {
        $query = "INSERT INTO " . $this->table . "
                  (patientID, doctorID, predictedTime, queuePosition, 
                   confidence, hour, dayOfWeek, modelType, features)
                  VALUES (:patientID, :doctorID, :predictedTime, :queuePosition,
                          :confidence, :hour, :dayOfWeek, :modelType, :features)";

        $stmt = $this->conn->prepare($query);

        $features = isset($data['features']) ? json_encode($data['features']) : null;

        $stmt->bindParam(':patientID', $data['patientID']);
        $stmt->bindParam(':doctorID', $data['doctorID']);
        $stmt->bindParam(':predictedTime', $data['predictedTime']);
        $stmt->bindParam(':queuePosition', $data['queuePosition']);
        $stmt->bindParam(':confidence', $data['confidence']);
        $stmt->bindParam(':hour', $data['hour']);
        $stmt->bindParam(':dayOfWeek', $data['dayOfWeek']);
        $stmt->bindParam(':modelType', $data['modelType']);
        $stmt->bindParam(':features', $features);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    /**
     * تحديث الوقت الفعلي بعد اكتمال الموعد
     */
    public function updateActualTime($predictionID, $actualTime)
    {
        $query = "UPDATE " . $this->table . "
                  SET actualTime = :actualTime
                  WHERE predictionID = :predictionID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':actualTime', $actualTime);
        $stmt->bindParam(':predictionID', $predictionID);

        return $stmt->execute();
    }

    /**
     * الحصول على دقة التنبؤات
     */
    public function getAccuracy()
    {
        $query = "SELECT 
                    COUNT(*) as total_predictions,
                    AVG(ABS(predictedTime - actualTime)) as mean_absolute_error,
                    SUM(CASE WHEN ABS(predictedTime - actualTime) <= 5 THEN 1 ELSE 0 END) as accurate_within_5min,
                    SUM(CASE WHEN ABS(predictedTime - actualTime) <= 10 THEN 1 ELSE 0 END) as accurate_within_10min
                  FROM " . $this->table . "
                  WHERE actualTime IS NOT NULL";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch();

        if ($result && $result['total_predictions'] > 0) {
            $result['accuracy_percentage'] = round(
                ($result['accurate_within_5min'] / $result['total_predictions']) * 100,
                2
            );
        }

        return $result;
    }

    /**
     * الحصول على بيانات التدريب
     */
    public function getTrainingData($days = 30)
    {
        $query = "SELECT * FROM " . $this->table . "
                  WHERE actualTime IS NOT NULL
                  AND createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
                  ORDER BY createdAt DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':days', $days, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * الحصول على إحصائيات حسب النموذج
     */
    public function getModelStats()
    {
        $query = "SELECT 
                    modelType,
                    COUNT(*) as count,
                    AVG(ABS(predictedTime - actualTime)) as avg_error,
                    AVG(predictedTime) as avg_prediction,
                    AVG(actualTime) as avg_actual
                  FROM " . $this->table . "
                  WHERE actualTime IS NOT NULL
                  GROUP BY modelType";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * الحصول على توزيع التنبؤات حسب الساعة
     */
    public function getHourlyStats()
    {
        $query = "SELECT 
                    hour,
                    COUNT(*) as count,
                    AVG(predictedTime) as avg_prediction,
                    AVG(actualTime) as avg_actual
                  FROM " . $this->table . "
                  WHERE actualTime IS NOT NULL
                  GROUP BY hour
                  ORDER BY hour";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
