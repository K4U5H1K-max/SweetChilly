import React, { useState } from 'react';
import { telemetryReadouts } from '../data/mockData';

export default function NetworkTerrainVisualization() {
  const [hoveredNode, setHoveredNode] = useState(null);

  return (
    <div className="w-full border border-[#A99B7E] bg-[#EDE6D6] relative overflow-hidden" id="forecast-interactive">
      {/* Cartographic Chrome Header */}
      <div className="h-8 bg-[#C9C0A6] border-b border-[#A99B7E] px-space-md flex items-center justify-between font-label-sm text-label-sm text-[#22303F]">
        <div className="flex items-center gap-space-md">
          <span className="font-semibold uppercase tracking-wider">
            TOPOGRAPHIC CORRIDOR PROJECTION :: HIGHWAY TELEMETRY [60m HORIZON]
          </span>
          <span className="hidden md:inline text-[#A99B7E]">|</span>
          <span className="hidden md:inline font-mono">GRID EPSG:4326 ELEVATION-FLUX: 42.81m</span>
        </div>
        <div className="flex items-center gap-space-md">
          <span className="flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 bg-[#22303F] inline-block"></span> OPEN CORRIDOR
          </span>
          <span className="flex items-center gap-1 font-mono text-[#8A6A4B]">
            <span className="w-2 h-0.5 border-t border-dashed border-[#8A6A4B] inline-block"></span> BYPASS VECTOR
          </span>
        </div>
      </div>

      {/* SVG Cartographic Map Surface */}
      <div className="relative w-full aspect-[16/9] max-h-[560px] min-h-[380px] bg-[#EDE6D6] p-space-sm">
        <svg
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1000 520"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="contourHatch"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#A99B7E" strokeWidth="0.75" />
            </pattern>
            <pattern
              id="riskHatch"
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(20 0 0)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="#8A6A4B" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Coordinate Grid Lines */}
          <g stroke="#A99B7E" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.7">
            <line x1="100" y1="40" x2="100" y2="460" />
            <line x1="250" y1="40" x2="250" y2="460" />
            <line x1="400" y1="40" x2="400" y2="460" />
            <line x1="550" y1="40" x2="550" y2="460" />
            <line x1="700" y1="40" x2="700" y2="460" />
            <line x1="850" y1="40" x2="850" y2="460" />
            <line x1="60" y1="100" x2="940" y2="100" />
            <line x1="60" y1="180" x2="940" y2="180" />
            <line x1="60" y1="260" x2="940" y2="260" />
            <line x1="60" y1="340" x2="940" y2="340" />
            <line x1="60" y1="420" x2="940" y2="420" />
          </g>

          {/* Axis Labels & Ticks */}
          <g fill="#A99B7E" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle">
            <text x="100" y="480">91°E</text>
            <text x="250" y="480">92°E</text>
            <text x="400" y="480">93°E</text>
            <text x="470" y="480" fill="#22303F" fontWeight="bold">93°30'E [GHY-DEPOT]</text>
            <text x="610" y="480">94°E</text>
            <text x="730" y="480" fill="#8A6A4B" fontWeight="bold">94°30'E [HAFLONG-BYPASS]</text>
            <text x="880" y="480">95°E</text>

            <text x="45" y="104" textAnchor="end">PRECIP: 94mm</text>
            <text x="45" y="184" textAnchor="end">ELEV: 1,420m</text>
            <text x="45" y="264" textAnchor="end">TRANSIT: 48k/h</text>
            <text x="45" y="344" textAnchor="end">GRADIENT: 12°</text>
            <text x="45" y="424" textAnchor="end">VIS: 800m</text>
          </g>

          {/* Topographic Relief Contours (Calm Zones) */}
          <path
            d="M 80,380 C 140,360 210,390 280,370 C 350,350 420,380 480,370 C 560,360 620,390 710,380 C 800,370 880,390 940,375 L 940,460 L 80,460 Z"
            fill="#C9C0A6"
            opacity="0.6"
            stroke="#A99B7E"
            strokeWidth="0.75"
          />
          <path
            d="M 120,320 C 180,300 240,310 320,290 C 400,270 450,290 510,270 C 580,250 670,290 740,260 C 820,230 890,260 930,240 L 930,375 C 880,390 800,370 710,380 C 620,390 560,360 480,370 C 420,380 350,350 280,370 C 210,390 140,360 80,380 L 80,320 Z"
            fill="#C9C0A6"
            opacity="0.35"
            stroke="#A99B7E"
            strokeWidth="0.75"
          />

          {/* Elevated High-Risk Ridge (Topographic Terrain High #8A6A4B) */}
          <path
            d="M 520,250 C 580,210 650,170 710,130 C 760,95 810,80 880,95 C 920,105 940,120 940,160 L 940,240 C 890,260 820,230 740,260 C 670,290 580,250 520,250 Z"
            fill="#8A6A4B"
            opacity="0.35"
            stroke="#8A6A4B"
            strokeWidth="1"
          />

          {/* Contour Isolines */}
          <path
            d="M 620,210 C 670,170 720,130 780,110 C 830,95 880,110 930,125"
            fill="none"
            stroke="#8A6A4B"
            strokeWidth="0.75"
            strokeDasharray="4 2"
          />
          <path
            d="M 680,180 C 720,145 760,115 820,105 C 860,98 900,112 940,115"
            fill="none"
            stroke="#8A6A4B"
            strokeWidth="0.75"
          />

          {/* Historical Plotted Trajectory (Solid #22303F) */}
          <path
            d="M 100,350 Q 180,340 240,355 T 350,330 T 420,320 T 470,300"
            fill="none"
            stroke="#22303F"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Historical Point Markers */}
          <circle cx="100" cy="350" r="3" fill="#22303F" />
          <circle cx="240" cy="355" r="2.5" fill="#22303F" />
          <circle cx="350" cy="330" r="2.5" fill="#22303F" />
          <circle cx="420" cy="320" r="2.5" fill="#22303F" />

          {/* Current Convoy Location (Guwahati Staging) */}
          <g transform="translate(470, 300)" className="cursor-pointer">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#22303F" strokeWidth="0.75" strokeDasharray="2 2" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#22303F" strokeWidth="1.25" />
            <circle cx="0" cy="0" r="3" fill="#22303F" />
            <line x1="0" y1="-18" x2="0" y2="-8" stroke="#22303F" strokeWidth="1" />
            <line x1="0" y1="8" x2="0" y2="18" stroke="#22303F" strokeWidth="1" />
            <line x1="-18" y1="0" x2="-8" y2="0" stroke="#22303F" strokeWidth="1" />
            <line x1="8" y1="0" x2="18" y2="0" stroke="#22303F" strokeWidth="1" />
            <text
              x="0"
              y="-24"
              fill="#22303F"
              fontFamily="JetBrains Mono"
              fontSize="8.5"
              fontWeight="bold"
              textAnchor="middle"
            >
              GUWAHATI CENTRAL HUB
            </text>
          </g>

          {/* Projected Forecast Trajectory */}
          <path
            d="M 470,300 C 530,280 610,240 730,150"
            fill="none"
            stroke="#8A6A4B"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Post-Onset Dispersion Fan */}
          <path
            d="M 730,150 C 780,120 830,105 910,95"
            fill="none"
            stroke="#8A6A4B"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <path
            d="M 730,150 C 800,150 850,160 920,180"
            fill="none"
            stroke="#8A6A4B"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <path
            d="M 730,150 C 780,170 830,220 900,250"
            fill="none"
            stroke="#8A6A4B"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.3"
          />

          {/* Intermediate Checkpoint */}
          <g transform="translate(580, 255)">
            <circle cx="0" cy="0" r="2.5" fill="#8A6A4B" />
            <text
              x="0"
              y="16"
              fill="#8A6A4B"
              fontFamily="JetBrains Mono"
              fontSize="7.5"
              textAnchor="middle"
            >
              Nagaon (NH-27)
            </text>
          </g>

          {/* SONAPUR BLOCKED BOTTLENECK WAYPOINT */}
          <g transform="translate(730, 150)" className="cursor-pointer">
            <circle
              cx="0"
              cy="0"
              r="24"
              fill="none"
              stroke="#C1522E"
              strokeWidth="0.75"
              strokeDasharray="4 2"
              opacity="0.6"
            >
              <animate attributeName="r" values="18;26;18" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="14" fill="none" stroke="#C1522E" strokeWidth="1.25" />
            <circle cx="0" cy="0" r="4.5" fill="#C1522E" />

            <line x1="-20" y1="0" x2="-6" y2="0" stroke="#C1522E" strokeWidth="1.5" />
            <line x1="6" y1="0" x2="20" y2="0" stroke="#C1522E" strokeWidth="1.5" />
            <line x1="0" y1="-20" x2="0" y2="-6" stroke="#C1522E" strokeWidth="1.5" />
            <line x1="0" y1="6" x2="0" y2="20" stroke="#C1522E" strokeWidth="1.5" />

            <polyline points="10,-10 32,-35 150,-35" fill="none" stroke="#C1522E" strokeWidth="1.2" />

            <g transform="translate(35, -95)">
              <rect width="180" height="56" fill="#EDE6D6" stroke="#C1522E" strokeWidth="1" />
              <rect width="180" height="14" fill="#C1522E" />
              <text
                x="6"
                y="10"
                fill="#EDE6D6"
                fontFamily="JetBrains Mono"
                fontSize="8"
                fontWeight="bold"
                letterSpacing="0.08em"
              >
                CRITICAL DISRUPTION WAYPOINT
              </text>
              <text
                x="6"
                y="27"
                fill="#C1522E"
                fontFamily="JetBrains Mono"
                fontSize="10"
                fontWeight="bold"
              >
                SONAPUR TUNNEL LANDSLIDE
              </text>
              <text x="6" y="40" fill="#22303F" fontFamily="JetBrains Mono" fontSize="9">
                NH-6 HIGHWAY: <tspan fontWeight="bold">BLOCKED</tspan>
              </text>
              <text
                x="6"
                y="50"
                fill="#C1522E"
                fontFamily="JetBrains Mono"
                fontSize="9"
                fontWeight="bold"
              >
                94% AI CONFIDENCE
              </text>
            </g>
          </g>

          {/* Delivery Terminal */}
          <g transform="translate(880, 100)">
            <circle cx="0" cy="0" r="3" fill="#8A6A4B" />
            <text
              x="0"
              y="-12"
              fill="#8A6A4B"
              fontFamily="JetBrains Mono"
              fontSize="7.5"
              textAnchor="middle"
            >
              Silchar Relief Depot
            </text>
          </g>
        </svg>
      </div>

      {/* Telemetry Footer Readouts */}
      <div className="border-t border-[#A99B7E] bg-[#EDE6D6] p-space-md grid grid-cols-2 md:grid-cols-4 gap-space-md font-label-md text-label-md">
        {telemetryReadouts.map((item, idx) => (
          <div key={idx} className={`border-l-2 ${item.borderColor} pl-space-sm`}>
            <div className="font-label-sm text-label-sm text-[#8A6A4B] uppercase">{item.label}</div>
            <div className="font-bold text-[#22303F] font-mono text-base">
              {item.value} <span className="text-xs font-normal text-[#8A6A4B]">{item.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
