// src/pages/admin/AdminAIModels.jsx
import React, { useState, useEffect } from 'react';

const AdminAIModels = ({ adminData, getAuthHeaders, showNotification }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [metrics, setMetrics] = useState({
    totalPredictions: 0,
    averageAccuracy: 0,
    lastTraining: null,
    activeModels: 0
  });

  useEffect(() => {
    fetchModels();
    fetchMetrics();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/ai-models.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setModels(data.models || []);
      } else {
        showNotification('error', data.error || 'Failed to load AI models');
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
      showNotification('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/ai-models/metrics.php', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics || {});
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleToggleModel = async (modelId, currentStatus) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/ai-models/toggle.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          modelID: modelId,
          isActive: !currentStatus
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', `Model ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchModels();
      } else {
        showNotification('error', data.error || 'Failed to update model');
      }
    } catch (error) {
      console.error('Error toggling model:', error);
      showNotification('error', 'Network error');
    }
  };

  const handleTrainModel = async (modelId) => {
    if (!window.confirm('Start training this model? This may take a few minutes.')) return;
    
    setTrainingStatus('training');
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/ai-models/train.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ modelID: modelId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Model training started');
        setTrainingStatus('completed');
        fetchModels();
      } else {
        showNotification('error', data.error || 'Failed to start training');
        setTrainingStatus('failed');
      }
    } catch (error) {
      console.error('Error training model:', error);
      showNotification('error', 'Network error');
      setTrainingStatus('failed');
    } finally {
      setTimeout(() => setTrainingStatus(null), 3000);
    }
  };

  const handleUpdateConfig = async (modelId, config) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/ai-models/config.php', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          modelID: modelId,
          config: config
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Model configuration updated');
        fetchModels();
      } else {
        showNotification('error', data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      showNotification('error', 'Network error');
    }
  };

  const viewModelDetails = (model) => {
    setSelectedModel(model);
    setShowDetailsModal(true);
  };

  const getModelIcon = (type) => {
    switch(type) {
      case 'wait-time': return 'fa-clock';
      case 'queue': return 'fa-users';
      case 'recommendation': return 'fa-thumbs-up';
      case 'peak-time': return 'fa-chart-line';
      default: return 'fa-robot';
    }
  };

  const getModelColor = (type) => {
    switch(type) {
      case 'wait-time': return '#3498db';
      case 'queue': return '#9b59b6';
      case 'recommendation': return '#2ecc71';
      case 'peak-time': return '#f39c12';
      default: return '#667eea';
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading AI models...</p>
      </div>
    );
  }

  return (
    <div className="admin-ai-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-robot"></i>
          AI MODELS MANAGEMENT
        </h2>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchModels}
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="ai-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="metric-content">
            <span className="metric-value">{metrics.totalPredictions}</span>
            <span className="metric-label">Total Predictions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-bullseye"></i>
          </div>
          <div className="metric-content">
            <span className="metric-value">{metrics.averageAccuracy}%</span>
            <span className="metric-label">Average Accuracy</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="metric-content">
            <span className="metric-value">
              {metrics.lastTraining ? new Date(metrics.lastTraining).toLocaleDateString() : 'N/A'}
            </span>
            <span className="metric-label">Last Training</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-microchip"></i>
          </div>
          <div className="metric-content">
            <span className="metric-value">{metrics.activeModels}</span>
            <span className="metric-label">Active Models</span>
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="models-grid">
        {models.length > 0 ? (
          models.map(model => (
            <div key={model.modelID} className="model-card">
              <div className="model-card-header" style={{ background: getModelColor(model.type) }}>
                <div className="model-icon">
                  <i className={`fas ${getModelIcon(model.type)}`}></i>
                </div>
                <div className="model-status">
                  <span className={`status-badge ${model.isActive ? 'active' : 'inactive'}`}>
                    {model.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="model-card-body">
                <h3>{model.name}</h3>
                <p className="model-description">{model.description}</p>

                <div className="model-stats">
                  <div className="stat-item">
                    <span className="stat-label">Version:</span>
                    <span className="stat-value">{model.version}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Accuracy:</span>
                    <span className="stat-value">{model.accuracy}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Last Trained:</span>
                    <span className="stat-value">
                      {model.lastTrained ? new Date(model.lastTrained).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Predictions:</span>
                    <span className="stat-value">{model.predictionsCount || 0}</span>
                  </div>
                </div>

                {model.parameters && (
                  <div className="model-parameters">
                    <h4>Parameters</h4>
                    <div className="parameters-list">
                      {Object.entries(model.parameters).map(([key, value]) => (
                        <div key={key} className="parameter-item">
                          <span className="parameter-key">{key}:</span>
                          <span className="parameter-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="model-card-footer">
                <button 
                  className={`btn-icon ${model.isActive ? 'warning' : 'success'}`}
                  onClick={() => handleToggleModel(model.modelID, model.isActive)}
                  title={model.isActive ? 'Deactivate' : 'Activate'}
                >
                  <i className={`fas fa-${model.isActive ? 'pause' : 'play'}`}></i>
                </button>
                <button 
                  className="btn-icon primary"
                  onClick={() => handleTrainModel(model.modelID)}
                  title="Train Model"
                  disabled={trainingStatus === 'training'}
                >
                  <i className={`fas fa-${trainingStatus === 'training' ? 'spinner fa-spin' : 'brain'}`}></i>
                </button>
                <button 
                  className="btn-icon info"
                  onClick={() => viewModelDetails(model)}
                  title="View Details"
                >
                  <i className="fas fa-chart-bar"></i>
                </button>
                <button 
                  className="btn-icon"
                  onClick={() => handleUpdateConfig(model.modelID, model.config)}
                  title="Configure"
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>

              {/* Training Progress */}
              {trainingStatus === 'training' && (
                <div className="training-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '45%' }}></div>
                  </div>
                  <span className="progress-label">Training in progress...</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-robot"></i>
            <p>No AI models found</p>
          </div>
        )}
      </div>

      {/* Model Details Modal */}
      {showDetailsModal && selectedModel && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Model Details: {selectedModel.name}</h3>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="model-details">
              <div className="details-header">
                <div className="model-badge" style={{ background: getModelColor(selectedModel.type) }}>
                  <i className={`fas ${getModelIcon(selectedModel.type)}`}></i>
                </div>
                <div className="model-info">
                  <h4>{selectedModel.name}</h4>
                  <p>{selectedModel.description}</p>
                  <div className="model-tags">
                    <span className="tag">v{selectedModel.version}</span>
                    <span className="tag">{selectedModel.type}</span>
                    <span className={`tag ${selectedModel.isActive ? 'active' : 'inactive'}`}>
                      {selectedModel.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="details-grid">
                <div className="details-section">
                  <h4>Performance Metrics</h4>
                  <div className="metrics-chart">
                    <div className="metric-row">
                      <span className="metric-name">Accuracy</span>
                      <div className="metric-bar">
                        <div className="bar-fill" style={{ width: `${selectedModel.accuracy}%` }}></div>
                      </div>
                      <span className="metric-value">{selectedModel.accuracy}%</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Precision</span>
                      <div className="metric-bar">
                        <div className="bar-fill" style={{ width: `${selectedModel.precision || 85}%` }}></div>
                      </div>
                      <span className="metric-value">{selectedModel.precision || 85}%</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Recall</span>
                      <div className="metric-bar">
                        <div className="bar-fill" style={{ width: `${selectedModel.recall || 82}%` }}></div>
                      </div>
                      <span className="metric-value">{selectedModel.recall || 82}%</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">F1 Score</span>
                      <div className="metric-bar">
                        <div className="bar-fill" style={{ width: `${selectedModel.f1Score || 83}%` }}></div>
                      </div>
                      <span className="metric-value">{selectedModel.f1Score || 83}%</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Training History</h4>
                  <div className="training-history">
                    {selectedModel.trainingHistory?.map((entry, idx) => (
                      <div key={idx} className="history-item">
                        <span className="history-date">{new Date(entry.date).toLocaleString()}</span>
                        <span className="history-accuracy">{entry.accuracy}%</span>
                        <span className="history-duration">{entry.duration}</span>
                      </div>
                    )) || (
                      <p className="text-muted">No training history available</p>
                    )}
                  </div>
                </div>

                <div className="details-section full-width">
                  <h4>Configuration Parameters</h4>
                  <pre className="config-json">
                    {JSON.stringify(selectedModel.parameters || {}, null, 2)}
                  </pre>
                </div>

                <div className="details-section full-width">
                  <h4>Recent Predictions</h4>
                  <table className="predictions-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Input</th>
                        <th>Prediction</th>
                        <th>Confidence</th>
                        <th>Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedModel.recentPredictions?.map((pred, idx) => (
                        <tr key={idx}>
                          <td>{new Date(pred.timestamp).toLocaleString()}</td>
                          <td>{pred.input}</td>
                          <td>{pred.prediction}</td>
                          <td>
                            <span className={`confidence ${pred.confidence > 0.8 ? 'high' : 'medium'}`}>
                              {Math.round(pred.confidence * 100)}%
                            </span>
                          </td>
                          <td>
                            <span className={`actual ${pred.actual === pred.prediction ? 'correct' : 'incorrect'}`}>
                              {pred.actual}
                            </span>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan="5" className="empty-table">
                            No predictions available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleTrainModel(selectedModel.modelID)}
                >
                  <i className="fas fa-brain"></i> Retrain Model
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAIModels;