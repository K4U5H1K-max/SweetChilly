import React from 'react';

/**
 * AuthBackgroundLandscape
 * Renders the reference-accurate Project Brahmaputra light background:
 * - Soft layered pale-blue wave curves
 * - Bottom regional logistics landscape with mountains, cargo truck, distribution warehouse, and container vessel on water.
 */
export default function AuthBackgroundLandscape() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* Layer 1: Soft Ambient Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F2F7FC] via-[#EAF2FA] to-[#DFEDFA]" />

      {/* Layer 2: Subtle Ambient Curved Waves */}
      <svg
        className="absolute top-0 right-0 w-full h-full max-h-[800px] text-white/40 opacity-60"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0,0 C480,120 960,80 1440,0 L1440,900 L0,900 Z"
          fill="url(#topWaveGrad)"
        />
        <path
          d="M-100,200 C300,100 800,350 1540,150 L1540,900 L-100,900 Z"
          fill="url(#midWaveGrad)"
          opacity="0.4"
        />
        <defs>
          <linearGradient id="topWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#E2EEFA" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="midWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D9EAF8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#EBF4FD" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Layer 3: Bottom Logistics Landscape (Mountains, Truck, Warehouse, Cargo Ship) */}
      <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center items-end opacity-90 overflow-hidden pointer-events-none">
        <svg
          viewBox="0 0 1440 240"
          className="w-full max-w-[1600px] h-[140px] sm:h-[180px] md:h-[220px] object-cover object-bottom"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Distant Rolling Mountains */}
          <path
            d="M-50,240 L-50,160 L120,95 L280,150 L460,80 L620,140 L780,70 L950,130 L1120,65 L1300,120 L1500,75 L1500,240 Z"
            fill="url(#mountainGradFar)"
          />
          <path
            d="M-20,240 L180,140 L380,190 L580,120 L760,175 L980,110 L1180,160 L1380,105 L1500,145 L1500,240 Z"
            fill="url(#mountainGradNear)"
          />

          {/* Water Surface Base & Horizon */}
          <rect x="0" y="195" width="1440" height="45" fill="url(#waterGrad)" />
          <line x1="0" y1="195" x2="1440" y2="195" stroke="#BFD9F2" strokeWidth="1.5" />

          {/* Warehouse Facility (Right Center) */}
          <g transform="translate(980, 115)">
            {/* Main Distribution Hub Body */}
            <path
              d="M0,80 L0,30 L55,0 L110,30 L110,80 Z"
              fill="#94B8DE"
              stroke="#7BA6D4"
              strokeWidth="1.5"
            />
            {/* Secondary Wing */}
            <path
              d="M110,80 L110,38 L170,25 L170,80 Z"
              fill="#A9C7E8"
              stroke="#7BA6D4"
              strokeWidth="1.5"
            />
            {/* Warehouse High Bay Gable Roof */}
            <path
              d="M-5,32 L55,-2 L115,32"
              stroke="#6B99CC"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Loading Bay Shutter Door */}
            <rect x="35" y="45" width="40" height="35" rx="3" fill="#5A87BC" />
            <line x1="35" y1="55" x2="75" y2="55" stroke="#4A75A8" strokeWidth="1" />
            <line x1="35" y1="65" x2="75" y2="65" stroke="#4A75A8" strokeWidth="1" />
            {/* Office Windows */}
            <rect x="125" y="45" width="16" height="12" rx="2" fill="#EBF4FD" />
            <rect x="145" y="45" width="16" height="12" rx="2" fill="#EBF4FD" />
          </g>

          {/* Regional Highway / Road Strip */}
          <path
            d="M0,210 L1440,210 L1440,225 L0,225 Z"
            fill="#B2CCE8"
          />
          <line x1="0" y1="217" x2="1440" y2="217" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="16 12" />

          {/* Modern Long-Haul Cargo Truck (Center-Right on Road) */}
          <g transform="translate(820, 160)">
            {/* Shadow */}
            <ellipse cx="90" cy="52" rx="90" ry="4" fill="#6B93BC" opacity="0.3" />

            {/* Cargo Box Trailer */}
            <rect x="0" y="5" width="115" height="40" rx="3" fill="#FFFFFF" stroke="#9DBEE3" strokeWidth="1.5" />
            <line x1="12" y1="5" x2="12" y2="45" stroke="#E2EDF8" strokeWidth="1" />
            <line x1="36" y1="5" x2="36" y2="45" stroke="#E2EDF8" strokeWidth="1" />
            <line x1="60" y1="5" x2="60" y2="45" stroke="#E2EDF8" strokeWidth="1" />
            <line x1="84" y1="5" x2="84" y2="45" stroke="#E2EDF8" strokeWidth="1" />
            <line x1="108" y1="5" x2="108" y2="45" stroke="#E2EDF8" strokeWidth="1" />

            {/* Subtle Trailer Logo Stripe */}
            <rect x="0" y="22" width="115" height="5" fill="#3B82F6" opacity="0.6" />

            {/* Truck Tractor / Cab */}
            <path
              d="M117,18 L142,18 L154,28 L157,36 L157,45 L117,45 Z"
              fill="#FFFFFF"
              stroke="#9DBEE3"
              strokeWidth="1.5"
            />
            {/* Windshield */}
            <path
              d="M138,20 L150,28 L142,28 L136,20 Z"
              fill="#93C5FD"
            />
            {/* Bumper */}
            <rect x="150" y="40" width="9" height="5" rx="1.5" fill="#64748B" />

            {/* Truck Wheels */}
            <g fill="#475569">
              <circle cx="15" cy="46" r="6.5" />
              <circle cx="15" cy="46" r="3.5" fill="#94A3B8" />
              <circle cx="32" cy="46" r="6.5" />
              <circle cx="32" cy="46" r="3.5" fill="#94A3B8" />
              <circle cx="95" cy="46" r="6.5" />
              <circle cx="95" cy="46" r="3.5" fill="#94A3B8" />
              <circle cx="140" cy="46" r="6.5" />
              <circle cx="140" cy="46" r="3.5" fill="#94A3B8" />
            </g>
          </g>

          {/* River Cargo Ship / Inland Container Vessel (Far Right on Water) */}
          <g transform="translate(1160, 165)">
            {/* Ship Hull */}
            <path
              d="M10,32 L20,44 L100,44 L115,32 Z"
              fill="#83A7CF"
              stroke="#6289B5"
              strokeWidth="1.5"
            />
            <path
              d="M100,32 L115,32 L110,40 L95,40 Z"
              fill="#60A5FA"
            />

            {/* Bridge / Superstructure */}
            <rect x="80" y="16" width="22" height="16" rx="2" fill="#FFFFFF" stroke="#83A7CF" strokeWidth="1" />
            <rect x="84" y="20" width="5" height="4" fill="#93C5FD" />
            <rect x="91" y="20" width="5" height="4" fill="#93C5FD" />

            {/* Navigation Radar Mast */}
            <line x1="91" y1="16" x2="91" y2="8" stroke="#6289B5" strokeWidth="1.5" />
            <line x1="86" y1="10" x2="96" y2="10" stroke="#6289B5" strokeWidth="1" />

            {/* Staked Shipping Containers on Deck */}
            <rect x="25" y="22" width="24" height="10" rx="1" fill="#3B82F6" stroke="#2563EB" strokeWidth="0.5" />
            <rect x="51" y="22" width="24" height="10" rx="1" fill="#10B981" stroke="#059669" strokeWidth="0.5" />
            <rect x="38" y="12" width="24" height="10" rx="1" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />

            {/* Water Wave Reflection Lines */}
            <path d="M5,48 C30,46 70,49 125,47" stroke="#A9C7E8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M20,53 C50,51 85,54 110,52" stroke="#BFD9F2" strokeWidth="1" strokeLinecap="round" />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="mountainGradFar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CDE1F5" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#DDEBFA" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="mountainGradNear" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#BFD8F2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#D5E6F7" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D3E5F8" />
              <stop offset="100%" stopColor="#BED7F2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
