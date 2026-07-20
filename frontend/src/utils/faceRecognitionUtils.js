/**
 * Face Recognition Utility Functions
 * Handles face embedding extraction, storage, and matching
 */

const FACE_BACKEND_URL = import.meta.env.VITE_FACE_BACKEND_URL || 'http://localhost:8000'
const envThreshold = Number.parseFloat(import.meta.env.VITE_FACE_MATCH_THRESHOLD || '')
export const SIMILARITY_THRESHOLD = Number.isFinite(envThreshold) ? envThreshold : 0.4

/**
 * Convert data URL (canvas capture) to blob
 * @param {string} dataUrl - Data URL from canvas
 * @returns {Blob} Image blob
 */
export const dataUrlToBlob = (dataUrl) => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i += 1) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}

/**
 * Send face image to backend and get embedding
 * @param {Blob|File} imageBlob - Image to process
 * @returns {Promise<Object>} { embedding: [...], success: bool, error: string }
 */
export const sendFaceToBackend = async (imageBlob) => {
  try {
    if (!imageBlob) {
      return { success: false, error: 'No image provided' }
    }

    const imageFile = imageBlob instanceof File
      ? imageBlob
      : new File([imageBlob], 'face.jpg', { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('file', imageFile)

    const response = await fetch(`${FACE_BACKEND_URL}/extract-face`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error || `Backend error: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    const embedding = data?.embedding

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return {
        success: false,
        error: data?.error || 'Invalid response from backend: missing embedding'
      }
    }

    const backendFaceDetected = typeof data?.face_detected === 'boolean' ? data.face_detected : true

    return {
      success: true,
      embedding,
      faceDetected: backendFaceDetected
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error.message}`
    }
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} a - First embedding vector
 * @param {number[]} b - Second embedding vector
 * @returns {number} Similarity score (0-1)
 */
export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return 0
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i += 1) {
    const x = Number(a[i])
    const y = Number(b[i])

    if (Number.isNaN(x) || Number.isNaN(y)) {
      return 0
    }

    dotProduct += x * y
    magnitudeA += x * x
    magnitudeB += y * y
  }

  const denom = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)
  return denom === 0 ? 0 : dotProduct / denom
}

const normalizeEmbedding = (embedding) => {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return null
  }

  const numeric = embedding.map((value) => Number(value))
  if (numeric.some((value) => Number.isNaN(value) || !Number.isFinite(value))) {
    return null
  }

  const magnitude = Math.sqrt(numeric.reduce((sum, value) => sum + value * value, 0))
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return null
  }

  return numeric.map((value) => value / magnitude)
}

/**
 * Find best matching patient from patients map
 * @param {number[]} inputEmbedding
 * @param {Object<string, Object>} patients
 * @param {number} [threshold=SIMILARITY_THRESHOLD]
 */
export const findMatchingPatient = (inputEmbedding, patients, threshold = SIMILARITY_THRESHOLD) => {
  const normalizedInput = normalizeEmbedding(inputEmbedding)
  if (!normalizedInput) {
    return {
      match: false,
      patient: null,
      similarity: 0,
      error: 'Invalid embedding provided'
    }
  }

  if (!patients || typeof patients !== 'object') {
    return {
      match: false,
      patient: null,
      similarity: 0,
      error: 'No patients data available'
    }
  }

  let bestMatch = null
  let bestSimilarity = 0

  Object.entries(patients).forEach(([patientId, patientData]) => {
    const normalizedStored = normalizeEmbedding(patientData?.faceEmbedding)
    if (!normalizedStored) {
      return
    }

    const similarity = cosineSimilarity(normalizedInput, normalizedStored)
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = {
        patientId,
        ...patientData,
        matchSimilarity: similarity
      }
    }
  })

  if (bestMatch && bestSimilarity >= threshold) {
    return {
      match: true,
      patient: bestMatch,
      similarity: bestSimilarity,
      error: null
    }
  }

  return {
    match: false,
    patient: null,
    similarity: bestSimilarity,
    error: 'No matching patient found'
  }
}

/**
 * Validate face embedding format
 * @param {*} embedding
 * @returns {boolean}
 */
export const isValidEmbedding = (embedding) => {
  return (
    Array.isArray(embedding)
    && embedding.length > 0
    && embedding.every((value) => typeof value === 'number' && Number.isFinite(value))
  )
}

/**
 * Format similarity score for display
 * @param {number} similarity - Similarity score (0-1)
 */
export const formatSimilarityScore = (similarity) => {
  const value = Number.isFinite(similarity) ? similarity : 0
  return `${(value * 100).toFixed(1)}%`
}
