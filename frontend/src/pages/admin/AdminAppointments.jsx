// src/pages/admin/AdminAppointments.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminAppointments = ({ adminData, getAuthHeaders, showNotification }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0
  });

  // نموذج إنشاء موعد
  const [formData, setFormData] = useState({
    patientID: '',
    doctorID: '',
    appointmentDate: '',
    type: 'regular',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      setShowCreateModal(true);
    }

    fetchAppointments();
    fetchDoctors();
    fetchPatients();
  }, [filterDate, filterStatus, location]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let url = `http://localhost:8000/api/admin/appointments.php?date=${filterDate}`;
      
      if (filterStatus !== 'all') {
        url += `&status=${filterStatus}`;
      }
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.appointments || []);
        setStats(data.stats || {
          total: data.appointments?.length || 0,
          scheduled: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0
        });
      } else {
        showNotification('error', data.error || 'Failed to load appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      showNotification('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/doctors.php?limit=100', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/patients.php?limit=100', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/appointments.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'create',
          ...formData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Appointment created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchAppointments();
        navigate('/admin/appointments');
      } else {
        showNotification('error', data.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/appointments.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update-status',
          appointmentID: appointmentId,
          status: newStatus
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', `Appointment marked as ${newStatus}`);
        fetchAppointments();
      } else {
        showNotification('error', data.error || 'Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/appointments.php', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ appointmentID: appointmentId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Appointment deleted');
        fetchAppointments();
      } else {
        showNotification('error', data.error || 'Failed to delete appointment');
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showNotification('error', 'Network error');
    }
  };

  const viewAppointmentDetails = async (appointmentId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/appointments.php?appointmentID=${appointmentId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedAppointment(data.appointment);
        setShowDetailsModal(true);
      } else {
        showNotification('error', data.error || 'Failed to load appointment details');
      }
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      showNotification('error', 'Network error');
    }
  };

  const resetForm = () => {
    setFormData({
      patientID: '',
      doctorID: '',
      appointmentDate: '',
      type: 'regular',
      reason: '',
      notes: ''
    });
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = 
      app.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
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
        <p>Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="admin-appointments-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-calendar-alt"></i>
          APPOINTMENTS MANAGEMENT
        </h2>
        <div className="header-actions">
          <div className="date-filter">
            <i className="fas fa-calendar-alt"></i>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="date-input"
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-calendar-plus"></i> New Appointment
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="appointments-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card info">
          <span className="stat-value">{stats.scheduled}</span>
          <span className="stat-label">Scheduled</span>
        </div>
        <div className="stat-card success">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{stats.cancelled}</span>
          <span className="stat-label">Cancelled</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-value">{stats.noShow || 0}</span>
          <span className="stat-label">No Show</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="filters-bar">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by patient or doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card">
        <div className="appointments-table-container">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Type</th>
                <th>Status</th>
                <th>Queue #</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map(app => (
                  <tr key={app.appointmentID}>
                    <td>
                      <strong>{formatTime(app.appointmentDate)}</strong>
                      <div className="table-date">{formatDate(app.appointmentDate)}</div>
                    </td>
                    <td>
                      <div className="patient-info-cell">
                        <div className="patient-avatar-mini">
                          {app.patientName?.split(' ').map(n => n[0]).join('') || 'P'}
                        </div>
                        <div>
                          <strong>{app.patientName || 'N/A'}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>Dr. {app.doctorName || 'N/A'}</strong>
                        <div className="text-muted">{app.specialization || 'General'}</div>
                      </div>
                    </td>
                    <td>{app.specialization || 'N/A'}</td>
                    <td>
                      <span className="appointment-type">{app.type || 'Regular'}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${app.status}`}>
                        {app.status || 'scheduled'}
                      </span>
                    </td>
                    <td>
                      {app.queueNumber ? (
                        <span className="queue-number-badge">#{app.queueNumber}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <select 
                          className="status-select"
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.appointmentID, e.target.value)}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no-show">No Show</option>
                        </select>
                        <button 
                          className="btn-icon info"
                          onClick={() => viewAppointmentDetails(app.appointmentID)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="btn-icon danger"
                          onClick={() => handleDeleteAppointment(app.appointmentID)}
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
                  <td colSpan="8" className="empty-table">
                    <i className="fas fa-calendar-times"></i>
                    <p>No appointments found for this date</p>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowCreateModal(true)}
                    >
                      Create New Appointment
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-calendar-plus"></i> Create New Appointment</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleCreateAppointment} className="appointment-form">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label><i className="fas fa-user"></i> Patient *</label>
                    <select
                      required
                      value={formData.patientID}
                      onChange={(e) => setFormData({...formData, patientID: e.target.value})}
                    >
                      <option value="">Select Patient</option>
                      {patients.map(patient => (
                        <option key={patient.patientID} value={patient.patientID}>
                          {patient.fullName} - {patient.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label><i className="fas fa-user-md"></i> Doctor *</label>
                    <select
                      required
                      value={formData.doctorID}
                      onChange={(e) => setFormData({...formData, doctorID: e.target.value})}
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(doctor => (
                        <option key={doctor.doctorID} value={doctor.doctorID}>
                          Dr. {doctor.fullName} - {doctor.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label><i className="fas fa-calendar-alt"></i> Appointment Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-tag"></i> Appointment Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="consultation">Consultation</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="check-up">Check-up</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-clock"></i> Duration</label>
                    <select
                      value={formData.duration || '30'}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label><i className="fas fa-notes-medical"></i> Reason for Visit</label>
                    <textarea
                      rows="3"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      placeholder="Brief reason for the appointment"
                    ></textarea>
                  </div>

                  <div className="form-group full-width">
                    <label><i className="fas fa-sticky-note"></i> Additional Notes</label>
                    <textarea
                      rows="2"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Any additional information"
                    ></textarea>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn btn-success">
                    <i className="fas fa-calendar-check"></i> Create Appointment
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-calendar-alt"></i> Appointment Details</h3>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="appointment-details-container">
                {/* Status Badge */}
                <div className="details-status-bar">
                  <span className={`status-badge large ${selectedAppointment.status}`}>
                    {selectedAppointment.status}
                  </span>
                  <span className="appointment-id">ID: {selectedAppointment.appointmentID}</span>
                </div>

                {/* Patient Information Section */}
                <div className="details-section">
                  <h4><i className="fas fa-user-circle"></i> Patient Information</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedAppointment.patientName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedAppointment.patientEmail || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedAppointment.patientPhone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">DOB:</span>
                      <span className="detail-value">
                        {selectedAppointment.patientDOB ? new Date(selectedAppointment.patientDOB).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Gender:</span>
                      <span className="detail-value">{selectedAppointment.patientGender || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Blood Type:</span>
                      <span className="detail-value">{selectedAppointment.patientBloodType || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Doctor Information Section */}
                <div className="details-section">
                  <h4><i className="fas fa-user-md"></i> Doctor Information</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">Dr. {selectedAppointment.doctorName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Specialization:</span>
                      <span className="detail-value">{selectedAppointment.specialization}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">License:</span>
                      <span className="detail-value">{selectedAppointment.licenseNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Fee:</span>
                      <span className="detail-value">${selectedAppointment.consultationFee || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Appointment Details Section */}
                <div className="details-section">
                  <h4><i className="fas fa-clock"></i> Appointment Details</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">
                        {new Date(selectedAppointment.appointmentDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">
                        {new Date(selectedAppointment.appointmentDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value appointment-type-badge">{selectedAppointment.type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">
                        {selectedAppointment.created_at ? new Date(selectedAppointment.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason & Notes Section */}
                {(selectedAppointment.reason || selectedAppointment.notes) && (
                  <div className="details-section">
                    {selectedAppointment.reason && (
                      <>
                        <h4><i className="fas fa-notes-medical"></i> Reason for Visit</h4>
                        <div className="detail-text">
                          <p>{selectedAppointment.reason}</p>
                        </div>
                      </>
                    )}
                    
                    {selectedAppointment.notes && (
                      <>
                        <h4 style={{ marginTop: '15px' }}><i className="fas fa-sticky-note"></i> Additional Notes</h4>
                        <div className="detail-text">
                          <p>{selectedAppointment.notes}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Queue Information (if available) */}
                {selectedAppointment.queue && (
                  <div className="details-section">
                    <h4><i className="fas fa-users"></i> Queue Information</h4>
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Queue Number:</span>
                        <span className="detail-value queue-number">#{selectedAppointment.queue.queuePosition}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Check-in Time:</span>
                        <span className="detail-value">
                          {selectedAppointment.queue.checkinTime ? new Date(selectedAppointment.queue.checkinTime).toLocaleString() : 'Not checked in'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Queue Status:</span>
                        <span className={`status-badge small ${selectedAppointment.queue.status}`}>
                          {selectedAppointment.queue.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Priority:</span>
                        <span className={`priority-badge ${selectedAppointment.queue.priority}`}>
                          {selectedAppointment.queue.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <select 
                className="status-select large"
                value={selectedAppointment.status}
                onChange={(e) => {
                  handleUpdateStatus(selectedAppointment.appointmentID, e.target.value);
                  setShowDetailsModal(false);
                }}
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked-in">Checked In</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
              <button className="btn btn-outline" onClick={() => setShowDetailsModal(false)}>
                <i className="fas fa-times"></i> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppointments;