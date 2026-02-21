<?php
// api/patient/shared/auth_helper.php

/**
 * التحقق من صحة التوكن وإرجاع userID
 */
function validateToken()
{
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    $token = str_replace('Bearer ', '', $authHeader);

    if (empty($token)) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "error" => "Token is required"
        ]);
        exit;
    }

    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception("Invalid token format");
        }

        $payload = json_decode(base64_decode($parts[1]), true);

        if (!$payload || !isset($payload['userID'])) {
            throw new Exception("Invalid token payload");
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new Exception("Token has expired");
        }

        return $payload['userID'];
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "error" => "Authentication failed: " . $e->getMessage()
        ]);
        exit;
    }
}

/**
 * التحقق من أن المستخدم هو مريض وجلب بياناته
 */
function getPatientData($db, $userID)
{
    require_once __DIR__ . '/../../../models/Patient.php';
    require_once __DIR__ . '/../../../models/User.php';

    $patientModel = new Patient($db);
    $userModel = new User($db);

    // التحقق من وجود المستخدم
    $user = $userModel->findByID($userID);
    if (!$user) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error" => "User not found"
        ]);
        exit;
    }

    // التحقق من أن المستخدم هو مريض
    if ($user['userType'] !== 'patient') {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "error" => "Access denied. Patient account required."
        ]);
        exit;
    }

    // جلب بيانات المريض
    $patientData = $patientModel->findByUserID($userID);

    if (!$patientData) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error" => "Patient profile not found"
        ]);
        exit;
    }

    return [
        'patient' => $patientData,
        'user' => $user
    ];
}
