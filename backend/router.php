<?php
// backend/router.php
require_once __DIR__ . '/middleware/AuthMiddleware.php';

class Router
{
    private $db;
    private $authMiddleware;
    private $routes = [];

    public function __construct($db)
    {
        $this->db = $db;
        $this->authMiddleware = new AuthMiddleware($db);
    }

    // إضافة مسار جديد
    public function addRoute($method, $path, $controller, $action, $allowedRoles = [])
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'controller' => $controller,
            'action' => $action,
            'roles' => $allowedRoles
        ];
    }

    // معالجة الطلب
    public function handleRequest()
    {
        // الحصول على معلومات الطلب
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_SERVER['PATH_INFO'] ?? '/';

        // الحصول على التوكن من الهيدر
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? '';

        // البحث عن المسار المطابق
        $route = $this->findRoute($method, $path);

        if (!$route) {
            $this->sendResponse(404, [
                'success' => false,
                'message' => 'Route not found',
                'path' => $path,
                'method' => $method
            ]);
            return;
        }

        // التحقق من المصادقة للمسارات المحمية
        $user = null;
        if (!empty($route['roles'])) {
            $auth = $this->authMiddleware->validateToken($token);

            if (!$auth['success']) {
                $this->sendResponse(401, $auth);
                return;
            }

            // التحقق من الصلاحيات
            if (!$this->authMiddleware->checkRole($auth['user'], $route['roles'])) {
                $this->sendResponse(403, [
                    'success' => false,
                    'message' => 'Access denied. Insufficient permissions.'
                ]);
                return;
            }

            $user = $auth['user'];
        }

        // الحصول على البيانات من الطلب
        $input = $this->getInputData();
        $params = $_GET;

        // استخراج متغيرات المسار
        $pathParams = $this->extractPathParams($route['path'], $path);

        // تنفيذ الـ Controller
        $this->executeController($route['controller'], $route['action'], [
            'user' => $user,
            'input' => $input,
            'params' => $params,
            'pathParams' => $pathParams
        ]);
    }

    // البحث عن المسار المطابق
    private function findRoute($method, $path)
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            // تحويل المسار إلى regex
            $pattern = $this->pathToRegex($route['path']);

            if (preg_match($pattern, $path)) {
                return $route;
            }
        }
        return null;
    }

    // تحويل المسار إلى regex
    private function pathToRegex($path)
    {
        $pattern = preg_replace('/\/:([^\/]+)/', '/([^/]+)', $path);
        return '/^' . str_replace('/', '\/', $pattern) . '$/';
    }

    // استخراج متغيرات المسار
    private function extractPathParams($routePath, $actualPath)
    {
        $params = [];
        $routeParts = explode('/', $routePath);
        $actualParts = explode('/', $actualPath);

        foreach ($routeParts as $index => $part) {
            if (strpos($part, ':') === 0) {
                $paramName = substr($part, 1);
                $params[$paramName] = $actualParts[$index] ?? null;
            }
        }

        return $params;
    }

    // الحصول على بيانات الإدخال
    private function getInputData()
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = $_POST;
        }

        // تحويل إلى object للتطابق مع AuthController
        return (object) $input;
    }

    // تنفيذ الـ Controller
    private function executeController($controllerName, $action, $data)
    {
        // تحميل ملف الـ Controller
        require_once __DIR__ . '/controllers/' . $controllerName . '.php';

        // إنشاء كائن الـ Controller
        $controller = new $controllerName($this->db);

        // تمرير البيانات كـ object (للتطابق مع AuthController)
        $requestData = (object) [
            'user' => $data['user'],
            'input' => $data['input'],
            'params' => (object) $data['params'],
            'pathParams' => (object) $data['pathParams']
        ];

        // استدعاء الدالة
        $controller->$action($requestData);
    }

    // إرسال الرد
    private function sendResponse($statusCode, $data)
    {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }
}
