import React, { useState, useEffect } from 'react';
import "../../styles/theme.css";
import "../../styles/patient-components.css";

const Medication = ({ patientId }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState(null);

  useEffect(() => {
    if (patientId) {
      fetchMedications();
    }
  }, [patientId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/patient/medications.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMedications(data.medications || []);
      } else {
        setError(data.error || 'Failed to load medications');
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const markAsTaken = async (medicationId) => {
    try {
      const response = await fetch('http://localhost:8000/api/medications/taken.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          medicationID: medicationId,
          patientID: patientId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update medication status in UI
        setMedications(medications.map(med => 
          med.medicationID === medicationId 
            ? { ...med, lastTaken: new Date().toISOString() }
            : med
        ));
      }
    } catch (error) {
      console.error('Error marking medication as taken:', error);
    }
  };

  const isDueToday = (medication) => {
    if (!medication.lastTaken) return true;
    
    const lastTaken = new Date(medication.lastTaken);
    const today = new Date();
    
    return lastTaken.toDateString() !== today.toDateString();
  };

  if (loading) {
    return (
      <div className="medication-loading">
        <div className="spinner"></div>
        <p>Loading medications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="medication-error">
        <p>Error: {error}</p>
        <button onClick={fetchMedications} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="medication-tracker">
      <div className="content-header">
        <h2>Medication Tracker</h2>
        <p>Track your daily medications</p>
      </div>

      {medications.length === 0 ? (
        <div className="no-medications">
          <i className="fas fa-pills fa-3x"></i>
          <h3>No Medications Prescribed</h3>
          <p>Your prescribed medications will appear here.</p>
        </div>
      ) : (
        <>
          <div className="medications-summary">
            <div className="summary-card">
              <span className="summary-value">{medications.length}</span>
              <span className="summary-label">Total Medications</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">
                {medications.filter(m => isDueToday(m)).length}
              </span>
              <span className="summary-label">Due Today</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">
                {medications.filter(m => !isDueToday(m)).length}
              </span>
              <span className="summary-label">Taken Today</span>
            </div>
          </div>

          <div className="medications-list">
            {medications.map((medication, index) => (
              <div key={index} className={`medication-card ${isDueToday(medication) ? 'due' : 'taken'}`}>
                <div className="medication-header">
                  <div className="medication-icon">
                    <i className="fas fa-pills"></i>
                  </div>
                  <div className="medication-info">
                    <h3>{medication.medicationName}</h3>
                    <p className="medication-dosage">{medication.dosage} • {medication.frequency}</p>
                  </div>
                  <div className="medication-status">
                    {isDueToday(medication) ? (
                      <span className="status-badge due">Due</span>
                    ) : (
                      <span className="status-badge taken">Taken</span>
                    )}
                  </div>
                </div>

                <div className="medication-details">
                  <p><strong>Duration:</strong> {medication.duration || 'Ongoing'}</p>
                  <p><strong>Instructions:</strong> {medication.instructions || 'Take as directed'}</p>
                  {medication.lastTaken && (
                    <p><strong>Last Taken:</strong> {new Date(medication.lastTaken).toLocaleString()}</p>
                  )}
                </div>

                {isDueToday(medication) && (
                  <button 
                    className="btn btn-primary take-btn"
                    onClick={() => markAsTaken(medication.medicationID)}
                  >
                    <i className="fas fa-check"></i> Mark as Taken
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Medication;