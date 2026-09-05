import React from 'react';
import { pipelineSteps } from '../data/mockData';

export default function ArchitectureFlow() {
  return (
    <section className="w-full px-margin-edge py-space-2xl md:py-space-3xl border-b border-[#A99B7E] bg-[#EDE6D6]" id="pipeline">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
        {/* Section Header */}
        <div className="border-b border-[#A99B7E] pb-space-md">
          <div className="font-label-sm text-label-sm uppercase tracking-widest text-[#8A6A4B] font-semibold">
            05 // SYSTEM SPECIFICATION
          </div>
          <h2 className="font-headline-lg text-headline-lg text-[#22303F]">
            Cartographic Signal Pipeline
          </h2>
          <p className="font-body-md text-body-md text-[#22303F]/80 mt-space-xs">
            High-throughput data telemetry ingestion to deterministic, explainable forecast vectors.
          </p>
        </div>

        {/* Horizontal Flow Process Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-space-sm" id="architecture">
          {pipelineSteps.map((step, idx) => {
            const isHighlight = step.highlight;
            const isOutput = step.highlightBorder;

            return (
              <div
                key={idx}
                className={`border ${
                  isHighlight
                    ? 'border-[#22303F] bg-[#C9C0A6]/40'
                    : isOutput
                    ? 'border-[#8A6A4B] bg-[#EDE6D6]'
                    : 'border-[#A99B7E] bg-[#EDE6D6]'
                } p-space-sm flex flex-col justify-between`}
              >
                <div>
                  <div
                    className={`font-label-sm text-label-sm font-mono ${
                      isHighlight
                        ? 'text-[#22303F] font-bold'
                        : isOutput
                        ? 'text-[#8A6A4B] font-bold'
                        : 'text-[#8A6A4B]'
                    }`}
                  >
                    {step.step}
                  </div>
                  <div className="font-bold text-[#22303F] font-headline-md text-base mt-1">
                    {step.title}
                  </div>
                  <p className={`font-body-sm text-body-sm mt-space-xs ${isHighlight ? 'text-[#22303F]' : 'text-[#22303F]/70'}`}>
                    {step.desc}
                  </p>
                </div>

                <div
                  className={`mt-space-md pt-space-xs border-t ${
                    isHighlight
                      ? 'border-[#22303F]/40 font-mono text-[#22303F] font-bold'
                      : isOutput
                      ? 'border-[#8A6A4B]/40 font-mono text-[#8A6A4B]'
                      : 'border-[#A99B7E]/40 font-mono text-[#8A6A4B]'
                  } font-label-sm text-label-sm`}
                >
                  {step.metric}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
