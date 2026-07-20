import React from 'react'
import { FiBell, FiShield, FiX, FiCheck, FiArrowRight } from 'react-icons/fi'

/**
 * A premium, reusable notification modal used for real-time alerts 
 * across Patient and Receptionist portals.
 */
export default function NotificationModal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  type = 'info', // 'info', 'success', 'warning'
  doctorName,
  patientName,
  detailLabel,
  detailValue,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  showDurationPicker = false,
  selectedDuration = 15,
  onDurationChange = () => {}
}) {
  if (!isOpen) return null

  const config = {
    info: { bg: 'bg-amber-500', icon: FiBell, accent: 'text-amber-500', lightBg: 'bg-amber-50' },
    success: { bg: 'bg-green-500', icon: FiCheck, accent: 'text-green-500', lightBg: 'bg-green-50' },
    warning: { bg: 'bg-red-500', icon: FiShield, accent: 'text-red-500', lightBg: 'bg-red-50' }
  }

  const theme = config[type] || config.info
  const Icon = theme.icon

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header Section */}
        <div className={`${theme.bg} p-6 text-white text-center relative`}>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Icon size={40} />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-white/80 text-sm mt-1">{subtitle}</p>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* Content Section */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Identity Grid */}
            <div className="flex flex-col gap-6 text-center">
              {doctorName && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Doctor</p>
                  <p className="text-xl font-bold text-gray-800">Dr. {doctorName.replace('Dr. ', '')}</p>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-4">
                <div className="h-[1px] bg-gray-100 flex-1" />
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${theme.lightBg} ${theme.accent}`}>
                  {type === 'info' ? 'Action Required' : 'Update'}
                </div>
                <div className="h-[1px] bg-gray-100 flex-1" />
              </div>
              
              {patientName && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Patient</p>
                  <p className="text-2xl font-black text-blue-600">{patientName}</p>
                  {detailLabel && detailValue && (
                    <p className="text-sm text-gray-500 mt-1">{detailLabel}: {detailValue}</p>
                  )}
                </div>
              )}
            </div>

            {/* Duration Picker (Only for Patient Consent) */}
            {showDurationPicker && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Requested Access Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map(mins => (
                    <button
                      key={mins}
                      onClick={() => onDurationChange(mins)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        selectedDuration === mins 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {mins >= 60 ? '1 Hour' : `${mins} Mins`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col gap-3">
            {onPrimaryAction && (
              <button
                onClick={onPrimaryAction}
                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2 text-lg"
              >
                {primaryActionLabel} <FiArrowRight size={20} />
              </button>
            )}
            
            {onSecondaryAction && (
              <button
                onClick={onSecondaryAction}
                className="w-full py-3 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                {secondaryActionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
