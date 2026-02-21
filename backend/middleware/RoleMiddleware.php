<?php
// middleware/RoleMiddleware.php
class RoleMiddleware
{

    public function requirePatient($user)
    {
        if ($user['userType'] !== 'patient') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied. Patient role required.'
            ]);
            exit;
        }
    }

    public function requireDoctor($user)
    {
        if ($user['userType'] !== 'doctor') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied. Doctor role required.'
            ]);
            exit;
        }
    }

    public function requireAdmin($user)
    {
        if ($user['userType'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied. Admin role required.'
            ]);
            exit;
        }
    }

    public function requireAny($user, $allowedRoles)
    {
        if (!in_array($user['userType'], $allowedRoles)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied. Required role: ' . implode(', ', $allowedRoles)
            ]);
            exit;
        }
    }
}
