import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('Unknown');

  // اختبار اتصال الـ Backend عند تحميل الصفحة
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/login.php', {
        method: 'OPTIONS'
      });
      setBackendStatus(response.ok ? 'Connected ✓' : 'Error');
      console.log('Backend status:', response.status);
    } catch (err) {
      setBackendStatus('Not Connected ✗');
      console.error('Backend check failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('Login attempt with:', formData.email);
    console.log('Backend URL:', 'http://localhost:8000/api/auth/login.php');

    try {
      // التحقق من البيانات المدخلة
      if (!formData.email || !formData.password) {
        setError('Please fill all fields');
        setLoading(false);
        return;
      }
      
      // الاتصال بالـ Backend
      const response = await fetch('http://localhost:8000/api/auth/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email: formData.email,
          password: formData.password
        }),
      });

      console.log('Response status:', response.status);
      
      // قراءة النص الخام أولاً للتصحيح
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response that failed to parse:', responseText);
        
        setError('Invalid JSON response from server. Backend may have PHP errors.');
        if (responseText.includes('Fatal error') || responseText.includes('Parse error')) {
          setError('PHP Error in backend. Check PHP configuration.');
        }
        setLoading(false);
        return;
      }

      console.log('Parsed response:', data);
      
      if (data.success) {
        console.log('Login successful! User data:', data.user);
        
        // حفظ التوكن والمستخدم في localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // التوجيه بعد تأخير بسيط
        setTimeout(() => {
          if (data.user.userType === 'patient') {
            navigate('/patient');
          } else if (data.user.userType === 'doctor') {
            navigate('/doctor');
          } else if (data.user.userType === 'admin') {
            navigate('/admin');
          }
        }, 100);
        
      } else {
        console.log('Login failed:', data.error);
        setError(data.error || 'Login failed. Check your credentials.');
      }
      
    } catch (error) {
      console.error('Network error details:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setError(`Cannot connect to backend server. Make sure:
          1. PHP server is running (php -S localhost:8000)
          2. Backend folder structure is correct
          3. File exists at: backend/api/auth/login.php`);
      } else {
        setError(`Network error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

 

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>Login to Smart Healthcare</h2>
          <p>Access your healthcare portal</p>
          <div style={{ 
            fontSize: '0.9rem', 
            color: backendStatus.includes('✓') ? '#43a047' : '#e53935',
            marginTop: '10px',
            padding: '5px 10px',
            backgroundColor: backendStatus.includes('✓') ? '#e8f5e9' : '#ffebee',
            borderRadius: '5px',
            display: 'inline-block'
          }}>
            <i className={`fas fa-${backendStatus.includes('✓') ? 'check-circle' : 'exclamation-circle'}`}></i>
            {' '}Backend: {backendStatus}
          </div>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <div>
              <strong>Error:</strong> 
              <div style={{ whiteSpace: 'pre-line', marginTop: '5px' }}>{}</div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              disabled={loading}
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
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Login as</label>
            <div className="role-buttons">
              <button
                type="button"
                className={`role-btn ${formData.role === 'patient' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'patient'})}
                disabled={loading}
              >
                <i className="fas fa-user"></i> Patient
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'doctor' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'doctor'})}
                disabled={loading}
              >
                <i className="fas fa-user-md"></i> Doctor
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'admin' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'admin'})}
                disabled={loading}
              >
                <i className="fas fa-cog"></i> Admin
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" disabled={loading} />
              <span>Remember me</span>
            </label>
            <a href="#" style={{ color: '#2d89ef', textDecoration: 'none' }}>
              Forgot Password?
            </a>
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Connecting to Backend...
              </>
            ) : (
              'Login to Dashboard'
            )}
          </button>
          
          
          <div style={{ borderTop: '1px solid #eee', margin: '20px 0', paddingTop: '20px' }}>
            <p className="register-link">
              Don't have an account? <Link to="/register">Register as Patient</Link>
            </p>
            
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              <i className="fas fa-arrow-left"></i> Back to Homepage
            </button>
          </div>
        </form>

        
      </div>
    </div>
  );
};

export default Login;