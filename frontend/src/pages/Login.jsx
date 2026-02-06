import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import "../styles/theme.css";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'patient'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simple validation
      if (!formData.email || !formData.password) {
        alert('Please fill all fields');
        setLoading(false);
        return;
      }
      
      // Simulate API call
      setTimeout(() => {
        alert(`Login successful as ${formData.role}!`);
        
        // Redirect based on role
        if (formData.role === 'patient') {
          navigate('/patient');
        } else if (formData.role === 'doctor') {
          navigate('/doctor');
        } else if (formData.role === 'admin') {
          alert('Admin portal coming soon!');
          navigate('/');
        }
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      alert('Login failed: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>Login to Smart Healthcare</h2>
          <p>Access your healthcare portal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Login as</label>
            <div className="role-buttons">
              <button
                type="button"
                className={`role-btn ${formData.role === 'patient' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'patient'})}
              >
                <i className="fas fa-user"></i> Patient
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'doctor' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'doctor'})}
              >
                <i className="fas fa-user-md"></i> Doctor
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'admin' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'admin'})}
              >
                <i className="fas fa-cog"></i> Admin
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" style={{ color: '#2d89ef', textDecoration: 'none' }}>
              Forgot Password?
            </a>
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </button>       
        
          
          <p className="register-link">
             Don't have an account? <Link to="/register">Register as Patient</Link>
          </p>
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/')}
          >
            <i className="fas fa-arrow-left"></i> Back to Homepage
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;