import React from 'react';
import { comparisonRows, attributionFeatures } from '../data/mockData';

export default function ForecastExplanation() {
  return (
    <>
      {/* ==================== STRATEGIC DOCTRINE COMPARISON MATRIX ==================== */}
      <section className="w-full px-margin-edge py-space-2xl md:py-space-3xl border-b border-[#A99B7E] bg-[#EDE6D6]">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
          <div>
            <div className="font-label-sm text-label-sm uppercase tracking-widest text-[#8A6A4B] font-semibold">
              03 // STRATEGIC DOCTRINE
            </div>
            <h2 className="font-headline-lg text-headline-lg text-[#22303F]">
              Disruption Intelligence: From Reactive Delays to Proactive Dynamic Rerouting
            </h2>
          </div>

          {/* Comparison Matrix Table */}
          <div className="border border-[#A99B7E] bg-[#EDE6D6] overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Table Header */}
              <div className="grid grid-cols-12 bg-[#22303F] text-[#EDE6D6] font-label-md text-label-md uppercase tracking-wider py-space-sm px-space-md border-b border-[#22303F]">
                <div className="col-span-4 font-semibold">Operational Dimension</div>
                <div className="col-span-4 text-[#C9C0A6]">Traditional Logistics (Manual / Reactive)</div>
                <div className="col-span-4 text-[#EDE6D6] font-bold">AI Logistics Platform (Proactive)</div>
              </div>

              {/* Table Rows */}
              {comparisonRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 py-space-md px-space-md ${
                    idx !== comparisonRows.length - 1 ? 'border-b border-[#A99B7E]' : ''
                  } items-center gap-space-xs ${
                    row.isShaded ? 'bg-[#C9C0A6]/20' : 'bg-[#EDE6D6]'
                  }`}
                >
                  <div className="col-span-4 font-label-md text-label-md font-semibold text-[#22303F]">
                    {row.dimension}
                  </div>
                  <div className="col-span-4 font-body-sm text-body-sm text-[#8A6A4B]">
                    {row.traditional}
                  </div>
                  <div className="col-span-4 font-body-sm text-body-sm text-[#22303F] font-semibold bg-[#C9C0A6]/40 p-space-xs border-l-2 border-[#22303F]">
                    {row.forecasting}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== EXPLAINABLE RISK & ATTRIBUTION LEDGER ==================== */}
      <section className="w-full px-margin-edge py-space-2xl md:py-space-3xl border-b border-[#A99B7E] bg-[#EDE6D6]">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left Context Column */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-space-md">
              <div>
                <div className="font-label-sm text-label-sm uppercase tracking-widest text-[#8A6A4B] font-semibold">
                  04 // PROVENANCE & ATTRIBUTION
                </div>
                <h2 className="font-headline-lg text-headline-lg text-[#22303F] mt-space-xs">
                  Explainable Corridor Risk: Ground Telemetry & Climate Factor Weights
                </h2>
                <p className="font-body-md text-body-md text-[#22303F]/80 mt-space-md">
                  Routing without transparency creates paralysis. Our system breaks down each corridor hazard into clear meteorological and infrastructural risk factors.
                </p>
              </div>

              {/* Confidence Metric Box */}
              <div className="border border-[#A99B7E] bg-[#C9C0A6]/30 p-space-md font-label-sm text-label-sm space-y-space-xs">
                <div className="text-[#22303F] font-bold uppercase tracking-wider">
                  CORRIDOR CONFIDENCE SCORE
                </div>
                <div className="text-3xl font-mono text-[#22303F] font-bold">
                  0.954 <span className="text-sm font-normal text-[#8A6A4B]">/ 1.000</span>
                </div>
                <p className="text-[#8A6A4B]">
                  Evaluated across real-time rain gauge telemetry, satellite terrain imagery, and police checkpoint reports.
                </p>
              </div>
            </div>

            {/* Attribution Feature Weights Panel */}
            <div className="lg:col-span-7 border border-[#A99B7E] bg-[#EDE6D6]">
              <div className="h-8 bg-[#C9C0A6] border-b border-[#A99B7E] px-space-md flex items-center justify-between font-label-sm text-label-sm text-[#22303F]">
                <span className="font-semibold uppercase tracking-wider">
                  CORRIDOR HAZARD ATTRIBUTION [SONAPUR / NH-6]
                </span>
                <span className="font-mono">RISK CONTRIBUTION</span>
              </div>

              <div className="p-space-lg space-y-space-lg">
                {attributionFeatures.map((feat, idx) => (
                  <div key={idx} className="space-y-space-xs">
                    <div className="flex justify-between items-baseline font-label-md text-label-md">
                      <span className="font-bold text-[#22303F]">{feat.name}</span>
                      <span className="font-mono font-bold text-[#22303F]">{feat.influence}</span>
                    </div>
                    <div className="w-full h-3 bg-[#C9C0A6] border border-[#A99B7E]">
                      <div className={`h-full ${feat.barColor}`} style={{ width: `${feat.percentage}%` }}></div>
                    </div>
                    <p className="font-body-sm text-body-sm text-[#8A6A4B]">
                      {feat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
