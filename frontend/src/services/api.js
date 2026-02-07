//const API_URL = "http://localhost/backend";
//export const API_URL = "http://localhost/backend/api";
// export default API_URL;// services/api.js
const API_URL = 'http://localhost:8000/api';

// تخزين التوكن
let authToken = localStorage.getItem('token') || '';

// دالة تعيين التوكن
export const setAuthToken = (token) => {
    authToken = token;
    localStorage.setItem('token', token);
};

// دالة إزالة التوكن
export const clearAuthToken = () => {
    authToken = '';
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// دالة إنشاء رأس المصادقة
const getAuthHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return headers;
};

// دالة تسجيل الدخول
export const login = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}/auth//auth.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            }),
        });

        const data = await response.json();
        
        if (data.success) {
            // حفظ التوكن والمستخدم
            setAuthToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data;
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة تسجيل المريض
export const registerPatient = async (patientData) => {
    try {
        const response = await fetch(`${API_URL}/auth/auth.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'register',
                username: patientData.username || patientData.email.split('@')[0],
                email: patientData.email,
                password: patientData.password,
                phone: patientData.phone || '',
                userType: 'patient',
                patient_data: {
                    fullName: `${patientData.firstName} ${patientData.lastName}`,
                    dateOfBirth: patientData.dateOfBirth,
                    gender: patientData.gender,
                    address: patientData.address || '',
                    emergencyContact: patientData.emergencyContactName || '',
                    bloodType: patientData.bloodType,
                    medicalHistory: patientData.preExistingConditions || '',
                    allergies: patientData.allergies || ''
                }
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة جلب بيانات المريض
export const getPatientProfile = async (patientID) => {
    try {
        const response = await fetch(`${API_URL}/users/patients.php?patientID=${patientID}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        return await response.json();
    } catch (error) {
        console.error('Get patient error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة جلب الأطباء
export const getDoctors = async (specialty = '') => {
    try {
        const url = specialty 
            ? `${API_URL}/users/doctors.php?specialization=${specialty}`
            : `${API_URL}/users/doctors.php`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        return await response.json();
    } catch (error) {
        console.error('Get doctors error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة حجز موعد
export const bookAppointment = async (appointmentData) => {
    try {
        const response = await fetch(`${API_URL}/appointments/appointments.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'book',
                ...appointmentData
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('Book appointment error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة جلب مواعيد المريض
export const getPatientAppointments = async (patientID, status = null) => {
    try {
        let url = `${API_URL}/appointments/appointments.php?patientID=${patientID}`;
        if (status) {
            url += `&status=${status}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        return await response.json();
    } catch (error) {
        console.error('Get appointments error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة جلب مواعيد اليوم للطبيب
export const getDoctorTodayAppointments = async (doctorID) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
            `${API_URL}/appointments/appointments.php?doctorID=${doctorID}&date=${today}`,
            {
                method: 'GET',
                headers: getAuthHeaders(),
            }
        );

        return await response.json();
    } catch (error) {
        console.error('Get doctor appointments error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة تحديث حالة الموعد
export const updateAppointmentStatus = async (appointmentID, status) => {
    try {
        const response = await fetch(`${API_URL}/appointments/appointments.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'update-status',
                appointmentID: appointmentID,
                status: status
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('Update appointment error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة إلغاء الموعد
export const cancelAppointment = async (appointmentID, reason = '') => {
    try {
        const response = await fetch(`${API_URL}/appointments/appointments.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'cancel',
                appointmentID: appointmentID,
                reason: reason
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('Cancel appointment error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة GPS Check-in
export const gpsCheckin = async (patientID, appointmentID, latitude, longitude) => {
    try {
        const response = await fetch(`${API_URL}/gps/gps.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'checkin',
                patientID: patientID,
                appointmentID: appointmentID,
                latitude: latitude,
                longitude: longitude
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('GPS Check-in error:', error);
        return { success: false, error: 'Network error' };
    }
};

// دالة التحقق من حالة التوكن
export const verifyToken = async () => {
    try {
        const response = await fetch(`${API_URL}/auth/auth.php`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action: 'verify'
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('Token verification error:', error);
        return { success: false, error: 'Network error' };
    }
};
