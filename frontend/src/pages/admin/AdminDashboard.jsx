// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../../styles/theme.css";
import "../../styles/admin-dashboard.css";

// استيراد مكونات الأدمن
import AdminDoctors from './AdminDoctors';
import AdminPatients from './AdminPatients';
import AdminAppointments from './AdminAppointments';
import AdminQueue from './AdminQueue';
import AdminAIModels from './AdminAIModels';
import AdminReports from './AdminReports';
import AdminSettings from './AdminSettings';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminData, setAdminData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.userType !== 'admin') {
      navigate('/login');
      return;
    }
    
    setAdminData(user);
    fetchDashboardData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // جلب إحصائيات لوحة التحكم
      const statsResponse = await fetch('http://localhost:8000/api/admin/dashboard.php', {
        headers: getAuthHeaders()
      });
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setDashboardStats(statsData.stats);
        setRecentActivities(statsData.stats.recentActivities || []);
      }

      // جلب المرضى المعلقين
      const pendingResponse = await fetch('http://localhost:8000/api/admin/patients.php?recent&limit=5', {
        headers: getAuthHeaders()
      });
      const pendingData = await pendingResponse.json();
      
      if (pendingData.success) {
        setPendingPatients(pendingData.patients || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const showNotificationMessage = (type, message) => {
    setNotificationType(type);
    setNotificationMessage(message);
    setShowNotification(true);
    
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // دالة تغيير التبويب
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // دالة لعرض المحتوى حسب التبويب النشط
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return <DashboardContent 
          systemStats={dashboardStats}
          pendingPatients={pendingPatients}
          recentActivities={recentActivities}
          onTabChange={handleTabChange}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          formatTime={formatTime}
        />;
      case 'doctors':
        return <AdminDoctors 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      case 'patients':
        return <AdminPatients 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      case 'appointments':
        return <AdminAppointments 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      case 'queue':
        return <AdminQueue 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      case 'ai-models':
        return <AdminAIModels 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      case 'reports':
        return <AdminReports 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      case 'settings':
        return <AdminSettings 
          adminData={adminData}
          getAuthHeaders={getAuthHeaders}
          showNotification={showNotificationMessage}
        />;
      default:
        return <DashboardContent 
          systemStats={dashboardStats}
          pendingPatients={pendingPatients}
          recentActivities={recentActivities}
          onTabChange={handleTabChange}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          formatTime={formatTime}
        />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard admin-dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <div>
            <h1>ADMIN DASHBOARD</h1>
            <p>Welcome back, {adminData?.name || 'Administrator'}! 👋</p>
          </div>
          <div className="dashboard-actions">
            <button className="notif-btn">
              <i className="fas fa-bell"></i>
              <span className="notif-badge">
                {recentActivities.filter(a => !a.read).length}
              </span>
            </button>
            <div className="admin-search">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder="Quick search..."
              />
            </div>
            <button className="btn btn-outline" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className={`notification-toast ${notificationType}`}>
          <div className="notification-content">
            <i className={`fas fa-${notificationType === 'success' ? 'check-circle' : 
              notificationType === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
            <span>{notificationMessage}</span>
          </div>
          <button className="notification-close" onClick={() => setShowNotification(false)}>×</button>
        </div>
      )}

      <div className="dashboard-content">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="user-profile">
            <div className="user-avatar admin-avatar">
              {adminData?.name?.split(' ').map(n => n[0]).join('') || 'AD'}
            </div>
            <h3>{adminData?.name || 'System Admin'}</h3>
            <p className="user-role">Administrator</p>
            <p className="admin-id">ID: {adminData?.userID || 'AD-001'}</p>
          </div>
          
          <div className="sidebar-menu">
            <button 
              className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              <i className="fas fa-home"></i> Dashboard
            </button>
            <button 
              className={`menu-btn ${activeTab === 'doctors' ? 'active' : ''}`}
              onClick={() => handleTabChange('doctors')}
            >
              <i className="fas fa-user-md"></i> Doctors Management
            </button>
            <button 
              className={`menu-btn ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => handleTabChange('patients')}
            >
              <i className="fas fa-user-friends"></i> Patients Management
              {pendingPatients.length > 0 && (
                <span className="menu-badge">{pendingPatients.length}</span>
              )}
            </button>
            <button 
              className={`menu-btn ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => handleTabChange('appointments')}
            >
              <i className="fas fa-calendar-alt"></i> Appointments
            </button>
            <button 
              className={`menu-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => handleTabChange('queue')}
            >
              <i className="fas fa-users"></i> Queue Monitor
              {dashboardStats?.queue?.total > 0 && (
                <span className="menu-badge">{dashboardStats.queue.total}</span>
              )}
            </button>
            <button 
              className={`menu-btn ${activeTab === 'ai-models' ? 'active' : ''}`}
              onClick={() => handleTabChange('ai-models')}
            >
              <i className="fas fa-robot"></i> AI Models
            </button>
            <button 
              className={`menu-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('reports')}
            >
              <i className="fas fa-chart-line"></i> Reports & Analytics
            </button>
            <button 
              className={`menu-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <i className="fas fa-cogs"></i> System Settings
            </button>
          </div>

          {/* System Status */}
          <div className="system-status-sidebar">
            <h4>SYSTEM STATUS</h4>
            <div className="status-item">
              <span className="status-label">Health:</span>
              <span className="status-value good">
                <i className="fas fa-check-circle"></i> Good
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">AI Models:</span>
              <span className="status-value">
                <i className="fas fa-robot"></i> {dashboardStats?.ai?.uniqueModels || 0} Active
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Queue:</span>
              <span className="status-value">
                <i className="fas fa-users"></i> {dashboardStats?.queue?.waiting || 0} waiting
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-header">
            <h2>{activeTab.toUpperCase()}</h2>
            {loading && <div className="loading-spinner">Loading...</div>}
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ==================== مكون DashboardContent ====================
const DashboardContent = ({ 
  systemStats,
  pendingPatients,
  recentActivities,
  onTabChange,
  formatNumber,
  formatCurrency,
  formatTime
}) => {
  return (
    <>
      <div className="content-header">
        <h2>SYSTEM OVERVIEW</h2>
        <div className="date-display">
          <i className="fas fa-calendar-alt"></i>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(systemStats?.users?.total)}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-trend">
            <i className="fas fa-arrow-up"></i> +12%
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <i className="fas fa-user-md"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(systemStats?.doctors?.total)}</span>
            <span className="stat-label">Doctors</span>
          </div>
          <div className="stat-trend">
            <i className="fas fa-arrow-up"></i> +{systemStats?.doctors?.available || 0} available
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="fas fa-user-injured"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(systemStats?.patients?.total)}</span>
            <span className="stat-label">Patients</span>
          </div>
          <div className="stat-trend">
            <span className="pending-badge">{pendingPatients?.length || 0} new</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(systemStats?.appointments?.total)}</span>
            <span className="stat-label">Appointments</span>
          </div>
          <div className="stat-trend">
            {systemStats?.appointments?.today || 0} today
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{systemStats?.queue?.waiting || 0}</span>
            <span className="stat-label">In Queue</span>
          </div>
          <div className="stat-trend">
            {systemStats?.queue?.inConsultation || 0} in consultation
          </div>
        </div>

        <div className="stat-card accent">
          <div className="stat-icon">
            <i className="fas fa-brain"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{systemStats?.ai?.totalPredictions || 0}</span>
            <span className="stat-label">AI Predictions</span>
          </div>
          <div className="stat-trend">
            {systemStats?.ai?.avgConfidence || 0}% accuracy
          </div>
        </div>
      </div>

      <div className="dashboard-grid admin-view">
        {/* Left Column - Pending Approvals */}
        <div className="left-column">
          <div className="card pending-approvals-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-user-clock"></i>
                RECENT PATIENTS
              </h3>
              <span className="badge warning">{pendingPatients?.length || 0} new</span>
            </div>
            
            <div className="pending-patients-list">
              {pendingPatients?.length > 0 ? (
                pendingPatients.slice(0, 5).map(patient => (
                  <div key={patient.patientID} className="pending-patient-item">
                    <div className="patient-avatar">
                      {patient.initials || patient.fullName?.split(' ').map(n => n[0]).join('') || 'PT'}
                    </div>
                    <div className="patient-info">
                      <h4>{patient.fullName || 'Patient Name'}</h4>
                      <div className="patient-details">
                        <span><i className="fas fa-envelope"></i> {patient.email || 'email@example.com'}</span>
                        <span><i className="fas fa-phone"></i> {patient.phone || 'N/A'}</span>
                      </div>
                      <div className="patient-meta">
                        <span><i className="fas fa-calendar"></i> Registered: {formatTime(patient.createdAt)}</span>
                      </div>
                    </div>
                    <div className="patient-actions">
                      <button 
                        className="btn-icon info" 
                        title="View Details"
                        onClick={() => onTabChange('patients')}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-check-circle"></i>
                  <p>No recent patients</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="card recent-appointments-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-clock"></i>
                UPCOMING APPOINTMENTS
              </h3>
              <button 
                className="btn-icon"
                onClick={() => onTabChange('appointments')}
              >
                <i className="fas fa-external-link-alt"></i>
              </button>
            </div>

            <div className="appointments-preview">
              {systemStats?.upcomingAppointments?.length > 0 ? (
                systemStats.upcomingAppointments.slice(0, 5).map(app => (
                  <div key={app.appointmentID} className="appointment-item">
                    <div className="appointment-time">
                      {new Date(app.appointmentDate).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="appointment-info">
                      <strong>{app.patientName}</strong> with Dr. {app.doctorName}
                    </div>
                    <span className={`status-badge ${app.status}`}>
                      {app.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state small">
                  <i className="fas fa-calendar-check"></i>
                  <p>No upcoming appointments</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Stats and Activities */}
        <div className="right-column">
          {/* Queue Stats Card */}
          <div className="card queue-stats-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-chart-bar"></i>
                QUEUE STATISTICS
              </h3>
            </div>

            <div className="queue-stats-grid">
              <div className="stat-item">
                <span className="stat-value">{systemStats?.queue?.waiting || 0}</span>
                <span className="stat-label">Waiting</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{systemStats?.queue?.inConsultation || 0}</span>
                <span className="stat-label">In Consultation</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{systemStats?.queue?.emergency || 0}</span>
                <span className="stat-label">Emergency</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{systemStats?.queue?.avgWaitTime || 0} min</span>
                <span className="stat-label">Avg Wait</span>
              </div>
            </div>
          </div>

          {/* Top Doctors Card */}
          <div className="card top-doctors-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-star"></i>
                DOCTORS BY SPECIALTY
              </h3>
            </div>

            <div className="top-doctors-list">
              {systemStats?.doctorSpecialties?.map((item, index) => (
                <div key={index} className="top-doctor-item">
                  <span className="doctor-rank">{index + 1}</span>
                  <span className="doctor-specialty">{item.specialization}</span>
                  <span className="doctor-count">{item.count} doctors</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities Card */}
          <div className="card activities-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-history"></i>
                RECENT ACTIVITIES
              </h3>
            </div>

            <div className="activities-list">
              {recentActivities?.length > 0 ? (
                recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className={`activity-icon ${activity.actionType}`}>
                      <i className={`fas fa-${activity.actionType === 'appointment_booking' ? 'calendar-plus' : 
                        activity.actionType === 'login' ? 'sign-in-alt' : 
                        activity.actionType === 'gps_checkin' ? 'map-marker-alt' : 'circle'}`}></i>
                    </div>
                    <div className="activity-content">
                      <p className="activity-description">{activity.actionDescription || activity.actionType}</p>
                      <span className="activity-time">{formatTime(activity.logTime)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state small">
                  <i className="fas fa-history"></i>
                  <p>No recent activities</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card quick-actions-card">
            <h3>
              <i className="fas fa-bolt"></i>
              QUICK ACTIONS
            </h3>
            <div className="quick-actions-grid">
              <button 
                className="quick-action-btn"
                onClick={() => onTabChange('doctors')}
              >
                <i className="fas fa-user-md"></i>
                <span>Add Doctor</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => onTabChange('patients')}
              >
                <i className="fas fa-user-plus"></i>
                <span>Add Patient</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => onTabChange('appointments')}
              >
                <i className="fas fa-calendar-plus"></i>
                <span>Create Appointment</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => onTabChange('reports')}
              >
                <i className="fas fa-file-export"></i>
                <span>Generate Report</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => onTabChange('ai-models')}
              >
                <i className="fas fa-robot"></i>
                <span>AI Models</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => onTabChange('settings')}
              >
                <i className="fas fa-cog"></i>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;