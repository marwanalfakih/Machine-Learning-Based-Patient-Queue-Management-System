// src/pages/doctor/DoctorSchedule.jsx
import React, { useState, useEffect } from 'react';

const DoctorSchedule = ({ doctorData, getAuthHeaders }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('day'); // day, week, month

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/doctor/appointments.php?date=${selectedDate}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#43a047';
      case 'in-progress': return '#fb8c00';
      case 'scheduled': return '#2a5298';
      case 'cancelled': return '#d32f2f';
      default: return '#757575';
    }
  };

  const handleDateChange = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading-spinner">Loading schedule...</div>;
  }

  return (
    <div className="doctor-schedule">
      <div className="content-header">
        <h2>My Schedule</h2>
        <div className="schedule-controls">
          <button className="btn btn-secondary" onClick={() => handleDateChange(-1)}>
            <i className="fas fa-chevron-left"></i> Previous Day
          </button>
          <span className="current-date">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <button className="btn btn-secondary" onClick={() => handleDateChange(1)}>
            Next Day <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <div className="schedule-view-controls">
        <button className={`btn ${view === 'day' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('day')}>Day</button>
        <button className={`btn ${view === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('week')}>Week</button>
        <button className={`btn ${view === 'month' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('month')}>Month</button>
      </div>

      <div className="schedule-timeline">
        <div className="time-slots">
          {Array.from({ length: 24 }, (_, i) => i + 0).map(hour => (
            <div key={hour} className="time-slot">
              <span className="time-label">{hour}:00</span>
              <div className="slot-content">
                {appointments
                  .filter(apt => new Date(apt.appointmentDate).getHours() === hour)
                  .map((apt, index) => (
                    <div key={index} className="appointment-block" style={{ backgroundColor: getStatusColor(apt.status) }}>
                      <span className="appointment-time">{formatTime(apt.appointmentDate)}</span>
                      <span className="appointment-patient">{apt.patientName}</span>
                      <span className="appointment-status">{apt.status}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorSchedule;