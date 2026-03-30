// src/pages/admin/AdminQueue.jsx
import React, { useState, useEffect } from 'react';

const AdminQueue = ({ adminData, getAuthHeaders, showNotification }) => {
  const [queueData, setQueueData] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    inProgress: 0,
    emergency: 0,
    averageWaitTime: 0
  });

  useEffect(() => {
    fetchQueueData();
    fetchDoctors();
    
    // تحديث كل 30 ثانية
    const interval = setInterval(fetchQueueData, 30000);
    return () => clearInterval(interval);
  }, [selectedDoctor, selectedDate]);

  const fetchQueueData = async () => {
    try {
      let url = `http://localhost:8000/api/admin/queue.php?date=${selectedDate}`;
      
      if (selectedDoctor !== 'all') {
        url += `&doctorID=${selectedDoctor}`;
      }
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setQueueData(data.queue || []);
        setStats(data.stats || {
          total: 0,
          waiting: 0,
          inProgress: 0,
          emergency: 0,
          averageWaitTime: 0
        });
      } else {
        showNotification('error', data.error || 'Failed to load queue');
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
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

  const handleRemoveFromQueue = async (queueId) => {
    if (!window.confirm('Remove this patient from queue?')) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/queue.php', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ queueID: queueId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Patient removed from queue');
        fetchQueueData();
      } else {
        showNotification('error', data.error || 'Failed to remove patient');
      }
    } catch (error) {
      console.error('Error removing from queue:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleUpdatePriority = async (queueId, priority) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/queue.php', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          queueID: queueId,
          priority: priority
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', `Priority updated to ${priority}`);
        fetchQueueData();
      } else {
        showNotification('error', data.error || 'Failed to update priority');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      showNotification('error', 'Network error');
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'emergency': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'normal': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading queue data...</p>
      </div>
    );
  }

  return (
    <div className="admin-queue-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-users"></i>
          QUEUE MONITOR
        </h2>
        <div className="header-actions">
          <div className="date-filter">
            <i className="fas fa-calendar-alt"></i>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>
          <select 
            className="doctor-filter"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="all">All Doctors</option>
            {doctors.map(doc => (
              <option key={doc.doctorID} value={doc.doctorID}>
                Dr. {doc.name} - {doc.specialization}
              </option>
            ))}
          </select>
          <button 
            className="btn btn-outline"
            onClick={fetchQueueData}
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="queue-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total in Queue</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{stats.waiting}</span>
          <span className="stat-label">Waiting</span>
        </div>
        <div className="stat-card info">
          <span className="stat-value">{stats.inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-value">{stats.emergency}</span>
          <span className="stat-label">Emergency</span>
        </div>
        <div className="stat-card success">
          <span className="stat-value">{stats.averageWaitTime} min</span>
          <span className="stat-label">Avg Wait</span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card">
        <div className="queue-table-container">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Check-in Time</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Est. Wait</th>
                <th>AI Prediction</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueData.length > 0 ? (
                queueData.map((item, index) => (
                  <tr key={item.queueID} className={item.priority}>
                    <td>
                      <span className="position-badge">#{item.queueNumber || index + 1}</span>
                    </td>
                    <td>
                      <div className="patient-cell">
                        <div className="patient-avatar-mini">
                          {item.patientInitials || item.patientName?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <strong>{item.patientName}</strong>
                          <div className="text-muted">Age: {item.patientAge || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>Dr. {item.doctorName}</strong>
                        <div className="text-muted">{item.specialization}</div>
                      </div>
                    </td>
                    <td>{formatTime(item.checkInTime)}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status === 'in-consultation' ? 'In Progress' : item.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className={`priority-select ${item.priority}`}
                        value={item.priority || 'normal'}
                        onChange={(e) => handleUpdatePriority(item.queueID, e.target.value)}
                        style={{ backgroundColor: getPriorityColor(item.priority) }}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </td>
                    <td>
                      <div className="wait-time">
                        <span className="minutes">{item.estimatedWaitMinutes || item.estimatedWait}</span>
                      </div>
                    </td>
                    <td>
                      {item.aiPredictedWait ? (
                        <div className="ai-prediction">
                          <span className="ai-value">{item.aiPredictedWait} min</span>
                          <span className="ai-confidence">{item.aiConfidence}%</span>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon info"
                          onClick={() => window.open(`/admin/patients?id=${item.patientID}`, '_blank')}
                          title="View Patient"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="btn-icon danger"
                          onClick={() => handleRemoveFromQueue(item.queueID)}
                          title="Remove from Queue"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-table">
                    <i className="fas fa-users"></i>
                    <p>No patients in queue</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Predictions Panel */}
      {queueData.some(item => item.aiPredictedWait) && (
        <div className="ai-predictions-panel">
          <div className="panel-header">
            <i className="fas fa-robot"></i>
            <h3>AI QUEUE PREDICTIONS</h3>
            <span className="live-badge">LIVE</span>
          </div>
          <div className="predictions-summary">
            <div className="prediction-item">
              <span className="label">Average AI Confidence:</span>
              <span className="value">
                {Math.round(queueData.reduce((sum, item) => 
                  sum + (parseInt(item.aiConfidence) || 0), 0) / queueData.length)}%
              </span>
            </div>
            <div className="prediction-item">
              <span className="label">Peak Queue Time:</span>
              <span className="value">
                {queueData.length > 0 ? 
                  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </span>
            </div>
            <div className="prediction-item">
              <span className="label">Estimated Completion:</span>
              <span className="value">
                {new Date(Date.now() + stats.averageWaitTime * 60000).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQueue;