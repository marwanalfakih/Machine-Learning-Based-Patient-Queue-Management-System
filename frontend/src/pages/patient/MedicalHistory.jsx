import React, { useState, useEffect } from 'react';
import "../../styles/theme.css";
import "../../styles/patient-components.css";

const MedicalHistory = ({ patientId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('conditions');

  useEffect(() => {
    if (patientId) {
      fetchMedicalHistory();
    }
  }, [patientId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchMedicalHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/patient/history.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHistory(data.history || {});
      } else {
        setError(data.error || 'Failed to load medical history');
      }
    } catch (error) {
      console.error('Error fetching medical history:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="history-loading">
        <div className="spinner"></div>
        <p>Loading medical history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-error">
        <p>Error: {error}</p>
        <button onClick={fetchMedicalHistory} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="medical-history">
      <div className="content-header">
        <h2>Medical History</h2>
        <p>Complete health record</p>
      </div>

      <div className="history-tabs">
        <button 
          className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conditions')}
        >
          <i className="fas fa-notes-medical"></i>
          Conditions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'allergies' ? 'active' : ''}`}
          onClick={() => setActiveTab('allergies')}
        >
          <i className="fas fa-allergies"></i>
          Allergies
        </button>
        <button 
          className={`tab-btn ${activeTab === 'surgeries' ? 'active' : ''}`}
          onClick={() => setActiveTab('surgeries')}
        >
          <i className="fas fa-syringe"></i>
          Surgeries
        </button>
        <button 
          className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
          onClick={() => setActiveTab('family')}
        >
          <i className="fas fa-users"></i>
          Family History
        </button>
      </div>

      <div className="history-content">
        {activeTab === 'conditions' && (
          <div className="conditions-section">
            {history.conditions?.length > 0 ? (
              <div className="conditions-list">
                {history.conditions.map((condition, index) => (
                  <div key={index} className="condition-card card">
                    <div className="condition-header">
                      <h3>{condition.name}</h3>
                      <span className="condition-date">Diagnosed: {condition.diagnosedDate}</span>
                    </div>
                    <p className="condition-status">Status: {condition.status || 'Active'}</p>
                    {condition.notes && (
                      <p className="condition-notes">{condition.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No medical conditions recorded</p>
            )}
          </div>
        )}

        {activeTab === 'allergies' && (
          <div className="allergies-section">
            {history.allergies?.length > 0 ? (
              <div className="allergies-list">
                {history.allergies.map((allergy, index) => (
                  <div key={index} className="allergy-card card">
                    <div className="allergy-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      <h3>{allergy.name}</h3>
                    </div>
                    <p className="allergy-severity">Severity: {allergy.severity || 'Mild'}</p>
                    <p className="allergy-reaction">Reaction: {allergy.reaction || 'Not specified'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No allergies recorded</p>
            )}
          </div>
        )}

        {activeTab === 'surgeries' && (
          <div className="surgeries-section">
            {history.surgeries?.length > 0 ? (
              <div className="surgeries-list">
                {history.surgeries.map((surgery, index) => (
                  <div key={index} className="surgery-card card">
                    <div className="surgery-header">
                      <h3>{surgery.name}</h3>
                      <span className="surgery-date">{surgery.date}</span>
                    </div>
                    <p className="surgery-hospital">{surgery.hospital || 'Hospital not specified'}</p>
                    {surgery.notes && (
                      <p className="surgery-notes">{surgery.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No surgeries recorded</p>
            )}
          </div>
        )}

        {activeTab === 'family' && (
          <div className="family-section">
            {history.family?.length > 0 ? (
              <div className="family-list">
                {history.family.map((item, index) => (
                  <div key={index} className="family-card card">
                    <div className="family-header">
                      <h3>{item.relation}</h3>
                    </div>
                    <p className="family-condition">Conditions: {item.conditions.join(', ')}</p>
                    {item.notes && (
                      <p className="family-notes">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No family history recorded</p>
            )}
          </div>
        )}
      </div>

      <div className="history-summary card">
        <h3>Health Summary</h3>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Blood Type</span>
            <span className="stat-value">{history.bloodType || 'Unknown'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Chronic Conditions</span>
            <span className="stat-value">{history.conditions?.filter(c => c.isChronic).length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Allergies</span>
            <span className="stat-value">{history.allergies?.length || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Past Surgeries</span>
            <span className="stat-value">{history.surgeries?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistory;