// src/pages/admin/AdminPatients.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminPatients = ({ adminData, getAuthHeaders, showNotification }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    // التحقق من وجود معاملات في URL
    const params = new URLSearchParams(location.search);
    const approveId = params.get('approve');
    const rejectId = params.get('reject');
    const viewId = params.get('id');
    const status = params.get('status');

    if (approveId) {
      handleApprovePatient(approveId);
    } else if (rejectId) {
      handleRejectPatient(rejectId);
    } else if (viewId) {
      viewPatientDetails(viewId);
    }

    if (status) {
      setFilterStatus(status);
    }

    fetchPatients();
  }, [location]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/api/admin/patients.php';
      
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setPatients(data.patients || []);
        
        // حساب الإحصائيات
        const pending = data.patients.filter(p => p.status === 'pending').length;
        const approved = data.patients.filter(p => p.status === 'approved').length;
        const rejected = data.patients.filter(p => p.status === 'rejected').length;
        
        setStats({
          total: data.total || data.patients.length,
          pending,
          approved,
          rejected
        });
      } else {
        showNotification('error', data.error || 'Failed to load patients');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      showNotification('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePatient = async (patientId) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/patients.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'approve',
          patientID: patientId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Patient approved successfully');
        fetchPatients();
        // إزالة المعامل من URL
        navigate('/admin/patients');
      } else {
        showNotification('error', data.error || 'Failed to approve patient');
      }
    } catch (error) {
      console.error('Error approving patient:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleRejectPatient = async (patientId) => {
    const reason = prompt('Please enter rejection reason (optional):');
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/patients.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'reject',
          patientID: patientId,
          reason: reason || 'No reason provided'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('info', 'Patient rejected');
        fetchPatients();
        navigate('/admin/patients');
      } else {
        showNotification('error', data.error || 'Failed to reject patient');
      }
    } catch (error) {
      console.error('Error rejecting patient:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/patients.php', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ patientID: patientId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Patient deleted');
        fetchPatients();
      } else {
        showNotification('error', data.error || 'Failed to delete patient');
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      showNotification('error', 'Network error');
    }
  };

  const viewPatientDetails = async (patientId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/patients.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedPatient(data.patient);
        setShowDetailsModal(true); 
      } else {
        showNotification('error', data.error || 'Failed to load patient details');
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      showNotification('error', 'Network error');
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm) ||
      patient.medicalNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading patients...</p>
      </div>
    );
  }

  return (
    <div className="admin-patients-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-user-friends"></i>
          PATIENTS MANAGEMENT
        </h2>
        <div className="header-actions">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards small">
        <div className="stat-card" onClick={() => setFilterStatus('all')}>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Patients</span>
        </div>
        <div className="stat-card warning" onClick={() => setFilterStatus('pending')}>
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
          {stats.pending > 0 && <span className="stat-badge">{stats.pending}</span>}
        </div>
        <div className="stat-card success" onClick={() => setFilterStatus('approved')}>
          <span className="stat-value">{stats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card danger" onClick={() => setFilterStatus('rejected')}>
          <span className="stat-value">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All
        </button>
        <button 
          className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          Pending
        </button>
        <button 
          className={`filter-tab ${filterStatus === 'approved' ? 'active' : ''}`}
          onClick={() => setFilterStatus('approved')}
        >
          Approved
        </button>
        <button 
          className={`filter-tab ${filterStatus === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilterStatus('rejected')}
        >
          Rejected
        </button>
      </div>

      {/* Patients Table */}
      <div className="card">
        <div className="patients-table-container">
          <table className="patients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Contact</th>
                <th>Medical #</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Blood Type</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map(patient => (
                  <tr key={patient.patientID} className={patient.status}>
                    <td>#{patient.patientID.substring(0, 8)}</td>
                    <td>
                      <div className="patient-name-cell">
                        <div className="patient-avatar-small">
                          {patient.initials || patient.fullName?.split(' ').map(n => n[0]).join('') || 'PT'}
                        </div>
                        <div>
                          <strong>{patient.fullName || 'N/A'}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info-cell">
                        <div><i className="fas fa-envelope"></i> {patient.email || 'N/A'}</div>
                        <div><i className="fas fa-phone"></i> {patient.phone || 'N/A'}</div>
                      </div>
                    </td>
                    <td>{patient.recordID || 'N/A'}</td>
                    <td>{formatDate(patient.dateOfBirth)}</td>
                    <td>{patient.gender || 'N/A'}</td>
                    <td>{patient.bloodType || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${patient.status}`}>
                        {patient.status || 'pending'}
                      </span>
                    </td>
                    <td>{formatDate(patient.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon info"
                          onClick={() => viewPatientDetails(patient.patientID)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        {patient.status === 'pending' && (
                          <>
                            <button 
                              className="btn-icon success"
                              onClick={() => handleApprovePatient(patient.patientID)}
                              title="Approve"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              className="btn-icon danger"
                              onClick={() => handleRejectPatient(patient.patientID)}
                              title="Reject"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        <button 
                          className="btn-icon danger"
                          onClick={() => handleDeletePatient(patient.patientID)}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="empty-table">
                    <i className="fas fa-users"></i>
                    <p>No patients found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Patient Details</h3>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="patient-details-modal">
              <div className="patient-profile-header">
                <div className="patient-avatar-large">
                  {selectedPatient.initials || selectedPatient.fullName?.split(' ').map(n => n[0]).join('') || 'PT'}
                </div>
                <div className="patient-header-info">
                  <h2>{selectedPatient.fullName || 'N/A'}</h2>
                  <p className="patient-id">ID: #{selectedPatient.patientID}</p>
                  <p className="patient-medical">Medical Number: {selectedPatient.recordID || 'N/A'}</p>
                  <span className={`status-badge ${selectedPatient.status}`}>
                    {selectedPatient.status || 'pending'}
                  </span>
                </div>
              </div>

              <div className="patient-details-grid">
                <div className="details-section">
                  <h4>Personal Information</h4>
                  <div className="details-row">
                    <span className="detail-label">Full Name:</span>
                    <span className="detail-value">{selectedPatient.fullName || 'N/A'}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Date of Birth:</span>
                    <span className="detail-value">{formatDate(selectedPatient.dateOfBirth)}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Age:</span>
                    <span className="detail-value">{selectedPatient.dateOfBirth 
                      ? Math.floor((new Date() - new Date(selectedPatient.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25)) + ' years' 
                      : 'N/A'} </span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Gender:</span>
                    <span className="detail-value">{selectedPatient.gender || 'N/A'}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Blood Type:</span>
                    <span className="detail-value">{selectedPatient.bloodType || 'N/A'}</span>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Contact Information</h4>
                  <div className="details-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedPatient.email || 'N/A'}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedPatient.phone || 'N/A'}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{selectedPatient.address || 'N/A'}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Emergency Contact:</span>
                    <span className="detail-value">{selectedPatient.emergencyContact || 'N/A'}</span>
                  </div>
                </div>

            
                <div className="details-section full-width">
                  <h4>Medical Information</h4>
                  <div className="details-row">
                    <span className="detail-label">Medical History:</span>
                    <span className="detail-value">{selectedPatient.medicalHistory || 'No history recorded'}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Allergies:</span>
                    <span className="detail-value">{selectedPatient.allergies || 'No known allergies'}</span>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Registration Info</h4>
                  <div className="details-row">
                    <span className="detail-label">Registered:</span>
                    <span className="detail-value">{formatDate(selectedPatient.created_at)}</span>
                  </div>
                  {selectedPatient.approvedAt && (
                    <div className="details-row">
                      <span className="detail-label">Approved:</span>
                      <span className="detail-value">{formatDate(selectedPatient.approvedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="details-section">
                  <h4>Statistics</h4>
                  <div className="details-row">
                    <span className="detail-label">Total Appointments:</span>
                    <span className="detail-value">{selectedPatient.totalAppointments || 0}</span>
                  </div>
                  <div className="details-row">
                    <span className="detail-label">Recent Visits:</span>
                    <span className="detail-value">{selectedPatient.recentAppointments?.length || 0}</span>
                  </div>
                </div>
              </div>

              {selectedPatient.recentAppointments?.length > 0 && (
                <div className="recent-appointments">
                  <h4>Recent Appointments</h4>
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Doctor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPatient.recentAppointments.slice(0, 5).map((app, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(app.appointmentDate)}</td>
                          <td>{app.doctorName}</td>
                          <td>
                            <span className={`status-badge small ${app.status}`}>
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions">
                {selectedPatient.status === 'pending' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => {
                        handleApprovePatient(selectedPatient.patientID);
                        setShowDetailsModal(false);
                      }}
                    >
                      <i className="fas fa-check"></i> Approve Patient
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => {
                        handleRejectPatient(selectedPatient.patientID);
                        setShowDetailsModal(false);
                      }}
                    >
                      <i className="fas fa-times"></i> Reject Patient
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;