<?php
// ثوابت API
define("API_URL", "http://localhost:8000/api");
define("FRONTEND_URL", "http://localhost:3000");

// إعدادات JWT
define("JWT_SECRET", "smart_healthcare_secret_key_2024");
define("JWT_ALGORITHM", "HS256");

// أدوار المستخدمين
define("ROLE_PATIENT", "patient");
define("ROLE_DOCTOR", "doctor");
define("ROLE_ADMIN", "admin");

// حالات المواعيد
define("APPOINTMENT_PENDING", "pending");
define("APPOINTMENT_CONFIRMED", "confirmed");
define("APPOINTMENT_COMPLETED", "completed");
define("APPOINTMENT_CANCELLED", "cancelled");

// الأولويات
define("PRIORITY_LOW", "low");
define("PRIORITY_MEDIUM", "medium");
define("PRIORITY_HIGH", "high");
