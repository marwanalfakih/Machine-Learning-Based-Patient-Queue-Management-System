<?php
// controllers/AIController.php
require_once __DIR__ . '/../models/AIPrediction.php';
require_once __DIR__ . '/../models/Queue.php';
require_once __DIR__ . '/../models/Doctor.php';

class AIController
{
    private $conn;
    private $prediction;
    private $queue;
    private $doctor;
    private $ai_service_url = 'http://localhost:5001'; // عنوان خدمة Python

    public function __construct($db)
    {
        $this->conn = $db;
        $this->prediction = new AIPrediction($db);
        $this->queue = new Queue($db);
        $this->doctor = new Doctor($db);
    }

    // [التنبؤ بوقت الانتظار] (dir="rtl")
    public function predictWaitTime($request)
    {
        try {
            $user = $request->user;
            $data = $request->input;

            $doctorID = $data->doctorID ?? null;
            $queuePosition = $data->queuePosition ?? 1;

            // استدعاء خدمة Python
            $prediction = $this->callAIService('/predict', [
                'doctorId' => $doctorID,
                'queuePosition' => $queuePosition,
                'hour' => (int)date('H'),
                'dayOfWeek' => (int)date('w')
            ]);

            if (!$prediction) {
                // Fallback to simple calculation if AI service is down
                $predictedTime = $this->calculateSimplePrediction($doctorID, $queuePosition);
                $confidence = 'low';
            } else {
                $predictedTime = $prediction['predictedWaitTime'];
                $confidence = $prediction['confidence'];
            }

            // Save prediction to database
            $this->prediction->create([
                'predictedTime' => $predictedTime,
                'actualTime' => null,
                'confidence' => $confidence,
                'queuePosition' => $queuePosition,
                'doctorID' => $doctorID,
                'hour' => (int)date('H'),
                'dayOfWeek' => (int)date('w'),
                'modelType' => $prediction ? $prediction['modelType'] : 'simple',
                'features' => [
                    'doctorID' => $doctorID,
                    'queuePosition' => $queuePosition,
                    'hour' => date('H'),
                    'day' => date('w')
                ]
            ]);

            $this->sendResponse(200, [
                'success' => true,
                'predictedWaitTime' => $predictedTime,
                'confidence' => $confidence,
                'unit' => 'minutes',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'error' => 'Prediction failed: ' . $e->getMessage()
            ]);
        }
    }

    // [التنبؤ بالازدحام] (dir="rtl")
    public function predictCongestion($request)
    {
        try {
            $hours = isset($_GET['hours']) ? intval($_GET['hours']) : 6;

            // استدعاء خدمة Python
            $predictions = $this->callAIService('/congestion', [
                'hours' => $hours
            ]);

            if (!$predictions) {
                // Fallback to historical average
                $predictions = $this->getHistoricalCongestion($hours);
            }

            $this->sendResponse(200, [
                'success' => true,
                'predictions' => $predictions,
                'basedOn' => $predictions ? 'ai_model' : 'historical_average'
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'error' => 'Congestion prediction failed: ' . $e->getMessage()
            ]);
        }
    }

    // [تدريب النماذج] (dir="rtl")
    public function trainModels($request)
    {
        try {
            // استدعاء خدمة Python للتدريب
            $result = $this->callAIService('/train', [], 'POST');

            if ($result && isset($result['success']) && $result['success']) {
                // Save training log
                $this->saveTrainingLog($result);

                $this->sendResponse(200, [
                    'success' => true,
                    'message' => 'Models trained successfully',
                    'metrics' => $result['metrics'] ?? null
                ]);
            } else {
                throw new Exception('Training failed');
            }
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'error' => 'Training failed: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على إحصائيات AI] (dir="rtl")
    public function getStats($request)
    {
        try {
            // Get accuracy from database
            $accuracy = $this->prediction->getAccuracy();

            // Get model info from Python service
            $modelInfo = $this->callAIService('/models/info');

            $this->sendResponse(200, [
                'success' => true,
                'statistics' => [
                    'totalPredictions' => $accuracy['total'] ?? 0,
                    'meanAbsoluteError' => round($accuracy['mae'] ?? 0, 2),
                    'models' => $modelInfo['models'] ?? [
                        'linear' => false,
                        'deep_learning' => false
                    ],
                    'lastTraining' => $this->getLastTrainingDate()
                ]
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'error' => 'Failed to get stats: ' . $e->getMessage()
            ]);
        }
    }

    // [الحصول على أهمية الميزات] (dir="rtl")
    public function getFeatureImportance($request)
    {
        try {
            $importance = $this->callAIService('/feature-importance');

            $this->sendResponse(200, [
                'success' => true,
                'importance' => $importance['importance'] ?? []
            ]);
        } catch (Exception $e) {
            $this->sendResponse(500, [
                'success' => false,
                'error' => 'Failed to get feature importance: ' . $e->getMessage()
            ]);
        }
    }

    // ========== Helper Functions ==========

    private function callAIService($endpoint, $data = [], $method = 'GET')
    {
        $ch = curl_init($this->ai_service_url . '/api' . $endpoint);

        $headers = ['Content-Type: application/json'];

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'GET' && !empty($data)) {
            $url = $this->ai_service_url . '/api' . $endpoint . '?' . http_build_query($data);
            curl_setopt($ch, CURLOPT_URL, $url);
        }

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($httpCode === 200 && $response) {
            return json_decode($response, true);
        }

        return null;
    }

    private function calculateSimplePrediction($doctorID, $queuePosition)
    {
        // Simple linear prediction: 15 minutes per patient
        $baseTime = 15;

        // Adjust based on doctor's average consultation time
        if ($doctorID) {
            $doctorData = $this->doctor->findByID($doctorID);
            if ($doctorData && isset($doctorData['avgConsultationTime'])) {
                $baseTime = $doctorData['avgConsultationTime'];
            }
        }

        return $queuePosition * $baseTime;
    }

    private function getHistoricalCongestion($hours)
    {
        $predictions = [];
        $currentHour = (int)date('H');

        for ($i = 0; $i < $hours; $i++) {
            $targetHour = ($currentHour + $i) % 24;

            // Get historical average for this hour
            $query = "SELECT AVG(estimatedWaitTime) as avgWait
                     FROM queue q
                     JOIN appointments a ON q.appointmentID = a.appointmentID
                     WHERE HOUR(q.checkinTime) = :hour
                     AND DATE(q.checkinTime) >= DATE_SUB(NOW(), INTERVAL 7 DAY)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':hour', $targetHour);
            $stmt->execute();
            $result = $stmt->fetch();

            $predictions[] = [
                'hour' => $targetHour,
                'predictedWaitTime' => round($result['avgWait'] ?? 15),
                'timestamp' => date('Y-m-d H:i:s', strtotime("+$i hours"))
            ];
        }

        return $predictions;
    }

    private function getLastTrainingDate()
    {
        $query = "SELECT trainedAt FROM ai_training_logs 
                  ORDER BY trainedAt DESC LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch();

        return $result ? $result['trainedAt'] : null;
    }

    private function saveTrainingLog($result)
    {
        $query = "INSERT INTO ai_training_logs 
                  (modelType, accuracy, mae, samples, features_used, trainedAt)
                  VALUES (:modelType, :accuracy, :mae, :samples, :features, NOW())";

        $stmt = $this->conn->prepare($query);

        $modelType = isset($result['metrics']['deep_mae']) ? 'deep_learning' : 'linear';
        $mae = $result['metrics']['deep_mae'] ?? $result['metrics']['linear_mae'];
        $accuracy = 100 - ($mae / 60 * 100); // Convert MAE to percentage accuracy

        $stmt->bindParam(':modelType', $modelType);
        $stmt->bindParam(':accuracy', $accuracy);
        $stmt->bindParam(':mae', $mae);
        $stmt->bindParam(':samples', $result['metrics']['samples']);

        $features = json_encode(['hour', 'day', 'queue_position', 'doctor_load']);
        $stmt->bindParam(':features', $features);

        $stmt->execute();
    }

    private function sendResponse($statusCode, $data)
    {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }
}
