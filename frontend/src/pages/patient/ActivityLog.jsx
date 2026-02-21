import React, { useState, useEffect } from 'react';

import "../../styles/theme.css";
import "../../styles/patient-components.css";

const ActivityLog = ({ patientId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (patientId) {
      fetchActivities();
    }
  }, [patientId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/patient/activities.php?patientID=${patientId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setActivities(data.activities || []);
      } else {
        setError(data.error || 'Failed to load activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'appointment': return 'fa-calendar-check';
      case 'medication': return 'fa-pills';
      case 'lab': return 'fa-flask';
      case 'prescription': return 'fa-prescription';
      case 'checkin': return 'fa-map-marker-alt';
      case 'ai': return 'fa-robot';
      default: return 'fa-circle';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'appointment': return '#2a5298';
      case 'medication': return '#43a047';
      case 'lab': return '#fb8c00';
      case 'prescription': return '#7b1fa2';
      case 'checkin': return '#00acc1';
      case 'ai': return '#e91e63';
      default: return '#757575';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="activity-loading">
        <div className="spinner"></div>
        <p>Loading activity log...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-error">
        <p>Error: {error}</p>
        <button onClick={fetchActivities} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <div className="content-header">
        <h2>Activity Log</h2>
        <p>Track all your healthcare activities</p>
      </div>

      <div className="activity-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'appointment' ? 'active' : ''}`}
          onClick={() => setFilter('appointment')}
        >
          Appointments
        </button>
        <button 
          className={`filter-btn ${filter === 'medication' ? 'active' : ''}`}
          onClick={() => setFilter('medication')}
        >
          Medications
        </button>
        <button 
          className={`filter-btn ${filter === 'lab' ? 'active' : ''}`}
          onClick={() => setFilter('lab')}
        >
          Lab Results
        </button>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="no-activities">
          <i className="fas fa-history fa-3x"></i>
          <h3>No Activities Found</h3>
          <p>Your activity history will appear here.</p>
        </div>
      ) : (
        <div className="activities-timeline">
          {filteredActivities.map((activity, index) => (
            <div key={index} className="timeline-item">
              <div className="timeline-icon" style={{ backgroundColor: getActivityColor(activity.type) }}>
                <i className={`fas ${getActivityIcon(activity.type)}`}></i>
              </div>
              <div className="timeline-content card">
                <div className="timeline-header">
                  <span className="activity-type">{activity.type}</span>
                  <span className="activity-time">{activity.time}</span>
                </div>
                <p className="activity-description">{activity.description}</p>
                {activity.details && (
                  <div className="activity-details">
                    {Object.entries(activity.details).map(([key, value]) => (
                      <div key={key} className="detail-item">
                        <strong>{key}:</strong> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;