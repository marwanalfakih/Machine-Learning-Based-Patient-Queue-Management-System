// src/pages/doctor/DoctorQueue.jsx
import React, { useState, useEffect } from 'react';

const DoctorQueue = ({ 
  doctorData, 
  queuePatients, 
  onUpdateQueueOrder, 
  onStartConsultation,
  getAuthHeaders 
}) => {
  const [queue, setQueue] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    if (queuePatients) {
      setQueue(queuePatients);
    }
  }, [queuePatients]);

  const filteredQueue = queue.filter(patient => {
    const matchesFilter = filter === 'all' || patient.status === filter;
    const matchesSearch = patient.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.patientID?.toString().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) return;
    
    const newQueue = [...queue];
    const draggedItemContent = newQueue[draggedItem];
    newQueue.splice(draggedItem, 1);
    newQueue.splice(index, 0, draggedItemContent);
    
    setQueue(newQueue);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    onUpdateQueueOrder(queue);
  };

  const handleResetQueue = async () => {
    if (window.confirm('Are you sure you want to reset the queue order?')) {
      const sortedQueue = [...queue].sort((a, b) => 
        new Date(a.checkInTime) - new Date(b.checkInTime)
      );
      setQueue(sortedQueue);
      await onUpdateQueueOrder(sortedQueue);
    }
  };

  const handleRemoveFromQueue = async (patientId) => {
    if (window.confirm('Are you sure you want to remove this patient from queue?')) {
      const updatedQueue = queue.filter(p => p.patientID !== patientId);
      setQueue(updatedQueue);
      await onUpdateQueueOrder(updatedQueue);
    }
  };

  const handleDelayPatient = async (patientId) => {
    alert('Delay functionality will be implemented');
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newQueue = [...queue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
    setQueue(newQueue);
    onUpdateQueueOrder(newQueue);
  };

  const handleMoveDown = (index) => {
    if (index === queue.length - 1) return;
    const newQueue = [...queue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    setQueue(newQueue);
    onUpdateQueueOrder(newQueue);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateWaitTime = (position) => {
    const avgConsultationTime = 15;
    return position * avgConsultationTime;
  };

  return (
    <div className="queue-management">
      <div className="queue-header">
        <div>
          <h2>QUEUE MANAGEMENT</h2>
          <p className="queue-subtitle">Manage and prioritize patient queue</p>
        </div>
        <div className="queue-stats">
          <div className="stat-badge">
            <span className="stat-value">{queue.length}</span>
            <span className="stat-label">In Queue</span>
          </div>
          <div className="stat-badge">
            <span className="stat-value">{queue.filter(p => p.status === 'checked-in').length}</span>
            <span className="stat-label">Checked In</span>
          </div>
          <div className="stat-badge">
            <span className="stat-value">{queue.filter(p => p.status === 'waiting').length}</span>
            <span className="stat-label">Waiting</span>
          </div>
        </div>
      </div>

      <div className="queue-controls">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'waiting' ? 'active' : ''}`}
            onClick={() => setFilter('waiting')}
          >
            Waiting
          </button>
          <button 
            className={`filter-btn ${filter === 'checked-in' ? 'active' : ''}`}
            onClick={() => setFilter('checked-in')}
          >
            Checked In
          </button>
        </div>

        <button className="btn btn-outline" onClick={handleResetQueue}>
          <i className="fas fa-sort-amount-down"></i> Reset Order
        </button>
      </div>

      <div className="queue-table-container">
        <table className="queue-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Patient Info</th>
              <th>Appointment</th>
              <th>Check-in Time</th>
              <th>Status</th>
              <th>Est. Wait</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueue.map((patient, index) => (
              <tr 
                key={patient.appointmentID || index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={draggedItem === index ? 'dragging' : ''}
              >
                <td className="queue-position">
                  <span className="position-number">#{index + 1}</span>
                  <i className="fas fa-grip-vertical drag-handle"></i>
                </td>
                <td>
                  <div className="patient-info">
                    <strong>{patient.patientName || 'Patient Name'}</strong>
                    <div className="patient-meta">
                      <span>ID: {patient.patientID || 'N/A'}</span>
                      <span>•</span>
                      <span>{patient.age || '35'}y</span>
                      <span>•</span>
                      <span>{patient.gender || 'F'}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="appointment-info">
                    <span className="appointment-type">Routine Checkup</span>
                    <span className="appointment-time">
                      <i className="far fa-clock"></i> {formatTime(patient.appointmentDate) || '2:00 PM'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="checkin-time">
                    <i className="fas fa-clock"></i> {formatTime(patient.checkInTime) || '1:55 PM'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${patient.status || 'waiting'}`}>
                    {patient.status === 'checked-in' ? 'Checked In' : patient.status || 'Waiting'}
                  </span>
                </td>
                <td>
                  <span className="wait-time">{calculateWaitTime(index)} min</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn start"
                      onClick={() => onStartConsultation(patient.appointmentID)}
                      title="Start Consultation"
                    >
                      <i className="fas fa-play"></i>
                    </button>
                    <button 
                      className="action-btn up"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Move Up"
                    >
                      <i className="fas fa-arrow-up"></i>
                    </button>
                    <button 
                      className="action-btn down"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === queue.length - 1}
                      title="Move Down"
                    >
                      <i className="fas fa-arrow-down"></i>
                    </button>
                    <button 
                      className="action-btn delay"
                      onClick={() => handleDelayPatient(patient.patientID)}
                      title="Delay Patient"
                    >
                      <i className="fas fa-hourglass-half"></i>
                    </button>
                    <button 
                      className="action-btn remove"
                      onClick={() => handleRemoveFromQueue(patient.patientID)}
                      title="Remove from Queue"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredQueue.length === 0 && (
          <div className="no-results">
            <i className="fas fa-users-slash"></i>
            <p>No patients found in queue</p>
          </div>
        )}
      </div>

      <div className="queue-summary">
        <h4>Queue Summary</h4>
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">Average Wait Time:</span>
            <span className="summary-value">
              {queue.length > 0 ? `${queue.length * 15} minutes` : 'N/A'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Estimated Completion:</span>
            <span className="summary-value">
              {new Date(Date.now() + (queue.length * 15 * 60000)).toLocaleTimeString()}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Peak Time:</span>
            <span className="summary-value">10:00 AM - 2:00 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorQueue;