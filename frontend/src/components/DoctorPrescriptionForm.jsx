import React, { useState } from 'react'
import { FiPlus, FiTrash2, FiSave, FiX, FiCheck } from 'react-icons/fi'
import { addData } from '../firebase'

export default function DoctorPrescriptionForm({ patientId, patientName, doctorId, doctorName, appointmentId, onClose }) {
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [medications, setMedications] = useState([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  }

  const handleRemoveMedication = (index) => {
    const newMeds = [...medications]
    newMeds.splice(index, 1)
    setMedications(newMeds)
  }

  const handleMedChange = (index, field, value) => {
    const newMeds = [...medications]
    newMeds[index][field] = value
    setMedications(newMeds)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!diagnosis.trim()) {
      alert("Please enter a diagnosis.")
      return
    }

    const validMeds = medications.filter(m => m.name.trim() !== '')
    if (validMeds.length === 0) {
      alert("Please add at least one medication.")
      return
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      
      const prescriptionData = {
        patientId,
        patientName,
        doctorId,
        doctorName,
        appointmentId,
        diagnosis,
        medications: validMeds,
        notes,
        followUpDate,
        createdAt: now
      }

      // Step 2: Save to prescriptions table
      const rxResult = await addData(`patients/${patientId}/prescriptions`, prescriptionData)
      
      if (!rxResult.success) throw new Error("Failed to save prescription")

      // Step 3: Link to medical records table so it behaves like an uploaded document
      const recordData = {
        type: 'prescription',
        prescriptionId: rxResult.id,
        fileName: `Prescription - ${new Date().toLocaleDateString()}`,
        fileType: 'prescription', // custom type tag
        uploadedBy: doctorId,
        uploadedAt: now
      }

      await addData(`patients/${patientId}/records`, recordData)

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error("Error saving prescription:", error)
      alert("Error saving prescription. Please try again.")
    } finally {
      if (!success) setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-min my-auto relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">New Prescription</h2>
            <p className="text-sm text-slate-500 mt-1">Patient: <span className="font-semibold text-slate-700">{patientName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full transition shadow-sm border border-slate-200">
            <FiX size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
              <FiCheck size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Prescription Saved Successfully</h3>
            <p className="text-slate-500">It is now securely attached to the patient's medical records.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-8">
              
              {/* Diagnosis section */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 border-l-4 border-blue-500 pl-2">Clinical Diagnosis *</label>
                <input 
                  type="text" 
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="E.g., Acute Viral Pharyngitis"
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                  required
                />
              </div>

              {/* Medications Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold text-slate-700 border-l-4 border-emerald-500 pl-2">Medications *</label>
                  <button 
                    type="button" 
                    onClick={handleAddMedication}
                    className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                  >
                    <FiPlus /> Add Medicine
                  </button>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 font-semibold w-1/3">Medicine Name</th>
                        <th className="p-3 font-semibold">Dosage</th>
                        <th className="p-3 font-semibold">Frequency</th>
                        <th className="p-3 font-semibold">Duration</th>
                        <th className="p-3 font-semibold">Notes</th>
                        <th className="p-3 font-semibold w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {medications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <input type="text" placeholder="E.g., Amoxicillin" value={med.name} onChange={e => handleMedChange(idx, 'name', e.target.value)} className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1" required />
                          </td>
                          <td className="p-3">
                            <input type="text" placeholder="500mg" value={med.dosage} onChange={e => handleMedChange(idx, 'dosage', e.target.value)} className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1" />
                          </td>
                          <td className="p-3">
                            <input type="text" placeholder="1-0-1" value={med.frequency} onChange={e => handleMedChange(idx, 'frequency', e.target.value)} className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1" />
                          </td>
                          <td className="p-3">
                            <input type="text" placeholder="5 days" value={med.duration} onChange={e => handleMedChange(idx, 'duration', e.target.value)} className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1" />
                          </td>
                          <td className="p-3">
                            <input type="text" placeholder="After meals" value={med.instructions} onChange={e => handleMedChange(idx, 'instructions', e.target.value)} className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-xs" />
                          </td>
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => handleRemoveMedication(idx)} className="text-slate-300 hover:text-red-500 transition p-1" disabled={medications.length === 1}>
                              <FiTrash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {medications.length === 0 && (
                    <div className="p-6 text-center text-slate-400">No medications added</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Doctor's Advice / Notes</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Dietary instructions, rest required, etc."
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Follow-up Date (Optional)</label>
                  <input 
                    type="date" 
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                  />
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : <><FiSave /> Save Prescription</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
