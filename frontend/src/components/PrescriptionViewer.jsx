import React, { useEffect, useState } from 'react'
import { fetchData } from '../firebase'
import { FiDownload } from 'react-icons/fi'

export default function PrescriptionViewer({ patientId, prescriptionId }) {
  const [rxData, setRxData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrescription = async () => {
      setLoading(true)
      const res = await fetchData(`patients/${patientId}/prescriptions/${prescriptionId}`)
      if (res.success && res.data) {
        setRxData(res.data)
      }
      setLoading(false)
    }
    
    if (patientId && prescriptionId) {
      fetchPrescription()
    }
  }, [patientId, prescriptionId])

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading prescription details...</p>
      </div>
    )
  }

  if (!rxData) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12 bg-white rounded-xl text-red-500">
        Record not found or access denied.
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto w-full">
      <div className="max-w-3xl mx-auto bg-white min-h-full shadow-sm p-8 sm:p-12 relative flex flex-col">
        
        {/* Header - Clinic Details */}
        <div className="border-b-2 border-slate-800 pb-6 mb-6 flex justify-between items-end">
           <div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tight">MediAccess Clinic</h1>
             <p className="text-slate-500 text-sm font-medium mt-1">Multi-Specialty Healthcare Services</p>
           </div>
           <div className="text-right">
             <h2 className="text-xl font-bold text-slate-800">Dr. {rxData.doctorName}</h2>
             <p className="text-slate-500 text-sm">Consultant Physician</p>
           </div>
        </div>

        {/* Patient Details Row */}
        <div className="flex flex-wrap items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100 mb-8">
           <div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Patient Name</span>
             <span className="text-lg font-bold text-slate-800">{rxData.patientName}</span>
           </div>
           <div className="text-right">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</span>
             <span className="text-slate-800 font-medium">{new Date(rxData.createdAt).toLocaleDateString()}</span>
           </div>
        </div>

        {/* Rx Symbol & Diagnosis */}
        <div className="mb-8 relative">
           <div className="text-7xl font-serif italic text-slate-200 absolute -top-4 -left-4 pointer-events-none select-none">Rx</div>
           <div className="relative z-10 pl-10">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Clinical Diagnosis</h3>
             <p className="text-xl font-bold text-slate-800">{rxData.diagnosis}</p>
           </div>
        </div>

        {/* Medications Table */}
        <div className="mb-10">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Prescribed Medicines</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b-2 border-slate-200 text-slate-700">
                   <th className="py-3 px-2 font-bold w-1/3">Medicine</th>
                   <th className="py-3 px-2 font-bold">Dosage</th>
                   <th className="py-3 px-2 font-bold">Frequency</th>
                   <th className="py-3 px-2 font-bold">Duration</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {rxData.medications?.map((med, idx) => (
                   <tr key={idx} className="group">
                     <td className="py-4 px-2">
                       <p className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition">{med.name}</p>
                       {med.instructions && (
                         <p className="text-sm text-slate-500 mt-1">{med.instructions}</p>
                       )}
                     </td>
                     <td className="py-4 px-2 text-slate-700">{med.dosage || '-'}</td>
                     <td className="py-4 px-2 text-slate-700">{med.frequency || '-'}</td>
                     <td className="py-4 px-2 text-slate-700">{med.duration || '-'}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* Notes & Follow Up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {rxData.notes && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Doctor's Advice</h3>
              <p className="text-slate-700 p-4 bg-yellow-50 rounded-lg border border-yellow-100">{rxData.notes}</p>
            </div>
          )}
          {rxData.followUpDate && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Follow up on</h3>
              <p className="text-slate-800 font-bold p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
                 📅 {new Date(rxData.followUpDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Sign-off footer */}
        <div className="mt-auto pt-12 border-t border-slate-100 flex justify-between items-end">
           <div className="text-xs text-slate-400">
             Electronically generated prescription.<br/>
             Ref: {prescriptionId.substring(0, 8).toUpperCase()}
           </div>
           <div className="text-center">
             <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
             <p className="font-bold text-slate-800">Dr. {rxData.doctorName}</p>
             <p className="text-xs text-slate-500">Authorized Signature</p>
           </div>
        </div>

      </div>
    </div>
  )
}
