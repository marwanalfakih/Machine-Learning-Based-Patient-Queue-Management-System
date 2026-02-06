import React from 'react';
import { Link } from 'react-router-dom';
import "../styles/theme.css";
// Import the local image
import doctorImage from '../assets/images/hero-healthcare.jpg'; //

const Home = () => {
  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/');
      const data = await response.json();
      alert(`✅ Backend Connected!\n\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`❌ Backend Error:\n${error.message}`);
    }
  };

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <i className="fas fa-heartbeat"></i>
            <span>Smart Healthcare</span>
          </Link>
          
          <ul className="nav-menu">
            <li><Link to="/" className="nav-link active">Home</Link></li>
            <li><a href="/services" className="nav-link">Services</a></li>
            <li><a href="/doctors" className="nav-link">Doctors</a></li>
            <li><a href="/about" className="nav-link">About</a></li>
            <li><a href="/contact" className="nav-link">Contact</a></li>
            <li><Link to="/login" className="nav-link login-btn">Login</Link></li>
            <li><Link to="/login" className="nav-link get-started-btn">Get Started</Link></li>
          </ul>
          
          <div className="mobile-menu-btn">
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Smart Healthcare, Simplified</h1>
            <p>Experience seamless appointments, GPS check-ins, and AI-powered health support</p>
            <div className="hero-buttons">
              <Link to="/login" className="btn btn-primary">Book Appointment Now</Link>
              <a href="#services" className="btn btn-secondary">Learn More</a>
            </div>
          </div>
          <div className="hero-image">
            <div className="doctor-photo-container">
              <img
                //src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                //src="../../public/assets/hero-healthcare.jpg"
                src= {doctorImage}
                alt="Smart Healthcare System"
                className="doctor-photo"
              />
              
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="services">
        <div className="container">
          <h2 className="section-title">Why Choose Smart Healthcare?</h2>
          <p className="section-subtitle">Advanced features designed to make healthcare accessible and efficient</p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h3>GPS Check-in</h3>
              <p>Automatic check-in using location services</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-robot"></i>
              </div>
              <h3>AI Health Assistant</h3>
              <p>24/7 medical guidance and support</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3>Real-time Queue</h3>
              <p>Live updates on your appointment status</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-file-medical"></i>
              </div>
              <h3>Digital Records</h3>
              <p>Secure health documentation access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-content">
            <h2>Trusted by 50,000+ patients</h2>
            <div className="badges">
              <span className="badge"><i className="fas fa-shield-alt"></i> HIPAA Compliant</span>
              <span className="badge"><i className="fas fa-lock"></i> Secure Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="contact">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">
                <i className="fas fa-heartbeat"></i>
                <h3>Smart Healthcare</h3>
              </div>
              <p>Your trusted healthcare partner</p>
              
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#doctors">Doctors</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Company</h4>
              <ul className="footer-links">
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Contact</h4>
              <div className="contact-info">
                <p><i className="fas fa-envelope"></i> support@smarthealthcare.com</p>
                <p><i className="fas fa-phone"></i> 1-800-HEALTH</p>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Smart Healthcare. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Test Backend Button */}
      <button className="test-backend-btn" onClick={testBackend}>
        <i className="fas fa-server"></i> Test Backend
      </button>
    </div>
  );
};

export default Home;