// src/pages/patient/ViewRecords.jsx
import React, { useState, useEffect } from 'react';
import "../../styles/theme.css";
import "../../styles/patient-components.css";

const ViewRecords = ({ patientId }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    if (patientId) {
      fetchRecords();
    }
  }, [patientId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      console.log('Fetching records for patient:', patientId);
      
      const response = await fetch(`http://localhost:8000/api/patient/records.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();
      console.log('Records response:', data);

      if (response.ok && data.success) {
        setRecords(data.records || []);
      } else {
        setError(data.error || 'Failed to load records');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const viewRecordDetails = (record) => {
    console.log('Selected record:', record);
    setSelectedRecord(record);
    // منع تمرير الصفحة خلف المودال
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedRecord(null);
    // إعادة التمرير
    document.body.style.overflow = 'auto';
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // تنسيق التاريخ بشكل أفضل
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // دالة لعرض القيم بشكل آمن
  const safeDisplay = (value, defaultValue = 'Not specified') => {
    return value && value !== 'null' && value !== 'undefined' ? value : defaultValue;
  };

  // دالة لتحليل JSON بشكل آمن
  const parseJsonSafely = (jsonString) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="records-loading">
        <div className="spinner"></div>
        <p>Loading medical records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="records-error">
        <i className="fas fa-exclamation-circle"></i>
        <p>Error: {error}</p>
        <button onClick={fetchRecords} className="btn btn-primary">
          <i className="fas fa-redo"></i> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="view-records">
      <div className="content-header">
        <h2>Medical Records</h2>
        <p>View your complete medical history</p>
        {records.length > 0 && (
          <span className="records-count">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {records.length === 0 ? (
        <div className="no-records">
          <i className="fas fa-file-medical fa-4x"></i>
          <h3>No Medical Records Found</h3>
          <p>Your medical records will appear here after your first consultation.</p>
        </div>
      ) : (
        <div className="records-list">
          {records.map((record, index) => (
            <div 
              key={record.recordID || index} 
              className="record-card" 
              onClick={() => viewRecordDetails(record)}
            >
              <div className="record-header"> 
                <div className="record-date">
                  <i className="fas fa-calendar-alt"></i>
                  {formatDate(record.recordDate)}
                </div>
                <span className={`record-status ${record.followupRequired ? 'followup' : ''}`}>
                  {record.followupRequired ? '⚠️ Follow-up' : '✓ Completed'}
                </span>
              </div>
              
              <div className="record-body">
                <div className="record-doctor">
                  <i className="fas fa-user-md"></i>
                  <div className="doctor-info">
                    <strong>{safeDisplay(record.doctorName)}</strong>
                    {record.doctorSpecialization && (
                      <span className="doctor-specialty">{record.doctorSpecialization}</span>
                    )}
                  </div>
                </div>
                
                <div className="record-diagnosis">
                  <strong>Diagnosis:</strong> 
                  <p>{safeDisplay(record.diagnosis)}</p>
                </div>
                
                {record.symptoms && (
                  <div className="record-symptoms">
                    <strong>Symptoms:</strong>
                    <p>{safeDisplay(record.symptoms)}</p>
                  </div>
                )}
                
                {record.followupDate && (
                  <div className="record-followup">
                    <i className="fas fa-calendar-check"></i>
                    Follow-up: {formatDate(record.followupDate)}
                  </div>
                )}
              </div>
              
              <div className="record-footer">
                <span className="view-details">Click to view full details →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for record details */}
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
              {/* Record Information */}
              <div className="detail-section">
                <div className="section-title" onClick={() => toggleSection('record')}>
                  <h4>Record Information</h4>
                  <i className={`fas fa-chevron-${expandedSections.record ? 'up' : 'down'}`}></i>
                </div>
                {(!expandedSections.record || expandedSections.record) && (
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Record Date:</span>
                      <span className="detail-value">{formatDate(selectedRecord.recordDate)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Appointment Type:</span>
                      <span className="detail-value">{safeDisplay(selectedRecord.appointmentType)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Doctor Information */}
              <div className="detail-section">
                <div className="section-title" onClick={() => toggleSection('doctor')}>
                  <h4>Doctor Information</h4>
                  <i className={`fas fa-chevron-${expandedSections.doctor ? 'up' : 'down'}`}></i>
                </div>
                {(!expandedSections.doctor || expandedSections.doctor) && (
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Doctor Name:</span>
                      <span className="detail-value">{safeDisplay(selectedRecord.doctorName)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Specialization:</span>
                      <span className="detail-value">{safeDisplay(selectedRecord.doctorSpecialization)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Diagnosis & Symptoms */}
              <div className="detail-section">
                <div className="section-title" onClick={() => toggleSection('diagnosis')}>
                  <h4>Diagnosis & Symptoms</h4>
                  <i className={`fas fa-chevron-${expandedSections.diagnosis ? 'up' : 'down'}`}></i>
                </div>
                {(!expandedSections.diagnosis || expandedSections.diagnosis) && (
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Diagnosis:</span>
                      <span className="detail-value diagnosis-text">{safeDisplay(selectedRecord.diagnosis)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Symptoms:</span>
                      <span className="detail-value">{safeDisplay(selectedRecord.symptoms)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Treatment */}
              <div className="detail-section">
                <div className="section-title" onClick={() => toggleSection('treatment')}>
                  <h4>Treatment Notes</h4>
                  <i className={`fas fa-chevron-${expandedSections.treatment ? 'up' : 'down'}`}></i>
                </div>
                {(!expandedSections.treatment || expandedSections.treatment) && (
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Notes:</span>
                      <p className="treatment-notes">{safeDisplay(selectedRecord.treatmentNotes)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Vital Signs */}
              {selectedRecord.vitalSigns && (
                <div className="detail-section">
                  <div className="section-title" onClick={() => toggleSection('vitals')}>
                    <h4>Vital Signs</h4>
                    <i className={`fas fa-chevron-${expandedSections.vitals ? 'up' : 'down'}`}></i>
                  </div>
                  {(!expandedSections.vitals || expandedSections.vitals) && (
                    <div className="section-content">
                      {(() => {
                        const vitals = parseJsonSafely(selectedRecord.vitalSigns);
                        return vitals ? (
                          <div className="vitals-grid">
                            {Object.entries(vitals).map(([key, value]) => (
                              <div key={key} className="vital-item">
                                <span className="vital-label">{key}:</span>
                                <span className="vital-value">{value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-data">No vital signs data available</p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Follow-up */}
              {selectedRecord.followupRequired && (
                <div className="detail-section followup-section">
                  <div className="section-title" onClick={() => toggleSection('followup')}>
                    <h4>Follow-up Information</h4>
                    <i className={`fas fa-chevron-${expandedSections.followup ? 'up' : 'down'}`}></i>
                  </div>
                  {(!expandedSections.followup || expandedSections.followup) && (
                    <div className="section-content">
                      <div className="detail-row">
                        <span className="detail-label">Follow-up Required:</span>
                        <span className="detail-value followup-badge">Yes</span>
                      </div>
                      {selectedRecord.followupDate && (
                        <div className="detail-row">
                          <span className="detail-label">Follow-up Date:</span>
                          <span className="detail-value">{formatDate(selectedRecord.followupDate)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Raw Data (for debugging) - يمكن إزالته في الإنتاج */}
              {process.env.NODE_ENV === 'development' && (
                <div className="detail-section">
                  <div className="section-title" onClick={() => toggleSection('raw')}>
                    <h4>Raw Data (Debug)</h4>
                    <i className={`fas fa-chevron-${expandedSections.raw ? 'up' : 'down'}`}></i>
                  </div>
                  {expandedSections.raw && (
                    <div className="section-content">
                      <pre className="raw-data">
                        {JSON.stringify(selectedRecord, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewRecords;