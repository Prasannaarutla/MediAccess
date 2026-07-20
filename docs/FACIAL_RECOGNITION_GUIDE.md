# Facial Recognition Integration - Setup & Testing Guide

## System Overview

This document provides a comprehensive guide for the facial recognition system integrated into the healthcare web app. The system uses InsightFace (buffalo_l model) for face embedding extraction and cosine similarity for patient matching.

## Architecture

```
Frontend (React)
├── Patient Registration + Face Capture
│   ├── PatientRegister.jsx → User account creation
│   ├── FaceCapture.jsx → Camera capture & embedding upload
│   └── Firebase → Store embedding with patient record
│
└── Receptionist Portal + Face Scan
    ├── ReceptionPortal.jsx → Main interface
    ├── ReceptionFaceScan.jsx → Camera & patient matching
    └── Firebase → Query patient database
            │
Backend (FastAPI)
├── POST /extract-face
│   ├── Accepts: image file
│   ├── Returns: face embedding (512-dim array)
│   └── Uses: InsightFace buffalo_l model
            │
Firebase Realtime Database
├── patients/{patientId}
│   ├── name, email, phone, dob, gender, password
│   ├── patientId (PAT_XXXX format)
│   ├── faceEmbedding: [0.123, 0.456, ..., 0.789]
│   └── faceCapturDate: ISO timestamp
│
├── appointments/{appointmentId}
│   ├── patientId (optional, for face-identified patients)
│   ├── patientName, doctor, date, time
│   ├── status: WAITING | BOOKED | ACTIVE | COMPLETED
│   └── source: Reception | PatientPortal
```

---

## Component Breakdown

### 1. FaceRecognition Utilities (`src/utils/faceRecognitionUtils.js`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `sendFaceToBackend(imageBlob)` | Send image to backend, get embedding array |
| `cosineSimilarity(a, b)` | Calculate similarity between two embeddings (0-1) |
| `findMatchingPatient(inputEmbedding, patients)` | Find best matching patient from database |
| `getTodaysAppointment(appointments, patientId)` | Check if patient has appointment today |
| `isValidEmbedding(embedding)` | Validate embedding format |
| `formatSimilarityScore(similarity)` | Format score for UI display |

**Backend Integration:**
- Endpoint: `http://localhost:8000/extract-face`
- Method: POST (multipart/form-data)
- Input: Image file
- Output: `{ embedding: [...], face_detected: true }`

### 2. Patient Registration Flow

**File:** `src/pages/PatientRegister.jsx`

**Flow:**
```
1. User creates account
   ↓
2. Form validation (name, email, phone, DOB, password)
   ↓
3. Generate patientId (PAT_XXXX)
   ↓
4. Save patient data to Firebase (patients/{patientId})
   → NOT YET STORED: faceEmbedding (added in next step)
   ↓
5. Navigate to /face-capture
```

### 3. Face Capture for Patient Registration

**File:** `src/pages/FaceCapture.jsx`

**Flow:**
```
1. Camera initialization (frontend)
   ↓
2. User captures face image
   ↓
3. Convert image → blob
   ↓
4. Send to backend (/extract-face)
   ↓
5. Backend returns faceEmbedding array
   ↓
6. Validate embedding (must be array of numbers)
   ↓
7. Update Firebase: patients/{patientId}/faceEmbedding
   ↓
8. Store in localStorage:
   - patientId
   - patientLoggedIn = true
   - patientFaceEmbedding (JSON)
   ↓
9. Navigate to /patient/dashboard
```

**Key Update:**
- Firebase path: `patients/{patientId}`
- Data: `{ faceEmbedding: [...], faceCapturDate: ISO }`
- No image stored - only embedding (512-dim float array)

### 4. Reception Face Scan

**File:** `src/components/ReceptionFaceScan.jsx`

**Flow:**
```
1. Receptionist clicks "Scan Patient Face"
   ↓
2. Modal opens with camera feed
   ↓
3. Capture face image (same as registration)
   ↓
4. Send to backend → get inputEmbedding
   ↓
5. Fetch all patients from Firebase (patients/)
   ↓
6. For each patient with faceEmbedding:
   similarity = cosineSimilarity(inputEmbedding, patient.faceEmbedding)
   ↓
7. Find patient with highest similarity
   ↓
8. If similarity ≥ 0.6 (threshold):
   → Match found, display patient details
   → Receptionist can "Use This Patient"
   ↓
9. If similarity < 0.6:
   → No match found, show best similarity score
   → Can try another face
```

**Similarity Threshold:** 0.6 (60%)
- Scores < 0.6: Not a match
- Scores 0.6-0.8: Good match
- Scores > 0.8: Excellent match

### 5. Reception Portal Integration

**File:** `src/pages/ReceptionPortal.jsx`

**New Features:**
- "Scan Patient Face" button (blue, with camera icon)
- Face-identified patient display (green box with name & ID)
- Clear Selection button
- Pass matched patient to WalkInAppointment form

### 6. Walk-in Appointment with Face ID

**File:** `src/components/WalkInAppointment.jsx`

**Updates:**
- Accept `preFilledPatient` prop
- Auto-fill patient name when face-identified
- Patient name field disabled when pre-filled
- Show "✓ Face-identified patient" badge
- Create appointment with `patientId` (if available)

**Appointment Structure:**
```javascript
{
  patientName: "John Doe",
  patientId: "PAT_1234",  // NEW: from face scan
  doctor: "Dr. Sarah Johnson",
  date: "2025-12-25",
  time: "14:30",
  status: "WAITING",
  source: "Reception",
  createdAt: "2025-04-09T10:30:00Z"
}
```

---

## Setup Checklist

### Backend Requirements

- [ ] FastAPI server running on `http://localhost:8000`
- [ ] InsightFace installed: `pip install insightface`
- [ ] Model downloaded: buffalo_l (automatic on first use)
- [ ] `/extract-face` endpoint implemented
- [ ] CORS enabled for `http://localhost:3000` (frontend)

**FastAPI Integration:**
```python
from insightface.app import FaceAnalysis
from fastapi import FastAPI, UploadFile

app = FaceAnalysis(name='buffalo_l')

@app.post("/extract-face")
async def extract_face(file: UploadFile):
    image_data = await file.read()
    # Process with InsightFace
    # Return embedding as list of floats
    return {"embedding": [...], "face_detected": True}
```

### Frontend Requirements

- [ ] React app running on `http://localhost:3000`
- [ ] `react-webcam` installed: `npm install react-webcam`
- [ ] `react-icons` installed: `npm install react-icons`
- [ ] Firebase configured (faceEmbedding support)
- [ ] Routes set up:
  - `/patient/register` → PatientRegister
  - `/face-capture` → FaceCapture
  - `/reception` → ReceptionPortal
  - `/patient/dashboard` → PatientDashboard

### Firebase Database Structure

Required paths and fields:

**patients/ collection:**
```json
{
  "patientId": "PAT_1234",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "dob": "1990-01-15",
  "gender": "Male",
  "password": "hashed_password",
  "registeredAt": "2025-04-09T10:00:00Z",
  "faceEmbedding": [0.123, 0.456, ..., 0.789],  // 512 floats
  "faceCapturDate": "2025-04-09T10:15:00Z"
}
```

**appointments/ collection:**
```json
{
  "patientId": "PAT_1234",  // NEW: optional, for face-identified
  "patientName": "John Doe",
  "doctor": "Dr. Sarah Johnson",
  "date": "2025-04-10",
  "time": "14:30",
  "status": "WAITING",
  "source": "Reception",
  "createdAt": "2025-04-09T10:20:00Z"
}
```

---

## Step-by-Step Testing

### Test 1: Patient Registration with Face Capture

**Goal:** Register a new patient with face embedding

1. Open React app: `http://localhost:3000`
2. Navigate to Patient Registration
3. Fill form:
   - Name: `Test Patient`
   - DOB: `1990-01-15`
   - Gender: `Male`
   - Phone: `555-1234`
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Register"
5. Redirect to FaceCapture page
6. Allow camera access
7. Click "Capture Face"
8. Take a clear photo of your face
9. Click "Continue"

**Expected Results:**
- Console shows: "✅ Face embedding extracted successfully"
- Firebase receives update with faceEmbedding array
- Redirects to patient dashboard
- Patient successfully stored with embedding

**Verify in Firebase Console:**
```
patients/PAT_1234/
  ├── name: "Test Patient"
  ├── faceEmbedding: [0.123, 0.456, ..., 0.789]  ← Check this
  └── faceCapturDate: "2025-04-09T..."
```

### Test 2: Receptionist Face Scan (Same Patient)

**Goal:** Find registered patient using face scan

**Prerequisites:** Must have registered at least one patient with face

1. Open ReceptionPortal: `http://localhost:3000/reception`
2. Click blue "Scan Patient Face" button
3. Allow camera access
4. Position face clearly in frame
5. Click "Capture Face"
6. Wait for processing (shows "Scanning...")
7. Review result

**Expected Results:**
- Console shows: `Patient {name}: similarity = 0.xxxx`
- If similarity ≥ 0.6: Match found screen
- Shows patient name, ID, email, phone
- Shows match confidence percentage
- Button: "Use This Patient"

**Verify:**
- Open browser DevTools → Console
- Should see similarity scores for all patients
- Best match highlighted if ≥ 0.6 threshold

### Test 3: Complete Appointment Creation with Face ID

**Goal:** Create appointment for face-identified patient

**Prerequisites:** Complete Test 1 & 2

1. In ReceptionPortal, click "Scan Patient Face"
2. Scan the same face as registered patient
3. Click "Use This Patient"
4. Observe:
   - Face-identified patient box appears (green)
   - Shows patient name and ID
   - Patient name in form is disabled & pre-filled
5. Fill appointment details:
   - Doctor: Select any doctor
   - Date: Today or future
   - Time: Any time
6. Click "Add Patient"

**Expected Results:**
- Appointment created with patientId
- Firebase receives appointment with face-identified data
- Form resets
- Face-identified patient cleared
- Appointments list refreshes

### Test 4: Receptionist Face Scan (Wrong Face)

**Goal:** Verify no match when unregistered face is scanned

**Prerequisites:** Backend running, at least one patient registered

1. In ReceptionPortal, click "Scan Patient Face"
2. Scan a different face (not registered patient)
3. Click "Scan Face"

**Expected Results:**
- Console shows various similarity scores
- All scores < 0.6
- No match found screen appears
- Shows best similarity (e.g., 0.45)
- Button: "Try Again"

### Test 5: Error Handling

**Goal:** Verify graceful error handling

**Test 5a: Backend Not Running**
1. Stop FastAPI backend
2. Try to register patient
3. At face capture, click "Continue"

**Expected:** Error message: "Network error" or "Failed to extract face"

**Test 5b: No Face Detected**
1. In ReceptionFaceScan, point camera at blank wall (no face)
2. Click "Scan Face"

**Expected:** Error message: "No face detected in image"

**Test 5c: Invalid Image**
1. Try to upload corrupted image

**Expected:** Error message from backend or validation error

---

## File Structure

```
src/
├── utils/
│   ├── faceRecognitionUtils.js  ← NEW: Face logic
│   ├── appointmentUtils.js      ← UPDATED: patientId support
│   └── fileUploadUtils.js
│
├── components/
│   ├── ReceptionFaceScan.jsx    ← NEW: Reception scanning
│   ├── WalkInAppointment.jsx    ← UPDATED: face pre-fill
│   ├── AppointmentsList.jsx
│   ├── MedicalRecordsUpload.jsx
│   └── AppointmentBooking.jsx
│
└── pages/
    ├── FaceCapture.jsx           ← UPDATED: embedding upload
    ├── PatientRegister.jsx       ← No changes (already works)
    ├── ReceptionPortal.jsx       ← UPDATED: face scan button
    ├── PatientDashboard.jsx
    ├── DoctorPortal.jsx
    └── ... (other pages)
```

---

## Troubleshooting

### Issue: "Face embedding extracted successfully" but appointment not created

**Cause:** Patient name validation in WalkInAppointment still requires input

**Solution:** Ensure patient name is pre-filled and form validates correctly

### Issue: Face similarity always very low (0.1-0.3)

**Cause:** Different model versions, poor image quality, or lighting issues

**Solution:**
- Ensure buffalo_l model is used
- Improve lighting during capture
- Face should be clearly visible (no glasses, no extreme angles)
- Retry with better image

### Issue: Backend returns empty embedding

**Cause:** InsightFace model failed to extract embedding (no face detected)

**Solution:**
- Backend should return `face_detected: false`
- Frontend shows error: "No face detected"
- User should retake with clearer face

### Issue: Firebase updates not showing in ReceptionFaceScan

**Cause:** Real-time listener not refreshing

**Solution:**
- Close and reopen face scan modal
- Check Firebase security rules allow read
- Verify patientId is set in patient records

### Issue: CORS error when calling backend

**Cause:** Backend CORS settings not configured

**Solution:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Security Considerations

1. **Embeddings Only:** Never store actual images in database
   - Only 512-dimensional float arrays (embeddings)
   - Embeddings cannot be reversed to get original image
   - Storage size: ~2KB per patient

2. **Similarity Threshold:** Set to 0.6 to prevent false matches
   - Adjust if needed based on your accuracy requirements
   - Higher threshold = more secure but more false negatives

3. **Face Detection Check:** Backend should validate face exists
   - `face_detected: true` before returning embedding
   - Prevents storing invalid/empty embeddings

4. **Patient Privacy:**
   - Face embeddings tied to patientId (anonymized reference)
   - No personally identifiable image data stored
   - Compliant with privacy regulations

---

## Performance Notes

- **Face Extraction:** ~500-1000ms per image (first run slower)
- **Similarity Search:** O(n) where n = number of patients
  - 100 patients: ~5-10ms
  - 1000 patients: ~50-100ms
  - Consider indexing for very large datasets

- **Storage:**
  - Embedding: ~2KB per patient
  - 1000 patients = ~2MB in Firebase

- **Frontend:**
  - Webcam processing: ~100ms
  - Image blob creation: ~50ms
  - FormData preparation: ~10ms

---

## Next Steps & Enhancements

1. **Batch Enrollment:** Allow uploading multiple photos per patient for better matching
2. **Liveness Detection:** Add face liveness check to prevent spoofing
3. **Performance:** Pre-compute embeddings at registration, implement caching
4. **Analytics:** Log match attempts, confidence scores, false rejections
5. **Multi-Modal:** Combine face + ID card + voice for stronger matching
6. **Duplicate Detection:** Prevent duplicate registrations using face search

---

**Last Updated:** April 9, 2025
**Facial Recognition System Version:** 1.0
