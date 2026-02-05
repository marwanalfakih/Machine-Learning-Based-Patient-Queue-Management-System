import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Homepage أول ما المشروع يشتغل */}
        <Route path="/" element={<Home />} />

        {/* Login من الـ Navbar */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
