import React from 'react';

export default function UserDeploymentDetailsModal({ isOpen, deployment, onClose, onComplete, onCancel }) {
  if (!isOpen || !deployment) return null;

  const isActive = ['ACTIVE', 'DELAYED', 'PLANNED'].includes(deployment.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading font-bold text-slate-900">Journey Manifest</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  deployment.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : deployment.status === 'CANCELLED'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {deployment.status}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500">{deployment.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Corridor Route Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origin Hub</span>
              <p className="font-heading font-bold text-slate-900 text-sm mt-0.5">{deployment.origin}</p>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] font-mono text-blue-600 font-semibold mb-1">
                {deployment.assignedCorridor || 'Corridor Transit'}
              </span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="w-12 h-0.5 bg-slate-300"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination</span>
              <p className="font-heading font-bold text-slate-900 text-sm mt-0.5">{deployment.destination}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-1">Vehicle Asset</span>
              <span className="font-mono font-bold text-slate-800">{deployment.vehiclePlate || deployment.vehicleId}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-1">Mission Priority</span>
              <span className="font-semibold text-slate-800">{deployment.priority || 'NORMAL'}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-1">Cargo Manifest</span>
              <span className="font-medium text-slate-800">{deployment.cargo || 'General Freight'}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block mb-1">Driver Details</span>
              <span className="font-medium text-slate-800">{deployment.driverName || 'Operator Assigned'}</span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Initiated:</span>
              <span className="font-mono text-slate-800">{deployment.startTime ? new Date(deployment.startTime).toLocaleString() : 'N/A'}</span>
            </div>
            {deployment.endTime && (
              <div className="flex justify-between text-slate-600">
                <span>Completed / Closed:</span>
                <span className="font-mono text-slate-800">{new Date(deployment.endTime).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          {isActive && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onCancel) onCancel(deployment);
                  onClose();
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel Journey
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onComplete) onComplete(deployment);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                Mark Completed
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
