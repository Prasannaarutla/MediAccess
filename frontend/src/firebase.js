import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push, set, get, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database'

// Firebase Configuration
// ⚠️ IMPORTANT: Replace DATABASE_URL with your actual Realtime Database URL
// Steps to get databaseURL:
// 1. Go to Firebase Console → Project Settings
// 2. Look for Realtime Database URL in the "Service accounts" tab
// 3. It will look like: https://YOUR-PROJECT.firebaseio.com

const firebaseConfig = {
  apiKey: "AIzaSyDHKEGMp-MLmfCbU6aG8dzENmP8BTSUU0k",
  authDomain: "mediaccess-fa658.firebaseapp.com",
  databaseURL: "https://mediaccess-fa658-default-rtdb.asia-southeast1.firebasedatabase.app", // ✅ CORRECT REGIONAL URL
  projectId: "mediaccess-fa658",
  storageBucket: "mediaccess-fa658.firebasestorage.app",
  messagingSenderId: "598090724185",
  appId: "1:598090724185:web:716b12058e1b38f937d248"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Get Database instance
export const database = getDatabase(app, "https://mediaccess-fa658-default-rtdb.asia-southeast1.firebasedatabase.app")

// Test Firebase connection
console.log('Firebase initialized')
console.log('Database URL:', firebaseConfig.databaseURL)

// Function to test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...')
    const dbRef = ref(database, '.info/connected')
    const snapshot = await get(dbRef)
    console.log('Firebase connection test:', snapshot.val())
    return true
  } catch (error) {
    console.error('Firebase connection test failed:', error)
    return false
  }
}

// ============================================
// UTILITY FUNCTIONS FOR DATABASE OPERATIONS
// ============================================

/**
 * Save data to Firebase (with timeout)
 * @param {string} path - Database path (e.g., 'patients/123')
 * @param {object} data - Data to save
 */
export const saveData = async (path, data) => {
  try {
    console.log(`Saving to ${path}:`, data)
    const dbRef = ref(database, path)
    await set(dbRef, data)
    console.log(`Successfully saved to ${path}`)
    return { success: true }
  } catch (error) {
    console.error(`Error saving data to ${path}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Add data with auto-generated ID
 * @param {string} path - Database path (e.g., 'appointments')
 * @param {object} data - Data to save
 */
export const addData = async (path, data) => {
  try {
    console.log(`Adding data to ${path}:`, data)
    const dbRef = ref(database, path)
    const newRef = push(dbRef)
    await set(newRef, { ...data, id: newRef.key })
    console.log(`Successfully added to ${path} with id:`, newRef.key)
    return { success: true, id: newRef.key }
  } catch (error) {
    console.error(`Error adding data to ${path}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Fetch data from Firebase (one-time read)
 * @param {string} path - Database path
 */
export const fetchData = async (path) => {
  try {
    console.log(`Fetching data from ${path}...`)
    const dbRef = ref(database, path)
    const snapshot = await get(dbRef)
    if (snapshot.exists()) {
      console.log(`Found data at ${path}:`, snapshot.val())
      return { success: true, data: snapshot.val() }
    } else {
      console.log(`No data found at ${path}`)
      return { success: true, data: null }
    }
  } catch (error) {
    console.error(`Error fetching data from ${path}:`, error)
    return { success: false, error: error.message, data: null }
  }
}

// Alias for convenience across different portals
export const getData = fetchData

/**
 * Update data in Firebase
 * @param {string} path - Database path
 * @param {object} updates - Fields to update
 */
export const updateData = async (path, updates) => {
  try {
    const dbRef = ref(database, path)
    await update(dbRef, updates)
    return { success: true }
  } catch (error) {
    console.error(`Error updating data at ${path}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete data from Firebase
 * @param {string} path - Database path
 */
export const deleteData = async (path) => {
  try {
    const dbRef = ref(database, path)
    await remove(dbRef)
    return { success: true }
  } catch (error) {
    console.error(`Error deleting data at ${path}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Subscribe to real-time updates
 * @param {string} path - Database path
 * @param {function} callback - Function to call when data changes
 */
export const subscribeToData = (path, callback) => {
  try {
    const dbRef = ref(database, path)
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({ success: true, data: snapshot.val() })
        } else {
          callback({ success: true, data: null })
        }
      },
      (error) => {
        console.error(`Error subscribing to ${path}:`, error)
        callback({ success: false, error: error.message })
      }
    )
    return unsubscribe
  } catch (error) {
    console.error(`Error setting up subscription for ${path}:`, error)
    return null
  }
}

/**
 * Search data by field
 * @param {string} path - Database path
 * @param {string} fieldName - Field to search by
 * @param {*} value - Value to match
 */
export const searchData = async (path, fieldName, value) => {
  try {
    const dbRef = ref(database, path)
    const snapshot = await get(dbRef)
    if (!snapshot.exists()) {
      return { success: true, data: [] }
    }

    const allData = snapshot.val()
    const results = []

    for (const key in allData) {
      if (allData[key][fieldName] === value) {
        results.push({ id: key, ...allData[key] })
      }
    }

    return { success: true, data: results }
  } catch (error) {
    console.error(`Error searching data in ${path}:`, error)
    return { success: false, error: error.message, data: [] }
  }
}

/**
 * Find single record by email
 * @param {string} path - Database path
 * @param {string} email - Email to search
 */
export const findByEmail = async (path, email) => {
  try {
    console.log(`Looking for ${email} in ${path}...`)
    const dbRef = ref(database, path)
    const snapshot = await get(dbRef)
    
    if (!snapshot.exists()) {
      console.log(`No records found in ${path}`)
      return { success: true, data: null }
    }

    const allData = snapshot.val()
    console.log(`Total records in ${path}:`, Object.keys(allData).length)
    
    for (const key in allData) {
      if (allData[key].email === email) {
        console.log(`Found match for ${email}`)
        return { success: true, data: { id: key, ...allData[key] } }
      }
    }
    
    console.log(`No match found for ${email} in ${path}`)
    return { success: true, data: null }
  } catch (error) {
    console.error(`Error finding email in ${path}:`, error)
    return { success: false, error: error.message, data: null }
  }
}

// ============================================
// CONSENT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Request consent for medical records
 */
export const requestConsent = async (patientId, doctorId, requestedBy, doctorName, appointmentId = null) => {
  const consentData = {
    patientId,
    doctorId,
    doctorName,
    appointmentId,
    requestedBy,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  }
  return await addData('consents', consentData)
}

/**
 * Revoke/Expire all active consents for a specific patient-doctor pair
 */
export const revokeDoctorAccess = async (patientId, doctorId) => {
  try {
    const result = await fetchData('consents')
    if (!result.success || !result.data) return { success: true }
    
    const consents = Object.entries(result.data).map(([id, val]) => ({ id, ...val }))
    const activeConsents = consents.filter(c => 
      c.patientId === patientId && 
      c.doctorId === doctorId && 
      c.status === 'APPROVED'
    )
    
    for (const c of activeConsents) {
      await updateData(`consents/${c.id}`, { status: 'EXPIRED', revokedAt: new Date().toISOString() })
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Log access to medical records for auditing (Start)
 */
export const startRecordViewLog = async (doctorId, doctorName, patientId, patientName, recordName) => {
  const logData = {
    doctorId,
    doctorName,
    patientId,
    patientName,
    recordName,
    startTime: new Date().toISOString(),
    status: 'VIEWING'
  }
  return await addData('accessLogs', logData)
}

/**
 * Log access to medical records for auditing (End)
 */
export const endRecordViewLog = async (logId) => {
  try {
    const result = await fetchData(`accessLogs/${logId}`)
    if (!result.success || !result.data) throw new Error('Log not found')

    const logData = result.data
    const endTime = new Date()
    const startTime = new Date(logData.startTime)
    
    // Duration in seconds
    const durationSeconds = Math.round((endTime - startTime) / 1000)
    
    return await updateData(`accessLogs/${logId}`, {
      endTime: endTime.toISOString(),
      durationSeconds,
      status: 'CLOSED'
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Log reception face scan match
 */
export const logFaceScan = async (receptionistId, patientId, patientName) => {
  const logData = {
    receptionistId,
    patientId,
    patientName,
    timestamp: new Date().toISOString()
  }
  return await addData('scanLogs', logData)
}

/**
 * Track consultation timing logic (Start)
 */
export const startDoctorConsultation = async (doctorId, doctorName, patientId, patientName, appointmentId) => {
  const logData = {
    doctorId,
    doctorName,
    patientId,
    patientName,
    appointmentId,
    startTime: new Date().toISOString(),
    status: 'IN_PROGRESS'
  }
  return await addData('doctorLogs', logData)
}

/**
 * Track consultation timing logic (End)
 */
export const endDoctorConsultation = async (logId) => {
  try {
    const result = await fetchData(`doctorLogs/${logId}`)
    if (!result.success || !result.data) throw new Error('Log not found')

    const logData = result.data
    const endTime = new Date()
    const startTime = new Date(logData.startTime)
    
    // Duration in minutes
    const duration = Math.round(((endTime - startTime) / 1000) / 60)
    
    return await updateData(`doctorLogs/${logId}`, {
      endTime: endTime.toISOString(),
      duration,
      status: 'COMPLETED'
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Update consent status (Approve/Reject/Expire)
 * @param {string} consentId
 * @param {string} status - 'APPROVED', 'REJECTED', 'EXPIRED'
 * @param {number} duration - minutes (only for APPROVED)
 */
export const updateConsentStatus = async (consentId, status, duration = null) => {
  const updates = { status, updatedAt: new Date().toISOString() }
  if (status === 'APPROVED' && duration) {
    const approvedAt = new Date()
    const expiresAt = new Date(approvedAt.getTime() + duration * 60000)
    updates.approvedAt = approvedAt.toISOString()
    updates.expiresAt = expiresAt.toISOString()
    updates.duration = duration
  }
  return await updateData(`consents/${consentId}`, updates)
}

/**
 * Get active approved consent for a doctor-patient pair
 */
export const getActiveConsent = async (patientId, doctorId) => {
  try {
    const result = await fetchData('consents')
    if (!result.success || !result.data) return { success: true, data: null }
    
    const now = new Date().toISOString()
    const consents = Object.entries(result.data).map(([id, val]) => ({ id, ...val }))
    
    // Find valid approved consent
    const active = consents.find(c => 
      c.patientId === patientId && 
      c.doctorId === doctorId && 
      c.status === 'APPROVED' && 
      c.expiresAt > now
    )
    
    // Auto-expire check: Update status to EXPIRED if past time but still marked APPROVED
    consents.forEach(async (c) => {
      if (c.status === 'APPROVED' && c.expiresAt && c.expiresAt < now) {
        await updateData(`consents/${c.id}`, { status: 'EXPIRED' })
      }
    })
    
    return { success: true, data: active || null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
