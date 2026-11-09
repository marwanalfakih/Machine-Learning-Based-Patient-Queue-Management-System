# Machine-Learning-Based-Patient-Queue-Management-System

A web-based system that streamlines patient flow using GPS-based check-in and AI-powered wait time predictions.


# Features
GPS Check-in - Patients check in automatically when they arrive at the clinic

AI Wait Time Prediction - Machine learning model estimates waiting times

Multi-Role Dashboards - Separate interfaces for patients, doctors, and admins

Real-time Queue - Live queue position updates

Appointment Management - Book, reschedule, and cancel appointments

# Tech Stack

Frontend:  	React.js

Backend:	  PHP (REST API)

Database:	  MySQL

AI Service:	Python (TabPFN)

GPS:      	HTML5 Geolocation API


# Quick Start

- Clone the repo
git clone https://github.com/marwanalfakih/healthcare-queue-management.git
cd healthcare-queue-management

- Backend
cd backend
php -S localhost:8000

- Frontend
cd frontend
npm install
npm start

- AI Service
cd ai_python
pip install -r requirements.txt
python app.py

# Structure

frontend/       → React.js app

backend/        → PHP API

ai_python/      → Python AI service

database/       → MySQL schema

# License
MIT License

# Developer
Marwan Alfakih

GitHub: @marwanalfakih

⭐ If you find this useful, give it a star!
