import React from 'react';
import { heroData } from '../data/mockData';

export default function Hero() {
  return (
    <div className="flex flex-col gap-space-xl">
      {/* Metadata Tag */}
      <div className="flex items-center gap-space-sm">
        <span className="inline-block w-2 h-2 bg-[#8A6A4B]"></span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#8A6A4B] font-semibold">
          {heroData.metadataTag}
        </span>
        <span className="hidden sm:inline text-[#A99B7E] font-label-sm text-label-sm">|</span>
        <span className="hidden sm:inline font-label-sm text-label-sm text-[#8A6A4B]">
          {heroData.modelTag}
        </span>
      </div>

      {/* Headline & Subtitle Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-end">
        <div className="lg:col-span-8">
          <h1 className="font-display-lg text-display-lg text-[#22303F] tracking-tight leading-tight">
            {heroData.headline}
          </h1>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <p className="font-body-lg text-body-lg text-[#22303F]/80">
            {heroData.subtitle}
          </p>
          <div className="flex items-center gap-space-sm pt-space-xs">
            <a
              href="#forecast-interactive"
              className="px-space-lg py-space-sm bg-[#22303F] text-[#EDE6D6] font-label-md text-label-md uppercase tracking-wider hover:bg-[#8A6A4B] transition-colors inline-flex items-center gap-space-xs border border-[#22303F]"
            >
              <span>{heroData.exploreBtn}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
            <a
              href="#pipeline"
              className="px-space-lg py-space-sm border border-[#22303F] text-[#22303F] font-label-md text-label-md uppercase tracking-wider hover:bg-[#C9C0A6] transition-colors"
            >
              {heroData.howItWorksBtn}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
