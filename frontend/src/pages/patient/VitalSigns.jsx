import React, { useState, useEffect } from 'react';
import "../../styles/theme.css";
import "../../styles/patient-components.css";

const VitalSigns = ({ patientId }) => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newVital, setNewVital] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    notes: ''
  });

  useEffect(() => {
    if (patientId) {
      fetchVitals();
    }
  }, [patientId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchVitals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/patient/vitals.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVitals(data.vitals || []);
      } else {
        setError(data.error || 'Failed to load vital signs');
      }
    } catch (error) {
      console.error('Error fetching vitals:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewVital({
      ...newVital,
      [e.target.name]: e.target.value
    });
  };

  const addVital = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/vitals/add.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          patientID: patientId,
          ...newVital
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowForm(false);
        setNewVital({
          bloodPressure: '',
          heartRate: '',
          temperature: '',
          weight: '',
          height: '',
          notes: ''
        });
        fetchVitals(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding vital:', error);
    }
  };

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightInM = height / 100;
    const bmi = weight / (heightInM * heightInM);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return '';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  if (loading) {
    return (
      <div className="vitals-loading">
        <div className="spinner"></div>
        <p>Loading vital signs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vitals-error">
        <p>Error: {error}</p>
        <button onClick={fetchVitals} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="vital-signs">
      <div className="content-header">
        <h2>Vital Signs</h2>
        <p>Track your health metrics</p>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="fas fa-plus"></i> Add New Reading
        </button>
      </div>

      {showForm && (
        <div className="vital-form card">
          <h3>Add Vital Signs</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Blood Pressure (systolic/diastolic)</label>
              <input
                type="text"
                name="bloodPressure"
                placeholder="e.g., 120/80"
                value={newVital.bloodPressure}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Heart Rate (bpm)</label>
              <input
                type="number"
                name="heartRate"
                placeholder="72"
                value={newVital.heartRate}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                placeholder="36.6"
                value={newVital.temperature}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                placeholder="70"
                value={newVital.weight}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input
                type="number"
                name="height"
                placeholder="170"
                value={newVital.height}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                name="notes"
                placeholder="Any additional notes..."
                value={newVital.notes}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addVital}>Save Reading</button>
          </div>
        </div>
      )}

      {vitals.length === 0 ? (
        <div className="no-vitals">
          <i className="fas fa-heartbeat fa-3x"></i>
          <h3>No Vital Signs Recorded</h3>
          <p>Start tracking your health by adding your first reading.</p>
        </div>
      ) : (
        <div className="vitals-history">
          {vitals.map((vital, index) => {
            const bmi = calculateBMI(vital.weight, vital.height);
            return (
              <div key={index} className="vital-card card">
                <div className="vital-header">
                  <span className="vital-date">
                    <i className="fas fa-calendar-alt"></i>
                    {new Date(vital.recordDate).toLocaleDateString()}
                  </span>
                  <span className="vital-time">
                    {new Date(vital.recordDate).toLocaleTimeString()}
                  </span>
                </div>
                <div className="vital-grid">
                  {vital.bloodPressure && (
                    <div className="vital-item">
                      <span className="vital-label">Blood Pressure</span>
                      <span className="vital-value">{vital.bloodPressure}</span>
                    </div>
                  )}
                  {vital.heartRate && (
                    <div className="vital-item">
                      <span className="vital-label">Heart Rate</span>
                      <span className="vital-value">{vital.heartRate} bpm</span>
                    </div>
                  )}
                  {vital.temperature && (
                    <div className="vital-item">
                      <span className="vital-label">Temperature</span>
                      <span className="vital-value">{vital.temperature}°C</span>
                    </div>
                  )}
                  {vital.weight && (
                    <div className="vital-item">
                      <span className="vital-label">Weight</span>
                      <span className="vital-value">{vital.weight} kg</span>
                    </div>
                  )}
                  {vital.height && (
                    <div className="vital-item">
                      <span className="vital-label">Height</span>
                      <span className="vital-value">{vital.height} cm</span>
                    </div>
                  )}
                  {bmi && (
                    <div className="vital-item bmi">
                      <span className="vital-label">BMI</span>
                      <span className="vital-value">{bmi}</span>
                      <span className="bmi-category">{getBMICategory(bmi)}</span>
                    </div>
                  )}
                </div>
                {vital.notes && (
                  <div className="vital-notes">
                    <i className="fas fa-sticky-note"></i>
                    <span>{vital.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VitalSigns;