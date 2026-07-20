# MediAccess Healthcare Portal - Monorepo

Welcome to the MediAccess project. This repository is organized as a monorepo containing the frontend, backend, and facial recognition services.

## Project Structure

- **[frontend/](file:///c:/Users/Harish/OneDrive/Desktop/HealthCare/frontend)**: The React + Vite user interface. Contains portals for Patients, Doctors, Receptionists, and Admins.
- **[backend/](file:///c:/Users/Harish/OneDrive/Desktop/HealthCare/backend)**: The Node.js + Express API server handling data management, storage, and mailers.
- **[face-backend/](file:///c:/Users/Harish/OneDrive/Desktop/HealthCare/face-backend)**: The Python ML/AI microservice for facial recognition and verification.

## Getting Started

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend
```bash
cd backend
npm install
npm start
```

### 3. Face Backend
```bash
cd face-backend
# Follow instructions in face-backend/README.md for virtualenv and dependencies
python main.py
```

## Documentation
- [FACIAL_RECOGNITION_GUIDE.md](file:///c:/Users/Harish/OneDrive/Desktop/HealthCare/FACIAL_RECOGNITION_GUIDE.md)
- [API_CONFIGURATION_GUIDE.md](file:///c:/Users/Harish/OneDrive/Desktop/HealthCare/API_CONFIGURATION_GUIDE.md)
- [FIREBASE_INTEGRATION.md](file:///c:/Users/Harish/OneDrive/Desktop/HealthCare/FIREBASE_INTEGRATION.md)
