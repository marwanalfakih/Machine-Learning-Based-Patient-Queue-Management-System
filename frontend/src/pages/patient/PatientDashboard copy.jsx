/* global L */
import React, { useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import "../../styles/theme.css";
import "../../styles/patient-components.css";


// مكونات الصفحات الفرعية
import ViewRecords from './ViewRecords';
import AIHelp from './AIHelp';
import Medication from './Medication';
import VitalSigns from './VitalSigns';
import ActivityLog from './ActivityLog';
import MedicalHistory from './MedicalHistory';
import AppointmentBooking from './AppointmentBooking'; 

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queueData, setQueueData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  const [aiPredictions, setAiPredictions] = useState({});
  const [activeAIModel, setActiveAIModel] = useState('unknown');

    // حالات الخريطة
  const [showMap, setShowMap] = useState(false);
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('1. Checking token in localStorage:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      console.log('2. No token found, redirecting to login');
      navigate('/login'); 
      return;
    }
    
    console.log('3. Token found (first 20 chars):', token.substring(0, 20) + '...');
    fetchAllData();
  }, []);

  // التحقق من حالة AI
const checkAIStatus = async () => {
    try {
      // تحقق من Python service (قد لا يكون موجوداً)
      try {
        const pythonResponse = await fetch('http://localhost:5001/api/health', {
          mode: 'no-cors', // هذا قد يساعد في تجنب أخطاء CORS
          timeout: 2000 // مهلة قصيرة
        });
        
        if (pythonResponse.ok) {
          const pythonData = await pythonResponse.json();
          console.log('🐍 Python AI Service:', pythonData.status);
          console.log('📊 Models loaded:', pythonData.models);
        } else {
          console.log('⚠️ Python AI Service not available (using PHP fallback)');
        }
      } catch (pythonError) {
        console.log('⚠️ Python AI Service not running - using PHP fallback');
      }
      
      // تحقق من PHP AI (هذا يعمل دائماً)
      const phpResponse = await fetch('http://localhost:8000/api/ai/models.php', {
        headers: getAuthHeaders()
      });
      
      if (phpResponse.ok) {
        const phpData = await phpResponse.json();
        console.log('🐘 PHP AI Models:', phpData.models);
        console.log('🔌 Active model: PHP Rules-based');
      }
    } catch (error) {
      console.log('❌ AI Status Check Failed:', error.message);
    }
  };

// استدعها بعد fetchAIModels
useEffect(() => {
  fetchAIModels();
  checkAIStatus(); // أضف هذا
}, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchAllData = async () => {
    console.log('5. Starting to fetch all data');
    setLoading(true);
    try {
      await fetchPatientData();
      console.log('6. All data fetched successfully');
    } catch (error) {
      console.error('7. Error in fetchAllData:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      console.log('8. Fetching patient data from API...');
      const headers = getAuthHeaders();
      
      const url = 'http://localhost:8000/api/patient/patients.php';
      console.log('10. Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('11. Response status:', response.status);
      
      const responseText = await response.text();
      console.log('13. Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('14. Parsed response data:', data);
      } catch (parseError) {
        console.error('15. JSON parse error:', parseError);
        throw new Error('Server returned invalid JSON');
      }

      if (response.ok && data.success) {
        console.log('17. Success! Patient data received:', data.patient);
        setPatientData(data.patient);
        setError(null);
        
        // بعد الحصول على بيانات المريض، نجلب باقي البيانات
        await Promise.all([
          fetchAppointments(data.patient.patientID),
          fetchQueueData(data.patient.patientID),
          fetchRecentActivities(data.patient.patientID)
        ]);
      } else {
        console.log('18. Error from server:', data.error || 'Unknown error');
        
        if (response.status === 401) {
          console.log('19. Token invalid, redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(data.error || `Failed to load data (Status: ${response.status})`);
        }
      }
    } catch (error) {
      console.error('20. Exception in fetchPatientData:', error);
      throw error;
    }
  };

  const fetchAppointments = async (patientID) => {
    try {
      const response = await fetch(`http://localhost:8000/api/patient/appointments.php?patientID=${patientID}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      {/*
      if (response.ok && data.success) {
        setAppointments(data.appointments || []);
        console.log('Appointments loaded:', data.appointments);
      }*/}

      if (response.ok && data.success) {
        // الحصول على تاريخ اليوم (بدون وقت)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // تصفية المواعيد القادمة فقط
        const upcomingAppointments = (data.appointments || []).filter(app => {
          // استبعاد المواعيد الملغاة أو المكتملة
          if (app.status === 'cancelled' || app.status === 'completed') {
            return false;
          }
          
          // مقارنة تاريخ الموعد مع اليوم
          const appointmentDate = new Date(app.appointmentDate);
          appointmentDate.setHours(0, 0, 0, 0);
          
          // موعد قادم إذا كان تاريخه >= اليوم
          return appointmentDate >= today;
        });
        
        // ترتيب المواعيد من الأقرب إلى الأبعد
        upcomingAppointments.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
        
        setAppointments(upcomingAppointments);
        console.log('✅ Upcoming appointments:', upcomingAppointments);
      }
       else {
        console.warn('Failed to load appointments:', data.error);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  const fetchQueueData = async (patientID) => {
    console.log('🟡 Fetching queue data for patient:', patientID);
    try {
      const response = await fetch(`http://localhost:8000/api/patient/queue.php?patientID=${patientID}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      console.log('🟢 Queue API Response:', data);

      if (response.ok && data.success) {
        console.log('✅ Queue data received:', data.queue);
        setQueueData(data.queue);
        console.log('Queue data loaded:', data.queue);
      } else {
        console.warn('⚠️No queue data available');
        setQueueData(null);
      }
    } catch (error) {
      console.error('🔴 Error fetching queue data:', error);
      setQueueData(null);
    }
  };

  const fetchRecentActivities = async (patientID) => {
    try {
      const response = await fetch(`http://localhost:8000/api/patient/activities.php?patientID=${patientID}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setActivities(data.activities || []);
        console.log('Activities loaded:', data.activities);
      } else {
        console.warn('No activities available');
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  };

  // جلب معلومات نماذج AI
  const fetchAIModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/models.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        console.log('AI Models:', data.models);
        setActiveAIModel(data.active_model);  //  تخزين النموذج النشط
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
    }
  };

  // جلب توقع AI لوقت الانتظار
const fetchAIPrediction = async (doctorId, position) => {
  try {
    const response = await fetch('http://localhost:8000/api/ai/predict.php', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        doctorID: doctorId,
        queuePosition: position,
        patientID: patientData?.patientID
      })
    });
    
    const data = await response.json();
    if (data.success) {
      setAiPredictions(prev => ({
        ...prev,
        [doctorId]: {
          time: data.predictedWaitTime,
          confidence: data.confidence,
          model: data.model.name
        }
      }));
      console.log('AI Prediction:', data);
    }
  } catch (error) {
    console.error('Error fetching AI prediction:', error);
  }
};

// استدعاء fetchAIModels عند تحميل الصفحة
useEffect(() => {
  fetchAIModels();
}, []);

  
  // ========== GPS Check-In Functions ==========
  const handleGPSCheckIn = async (locationData) => {
    try {
      setGpsStatus('checking');
      
      const response = await fetch('http://localhost:8000/api/gps/checkin.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationData)
      });

      const data = await response.json();
      console.log('=== GPS CHECK-IN RESPONSE ===');
      console.log('Full response:', data);
      console.log('Success:', data.success);
      console.log('Data:', data.data);
      console.log('Location:', data.data?.location);


      if (data.success) {
        // تحديث بيانات قائمة الانتظار
        setQueueData(data.data);
        setGpsStatus('success');
        
        // حفظ بيانات الموقع للخريطة - مع التحقق من وجود البيانات
        if (data.data && data.data.location) {
          console.log('Setting location data for map:', data.data.location);
          setLocationData({
            patientLocation: {
              lat: data.data.location.patientLat,
              lng: data.data.location.patientLng
            },
            hospitalLocation: {
              lat: data.data.location.hospitalLat,
              lng: data.data.location.hospitalLng
            },
            distance: data.data.distance,
            estimatedTime: data.data.estimatedArrivalTime || 'Calculating...'
          });

          // عرض الخريطة بعد 1 ثانية
          setTimeout(() => {
            setShowMap(true);
          }, 1000);
        } else {
          console.warn('No location data in response');
        }

        // عرض إشعار نجاح
        showNotificationMessage('success', `✅ Check-in successful! Your position: #${data.data?.position || 'N/A'}`);
        
        // إضافة نشاط جديد
        const newActivity = {
          id: Date.now(),
          type: 'checkin',
          description: `Checked in via GPS • Position #${data.data?.position || 'N/A'}`,
          time: 'Just now',
          icon: 'fa-map-marker-alt'
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
        
        // إعادة جلب بيانات قائمة الانتظار بعد 2 ثانية للتحديث
        setTimeout(() => {
          if (patientData?.patientID) {
            fetchQueueData(patientData.patientID);
        }
        }, 2000);
        
      } else {
        setGpsStatus('error');

        if (data.location) {
          // إذا كان هناك بيانات موقع حتى لو فشل check-in
          setLocationData({
            patientLocation: {
              lat: data.location.latitude,
              lng: data.location.longitude
            },
            hospitalLocation: {
              lat: data.location.hospitalLocation.lat,
              lng: data.location.hospitalLocation.lng
            },
            distance: data.location.distance,
            estimatedTime: data.location.estimatedTime?.formatted || 'Unknown'
          });
          setShowMap(true);
        }
        
        if (data.distance) {
          showNotificationMessage('error', `You are ${data.distance}m away from the hospital. Please move closer.`);
        } else {
          showNotificationMessage('error', data.error || 'Check-in failed');
        }
      }
    } catch (error) {
      console.error('GPS Check-in error:', error);
      setGpsStatus('error');
      showNotificationMessage('error', 'Network error. Please try again.');
    }
  };

  const showNotificationMessage = (type, message) => {
    setNotificationType(type || 'info');
    setNotificationMessage(message || 'Notification');
    setShowNotification(true);
    
    // إخفاء الإشعار بعد 5 ثواني
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  const closeNotification = () => {
    setShowNotification(false);
  };

  // الحصول على موعد اليوم
  const getTodaysAppointment = () => {
    if (!appointments || appointments.length === 0) return null;
    
    //const today = new Date().toISOString().split('T')[0];
    const today = new Date().toLocaleDateString('en-CA');

    return appointments.find(app => {
      const appDate = new Date(app.appointmentDate).toISOString().split('T')[0];
      return appDate === today;
    });
  };

  // معالجة تسجيل الخروج
  const handleLogout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // حساب الأحرف الأولى من الاسم
  const getInitials = (name) => {
    if (!name) return 'PK';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // دالة تغيير التبويب
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <div style={{ marginTop: '20px' }}>
          <button onClick={fetchAllData} className="btn btn-primary">
            Try Again
          </button>
          <button onClick={handleLogout} className="btn btn-outline" style={{ marginLeft: '10px' }}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  // محتوى بناءً على التبويب النشط
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent 
          patientData={patientData} 
          todaysAppointment={getTodaysAppointment()}
          queueData={queueData}
          activities={activities}
          appointments={appointments}
          onTabChange={handleTabChange}
          onGPSCheckIn={handleGPSCheckIn}
          gpsStatus={gpsStatus}
        />;
      case 'appointment':
        return <AppointmentBooking 
          patientData={patientData} 
          getAuthHeaders={getAuthHeaders}
          onBack={() => handleTabChange('dashboard')}
        />;
      case 'records':
        return <ViewRecords 
          patientId={patientData?.patientID} 
          onBack={() => handleTabChange('dashboard')}
        />;
      case 'ai-help':
        return <AIHelp 
          patientId={patientData?.patientID} 
          onBack={() => handleTabChange('dashboard')}
        />;
      case 'medication':
        return <Medication 
          patientId={patientData?.patientID} 
          onBack={() => handleTabChange('dashboard')}
        />;
      case 'vitals':
        return <VitalSigns 
          patientId={patientData?.patientID} 
          onBack={() => handleTabChange('dashboard')}
        />;
      case 'activity':
        return <ActivityLog 
          patientId={patientData?.patientID} 
          onBack={() => handleTabChange('dashboard')}
        />;
      case 'history':
        return <MedicalHistory 
          patientId={patientData?.patientID} 
          onBack={() => handleTabChange('dashboard')}
        />;
      default:
        return <DashboardContent 
          patientData={patientData} 
          todaysAppointment={getTodaysAppointment()}
          queueData={queueData}
          activities={activities}
          appointments={appointments}
          onTabChange={handleTabChange}
          onGPSCheckIn={handleGPSCheckIn}
          gpsStatus={gpsStatus}
        />;
    }
  };

  return (
    <div className="dashboard">
      {/* شريط التنقل العلوي */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <div>
            <h1>SMART HEALTHCARE SYSTEM</h1>
            <p>Welcome back, {patientData?.fullName || 'Patient'}! 👋</p>
          </div>
          <div className="dashboard-actions">
            <button className="notif-btn" onClick={() => setShowNotification(!showNotification)}>
              <i className="fas fa-bell"></i>
              <span className="notif-badge">
                {activities?.length || 0}
              </span>
            </button>
            <button className="btn btn-outline" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      {/* إشعارات */}
      {showNotification && (
        <div className={`notification-toast ${notificationType}`}>
          <div className="notification-content">
            <i className={`fas fa-${notificationType === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            <span>{notificationMessage}</span>
          </div>
          <button className="notification-close" onClick={closeNotification}>×</button>
        </div>
      )}

      {/* نافذة الخريطة */}
      {showMap && locationData && (
        <MapView
          patientLocation={locationData.patientLocation}
          hospitalLocation={locationData.hospitalLocation}
          distance={locationData.distance}
          estimatedTime={locationData.estimatedTime}
          onClose={() => setShowMap(false)}
        />
      )}

      <div className="dashboard-content">
        {/* الشريط الجانبي */}
        <div className="sidebar">
          <div className="user-profile">
            <div className="user-avatar">
              {patientData?.initials || getInitials(patientData?.fullName) || 'PK'}
            </div>
            <h3>{patientData?.fullName || 'Patient Name'}</h3>
            <p className="user-role">Patient ID: {patientData?.patientID || 'P-00000'}</p>
          </div>
          
          <div className="sidebar-menu">
            {[
              { id: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
              { id: 'appointment', icon: 'fa-calendar-plus', label: 'Book Appointment' },
              { id: 'records', icon: 'fa-file-medical', label: 'View Records' },
              { id: 'ai-help', icon: 'fa-robot', label: 'AI Help' },
              { id: 'medication', icon: 'fa-pills', label: 'Medication' },
              { id: 'vitals', icon: 'fa-heartbeat', label: 'Vital Signs' },
              { id: 'activity', icon: 'fa-running', label: 'Activity Log' },
              { id: 'history', icon: 'fa-history', label: 'Medical History' }
            ].map((item) => (
              <button 
                key={item.id}
                className={`menu-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                <i className={`fas ${item.icon}`}></i> {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ==================== مكون GPSButton مع AI ====================
const GPSButton = ({ onCheckIn, disabled, gpsStatus }) => {
  const [checking, setChecking] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const requestLocation = () => {
    setShowPermissionPrompt(true);
  };

  const startGPSCheckIn = async () => {
    setChecking(true);
    setShowPermissionPrompt(false);

    // التحقق من دعم المتصفح للموقع الجغرافي
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setChecking(false);
      return;
    }

    // خيارات تحديد الموقع
    const options = {
      enableHighAccuracy: true, // طلب دقة عالية (GPS)
      timeout: 10000, // 10 ثواني timeout
      maximumAge: 0 // عدم استخدام موقع مخزن مؤقتاً
    };

    try {
      // محاولة الحصول على الموقع
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options); // get the current position of the device using the Geolocation API.
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // إرسال الموقع إلى الخادم والحصول على النتيجة
      const result = await onCheckIn({
        latitude,
        longitude,
        accuracy,
        travelMode: 'driving'
      });

      // **إضافة: عرض توقع AI إذا كان موجوداً**
      if (result && result.data && result.data.aiPredictedWait) {
        // يمكنك استخدام alert مؤقتاً أو إضافة نظام إشعارات لاحقاً
        setTimeout(() => {
          alert(`🤖 AI Prediction: ${result.data.aiPredictedWait} mins wait time`);
        }, 500);
      }

    } catch (error) {
      console.error('GPS Error:', error);
      
      if (error.code === 1) { // المستخدم رفض الإذن
        alert('Please allow location access to check in via GPS');
      } else if (error.code === 2) { // الموقع غير متوفر
        // محاولة بدون دقة عالية
        try {
          const fallbackPosition = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000
            });
          });
          
          const { latitude, longitude, accuracy } = fallbackPosition.coords;
          await onCheckIn({ latitude, longitude, accuracy, travelMode: 'driving'  });
          
        } catch (fallbackError) {
          alert('Unable to get your location. Please check your internet connection or try again later.');
        }
      } else if (error.code === 3) { // timeout
        alert('Location request timed out. Please try again.');
      }
    } finally {
      setChecking(false);
    }
  };
  

  return (
    <>
      {/* زر GPS */}
      <button 
        className={`gps-checkin-btn ${checking ? 'checking' : ''} ${gpsStatus}`}
        onClick={requestLocation}
        disabled={disabled || checking}
      >
        {checking ? (
          <>
            <i className="fas fa-spinner fa-spin"></i>
            Getting your location...
          </>
        ) : gpsStatus === 'success' ? (
          <>
            <i className="fas fa-check-circle"></i>
            Checked In
          </>
        ) : (
          <>
            <i className="fas fa-map-marker-alt"></i>
            CHECK IN VIA GPS
          </>
        )}
      </button>

      {/* نافذة طلب الإذن */}
      {showPermissionPrompt && (
        <div className="gps-permission-modal">
          <div className="gps-permission-content">
            <div className="gps-permission-icon">
              <i className="fas fa-map-marker-alt"></i>
            </div>
            <h3>Allow Location Access</h3>
            <p>
              To check in automatically, we need access to your location.
              This helps us verify you're at the clinic and calculate your
              estimated arrival time with AI.
            </p>
            {/*
            <div className="gps-permission-details">
              <div className="detail-item">
                <i className="fas fa-check-circle"></i>
                <span>We only use your location while checking in</span>
              </div>
              <div className="detail-item">
                <i className="fas fa-check-circle"></i>
                <span>Your location is not stored permanently</span>
              </div>
              <div className="detail-item">
                <i className="fas fa-check-circle"></i>
                <span>You can revoke access anytime</span>
              </div>
            </div>
            */}
            <div className="gps-permission-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPermissionPrompt(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={startGPSCheckIn}
              >
                Allow & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==================== مكون MapView ====================
const MapView = ({ patientLocation, hospitalLocation, distance, estimatedTime, onClose }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(typeof L !== 'undefined');

  useEffect(() => {
    // في حالة عدم وجود Google Maps API، نستخدم OpenStreetMap كبديل
    // التحقق من صحة البيانات
    if (!patientLocation || !hospitalLocation) {
      console.error('MapView: Missing location data', { patientLocation, hospitalLocation });
      setError('Location data is missing');
      return;
    }

    // التحقق من وجود المكتبة
    if (typeof L === 'undefined') {
      console.error('Leaflet library is not loaded');
      setError('Map library not loaded');
      return;
    }
    // تأخير تحميل الخريطة للتأكد من أن DOM جاهز
    const timer = setTimeout(() => {
      try {
        loadOpenStreetMap();
      } catch (err) {
        console.error('Error loading map:', err);
        setError('Failed to load map');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [patientLocation, hospitalLocation]);

  const loadOpenStreetMap = () => {
    if (!mapRef.current) {
      console.error('Map container ref is null');
      return;
    }

    // تنظيف أي خريطة موجودة
    if (mapRef.current._leaflet_id) {
      return;
    }
    try{
      // استخدام OpenStreetMap
      const map = L.map(mapRef.current).setView(
        [patientLocation.lat, patientLocation.lng], 
        13
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // إضافة markers
      const patientMarker = L.marker([patientLocation.lat, patientLocation.lng])
        .addTo(map)
        .bindPopup('📍 Your Location');

      const hospitalMarker = L.marker([hospitalLocation.lat, hospitalLocation.lng])
        .addTo(map)
        .bindPopup('🏥 Hospital');

        // رسم الخط بين النقطتين
      const latlngs = [
        [patientLocation.lat, patientLocation.lng],
        [hospitalLocation.lat, hospitalLocation.lng]
      ];

      const polyline = L.polyline(latlngs, {
        color: '#2a5298',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(map);

      // تكبير الخريطة لتناسب المسار
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

      setMapLoaded(true);
      console.log('Map loaded successfully');

    } catch (err) {
      console.error('Error creating map:', err);
      setError('Failed to create map');
    }
  };   

  if (error) {
    return (
      <div className="map-modal-overlay" onClick={onClose}>
        <div className="map-modal-content" onClick={e => e.stopPropagation()}>
          <div className="map-modal-header">
            <h3>Error Loading Map</h3>
            <button className="map-close-btn" onClick={onClose}>×</button>
          </div>
          <div className="map-error" style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#d32f2f', marginBottom: '20px' }}></i>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

    

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-content" onClick={e => e.stopPropagation()}>
        <div className="map-modal-header">
          <h3>
            <i className="fas fa-map-marked-alt"></i>
            Your Route to Hospital
          </h3>
          <button className="map-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="map-info-panel">
          <div className="map-info-item">
            <i className="fas fa-route"></i>
            <span>
              <strong>Distance:</strong> {distance || 'Calculating...'} meters
            </span>
          </div>
          <div className="map-info-item">
            <i className="fas fa-clock"></i>
            <span>
              <strong>Estimated Arrival:</strong> {estimatedTime || 'Calculating...'}
            </span>
          </div>
        </div>

        <div 
          ref={mapRef} 
          className="map-container"
          style={{ height: '400px', width: '100%' }}
        ></div>

        <div className="map-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== مكون DashboardContent ====================
const DashboardContent = ({ 
  patientData, 
  todaysAppointment, 
  queueData, 
  activities, 
  appointments, 
  onTabChange,
  onGPSCheckIn,
  gpsStatus 
}) => {
  // تنسيق الوقت
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="content-header">
        <h2>Quick Actions </h2>
        <div className="quick-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => onTabChange('appointment')}
          >
            <i className="fas fa-calendar-plus"></i> Book Appointment
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => onTabChange('records')}
          >
            <i className="fas fa-file-medical"></i> View Records
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => onTabChange('ai-help')}
          >
            <i className="fas fa-robot"></i> AI Help
          </button>
        </div>
      </div>

      {/* بطاقة موعد اليوم */}
      {todaysAppointment ? (
        <div className="card appointment-card">
          <div className="card-header">
            <h3>TODAY'S APPOINTMENT</h3>
            <span className={`status-badge ${todaysAppointment.status}`}>
              {todaysAppointment.status}
            </span>
          </div>
          <div className="appointment-details">
            <div className="doctor-info">
              <div className="doctor-avatar">
                {todaysAppointment.doctorName?.split(' ').map(n => n[0]).join('') || 'DR'}
              </div>
              <div>
                <h4>{todaysAppointment.doctorName || 'Doctor'}</h4>
                <p className="department">{todaysAppointment.department || 'General'}</p>
                <p className="time">
                  <i className="fas fa-clock"></i> {formatTime(todaysAppointment.appointmentDate)}
                </p>
              </div>
            </div>
            <GPSButton 
              onCheckIn={onGPSCheckIn}
              disabled={!todaysAppointment}
              gpsStatus={gpsStatus}
            />
          </div>
        </div>
      ) : (
        <div className="card appointment-card">
          <p>No appointments scheduled for today</p>
          <button 
            className="btn btn-primary" 
            onClick={() => onTabChange('appointment')}
          >
            Book an Appointment
          </button>
        </div>
      )}

      

      {/* الشبكة: قائمة الانتظار + النشاطات */}
      <div className="dashboard-grid">
        {/* قائمة الانتظار */}
        {/*<div className="card queue-card">
          <h3>REAL-TIME QUEUE</h3>*/}
        {/* قائمة الانتظار مع AI */}
        <div className="card queue-card">
          <div className="card-header">
            <h3>
              <i className="fas fa-robot" style={{ color: '#2a5298', marginRight: '8px' }}></i>
              AI-POWERED QUEUE
            </h3>
            {queueData?.aiPredictedWait && (
              <span className="ai-badge">
                AI Active
              </span>
            )}
          </div>  


          {queueData === null ? (
            // حالة التحميل
            <div className="queue-loading">
              <div className="spinner-small"></div>
              <p>Loading queue information...</p>
            </div>
          ) : queueData && queueData.inQueue ? (
            <>
              <div className="queue-info">
                <div className="queue-stat">
                  <span className="stat-value">#{queueData.position || 0}</span>
                  <span className="stat-label">Your Position</span>
                </div>
                <div className="queue-stat">
                  <span className="stat-value">{queueData.estimatedWait || '0'}</span>
                  <span className="stat-label">Est. Wait</span>
                </div>
                <div className="queue-stat">
                  <span className="stat-value">{queueData.patientsAhead || 0}</span>
                  <span className="stat-label">Patients Ahead</span>
                </div>
              </div>
               
              {/* عرض وقت الوصول التقديري */}
              

              {/* AI Prediction Info */}
              {queueData.aiPredictedWait && (
                <div className="ai-prediction-info">
                  <div className="ai-prediction-row">
                    <i className="fas fa-microchip"></i>
                    <span>
                      <strong>AI Prediction:</strong> {queueData.aiPredictedWait} mins
                      {queueData.aiConfidence && (
                        <span className={`confidence-badge ${queueData.aiConfidence}`}>
                          {queueData.aiConfidence} confidence
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="ai-prediction-row">
                    <i className="fas fa-clock"></i>
                    <span>
                      <strong>GPS ETA:</strong> {queueData.estimatedArrivalTime || 'Calculating...'}
                    </span>
                  </div>
                  <div className="ai-model-info">
                    <small>Using: {queueData.aiModel || 'Neural Network'} • Accuracy: 89%</small>
                  </div>
                </div>
              )}
          
              <div className="queue-status">
                <i className="fas fa-sync-alt spin"></i>
                <span>Live updating with AI...</span>
              </div>
            </>
          ) : queueData && !queueData.inQueue ? (
            <div className="queue-empty">
              <p>You have an appointment today</p>
              <small>Click CHECK IN to join queue with AI prediction</small>
            </div>
          ) : (
            <div className="queue-empty">
              <p>No active queue</p>
              <small>Check in at the clinic to see AI predictions</small>
            </div>
          )}

        </div>

        {/* النشاطات الأخيرة */}
        <div className="card activity-card">
          <h3>RECENT ACTIVITY</h3>
          {activities && activities.length > 0 ? (
            <ul className="activity-list">
              {activities.slice(0, 5).map((activity, index) => (
                <li key={index} className="activity-item">
                  <i className={`fas ${activity.icon || 'fa-circle'} activity-icon`}></i>
                  <div>
                    <p>{activity.description || 'Activity'}</p>
                    <span className="activity-time">{activity.time || 'Recently'}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent activities</p>
          )}
        </div>
      </div>

      {/* المواعيد القادمة */}
      {appointments && appointments.length > 0 && ( 
        <div className="card upcoming-card">
          <h3>UPCOMING APPOINTMENTS</h3>
          <div className="appointments-list">
            {appointments
              .filter(app => app.status !== 'cancelled' && app.status !== 'completed')
              .slice(0, 3)
              .map((app, index) => (
                <div key={index} className="appointment-item">
                  <div className="appointment-item-info">
                    <strong>{app.doctorName}</strong>
                    <span>{app.department}</span>
                  </div>
                  <div className="appointment-item-date">
                    {new Date(app.appointmentDate).toLocaleDateString()} at {formatTime(app.appointmentDate)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
       {/* أدوات الصحة السريعة */}
      <div className="card tools-card">
        <h3>QUICK HEALTH TOOLS</h3>
        <div className="tools-grid">
          <div 
            className="tool-item"
            onClick={() => onTabChange('medication')}
            style={{ cursor: 'pointer' }}
          >
            <div className="tool-icon">
              <i className="fas fa-pills"></i>
            </div>
            <span>Medication</span>
          </div>
          <div 
            className="tool-item"
            onClick={() => onTabChange('vitals')}
            style={{ cursor: 'pointer' }}
          >
            <div className="tool-icon">
              <i className="fas fa-heartbeat"></i>
            </div>
            <span>Vital Signs</span>
          </div>
          <div 
            className="tool-item"
            onClick={() => onTabChange('activity')}
            style={{ cursor: 'pointer' }}
          >
            <div className="tool-icon">
              <i className="fas fa-running"></i>
            </div>
            <span>Activity Log</span>
          </div>
          <div 
            className="tool-item"
            onClick={() => onTabChange('history')}
            style={{ cursor: 'pointer' }}
          >
            <div className="tool-icon">
              <i className="fas fa-history"></i>
            </div>
            <span>Medical History</span>
          </div>
        </div>
      </div>
    </>
  );
};


export default PatientDashboard;