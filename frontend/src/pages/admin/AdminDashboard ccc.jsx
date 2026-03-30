import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../../styles/theme.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingPatients, setPendingPatients] = useState([
    { id: 1, name: 'Mohammed Ahmed', email: 'mohamed@example.com', phone: '0501234567', registrationDate: '2024-03-15', status: 'pending' },
    { id: 2, name: 'Fatima Khalid', email: 'fatima@example.com', phone: '0559876543', registrationDate: '2024-03-16', status: 'pending' },
    { id: 3, name: 'Abdullah Saud', email: 'abdullah@example.com', phone: '0541122334', registrationDate: '2024-03-14', status: 'pending' },
    { id: 4, name: 'Noura Mohammed', email: 'noura@example.com', phone: '0564455667', registrationDate: '2024-03-17', status: 'pending' },
  ]);

  const [approvedPatients, setApprovedPatients] = useState([
    { id: 5, name: 'Sara Ali', email: 'sara@example.com', phone: '0513344556', registrationDate: '2024-03-10', status: 'approved', approvedDate: '2024-03-12' },
    { id: 6, name: 'Khalid Hassan', email: 'khaled@example.com', phone: '0537788990', registrationDate: '2024-03-08', status: 'approved', approvedDate: '2024-03-09' },
  ]);

  const systemStats = {
    totalUsers: 156,
    pendingApprovals: 4,
    doctorsCount: 24,
    appointmentsToday: 42,
    revenueThisMonth: '$15,800',
    systemHealth: 'Good'
  };

  const recentActivities = [
    { id: 1, user: 'Dr. Ahmed', action: 'Added new appointment', time: '5 minutes ago' },
    { id: 2, user: 'Patient Sara', action: 'Registered in system', time: '1 hour ago' },
    { id: 3, user: 'Admin', action: 'Approved new patient', time: '3 hours ago' },
    { id: 4, user: 'Dr. Fatima', action: 'Updated medical records', time: '5 hours ago' },
  ];

  const handleApprovePatient = (patientId) => {
    const patientIndex = pendingPatients.findIndex(p => p.id === patientId);
    if (patientIndex !== -1) {
      const patientToApprove = pendingPatients[patientIndex];
      const updatedPatient = {
        ...patientToApprove,
        status: 'approved',
        approvedDate: new Date().toISOString().split('T')[0]
      };

      setPendingPatients(prev => prev.filter(p => p.id !== patientId));
      setApprovedPatients(prev => [updatedPatient, ...prev]);
      console.log(`Patient approved: ${patientToApprove.name}`);
    }
  };

  const handleRejectPatient = (patientId) => {
    const patientIndex = pendingPatients.findIndex(p => p.id === patientId);
    if (patientIndex !== -1) {
      const patientName = pendingPatients[patientIndex].name;
      if (window.confirm(`Are you sure you want to reject ${patientName}'s registration request?`)) {
        setPendingPatients(prev => prev.filter(p => p.id !== patientId));
        console.log(`Patient rejected: ${patientName}`);
      }
    }
  };

  const filteredPendingPatients = pendingPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  return (
    <div className="dashboard admin-dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <div>
            <h1>ADMIN DASHBOARD</h1>
            <p>System Administrator • Smart Healthcare System</p>
          </div>
          <div className="dashboard-actions">
            <button className="notif-btn">
              <i className="fas fa-bell"></i>
              <span className="notif-badge">{pendingPatients.length}</span>
            </button>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search"></i>
            </div>
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
            <div className="user-avatar admin-avatar">A</div>
            <h3>System Admin</h3>
            <p className="user-role">System Manager</p>
          </div>
          
          <div className="sidebar-menu">
            <button 
              className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-home"></i> Dashboard
            </button>
            <button 
              className={`menu-btn ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <i className="fas fa-user-check"></i> Patient Approvals
              {pendingPatients.length > 0 && (
                <span className="menu-badge">{pendingPatients.length}</span>
              )}
            </button>
            <button className="menu-btn">
              <i className="fas fa-user-friends"></i> User Management
            </button>
            <button className="menu-btn">
              <i className="fas fa-user-md"></i> Doctors
            </button>
            <button className="menu-btn">
              <i className="fas fa-calendar-alt"></i> Schedule
            </button>
            <button className="menu-btn">
              <i className="fas fa-chart-line"></i> Reports & Analytics
            </button>
            <button className="menu-btn">
              <i className="fas fa-cogs"></i> System Settings
            </button>
          </div>
        </div>
 
        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-header">
            <h2>MAIN DASHBOARD</h2>
            <div className="quick-stats">
              <div className="stat-card quick-stat">
                <span className="stat-value">{systemStats.pendingApprovals}</span>
                <span className="stat-label">Pending Approvals</span>
              </div>
              <div className="stat-card quick-stat">
                <span className="stat-value">{systemStats.totalUsers}</span>
                <span className="stat-label">Total Users</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid admin-view">
            {/* New Layout: Left Column - Wider for Patients */}
            <div className="left-column">
              {/* Pending Approvals Card - Now Wider */}
              <div className="card approvals-card">
                <div className="card-header">
                  <h3>NEW PATIENTS AWAITING APPROVAL</h3>
                  <span className="badge warning">{pendingPatients.length} requests</span>
                </div>
                
                <div className="patients-list">
                  {filteredPendingPatients.length > 0 ? (
                    filteredPendingPatients.map(patient => (
                      <div key={patient.id} className="patient-item pending">
                        <div className="patient-info">
                          <div className="patient-avatar">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="patient-details">
                            <h4>{patient.name}</h4>
                            <p className="patient-contact">
                              <i className="fas fa-envelope"></i> {patient.email}
                              <i className="fas fa-phone"></i> {patient.phone}
                            </p>
                            <p className="registration-date">
                              Registration Date: {patient.registrationDate}
                            </p>
                          </div>
                        </div>
                        <div className="patient-actions">
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprovePatient(patient.id)}
                          >
                            <i className="fas fa-check"></i> Approve
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectPatient(patient.id)}
                          >
                            <i className="fas fa-times"></i> Reject
                          </button>
                          <button className="btn btn-outline btn-sm">
                            <i className="fas fa-eye"></i> View
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-check-circle"></i>
                      <p>No pending requests at the moment</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recently Approved Patients Card */}
              <div className="card recent-activity-card">
                <div className="card-header">
                  <h3>RECENTLY APPROVED PATIENTS</h3>
                </div>
                
                <div className="approved-patients-list">
                  {approvedPatients.map(patient => (
                    <div key={patient.id} className="patient-item approved">
                      <div className="patient-info">
                        <div className="patient-avatar approved-avatar">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="patient-details">
                          <h4>{patient.name}</h4>
                          <p className="patient-contact">
                            <i className="fas fa-envelope"></i> {patient.email}
                          </p>
                          <p className="approval-date">
                            <i className="fas fa-check-circle"></i> Approved on: {patient.approvedDate}
                          </p>
                        </div>
                      </div>
                      <div className="patient-status">
                        <span className="status-badge approved">Approved</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Narrower for Stats and Quick Actions */}
            <div className="right-column">
              {/* System Statistics Card - Now Compact */}
              <div className="card statistics-card compact">
                <div className="card-header">
                  <h3>SYSTEM STATISTICS</h3>
                  <div className="system-health">
                    <span className="health-indicator good"></span>
                    <span className="health-text">Good</span>
                  </div>
                </div>
                
                <div className="compact-stats-grid">
                  <div className="compact-stat-item">
                    <div className="compact-stat-value">{systemStats.totalUsers}</div>
                    <div className="compact-stat-label">Total Users</div>
                  </div>
                  <div className="compact-stat-item">
                    <div className="compact-stat-value">{systemStats.pendingApprovals}</div>
                    <div className="compact-stat-label">Pending</div>
                  </div>
                  <div className="compact-stat-item">
                    <div className="compact-stat-value">{systemStats.doctorsCount}</div>
                    <div className="compact-stat-label">Doctors</div>
                  </div>
                  <div className="compact-stat-item">
                    <div className="compact-stat-value">{systemStats.appointmentsToday}</div>
                    <div className="compact-stat-label">Today's Appts</div>
                  </div>
                  <div className="compact-stat-item">
                    <div className="compact-stat-value">{systemStats.revenueThisMonth}</div>
                    <div className="compact-stat-label">Monthly Revenue</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="card quick-actions-card">
                <h3>QUICK ACTIONS</h3>
                <div className="compact-actions-grid">
                  <button className="compact-action-btn">
                    <i className="fas fa-user-plus"></i>
                    <span>Add User</span>
                  </button>
                  <button className="compact-action-btn">
                    <i className="fas fa-user-md"></i>
                    <span>Add Doctor</span>
                  </button>
                  <button className="compact-action-btn">
                    <i className="fas fa-calendar-plus"></i>
                    <span>Manage</span>
                  </button>
                  <button className="compact-action-btn">
                    <i className="fas fa-file-export"></i>
                    <span>Export</span>
                  </button>
                  <button className="compact-action-btn">
                    <i className="fas fa-cog"></i>
                    <span>Settings</span>
                  </button>
                  <button className="compact-action-btn">
                    <i className="fas fa-question-circle"></i>
                    <span>Support</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="card activity-card compact">
                <div className="card-header">
                  <h3>RECENT ACTIVITIES</h3>
                </div>
                <div className="compact-activity-list">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="compact-activity-item">
                      <div className="compact-activity-details">
                        <p className="compact-activity-text">
                          <strong>{activity.user}</strong> {activity.action}
                        </p>
                        <p className="compact-activity-time">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;