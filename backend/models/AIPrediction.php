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
     * الحصول على إحصائيات عامة للتنبؤات
     * @return array إحصائيات
     */
    public function getStats()
    {
        $query = "SELECT 
                    COUNT(*) as totalPredictions,
                    COUNT(DISTINCT modelType) as uniqueModels,
                    AVG(confidence) as avgConfidence,
                    MAX(createdAt) as lastPrediction
                  FROM " . $this->table . "
                  WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
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
     * الحصول على إحصائيات حسب النموذج
     * @return array إحصائيات النماذج
     */
    public function getModelStatsForAdmin()
    {
        $query = "SELECT 
                    modelType,
                    COUNT(*) as predictionCount,
                    AVG(confidence) as avgConfidence,
                    AVG(predictedTime) as avgPredictedTime,
                    AVG(actualTime) as avgActualTime,
                    MIN(createdAt) as firstUsed,
                    MAX(createdAt) as lastUsed
                  FROM " . $this->table . "
                  WHERE actualTime IS NOT NULL
                  GROUP BY modelType
                  ORDER BY predictionCount DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        $models = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // حساب الدقة
            $accuracy = null;
            if ($row['avgPredictedTime'] && $row['avgActualTime']) {
                $accuracy = 100 - (abs($row['avgPredictedTime'] - $row['avgActualTime']) / $row['avgActualTime'] * 100);
            }

            $models[] = [
                'modelType' => $row['modelType'],
                'predictionCount' => (int)$row['predictionCount'],
                'avgConfidence' => round((float)$row['avgConfidence'] * 100, 1),
                'avgPredictedTime' => (int)$row['avgPredictedTime'],
                'avgActualTime' => (int)$row['avgActualTime'],
                'accuracy' => $accuracy ? round($accuracy, 1) : null,
                'firstUsed' => $row['firstUsed'],
                'lastUsed' => $row['lastUsed']
            ];
        }

        return $models;
    }

    /**
     * الحصول على التنبؤات الأخيرة
     * @param int $limit عدد النتائج
     * @return array التنبؤات الأخيرة
     */
    public function getRecentPredictions($limit = 20)
    {
        $query = "SELECT p.*, 
                         pat.fullName as patientName,
                         doc.fullName as doctorName
                  FROM " . $this->table . " p
                  LEFT JOIN patients pat ON p.patientID = pat.patientID
                  LEFT JOIN doctors doc ON p.doctorID = doc.doctorID
                  ORDER BY p.createdAt DESC
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
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
