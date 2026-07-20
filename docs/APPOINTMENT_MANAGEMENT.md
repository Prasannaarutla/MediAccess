# Appointment Management System

## Overview
A complete appointment management system for both patients and reception staff with real-time status workflow management.

## Features

### 1. Patient Portal - Book Appointment
**Location:** PatientDashboard.jsx → "Appointments" Tab

**Features:**
- Modal-based appointment booking form
- Fields: Doctor (dropdown), Date, Time
- Validation for all fields
- Future date validation
- Auto-assigned status: "BOOKED"
- Auto-assigned source: "Patient"
- Success feedback

**How to Use:**
1. Go to Patient Dashboard
2. Click "Appointments" in sidebar (or "Book Appointment" on dashboard)
3. Fill in:
   - Select doctor from dropdown
   - Pick date (must be future)
   - Pick time
4. Click "Book" to submit
5. View appointment in "Appointments" tab

### 2. Reception Portal - Walk-in Management
**Location:** ReceptionPortal.jsx

**Features:**
- Add walk-in appointment form
- Fields: Patient Name, Doctor, Date, Time
- Form validation
- Auto-assigned status: "WAITING"
- Auto-assigned source: "Reception"
- Sticky sidebar form
- Real-time list updates

**How to Use:**
1. Go to Reception Portal
2. Fill in the form on the left:
   - Enter patient name
   - Select doctor
   - Select date
   - Select time
3. Click "Add Patient"
4. Appointment appears in the list with "WAITING" status

### 3. Appointment Status Workflow

**Status Flow:**
```
BOOKED → WAITING → ACTIVE → COMPLETED
```

**Status Meaning:**
- **BOOKED**: Patient has booked the appointment (patient-initiated)
- **WAITING**: Patient is waiting (walk-in or moved from BOOKED)
- **ACTIVE**: Patient is in consultation with doctor
- **COMPLETED**: Appointment finished

**UI Status Badges:**
- BOOKED → Blue badge `bg-blue-100` 
- WAITING → Yellow badge `bg-yellow-100`
- ACTIVE → Green badge `bg-green-100`
- COMPLETED → Gray badge `bg-gray-100`

### 4. Viewing Appointments

**Patient View:**
- Dashboard → "Appointments" tab
- Shows all of patient's appointments
- Can book new appointments
- Can see all statuses

**Reception View:**
- Reception Portal
- Shows ALL appointments (both booked and walk-ins)
- Can manage status transitions
- Can add walk-ins

### 5. Data Structure

```javascript
{
  id: "A1B2C3D4",          // Unique short ID
  patientName: "John Doe",
  doctor: "Dr. Sarah Johnson",
  date: "2026-04-15",       // YYYY-MM-DD format
  time: "14:30",            // HH:MM format
  status: "BOOKED",         // BOOKED, WAITING, ACTIVE, COMPLETED
  source: "Patient",        // Patient or Reception
  createdAt: "ISO8601"      // Creation timestamp
}
```

### 6. Storage

**Key:** `appointments` (localStorage)
**Format:** JSON array of appointment objects
**Persistence:** Persists across page refreshes and browser sessions

### 7. Sorting & Display

**Appointment Sorting:**
1. Today's appointments first
2. Then by date (earliest first)
3. Then by time (earliest first)

**Display Sections:**
- **Today's Section** 🔴 - Shows "TODAY" badge
- **Upcoming Section** 📅 - All future appointments

### 8. UI Components

#### AppointmentBooking.jsx
- Patient booking modal
- Doctor dropdown (5 doctors available)
- Date and time inputs
- Form validation

#### WalkInAppointment.jsx
- Reception walk-in form
- Patient name input
- Doctor dropdown
- Date and time inputs
- Form validation

#### AppointmentsList.jsx
- Displays all appointments
- Groups today's vs upcoming
- Shows appointment details
- Status update buttons
- Color-coded status badges

#### appointmentUtils.js
- All appointment logic functions
- Status validation
- Sorting functions
- Format utilities

## Available Doctors

1. Dr. Sarah Johnson
2. Dr. Michael Chen
3. Dr. Emma Wilson
4. Dr. James Brown
5. Dr. Lisa Anderson

## Key Functions

### appointmentUtils.js

```javascript
// Get all appointments
getAppointments()

// Save appointments to localStorage
saveAppointments(appointments)

// Create new appointment object
createAppointment(patientName, doctor, date, time, status, source)

// Add appointment to list
addAppointment(appointment)

// Update appointment status
updateAppointmentStatus(appointmentId, newStatus)

// Get next allowed status
getNextStatus(currentStatus)

// Sort appointments by date and time
sortAppointments(appointments)

// Format time to readable format
formatTime(timeString) // "14:30" → "2:30 PM"

// Format date to readable format
formatDate(dateString) // "2026-04-15" → "Apr 15, 2026"

// Check if appointment is today
isToday(dateString)
```

## Validation Rules

**Patient Booking:**
- Doctor: Required, must select from dropdown
- Date: Required, must be in future
- Time: Required, valid time format
- Cannot book for past dates

**Walk-in Entry:**
- Patient Name: Required, min 2 characters
- Doctor: Required, must select from dropdown
- Date: Required, can be today or future
- Time: Required, valid time format

**Status Update:**
- Can only move to next status in sequence
- Cannot skip statuses
- BOOKED → can only go to WAITING
- WAITING → can only go to ACTIVE
- ACTIVE → can only go to COMPLETED
- COMPLETED → no more transitions

## UI/UX Features

### Appointment Cards

**Information Displayed:**
- Patient name (bold, large)
- Status badge (colored)
- Source badge (Patient/Reception)
- TODAY badge (if today's appointment)
- Doctor name
- Date (formatted)
- Time (formatted)
- Appointment ID
- Update status button (unless COMPLETED)

**Color Scheme:**
- BOOKED: Blue background with blue text
- WAITING: Yellow background with yellow text
- ACTIVE: Green background with green text
- COMPLETED: Gray background with gray text

### Navigation

**Patient Portal:**
- Sidebar: "Appointments" option
- Dashboard: "Book Appointment" button
- Appointments Tab: Full appointment list + booking

**Reception Portal:**
- Left sidebar form to add appointments
- Right side: Full appointments list
- Status update buttons inline

## Error Handling

**Patient Booking Errors:**
- "Please select a doctor"
- "Please select a date"
- "Please select a time"
- "Please select a future date"

**Walk-in Errors:**
- "Please enter patient name"
- "Patient name must be at least 2 characters"
- "Please select a doctor"
- "Please select a date"
- "Please select a time"

**Status Update Errors:**
- "Invalid status transition"

## Testing Checklist

- [x] Patient can book appointment
- [x] Walk-in form works
- [x] Appointments display correctly
- [x] Status updates work
- [x] Sorting by date/time works
- [x] Today's appointments marked
- [x] Form validation works
- [x] Error messages display
- [x] Success messages appear
- [x] Data persists in localStorage
- [x] Refresh-safe (data persists)
- [x] Responsive design

## Usage Scenarios

### Scenario 1: Patient Books Appointment
1. Patient logs in
2. Clicks "Appointments" in sidebar
3. Clicks "Book an Appointment"
4. Selects Dr. Sarah Johnson, April 10, 2026, 2:30 PM
5. Clicks "Book"
6. See success message
7. Appointment appears in list with "BOOKED" status

### Scenario 2: Walk-in Patient
1. Receptionist goes to Reception Portal
2. Fills in form: "Raj Kumar", "Dr. Michael Chen", Today, 3:00 PM
3. Clicks "Add Patient"
4. Patient appears in list with "WAITING" status
5. Receptionist clicks "Next" to move to "ACTIVE"
6. Later clicks "Next" to move to "COMPLETED"

### Scenario 3: Check Today's Appointments
1. Patient/Receptionist clicks "Appointments"
2. See "Today's Appointments" section at top
3. See "TODAY" badge on appointment cards
4. See other appointments in "Upcoming" section below

## Future Enhancements

1. **Backend Integration**
   - API endpoints for appointments
   - Doctor availability management
   - Appointment reminders

2. **Advanced Features**
   - Email/SMS notifications
   - Calendar view
   - Recurring appointments
   - Appointment cancellation
   - Doctor schedules
   - Patient availability times

3. **Analytics**
   - Appointment statistics
   - Doctor utilization
   - No-show tracking
   - Wait time analysis

4. **UI Improvements**
   - Calendar picker widget
   - Time slot selector
   - Appointment notes
   - File attachments

## Notes

- All data stored locally in browser
- No backend API integration yet
- Appointments shared across all users (no multi-user isolation)
- Data clears if browser cache is cleared
- No authentication beyond patient ID

## File Structure

```
src/
├── components/
│   ├── AppointmentBooking.jsx      (Patient booking form)
│   ├── AppointmentsList.jsx        (Display appointments)
│   └── WalkInAppointment.jsx       (Reception form)
├── pages/
│   ├── PatientDashboard.jsx        (Updated with appointments)
│   └── ReceptionPortal.jsx         (Updated with walk-ins)
└── utils/
    └── appointmentUtils.js         (Helper functions)
```

## Dependencies

- React hooks (useState, useEffect)
- react-router-dom
- react-icons (for icons)
- Tailwind CSS (styling)