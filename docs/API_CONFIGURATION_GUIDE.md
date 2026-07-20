# API Reference & Configuration Guide

## Backend API Specification

### POST /extract-face

**Purpose:** Extract 512-dimensional face embedding from image

**Endpoint:** `http://localhost:8000/extract-face`

**Method:** POST

**Request:**
```
Content-Type: multipart/form-data

Body:
  - Key: file
  - Value: Image file (JPEG, PNG)
  - Max Size: 5MB recommended
```

**Response (Success):**
```json
{
  "embedding": [0.123, 0.456, ..., 0.789],
  "face_detected": true,
  "model": "buffalo_l",
  "embedding_size": 512,
  "status": "success"
}
```

**Response (No Face):**
```json
{
  "embedding": [],
  "face_detected": false,
  "error": "No face detected in image",
  "status": "error"
}
```

**Response (Error):**
```json
{
  "error": "File corrupted or invalid format",
  "status": "error"
}
```

**Example Request (cURL):**
```bash
curl -X POST http://localhost:8000/extract-face \
  -F "file=@/path/to/image.jpg"
```

**Example Request (JavaScript):**
```javascript
const formData = new FormData()
formData.append('file', imageBlob)

const response = await fetch('http://localhost:8000/extract-face', {
  method: 'POST',
  body: formData
})

const data = await response.json()
console.log(data.embedding)  // [512 floats]
```

---

## Configuration Files

### 1. Frontend Configuration

**File:** `src/utils/faceRecognitionUtils.js`

```javascript
// ═══════════════════════════════════════════════════
// CONFIGURATION SECTION (Lines 1-10)
// ═══════════════════════════════════════════════════

const FACE_BACKEND_URL = 'http://localhost:8000'
// Change this if backend running on different port:
// const FACE_BACKEND_URL = 'http://localhost:5000'
// const FACE_BACKEND_URL = 'http://backend.example.com'

const SIMILARITY_THRESHOLD = 0.6
// Adjust for your use case:
// 0.5 = More lenient (more false positives)
// 0.6 = Balanced (default)
// 0.7 = Stricter (more false negatives)
// 0.8 = Very strict (only identical faces)
```

### 2. Backend Configuration

**File:** `face-backend/main.py` (or equivalent)

```python
# ═══════════════════════════════════════════════════
# CORS Configuration
# ═══════════════════════════════════════════════════

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev server
        "http://localhost:5173",      # Vite dev server
        "http://your-domain.com",     # Production domain
    ],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ═══════════════════════════════════════════════════
# Model Configuration
# ═══════════════════════════════════════════════════

face_analysis = FaceAnalysis(
    name='buffalo_l',  # Model name (fixed)
    root='~/.insightface',  # Cache directory
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
    # Use 'CUDAExecutionProvider' if GPU available
    # Falls back to CPU automatically
)
face_analysis.prepare(ctx_id=0)  # ctx_id=0 (GPU), ctx_id=-1 (CPU)
```

### 3. Firebase Configuration

**File:** `src/firebase.js`

```javascript
// ═══════════════════════════════════════════════════
// FIREBASE CONFIG SECTION
// ═══════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-rtdb.region.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}

// Note: databaseURL must match your region:
// - us-central1: https://PROJECT.firebaseio.com
// - europe-west1: https://PROJECT-default-rtdb.europe-west1.firebasedatabase.app
// - asia-southeast1: https://PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app
```

**Firebase Realtime Database Security Rules:**

```json
{
  "rules": {
    "patients": {
      "$patientId": {
        ".read": "auth != null",
        ".write": "auth != null || root.child('patients').child($patientId).exists()",
        "faceEmbedding": {
          ".validate": "newData.isArray() && newData.val().length == 512"
        }
      }
    },
    "appointments": {
      "$appointmentId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## Environment Variables

### Backend (.env)

```bash
# face-backend/.env

FACE_MODEL=buffalo_l
FACE_MODEL_ROOT=~/.insightface
GPU_ENABLED=true
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://your-domain.com
LOG_LEVEL=INFO
MAX_FILE_SIZE=5242880  # 5MB in bytes
```

### Frontend (.env)

```bash
# .env (in root or vite.config.js)

VITE_BACKEND_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_DATABASE_URL=https://your-project-rtdb.region.firebasedatabase.app
```

---

## Database Schema

### Complete Firebase Structure

```
firebase-root/
│
├── patients/                          # Patient directory
│   └── {patientId}/                   # e.g., PAT_1234
│       ├── name: string               # "John Doe"
│       ├── email: string              # "john@example.com"
│       ├── phone: string              # "555-1234"
│       ├── dob: string                # "1990-01-15"
│       ├── gender: string             # "Male" | "Female" | "Other"
│       ├── password: string           # Hashed password
│       ├── registeredAt: string       # ISO timestamp
│       ├── faceEmbedding: array       # [512 floats] ← NEW
│       └── faceCapturDate: string     # ISO timestamp ← NEW
│
├── appointments/                      # Appointment directory
│   └── {appointmentId}/               # Auto-generated ID
│       ├── patientId: string          # "PAT_1234" (optional) ← NEW
│       ├── patientName: string        # "John Doe"
│       ├── doctor: string             # "Dr. Sarah Johnson"
│       ├── date: string               # "2025-04-10"
│       ├── time: string               # "14:30" (24-hour format)
│       ├── status: string             # "WAITING" | "BOOKED" | "ACTIVE" | "COMPLETED"
│       ├── source: string             # "Reception" | "PatientPortal"
│       └── createdAt: string          # ISO timestamp
│
└── doctors/                           # (Optional) Doctor directory
    └── {doctorId}/
        ├── name: string
        ├── specialization: string
        └── contact: string
```

---

## Component Communication Flow

### Data Flow Map

```
User Input
    ↓
React Component
    ↓
Utility Function
    ├── Image Processing (sendFaceToBackend)
    │   └─ FastAPI Backend (/extract-face)
    │      └─ InsightFace Model
    │         └─ Returns embedding [512]
    ├── Firebase CRUD (saveData, updateData, fetchData)
    │   └─ Realtime Database
    │      └─ JSON data
    └─ Logic (cosineSimilarity, findMatchingPatient)
        └─ Pure JavaScript computation
    ↓
Update State
    ↓
Re-render Component
    ↓
User Sees Result
```

### Component Imports Map

```
ReceptionPortal.jsx
├── ReceptionFaceScan.jsx
│   ├── faceRecognitionUtils.js
│   │   └── (Custom logic, no external imports)
│   ├── firebase.js
│   │   └── fetchData() function
│   └── react-icons (FiX, FiCheck)
│
├── WalkInAppointment.jsx
│   ├── appointmentUtils.js
│   │   └── createAppointment() function (UPDATED)
│   └── react-icons (FiX)
│
└── AppointmentsList.jsx
    └── appointmentUtils.js

PatientRegister.jsx
└── firebase.js
    └── saveData() function

FaceCapture.jsx
├── faceRecognitionUtils.js
│   ├── sendFaceToBackend()
│   ├── dataUrlToBlob()
│   └── isValidEmbedding()
└── firebase.js
    └── updateData() function
```

---

## API Unit Tests

### Test sendFaceToBackend()

```javascript
// Manual test in browser console
import { sendFaceToBackend, dataUrlToBlob } from '/src/utils/faceRecognitionUtils.js'

// Create test image blob
async function testFaceExtraction() {
  // Get canvas element
  const canvas = document.querySelector('canvas')
  canvas.toBlob(async (blob) => {
    const result = await sendFaceToBackend(blob)
    
    console.log('Result:', result)
    console.assert(result.success === true, 'Should succeed')
    console.assert(Array.isArray(result.embedding), 'Should return array')
    console.assert(result.embedding.length === 512, 'Should have 512 elements')
    console.log('✓ Test passed!')
  })
}

testFaceExtraction()
```

### Test cosineSimilarity()

```javascript
import { cosineSimilarity } from '/src/utils/faceRecognitionUtils.js'

// Create test vectors
const vectorA = Array(512).fill(0.1)  // All 0.1
const vectorB = Array(512).fill(0.1)  // Identical

const similarity = cosineSimilarity(vectorA, vectorB)
console.assert(Math.abs(similarity - 1.0) < 0.0001, 'Identical vectors should have similarity ≈ 1.0')
console.log('✓ Test passed!')

// Different vectors
const vectorC = Array(512).fill(0.2)
const similarity2 = cosineSimilarity(vectorA, vectorC)
console.assert(similarity2 > 0.99, 'Similar vectors should have high similarity')
console.log('✓ Test passed!')
```

### Test findMatchingPatient()

```javascript
import { findMatchingPatient } from '/src/utils/faceRecognitionUtils.js'

const inputEmbedding = Array(512).fill(0.1)
const patients = {
  PAT_1: {
    name: 'John',
    patientId: 'PAT_1',
    faceEmbedding: Array(512).fill(0.1)  // Perfect match
  },
  PAT_2: {
    name: 'Jane',
    patientId: 'PAT_2',
    faceEmbedding: Array(512).fill(0.5)  // Different
  }
}

const result = findMatchingPatient(inputEmbedding, patients)
console.assert(result.match === true, 'Should find match')
console.assert(result.patient.patientId === 'PAT_1', 'Should match PAT_1')
console.log('✓ Test passed!')
```

---

## Troubleshooting Configurations

### Backend Connection Issues

```javascript
// Test backend connectivity
async function testBackendConnection() {
  try {
    const response = await fetch('http://localhost:8000/docs')
    if (response.ok) {
      console.log('✓ Backend is running')
      return true
    }
  } catch (error) {
    console.log('✗ Backend is not running')
    console.log('Fix: Start backend with: python main.py')
    return false
  }
}

testBackendConnection()
```

### Firebase Connection Issues

```javascript
// Test Firebase connectivity
import { testFirebaseConnection } from '/src/firebase.js'

await testFirebaseConnection()
// If fails: Check Firebase config in src/firebase.js
```

### Model Loading Issues

```python
# Debug backend model loading
from insightface.app import FaceAnalysis

try:
    app = FaceAnalysis(name='buffalo_l')
    print('✓ Model loaded successfully')
except Exception as e:
    print(f'✗ Model loading failed: {e}')
    print('Fix: pip install insightface')
```

---

## Performance Tuning

### Frontend Optimization

```javascript
// Reduce similarity calculation time (for many patients)
// Current: O(n × embedding_size) = O(n × 512)

// Option 1: Limit search to recent patients
const recentPatients = Object.entries(patients)
  .slice(-100)  // Only last 100 patients
  .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})

// Option 2: Filter by metadata first (e.g., gender)
const filteredPatients = Object.entries(patients)
  .filter(([_, p]) => p.gender === similarGender)
  .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})

// Then run similarity search on filtered set
const result = findMatchingPatient(inputEmbedding, filteredPatients)
```

### Backend Optimization

```python
# Use GPU for faster inference
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0)  # ctx_id=0 uses GPU, ctx_id=-1 uses CPU

# Cache model to avoid reloading
# Call app.extract() once during startup to ensure model loaded
```

---

## Migration Guide

### If already have appointments without patientId

```javascript
// Migration function to add patientId retroactively
async function migrateAppointments() {
  const appointments = await fetchData('appointments')
  
  for (const [appId, app] of Object.entries(appointments)) {
    if (!app.patientId) {
      // Find matching patient by name
      const patients = await fetchData('patients')
      const matchingPatient = Object.values(patients).find(
        p => p.name === app.patientName
      )
      
      if (matchingPatient) {
        await updateData(`appointments/${appId}`, {
          patientId: matchingPatient.patientId
        })
      }
    }
  }
  
  console.log('✓ Migration complete')
}

// Run once: migrateAppointments()
```

---

## Monitoring & Logging

### Frontend Logging Points

```javascript
// In faceRecognitionUtils.js, logs appear for:
console.log('✅ Face embedding extracted successfully')
console.log(`Patient ${patientId}: similarity = ${similarity.toFixed(4)}`)
console.log(`✅ Match found: ${bestMatch.name} (similarity: ${bestSimilarity.toFixed(4)})`)
console.log(`❌ No match found. Best similarity: ${bestSimilarity.toFixed(4)}`)
console.error('❌ Error sending face to backend:', error)
```

### Backend Logging Points

```python
# In FastAPI endpoint, logs appear for:
logger.info(f"Processing image: {filename}")
logger.info(f"Face detected: {len(bboxes)} face(s)")
logger.info(f"Embedding size: {embedding.shape}")
logger.error(f"Face detection failed: {error}")
```

### Firebase Logging

```javascript
// Enable Firebase debug logging
import { enableLogging } from 'firebase/database'
enableLogging(true)  // Enable in development only
```

---

## Deployment Checklist

- [ ] Backend running on stable server
- [ ] Frontend served from HTTPS (for camera access)
- [ ] Firebase rules configured correctly
- [ ] CORS origins updated for production domain
- [ ] Environment variables set up
- [ ] Database backups configured
- [ ] Error monitoring (Sentry, LogRocket) enabled
- [ ] Analytics tracking configured
- [ ] Rate limiting enabled on backend
- [ ] SSL certificate valid for camera permissions

---

**Last Updated:** April 9, 2025
**Configuration Version:** 1.0
