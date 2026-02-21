import React from 'react';
import { Link } from 'react-router-dom';
import "../styles/theme.css";

const Services = () => {
  const services = [
    {
      icon: 'fa-robot',
      title: 'AI Health Assistant',
      description: '24/7 AI-powered health monitoring and symptom checker with personalized recommendations.',
      features: ['Symptom Analysis', 'Medication Reminders', 'Health Tracking', 'Virtual Consultations']
    },
    {
      icon: 'fa-map-marker-alt',
      title: 'GPS Check-in',
      description: 'Automatic appointment check-in using location services for seamless hospital visits.',
      features: ['Real-time Location', 'Queue Management', 'Notification Alerts', 'Check-in History']
    },
    {
      icon: 'fa-clock',
      title: 'Real-time Queue',
      description: 'Live updates on your appointment status and estimated wait times.',
      features: ['Queue Position', 'Wait Time Estimates', 'Doctor Availability', 'Push Notifications']
    },
    {
      icon: 'fa-file-medical',
      title: 'Digital Records',
      description: 'Secure, centralized access to all your medical history and documents.',
      features: ['Medical History', 'Lab Results', 'Prescriptions', 'Vaccination Records']
    },
    {
      icon: 'fa-video',
      title: 'Telemedicine',
      description: 'Virtual consultations with healthcare professionals from the comfort of your home.',
      features: ['Video Consultations', 'Prescription Refills', 'Follow-up Visits', 'Specialist Referrals']
    },
    {
      icon: 'fa-prescription',
      title: 'e-Prescriptions',
      description: 'Digital prescriptions sent directly to your preferred pharmacy.',
      features: ['Instant Prescriptions', 'Pharmacy Integration', 'Refill Reminders', 'Allergy Checks']
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Sign Up',
      description: 'Create your patient account with our secure registration process.',
      icon: 'fa-user-plus'
    },
    {
      step: 2,
      title: 'Book Appointment',
      description: 'Choose your preferred doctor and schedule an appointment.',
      icon: 'fa-calendar-check'
    },
    {
      step: 3,
      title: 'GPS Check-in',
      description: 'Check in automatically when you arrive at the hospital.',
      icon: 'fa-map-marker-alt'
    },
    {
      step: 4,
      title: 'Get Treatment',
      description: 'Receive quality healthcare with digital record updates.',
      icon: 'fa-heartbeat'
    }
  ];

  return (
    <div className="services-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <i className="fas fa-heartbeat"></i>
            <span>Smart Healthcare</span>
          </Link>
          
          <ul className="nav-menu">
            <li><Link to="/" className="nav-link">Home</Link></li>
            <li><Link to="/services" className="nav-link active">Services</Link></li>
            <li><Link to="/doctors" className="nav-link">Doctors</Link></li>
            <li><Link to="/about" className="nav-link">About</Link></li>
            <li><Link to="/contact" className="nav-link">Contact</Link></li>
            <li><Link to="/login" className="nav-link login-btn">Login</Link></li>
            <li><Link to="/register" className="nav-link get-started-btn">Get Started</Link></li>
          </ul>
          
          <div className="mobile-menu-btn">
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="page-hero services-hero">
        <div className="container"> 
          <div className="hero-content">
            <h1>Our Healthcare Services</h1>
            <p>Experience next-generation healthcare with our comprehensive digital solutions designed for modern patients.</p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary">Get Started</Link>
              <a href="#how-it-works" className="btn btn-secondary">Learn How It Works</a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="services-section">
        <div className="container">
          <div className="section-header">
            <h2>Comprehensive Healthcare Solutions</h2>
            <p>We combine cutting-edge technology with compassionate care to deliver exceptional healthcare experiences.</p>
          </div>

          <div className="services-grid">
            {services.map((service, index) => (
              <div className="service-card" key={index}>
                <div className="service-icon">
                  <i className={`fas ${service.icon}`}></i>
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul className="service-features">
                  {service.features.map((feature, idx) => (
                    <li key={idx}>
                      <i className="fas fa-check-circle"></i> {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="service-link">
                  Get Started <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Simple steps to better healthcare with Smart Healthcare System</p>
          </div>

          <div className="steps-container">
            {howItWorks.map((step, index) => (
              <div className="step-card" key={index}>
                <div className="step-number">{step.step}</div>
                <div className="step-icon">
                  <i className={`fas ${step.icon}`}></i>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose Our Services?</h2>
            <p>Experience healthcare that puts you first with these key benefits</p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="benefit-content">
                <h3>Save Time</h3>
                <p>Reduce waiting time with smart scheduling and queue management.</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="benefit-content">
                <h3>Secure & Private</h3>
                <p>HIPAA compliant data protection and secure medical records.</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-heart"></i>
              </div>
              <div className="benefit-content">
                <h3>Better Care</h3>
                <p>AI-powered insights and continuous health monitoring.</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <div className="benefit-content">
                <h3>Mobile First</h3>
                <p>Access all services from your smartphone anywhere, anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Experience Smart Healthcare?</h2>
            <p>Join thousands of patients who have transformed their healthcare experience.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary">Sign Up Free</Link>
              <Link to="/contact" className="btn btn-secondary">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">
                <i className="fas fa-heartbeat"></i>
                <h3>Smart Healthcare</h3>
              </div>
              <p>Your trusted healthcare partner</p>
            </div>
            
            <div className="footer-col">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/services">Services</Link></li>
                <li><Link to="/doctors">Doctors</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Services</h4>
              <ul className="footer-links">
                <li><a href="#">AI Health Assistant</a></li>
                <li><a href="#">Telemedicine</a></li>
                <li><a href="#">Digital Records</a></li>
                <li><a href="#">GPS Check-in</a></li>
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
    </div>
  );
};

export default Services;