# Authentication System Documentation

## Overview
Complete authentication system for patients and doctors with separate registration, login, and dashboard flows.

## 1. PATIENT AUTHENTICATION

### 1.1 Patient Login (PatientLogin.jsx)

**Route:** `/patient`

**Features:**
- Email and password login
- Form validation
- Error messages
- Registration link
- Demo credentials display

**Validation:**
- Email: Required, valid format
- Password: Required, any length

**Authentication Flow:**
1. User visits `/patient`
2. Enters email and password
3. System checks against `patientRegisterData` in localStorage
4. If match: Navigate to `/patient/dashboard`
5. If no match: Show error message

**Demo Credentials:**
- Email: `test@example.com`
- Password: `password123`
- (Must register with these first)

**Code:**
```javascript
// Check login
const storedData = localStorage.getItem('patientRegisterData')
const patientData = JSON.parse(storedData)

if (patientData.email === email && patientData.password === password) {
  localStorage.setItem('patientId', email)
  localStorage.setItem('patientLoggedIn', 'true')
  navigate('/patient/dashboard')
}
```

### 1.2 Patient Registration (PatientRegister.jsx)

**Route:** `/patient/register`

**Features:**
- Full registration form
- Face capture after registration
- Comprehensive validation
- Password strength check (min 6 chars)

**Fields:**
- Full Name (required)
- Date of Birth (required)
- Gender (required: Male/Female/Other)
- Phone Number (required)
- Email (required, valid format)
- Password (required, min 6 chars)

**Registration Flow:**
1. User clicks "Register Now" on login page
2. Fills registration form
3. Form validates
4. Data stored in localStorage: key `patientRegisterData`
5. Redirects to `/face-capture`
6. After face capture → `/patient/dashboard`

**Data Structure:**
```javascript
{
  name: "John Doe",
  dob: "1990-05-15",
  gender: "male",
  phone: "+1 234 567 8900",
  email: "john@example.com",
  password: "password123"
}
```

### 1.3 Patient Dashboard (PatientDashboard.jsx)

**Route:** `/patient/dashboard`

**Features:**
- Shows patient welcome
- Appointment booking system
- Medical records upload
- Consents management
- Patient profile view

**Navigation:**
- Dashboard
- Appointments
- Profile
- Medical Records
- Consents

**Logout:**
- Clears all patient data
- Removes login session
- Redirects to home

## 2. DOCTOR AUTHENTICATION

### 2.1 Doctor Registration (DoctorRegister.jsx)

**Route:** `/doctor`

**Features:**
- Doctor registration form
- Direct dashboard access after registration
- Specialization dropdown
- Form validation

**Fields:**
- Full Name (required)
- Email (required, valid format)
- Specialization (required, dropdown)
- Password (required, min 6 chars)

**Available Specializations:**
- General Medicine
- Cardiology
- Orthopedics
- Pediatrics
- Dermatology
- Neurology
- Psychiatry
- Surgery

**Registration Flow:**
1. User clicks "Doctor Portal"
2. Directed to `/doctor` (DoctorRegister)
3. Fills registration form
4. Data stored in localStorage: key `doctorData`
5. Login session created: `doctorLoggedIn` = true
6. Redirects to `/doctor/dashboard`

**Data Structure:**
```javascript
{
  name: "Dr. Sarah Johnson",
  email: "sarah@hospital.com",
  specialization: "Cardiology",
  password: "securepass123"
}
```

**Login Storage:**
```javascript
localStorage.setItem('doctorData', JSON.stringify(formData))
localStorage.setItem('doctorLoggedIn', 'true')
localStorage.setItem('doctorEmail', formData.email)
```

### 2.2 Doctor Dashboard (DoctorDashboard.jsx)

**Route:** `/doctor/dashboard`

**Features:**
- Doctor welcome message
- Today's appointments display
- Statistics cards showing:
  - Total patients today
  - Waiting patients
  - In consultation
  - Completed appointments
- Demo data as fallback

**Demo Data:**
```javascript
[
  {
    id: 'APT001',
    patientName: 'John Doe',
    time: '10:00',
    date: '2026-04-08',
    status: 'WAITING'
  },
  {
    id: 'APT002',
    patientName: 'Priya Sharma',
    time: '11:30',
    date: '2026-04-08',
    status: 'BOOKED'
  },
  {
    id: 'APT003',
    patientName: 'Michael Johnson',
    time: '02:00',
    date: '2026-04-08',
    status: 'ACTIVE'
  }
]
```

**Appointments Display:**
- Shows today's appointments
- Grouped by time
- Color-coded by status
- Status badges (BOOKED, WAITING, ACTIVE, COMPLETED)

**Status Colors:**
- BOOKED: Blue background
- WAITING: Yellow background
- ACTIVE: Green background
- COMPLETED: Gray background

**Logout:**
- Clears doctor session
- Redirects to home

## 3. ROUTING STRUCTURE

```
/                           → Home (Portal Selection)
/patient                    → Patient Login
/patient/register           → Patient Registration
/face-capture              → Face Capture (after registration)
/patient/dashboard         → Patient Dashboard (requires login)
/doctor                    → Doctor Registration
/doctor/dashboard          → Doctor Dashboard (requires registration)
/admin                     → Admin Portal
/reception                 → Reception Portal
```

## 4. STORAGE KEYS

### Patient
- `patientRegisterData` - Full patient registration data
- `patientId` - Current logged-in patient email
- `patientLoggedIn` - Session flag
- `patientFace` - Face image (base64)
- `medicalRecords_[patientId]` - Patient's medical records

### Doctor
- `doctorData` - Doctor registration data
- `doctorLoggedIn` - Session flag
- `doctorEmail` - Doctor's email

### Shared
- `appointments` - All appointments for the system

## 5. AUTHENTICATION FLOW DIAGRAMS

### Patient Flow
```
Home 
  ↓ (Click "Patient Portal")
Patient Login (/patient)
  ├─ Has credentials? → Patient Dashboard
  └─ No account? → Patient Register (/patient/register)
                    ↓
                 Face Capture (/face-capture)
                    ↓
              Patient Dashboard
```

### Doctor Flow
```
Home
  ↓ (Click "Doctor Portal")
Doctor Register (/doctor)
  ↓ (Auto-login after registration)
Doctor Dashboard (/doctor/dashboard)
```

## 6. SESSION MANAGEMENT

**Patient Session:**
- Created in PatientLogin after successful authentication
- Stored in: `patientId`, `patientLoggedIn`
- Cleared on logout

**Doctor Session:**
- Created automatically after DoctorRegister registration
- Stored in: `doctorEmail`, `doctorLoggedIn`
- Cleared on logout

## 7. VALIDATION RULES

### Patient Login
- Email: Required, must match registered email
- Password: Required, must match registered password

### Patient Registration
- Name: Required, any length
- DOB: Required, valid date
- Gender: Required, select from dropdown
- Phone: Required, any format
- Email: Required, valid email format
- Password: Required, minimum 6 characters

### Doctor Registration
- Name: Required, any length
- Email: Required, valid email format
- Specialization: Required, select from dropdown
- Password: Required, minimum 6 characters

## 8. ERROR HANDLING

### Patient Login
- "No patient account found. Please register first."
- "Invalid email or password"
- Email format validation error
- Password required error

### Registrations
- Required field errors
- Email format validation
- Password length validation
- All fields highlighted in red when invalid

## 9. TESTING SCENARIOS

### Scenario 1: Patient Registration & Login
1. Click "Patient Portal" → Goes to PatientLogin
2. Click "Register Now"
3. Fill in registration form
4. Enter: test@example.com, password123
5. Capture face
6. Dashboard loads
7. Click Logout
8. Login with test@example.com / password123
9. Dashboard loads again

### Scenario 2: Doctor Registration & Dashboard
1. Click "Doctor Portal" → Goes to DoctorRegister
2. Fill in form with:
   - Name: Dr. Sarah Johnson
   - Email: sarah@hospital.com
   - Specialization: Cardiology
   - Password: secure123
3. Click "Register"
4. Dashboard loads with demo appointments
5. Click "Logout" → Back to home

### Scenario 3: Unauthorized Access
1. Try to visit `/patient/dashboard` directly without login
2. Get redirected to `/patient` (login page)
3. Try to visit `/doctor/dashboard` without registration
4. Get redirected to `/doctor` (registration page)

## 10. SECURITY NOTES

**Current Implementation (Frontend Only):**
- Passwords stored in plain text in localStorage
- No encryption
- No backend validation
- For demo purposes only

**Future Improvements:**
1. Move authentication to backend
2. Use JWT tokens
3. Hash passwords
4. Implement proper session management
5. Use secure HTTP-only cookies
6. Add CSRF protection
7. Rate limiting on login attempts

## 11. INTEGRATION WITH OTHER FEATURES

**Patient Login → Features Available:**
- Appointment booking ✓
- Medical records upload ✓
- View appointments ✓
- Update appointments status ✓
- Consents management ✓
- Profile view ✓

**Doctor Login → Features Available:**
- View today's appointments ✓
- See appointment statistics ✓
- Future: Update appointment status
- Future: Add patient notes
- Future: Prescriptions

## 12. FILE STRUCTURE

```
src/
├── pages/
│   ├── PatientLogin.jsx          (NEW)
│   ├── PatientRegister.jsx       (UPDATED)
│   ├── PatientDashboard.jsx      (UPDATED)
│   ├── DoctorRegister.jsx        (NEW)
│   ├── DoctorDashboard.jsx       (NEW)
│   ├── FaceCapture.jsx
│   ├── DoctorPortal.jsx
│   ├── AdminPortal.jsx
│   └── ReceptionPortal.jsx
└── App.jsx                        (UPDATED)
```

## 13. FUTURE ENHANCEMENTS

1. **Backend Integration**
   - Move auth to API
   - Database for credentials
   - JWT implementation

2. **Security**
   - Password hashing
   - Email verification
   - 2FA

3. **Features**
   - Password reset
   - Profile update
   - Email notifications
   - Account settings

4. **Admin Functions**
   - User management
   - System analytics
   - Audit logs

## 14. TROUBLESHOOTING

**Patient can't login:**
- Check email and password match exactly
- Ensure patient registered first
- Check localStorage has `patientRegisterData`

**Can't access dashboard:**
- Check if logged in (look for login session in localStorage)
- Try logging out and logging back in
- Clear browser cache and try again

**Doctor dashboard shows demo data:**
- This is expected if appointments haven't been created
- System pulls from appointments list if available
- Otherwise shows hardcoded demo data