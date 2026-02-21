// src/pages/patient/AppointmentBooking.jsx
import React, { useState, useEffect } from 'react';
import "../../styles/theme.css";
import "../../styles/patient-components.css";

const AppointmentBooking = ({ patientData, getAuthHeaders, onBack }) => {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // حالة نموذج الحجز
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (patientData?.patientID) {
      fetchUpcomingAppointments();
      fetchDepartments();
    }
  }, [patientData]);

  // جلب المواعيد القادمة - نسخة مصححة
  const fetchUpcomingAppointments = async () => {
    if (!patientData?.patientID) return;
    
    setLoading(true);
    try {
      console.log('Fetching appointments for patient:', patientData.patientID);
      
      const response = await fetch(`http://localhost:8000/api/patient/appointments.php?patientID=${patientData.patientID}`, {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      console.log('Appointments response:', data);
      
      if (data.success) {
        // تصفية المواعيد القادمة يدوياً
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcoming = data.appointments?.filter(app => {
          // تجاهل المواعيد الملغاة والمكتملة
          if (app.status === 'cancelled' || app.status === 'completed') {
            return false;
          }
          
          // مقارنة التاريخ
          const appDate = new Date(app.appointmentDate);
          return appDate >= today;
        }) || [];
        
        console.log('Filtered upcoming appointments:', upcoming);
        setUpcomingAppointments(upcoming);
      } else {
        console.error('Failed to fetch appointments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/shared/departments.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || []);
      } else {
        setDepartments([
          "Cardiology", "Neurology", "Pediatrics", "Orthopedics",
          "Dermatology", "Ophthalmology", "Dentistry", "Internal Medicine"
        ]);
      }
    } catch (error) {
      setDepartments([
        "Cardiology", "Neurology", "Pediatrics", "Orthopedics",
        "Dermatology", "Ophthalmology", "Dentistry", "Internal Medicine"
      ]);
    }
  };

  const fetchDoctors = async (department) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8000/api/doctor/doctors.php?specialization=${encodeURIComponent(department)}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setDoctors(data.doctors || []);
        if (data.doctors.length === 0) {
          setError('No doctors available in this department');
        }
      } else {
        setError('Failed to load doctors');
        setDoctors([]);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentSelect = (dept) => {
    setSelectedDepartment(dept);
    setSelectedDoctor(null);
    fetchDoctors(dept);
    setStep(2);
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setStep(3);
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentTime || !reason) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // دمج التاريخ والوقت
      const dateTime = `${appointmentDate} ${appointmentTime}:00`;
      
      const appointmentData = {
        patientID: patientData?.patientID,
        doctorID: selectedDoctor?.doctorID,
        appointmentDate: dateTime,
        type: 'consultation',
        reason: reason,
        notes: ''
      };

      console.log('Booking appointment:', appointmentData);

      const response = await fetch('http://localhost:8000/api/patient/appointments.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(appointmentData)
      });

      const data = await response.json();
      console.log('Booking response:', data);

      if (data.success) {
        alert('Appointment booked successfully!');
        resetForm();
        setShowBookingForm(false);
        await fetchUpcomingAppointments(); // تحديث القائمة
      } else {
        setError(data.error || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDepartment('');
    setSelectedDoctor(null);
    setAppointmentDate('');
    setAppointmentTime('');
    setReason('');
    setError('');
  };

  const handleCancelAppointment = async (appointmentID) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/patient/appointments.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'cancel',
          appointmentID: appointmentID
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Appointment cancelled successfully');
        await fetchUpcomingAppointments(); // تحديث القائمة
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Network error. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // إذا كان التحميل جارياً
  if (loading && !upcomingAppointments.length) {
    return (
      <div className="appointment-booking">
        <div className="content-header">
          <button className="btn btn-secondary back-btn" onClick={onBack}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2>APPOINTMENTS</h2>
        </div>
        <div className="loading-spinner">Loading your appointments...</div>
      </div>
    );
  }

  return (
    <div className="appointment-booking">
      <div className="content-header">
        <button className="btn btn-secondary back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2>APPOINTMENTS</h2>
      </div>

      {/* زر إضافة موعد جديد */}
      {!showBookingForm && (
        <button 
          className="btn btn-primary new-appointment-btn"
          onClick={() => setShowBookingForm(true)}
        >
          <i className="fas fa-plus-circle"></i> Book New Appointment
        </button>
      )}

      {/* قائمة المواعيد القادمة */}
      {!showBookingForm && (
        <div className="upcoming-appointments-section">
          <h3>Your Upcoming Appointments</h3>
          {upcomingAppointments.length === 0 ? (
            <div className="no-appointments">
              <i className="fas fa-calendar-times fa-3x"></i>
              <p>You have no upcoming appointments</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowBookingForm(true)}
              >
                Book Your First Appointment
              </button>
            </div>
          ) : (
            <div className="appointments-grid">
              {upcomingAppointments.map((app, index) => (
                <div key={index} className="appointment-card">
                  <div className="appointment-card-header">
                    <span className={`status-badge ${app.status}`}>
                      {app.status}
                    </span>
                    <button 
                      className="cancel-btn"
                      onClick={() => handleCancelAppointment(app.appointmentID)}
                      title="Cancel Appointment"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="appointment-card-body">
                    <div className="doctor-info-compact">
                      <div className="doctor-avatar-small">
                        {app.doctorName?.split(' ').map(n => n[0]).join('') || 'DR'}
                      </div>
                      <div>
                        <h4>{app.doctorName || 'Doctor'}</h4>
                        <p className="doctor-specialty">{app.department || 'General'}</p>
                      </div>
                    </div>
                    <div className="appointment-datetime">
                      <div className="datetime-item">
                        <i className="fas fa-calendar-alt"></i>
                        <span>{formatDate(app.appointmentDate)}</span>
                      </div>
                      <div className="datetime-item">
                        <i className="fas fa-clock"></i>
                        <span>{formatTime(app.appointmentDate)}</span>
                      </div>
                    </div>
                    <div className="appointment-reason">
                      <strong>Reason:</strong> {app.reason || 'Not specified'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* نموذج حجز موعد جديد */}
      {showBookingForm && (
        <div className="booking-form-section">
          <div className="booking-form-header">
            <h3>Book New Appointment</h3>
            <button 
              className="btn btn-secondary close-form-btn"
              onClick={() => {
                setShowBookingForm(false);
                resetForm();
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span>Department</span>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span>Doctor</span>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span>Confirm</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {step === 1 && (
            <div className="departments-grid">
              {departments.map((dept, index) => (
                <button
                  key={index}
                  className="department-btn"
                  onClick={() => handleDepartmentSelect(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="doctors-list">
              <h4>Available Doctors in {selectedDepartment}</h4>
              {loading ? (
                <div className="loading-spinner">Loading doctors...</div>
              ) : doctors.length > 0 ? (
                doctors.map((doctor, index) => (
                  <div 
                    key={index} 
                    className="doctor-card" 
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    <h4>{doctor.fullName}</h4>
                    <p><strong>Specialization:</strong> {doctor.specialization}</p>
                    <p><strong>Fee:</strong> ${doctor.consultationFee}</p>
                    {doctor.experience > 0 && <p><strong>Experience:</strong> {doctor.experience} years</p>}
                  </div>
                ))
              ) : (
                <p>No doctors available in this department</p>
              )}
            </div>
          )}

          {step === 3 && selectedDoctor && (
            <div className="booking-confirm">
              <h4>Confirm Appointment Details</h4>
              
              <div className="summary-card">
                <p><strong>Doctor:</strong> {selectedDoctor.fullName}</p>
                <p><strong>Department:</strong> {selectedDepartment}</p>
                <p><strong>Specialization:</strong> {selectedDoctor.specialization}</p>
                <p><strong>Fee:</strong> ${selectedDoctor.consultationFee}</p>
              </div>
              
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  value={appointmentDate} 
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Time</label>
                <input 
                  type="time" 
                  value={appointmentTime} 
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Reason for Visit</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for visit"
                  rows="3"
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={loading}>
                  Back
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleBookAppointment}
                  disabled={!appointmentDate || !appointmentTime || !reason || loading}
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentBooking;