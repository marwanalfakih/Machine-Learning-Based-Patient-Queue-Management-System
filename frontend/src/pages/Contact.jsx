import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import "../styles/theme.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    contactMethod: 'email'
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contactMethods = [
    {
      icon: 'fa-phone',
      title: 'Call Us',
      details: '1-800-HEALTH',
      description: 'Available 24/7 for emergencies'
    },
    {
      icon: 'fa-envelope',
      title: 'Email Us',
      details: 'support@smarthealthcare.com',
      description: 'Response within 24 hours'
    },
    {
      icon: 'fa-map-marker-alt',
      title: 'Visit Us',
      details: '123 Healthcare St, Medical City',
      description: 'Main Hospital Location'
    },
    {
      icon: 'fa-clock',
      title: 'Business Hours',
      details: 'Mon-Fri: 8AM-8PM, Sat: 9AM-5PM',
      description: 'Emergency services available 24/7'
    }
  ];

  const faqs = [
    {
      question: 'How do I book an appointment?',
      answer: 'You can book appointments through our website, mobile app, or by calling our helpline.'
    },
    {
      question: 'Is my medical information secure?',
      answer: 'Yes, we use HIPAA-compliant encryption and security measures to protect all patient data.'
    },
    {
      question: 'Do you accept insurance?',
      answer: 'We accept most major insurance providers. Please contact us with your insurance details.'
    },
    {
      question: 'How do I access my medical records?',
      answer: 'You can access your records through the patient portal after creating an account.'
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          contactMethod: 'email'
        });
        
        // Reset submitted status after 5 seconds
        setTimeout(() => {
          setSubmitted(false);
        }, 5000);
      }, 1500);
    } catch (error) {
      alert('Message sending failed: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <i className="fas fa-heartbeat"></i>
            <span>Smart Healthcare</span>
          </Link>
          
          <ul className="nav-menu">
            <li><Link to="/" className="nav-link">Home</Link></li>
            <li><Link to="/services" className="nav-link">Services</Link></li>
            <li><Link to="/doctors" className="nav-link">Doctors</Link></li>
            <li><Link to="/about" className="nav-link">About</Link></li>
            <li><Link to="/contact" className="nav-link active">Contact</Link></li>
            <li><Link to="/login" className="nav-link login-btn">Login</Link></li>
            <li><Link to="/register" className="nav-link get-started-btn">Get Started</Link></li>
          </ul>
          
          <div className="mobile-menu-btn">
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="page-hero contact-hero">
        <div className="container">
          <div className="hero-content">
            <h1>Contact Us</h1>
            <p>We're here to help. Reach out to us with any questions or concerns.</p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="contact-methods-section">
        <div className="container">
          <div className="section-header">
            <h2>Get in Touch</h2>
            <p>Choose your preferred way to contact us</p>
          </div>

          <div className="contact-methods-grid">
            {contactMethods.map((method, index) => (
              <div className="contact-method-card" key={index}>
                <div className="method-icon">
                  <i className={`fas ${method.icon}`}></i>
                </div>
                <h3>{method.title}</h3>
                <p className="method-details">{method.details}</p>
                <p className="method-description">{method.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-form-container">
            <div className="form-header">
              <h2>Send Us a Message</h2>
              <p>Fill out the form below and we'll get back to you as soon as possible.</p>
            </div>

            {submitted ? (
              <div className="success-message">
                <div className="success-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <h3>Message Sent Successfully!</h3>
                <p>Thank you for contacting us. We'll respond to your message within 24 hours.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <i className="fas fa-user"></i> Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <i className="fas fa-envelope"></i> Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <i className="fas fa-phone"></i> Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <i className="fas fa-tag"></i> Subject *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="appointment">Appointment Booking</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="feedback">Feedback & Suggestions</option>
                      <option value="emergency">Emergency Contact</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <i className="fas fa-comments"></i> Preferred Contact Method
                  </label>
                  <div className="contact-method-options">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="email"
                        checked={formData.contactMethod === 'email'}
                        onChange={handleChange}
                      />
                      <span className="radio-custom"></span>
                      <span>Email</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="phone"
                        checked={formData.contactMethod === 'phone'}
                        onChange={handleChange}
                      />
                      <span className="radio-custom"></span>
                      <span>Phone Call</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="sms"
                        checked={formData.contactMethod === 'sms'}
                        onChange={handleChange}
                      />
                      <span className="radio-custom"></span>
                      <span>SMS</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <i className="fas fa-comment-dots"></i> Message *
                  </label>
                  <textarea
                    name="message"
                    placeholder="Type your message here..."
                    value={formData.message}
                    onChange={handleChange}
                    rows="6"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i> Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <div className="section-header">
            <h2>Frequently Asked Questions</h2>
            <p>Find quick answers to common questions</p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div className="faq-item" key={index}>
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <div className="container">
          <div className="section-header">
            <h2>Find Our Location</h2>
            <p>Visit our main hospital location</p>
          </div>

          <div className="map-container">
            {/* This would be a Google Maps embed in production */}
            <div className="map-placeholder">
              <div className="map-content">
                <i className="fas fa-map-marked-alt"></i>
                <h3>Smart Healthcare Hospital</h3>
                <p>123 Healthcare Street, Medical City, MC 12345</p>
                <div className="map-directions">
                  <button className="btn btn-outline">
                    <i className="fas fa-directions"></i> Get Directions
                  </button>
                </div>
              </div>
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
              <h4>Support</h4>
              <ul className="footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Patient Guide</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Emergency</h4>
              <div className="contact-info">
                <p><i className="fas fa-phone"></i> 1-800-HEALTH</p>
                <p><i className="fas fa-ambulance"></i> Emergency: 911</p>
                <p><i className="fas fa-clock"></i> 24/7 Available</p>
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

export default Contact;