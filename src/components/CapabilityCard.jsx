import React from 'react';

export default function CapabilityCard({ data, type = 'horizon' }) {
  if (type === 'horizon') {
    const isFocal = data.isFocal;

    return (
      <div
        className={`${
          isFocal
            ? 'border-2 border-[#22303F] bg-[#EDE6D6] relative shadow-sm'
            : 'border border-[#A99B7E] bg-[#EDE6D6]'
        } flex flex-col justify-between`}
      >
        <div>
          {/* Top Shelf Banner */}
          <div
            className={`h-7 ${
              isFocal
                ? 'bg-[#22303F] text-[#EDE6D6]'
                : data.id === 'h-60s'
                ? 'bg-[#8A6A4B] text-[#EDE6D6]'
                : 'bg-[#C9C0A6] text-[#22303F] border-b border-[#A99B7E]'
            } px-space-md flex items-center justify-between`}
          >
            <span className="font-label-sm text-label-sm font-semibold uppercase">
              {data.horizonLabel}
            </span>
            <span className="font-label-sm text-label-sm font-mono font-bold">
              {data.riskPercentage}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-space-lg space-y-space-md">
            <div className={`flex items-baseline justify-between border-b ${isFocal ? 'border-[#A99B7E]/60' : 'border-[#A99B7E]/40'} pb-space-xs`}>
              <span className="font-headline-md text-headline-md text-[#22303F]">
                {data.title}
              </span>
              <span
                className={`px-space-xs py-0.5 ${
                  data.badgeType === 'hazard'
                    ? 'bg-[#8A6A4B] text-[#EDE6D6]'
                    : 'bg-[#C9C0A6] text-[#22303F]'
                } font-label-sm text-label-sm font-mono uppercase`}
              >
                {data.statusBadge}
              </span>
            </div>

            <p className={`font-body-md text-body-md ${isFocal ? 'text-[#22303F]' : 'text-[#22303F]/80'}`}>
              {data.description}
            </p>

            {/* Inset Metric Ledger */}
            <div className={`${isFocal ? 'bg-[#C9C0A6]/60' : 'bg-[#C9C0A6]/40'} p-space-sm border border-[#A99B7E] font-label-sm text-label-sm space-y-1`}>
              {data.metrics.map((m, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className={isFocal ? 'text-[#22303F]' : 'text-[#8A6A4B]'}>{m.label}</span>
                  <span className={`font-mono ${isFocal ? 'font-bold text-[#22303F]' : 'text-[#22303F]'}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Metadata Shelf */}
        <div
          className={`px-space-lg py-space-xs border-t border-[#A99B7E] font-label-sm text-label-sm ${
            isFocal
              ? 'text-[#22303F] bg-[#C9C0A6]'
              : 'text-[#8A6A4B] bg-[#C9C0A6]/20'
          } font-mono flex justify-between`}
        >
          <span className={isFocal ? 'font-bold' : ''}>{data.disposition}</span>
          <span>{data.epoch}</span>
        </div>
      </div>
    );
  }

  // Vector Manifold Card
  if (type === 'vector') {
    return (
      <div className="border border-[#A99B7E] bg-[#EDE6D6] p-space-lg flex flex-col justify-between space-y-space-md">
        <div className="space-y-space-sm">
          <div className="font-label-sm text-label-sm text-[#8A6A4B] font-mono uppercase tracking-wider">
            {data.vectorTag}
          </div>
          <h3 className="font-headline-md text-headline-md text-[#22303F]">
            {data.title}
          </h3>
          <p className="font-body-sm text-body-sm text-[#22303F]/80">
            {data.description}
          </p>
        </div>

        {/* Vector SVG Graphical Canvas */}
        <div className="w-full h-32 border border-[#A99B7E] bg-[#C9C0A6]/20 relative overflow-hidden flex items-center justify-center p-2">
          {data.type === 'density' && (
            <svg className="w-full h-full" viewBox="0 0 240 100">
              <line x1="0" y1="25" x2="240" y2="25" stroke="#A99B7E" strokeDasharray="2 2" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="240" y2="50" stroke="#A99B7E" strokeDasharray="2 2" strokeWidth="0.5" />
              <line x1="0" y1="75" x2="240" y2="75" stroke="#A99B7E" strokeDasharray="2 2" strokeWidth="0.5" />
              <path d="M 0,65 Q 60,60 120,62 T 240,60 L 240,75 L 0,75 Z" fill="#C9C0A6" opacity="0.5" />
              <path d="M 0,65 Q 60,60 120,62" fill="none" stroke="#22303F" strokeWidth="2" />
              <path d="M 120,62 C 160,50 180,30 240,15" fill="none" stroke="#8A6A4B" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M 120,62 C 160,68 190,45 240,30" fill="none" stroke="#8A6A4B" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              <text x="124" y="88" fill="#22303F" fontFamily="JetBrains Mono" fontSize="7">CURRENT T-0</text>
              <circle cx="120" cy="62" r="3" fill="#22303F" />
            </svg>
          )}

          {data.type === 'latency' && (
            <svg className="w-full h-full" viewBox="0 0 240 100">
              <circle cx="120" cy="50" r="45" fill="none" stroke="#A99B7E" strokeDasharray="2 2" strokeWidth="0.5" />
              <circle cx="120" cy="50" r="30" fill="#C9C0A6" stroke="#A99B7E" strokeWidth="0.5" opacity="0.3" />
              <circle cx="120" cy="50" r="15" fill="#8A6A4B" stroke="#8A6A4B" strokeWidth="0.75" opacity="0.25" />
              <line x1="30" y1="50" x2="115" y2="50" stroke="#22303F" strokeWidth="2" />
              <circle cx="120" cy="50" r="3" fill="#22303F" />
              <path d="M 120,50 Q 160,20 210,25" fill="none" stroke="#8A6A4B" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="210" cy="25" r="2.5" fill="#8A6A4B" />
              <text x="170" y="85" fill="#8A6A4B" fontFamily="JetBrains Mono" fontSize="7">Δ LATENCY: +34ms</text>
            </svg>
          )}

          {data.type === 'entropy' && (
            <svg className="w-full h-full" viewBox="0 0 240 100">
              <polygon points="10,80 70,75 120,70 120,95 10,95" fill="#C9C0A6" opacity="0.4" />
              <polygon points="120,70 170,40 230,20 230,95 120,95" fill="#8A6A4B" opacity="0.3" />
              <polyline points="10,80 40,78 70,75 100,74 120,70" fill="none" stroke="#22303F" strokeWidth="2" />
              <circle cx="120" cy="70" r="3" fill="#22303F" />
              <path d="M 120,70 L 230,20" stroke="#8A6A4B" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M 120,70 L 230,45" stroke="#8A6A4B" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
              <text x="140" y="85" fill="#8A6A4B" fontFamily="JetBrains Mono" fontSize="7">SHANNON: 7.82b</text>
            </svg>
          )}
        </div>

        {/* Footer Vector Readouts */}
        <div className="font-label-sm text-label-sm border-t border-[#A99B7E]/40 pt-space-xs flex justify-between text-[#8A6A4B]">
          <span>{data.footerLeft}</span>
          <span className="font-mono text-[#22303F]">{data.footerRight}</span>
        </div>
      </div>
    );
  }

  return null;
}
