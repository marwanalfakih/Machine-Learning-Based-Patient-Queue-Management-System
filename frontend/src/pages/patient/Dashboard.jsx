import "../../styles/variables.css";
import "../../styles/base.css";
import "../../styles/dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h2>Welcome back, Dhai 👋</h2>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Today's Appointment</h3>
          <p>Dr. Sarah Ahmed</p>
          <button className="btn-primary">Check in via GPS</button>
        </div>

        <div className="card">
          <h3>Real-Time Queue</h3>
          <p>Your Position: #3</p>
          <p>ETA: 15 mins</p>
        </div>

        <div className="card">
          <h3>Quick Health Tools</h3>
          <p>Medication • Vitals • History</p>
        </div>

        <div className="card">
          <h3>Recent Activity</h3>
          <ul>
            <li>Lab results ready</li>
            <li>Appointment confirmed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
