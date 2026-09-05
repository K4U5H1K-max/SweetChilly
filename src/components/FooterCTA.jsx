import React from 'react';

export default function FooterCTA() {
  return (
    <section className="w-full px-margin-edge py-space-3xl bg-[#C9C0A6]/30">
      <div className="max-w-4xl mx-auto border border-[#A99B7E] bg-[#EDE6D6] p-space-xl md:p-space-3xl flex flex-col items-center text-center space-y-space-lg relative">
        {/* Top Decorative Datum Marker */}
        <div className="font-label-sm text-label-sm uppercase tracking-widest text-[#8A6A4B] font-semibold border border-[#A99B7E] px-space-sm py-0.5 bg-[#EDE6D6]">
          GRID POSITION // NORTH EAST REGION EPSG-4326
        </div>

        <div className="space-y-space-sm max-w-2xl">
          <h2 className="font-display-lg text-display-lg text-[#22303F] tracking-tight">
            Coordinate Supply Logistics Across NER Corridors.
          </h2>
          <p className="font-body-lg text-body-lg text-[#22303F]/80">
            Move disaster and supply operations from reactive delay to AI-powered advance positioning. Deploy GIS cartography and dynamic fleet routing across critical North Eastern arteries.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-space-md pt-space-sm">
          <a
            href="#gis-map"
            className="px-space-xl py-space-md bg-[#22303F] text-[#EDE6D6] font-label-md text-label-md uppercase tracking-wider hover:bg-[#8A6A4B] transition-colors border border-[#22303F] flex items-center gap-space-sm"
          >
            <span>Launch Command Center</span>
            <span className="material-symbols-outlined text-sm">north_east</span>
          </a>
          <a
            href="#districts"
            className="px-space-xl py-space-md border border-[#A99B7E] text-[#22303F] bg-[#EDE6D6] font-label-md text-label-md uppercase tracking-wider hover:bg-[#C9C0A6] transition-colors"
          >
            View Accessibility Matrix
          </a>
        </div>

        {/* Bottom Coordinate Ledger Footnote */}
        <div className="pt-space-md border-t border-[#A99B7E]/60 w-full flex flex-col sm:flex-row justify-between text-left font-label-sm text-label-sm text-[#8A6A4B] font-mono">
          <span>MODEL: NER-LOGISTICS-V2 // GROQ VISION & ROUTING</span>
          <span>VERIFICATION RUN: MULTI-AGENCY PROVENANCE</span>
        </div>
      </div>
    </section>
  );
}
