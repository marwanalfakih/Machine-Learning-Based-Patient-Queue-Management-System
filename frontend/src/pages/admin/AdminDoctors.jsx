// src/pages/admin/AdminDoctors.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminDoctors = ({ adminData, getAuthHeaders, showNotification }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalAppointments: 0
  });

  // نموذج إضافة طبيب
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    licenseNumber: '',
    qualifications: '',
    department: '',
    yearsOfExperience: '',
    consultationFee: '',
    isAvailable: true
  });

  useEffect(() => {
    // التحقق من وجود action في URL
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setShowAddModal(true);
    }
    
    fetchDoctors();
    //fetchSpecialties();
  }, [location, filterSpecialty, filterStatus]);

  // fetchDoctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      console.log('Fetching doctors...');
      
      // بناء URL مع معاملات الفلتر
      let url = 'http://localhost:8000/api/admin/doctors.php';
      const params = new URLSearchParams();
      
      // إضافة فلتر التخصص إذا لم يكن 'all'
      if (filterSpecialty !== 'all') {
        params.append('specialization', filterSpecialty);
      }
      
      // إضافة معلمات أخرى إذا لزم الأمر
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      console.log('Fetching URL:', url);
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        console.log('Unauthorized - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        let filteredDoctors = data.doctors || [];
        
        if (filterStatus !== 'all') {
          filteredDoctors = filteredDoctors.filter(d => 
            filterStatus === 'active' ? d.isAvailable : !d.isAvailable
          );
        }
        
        setDoctors(filteredDoctors);
        
        setStats({
          total: data.total || filteredDoctors.length,
          active: filteredDoctors.filter(d => d.isAvailable).length,
          inactive: filteredDoctors.filter(d => !d.isAvailable).length,
          totalAppointments: filteredDoctors.reduce((sum, d) => sum + (d.totalAppointments || 0), 0)
        });
      } else {
        showNotification('error', data.error || 'Failed to load doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      showNotification('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      // جلب جميع التخصصات المختلفة من الأطباء
      const response = await fetch('http://localhost:8000/api/admin/doctors.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success && data.doctors) {
        const uniqueSpecialties = [...new Set(data.doctors.map(d => d.specialization).filter(Boolean))];
        setSpecialties(uniqueSpecialties);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/doctors.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'create',
          ...formData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Doctor added successfully');
        setShowAddModal(false);
        resetForm();
        fetchDoctors();
        navigate('/admin/doctors');
      } else {
        showNotification('error', data.error || 'Failed to add doctor');
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/doctors.php', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          doctorID: selectedDoctor.doctorID,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          specialization: formData.specialization,
          licenseNumber: formData.licenseNumber,
          qualifications: formData.qualifications,
          department: formData.department,
          yearsOfExperience: formData.yearsOfExperience,
          consultationFee: formData.consultationFee,
          isAvailable: formData.isAvailable
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Doctor updated successfully');
        setShowEditModal(false);
        resetForm();
        fetchDoctors();
      } else {
        showNotification('error', data.error || 'Failed to update doctor');
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleToggleStatus = async (doctorId, currentStatus) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/doctors.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'toggle-availability',
          doctorID: doctorId,
          isAvailable: currentStatus ? 0 : 1
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', `Doctor ${currentStatus ? 'deactivated' : 'activated'} successfully`);
        fetchDoctors();
      } else {
        showNotification('error', data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/doctors.php', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ doctorID: doctorId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Doctor deleted successfully');
        fetchDoctors();
      } else {
        showNotification('error', data.error || 'Failed to delete doctor');
      }
    } catch (error) {
      console.error('Error deleting doctor:', error);
      showNotification('error', 'Network error');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      specialization: '',
      licenseNumber: '',
      qualifications: '',
      department: '',
      yearsOfExperience: '',
      consultationFee: '',
      isAvailable: true
    });
    setSelectedDoctor(null);
  };

  const openEditModal = (doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      username: doctor.username || '',
      fullName: doctor.fullName || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      password: '',
      specialization: doctor.specialization || '',
      licenseNumber: doctor.licenseNumber || '',
      qualifications: doctor.qualifications || '',
      department: doctor.department || '',
      yearsOfExperience: doctor.yearsOfExperience || '',
      consultationFee: doctor.consultationFee || '',
      isAvailable: doctor.isAvailable === 1 || doctor.isAvailable === true
    });
    setShowEditModal(true);
  };

  const viewDoctorDetails = (doctorId) => {
    navigate(`/admin/doctors?id=${doctorId}`);
    console.log('View doctor details:', doctorId);
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      doctor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading doctors...</p>
      </div>
    );
  }

  return (
    <div className="admin-doctors-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-user-md"></i>
          DOCTORS MANAGEMENT
        </h2>
        <div className="header-actions">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-user-md"></i> Add New Doctor
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards small">
        <div className="stat-card" onClick={() => setFilterStatus('all')}>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Doctors</span>
        </div>
        <div className="stat-card success" onClick={() => setFilterStatus('active')}>
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card warning" onClick={() => setFilterStatus('inactive')}>
          <span className="stat-value">{stats.inactive}</span>
          <span className="stat-label">Inactive</span>
        </div>
        <div className="stat-card info">
          <span className="stat-value">{stats.totalAppointments}</span>
          <span className="stat-label">Total Appointments</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select 
          value={filterSpecialty} 
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Specialties</option>
          {specialties.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>

        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button 
          className="btn btn-outline"
          onClick={fetchDoctors}
        >
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Doctors Grid */}
      <div className="doctors-grid">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map(doctor => (
            <div key={doctor.doctorID} className="doctor-card">
              <div className="doctor-card-header">
                <div className="doctor-avatar">
                  {doctor.initials || doctor.fullName?.split(' ').map(n => n[0]).join('') || 'DR'}
                </div>
                <div className="doctor-status">
                  <span className={`status-badge ${doctor.isAvailable ? 'active' : 'inactive'}`}>
                    {doctor.isAvailable ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="doctor-card-body">
                <h4>{doctor.fullName || 'Doctor Name'}</h4>
                <p className="specialty">{doctor.specialization || 'Specialty'}</p>
                
                <div className="doctor-details">
                  <p>
                    <i className="fas fa-id-card"></i>
                    <span>License: {doctor.licenseNumber || 'N/A'}</span>
                  </p>
                  <p>
                    <i className="fas fa-envelope"></i>
                    <span>{doctor.email || 'N/A'}</span>
                  </p>
                  <p>
                    <i className="fas fa-phone"></i>
                    <span>{doctor.phone || 'N/A'}</span>
                  </p>
                  <p>
                    <i className="fas fa-briefcase"></i>
                    <span>{doctor.yearsOfExperience || 0} years exp.</span>
                  </p>
                  <p>
                    <i className="fas fa-graduation-cap"></i>
                    <span>{doctor.qualifications || 'N/A'}</span>
                  </p>
                  <p>
                    <i className="fas fa-money-bill"></i>
                    <span>${doctor.consultationFee || 0} / visit</span>
                  </p>
                  <p>
                    <i className="fas fa-building"></i>
                    <span>{doctor.department || 'No department'}</span>
                  </p>
                </div>

                <div className="doctor-stats">
                  <div className="stat-item">
                    <span className="stat-value">{doctor.totalAppointments || 0}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{doctor.todayAppointments || 0}</span>
                    <span className="stat-label">Today</span>
                  </div>
                </div>
              </div>
              
              <div className="doctor-card-footer">
                <button 
                  className={`btn-icon ${doctor.isAvailable ? 'warning' : 'success'}`}
                  onClick={() => handleToggleStatus(doctor.doctorID, doctor.isAvailable)}
                  title={doctor.isAvailable ? 'Deactivate' : 'Activate'}
                >
                  <i className={`fas fa-${doctor.isAvailable ? 'ban' : 'check'}`}></i>
                </button>
                <button 
                  className="btn-icon info"
                  onClick={() => openEditModal(doctor)}
                  title="Edit"
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button 
                  className="btn-icon danger"
                  onClick={() => handleDeleteDoctor(doctor.doctorID)}
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
                <button 
                  className="btn-icon primary"
                  onClick={() => viewDoctorDetails(doctor.doctorID)}
                  title="View Details"
                >
                  <i className="fas fa-eye"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-user-md"></i>
            <p>No doctors found</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add First Doctor
            </button>
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-user-md"></i> Add New Doctor</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleAddDoctor} className="doctor-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-user-tag"></i> Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-envelope"></i> Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="doctor@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-phone"></i> Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-lock"></i> Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-stethoscope"></i> Specialization *</label>
                    <input
                      type="text"
                      required
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      placeholder="e.g., Cardiology"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-id-card"></i> License Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                      placeholder="Enter license number"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-graduation-cap"></i> Qualifications</label>
                    <input
                      type="text"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({...formData, qualifications: e.target.value})}
                      placeholder="e.g., MD, PhD"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-building"></i> Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      placeholder="Enter department"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-briefcase"></i> Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-money-bill"></i> Consultation Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={formData.consultationFee}
                      onChange={(e) => setFormData({...formData, consultationFee: e.target.value})}
                      placeholder="e.g., 50"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="checkbox-label single">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                      />
                      <span>Available for appointments</span>
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn btn-success">
                    <i className="fas fa-save"></i> Add Doctor
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-edit"></i> Edit Doctor</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleUpdateDoctor} className="doctor-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-user-tag"></i> Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-envelope"></i> Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="doctor@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-phone"></i> Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-lock"></i> Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Leave blank to keep current"
                    />
                    <small style={{ color: '#999', fontSize: '0.75rem', marginTop: '4px' }}>
                      <i className="fas fa-info-circle"></i> Leave empty to keep current password
                    </small>
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-stethoscope"></i> Specialization *</label>
                    <input
                      type="text"
                      required
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      placeholder="e.g., Cardiology"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-id-card"></i> License Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                      placeholder="Enter license number"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-graduation-cap"></i> Qualifications</label>
                    <input
                      type="text"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({...formData, qualifications: e.target.value})}
                      placeholder="e.g., MD, PhD"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-building"></i> Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      placeholder="Enter department"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-briefcase"></i> Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-money-bill"></i> Consultation Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={formData.consultationFee}
                      onChange={(e) => setFormData({...formData, consultationFee: e.target.value})}
                      placeholder="e.g., 50"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="checkbox-label single">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                      />
                      <span>Available for appointments</span>
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn btn-success">
                    <i className="fas fa-save"></i> Update Doctor
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;