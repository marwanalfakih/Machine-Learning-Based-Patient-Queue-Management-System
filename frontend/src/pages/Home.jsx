import "../styles/variables.css";
import "../styles/base.css";
import "../styles/home.css";

export default function Home() {
  return (
    <>
      <header className="navbar">
        <div className="logo">Smart Healthcare</div>
        <nav>
          <a>Home</a>
          <a>Services</a>
          <a>Doctors</a>
          <a>About</a>
          <a>Contact</a>
          <a className="login">Login</a>
          <button className="btn-primary">Get Started</button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-text">
          <h1>Smart Healthcare, Simplified</h1>
          <p>
            Experience seamless appointments, GPS check-ins,
            and AI-powered health support
          </p>
          <div className="hero-actions">
            <button className="btn-primary">Book Appointment Now</button>
            <button className="btn-outline">Learn More</button>
          </div>
        </div>

        <div className="hero-image">
          <img src="/doctor.png" alt="doctor" />
        </div>
      </section>

      <section className="features">
        <h2>Why Choose Smart Healthcare?</h2>

        <div className="feature-grid">
          <div className="feature-card">GPS Check-in</div>
          <div className="feature-card">AI Health Assistant</div>
          <div className="feature-card">Real-time Queue</div>
          <div className="feature-card">Digital Records</div>
        </div>
      </section>
    </>
  );
}
