import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../../styles/theme.css";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const appointments = [
    { time: '8:00 AM', patient: 'Alice Johnson', status: 'Completed' },
    { time: '8:30 AM', patient: 'Bob Wilson', status: 'Completed' },
    { time: '9:00 AM', patient: 'Carol Brown', status: 'Completed' },
    { time: '9:30 AM', patient: 'David Lee', status: 'Completed' },
    { time: '10:00 AM', patient: 'Emma Davis', status: 'Completed' },
    { time: '10:30 AM', patient: 'Frank Miller', status: 'Completed' },
    { time: '11:00 AM', patient: 'Grace Taylor', status: 'Completed' },
    { time: '11:30 AM', patient: 'Henry Anderson', status: 'In Progress' },
    { time: '12:00 PM', patient: 'Dhai Khaled', status: 'Waiting' },
    { time: '12:30 PM', patient: 'John Smith', status: 'Waiting' },
    { time: '1:00 PM', patient: 'Jane Doe', status: 'Waiting' },
  ];

  return (
    <div className="dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <div>
            <h1>DOCTOR DASHBOARD</h1>
            <p>Dr. Sarah Ahmed • Cardiology Specialist</p>
          </div>
          <div className="dashboard-actions">
            <button className="notif-btn">
              <i className="fas fa-bell"></i>
              <span className="notif-badge">5</span>
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="user-profile">
            <div className="user-avatar">SA</div>
            <h3>Dr. Sarah Ahmed</h3>
            <p className="user-role">Cardiology Specialist</p>
          </div>
          
          <div className="sidebar-menu">
            <button 
              className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-home"></i> Dashboard
            </button>
            <button className="menu-btn">
              <i className="fas fa-user-friends"></i> Patients
            </button>
            <button className="menu-btn">
              <i className="fas fa-calendar-alt"></i> Schedule
            </button>
            <button className="menu-btn">
              <i className="fas fa-chart-line"></i> Analytics
            </button>
            <button className="menu-btn">
              <i className="fas fa-file-medical"></i> Medical Records
            </button>
            <button className="menu-btn">
              <i className="fas fa-prescription"></i> Prescriptions
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-header">
            <h2>TODAY'S APPOINTMENTS</h2>
            <div className="quick-stats">
              <button className="btn btn-primary">
                <i className="fas fa-plus"></i> Add Appointment
              </button>
            </div>
          </div>

          <div className="dashboard-grid doctor-view">
            {/* Today's Appointments List */}
            <div className="card appointments-list">
              <h3>TODAY'S APPOINTMENTS</h3>
              <div className="appointments-timeline">
                {appointments.map((apt, index) => (
                  <div 
                    key={index} 
                    className={`appointment-item ${apt.status.toLowerCase().replace(' ', '-')}`}
                  >
                    <span className="appointment-time">{apt.time}</span>
                    <span className="appointment-patient">{apt.patient}</span>
                    <span className={`status-badge ${apt.status.toLowerCase().replace(' ', '-')}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Statistics */}
            <div className="card statistics-card">
              <h3>CURRENT STATISTICS</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">12</span>
                  <span className="stat-label">Patients Today</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">8</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">1</span>
                  <span className="stat-label">In Progress</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">3</span>
                  <span className="stat-label">Waiting</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">18m</span>
                  <span className="stat-label">Avg. Wait Time</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">$600</span>
                  <span className="stat-label">Revenue</span>
                </div>
              </div>
            </div>

            {/* Current Patient Details */}
            <div className="card current-patient-card">
              <div className="card-header">
                <h3>CURRENT PATIENT: DHAI KHALED</h3>
                <span className="queue-number">#4 in queue</span>
              </div>
              
              <div className="patient-info-section">
                <h4>Patient Information</h4>
                <div className="patient-details">
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">Dhai Khaled • 35 years • Female</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Appointment:</span>
                    <span className="detail-value">Routine Checkup</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value gps-checked">
                      <i className="fas fa-map-marker-alt"></i> Checked in via GPS • 1:55 PM
                    </span>
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
                    <li>No known allergies</li>
                    <li>Last visit: 3 months ago</li>
                  </ul>
                </div>
              </div>

              <div className="patient-info-section">
                <h4>Documents</h4>
                <div className="documents-list">
                  <button className="document-btn">
                    <i className="fas fa-file-medical"></i> Blood Test Results
                  </button>
                  <button className="document-btn">
                    <i className="fas fa-heartbeat"></i> ECG Report
                  </button>
                  <button className="document-btn">
                    <i className="fas fa-file-contract"></i> Previous Consultation
                  </button>
                </div>
              </div>

              <div className="doctor-actions">
                <button className="btn btn-primary action-btn">
                  <i className="fas fa-play-circle"></i> Start Consultation
                </button>
                <button className="btn btn-secondary action-btn">
                  <i className="fas fa-history"></i> View Full History
                </button>
                <button className="btn btn-outline action-btn">
                  <i className="fas fa-edit"></i> Add Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;