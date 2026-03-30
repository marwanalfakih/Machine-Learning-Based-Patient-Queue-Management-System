// src/pages/doctor/DoctorPatients.jsx
import React, { useState, useEffect } from 'react';

const DoctorPatients = ({ doctorData, getAuthHeaders }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [filter, setFilter] = useState('all'); // all, recent, frequent

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:8000/api/doctor/patients.php?doctorID=${doctorData?.doctorID}`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                setPatients(data.patients || []);
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    // تصفية المرضى حسب البحث والفلاتر
    const filteredPatients = patients
        .filter(patient =>
            patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.patientID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.phone?.includes(searchTerm)
        )
        .sort((a, b) => {
            if (filter === 'recent') {
                return new Date(b.lastVisit) - new Date(a.lastVisit);
            } else if (filter === 'frequent') {
                return b.totalVisits - a.totalVisits;
            }
            return a.fullName?.localeCompare(b.fullName);
        });

    const viewPatientDetails = (patient) => {
        setSelectedPatient(patient);
    };

    const closePatientDetails = () => {
        setSelectedPatient(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No visits yet';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return <div className="loading-spinner">Loading patients...</div>;
    }

    return (
        <div className="doctor-patients">
            <div className="content-header">
                <h2>
                    <i className="fas fa-user-friends"></i>
                    My Patients
                </h2>
            </div>

            <div className="patients-header-controls">
                {/* Search Box - متوافق تماماً مع search-box-enhanced في CSS */}
                <div className="search-box-enhanced">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="Search by name, ID, or phone..."
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

                {/* Filter Buttons - متوافقة مع filter-btn في CSS */}
                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Patients
                    </button>
                    <button
                        className={`filter-btn ${filter === 'recent' ? 'active' : ''}`}
                        onClick={() => setFilter('recent')}
                    >
                        Most Recent
                    </button>
                    <button
                        className={`filter-btn ${filter === 'frequent' ? 'active' : ''}`}
                        onClick={() => setFilter('frequent')}
                    >
                        Most Frequent
                    </button>
                </div>
            </div>

            <div className="patients-list-container">
                {filteredPatients.length > 0 ? (
                    <div className="patients-vertical-list">
                        {filteredPatients.map((patient, index) => (
                            <div
                                key={index}
                                className="patient-list-item"
                                onClick={() => viewPatientDetails(patient)}
                            >
                                <div className="patient-item-avatar">
                                    {patient.initials || patient.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'PT'}
                                </div>

                                <div className="patient-item-info">
                                    <div className="patient-item-header">
                                        <h3>{patient.fullName}</h3>
                                        <span className="patient-item-id">ID: {patient.patientID}</span>
                                    </div>

                                    <div className="patient-item-details">
                                        <div className="patient-item-detail">
                                            <i className="fas fa-phone-alt"></i>
                                            <span>{patient.phone || 'No phone'}</span>
                                        </div>
                                        <div className="patient-item-detail">
                                            <i className="fas fa-envelope"></i>
                                            <span>{patient.email || 'No email'}</span>
                                        </div>
                                        <div className="patient-item-detail">
                                            <i className="fas fa-calendar-check"></i>
                                            <span>Last visit: {formatDate(patient.lastVisit)}</span>
                                        </div>
                                        <div className="patient-item-detail">
                                            <i className="fas fa-clock"></i>
                                            <span>{patient.totalVisits || 0} total visits</span>
                                        </div>
                                    </div>

                                    <div className="patient-item-tags">
                                        {patient.bloodType && (
                                            <span className="patient-tag blood-tag">{patient.bloodType}</span>
                                        )}
                                        {patient.allergies && (
                                            <span className="patient-tag allergy-tag">Has Allergies</span>
                                        )}
                                        {patient.medicalHistory && (
                                            <span className="patient-tag history-tag">Has Medical History</span>
                                        )}
                                    </div>
                                </div>

                                <div className="patient-item-actions">
                                    <button className="btn-icon" title="View Details">
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-patients">
                        <i className="fas fa-users fa-3x"></i>
                        <h3>No Patients Found</h3>
                        <p>
                            {searchTerm
                                ? `No patients matching "${searchTerm}"`
                                : "Your patients will appear here after consultations."}
                        </p>
                        {searchTerm && (
                            <button className="btn btn-primary" onClick={() => setSearchTerm('')}>
                                Clear Search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Patient Details Modal */}
            {selectedPatient && (
                <div className="modal-overlay" onClick={closePatientDetails}>
                    <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <i className="fas fa-user-circle"></i>
                                Patient Details
                            </h3>
                            <button className="close-btn" onClick={closePatientDetails}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="patient-profile-header">
                                <div className="patient-profile-avatar">
                                    {selectedPatient.initials || selectedPatient.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'PT'}
                                </div>
                                <div className="patient-profile-info">
                                    <h2>{selectedPatient.fullName}</h2>
                                    <p className="patient-profile-id">Patient ID: {selectedPatient.patientID}</p>
                                    <div className="patient-profile-stats">
                                        <div className="profile-stat">
                                            <span className="stat-label">Age</span>
                                            <span className="stat-value">{selectedPatient.age || 'N/A'}</span>
                                        </div>
                                        <div className="profile-stat">
                                            <span className="stat-label">Gender</span>
                                            <span className="stat-value">{selectedPatient.gender || 'N/A'}</span>
                                        </div>
                                        <div className="profile-stat">
                                            <span className="stat-label">Blood Type</span>
                                            <span className="stat-value">{selectedPatient.bloodType || 'N/A'}</span>
                                        </div>
                                        <div className="profile-stat">
                                            <span className="stat-label">Visits</span>
                                            <span className="stat-value">{selectedPatient.totalVisits || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="patient-details-grid">
                                <div className="patient-detail-section">
                                    <h4>
                                        <i className="fas fa-address-card"></i>
                                        Contact Information
                                    </h4>
                                    <div className="detail-list">
                                        <div className="detail-item">
                                            <span className="detail-icon"><i className="fas fa-phone"></i></span>
                                            <div className="detail-content">
                                                <span className="detail-label">Phone</span>
                                                <span className="detail-value">{selectedPatient.phone || 'Not provided'}</span>
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-icon"><i className="fas fa-envelope"></i></span>
                                            <div className="detail-content">
                                                <span className="detail-label">Email</span>
                                                <span className="detail-value">{selectedPatient.email || 'Not provided'}</span>
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-icon"><i className="fas fa-calendar-alt"></i></span>
                                            <div className="detail-content">
                                                <span className="detail-label">Date of Birth</span>
                                                <span className="detail-value">
                                                    {selectedPatient.dateOfBirth
                                                        ? new Date(selectedPatient.dateOfBirth).toLocaleDateString()
                                                        : 'Not provided'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="patient-detail-section">
                                    <h4>
                                        <i className="fas fa-notes-medical"></i>
                                        Medical History
                                    </h4>
                                    <div className="medical-history-content">
                                        {selectedPatient.medicalHistory ? (
                                            <p>{selectedPatient.medicalHistory}</p>
                                        ) : (
                                            <p className="no-data">No medical history recorded</p>
                                        )}
                                    </div>
                                </div>

                                <div className="patient-detail-section">
                                    <h4>
                                        <i className="fas fa-allergies"></i>
                                        Allergies
                                    </h4>
                                    <div className="allergies-content">
                                        {selectedPatient.allergies ? (
                                            <div className="allergies-list">
                                                {selectedPatient.allergies.split(',').map((allergy, i) => (
                                                    <span key={i} className="allergy-badge">{allergy.trim()}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-data">No known allergies</p>
                                        )}
                                    </div>
                                </div>

                                <div className="patient-detail-section full-width">
                                    <h4>
                                        <i className="fas fa-history"></i>
                                        Recent Appointments
                                    </h4>
                                    {selectedPatient.recentAppointments?.length > 0 ? (
                                        <div className="recent-appointments-list">
                                            {selectedPatient.recentAppointments.map((app, i) => (
                                                <div key={i} className="appointment-history-item">
                                                    <div className="appointment-history-date">
                                                        <i className="fas fa-calendar-day"></i>
                                                        {new Date(app.appointmentDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="appointment-history-type">{app.type}</div>
                                                    <div className="appointment-history-status">
                                                        <span className={`status-badge ${app.status}`}>{app.status}</span>
                                                    </div>
                                                    <div className="appointment-history-doctor">{app.doctorName}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="no-data">No recent appointments</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-primary">
                                <i className="fas fa-calendar-plus"></i>
                                Schedule Appointment
                            </button>
                            <button className="btn btn-secondary">
                                <i className="fas fa-file-medical"></i>
                                View Medical Records
                            </button>
                            <button className="btn btn-outline" onClick={closePatientDetails}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorPatients;