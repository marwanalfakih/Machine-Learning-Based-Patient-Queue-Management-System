import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../../styles/theme.css";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <div>
            <h1>SMART HEALTHCARE SYSTEM</h1>
            <p>Welcome back, Dhai! 👋</p>
          </div>
          <div className="dashboard-actions">
            <button className="notif-btn">
              <i className="fas fa-bell"></i>
              <span className="notif-badge">3</span>
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
            <div className="user-avatar">DK</div>
            <h3>Dhai Khaled</h3>
            <p className="user-role">Patient ID: P-78921</p>
          </div>
          
          <div className="sidebar-menu">
            <button 
              className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-home"></i> Dashboard
            </button>
            <button 
              className={`menu-btn ${activeTab === 'appointment' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointment')}
            >
              <i className="fas fa-calendar-plus"></i> Book Appointment
            </button>
            <button className="menu-btn">
              <i className="fas fa-file-medical"></i> View Records
            </button>
            <button className="menu-btn">
              <i className="fas fa-robot"></i> AI Help
            </button>
            <button className="menu-btn">
              <i className="fas fa-pills"></i> Medication
            </button>
            <button className="menu-btn">
              <i className="fas fa-heartbeat"></i> Vital Signs
            </button>
            <button className="menu-btn">
              <i className="fas fa-running"></i> Activity Log
            </button>
            <button className="menu-btn">
              <i className="fas fa-history"></i> Medical History
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {activeTab === 'dashboard' ? (
            <>
              {/* Welcome Header */}
              <div className="content-header">
                <h2>Welcome back, Dhai! 👋</h2>
                <div className="quick-actions">
                  <button className="btn btn-primary">
                    <i className="fas fa-calendar-plus"></i> Book Appointment
                  </button>
                  <button className="btn btn-secondary">
                    <i className="fas fa-file-medical"></i> View Records
                  </button>
                  <button className="btn btn-secondary">
                    <i className="fas fa-robot"></i> AI Help
                  </button>
                </div>
              </div>

              {/* Today's Appointment Card */}
              <div className="card appointment-card">
                <div className="card-header">
                  <h3>TODAY'S APPOINTMENT</h3>
                  <span className="status-badge">Upcoming</span>
                </div>
                <div className="appointment-details">
                  <div className="doctor-info">
                    <div className="doctor-avatar">SA</div>
                    <div>
                      <h4>Dr. Sarah Ahmed</h4>
                      <p className="department">Cardiology Department</p>
                      <p className="time">
                        <i className="fas fa-clock"></i> 10:30 AM • Routine Checkup
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-primary gps-checkin">
                    <i className="fas fa-map-marker-alt"></i> CHECK IN VIA GPS
                  </button>
                </div>
              </div>

              {/* Quick Health Tools */}
              <div className="card tools-card">
                <h3>QUICK HEALTH TOOLS</h3>
                <div className="tools-grid">
                  <div className="tool-item">
                    <div className="tool-icon">
                      <i className="fas fa-pills"></i>
                    </div>
                    <span>Medication Tracker</span>
                  </div>
                  <div className="tool-item">
                    <div className="tool-icon">
                      <i className="fas fa-heartbeat"></i>
                    </div>
                    <span>Vital Signs</span>
                  </div>
                  <div className="tool-item">
                    <div className="tool-icon">
                      <i className="fas fa-running"></i>
                    </div>
                    <span>Activity Log</span>
                  </div>
                  <div className="tool-item">
                    <div className="tool-icon">
                      <i className="fas fa-history"></i>
                    </div>
                    <span>Medical History</span>
                  </div>
                </div>
              </div>

              {/* Two Columns Layout */}
              <div className="dashboard-grid">
                {/* Real-time Queue */}
                <div className="card queue-card">
                  <h3>REAL-TIME QUEUE</h3>
                  <div className="queue-info">
                    <div className="queue-stat">
                      <span className="stat-value">#3</span>
                      <span className="stat-label">Your Position</span>
                    </div>
                    <div className="queue-stat">
                      <span className="stat-value">15m</span>
                      <span className="stat-label">Estimated Wait</span>
                    </div>
                    <div className="queue-stat">
                      <span className="stat-value">5</span>
                      <span className="stat-label">Patients Ahead</span>
                    </div>
                  </div>
                  <div className="queue-status">
                    <i className="fas fa-sync-alt spin"></i>
                    <span>Live updating...</span>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card activity-card">
                  <h3>RECENT ACTIVITY</h3>
                  <ul className="activity-list">
                    <li className="activity-item">
                      <i className="fas fa-vial activity-icon lab"></i>
                      <div>
                        <p>Lab results ready</p>
                        <span className="activity-time">2 hours ago</span>
                      </div>
                    </li>
                    <li className="activity-item">
                      <i className="fas fa-calendar-check activity-icon appointment"></i>
                      <div>
                        <p>Appointment confirmed</p>
                        <span className="activity-time">Yesterday</span>
                      </div>
                    </li>
                    <li className="activity-item">
                      <i className="fas fa-prescription activity-icon prescription"></i>
                      <div>
                        <p>Prescription renewed</p>
                        <span className="activity-time">3 days ago</span>
                      </div>
                    </li>
                    <li className="activity-item">
                      <i className="fas fa-robot activity-icon ai"></i>
                      <div>
                        <p>AI consultation</p>
                        <span className="activity-time">1 week ago</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            /* Book Appointment Page */
            <div className="appointment-booking">
              <div className="content-header">
                <h2>BOOK APPOINTMENT</h2>
              </div>

              <div className="booking-steps">
                <div className="step active">
                  <span className="step-number">1</span>
                  <span className="step-label">Select Department</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span className="step-label">Choose Doctor</span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span className="step-label">Confirm Booking</span>
                </div>
              </div>

              <div className="card departments-card">
                <h3>Select Department/Specialty</h3>
                <div className="departments-grid">
                  {['Cardiology', 'Neurology', 'Pulmonology', 'Pediatrics', 'Internal Medicine', 'Ophthalmology', 'Dentistry'].map((dept, index) => (
                    <button key={index} className="department-btn">
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="doctors-list">
                <h3>Available Doctors</h3>
                
                <div className="doctor-card">
                  <div className="doctor-header">
                    <div className="doctor-avatar-large">SA</div>
                    <div className="doctor-info">
                      <h4>Dr. Sarah Ahmed</h4>
                      <div className="rating">
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="far fa-star"></i>
                        <span>(124 reviews)</span>
                      </div>
                      <p className="specialty">Cardiology Specialist • 10 years experience</p>
                      <p className="availability">
                        <i className="fas fa-calendar-alt"></i> Available: Mon, Wed, Fri • 9:00 AM - 4:00 PM
                      </p>
                      <p className="fee">
                        <i className="fas fa-money-bill-wave"></i> Consultation Fee: $50
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-outline">View Profile</button>
                </div>

                <div className="doctor-card">
                  <div className="doctor-header">
                    <div className="doctor-avatar-large">MC</div>
                    <div className="doctor-info">
                      <h4>Dr. Michael Chen</h4>
                      <div className="rating">
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="far fa-star"></i>
                        <span>(98 reviews)</span>
                      </div>
                      <p className="specialty">Cardiology Specialist • 8 years experience</p>
                      <p className="availability">
                        <i className="fas fa-calendar-alt"></i> Available: Tue, Thu, Sat • 10:00 AM - 5:00 PM
                      </p>
                      <p className="fee">
                        <i className="fas fa-money-bill-wave"></i> Consultation Fee: $45
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-outline">View Profile</button>
                </div>

                <div className="booking-summary">
                  <h4>Appointment Summary</h4>
                  <div className="summary-details">
                    <p>Dr. Sarah Ahmed • 3:00 PM • $50</p>
                  </div>
                  <button className="btn btn-primary confirm-btn">
                    CONFIRM APPOINTMENT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;