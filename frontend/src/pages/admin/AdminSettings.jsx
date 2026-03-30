// src/pages/admin/AdminSettings.jsx
import React, { useState, useEffect } from 'react';

const AdminSettings = ({ adminData, getAuthHeaders, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      systemName: 'Smart Healthcare System',
      systemEmail: 'admin@healthcare.com',
      systemPhone: '+966 123456789',
      address: 'Riyadh, Saudi Arabia',
      timezone: 'Asia/Riyadh',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      language: 'en'
    },
    appointment: {
      slotDuration: 30,
      maxAdvanceBooking: 30,
      minAdvanceBooking: 1,
      allowWeekends: false,
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      cancellationPolicy: '24',
      noShowPolicy: '3'
    },
    notification: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      appointmentReminders: true,
      reminderTime: '24',
      queueUpdates: true,
      marketingEmails: false,
      systemAlerts: true
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordExpiry: 90,
      twoFactorAuth: false,
      ipWhitelist: [],
      allowedDomains: [],
      sslRequired: true,
      maintenanceMode: false
    },
    ai: {
      enableAIPredictions: true,
      autoQueueAssignment: true,
      waitTimePrediction: true,
      peakTimePrediction: true,
      doctorRecommendation: true,
      confidenceThreshold: 0.7,
      modelUpdateFrequency: 'weekly',
      dataRetention: 90
    },
    integration: {
      googleMapsApi: '',
      twilioSid: '',
      twilioToken: '',
      twilioPhone: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      smtpEncryption: 'tls'
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/settings.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        setSettings(prev => ({
          ...prev,
          ...data.settings
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('http://localhost:8000/api/admin/settings/update.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          section: activeTab,
          settings: settings[activeTab]
        })
      });
      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Settings saved successfully');
      } else {
        showNotification('error', data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default? This action cannot be undone.')) {
      // Reset to defaults
      window.location.reload();
    }
  };

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-cogs"></i>
          SYSTEM SETTINGS
        </h2>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={handleReset}
          >
            <i className="fas fa-undo"></i>
            Reset to Default
          </button>
          <button 
            className="btn btn-success"
            onClick={handleSave}
            disabled={saving}
          >
            <i className="fas fa-save"></i>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <i className="fas fa-globe"></i>
          General
        </button>
        <button 
          className={`tab-btn ${activeTab === 'appointment' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointment')}
        >
          <i className="fas fa-calendar-alt"></i>
          Appointments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notification' ? 'active' : ''}`}
          onClick={() => setActiveTab('notification')}
        >
          <i className="fas fa-bell"></i>
          Notifications
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fas fa-shield-alt"></i>
          Security
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <i className="fas fa-robot"></i>
          AI Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'integration' ? 'active' : ''}`}
          onClick={() => setActiveTab('integration')}
        >
          <i className="fas fa-plug"></i>
          Integrations
        </button>
      </div>

      {/* Settings Content */}
      <div className="settings-content">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="settings-section">
            <h3>General Settings</h3>
            
            <div className="settings-grid">
              <div className="form-group">
                <label>System Name</label>
                <input
                  type="text"
                  value={settings.general.systemName}
                  onChange={(e) => handleChange('general', 'systemName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>System Email</label>
                <input
                  type="email"
                  value={settings.general.systemEmail}
                  onChange={(e) => handleChange('general', 'systemEmail', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>System Phone</label>
                <input
                  type="tel"
                  value={settings.general.systemPhone}
                  onChange={(e) => handleChange('general', 'systemPhone', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={settings.general.address}
                  onChange={(e) => handleChange('general', 'address', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Timezone</label>
                <select
                  value={settings.general.timezone}
                  onChange={(e) => handleChange('general', 'timezone', e.target.value)}
                >
                  <option value="Asia/Riyadh">Riyadh (UTC+3)</option>
                  <option value="Asia/Dubai">Dubai (UTC+4)</option>
                  <option value="Asia/Kuwait">Kuwait (UTC+3)</option>
                  <option value="Asia/Qatar">Qatar (UTC+3)</option>
                  <option value="Asia/Bahrain">Bahrain (UTC+3)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date Format</label>
                <select
                  value={settings.general.dateFormat}
                  onChange={(e) => handleChange('general', 'dateFormat', e.target.value)}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>

              <div className="form-group">
                <label>Time Format</label>
                <select
                  value={settings.general.timeFormat}
                  onChange={(e) => handleChange('general', 'timeFormat', e.target.value)}
                >
                  <option value="24h">24 Hours</option>
                  <option value="12h">12 Hours (AM/PM)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Language</label>
                <select
                  value={settings.general.language}
                  onChange={(e) => handleChange('general', 'language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Settings */}
        {activeTab === 'appointment' && (
          <div className="settings-section">
            <h3>Appointment Settings</h3>
            
            <div className="settings-grid">
              <div className="form-group">
                <label>Slot Duration (minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={settings.appointment.slotDuration}
                  onChange={(e) => handleChange('appointment', 'slotDuration', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Max Advance Booking (days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.appointment.maxAdvanceBooking}
                  onChange={(e) => handleChange('appointment', 'maxAdvanceBooking', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Min Advance Booking (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.appointment.minAdvanceBooking}
                  onChange={(e) => handleChange('appointment', 'minAdvanceBooking', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Working Hours Start</label>
                <input
                  type="time"
                  value={settings.appointment.workingHoursStart}
                  onChange={(e) => handleChange('appointment', 'workingHoursStart', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Working Hours End</label>
                <input
                  type="time"
                  value={settings.appointment.workingHoursEnd}
                  onChange={(e) => handleChange('appointment', 'workingHoursEnd', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Break Start</label>
                <input
                  type="time"
                  value={settings.appointment.breakStart}
                  onChange={(e) => handleChange('appointment', 'breakStart', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Break End</label>
                <input
                  type="time"
                  value={settings.appointment.breakEnd}
                  onChange={(e) => handleChange('appointment', 'breakEnd', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Cancellation Policy (hours before)</label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.appointment.cancellationPolicy}
                  onChange={(e) => handleChange('appointment', 'cancellationPolicy', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>No Show Limit (per month)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.appointment.noShowPolicy}
                  onChange={(e) => handleChange('appointment', 'noShowPolicy', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.appointment.allowWeekends}
                    onChange={(e) => handleChange('appointment', 'allowWeekends', e.target.checked)}
                  />
                  Allow appointments on weekends
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h4>Working Days</h4>
              <div className="days-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <label key={day} className="day-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.appointment.workingDays.includes(day)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...settings.appointment.workingDays, day]
                          : settings.appointment.workingDays.filter(d => d !== day);
                        handleChange('appointment', 'workingDays', newDays);
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notification' && (
          <div className="settings-section">
            <h3>Notification Settings</h3>
            
            <div className="settings-grid">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.emailNotifications}
                    onChange={(e) => handleChange('notification', 'emailNotifications', e.target.checked)}
                  />
                  Enable Email Notifications
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.smsNotifications}
                    onChange={(e) => handleChange('notification', 'smsNotifications', e.target.checked)}
                  />
                  Enable SMS Notifications
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.pushNotifications}
                    onChange={(e) => handleChange('notification', 'pushNotifications', e.target.checked)}
                  />
                  Enable Push Notifications
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.appointmentReminders}
                    onChange={(e) => handleChange('notification', 'appointmentReminders', e.target.checked)}
                  />
                  Appointment Reminders
                </label>
              </div>

              <div className="form-group">
                <label>Reminder Time (hours before)</label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.notification.reminderTime}
                  onChange={(e) => handleChange('notification', 'reminderTime', parseInt(e.target.value))}
                  disabled={!settings.notification.appointmentReminders}
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.queueUpdates}
                    onChange={(e) => handleChange('notification', 'queueUpdates', e.target.checked)}
                  />
                  Queue Position Updates
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.marketingEmails}
                    onChange={(e) => handleChange('notification', 'marketingEmails', e.target.checked)}
                  />
                  Marketing Emails
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notification.systemAlerts}
                    onChange={(e) => handleChange('notification', 'systemAlerts', e.target.checked)}
                  />
                  System Alerts
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="settings-section">
            <h3>Security Settings</h3>
            
            <div className="settings-grid">
              <div className="form-group">
                <label>Session Timeout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Max Login Attempts</label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => handleChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Password Expiry (days)</label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.security.passwordExpiry}
                  onChange={(e) => handleChange('security', 'passwordExpiry', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.security.twoFactorAuth}
                    onChange={(e) => handleChange('security', 'twoFactorAuth', e.target.checked)}
                  />
                  Enable Two-Factor Authentication
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.security.sslRequired}
                    onChange={(e) => handleChange('security', 'sslRequired', e.target.checked)}
                  />
                  Force SSL/HTTPS
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.security.maintenanceMode}
                    onChange={(e) => handleChange('security', 'maintenanceMode', e.target.checked)}
                  />
                  Maintenance Mode
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h4>IP Whitelist</h4>
              <textarea
                rows="3"
                placeholder="Enter IP addresses (one per line)"
                value={settings.security.ipWhitelist.join('\n')}
                onChange={(e) => handleChange('security', 'ipWhitelist', e.target.value.split('\n'))}
              ></textarea>
            </div>

            <div className="settings-section">
              <h4>Allowed Domains (CORS)</h4>
              <textarea
                rows="3"
                placeholder="Enter domains (one per line)"
                value={settings.security.allowedDomains.join('\n')}
                onChange={(e) => handleChange('security', 'allowedDomains', e.target.value.split('\n'))}
              ></textarea>
            </div>
          </div>
        )}

        {/* AI Settings */}
        {activeTab === 'ai' && (
          <div className="settings-section">
            <h3>AI Settings</h3>
            
            <div className="settings-grid">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ai.enableAIPredictions}
                    onChange={(e) => handleChange('ai', 'enableAIPredictions', e.target.checked)}
                  />
                  Enable AI Predictions
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ai.autoQueueAssignment}
                    onChange={(e) => handleChange('ai', 'autoQueueAssignment', e.target.checked)}
                  />
                  Auto Queue Assignment
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ai.waitTimePrediction}
                    onChange={(e) => handleChange('ai', 'waitTimePrediction', e.target.checked)}
                  />
                  Wait Time Prediction
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ai.peakTimePrediction}
                    onChange={(e) => handleChange('ai', 'peakTimePrediction', e.target.checked)}
                  />
                  Peak Time Prediction
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ai.doctorRecommendation}
                    onChange={(e) => handleChange('ai', 'doctorRecommendation', e.target.checked)}
                  />
                  Doctor Recommendation
                </label>
              </div>

              <div className="form-group">
                <label>Confidence Threshold</label>
                <input
                  type="number"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={settings.ai.confidenceThreshold}
                  onChange={(e) => handleChange('ai', 'confidenceThreshold', parseFloat(e.target.value))}
                />
                <small>Minimum confidence for AI predictions</small>
              </div>

              <div className="form-group">
                <label>Model Update Frequency</label>
                <select
                  value={settings.ai.modelUpdateFrequency}
                  onChange={(e) => handleChange('ai', 'modelUpdateFrequency', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Data Retention (days)</label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.ai.dataRetention}
                  onChange={(e) => handleChange('ai', 'dataRetention', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Integration Settings */}
        {activeTab === 'integration' && (
          <div className="settings-section">
            <h3>API Integrations</h3>
            
            <div className="settings-section">
              <h4>Google Maps</h4>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="text"
                  value={settings.integration.googleMapsApi}
                  onChange={(e) => handleChange('integration', 'googleMapsApi', e.target.value)}
                  placeholder="Enter Google Maps API Key"
                />
              </div>
            </div>

            <div className="settings-section">
              <h4>SMS (Twilio)</h4>
              <div className="form-group">
                <label>Account SID</label>
                <input
                  type="text"
                  value={settings.integration.twilioSid}
                  onChange={(e) => handleChange('integration', 'twilioSid', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Auth Token</label>
                <input
                  type="password"
                  value={settings.integration.twilioToken}
                  onChange={(e) => handleChange('integration', 'twilioToken', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={settings.integration.twilioPhone}
                  onChange={(e) => handleChange('integration', 'twilioPhone', e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div className="settings-section">
              <h4>Email (SMTP)</h4>
              <div className="form-group">
                <label>SMTP Host</label>
                <input
                  type="text"
                  value={settings.integration.smtpHost}
                  onChange={(e) => handleChange('integration', 'smtpHost', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>SMTP Port</label>
                <input
                  type="number"
                  value={settings.integration.smtpPort}
                  onChange={(e) => handleChange('integration', 'smtpPort', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={settings.integration.smtpUser}
                  onChange={(e) => handleChange('integration', 'smtpUser', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={settings.integration.smtpPass}
                  onChange={(e) => handleChange('integration', 'smtpPass', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Encryption</label>
                <select
                  value={settings.integration.smtpEncryption}
                  onChange={(e) => handleChange('integration', 'smtpEncryption', e.target.value)}
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="settings-footer">
        <button 
          className="btn btn-outline"
          onClick={handleReset}
        >
          Cancel
        </button>
        <button 
          className="btn btn-success"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;