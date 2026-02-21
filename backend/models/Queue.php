<?php
// models/Queue.php

class Queue
{
    private $conn;
    private $table = "queue";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * الحصول على موقع المريض في قائمة الانتظار
     * @param string $patientID معرف المريض
     * @return array|null بيانات قائمة الانتظار أو null إذا لم يكن في القائمة
     */
    public function getPatientPosition($patientID)
    {
        error_log("🔍 Getting queue position for patient: " . $patientID);
        // أولاً: الحصول على موعد اليوم للمريض
        $today = date('Y-m-d');
        error_log("📅 Today's date: " . $today);

        $query = "SELECT a.appointmentID, a.appointmentDate, a.status as appointmentStatus,
                         q.queueID, q.queuePosition, q.estimatedWaitTime, q.estimatedArrivalTime, q.status as queueStatus,
                         q.priority, q.checkinTime,
                         d.fullName as doctorName, d.specialization, d.doctorID
                  FROM appointments a
                  LEFT JOIN queue q ON a.appointmentID = q.appointmentID
                  JOIN doctors d ON a.doctorID = d.doctorID
                  WHERE a.patientID = :patientID 
                    AND DATE(a.appointmentDate) = :today
                    AND a.status IN ('scheduled', 'confirmed', 'checked-in', 'in-progress')
                  ORDER BY a.appointmentDate DESC
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':patientID', $patientID);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        $appointment = $stmt->fetch();
        error_log("📋 Appointment data: " . print_r($appointment, true));

        if (!$appointment) {
            error_log("❌ No appointment found for today");
            return null;
        }

        // إذا كان الموعد موجوداً ولكن ليس في قائمة الانتظار
        if (empty($appointment['queueID'])) {
            return [
                'inQueue' => false,
                'message' => 'You have an appointment today but haven\'t checked in yet',
                'appointment' => [
                    'time' => date('H:i', strtotime($appointment['appointmentDate'])),
                    'doctor' => $appointment['doctorName'],
                    'specialization' => $appointment['specialization']
                ]
            ];
        }

        // حساب عدد المرضى الذين في الانتظار قبل هذا المريض
        $aheadQuery = "SELECT COUNT(*) as patientsAhead 
                       FROM queue 
                       WHERE DATE(checkinTime) = :today 
                         AND status = 'waiting' 
                         AND queuePosition < :position";

        $stmt = $this->conn->prepare($aheadQuery);
        $stmt->bindParam(':today', $today);
        $stmt->bindParam(':position', $appointment['queuePosition']);
        $stmt->execute();

        $ahead = $stmt->fetch();

        // حساب وقت الانتظار المتبقي - تصحيح الخطأ هنا
        $estimatedRemaining = $appointment['estimatedWaitTime'] ?? 15; // قيمة افتراضية 15 دقيقة

        if ($ahead && $ahead['patientsAhead'] > 0) {
            // تقدير بسيط: كل مريض يأخذ 15 دقيقة
            $estimatedRemaining = $ahead['patientsAhead'] * 15;
        }

        // تنسيق وقت الوصول التقديري إذا كان موجوداً
        $estimatedArrivalTime = null;
        if (!empty($appointment['estimatedArrivalTime'])) {
            $seconds = $appointment['estimatedArrivalTime'];
            if ($seconds < 60) {
                $estimatedArrivalTime = floor($seconds) . ' sec';
            } elseif ($seconds < 3600) {
                $minutes = floor($seconds / 60);
                $secs = $seconds % 60;
                $estimatedArrivalTime = $minutes . ' min ' . ($secs > 0 ? $secs . ' sec' : '');
            } else {
                $hours = floor($seconds / 3600);
                $minutes = floor(($seconds % 3600) / 60);
                $estimatedArrivalTime = $hours . ' hr ' . $minutes . ' min';
            }
        }

        // ========== إضافة بيانات AI ==========
        // محاولة الحصول على توقع AI محدث
        $aiPrediction = $this->getAIPredictionForPatient($patientID, $appointment['doctorID'], $appointment['queuePosition']);

        return [
            'inQueue' => true,
            'queueID' => $appointment['queueID'],
            'position' => (int)$appointment['queuePosition'],
            'patientsAhead' => (int)($ahead['patientsAhead'] ?? 0),
            'estimatedWait' => $estimatedRemaining . ' mins',
            'estimatedWaitMinutes' => (int)$estimatedRemaining,
            'estimatedArrivalTime' => $estimatedArrivalTime,
            'estimatedArrivalSeconds' => $appointment['estimatedArrivalTime'] ?? null,
            'status' => $appointment['queueStatus'],
            'priority' => $appointment['priority'],
            'checkinTime' => $appointment['checkinTime'],
            'doctorName' => $appointment['doctorName'],
            'specialization' => $appointment['specialization'],
            'doctorID' => $appointment['doctorID'],

            // ========== بيانات AI المضافة ==========
            'aiPredictedWait' => $aiPrediction['predictedWaitTime'] ?? null,
            'aiConfidence' => $aiPrediction['confidence'] ?? null,
            'aiModel' => $aiPrediction['model'] ?? null
        ];
    }

    /**
     * إضافة مريض إلى قائمة الانتظار (عند تسجيل الدخول)
     * @param string $appointmentID معرف الموعد
     * @param string $priority الأولوية (normal, high, emergency)
     * @return string|bool معرف القائمة أو false عند الفشل
     */
    public function addToQueue($appointmentID, $priority = 'normal')
    {
        // التحقق من أن الموعد غير موجود بالفعل في القائمة
        $checkQuery = "SELECT queueID FROM " . $this->table . " WHERE appointmentID = :appointmentID";
        $stmt = $this->conn->prepare($checkQuery);
        $stmt->bindParam(':appointmentID', $appointmentID);
        $stmt->execute();

        if ($stmt->fetch()) {
            return false; // موجود بالفعل
        }

        // الحصول على آخر رقم في قائمة الانتظار لهذا اليوم
        $today = date('Y-m-d');
        $positionQuery = "SELECT MAX(queuePosition) as maxPos 
                          FROM " . $this->table . " 
                          WHERE DATE(checkinTime) = :today";

        $stmt = $this->conn->prepare($positionQuery);
        $stmt->bindParam(':today', $today);
        $stmt->execute();
        $result = $stmt->fetch();

        $nextPosition = ($result['maxPos'] ?? 0) + 1;

        // تقدير وقت الانتظار (كل مريض 15 دقيقة)
        $estimatedWait = $nextPosition * 15;

        // إنشاء معرف فريد
        $queueID = 'QUE_' . uniqid() . '_' . time();

        $query = "INSERT INTO " . $this->table . "
                  (queueID, appointmentID, queuePosition, estimatedWaitTime, checkinTime, status, priority)
                  VALUES (:queueID, :appointmentID, :position, :estimatedWait, NOW(), 'waiting', :priority)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':queueID', $queueID);
        $stmt->bindParam(':appointmentID', $appointmentID);
        $stmt->bindParam(':position', $nextPosition);
        $stmt->bindParam(':estimatedWait', $estimatedWait);
        $stmt->bindParam(':priority', $priority);

        if ($stmt->execute()) {
            return $queueID;
        }

        return false;
    }

    /**
     * تحديث وقت الوصول التقديري
     * @param string $queueID معرف القائمة
     * @param int $eta وقت الوصول بالثواني
     * @return bool نجاح أو فشل
     */
    public function updateEstimatedArrivalTime($queueID, $eta)
    {
        $query = "UPDATE " . $this->table . "
                  SET estimatedArrivalTime = :eta
                  WHERE queueID = :queueID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':eta', $eta);
        $stmt->bindParam(':queueID', $queueID);
        return $stmt->execute();
    }

    /**
     * تحديث حالة مريض في قائمة الانتظار
     * @param string $queueID معرف القائمة
     * @param string $status الحالة الجديدة
     * @param int|null $actualWait وقت الانتظار الفعلي
     * @return bool نجاح أو فشل
     */
    public function updateStatus($queueID, $status, $actualWait = null)
    {
        $query = "UPDATE " . $this->table . "
                  SET status = :status, statusUpdateTime = NOW()";

        if ($actualWait !== null) {
            $query .= ", actualWaitTime = :actualWait";
        }

        if ($status === 'in-consultation' || $status === 'completed') {
            $query .= ", estimatedWaitTime = 0";
        }

        $query .= " WHERE queueID = :queueID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':queueID', $queueID);

        if ($actualWait !== null) {
            $stmt->bindParam(':actualWait', $actualWait);
        }

        return $stmt->execute();
    }

    /**
     * الحصول على قائمة الانتظار الحالية
     * @param string|null $department القسم (اختياري)
     * @return array قائمة الانتظار
     */
    public function getCurrentQueue($department = null)
    {
        $today = date('Y-m-d');

        $query = "SELECT q.*, 
                         a.patientID, a.appointmentDate, a.type,
                         p.fullName as patientName,
                         d.fullName as doctorName, d.specialization, d.department
                  FROM " . $this->table . " q
                  JOIN appointments a ON q.appointmentID = a.appointmentID
                  JOIN patients p ON a.patientID = p.patientID
                  JOIN doctors d ON a.doctorID = d.doctorID
                  WHERE DATE(q.checkinTime) = :today 
                    AND q.status IN ('waiting', 'in-consultation')
                  ORDER BY q.priority DESC, q.queuePosition ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        $queue = [];
        while ($row = $stmt->fetch()) {
            // حساب وقت الانتظار المتبقي
            $waitingTime = $this->calculateWaitingTime($row['queuePosition'], $row['priority']);

            $queue[] = [
                'queueID' => $row['queueID'],
                'position' => (int)$row['queuePosition'],
                'patientName' => $row['patientName'],
                'doctorName' => $row['doctorName'],
                'specialization' => $row['specialization'],
                'department' => $row['department'],
                'appointmentType' => $row['type'],
                'priority' => $row['priority'],
                'status' => $row['status'],
                'checkinTime' => $row['checkinTime'],
                'estimatedWait' => $waitingTime . ' mins',
                'estimatedWaitMinutes' => $waitingTime,
                'estimatedArrivalTime' => $row['estimatedArrivalTime']
            ];
        }

        return $queue;
    }

    /**
     * حساب وقت الانتظار التقديري
     * @param int $position الرقم في القائمة
     * @param string $priority الأولوية
     * @return int وقت الانتظار بالدقائق
     */
    private function calculateWaitingTime($position, $priority)
    {
        // وقت أساسي لكل مريض
        $baseTime = 15;

        // تخفيض الوقت للمرضى ذوي الأولوية العالية
        if ($priority === 'high') {
            $baseTime = 10;
        } elseif ($priority === 'emergency') {
            $baseTime = 5;
        }

        // المرضى ذوو الأولوية العالية ينتقلون إلى الأمام
        $effectivePosition = $position;

        return $effectivePosition * $baseTime;
    }

    /**
     * إزالة مريض من قائمة الانتظار
     * @param string $queueID معرف القائمة
     * @return bool نجاح أو فشل
     */
    public function removeFromQueue($queueID)
    {
        $query = "DELETE FROM " . $this->table . " WHERE queueID = :queueID";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':queueID', $queueID);
        return $stmt->execute();
    }

    /**
     * الحصول على إحصائيات قائمة الانتظار
     * @return array إحصائيات
     */
    public function getQueueStats()
    {
        $today = date('Y-m-d');

        $stats = [
            'total' => 0,
            'waiting' => 0,
            'inConsultation' => 0,
            'completed' => 0,
            'averageWait' => 0,
            'byPriority' => [
                'normal' => 0,
                'high' => 0,
                'emergency' => 0
            ]
        ];

        // إجمالي المرضى اليوم
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                    SUM(CASE WHEN status = 'in-consultation' THEN 1 ELSE 0 END) as inConsultation,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END) as normal,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN priority = 'emergency' THEN 1 ELSE 0 END) as emergency,
                    AVG(actualWaitTime) as avgWait
                  FROM " . $this->table . "
                  WHERE DATE(checkinTime) = :today";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        $result = $stmt->fetch();

        if ($result) {
            $stats['total'] = (int)$result['total'];
            $stats['waiting'] = (int)$result['waiting'];
            $stats['inConsultation'] = (int)$result['inConsultation'];
            $stats['completed'] = (int)$result['completed'];
            $stats['averageWait'] = round($result['avgWait'] ?? 0);
            $stats['byPriority']['normal'] = (int)$result['normal'];
            $stats['byPriority']['high'] = (int)$result['high'];
            $stats['byPriority']['emergency'] = (int)$result['emergency'];
        }

        return $stats;
    }

    /**
     * تحديث وقت الانتظار التقديري لجميع المرضى في القائمة
     * @return bool نجاح أو فشل
     */
    public function updateEstimatedTimes()
    {
        $today = date('Y-m-d');

        // الحصول على جميع المرضى في قائمة الانتظار
        $query = "SELECT queueID, queuePosition, priority 
                  FROM " . $this->table . " 
                  WHERE DATE(checkinTime) = :today AND status = 'waiting'
                  ORDER BY queuePosition ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':today', $today);
        $stmt->execute();

        $position = 1;
        while ($row = $stmt->fetch()) {
            $waitTime = $this->calculateWaitingTime($position, $row['priority']);

            $updateQuery = "UPDATE " . $this->table . "
                            SET estimatedWaitTime = :waitTime
                            WHERE queueID = :queueID";

            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->bindParam(':waitTime', $waitTime);
            $updateStmt->bindParam(':queueID', $row['queueID']);
            $updateStmt->execute();

            $position++;
        }

        return true;
    }

    /**
     * تحديث وقت الانتظار التقديري باستخدام AI
     * @param string $queueID معرف القائمة
     * @param int $newWaitTime وقت الانتظار الجديد
     * @return bool نجاح أو فشل
     */
    public function updateEstimatedWaitTime($queueID, $newWaitTime)
    {
        $query = "UPDATE " . $this->table . "
                  SET estimatedWaitTime = :waitTime
                  WHERE queueID = :queueID";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':waitTime', $newWaitTime);
        $stmt->bindParam(':queueID', $queueID);
        return $stmt->execute();
    }

    // ========== دوال مساعدة لـ AI ==========

    /**
     * الحصول على توقع AI لمريض معين
     * @param string $patientID معرف المريض
     * @param string $doctorID معرف الطبيب
     * @param int $position الموقع في قائمة الانتظار
     * @return array|null بيانات التوقع أو null
     */
    private function getAIPredictionForPatient($patientID, $doctorID, $position)
    {
        // محاولة الاتصال بخدمة AI
        $ch = curl_init('http://localhost:5001/api/predict');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'doctorID' => $doctorID,
            'queuePosition' => $position,
            'patientID' => $patientID
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2); // مهلة قصيرة

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if ($data && isset($data['predictedWaitTime'])) {
                return [
                    'predictedWaitTime' => $data['predictedWaitTime'],
                    'confidence' => $data['confidence'] ?? 'medium',
                    'model' => $data['model']['name'] ?? 'neural_network'
                ];
            }
        }

        return null;
    }
}
