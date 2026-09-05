/**
 * NER Smart Logistics & Accessibility Intelligence Platform
 * Auxiliary telemetry and reference metadata.
 */

export const tickerData = {
  datum: "DATUM: WGS-84 / EPSG-4326",
  surveyQuad: "SURVEY QUAD: NER-INDIA (8 STATES)",
  coordinates: "LAT: 26°08'N LON: 91°44'E",
  timestamp: "TS: UTC 14:02:19.4",
  indexBadge: "INDEX: NER-LOG-992.81",
};

export const heroData = {
  metadataTag: "NER LOGISTICS INTELLIGENCE • REF // NER-LOG-V2",
  modelTag: "GIS ENGINE: MAPPLS / PARCHMENT-V1",
  headline: "NER Logistics & Accessibility Command Center",
  subtitle: "Real-time GIS accessibility intelligence, disruption tracking, and emergency supply fleet coordination across North Eastern Region corridors.",
  exploreBtn: "Explore GIS Map",
  howItWorksBtn: "View Corridors",
};

export const telemetryReadouts = [
  {
    label: "Corridor Reliability Index",
    value: "84.2%",
    tag: "[STABLE]",
    borderColor: "border-[#22303F]",
  },
  {
    label: "Regional Fleet In-Transit",
    value: "+14.2%",
    tag: "dFLT/dt",
    borderColor: "border-[#8A6A4B]",
  },
  {
    label: "Monsoon Risk Gradient",
    value: "0.19σ",
    tag: "[MODERATE]",
    borderColor: "border-[#A99B7E]",
  },
  {
    label: "GIS Coordinate Fidelity",
    value: "99.8%",
    tag: "EPSG-4326",
    borderColor: "border-[#22303F]",
  },
];

export const temporalHorizons = [
  {
    id: "h-10s",
    horizonLabel: "MONITOR // T+1 HR",
    riskPercentage: "12% RISK",
    title: "Guwahati-Shillong Arterial (NH-27)",
    statusBadge: "OPEN CORRIDOR",
    badgeType: "nominal",
    description: "Nominal transit conditions across Meghalaya plateau entry. Light drizzle, road surfaces clear.",
    metrics: [
      { label: "Transit Time Delta", value: "+0.0% (Nominal)" },
      { label: "Visibility", value: "4,200m" },
      { label: "Corridor State", value: "Open" },
    ],
    disposition: "DISPOSITION: NORMAL TRANSIT",
    epoch: "SYNC // 10.0s",
    isFocal: false,
  },
  {
    id: "h-30s",
    horizonLabel: "BOTTLENECK // T+4 HR",
    riskPercentage: "92% RISK",
    title: "Sonapur Tunnel Checkpoint (NH-6)",
    statusBadge: "CRITICAL BLOCKAGE",
    badgeType: "hazard",
    description: "Major boulder fall and debris obstruction. Direct Shillong to Silchar highway inactive. Detour via Haflong recommended.",
    metrics: [
      { label: "Blockage Status", value: "100% BLOCKED" },
      { label: "Clearance Time Est.", value: "~6.5 Hours" },
      { label: "Detour Added Distance", value: "+85 km" },
    ],
    disposition: "REROUTE: VIA HAFLONG",
    epoch: "EMERGENCY ACTIVE",
    isFocal: true,
  },
  {
    id: "h-60s",
    horizonLabel: "MONITOR // T+8 HR",
    riskPercentage: "64% RISK",
    title: "Jiribam River Crossing (NH-37)",
    statusBadge: "WEIGHT RESTRICTION",
    badgeType: "hazard",
    description: "Monsoon scour damage on bridge pillar. Heavy trucks restricted (>5T). LCVs permitted under escorted spacing.",
    metrics: [
      { label: "Weight Restriction", value: "Under 5 Ton" },
      { label: "Monsoon Rainfall", value: "78.6 mm" },
      { label: "Escort Convoy", value: "Active" },
    ],
    disposition: "STATUS: LCV ONLY",
    epoch: "RESTRICTION ACTIVE",
    isFocal: false,
  },
];

export const topologicalVectors = [
  {
    id: "vec-01",
    vectorTag: "VECTOR 01 // PRECIPITATION",
    title: "Hill Slope Rainfall Accumulation",
    description: "Measures 24-hour cumulative precipitation across vulnerable landslide-prone terrain in Meghalaya and Barak Valley.",
    type: "density",
    footerLeft: "PRECIP: +94.2 mm",
    footerRight: "CONF: 0.96",
  },
  {
    id: "vec-02",
    vectorTag: "VECTOR 02 // BRIDGE SCOUR",
    title: "River Hydrology & Structural Stress",
    description: "Monitors river discharge velocity and pier scouring at critical river bridges across NH-37 and NH-10.",
    type: "latency",
    footerLeft: "STRESS: 3.12x",
    footerRight: "RISK: HIGH",
  },
  {
    id: "vec-03",
    vectorTag: "VECTOR 03 // FLEET TRANSIT",
    title: "Corridor Delay & Congestion Vector",
    description: "Tracks GPS telemetry and speed differentials across arterial highway sections to dynamically reroute emergency supply convoys.",
    type: "entropy",
    footerLeft: "DELAY: +180 MINS",
    footerRight: "DETOUR: ACTIVE",
  },
];

export const comparisonRows = [
  {
    dimension: "Disruption Detection",
    traditional: "Delayed phone calls and manual police logs (2-4 hours latency).",
    forecasting: "Real-time Field Officer GPS reporting with Groq Vision AI validation (<10s).",
    isShaded: false,
  },
  {
    dimension: "Routing Intelligence",
    traditional: "Static highway routes resulting in hours stranded at blocked bottlenecks.",
    forecasting: "AI-Powered dynamic route optimization bypassing active landslides and weight-restricted bridges.",
    isShaded: true,
  },
  {
    dimension: "Fleet Visibility",
    traditional: "Disconnected radio checks without centralized geospatial coordinate tracking.",
    forecasting: "Live tactical Leaflet/Mappls GIS telemetry with status-coded convoy markers.",
    isShaded: false,
  },
  {
    dimension: "Accessibility Matrix",
    traditional: "Fragmented district reports with no regional accessibility index.",
    forecasting: "Automated real-time District Readiness Scorecard derived from passable highway networks.",
    isShaded: true,
  },
];

export const attributionFeatures = [
  {
    name: "High Slope Precipitation (Sonapur)",
    influence: "+42% RISK WEIGHT",
    percentage: 42,
    barColor: "bg-[#22303F]",
    description: "Primary driving factor: 94.2mm torrential downpour causing hill slope mud saturation.",
  },
  {
    name: "Structural Bridge Load Limit (Jiribam)",
    influence: "+28% RISK WEIGHT",
    percentage: 28,
    barColor: "bg-[#8A6A4B]",
    description: "Secondary factor: Pier scouring restricting heavy freight vehicles (>5T).",
  },
  {
    name: "Riverbank Erosion (NH-10 Teesta)",
    influence: "+17% RISK WEIGHT",
    percentage: 17,
    barColor: "bg-[#8A6A4B]",
    description: "Tertiary factor: Teesta river high-water overtopping shoulder section.",
  },
  {
    name: "Valley Fog & Reduced Visibility",
    influence: "+13% RISK WEIGHT",
    percentage: 13,
    barColor: "bg-[#A99B7E]",
    description: "Residual factor: Sub-800m fog conditions along Meghalaya highland sections.",
  },
];

export const pipelineSteps = [
  {
    step: "01. INGEST",
    title: "Field Telemetry",
    desc: "Mobile GPS coordinates, officer reports & incident photos.",
    metric: "INGEST: REAL-TIME",
    highlight: false,
  },
  {
    step: "02. VISION AI",
    title: "Multimodal Verify",
    desc: "Groq Vision AI evaluates scene debris & road damage.",
    metric: "ACC: 95%+",
    highlight: true,
  },
  {
    step: "03. ALERT",
    title: "Advisory Broadcast",
    desc: "Verified alerts dispatched to regional command center.",
    metric: "LATENCY: <2s",
    highlight: false,
  },
  {
    step: "04. GIS MAP",
    title: "Geospatial Projection",
    desc: "Mappls/Leaflet map renders live markers & bottlenecks.",
    metric: "EPSG-4326",
    highlight: false,
  },
  {
    step: "05. ROUTE AI",
    title: "Disruption Bypass",
    desc: "Groq AI computes optimal detour avoiding blocked passes.",
    metric: "SAVED: +240m",
    highlight: true,
  },
  {
    step: "06. FLEET",
    title: "Convoy Tracking",
    desc: "Real-time telemetry & step simulation for supply trucks.",
    metric: "SYNC: LIVE",
    highlightBorder: "border-[#8A6A4B]",
  },
  {
    step: "07. ACCESSIBILITY",
    title: "District Matrix",
    desc: "Live derivation of district vulnerability scorecard.",
    metric: "COVERAGE: 100%",
    highlight: false,
  },
];
