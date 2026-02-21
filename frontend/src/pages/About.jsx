import React from 'react';
import { Link } from 'react-router-dom';
import "../styles/theme.css";
import missionImage from '../assets/images/medical-missions-banner.jpg'; //

const About = () => {
  const milestones = [
    { year: '2018', title: 'Founded', description: 'Smart Healthcare was founded with a vision to revolutionize healthcare through technology.' },
    { year: '2019', title: 'First Hospital Partnership', description: 'Partnered with City General Hospital to implement our system.' },
    { year: '2020', title: 'AI Integration', description: 'Introduced AI-powered health assistant for better patient care.' },
    { year: '2021', title: 'National Expansion', description: 'Expanded to 10 major hospitals across the country.' },
    { year: '2022', title: '50,000 Patients', description: 'Reached milestone of serving 50,000+ satisfied patients.' },
    { year: '2023', title: 'Award Winning', description: 'Received "Best Healthcare Innovation" award for our platform.' }
  ];

  const values = [
    {
      icon: 'fa-users',
      title: 'Patient-Centered',
      description: 'We put patients at the center of everything we do, ensuring their needs and comfort come first.'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Security & Privacy',
      description: 'We maintain the highest standards of data security and patient privacy.'
    },
    {
      icon: 'fa-lightbulb',
      title: 'Innovation',
      description: 'We continuously innovate to bring the latest technology to healthcare.'
    },
    {
      icon: 'fa-handshake',
      title: 'Trust & Integrity',
      description: 'We build trust through transparency, honesty, and ethical practices.'
    }
  ];

  return (
    <div className="about-page">
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
            <li><Link to="/about" className="nav-link active">About</Link></li>
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
      <section className="page-hero about-hero">
        <div className="container">
          <div className="hero-content">
            <h1>About Smart Healthcare</h1>
            <p>Transforming healthcare through innovation, technology, and compassionate care.</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-content">
            <div className="mission-text">
              <h2>Our Mission</h2>
              <p>
                To make quality healthcare accessible, efficient, and patient-centered through innovative 
                technology solutions that bridge the gap between patients and healthcare providers.
              </p>
              <p>
                We believe that everyone deserves access to exceptional healthcare. By leveraging cutting-edge 
                technology like AI, real-time data, and seamless digital platforms, we're creating a healthcare 
                experience that's smarter, faster, and more personalized.
              </p>
            </div>
            <div className="mission-image">
              <img 
              src={missionImage} 
              alt="Healthcare Mission" />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Values</h2>
            <p>The principles that guide everything we do</p>
          </div>

          <div className="values-grid">
            {values.map((value, index) => (
              <div className="value-card" key={index}>
                <div className="value-icon">
                  <i className={`fas ${value.icon}`}></i>
                </div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="timeline-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Journey</h2>
            <p>Milestones in our growth and development</p>
          </div>

          <div className="timeline">
            {milestones.map((milestone, index) => (
              <div className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`} key={index}>
                <div className="timeline-content">
                  <span className="timeline-year">{milestone.year}</span>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <h2>Leadership Team</h2>
            <p>Meet the visionaries behind Smart Healthcare</p>
          </div>

          <div className="team-grid">
            <div className="team-member">
              <div className="member-image">
                <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="CEO" />
              </div>
              <div className="member-info">
                <h3>Dr. John Smith</h3>
                <p className="member-role">CEO & Founder</p>
                <p className="member-bio">
                  With 20+ years in healthcare technology, Dr. Smith founded Smart Healthcare to revolutionize patient care.
                </p>
              </div>
            </div>

            <div className="team-member">
              <div className="member-image">
                <img src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="CTO" />
              </div>
              <div className="member-info">
                <h3>Sarah Johnson</h3>
                <p className="member-role">Chief Technology Officer</p>
                <p className="member-bio">
                  Leading our tech innovation with expertise in AI and healthcare systems development.
                </p>
              </div>
            </div>

            <div className="team-member">
              <div className="member-image">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Medical Director" />
              </div>
              <div className="member-info">
                <h3>Dr. Emily Chen</h3>
                <p className="member-role">Medical Director</p>
                <p className="member-bio">
                  Ensuring clinical excellence and patient safety across all our healthcare solutions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="about-stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <i className="fas fa-hospital-user"></i>
              <div className="stat-content">
                <h3>50,000+</h3>
                <p>Patients Served</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-user-md"></i>
              <div className="stat-content">
                <h3>50+</h3>
                <p>Expert Doctors</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-hands-helping"></i>
              <div className="stat-content">
                <h3>15+</h3>
                <p>Hospital Partners</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-award"></i>
              <div className="stat-content">
                <h3>10+</h3>
                <p>Awards Won</p>
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
              <h4>Company</h4>
              <ul className="footer-links">
                <li><a href="#">Careers</a></li>
                <li><a href="#">Press</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Partners</a></li>
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

export default About;