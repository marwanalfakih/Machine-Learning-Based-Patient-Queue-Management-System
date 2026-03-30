// src/pages/doctor/DoctorPrescriptions.jsx
import React, { useState, useEffect } from 'react';

const DoctorPrescriptions = ({ doctorData, getAuthHeaders }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [newPrescription, setNewPrescription] = useState({
    patientID: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/doctor/prescriptions.php?doctorID=${doctorData?.doctorID}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions
    .filter(p => {
      const matchesSearch = 
        p.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.medicationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prescriptionID?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? p.isActive :
        statusFilter === 'inactive' ? !p.isActive : true;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.prescribedDate) - new Date(a.prescribedDate));

  const handleInputChange = (e) => {
    setNewPrescription({
      ...newPrescription,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/doctor/prescriptions.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newPrescription,
          doctorID: doctorData?.doctorID,
          action: 'create'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Prescription created successfully');
        setShowNewForm(false);
        setNewPrescription({
          patientID: '',
          medicationName: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: ''
        });
        fetchPrescriptions();
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
    }
  };

  const viewPrescriptionDetails = (prescription) => {
    setSelectedPrescription(prescription);
  };

  const closeModal = () => {
    setSelectedPrescription(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="doctor-prescriptions">
      <div className="content-header">
        <h2>
          <i className="fas fa-prescription"></i>
          Prescriptions
        </h2>
        <button className="btn btn-primary" onClick={() => setShowNewForm(true)}>
          <i className="fas fa-plus"></i> New Prescription
        </button>
      </div>

      <div className="prescriptions-controls">
        {/* ===== حقل بحث محسّن بنفس تصميم Patients ===== */}
        <div className="search-box-enhanced">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search by patient or medication..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="status-filter">
          <button 
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive
          </button>
        </div>
      </div>

      <div className="prescriptions-stats">
        <div className="stat-card">
          <span className="stat-value">{prescriptions.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{prescriptions.filter(p => p.isActive).length}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{prescriptions.filter(p => !p.isActive).length}</span>
          <span className="stat-label">Inactive</span>
        </div>
      </div>

      {showNewForm && (
        <div className="prescription-form-card">
          <div className="form-header">
            <h3>New Prescription</h3>
            <button className="close-btn" onClick={() => setShowNewForm(false)}>×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Patient ID *</label>
                <input
                  type="text"
                  name="patientID"
                  value={newPrescription.patientID}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter patient ID"
                />
              </div>
              <div className="form-group">
                <label>Medication Name *</label>
                <input
                  type="text"
                  name="medicationName"
                  value={newPrescription.medicationName}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Amoxicillin"
                />
              </div>
              <div className="form-group">
                <label>Dosage *</label>
                <input
                  type="text"
                  name="dosage"
                  value={newPrescription.dosage}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 500mg"
                />
              </div>
              <div className="form-group">
                <label>Frequency *</label>
                <input
                  type="text"
                  name="frequency"
                  value={newPrescription.frequency}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Twice daily"
                />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <input
                  type="text"
                  name="duration"
                  value={newPrescription.duration}
                  onChange={handleInputChange}
                  placeholder="e.g., 7 days"
                />
              </div>
              <div className="form-group full-width">
                <label>Instructions</label>
                <textarea
                  name="instructions"
                  value={newPrescription.instructions}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Additional instructions for the patient..."
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowNewForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Prescription
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredPrescriptions.length > 0 ? (
        <div className="prescriptions-list-enhanced">
          {filteredPrescriptions.map((prescription, index) => (
            <div 
              key={index} 
              className={`prescription-card ${!prescription.isActive ? 'inactive' : ''}`}
              onClick={() => viewPrescriptionDetails(prescription)}
            >
              <div className="prescription-header">
                <div className="prescription-patient">
                  <div className="patient-avatar-small">
                    {prescription.patientName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'PT'}
                  </div>
                  <div>
                    <h3>{prescription.patientName}</h3>
                    <span className="prescription-date">
                      <i className="fas fa-calendar-alt"></i> {formatDate(prescription.prescribedDate)}
                    </span>
                  </div>
                </div>
                <span className={`status-badge ${prescription.isActive ? 'active' : 'inactive'}`}>
                  {prescription.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="prescription-body">
                <div className="medication-info">
                  <span className="medication-name">{prescription.medicationName}</span>
                  <span className="medication-dosage">{prescription.dosage}</span>
                </div>
                
                <div className="prescription-details">
                  <div className="detail-chip">
                    <i className="fas fa-clock"></i>
                    <span>{prescription.frequency}</span>
                  </div>
                  {prescription.duration && (
                    <div className="detail-chip">
                      <i className="fas fa-hourglass-half"></i>
                      <span>{prescription.duration}</span>
                    </div>
                  )}
                </div>

                {prescription.instructions && (
                  <div className="instructions-preview">
                    <i className="fas fa-info-circle"></i>
                    <span>{prescription.instructions.substring(0, 60)}...</span>
                  </div>
                )}
              </div>

              <div className="prescription-footer">
                <span className="view-link">
                  View Details <i className="fas fa-arrow-right"></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-prescriptions">
          <i className="fas fa-prescription-bottle-alt fa-4x"></i>
          <h3>No Prescriptions Found</h3>
          <p>
            {searchTerm 
              ? `No prescriptions matching "${searchTerm}"` 
              : "Create your first prescription using the button above."}
          </p>
          {searchTerm && (
            <button className="btn btn-primary" onClick={() => setSearchTerm('')}>
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Prescription Details Modal */}
      {selectedPrescription && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-prescription"></i>
                Prescription Details
              </h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="prescription-detail-header">
                <div className="patient-info-summary">
                  <div className="patient-avatar-large">
                    {selectedPrescription.patientName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'PT'}
                  </div>
                  <div>
                    <h2>{selectedPrescription.patientName}</h2>
                    <p className="prescription-meta">
                      <i className="fas fa-hashtag"></i> {selectedPrescription.prescriptionID} • 
                      <i className="fas fa-calendar"></i> {formatDate(selectedPrescription.prescribedDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="prescription-detail-grid">
                <div className="detail-section">
                  <h4>
                    <i className="fas fa-pills"></i>
                    Medication
                  </h4>
                  <div className="medication-detail">
                    <span className="med-name">{selectedPrescription.medicationName}</span>
                    <span className="med-dosage">{selectedPrescription.dosage}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>
                    <i className="fas fa-clock"></i>
                    Frequency
                  </h4>
                  <div className="detail-content">
                    {selectedPrescription.frequency}
                  </div>
                </div>

                {selectedPrescription.duration && (
                  <div className="detail-section">
                    <h4>
                      <i className="fas fa-hourglass-half"></i>
                      Duration
                    </h4>
                    <div className="detail-content">
                      {selectedPrescription.duration}
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h4>
                    <i className="fas fa-info-circle"></i>
                    Status
                  </h4>
                  <div className="detail-content">
                    <span className={`status-badge-large ${selectedPrescription.isActive ? 'active' : 'inactive'}`}>
                      {selectedPrescription.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {selectedPrescription.instructions && (
                  <div className="detail-section full-width">
                    <h4>
                      <i className="fas fa-file-prescription"></i>
                      Instructions
                    </h4>
                    <div className="instructions-box">
                      {selectedPrescription.instructions}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary">
                <i className="fas fa-print"></i> Print
              </button>
              <button className="btn btn-secondary">
                <i className="fas fa-copy"></i> Duplicate
              </button>
              <button className="btn btn-outline" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptions;