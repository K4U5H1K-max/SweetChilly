import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const SIMULATION_SCENARIOS = [
  {
    id: 'BREAKDOWN',
    label: 'Breakdown / Mechanical Failure',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Driver reports engine overheating, flat tire, or stalled vehicle.',
    sampleQuote: '"Vehicle breakdown near mile marker 44, engine overheated and stopped."',
  },
  {
    id: 'ASSISTANCE_REQUIRED',
    label: 'Assistance Required',
    badgeClass: 'bg-red-100 text-red-900 border-red-300',
    description: 'Driver reports medical issue, critical cargo risk, or physical distress.',
    sampleQuote: '"Need immediate assistance and mechanics, medical cargo temperature rising."',
  },
  {
    id: 'ROAD_BLOCKED',
    label: 'Road Blocked / Impasse',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Driver reports landslide obstruction, rockfall, or road impassable.',
    sampleQuote: '"Corridor is blocked by rockfall ahead, traffic is completely halted."',
  },
  {
    id: 'DELAYED',
    label: 'Delayed / Heavy Traffic',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Driver reports minor slowdown due to rain, convoy crawl, or checkpoint.',
    sampleQuote: '"Slow moving traffic in heavy rain, running approximately 45 minutes late."',
  },
  {
    id: 'SAFE',
    label: 'All Clear / Safe',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Driver confirms everything is fine and progressing as scheduled.',
    sampleQuote: '"All safe here. Vehicle is running normally, on track to destination."',
  },
  {
    id: 'NO_RESPONSE',
    label: 'No Response / Unreachable',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Call rings out or disconnects without driver answer.',
    sampleQuote: '[No audio response received — Call timed out]',
  },
  {
    id: 'UNKNOWN',
    label: 'Unknown / Unintelligible',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Static on line or garbled utterance.',
    sampleQuote: '"...crackling static... ...cannot hear clearly..."',
  },
];

export default function DriverSafetyModal({ vehicleId, isOpen, onClose }) {
  const { vehicles, updateVehicle } = useApp();

  const vehicle = vehicles.find((v) => v.id === vehicleId) || null;

  // Local State
  const [voiceConfig, setVoiceConfig] = useState({ provider: 'mock', isLiveSarvam: false });
  const [flagReasonInput, setFlagReasonInput] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState('BREAKDOWN');
  const [customResponse, setCustomResponse] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callProgressState, setCallProgressState] = useState('IDLE'); // IDLE, QUEUED, RINGING, IN_PROGRESS, COMPLETED
  const [activeSession, setActiveSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [escalationNotes, setEscalationNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Voice Runtime Configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await api.getVoiceConfig();
        if (res.success && res.data) {
          setVoiceConfig(res.data);
        }
      } catch (err) {
        console.warn('[DriverSafetyModal] Could not fetch voice config:', err);
      }
    }
    loadConfig();
  }, []);

  const isSarvamMode = Boolean(voiceConfig.isLiveSarvam || voiceConfig.provider === 'sarvam' || activeSession?.provider === 'sarvam');

  // Synchronize initial input when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setFlagReasonInput(vehicle.flagReason || 'Vehicle delayed near active corridor disruption');
      fetchCallHistory(vehicle.id);
    }
  }, [vehicle?.id]);

  // Polling for updates when call is active
  useEffect(() => {
    if (!isOpen || !vehicle?.id) return;
    const isActive = ['QUEUED', 'RINGING', 'IN_PROGRESS', 'ANSWERED'].includes(callProgressState) || isCalling;
    if (isActive) {
      const timer = setInterval(() => {
        fetchCallHistory(vehicle.id);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [isOpen, vehicle?.id, callProgressState, isCalling]);

  async function fetchCallHistory(vId) {
    try {
      const res = await api.getSafetyCalls(vId);
      if (res.success && res.data) {
        setSessionHistory(res.data);
        if (res.data.length > 0) {
          const latest = res.data[0];
          setActiveSession(latest);
          if (['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'].includes(latest.status)) {
            setCallProgressState('COMPLETED');
            setIsCalling(false);
          } else if (['IN_PROGRESS', 'ANSWERED'].includes(latest.status)) {
            setCallProgressState('IN_PROGRESS');
          } else if (['RINGING', 'CALL_INITIATED'].includes(latest.status)) {
            setCallProgressState('RINGING');
          }
        }
      }
    } catch (err) {
      console.warn('[Driver Safety] Could not fetch call history from server:', err.message);
    }
  }

  if (!isOpen || !vehicle) return null;

  // Mask driver phone for public privacy (e.g. +91-98XXX-XX210)
  function maskDriverPhone(phone) {
    if (!phone) return '+91-98XXX-XX210';
    const clean = String(phone).trim();
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 10) {
      const last3 = digits.slice(-3);
      const prefix = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)}` : '+91';
      const first2 = digits.slice(digits.length - 10, digits.length - 8);
      return `${prefix}-${first2}XXX-XX${last3}`;
    }
    return clean.replace(/^(\+?\d{2,3})[\d\-]+(\d{2,3})$/, '$1-XXX-XX$2');
  }

  const maskedPhone = maskDriverPhone(vehicle.driverPhone);

  // Toggle vehicle flag
  async function handleToggleFlag(flagged) {
    setIsFlagging(true);
    setErrorMessage('');
    try {
      const res = await api.flagVehicle({
        vehicleId: vehicle.id,
        reason: flagReasonInput.trim() || 'Manual safety audit requested by operator',
        flagged,
      });

      if (res.success && res.data) {
        updateVehicle(vehicle.id, res.data);
      }
    } catch (err) {
      // Local fallback
      updateVehicle(vehicle.id, {
        isFlagged: flagged,
        flagReason: flagged ? (flagReasonInput.trim() || 'Safety check requested') : null,
        safetyStatus: flagged ? 'PENDING_CALL' : 'NOT_CHECKED',
      });
      setErrorMessage(err.message || 'Failed to update flag on backend.');
    } finally {
      setIsFlagging(false);
    }
  }

  // Trigger Driver Safety Call
  async function handleStartSafetyCheck() {
    setIsCalling(true);
    setErrorMessage('');
    setCallProgressState('QUEUED');

    // Smooth UI progress simulation
    setTimeout(() => setCallProgressState('RINGING'), 700);

    try {
      const res = await api.triggerSafetyCall({
        vehicleId: vehicle.id,
        triggerSource: 'MANUAL_OPERATOR',
        flagReason: vehicle.flagReason || flagReasonInput,
        simulatedOutcome: selectedOutcome,
        customResponse: customResponse.trim() || undefined,
      });

      if (isSarvamMode) {
        // In live Sarvam mode: Outbound telephony has been dispatched
        setCallProgressState('IN_PROGRESS');
        if (res.success && res.data) {
          setActiveSession(res.data.session);
          if (res.data.vehicle) {
            updateVehicle(vehicle.id, res.data.vehicle);
          }
        }
        // Background polling will automatically detect when the driver finishes and webhook arrives
      } else {
        // In Mock Simulation mode: Advance lifecycle smoothly
        setTimeout(() => setCallProgressState('IN_PROGRESS'), 1800);
        setTimeout(() => {
          setCallProgressState('COMPLETED');
          setIsCalling(false);

          if (res.success && res.data) {
            setActiveSession(res.data.session);
            if (res.data.vehicle) {
              updateVehicle(vehicle.id, res.data.vehicle);
            }
            fetchCallHistory(vehicle.id);
          }
        }, 3000);
      }
    } catch (err) {
      setTimeout(() => {
        setCallProgressState('IDLE');
        setIsCalling(false);
        setErrorMessage(err.message || 'Failed to trigger safety call session.');
      }, 1000);
    }
  }

  // Resolve Escalation
  async function handleResolveEscalation() {
    if (!activeSession) return;
    setIsResolving(true);
    try {
      const res = await api.resolveSafetyCall(
        activeSession.callId,
        escalationNotes.trim() || 'Operator confirmed vehicle status and cleared safety alert.'
      );
      if (res.success && res.data) {
        setActiveSession(res.data);
        fetchCallHistory(vehicle.id);
      }
    } catch (err) {
      // Local fallback update
      setActiveSession((prev) => ({
        ...prev,
        escalationResolved: true,
        resolutionNotes: escalationNotes.trim() || 'Resolved by operator',
        resolvedAt: new Date().toISOString(),
      }));
    } finally {
      setIsResolving(false);
    }
  }

  // Safety status badge styling
  function getSafetyBadge(status) {
    switch (status) {
      case 'SAFE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DELAYED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BREAKDOWN':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'ROAD_BLOCKED':
        return 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
      case 'ASSISTANCE_REQUIRED':
        return 'bg-red-100 text-red-900 border-red-400 font-bold animate-pulse';
      case 'NO_RESPONSE':
        return 'bg-slate-200 text-slate-800 border-slate-400 font-bold';
      case 'PENDING_CALL':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'UNKNOWN':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans my-6 animate-fadeIn">
        
        {/* ========================================================
            MODAL HEADER
        ======================================================== */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${isSarvamMode ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white tracking-tight">
                  {isSarvamMode ? 'Live Driver Safety Check' : 'Driver Safety Check Session'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  isSarvamMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
                }`}>
                  {isSarvamMode ? 'LIVE SARVAM TELEPHONY' : 'VOICE SIMULATION MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSarvamMode
                  ? 'Project Brahmaputra Track 4 — Live Telephony & AI Post-Call Safety Intelligence'
                  : 'Project Brahmaputra Track 4 — Automated Driver Voice Communication Foundation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
          </div>
        )}

        {/* ========================================================
            VEHICLE & DRIVER CONTEXT RIBBON
        ======================================================== */}
        <div className="bg-slate-50 border-b border-slate-200/90 px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Vehicle Unit</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{vehicle.id}</span>
            <div className="text-slate-500 text-[11px] truncate">{vehicle.name}</div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Driver Details</span>
            <span className="font-bold text-slate-800">{vehicle.driverName || 'Assigned Driver'}</span>
            <div className="font-mono text-slate-500 text-[11px]">{maskedPhone}</div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Corridor & Cargo</span>
            <span className="font-semibold text-slate-800">{vehicle.assignedCorridor || 'NH-6 Arterial'}</span>
            <div className="text-slate-500 text-[11px] truncate">{vehicle.cargo}</div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Current Safety State</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border mt-0.5 ${getSafetyBadge(vehicle.safetyStatus || 'NOT_CHECKED')}`}>
              {(vehicle.safetyStatus || 'NOT_CHECKED').replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* ========================================================
            FLAG CONTROL STRIP
        ======================================================== */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[280px] flex items-center gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Flag Reason:</span>
            {vehicle.isFlagged ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1 rounded-lg flex-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="truncate">{vehicle.flagReason || 'Flagged for Safety Check'}</span>
              </div>
            ) : (
              <input
                type="text"
                placeholder="e.g. Vehicle delayed near active disruption"
                value={flagReasonInput}
                onChange={(e) => setFlagReasonInput(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 flex-1 bg-white"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {vehicle.isFlagged ? (
              <button
                onClick={() => handleToggleFlag(false)}
                disabled={isFlagging || isCalling}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs transition-colors"
              >
                Clear Safety Flag
              </button>
            ) : (
              <button
                onClick={() => handleToggleFlag(true)}
                disabled={isFlagging || isCalling}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>🚩</span>
                <span>Flag for Safety Check</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            MAIN BODY: CONTROLS & CALL SESSION
        ======================================================== */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* Left Column: Voice Agent Controller (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Control Box: Live Sarvam vs. Mock Simulation */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              {isSarvamMode ? (
                /* LIVE SARVAM MODE VIEW */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live Driver Safety Check</span>
                    </h4>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Sarvam Voice AI
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Target Driver:</span>
                      <span className="font-bold text-slate-800">{vehicle.driverName || 'Driver'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Destination Phone:</span>
                      <span className="font-mono font-bold text-slate-900">{maskedPhone}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Assigned Corridor:</span>
                      <span className="font-semibold text-blue-700">{vehicle.assignedCorridor || 'Corridor'}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/60 border border-blue-100 rounded-lg p-2.5">
                    Triggering this check initiates an automated outbound call via Sarvam AI telephony. The driver's spoken safety status is automatically processed and reported back in real-time.
                  </div>

                  {/* Initiate Live Call Action */}
                  <div className="pt-1">
                    <button
                      onClick={handleStartSafetyCheck}
                      disabled={isCalling}
                      className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                        isCalling
                          ? 'bg-emerald-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99]'
                      }`}
                    >
                      {isCalling ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Dispatching Live Call via Sarvam...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>Start Live Voice Safety Check</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* MOCK SIMULATION MODE VIEW */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wide">
                      1. Select Simulated Driver Scenario
                    </h4>
                    <span className="text-[10px] text-blue-600 font-mono font-semibold">Deterministic AI</span>
                  </div>

                  <div className="space-y-1.5 mb-3 max-h-[220px] overflow-y-auto pr-1">
                    {SIMULATION_SCENARIOS.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setSelectedOutcome(sc.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-0.5 ${
                          selectedOutcome === sc.id
                            ? 'bg-blue-50/70 border-blue-500 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{sc.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold uppercase border ${sc.badgeClass}`}>
                            {sc.id}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{sc.description}</span>
                      </button>
                    ))}
                  </div>

                  {/* Freeform Driver Utterance Input */}
                  <div className="border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Custom Driver Utterance (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engine broke down, truck is dead"
                      value={customResponse}
                      onChange={(e) => setCustomResponse(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {/* Initiate Call Action */}
                  <div className="mt-4">
                    <button
                      onClick={handleStartSafetyCheck}
                      disabled={isCalling}
                      className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                        isCalling
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99]'
                      }`}
                    >
                      {isCalling ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Simulating Voice Call Session...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>Start Voice Safety Check</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lifecycle Pipeline Progress Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                {isSarvamMode ? 'Call Status' : 'Simulated Telephony Lifecycle'}
              </span>
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                {[
                  { key: 'QUEUED', label: 'Queued' },
                  { key: 'RINGING', label: 'Ringing' },
                  { key: 'IN_PROGRESS', label: 'Active Call' },
                  { key: 'COMPLETED', label: 'Completed' },
                ].map((step, idx) => {
                  const isCurrent = callProgressState === step.key;
                  const isPast =
                    (callProgressState === 'RINGING' && idx === 0) ||
                    (callProgressState === 'IN_PROGRESS' && idx <= 1) ||
                    (callProgressState === 'COMPLETED' && idx <= 3);

                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
                          isCurrent
                            ? (isSarvamMode ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse' : 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse')
                            : isPast
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isPast && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span className={isCurrent ? (isSarvamMode ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold') : isPast ? 'text-slate-800' : 'text-slate-400'}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Live Transcript, Structured Outcome & Escalation (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            {/* Live Audio / Call Status Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  callProgressState === 'RINGING'
                    ? 'bg-amber-400 animate-ping'
                    : callProgressState === 'IN_PROGRESS'
                    ? 'bg-emerald-400 animate-pulse'
                    : callProgressState === 'COMPLETED'
                    ? 'bg-blue-400'
                    : 'bg-slate-600'
                }`} />
                <div>
                  <div className="text-xs font-bold text-white">
                    {callProgressState === 'IDLE' && (isSarvamMode ? 'Ready to Dispatch Live Call' : 'Ready for Safety Session')}
                    {callProgressState === 'QUEUED' && 'Dialing Target Mobile...'}
                    {callProgressState === 'RINGING' && `Ringing ${maskedPhone}...`}
                    {callProgressState === 'IN_PROGRESS' && 'Voice Session Connected — Live Audio Pipeline'}
                    {callProgressState === 'COMPLETED' && (isSarvamMode ? 'Call Completed & AI Assessment Ready' : 'Voice Session Concluded & Classified')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Session ID: {activeSession?.callId || 'Not active'}
                  </div>
                </div>
              </div>

              {callProgressState === 'IN_PROGRESS' && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                  <div className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                  <div className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.45s]"></div>
                </div>
              )}
            </div>

            {/* Transcript & Dialogue Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h4 className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wide">
                  {isSarvamMode ? 'Call Transcript' : 'Session Transcript'}
                </h4>
                {activeSession && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(activeSession.startedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px] pr-1">
                {activeSession?.dialogueHistory && activeSession.dialogueHistory.length > 0 ? (
                  activeSession.dialogueHistory.map((d, i) => {
                    const isAgent = d.speaker === 'AI Safety Agent' || d.speaker === 'Sarvam Instant Outbound';
                    return (
                      <div
                        key={i}
                        className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-bold ${isAgent ? 'text-blue-700' : 'text-slate-700'}`}>
                            {d.speaker}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{d.time}</span>
                        </div>
                        <div
                          className={`p-2.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                            isAgent
                              ? 'bg-blue-50/80 text-blue-950 rounded-tl-xs border border-blue-100'
                              : 'bg-slate-100 text-slate-900 rounded-tr-xs border border-slate-200'
                          }`}
                        >
                          {d.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <span className="text-xl mb-1">📞</span>
                    <span>
                      {isSarvamMode
                        ? 'No active transcript. Start a safety check to conduct call with driver.'
                        : 'No active transcript. Trigger a safety check to start voice simulation.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Structured Classification & Escalation Outcome */}
            {activeSession && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {isSarvamMode ? 'AI Safety Assessment' : 'Structured Safety Outcome'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getSafetyBadge(activeSession.structuredOutcome || activeSession.outcome)}`}>
                        {activeSession.structuredOutcome || activeSession.outcome}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Confidence: {((activeSession.outcomeConfidence || activeSession.confidence || 0.9) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Operator Escalation</span>
                    {activeSession.escalationRequired ? (
                      activeSession.escalationResolved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          RESOLVED BY OPERATOR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          ACTION REQUIRED
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        NONE
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary Quote */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">AI Summary:</span> {activeSession.summary}
                </div>

                {/* Escalation Action Card */}
                {activeSession.escalationRequired && !activeSession.escalationResolved && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <span>⚠️</span>
                      <span>OPERATOR ESCALATION REQUIRED</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-snug">
                      The AI Safety Agent flagged this session for manual coordinator intervention. (No automatic emergency services have been dispatched).
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Resolution notes (e.g. Recovery vehicle dispatched)..."
                        value={escalationNotes}
                        onChange={(e) => setEscalationNotes(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-hidden"
                      />
                      <button
                        onClick={handleResolveEscalation}
                        disabled={isResolving}
                        className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isResolving ? 'Resolving...' : 'Resolve Escalation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* ========================================================
            SESSION HISTORY ACCORDION / FOOTER
        ======================================================== */}
        {sessionHistory.length > 1 && (
          <div className="px-6 py-3 bg-slate-100/70 border-t border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-600 font-semibold">
              Call Log History ({sessionHistory.length} total sessions recorded for this vehicle)
            </span>
            <div className="flex items-center gap-1.5">
              {sessionHistory.slice(0, 4).map((s) => (
                <button
                  key={s.callId}
                  onClick={() => setActiveSession(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    activeSession?.callId === s.callId
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {s.structuredOutcome} ({new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
