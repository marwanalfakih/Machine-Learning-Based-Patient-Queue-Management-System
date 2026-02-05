import "../styles/variables.css";
import "../styles/base.css";
import "../styles/login.css";
/*
export default function Login() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h2>SMART HEALTHCARE SYSTEM</h2>
        <p>Welcome Back</p>

        <div className="role-tabs">
          <button className="active">Patient Login</button>
          <button>Doctor Login</button>
          <button>Admin Login</button>
        </div>

        <input placeholder="Email or Username" />
        <input type="password" placeholder="Password" />

        <div className="login-options">
          <label><input type="checkbox" /> Remember me</label>
          <a>Forgot Password?</a>
        </div>

        <button className="btn-primary full">SIGN IN</button>
      </div>
    </div>
  );
}*/

import { useState } from "react";
import { API_URL } from "../services/api";
import "../styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    /* حفظ المستخدم */
    localStorage.setItem("user", JSON.stringify(data.user));

    /* توجيه حسب الدور */
    if (data.user.role === "patient") {
      window.location.href = "/patient/dashboard";
    }
    if (data.user.role === "doctor") {
      window.location.href = "/doctor/dashboard";
    }
  };

  return (
    <form className="login-card" onSubmit={handleLogin}>
      <h2>Sign In</h2>

      {error && <p className="error">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="btn-primary full">SIGN IN</button>
    </form>
  );
}

