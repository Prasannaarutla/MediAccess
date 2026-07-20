/**
 * Advanced Face Recognition Utilities
 * Provides improved accuracy for patient face matching
 */

// Configuration
const DEFAULT_THRESHOLD = 0.4
const DEBUG_MODE = true

/**
 * Normalize embedding vector to unit magnitude
 * @param {number[]} embedding - Raw embedding vector
 * @returns {number[]|null} Normalized embedding or null if invalid
 */
export const normalizeEmbedding = (embedding) => {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    if (DEBUG_MODE) console.log('🔍 Invalid embedding: not an array or empty')
    return null
  }

  // Convert all values to numbers and validate
  const numeric = embedding.map(value => {
    const num = Number(value)
    if (!Number.isFinite(num)) {
      if (DEBUG_MODE) console.log('🔍 Invalid embedding value:', value)
      return null
    }
    return num
  })

  if (numeric.includes(null)) {
    if (DEBUG_MODE) console.log('🔍 Embedding contains invalid values')
    return null
  }

  // Calculate magnitude
  let magnitude = 0
  for (let i = 0; i < numeric.length; i++) {
    magnitude += numeric[i] * numeric[i]
  }
  magnitude = Math.sqrt(magnitude)

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    if (DEBUG_MODE) console.log('🔍 Invalid magnitude:', magnitude)
    return null
  }

  // Normalize to unit vector
  const normalized = numeric.map(value => value / magnitude)
  
  if (DEBUG_MODE) {
    const checkMagnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0))
    console.log('🔍 Normalization successful - magnitude:', checkMagnitude.toFixed(6))
  }

  return normalized
}

/**
 * Calculate cosine similarity between two normalized embeddings
 * @param {number[]} a - First normalized embedding
 * @param {number[]} b - Second normalized embedding
 * @returns {number} Similarity score (0-1)
 */
export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    if (DEBUG_MODE) console.log('🔍 Invalid inputs: not arrays')
    return 0
  }

  if (a.length === 0 || b.length === 0) {
    if (DEBUG_MODE) console.log('🔍 Empty embeddings detected')
    return 0
  }

  if (a.length !== b.length) {
    if (DEBUG_MODE) console.log('🔍 Embedding length mismatch:', a.length, 'vs', b.length)
    return 0
  }

  // Calculate dot product (since vectors are normalized, this equals cosine similarity)
  let dotProduct = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (DEBUG_MODE) console.log('🔍 Non-finite values at index', i, ':', x, y)
      return 0
    }
    
    dotProduct += x * y
  }

  // Clamp result to [0, 1] range for safety
  const similarity = Math.max(0, Math.min(1, dotProduct))
  
  if (DEBUG_MODE) {
    console.log(`🔍 Cosine similarity: ${similarity.toFixed(6)}`)
  }

  return similarity
}

/**
 * Average multiple embeddings to improve accuracy
 * @param {number[][]} embeddings - Array of embeddings to average
 * @returns {number[]|null} Averaged embedding or null if invalid
 */
export const averageEmbeddings = (embeddings) => {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    if (DEBUG_MODE) console.log('🔍 No embeddings to average')
    return null
  }

  const firstLength = embeddings[0].length
  
  // Validate all embeddings have same length
  for (let i = 0; i < embeddings.length; i++) {
    if (!Array.isArray(embeddings[i]) || embeddings[i].length !== firstLength) {
      if (DEBUG_MODE) console.log('🔍 Embedding length mismatch at index', i)
      return null
    }
  }

  // Calculate element-wise average
  const averaged = new Array(firstLength)
  for (let i = 0; i < firstLength; i++) {
    let sum = 0
    for (let j = 0; j < embeddings.length; j++) {
      sum += embeddings[j][i]
    }
    averaged[i] = sum / embeddings.length
  }

  if (DEBUG_MODE) {
    console.log(`🔍 Averaged ${embeddings.length} embeddings`)
  }

  return averaged
}

/**
 * Find best matching patient from database
 * @param {number[]} inputEmbedding - Input face embedding
 * @param {Object} patients - Patients object from Firebase
 * @param {number} threshold - Similarity threshold (default: 0.4)
 * @returns {Object} Match result with patient info and similarity score
 */
export const findBestMatch = (inputEmbedding, patients, threshold = DEFAULT_THRESHOLD) => {
  if (DEBUG_MODE) {
    console.log('🔍 Starting face recognition with threshold:', threshold)
    console.log('🔍 Available patients:', Object.keys(patients || {}).length)
  }

  // Normalize input embedding
  const normalizedInput = normalizeEmbedding(inputEmbedding)
  if (!normalizedInput) {
    return {
      match: false,
      patient: null,
      similarity: 0,
      error: 'Invalid input embedding'
    }
  }

  // Validate patients data
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
  let processedCount = 0

  // Compare with all patients
  for (const [patientId, patientData] of Object.entries(patients)) {
    processedCount++
    
    // Skip patients without face embedding
    if (!patientData || !patientData.faceEmbedding) {
      if (DEBUG_MODE) console.log(`🔍 Patient ${patientId}: No face embedding, skipping`)
      continue
    }

    // Normalize stored embedding
    const normalizedStored = normalizeEmbedding(patientData.faceEmbedding)
    if (!normalizedStored) {
      if (DEBUG_MODE) console.log(`🔍 Patient ${patientId}: Invalid stored embedding, skipping`)
      continue
    }

    // Calculate similarity
    const similarity = cosineSimilarity(normalizedInput, normalizedStored)
    
    // Debug logging for each patient
    if (DEBUG_MODE) {
      console.log(`🔍 Patient ${patientId}: similarity = ${similarity.toFixed(6)} (${(similarity * 100).toFixed(1)}%)`)
    }

    // Update best match if this is better
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = {
        patientId,
        ...patientData,
        matchSimilarity: similarity
      }
      
      if (DEBUG_MODE) {
        console.log(`🔍 New best match: ${patientId} with similarity ${similarity.toFixed(6)}`)
      }
    }
  }

  if (DEBUG_MODE) {
    console.log(`🔍 Processed ${processedCount} patients`)
    console.log(`🔍 Best similarity: ${bestSimilarity.toFixed(6)} (${(bestSimilarity * 100).toFixed(1)}%)`)
    console.log(`🔍 Threshold: ${threshold.toFixed(6)} (${(threshold * 100).toFixed(1)}%)`)
  }

  // Return result based on threshold
  if (bestMatch && bestSimilarity >= threshold) {
    if (DEBUG_MODE) {
      console.log(`✅ Match found: ${bestMatch.name || bestMatch.patientId} (${(bestSimilarity * 100).toFixed(1)}% confidence)`)
    }
    
    return {
      match: true,
      patient: bestMatch,
      similarity: bestSimilarity,
      error: null
    }
  }

  if (DEBUG_MODE) {
    console.log(`❌ No match found. Best similarity: ${(bestSimilarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`)
  }

  return {
    match: false,
    patient: null,
    similarity: bestSimilarity,
    error: `No matching patient found. Best similarity: ${(bestSimilarity * 100).toFixed(1)}%`
  }
}

/**
 * Validate embedding format and content
 * @param {*} embedding - Data to validate
 * @returns {boolean} True if valid embedding
 */
export const isValidEmbedding = (embedding) => {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return false
  }

  return embedding.every(value => 
    typeof value === 'number' && 
    Number.isFinite(value)
  )
}

/**
 * Format similarity score for display
 * @param {number} similarity - Similarity score (0-1)
 * @returns {string} Formatted percentage
 */
export const formatSimilarityScore = (similarity) => {
  const value = Number.isFinite(similarity) ? similarity : 0
  return `${(value * 100).toFixed(1)}%`
}

/**
 * Multi-frame capture utility for improved accuracy
 * @param {Function} captureFunction - Function that returns embedding promise
 * @param {number} frameCount - Number of frames to capture (default: 3)
 * @param {number} delayMs - Delay between frames in ms (default: 500)
 * @returns {Promise<number[]>} Averaged embedding
 */
export const captureMultipleFrames = async (captureFunction, frameCount = 3, delayMs = 500) => {
  if (DEBUG_MODE) {
    console.log(`🔍 Capturing ${frameCount} frames with ${delayMs}ms delay`)
  }

  const embeddings = []
  
  for (let i = 0; i < frameCount; i++) {
    try {
      if (i > 0) {
        // Wait between frames
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      
      const result = await captureFunction()
      
      if (result.success && result.embedding) {
        embeddings.push(result.embedding)
        if (DEBUG_MODE) {
          console.log(`🔍 Frame ${i + 1}: Captured successfully`)
        }
      } else {
        if (DEBUG_MODE) {
          console.log(`🔍 Frame ${i + 1}: Failed - ${result.error}`)
        }
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.log(`🔍 Frame ${i + 1}: Error - ${error.message}`)
      }
    }
  }

  if (embeddings.length === 0) {
    throw new Error('Failed to capture any valid frames')
  }

  if (DEBUG_MODE) {
    console.log(`🔍 Successfully captured ${embeddings.length}/${frameCount} frames`)
  }

  return averageEmbeddings(embeddings)
}

export default {
  normalizeEmbedding,
  cosineSimilarity,
  findBestMatch,
  isValidEmbedding,
  formatSimilarityScore,
  averageEmbeddings,
  captureMultipleFrames,
  DEFAULT_THRESHOLD
}
