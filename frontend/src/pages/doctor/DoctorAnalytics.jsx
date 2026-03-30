// src/pages/doctor/DoctorAnalytics.jsx
import React, { useState, useEffect } from 'react';

const DoctorAnalytics = ({ doctorData, getAuthHeaders }) => {
  const [period, setPeriod] = useState('week');
  const [stats, setStats] = useState({
    totalPatients: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    averageWaitTime: 0,
    revenue: 0,
    patientSatisfaction: 0
  });
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/doctor/analytics.php?period=${period}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setDailyData(data.dailyData || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading analytics...</div>;
  }

  return (
    <div className="doctor-analytics">
      <div className="content-header">
        <h2>Analytics & Reports</h2>
        <div className="period-selector">
          <button className={`btn ${period === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('week')}>Week</button>
          <button className={`btn ${period === 'month' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('month')}>Month</button>
          <button className={`btn ${period === 'year' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('year')}>Year</button>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="analytics-content">
            <h3>Total Patients</h3>
            <p className="analytics-value">{stats.totalPatients}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="analytics-content">
            <h3>Completed</h3>
            <p className="analytics-value">{stats.completedAppointments}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="analytics-content">
            <h3>Cancelled</h3>
            <p className="analytics-value">{stats.cancelledAppointments}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="analytics-content">
            <h3>Avg Wait Time</h3>
            <p className="analytics-value">{stats.averageWaitTime} min</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="analytics-content">
            <h3>Revenue</h3>
            <p className="analytics-value">${stats.revenue}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <i className="fas fa-star"></i>
          </div>
          <div className="analytics-content">
            <h3>Satisfaction</h3>
            <p className="analytics-value">{stats.patientSatisfaction}%</p>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Daily Appointments</h3>
        <div className="bar-chart">
          {dailyData.map((day, index) => (
            <div key={index} className="chart-bar">
              <div className="bar" style={{ height: `${(day.count / 10) * 100}%` }}></div>
              <span className="bar-label">{day.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorAnalytics;