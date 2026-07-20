import React, { useState } from 'react'
import { FiCamera } from 'react-icons/fi'
import WalkInAppointment from '../components/WalkInAppointment'
import ReceptionFaceScan from '../components/ReceptionFaceScan'
import AppointmentsList from '../components/AppointmentsList'
import ReceptionPatientRegister from '../components/ReceptionPatientRegister'

export default function ReceptionPortal() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showFaceScan, setShowFaceScan] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [scannedPatient, setScannedPatient] = useState(null)

  const handleAppointmentAdded = (appointment) => {
    // Refresh the appointments list
    setRefreshKey(prev => prev + 1)
    setScannedPatient(null) // Clear scanned patient after appointment is added
  }

  const handlePatientFound = (patient) => {
    // Store the scanned patient data
    setScannedPatient(patient)
    setShowFaceScan(false)
    setShowRegister(false)
    console.log('Patient found via face scan:', patient)
  }

  const handleRegisterSuccess = (patient) => {
    setScannedPatient(patient)
    setShowRegister(false)
    // The WalkInAppointment form will now be pre-filled via state
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-2">Reception Portal</h1>
          <p className="text-green-100">Manage patient appointments and walk-ins</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Add Walk-in Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add Appointment</h2>
                <button 
                  onClick={() => setShowRegister(true)}
                  className="text-xs bg-teal-100 text-teal-700 hover:bg-teal-200 px-3 py-1 rounded-full font-bold transition shadow-sm"
                >
                  + New Patient
                </button>
              </div>

              {/* Face Scan Section */}
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
                <button
                  onClick={() => setShowFaceScan(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  <FiCamera size={20} />
                  Scan Patient Face
                </button>
                {scannedPatient && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-green-300 bg-green-50">
                    <p className="text-xs text-gray-600 font-medium">FACE-IDENTIFIED PATIENT</p>
                    <p className="text-sm font-bold text-green-700 mt-1">{scannedPatient.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{scannedPatient.patientId}</p>
                    <button
                      onClick={() => setScannedPatient(null)}
                      className="mt-2 w-full text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 py-1 px-2 rounded transition"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              {/* WalkInAppointment Form */}
              <WalkInAppointment 
                onAppointmentAdded={handleAppointmentAdded}
                preFilledPatient={scannedPatient}
              />
              
              {/* Stats */}
              <div className="mt-8 space-y-4 border-t pt-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Walk-in Status</p>
                  <p className="text-2xl font-bold text-green-900">WAITING</p>
                  <p className="text-xs text-green-600 mt-1">Initial status for walk-ins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Appointments List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">All Appointments</h2>
              <AppointmentsList key={refreshKey} />
            </div>
          </div>
        </div>
      </div>

      {/* Face Scan Modal */}
      {showFaceScan && (
        <ReceptionFaceScan 
          onPatientFound={handlePatientFound}
          onClose={() => setShowFaceScan(false)}
          onShowRegister={() => {
            setShowFaceScan(false)
            setShowRegister(true)
          }}
        />
      )}

      {/* New Patient Registration Modal */}
      {showRegister && (
        <ReceptionPatientRegister 
          onClose={() => setShowRegister(false)}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}
    </div>
  )
}
