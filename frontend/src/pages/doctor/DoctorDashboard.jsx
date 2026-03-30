// src/pages/doctor/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../../styles/theme.css";
import "../../styles/doctor-dashboard.css";

// استيراد المكونات الفرعية
import DoctorPatients from './DoctorPatients';
import DoctorSchedule from './DoctorSchedule';
import DoctorAnalytics from './DoctorAnalytics';
import DoctorMedicalRecords from './DoctorMedicalRecords';
import DoctorPrescriptions from './DoctorPrescriptions';
import DoctorQueue from './DoctorQueue'; // إضافة مكون جديد

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctorData, setDoctorData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [queuePatients, setQueuePatients] = useState([]); // قائمة الانتظار
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalToday: 0,
    completed: 0,
    inProgress: 0,
    waiting: 0,
    avgWaitTime: 0,
    revenue: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDoctorData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات الطبيب
      const profileResponse = await fetch('http://localhost:8000/api/doctor/profile.php', {
        headers: getAuthHeaders()
      });
      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        setDoctorData(profileData.data.doctor);
        
        // جلب مواعيد اليوم
        const today = new Date().toISOString().split('T')[0];
        const appointmentsResponse = await fetch(`http://localhost:8000/api/doctor/appointments.php?date=${today}`, {
          headers: getAuthHeaders()
        });
        const appointmentsData = await appointmentsResponse.json();
        
        if (appointmentsData.success) {
          const todayAppointments = appointmentsData.data || [];
          setAppointments(todayAppointments);
          
          // جلب قائمة الانتظار
          fetchQueueData();
          
          // حساب الإحصائيات
          calculateStats(todayAppointments);
          
          // تحديد المريض الحالي (الموعد الذي حالته in-progress)
          const current = todayAppointments.find(app => app.status === 'in-progress');
          if (current) {
            fetchPatientDetails(current.patientID);
          }
        }
      } else {
        setError('Failed to load doctor data');
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // دالة جديدة لجلب بيانات قائمة الانتظار
  const fetchQueueData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/doctor/queue.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setQueuePatients(data.queue || []);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
    }
  };

  const fetchPatientDetails = async (patientId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/doctor/patient-details.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentPatient(data.patient);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
    }
  };

  const calculateStats = (appointments) => {
    const completed = appointments.filter(app => app.status === 'completed').length;
    const inProgress = appointments.filter(app => app.status === 'in-progress').length;
    const waiting = appointments.filter(app => app.status === 'waiting' || app.status === 'checked-in').length;
    
    // حساب متوسط وقت الانتظار (بالدقائق)
    const waitingTimes = appointments
      .filter(app => app.actualWaitTime)
      .map(app => app.actualWaitTime);
    
    const avgWait = waitingTimes.length > 0 
      ? Math.round(waitingTimes.reduce((a, b) => a + b, 0) / waitingTimes.length) 
      : 0;
    
    // حساب الإيرادات (افتراضي 50$ لكل موعد مكتمل)
    const revenue = completed * 50;

    setStats({
      totalToday: appointments.length,
      completed,
      inProgress,
      waiting,
      avgWaitTime: avgWait,
      revenue
    });
  };

  const handleStartConsultation = async (appointmentId) => {
    try {
      const response = await fetch('http://localhost:8000/api/doctor/appointments.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update-status',
          appointmentID: appointmentId,
          status: 'in-progress'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // تحديث قائمة المواعيد
        setAppointments(prev => prev.map(app => 
          app.appointmentID === appointmentId 
            ? { ...app, status: 'in-progress' } 
            : app
        ));
        
        // تحديث قائمة الانتظار
        setQueuePatients(prev => prev.filter(p => p.appointmentID !== appointmentId));
        
        // جلب تفاصيل المريض
        const currentAppointment = appointments.find(app => app.appointmentID === appointmentId);
        if (currentAppointment) {
          fetchPatientDetails(currentAppointment.patientID);
        }
        
        // إعادة حساب الإحصائيات
        calculateStats(appointments.map(app => 
          app.appointmentID === appointmentId ? { ...app, status: 'in-progress' } : app
        ));
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
    }
  };

  const handleCompleteConsultation = async (appointmentId) => {
    try {
      const response = await fetch('http://localhost:8000/api/doctor/appointments.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update-status',
          appointmentID: appointmentId,
          status: 'completed'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // تحديث قائمة المواعيد
        setAppointments(prev => prev.map(app => 
          app.appointmentID === appointmentId 
            ? { ...app, status: 'completed' } 
            : app
        ));
        
        setCurrentPatient(null);
        
        // جلب المريض التالي من قائمة الانتظار إذا وجد
        if (queuePatients.length > 0) {
          const nextPatient = queuePatients[0];
          handleStartConsultation(nextPatient.appointmentID);
        }
        
        // إعادة حساب الإحصائيات
        calculateStats(appointments.map(app => 
          app.appointmentID === appointmentId ? { ...app, status: 'completed' } : app
        ));
        
        // تحديث قائمة الانتظار
        fetchQueueData();
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
    }
  };

  // دالة لتحديث ترتيب قائمة الانتظار
  const handleUpdateQueueOrder = async (newQueueOrder) => {
    try {
      const response = await fetch('http://localhost:8000/api/doctor/queue.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update-order',
          queue: newQueueOrder
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQueuePatients(newQueueOrder);
      }
    } catch (error) {
      console.error('Error updating queue order:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'in-progress': return 'in-progress';
      case 'waiting': return 'waiting';
      case 'checked-in': return 'checked-in';
      default: return '';
    }
  };

  // دالة تغيير التبويب
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // محتوى بناءً على التبويب النشط
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent 
          doctorData={doctorData}
          appointments={appointments}
          currentPatient={currentPatient}
          queuePatients={queuePatients}
          stats={stats}
          onStartConsultation={handleStartConsultation}
          onCompleteConsultation={handleCompleteConsultation}
          formatTime={formatTime}
          getStatusBadgeClass={getStatusBadgeClass}
          fetchPatientDetails={fetchPatientDetails}
        />;
      case 'patients':
        return <DoctorPatients 
          doctorData={doctorData}
          getAuthHeaders={getAuthHeaders}
        />;
      case 'schedule':
        return <DoctorSchedule 
          doctorData={doctorData}
          getAuthHeaders={getAuthHeaders}
        />;
      case 'analytics':
        return <DoctorAnalytics 
          doctorData={doctorData}
          getAuthHeaders={getAuthHeaders}
        />;
      case 'records':
        return <DoctorMedicalRecords 
          doctorData={doctorData}
          getAuthHeaders={getAuthHeaders}
        />;
      case 'prescriptions':
        return <DoctorPrescriptions 
          doctorData={doctorData}
          getAuthHeaders={getAuthHeaders}
        />;
      case 'queue': // تبويب جديد لإدارة قائمة الانتظار
        return <DoctorQueue 
          doctorData={doctorData}
          queuePatients={queuePatients}
          onUpdateQueueOrder={handleUpdateQueueOrder}
          onStartConsultation={handleStartConsultation}
          getAuthHeaders={getAuthHeaders}
        />;
      default:
        return <DashboardContent 
          doctorData={doctorData}
          appointments={appointments}
          currentPatient={currentPatient}
          queuePatients={queuePatients}
          stats={stats}
          onStartConsultation={handleStartConsultation}
          onCompleteConsultation={handleCompleteConsultation}
          formatTime={formatTime}
          getStatusBadgeClass={getStatusBadgeClass}
          fetchPatientDetails={fetchPatientDetails}
        />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading doctor dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchDoctorData} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard doctor-dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <div>
            <h1>DOCTOR DASHBOARD</h1>
            <p>Dr. {doctorData?.fullName || 'Doctor'} • {doctorData?.specialization || 'Specialist'}</p>
          </div>
          <div className="dashboard-actions">
            <button className="notif-btn">
              <i className="fas fa-bell"></i>
              <span className="notif-badge">
                {appointments.filter(a => a.status === 'waiting').length}
              </span>
            </button>
            <button className="btn btn-outline" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="user-profile">
            <div className="user-avatar">
              {doctorData?.fullName?.split(' ').map(n => n[0]).join('') || 'DR'}
            </div>
            <h3>Dr. {doctorData?.fullName || 'Doctor'}</h3>
            <p className="user-role">{doctorData?.specialization || 'Specialist'}</p>
            <p className="doctor-id">ID: {doctorData?.doctorID || 'N/A'}</p>
          </div>
          
          <div className="sidebar-menu">
            <button 
              className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              <i className="fas fa-home"></i> Dashboard
            </button>
            <button 
              className={`menu-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => handleTabChange('queue')}
            >
              <i className="fas fa-users"></i> Queue Management
              {queuePatients.length > 0 && (
                <span className="menu-badge">{queuePatients.length}</span>
              )}
            </button>
            <button 
              className={`menu-btn ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => handleTabChange('patients')}
            >
              <i className="fas fa-user-friends"></i> Patients
            </button>
            <button 
              className={`menu-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => handleTabChange('schedule')}
            >
              <i className="fas fa-calendar-alt"></i> Schedule
            </button>
            <button 
              className={`menu-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => handleTabChange('analytics')}
            >
              <i className="fas fa-chart-line"></i> Analytics
            </button>
            <button 
              className={`menu-btn ${activeTab === 'records' ? 'active' : ''}`}
              onClick={() => handleTabChange('records')}
            >
              <i className="fas fa-file-medical"></i> Medical Records
            </button>
            <button 
              className={`menu-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
              onClick={() => handleTabChange('prescriptions')}
            >
              <i className="fas fa-prescription"></i> Prescriptions
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ==================== مكون DashboardContent ====================
const DashboardContent = ({ 
  doctorData,
  appointments,
  currentPatient,
  queuePatients,
  stats,
  onStartConsultation,
  onCompleteConsultation,
  formatTime,
  getStatusBadgeClass,
  fetchPatientDetails
}) => {
  return (
    <>
      <div className="content-header">
        <h2>TODAY'S APPOINTMENTS & QUEUE</h2>
        <div className="quick-stats">
          <span className="date-badge">
            <i className="fas fa-calendar-day"></i> {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="queue-badge">
            <i className="fas fa-users"></i> Queue: {queuePatients.length}
          </span>
        </div>
      </div>

      <div className="dashboard-grid doctor-view">
        {/* Current Patient Section - كامل العرض */}
        <div className="card current-patient-card full-width">
          {currentPatient ? (
            <>
              <div className="card-header">
                <h3>
                  <i className="fas fa-user-md"></i> 
                  CURRENT PATIENT: {currentPatient.fullName?.toUpperCase()} 
                  {appointments.find(a => a.status === 'in-progress') && (
                    <span className="queue-position">
                      #{appointments.find(a => a.status === 'in-progress').queuePosition || '1'} in queue
                    </span>
                  )}
                </h3>
                <span className="check-in-time">
                  <i className="fas fa-clock"></i> Checked in: {formatTime(appointments.find(a => a.status === 'in-progress')?.checkInTime)} • 1:55 PM
                </span>
              </div>
              
              <div className="patient-info-grid">
                <div className="patient-info-section">
                  <h4>Patient Information</h4>
                  <div className="patient-details">
                    <div className="detail-row">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">
                        {currentPatient.fullName} • {currentPatient.age || '35'} years • {currentPatient.gender || 'Female'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Appointment:</span>
                      <span className="detail-value">Routine Checkup</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Check-in:</span>
                      <span className="detail-value">Via GPS • 1:55 PM</span>
                    </div>
                  </div>
                </div>

                <div className="patient-info-section">
                  <h4>Medical History</h4>
                  <div className="medical-history">
                    <ul>
                      <li>Hypertension diagnosed 2019</li>
                      <li>Mild asthma</li>
                      <li>Regular medication: Lisinopril 10mg</li>
                    </ul>
                  </div>
                </div>

                <div className="patient-info-section">
                  <h4>Allergies & Last Visit</h4>
                  <div className="allergies">
                    <span className="no-allergies">No known allergies</span>
                    <p className="last-visit">Last visit: 3 months ago</p>
                  </div>
                </div>

                <div className="patient-info-section">
                  <h4>Documents</h4>
                  <div className="documents-list">
                    <span className="document-badge">
                      <i className="fas fa-file-medical"></i> Blood Test Results
                    </span>
                    <span className="document-badge">
                      <i className="fas fa-heartbeat"></i> ECG Report
                    </span>
                    <span className="document-badge">
                      <i className="fas fa-notes-medical"></i> Previous Consultation
                    </span>
                  </div>
                </div>
              </div>

              <div className="doctor-actions">
                <button 
                  className="btn btn-primary action-btn"
                  onClick={() => onCompleteConsultation(appointments.find(a => a.status === 'in-progress')?.appointmentID)}
                >
                  <i className="fas fa-check-circle"></i> Complete Consultation
                </button>
                <button className="btn btn-secondary action-btn">
                  <i className="fas fa-history"></i> View Full History
                </button>
                <button className="btn btn-outline action-btn">
                  <i className="fas fa-edit"></i> Add Notes
                </button>
              </div>
            </>
          ) : (
            <div className="no-patient-selected">
              <i className="fas fa-user-clock"></i>
              <h3>No Patient in Consultation</h3>
              <p>Click on a waiting appointment to start consultation</p>
            </div>
          )}
        </div>

        {/* Queue and Appointments Grid - صفين */}
        <div className="queue-appointments-grid">
          {/* Queue List */}
          <div className="card queue-list">
            <h3>
              <i className="fas fa-users"></i> PATIENTS IN QUEUE ({queuePatients.length})
            </h3>
            <div className="queue-items">
              {queuePatients.length > 0 ? (
                queuePatients.map((patient, index) => (
                  <div key={patient.appointmentID || index} className="queue-item">
                    <span className="queue-number">#{index + 1}</span>
                    <div className="queue-patient-info">
                      <span className="patient-name">{patient.patientName || 'Patient Name'}</span>
                      <span className="patient-details">
                        {patient.age || '35'} years • {patient.gender || 'Female'}
                      </span>
                      <span className="appointment-type">Routine Checkup</span>
                    </div>
                    <div className="queue-status">
                      <span className={`status-badge ${getStatusBadgeClass(patient.status)}`}>
                        {patient.status === 'checked-in' ? 'Checked In' : patient.status}
                      </span>
                      <span className="check-in-time">
                        <i className="fas fa-clock"></i> {formatTime(patient.checkInTime) || '1:55 PM'}
                      </span>
                    </div>
                    <button 
                      className="btn-start-consultation"
                      onClick={() => onStartConsultation(patient.appointmentID)}
                      title="Start Consultation"
                    >
                      <i className="fas fa-play"></i>
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-queue">
                  <i className="fas fa-user-check"></i>
                  <p>No patients in queue</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Appointments List */}
          <div className="card appointments-list">
            <h3>
              <i className="fas fa-calendar-check"></i> TODAY'S APPOINTMENTS ({appointments.length})
            </h3>
            <div className="appointments-timeline">
              {appointments.length > 0 ? (
                appointments.map((apt, index) => (
                  <div 
                    key={apt.appointmentID || index} 
                    className={`appointment-item ${getStatusBadgeClass(apt.status)}`}
                    onClick={() => apt.status === 'waiting' && onStartConsultation(apt.appointmentID)}
                    style={apt.status === 'waiting' ? { cursor: 'pointer' } : {}}
                  >
                    <span className="appointment-time">
                      <i className="far fa-clock"></i> {formatTime(apt.appointmentDate) || '2:00 PM'}
                    </span>
                    <span className="appointment-patient">{apt.patientName || 'Patient'}</span>
                    <span className={`status-badge ${getStatusBadgeClass(apt.status)}`}>
                      {apt.status === 'checked-in' ? 'Checked In' : apt.status}
                    </span>
                    {apt.status === 'waiting' && (
                      <span className="start-icon" title="Click to start consultation">
                        <i className="fas fa-play-circle"></i>
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-appointments">
                  <i className="fas fa-calendar-check"></i>
                  <p>No appointments scheduled for today</p>
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="appointments-actions">
              <button className="btn btn-outline btn-sm">
                <i className="fas fa-user-plus"></i> Add Patient
              </button>
              <button className="btn btn-outline btn-sm">
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="card statistics-card">
            <h3>
              <i className="fas fa-chart-pie"></i> CURRENT STATISTICS
            </h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.totalToday}</span>
                <span className="stat-label">Total Today</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.completed}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.inProgress}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.waiting}</span>
                <span className="stat-label">Waiting</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.avgWaitTime}m</span>
                <span className="stat-label">Avg. Wait</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">${stats.revenue}</span>
                <span className="stat-label">Revenue</span>
              </div>
            </div>
          </div>

          {/* Next Patient Card */}
          {queuePatients.length > 0 && (
            <div className="card next-patient-card">
              <h4>
                <i className="fas fa-arrow-right"></i> NEXT IN QUEUE
              </h4>
              <div className="next-patient-info">
                <span className="next-patient-name">{queuePatients[0].patientName || 'Patient'}</span>
                <span className="next-patient-time">Est. wait: {stats.avgWaitTime}m</span>
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => onStartConsultation(queuePatients[0].appointmentID)}
              >
                <i className="fas fa-play"></i> Start Now
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DoctorDashboard;