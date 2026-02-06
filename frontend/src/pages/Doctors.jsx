import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import "../styles/theme.css";

const Doctors = () => {
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  
  const doctors = [
    {
      id: 1,
      name: "Dr. Sarah Ahmed",
      specialty: "Cardiology",
      experience: "10 years",
      rating: 4.8,
      reviews: 124,
      availability: "Mon, Wed, Fri",
      fee: "$50",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      specialty: "Cardiology",
      experience: "8 years",
      rating: 4.7,
      reviews: 98,
      availability: "Tue, Thu, Sat",
      fee: "$45",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 3,
      name: "Dr. James Wilson",
      specialty: "Neurology",
      experience: "15 years",
      rating: 4.9,
      reviews: 156,
      availability: "Mon-Fri",
      fee: "$75",
      image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 4,
      name: "Dr. Emily Parker",
      specialty: "Pediatrics",
      experience: "7 years",
      rating: 4.6,
      reviews: 87,
      availability: "Mon, Tue, Thu",
      fee: "$40",
      image: "https://images.unsplash.com/photo-1594824483305-9f78478b3ff8?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 5,
      name: "Dr. Robert Kim",
      specialty: "Orthopedics",
      experience: "12 years",
      rating: 4.8,
      reviews: 142,
      availability: "Mon, Wed, Fri",
      fee: "$65",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 6,
      name: "Dr. Lisa Rodriguez",
      specialty: "Dermatology",
      experience: "9 years",
      rating: 4.7,
      reviews: 113,
      availability: "Tue, Thu, Sat",
      fee: "$55",
      image: "https://images.unsplash.com/photo-1591608971362-f08b2a75731a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 7,
      name: "Dr. David Miller",
      specialty: "Internal Medicine",
      experience: "11 years",
      rating: 4.8,
      reviews: 134,
      availability: "Mon-Fri",
      fee: "$60",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 8,
      name: "Dr. Maria Garcia",
      specialty: "Ophthalmology",
      experience: "14 years",
      rating: 4.9,
      reviews: 167,
      availability: "Mon, Wed, Thu",
      fee: "$70",
      image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
    }
  ];

  const specialties = [
    'All Specialties',
    'Cardiology',
    'Neurology',
    'Pediatrics',
    'Orthopedics',
    'Dermatology',
    'Internal Medicine',
    'Ophthalmology',
    'Pulmonology',
    'Dentistry'
  ];

  const filteredDoctors = specialtyFilter === 'all' 
    ? doctors 
    : doctors.filter(doctor => doctor.specialty === specialtyFilter);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(<i key={i} className="fas fa-star"></i>);
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        stars.push(<i key={i} className="fas fa-star-half-alt"></i>);
      } else {
        stars.push(<i key={i} className="far fa-star"></i>);
      }
    }
    return stars;
  };

  return (
    <div className="doctors-page">
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
            <li><Link to="/doctors" className="nav-link active">Doctors</Link></li>
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
      <section className="page-hero doctors-hero">
        <div className="container">
          <div className="hero-content">
            <h1>Meet Our Expert Doctors</h1>
            <p>Highly qualified and experienced medical professionals dedicated to your health and well-being.</p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary">Book Appointment</Link>
              <a href="#specialties" className="btn btn-secondary">View Specialties</a>
            </div>
          </div>
        </div>
      </section>

      {/* Specialties Filter */}
      <section className="specialties-section" id="specialties">
        <div className="container">
          <div className="section-header">
            <h2>Find by Specialty</h2>
            <p>Choose from our wide range of medical specialties</p>
          </div>

          <div className="specialties-filter">
            {specialties.map((specialty, index) => (
              <button
                key={index}
                className={`specialty-btn ${specialtyFilter === (index === 0 ? 'all' : specialty) ? 'active' : ''}`}
                onClick={() => setSpecialtyFilter(index === 0 ? 'all' : specialty)}
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="doctors-grid-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Medical Team</h2>
            <p>Meet our team of dedicated healthcare professionals</p>
          </div>

          <div className="doctors-grid">
            {filteredDoctors.map((doctor) => (
              <div className="doctor-card" key={doctor.id}>
                <div className="doctor-image">
                  <img src={doctor.image} alt={doctor.name} />
                  <div className="doctor-badge">
                    <i className="fas fa-heartbeat"></i> Available
                  </div>
                </div>
                <div className="doctor-info">
                  <h3>{doctor.name}</h3>
                  <p className="doctor-specialty">{doctor.specialty}</p>
                  
                  <div className="doctor-rating">
                    <div className="stars">
                      {renderStars(doctor.rating)}
                      <span className="rating-text">{doctor.rating} ({doctor.reviews} reviews)</span>
                    </div>
                  </div>

                  <div className="doctor-details">
                    <div className="detail-item">
                      <i className="fas fa-briefcase"></i>
                      <span>{doctor.experience} experience</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{doctor.availability}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-money-bill-wave"></i>
                      <span>${doctor.fee} consultation</span>
                    </div>
                  </div>

                  <div className="doctor-actions">
                    <Link to="/register" className="btn btn-primary">
                      <i className="fas fa-calendar-check"></i> Book Now
                    </Link>
                    <button className="btn btn-outline">
                      <i className="fas fa-user-md"></i> View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="doctor-stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <i className="fas fa-user-md"></i>
              <div className="stat-content">
                <h3>50+</h3>
                <p>Expert Doctors</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-hospital"></i>
              <div className="stat-content">
                <h3>15+</h3>
                <p>Specialties</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-users"></i>
              <div className="stat-content">
                <h3>50,000+</h3>
                <p>Happy Patients</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-award"></i>
              <div className="stat-content">
                <h3>25+</h3>
                <p>Years Experience</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Can't Find Your Doctor?</h2>
            <p>Contact us to find the right specialist for your needs</p>
            <div className="cta-buttons">
              <Link to="/contact" className="btn btn-primary">Contact Us</Link>
              <Link to="/services" className="btn btn-secondary">View Services</Link>
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
              <h4>Specialties</h4>
              <ul className="footer-links">
                <li><a href="#">Cardiology</a></li>
                <li><a href="#">Neurology</a></li>
                <li><a href="#">Pediatrics</a></li>
                <li><a href="#">Orthopedics</a></li>
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

export default Doctors;