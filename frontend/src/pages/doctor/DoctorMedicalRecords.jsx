// src/pages/doctor/DoctorMedicalRecords.jsx
import React, { useState, useEffect } from 'react';

const DoctorMedicalRecords = ({ doctorData, getAuthHeaders }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterDate, setFilterDate] = useState('all'); // all, today, week, month
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/doctor/medical-records.php?doctorID=${doctorData?.doctorID}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  // فلترة السجلات حسب التاريخ
  const filterByDate = (record) => {
    if (filterDate === 'all') return true;
    
    const recordDate = new Date(record.recordDate);
    const today = new Date();
    const diffTime = Math.abs(today - recordDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (filterDate === 'today') return diffDays === 0;
    if (filterDate === 'week') return diffDays <= 7;
    if (filterDate === 'month') return diffDays <= 30;
    return true;
  };

  // تطبيق البحث والفلترة والترتيب
  const filteredRecords = records
    .filter(record => 
      (record.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       record.recordID?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      filterByDate(record)
    )
    .sort((a, b) => {
      const dateA = new Date(a.recordDate);
      const dateB = new Date(b.recordDate);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const viewRecordDetails = (record) => {
    setSelectedRecord(record);
  };

  const closeModal = () => {
    setSelectedRecord(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getVitalSignsDisplay = (vitalSigns) => {
    if (!vitalSigns) return null;
    
    try {
      const vitals = typeof vitalSigns === 'string' ? JSON.parse(vitalSigns) : vitalSigns;
      return (
        <div className="vital-signs-mini">
          {vitals.bloodPressure && (
            <span className="vital-item" title="Blood Pressure">
              <i className="fas fa-heartbeat"></i> {vitals.bloodPressure}
            </span>
          )}
          {vitals.heartRate && (
            <span className="vital-item" title="Heart Rate">
              <i className="fas fa-heart"></i> {vitals.heartRate} bpm
            </span>
          )}
          {vitals.temperature && (
            <span className="vital-item" title="Temperature">
              <i className="fas fa-thermometer-half"></i> {vitals.temperature}°C
            </span>
          )}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading medical records...</p>
      </div>
    );
  }

  return (
    <div className="doctor-medical-records">
      <div className="content-header">
        <h2>
          <i className="fas fa-file-medical"></i>
          Medical Records
        </h2>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <i className="fas fa-print"></i> Export Report
        </button>
      </div>

      <div className="records-controls">
        {/* ===== حقل بحث محسّن بنفس تصميم Patients ===== */}
        <div className="search-box-enhanced">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search by patient name, diagnosis, or record ID..."
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

        <div className="filter-controls">
          <div className="filter-group">
            <label>Date:</label>
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="records-stats">
        <div className="stat-card">
          <span className="stat-value">{filteredRecords.length}</span>
          <span className="stat-label">Total Records</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {filteredRecords.filter(r => r.followupRequired).length}
          </span>
          <span className="stat-label">Follow-ups Required</span>
        </div>
      </div>

      {filteredRecords.length > 0 ? (
        <div className="records-grid">
          {filteredRecords.map((record, index) => (
            <div 
              key={index} 
              className="record-card-enhanced"
              onClick={() => viewRecordDetails(record)}
            >
              <div className="record-card-header">
                <div className="record-patient-info">
                  <div className="record-patient-avatar">
                    {record.patientName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'PT'}
                  </div>
                  <div className="record-patient-details">
                    <h3>{record.patientName}</h3>
                    <span className="record-id">ID: {record.recordID}</span>
                  </div>
                </div>
                <span className="record-date-badge">
                  <i className="fas fa-calendar-alt"></i>
                  {formatDate(record.recordDate)}
                </span>
              </div>

              <div className="record-card-body">
                <div className="diagnosis-section">
                  <span className="diagnosis-label">Diagnosis</span>
                  <p className="diagnosis-text">{record.diagnosis || 'Not specified'}</p>
                </div>

                {record.symptoms && (
                  <div className="symptoms-section">
                    <span className="symptoms-label">Symptoms</span>
                    <p className="symptoms-text">{record.symptoms}</p>
                  </div>
                )}

                {getVitalSignsDisplay(record.vitalSigns) && (
                  <div className="vitals-section">
                    <span className="vitals-label">Vital Signs</span>
                    {getVitalSignsDisplay(record.vitalSigns)}
                  </div>
                )}
              </div>

              <div className="record-card-footer">
                {record.followupRequired && (
                  <span className="followup-badge">
                    <i className="fas fa-calendar-check"></i>
                    Follow-up: {new Date(record.followupDate).toLocaleDateString()}
                  </span>
                )}
                <span className="view-details-link">
                  View Details <i className="fas fa-arrow-right"></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-records">
          <i className="fas fa-folder-open fa-4x"></i>
          <h3>No Medical Records Found</h3>
          <p>
            {searchTerm 
              ? `No records matching "${searchTerm}"` 
              : "Medical records will appear here after patient consultations."}
          </p>
          {searchTerm && (
            <button className="btn btn-primary" onClick={() => setSearchTerm('')}>
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-file-medical"></i>
                Medical Record Details
              </h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="record-detail-header">
                <div className="record-detail-patient">
                  <div className="patient-avatar-large">
                    {selectedRecord.patientName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'PT'}
                  </div>
                  <div>
                    <h2>{selectedRecord.patientName}</h2>
                    <p className="record-meta">
                      <i className="fas fa-hashtag"></i> {selectedRecord.recordID} • 
                      <i className="fas fa-calendar"></i> {new Date(selectedRecord.recordDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="record-detail-grid">
                <div className="detail-section">
                  <h4>
                    <i className="fas fa-stethoscope"></i>
                    Diagnosis
                  </h4>
                  <div className="detail-content diagnosis-box">
                    {selectedRecord.diagnosis || 'Not specified'}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>
                    <i className="fas fa-thermometer-half"></i>
                    Symptoms
                  </h4>
                  <div className="detail-content">
                    {selectedRecord.symptoms || 'No symptoms recorded'}
                  </div>
                </div>

                <div className="detail-section full-width">
                  <h4>
                    <i className="fas fa-notes-medical"></i>
                    Treatment Notes
                  </h4>
                  <div className="detail-content treatment-notes">
                    {selectedRecord.treatmentNotes || 'No treatment notes'}
                  </div>
                </div>

                {selectedRecord.vitalSigns && (
                  <div className="detail-section full-width">
                    <h4>
                      <i className="fas fa-heartbeat"></i>
                      Vital Signs
                    </h4>
                    <div className="vital-signs-grid">
                      {(() => {
                        const vitals = typeof selectedRecord.vitalSigns === 'string' 
                          ? JSON.parse(selectedRecord.vitalSigns) 
                          : selectedRecord.vitalSigns;
                        return Object.entries(vitals).map(([key, value]) => (
                          <div key={key} className="vital-sign-item">
                            <span className="vital-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="vital-value">{value}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {selectedRecord.followupRequired && (
                  <div className="detail-section">
                    <h4>
                      <i className="fas fa-calendar-check"></i>
                      Follow-up
                    </h4>
                    <div className="detail-content">
                      <span className="followup-date">
                        {new Date(selectedRecord.followupDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary">
                <i className="fas fa-edit"></i> Edit Record
              </button>
              <button className="btn btn-secondary">
                <i className="fas fa-prescription"></i> Create Prescription
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

export default DoctorMedicalRecords;