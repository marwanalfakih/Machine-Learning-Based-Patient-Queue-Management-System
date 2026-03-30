// src/pages/admin/AdminNotifications.jsx
import React, { useState, useEffect } from 'react';

const AdminNotifications = ({ adminData, getAuthHeaders, showNotification }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // تحديث الإشعارات كل 30 ثانية
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const url = filter !== 'all' 
        ? `http://localhost:8000/api/admin/notifications.php?type=${filter}`
        : 'http://localhost:8000/api/admin/notifications.php';
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/notifications/mark-read.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notificationId })
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, isRead: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/notifications/mark-all-read.php', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        showNotification('success', 'All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      showNotification('error', 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Delete this notification?')) return;

    try {
      const response = await fetch('http://localhost:8000/api/admin/notifications/delete.php', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notificationId })
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        showNotification('success', 'Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      showNotification('error', 'Failed to delete notification');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Delete all notifications? This action cannot be undone.')) return;

    try {
      const response = await fetch('http://localhost:8000/api/admin/notifications/clear-all.php', {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        setNotifications([]);
        showNotification('success', 'All notifications cleared');
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      showNotification('error', 'Failed to clear notifications');
    }
  };

  const viewDetails = (notification) => {
    setSelectedNotification(notification);
    setShowDetails(true);
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'appointment': return 'fa-calendar-check';
      case 'queue': return 'fa-users';
      case 'patient': return 'fa-user-plus';
      case 'doctor': return 'fa-user-md';
      case 'system': return 'fa-server';
      case 'alert': return 'fa-exclamation-triangle';
      case 'success': return 'fa-check-circle';
      default: return 'fa-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'appointment': return '#3498db';
      case 'queue': return '#f39c12';
      case 'patient': return '#2ecc71';
      case 'doctor': return '#9b59b6';
      case 'system': return '#95a5a6';
      case 'alert': return '#e74c3c';
      case 'success': return '#27ae60';
      default: return '#667eea';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="admin-notifications-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-bell"></i>
          NOTIFICATIONS
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} new</span>
          )}
        </h2>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button 
              className="btn btn-outline"
              onClick={markAllAsRead}
            >
              <i className="fas fa-check-double"></i>
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              className="btn btn-outline-danger"
              onClick={clearAll}
            >
              <i className="fas fa-trash"></i>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notification-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
          <span className="count">{notifications.length}</span>
        </button>
        <button 
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
          <span className="count">{unreadCount}</span>
        </button>
        <button 
          className={`filter-btn ${filter === 'appointment' ? 'active' : ''}`}
          onClick={() => setFilter('appointment')}
        >
          Appointments
        </button>
        <button 
          className={`filter-btn ${filter === 'queue' ? 'active' : ''}`}
          onClick={() => setFilter('queue')}
        >
          Queue
        </button>
        <button 
          className={`filter-btn ${filter === 'patient' ? 'active' : ''}`}
          onClick={() => setFilter('patient')}
        >
          Patients
        </button>
        <button 
          className={`filter-btn ${filter === 'system' ? 'active' : ''}`}
          onClick={() => setFilter('system')}
        >
          System
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => viewDetails(notification)}
            >
              <div 
                className="notification-icon"
                style={{ backgroundColor: getNotificationColor(notification.type) }}
              >
                <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
              </div>
              
              <div className="notification-content">
                <div className="notification-header">
                  <h4>{notification.title}</h4>
                  <span className="notification-time">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                
                <p className="notification-message">
                  {notification.message}
                </p>
                
                <div className="notification-footer">
                  <span className="notification-type">
                    {notification.type}
                  </span>
                  {notification.relatedId && (
                    <span className="notification-related">
                      ID: {notification.relatedId}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="notification-actions">
                {!notification.isRead && (
                  <button 
                    className="mark-read"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    title="Mark as read"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                )}
                <button 
                  className="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  title="Delete"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-bell-slash"></i>
            <p>No notifications</p>
            <small>You're all caught up!</small>
          </div>
        )}
      </div>

      {/* Notification Details Modal */}
      {showDetails && selectedNotification && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Notification Details</h3>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>

            <div className="notification-details">
              <div className="detail-header">
                <div 
                  className="detail-icon"
                  style={{ backgroundColor: getNotificationColor(selectedNotification.type) }}
                >
                  <i className={`fas ${getNotificationIcon(selectedNotification.type)}`}></i>
                </div>
                <div className="detail-title">
                  <h4>{selectedNotification.title}</h4>
                  <span className="detail-time">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="detail-message">
                <p>{selectedNotification.message}</p>
              </div>

              {selectedNotification.details && (
                <div className="detail-additional">
                  <h5>Additional Information</h5>
                  <pre>{JSON.stringify(selectedNotification.details, null, 2)}</pre>
                </div>
              )}

              <div className="detail-metadata">
                <div className="metadata-item">
                  <span className="label">Type:</span>
                  <span className="value">{selectedNotification.type}</span>
                </div>
                {selectedNotification.relatedId && (
                  <div className="metadata-item">
                    <span className="label">Related ID:</span>
                    <span className="value">{selectedNotification.relatedId}</span>
                  </div>
                )}
                <div className="metadata-item">
                  <span className="label">Status:</span>
                  <span className={`value ${selectedNotification.isRead ? 'read' : 'unread'}`}>
                    {selectedNotification.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>

              <div className="detail-actions">
                {selectedNotification.link && (
                  <a 
                    href={selectedNotification.link} 
                    className="btn btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    View Details
                  </a>
                )}
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    deleteNotification(selectedNotification.id);
                    setShowDetails(false);
                  }}
                >
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;