import React from "react";
import { Link } from "react-router-dom";
import "../styles/theme.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-logo">
        Smart Healthcare
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  );
}
