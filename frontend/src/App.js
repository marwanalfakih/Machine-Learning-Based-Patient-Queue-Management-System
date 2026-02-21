// App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { verifyToken } from './services/api';

//import './styles/main.css'; // استيراد الملف الرئيسي فقط

// Import Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Services from './pages/Services';
import Doctors from './pages/Doctors';
import About from './pages/About';
import Contact from './pages/Contact';
import PatientDashboard from "./pages/patient/PatientDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

import './styles/theme.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const result = await verifyToken();
                if (result.success) {
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    setUser(storedUser);
                    
                    // التحقق من الدور إذا كان مطلوباً
                    if (requiredRole && storedUser.userType !== requiredRole) {
                        setIsAuthenticated(false);
                    } else {
                        setIsAuthenticated(true);
                    }
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, [requiredRole]);

    if (isAuthenticated === null) {
        return <div className="loading">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/services" element={<Services />} />
                <Route path="/doctors" element={<Doctors />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                {/* Protected Routes */}
                <Route path="/patient" element={
                    <ProtectedRoute requiredRole="patient">
                        <PatientDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/doctor" element={
                    <ProtectedRoute requiredRole="doctor">
                        <DoctorDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />               

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
