import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapPin, AlertTriangle, Truck, CloudRain, Mountain, Wifi, WifiOff,
  Camera, Languages, Navigation, Clock, Package, ChevronRight, X,
  CheckCircle2, ChevronDown, RadioTower, Route as RouteIcon, ArrowRight,
  Landmark, Waves
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg: "#0E1A15",
  panel: "#142720",
  panel2: "#1B342A",
  panelBorder: "#2A4436",
  ridge: "#20392E",
  text: "#EAF1EC",
  textMuted: "#8FAA9C",
  textFaint: "#5E7A6C",
  accent: "#5FB894",
  accentSoft: "#28493B",
  open: "#4FA875",
  restricted: "#D9A441",
  blocked: "#C4544A",
  river: "#4C86A8",
};

// ---------------------------------------------------------------------------
// Translations (light-touch, chrome-level)
// ---------------------------------------------------------------------------
const STR = {
  en: {
    title: "NER Logistics & Accessibility Intelligence",
    subtitle: "Real-time route, transport & disruption monitoring",
    districts: "District Accessibility",
    alerts: "Alerts", tracking: "Vehicle Tracking", routing: "Route Planner", report: "Field Report",
    connected: "Districts monitored", activeAlerts: "Active alerts", inTransit: "Vehicles in transit", avgDelay: "Avg. corridor delay",
    open: "Open", restricted: "Restricted", blocked: "Blocked",
    getRoute: "Predict route", from: "From", to: "To",
    primary: "AI-suggested route", alternate: "Alternate route",
    submit: "Submit report", queued: "Queued — will sync when online",
    offlineBanner: "Offline mode — showing last synced data. New reports are queued locally.",
    photo: "Attach geo-tagged photo", photoAdded: "Photo attached",
    category: "Incident type", description: "Description", district: "District",
    submitted: "Report submitted and alert broadcast to field teams.",
  },
  hi: {
    title: "एनईआर लॉजिस्टिक्स एवं पहुँच इंटेलिजेंस",
    subtitle: "वास्तविक-समय मार्ग, परिवहन एवं अवरोध निगरानी",
    districts: "जिला पहुँच स्थिति",
    alerts: "अलर्ट", tracking: "वाहन ट्रैकिंग", routing: "मार्ग योजना", report: "फील्ड रिपोर्ट",
    connected: "निगरानी में जिले", activeAlerts: "सक्रिय अलर्ट", inTransit: "मार्ग में वाहन", avgDelay: "औसत विलंब",
    open: "खुला", restricted: "सीमित", blocked: "अवरुद्ध",
    getRoute: "मार्ग सुझाव", from: "से", to: "तक",
    primary: "एआई-सुझाया मार्ग", alternate: "वैकल्पिक मार्ग",
    submit: "रिपोर्ट भेजें", queued: "कतार में — ऑनलाइन होने पर सिंक होगा",
    offlineBanner: "ऑफ़लाइन मोड — अंतिम सिंक डेटा दिखाया जा रहा है। नई रिपोर्ट स्थानीय रूप से कतार में हैं।",
    photo: "जियो-टैग फोटो जोड़ें", photoAdded: "फोटो जुड़ी",
    category: "घटना प्रकार", description: "विवरण", district: "जिला",
    submitted: "रिपोर्ट सबमिट हुई और फील्ड टीमों को अलर्ट भेजा गया।",
  },
  as: {
    title: "এনইআৰ লজিষ্টিকচ আৰু সংযোগ বুদ্ধিমত্তা",
    subtitle: "প্ৰকৃত-সময় পথ, পৰিবহণ আৰু বাধা নিৰীক্ষণ",
    districts: "জিলা সংযোগৰ অৱস্থা",
    alerts: "সতৰ্কবাণী", tracking: "বাহন অনুসৰণ", routing: "পথ পৰিকল্পনা", report: "ফিল্ড প্ৰতিবেদন",
    connected: "নিৰীক্ষণ কৰা জিলা", activeAlerts: "সক্ৰিয় সতৰ্কবাণী", inTransit: "গমনত থকা বাহন", avgDelay: "গড় পলম",
    open: "মুকলি", restricted: "সীমিত", blocked: "অৱৰুদ্ধ",
    getRoute: "পথ পূৰ্বানুমান", from: "ৰ পৰা", to: "লৈ",
    primary: "AI পৰামৰ্শিত পথ", alternate: "বিকল্প পথ",
    submit: "প্ৰতিবেদন জমা দিয়ক", queued: "শাৰীত ৰখা হ'ল — অনলাইন হ'লে ছিংক হ'ব",
    offlineBanner: "অফলাইনモড — শেষবাৰৰ ছিংক কৰা তথ্য দেখুওৱা হৈছে।",
    photo: "ফটো সংযুক্ত কৰক", photoAdded: "ফটো সংযুক্ত",
    category: "ঘটনাৰ ধৰণ", description: "বিৱৰণ", district: "জিলা",
    submitted: "প্ৰতিবেদন জমা হ'ল আৰু ফিল্ড দলক সতৰ্ক কৰা হ'ল।",
  },
};

// ---------------------------------------------------------------------------
// Mock geography
// ---------------------------------------------------------------------------
const DISTRICTS = [
  { id: "tawang", name: "Tawang", state: "Arunachal Pradesh", x: 430, y: 55, status: "blocked", elevation: "3,000 m" },
  { id: "itanagar", name: "Itanagar", state: "Arunachal Pradesh", x: 545, y: 100, status: "restricted", elevation: "440 m" },
  { id: "dibrugarh", name: "Dibrugarh", state: "Assam", x: 575, y: 205, status: "open", elevation: "108 m" },
  { id: "guwahati", name: "Guwahati", state: "Assam", x: 375, y: 225, status: "open", elevation: "55 m" },
  { id: "silchar", name: "Silchar", state: "Assam", x: 470, y: 350, status: "open", elevation: "31 m" },
  { id: "shillong", name: "Shillong", state: "Meghalaya", x: 300, y: 285, status: "open", elevation: "1,496 m" },
  { id: "tura", name: "Tura", state: "Meghalaya", x: 195, y: 300, status: "open", elevation: "657 m" },
  { id: "dimapur", name: "Dimapur", state: "Nagaland", x: 505, y: 265, status: "open", elevation: "260 m" },
  { id: "kohima", name: "Kohima", state: "Nagaland", x: 575, y: 305, status: "restricted", elevation: "1,444 m" },
  { id: "imphal", name: "Imphal", state: "Manipur", x: 545, y: 385, status: "restricted", elevation: "790 m" },
  { id: "aizawl", name: "Aizawl", state: "Mizoram", x: 440, y: 445, status: "restricted", elevation: "1,132 m" },
  { id: "agartala", name: "Agartala", state: "Tripura", x: 295, y: 425, status: "blocked", elevation: "45 m" },
];

const ROUTES = [
  { a: "guwahati", b: "shillong", status: "open", base: 95, extra: 0, reason: null },
  { a: "guwahati", b: "dibrugarh", status: "restricted", base: 300, extra: 90, reason: "Flood water on NH-27 near Jorhat" },
  { a: "guwahati", b: "silchar", status: "open", base: 260, extra: 0, reason: null },
  { a: "shillong", b: "tura", status: "open", base: 180, extra: 0, reason: null },
  { a: "shillong", b: "agartala", status: "blocked", base: 340, extra: 999, reason: "Landslide, carriageway fully blocked" },
  { a: "dibrugarh", b: "itanagar", status: "restricted", base: 150, extra: 60, reason: "Road surface damage, single-lane pass" },
  { a: "itanagar", b: "tawang", status: "blocked", base: 420, extra: 999, reason: "Snow-bound pass above 2,800 m" },
  { a: "dibrugarh", b: "dimapur", status: "open", base: 220, extra: 0, reason: null },
  { a: "dimapur", b: "kohima", status: "restricted", base: 75, extra: 25, reason: "Heavy rainfall, visibility low" },
  { a: "dimapur", b: "imphal", status: "restricted", base: 190, extra: 45, reason: "Traffic congestion at Mao Gate" },
  { a: "imphal", b: "aizawl", status: "open", base: 260, extra: 0, reason: null },
  { a: "silchar", b: "agartala", status: "open", base: 210, extra: 0, reason: null },
  { a: "silchar", b: "aizawl", status: "restricted", base: 200, extra: 50, reason: "Flood-prone stretch near Vairengte" },
  { a: "agartala", b: "aizawl", status: "blocked", base: 330, extra: 999, reason: "Bridge damage, load restriction" },
];

const byId = (id) => DISTRICTS.find((d) => d.id === id);

function buildGraph(avoidBlocked) {
  const g = {};
  DISTRICTS.forEach((d) => (g[d.id] = []));
  ROUTES.forEach((r) => {
    if (avoidBlocked && r.status === "blocked") return;
    g[r.a].push({ to: r.b, r });
    g[r.b].push({ to: r.a, r });
  });
  return g;
}

function bfsPath(from, to, avoidBlocked, skipEdgeKey) {
  const g = buildGraph(avoidBlocked);
  const q = [[from]];
  const seen = new Set([from]);
  while (q.length) {
    const path = q.shift();
    const node = path[path.length - 1];
    if (node === to) return path;
    for (const edge of g[node] || []) {
      const key = [edge.r.a, edge.r.b].sort().join("|");
      if (skipEdgeKey && key === skipEdgeKey) continue;
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        q.push([...path, edge.to]);
      }
    }
  }
  return null;
}

function edgeBetween(a, b) {
  return ROUTES.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

function pathStats(path) {
  if (!path || path.length < 2) return null;
  let time = 0;
  const edges = [];
  for (let i = 0; i < path.length - 1; i++) {
    const e = edgeBetween(path[i], path[i + 1]);
    edges.push(e);
    time += e.base + (e.status === "restricted" ? e.extra : 0);
  }
  const hasRestricted = edges.some((e) => e.status === "restricted");
  return { edges, time, hasRestricted };
}

// ---------------------------------------------------------------------------
// Mock alerts / vehicles
// ---------------------------------------------------------------------------
const INITIAL_ALERTS = [
  { id: "a1", severity: "blocked", district: "Tawang", type: "Landslide", msg: "Sela Pass approach blocked by debris flow.", time: "08:12" },
  { id: "a2", severity: "blocked", district: "Agartala", type: "Landslide", msg: "NH-8 blocked near Baramura hills.", time: "07:40" },
  { id: "a3", severity: "restricted", district: "Dibrugarh", type: "Flood", msg: "Brahmaputra water level rising near Jorhat bridge.", time: "09:05" },
  { id: "a4", severity: "restricted", district: "Kohima", type: "Heavy rainfall", msg: "Reduced visibility on Dimapur–Kohima stretch.", time: "06:55" },
  { id: "a5", severity: "restricted", district: "Imphal", type: "Congestion", msg: "Convoy queue building at Mao Gate checkpoint.", time: "09:30" },
];

const INITIAL_VEHICLES = [
  { id: "V-102", cargo: "Essential medicines", icon: "med", from: "guwahati", to: "dibrugarh", progress: 62, status: "In transit" },
  { id: "V-118", cargo: "Food supplies", icon: "food", from: "dimapur", to: "kohima", progress: 30, status: "In transit" },
  { id: "V-131", cargo: "Construction material", icon: "build", from: "silchar", to: "aizawl", progress: 78, status: "In transit" },
  { id: "V-144", cargo: "Agricultural produce", icon: "agri", from: "shillong", to: "tura", progress: 95, status: "In transit" },
  { id: "V-155", cargo: "Essential medicines", icon: "med", from: "dibrugarh", to: "itanagar", progress: 12, status: "Delayed" },
  { id: "V-160", cargo: "Food supplies", icon: "food", from: "imphal", to: "aizawl", progress: 48, status: "In transit" },
];

const statusColor = (s) => (s === "open" ? C.open : s === "restricted" ? C.restricted : C.blocked);
const statusLabel = (s, t) => (s === "open" ? t.open : s === "restricted" ? t.restricted : t.blocked);

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------
function StatusDot({ status, size = 8 }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: statusColor(status), boxShadow: `0 0 8px ${statusColor(status)}99` }}
    />
  );
}

function Pill({ status, t }) {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5"
      style={{ background: `${statusColor(status)}22`, color: statusColor(status), border: `1px solid ${statusColor(status)}55` }}
    >
      <StatusDot status={status} size={6} />
      {statusLabel(status, t)}
    </span>
  );
}

function cargoIcon(icon, size = 14) {
  const props = { size, strokeWidth: 2 };
  if (icon === "med") return <Package {...props} />;
  if (icon === "food") return <Package {...props} />;
  if (icon === "build") return <Landmark {...props} />;
  return <Package {...props} />;
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function App() {
  const [lang, setLang] = useState("en");
  const t = STR[lang];
  const [online, setOnline] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [tab, setTab] = useState("alerts");
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // route planner state
  const [origin, setOrigin] = useState("guwahati");
  const [dest, setDest] = useState("aizawl");
  const [routeResult, setRouteResult] = useState(null);

  // field report state
  const [reportDistrict, setReportDistrict] = useState(DISTRICTS[0].id);
  const [reportCategory, setReportCategory] = useState("Landslide");
  const [reportDesc, setReportDesc] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [reportConfirmed, setReportConfirmed] = useState(false);

  // simulate vehicle movement
  useEffect(() => {
    const iv = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.status === "Delayed" || v.progress >= 100) return v;
          const inc = 2 + Math.round(Math.random() * 4);
          const next = Math.min(100, v.progress + inc);
          return { ...v, progress: next, status: next >= 100 ? "Delivered" : v.status };
        })
      );
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  const stats = useMemo(() => {
    const blockedCount = ROUTES.filter((r) => r.status === "blocked").length;
    const restrictedCount = ROUTES.filter((r) => r.status === "restricted").length;
    const avgDelay = Math.round(
      ROUTES.filter((r) => r.status === "restricted").reduce((s, r) => s + r.extra, 0) / Math.max(1, restrictedCount)
    );
    return {
      districts: DISTRICTS.length,
      activeAlerts: alerts.length,
      inTransit: vehicles.filter((v) => v.status !== "Delivered").length,
      avgDelay,
      blockedCount,
    };
  }, [alerts, vehicles]);

  function runRoutePrediction() {
    if (origin === dest) { setRouteResult(null); return; }
    const primary = bfsPath(origin, dest, true);
    let alternate = null;
    if (primary && primary.length > 2) {
      const midA = primary[Math.floor(primary.length / 2) - 1];
      const midB = primary[Math.floor(primary.length / 2)];
      const key = [midA, midB].sort().join("|");
      alternate = bfsPath(origin, dest, true, key);
    } else if (primary) {
      alternate = bfsPath(origin, dest, false, [primary[0], primary[1]].sort().join("|"));
    }
    setRouteResult({
      primary: primary ? { path: primary, stats: pathStats(primary) } : null,
      alternate: alternate && JSON.stringify(alternate) !== JSON.stringify(primary)
        ? { path: alternate, stats: pathStats(alternate) }
        : null,
    });
  }

  function submitReport() {
    const sev = reportCategory === "Landslide" || reportCategory === "Bridge damage" ? "blocked" : "restricted";
    const d = byId(reportDistrict);
    const newAlert = {
      id: "field-" + Date.now(),
      severity: sev,
      district: d.name,
      type: reportCategory,
      msg: reportDesc || `${reportCategory} reported by field officer near ${d.name}.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setReportConfirmed(true);
    setReportDesc("");
    setPhotoAttached(false);
    setTimeout(() => setReportConfirmed(false), 3200);
  }

  const hoveredOrSelected = selectedDistrict ? byId(selectedDistrict) : null;

  return (
    <div
      className="w-full min-h-screen"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, #16332750 0%, transparent 55%), ${C.bg}`,
        color: C.text,
        fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .ner-head { font-family: 'Space Grotesk', ui-sans-serif, system-ui; }
        .ner-scroll::-webkit-scrollbar { width: 6px; }
        .ner-scroll::-webkit-scrollbar-thumb { background: ${C.panelBorder}; border-radius: 4px; }
        @keyframes ner-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .ner-live { animation: ner-pulse 1.8s ease-in-out infinite; }
        select.ner-select { -webkit-appearance: none; appearance: none; }
      `}</style>

      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b sticky top-0 z-20"
        style={{ borderColor: C.panelBorder, background: `${C.bg}E6`, backdropFilter: "blur(6px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: C.accentSoft, border: `1px solid ${C.panelBorder}` }}
          >
            <Mountain size={18} color={C.accent} strokeWidth={2} />
          </div>
          <div>
            <h1 className="ner-head text-[15px] font-semibold leading-tight" style={{ color: C.text }}>{t.title}</h1>
            <p className="text-[11px] leading-tight" style={{ color: C.textMuted }}>{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnline((o) => !o)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors"
            style={{
              borderColor: online ? `${C.open}55` : `${C.blocked}55`,
              color: online ? C.open : C.blocked,
              background: online ? `${C.open}14` : `${C.blocked}14`,
            }}
          >
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? "Synced" : "Offline"}
            <span className={online ? "" : "ner-live"} style={{ width: 5, height: 5, borderRadius: 999, background: online ? C.open : C.blocked, display: "inline-block", marginLeft: 2 }} />
          </button>

          <div className="relative">
            <button
              onClick={() => setLangMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border"
              style={{ borderColor: C.panelBorder, color: C.textMuted, background: C.panel }}
            >
              <Languages size={13} /> {lang === "en" ? "EN" : lang === "hi" ? "हिं" : "অস"} <ChevronDown size={12} />
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 mt-1 rounded-md border overflow-hidden z-30" style={{ borderColor: C.panelBorder, background: C.panel2 }}>
                {[["en", "English"], ["hi", "हिन्दी"], ["as", "অসমীয়া"]].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => { setLang(k); setLangMenuOpen(false); }}
                    className="block w-full text-left text-xs px-3 py-2 hover:opacity-80"
                    style={{ color: k === lang ? C.accent : C.textMuted, whiteSpace: "nowrap" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {!online && (
        <div className="px-5 py-2 text-xs flex items-center gap-2" style={{ background: `${C.blocked}18`, color: C.blocked, borderBottom: `1px solid ${C.blocked}33` }}>
          <WifiOff size={13} /> {t.offlineBanner}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-4 p-4" style={{ gridTemplateColumns: "270px 1fr 340px" }}>
        {/* Left: district list */}
        <div className="rounded-xl border p-3 h-fit" style={{ borderColor: C.panelBorder, background: C.panel }}>
          <h2 className="ner-head text-xs font-semibold tracking-tight mb-2 flex items-center gap-1.5" style={{ color: C.textMuted }}>
            <MapPin size={13} /> {t.districts}
          </h2>
          <div className="flex flex-col gap-1 max-h-[520px] overflow-y-auto ner-scroll pr-0.5">
            {DISTRICTS.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDistrict(d.id === selectedDistrict ? null : d.id)}
                className="flex items-center justify-between text-left px-2.5 py-2 rounded-lg transition-colors"
                style={{
                  background: selectedDistrict === d.id ? C.panel2 : "transparent",
                  border: `1px solid ${selectedDistrict === d.id ? C.panelBorder : "transparent"}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot status={d.status} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: C.text }}>{d.name}</div>
                    <div className="text-[10.5px] truncate" style={{ color: C.textFaint }}>{d.state}</div>
                  </div>
                </div>
                <Pill status={d.status} t={t} />
              </button>
            ))}
          </div>
        </div>

        {/* Center: map */}
        <div className="rounded-xl border relative overflow-hidden" style={{ borderColor: C.panelBorder, background: C.panel }}>
          <svg viewBox="0 0 650 500" className="w-full h-full" style={{ minHeight: 480 }}>
            <defs>
              <pattern id="contour" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 30 Q15 10 30 30 T60 30" fill="none" stroke={C.ridge} strokeWidth="1" opacity="0.5" />
                <path d="M0 50 Q15 30 30 50 T60 50" fill="none" stroke={C.ridge} strokeWidth="1" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="650" height="500" fill="url(#contour)" />

            {/* routes */}
            {ROUTES.map((r, i) => {
              const a = byId(r.a), b = byId(r.b);
              const dash = r.status === "blocked" ? "2 6" : r.status === "restricted" ? "7 5" : "none";
              const isSelectedPath =
                routeResult?.primary?.stats?.edges.some((e) => (e.a === r.a && e.b === r.b) || (e.a === r.b && e.b === r.a));
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isSelectedPath ? C.accent : statusColor(r.status)}
                  strokeWidth={isSelectedPath ? 3.5 : 2}
                  strokeDasharray={dash === "none" ? undefined : dash}
                  opacity={isSelectedPath ? 1 : 0.75}
                />
              );
            })}

            {/* districts */}
            {DISTRICTS.map((d) => (
              <g key={d.id} onClick={() => setSelectedDistrict(d.id === selectedDistrict ? null : d.id)} style={{ cursor: "pointer" }}>
                <circle cx={d.x} cy={d.y} r={selectedDistrict === d.id ? 11 : 8} fill={C.panel2} stroke={statusColor(d.status)} strokeWidth="2.5" />
                <circle cx={d.x} cy={d.y} r="3" fill={statusColor(d.status)} />
                <text x={d.x} y={d.y - 15} textAnchor="middle" fontSize="11" fill={C.text} fontFamily="'Space Grotesk', sans-serif" fontWeight="600">
                  {d.name}
                </text>
              </g>
            ))}
          </svg>

          {hoveredOrSelected && (
            <div className="absolute bottom-3 left-3 right-3 rounded-lg border p-3 flex items-start justify-between gap-3" style={{ background: `${C.panel2}F2`, borderColor: C.panelBorder, backdropFilter: "blur(4px)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="ner-head text-sm font-semibold" style={{ color: C.text }}>{hoveredOrSelected.name}</h3>
                  <Pill status={hoveredOrSelected.status} t={t} />
                </div>
                <p className="text-[11px]" style={{ color: C.textMuted }}>{hoveredOrSelected.state} · Elevation {hoveredOrSelected.elevation}</p>
              </div>
              <button onClick={() => setSelectedDistrict(null)} style={{ color: C.textFaint }}><X size={15} /></button>
            </div>
          )}
        </div>

        {/* Right: tabs panel */}
        <div className="rounded-xl border flex flex-col" style={{ borderColor: C.panelBorder, background: C.panel, maxHeight: 560 }}>
          <div className="flex text-[11px] border-b" style={{ borderColor: C.panelBorder }}>
            {[
              ["alerts", t.alerts, AlertTriangle],
              ["tracking", t.tracking, Truck],
              ["routing", t.routing, RouteIcon],
              ["report", t.report, Camera],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
                style={{ color: tab === key ? C.accent : C.textFaint, borderBottom: tab === key ? `2px solid ${C.accent}` : "2px solid transparent" }}
              >
                <Icon size={14} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="p-3 overflow-y-auto ner-scroll flex-1">
            {/* Alerts */}
            {tab === "alerts" && (
              <div className="flex flex-col gap-2">
                {alerts.map((a) => (
                  <div key={a.id} className="rounded-lg border p-2.5" style={{ borderColor: C.panelBorder, background: C.panel2 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: statusColor(a.severity) }}>
                        {a.type === "Flood" ? <Waves size={12} /> : a.type === "Heavy rainfall" ? <CloudRain size={12} /> : <AlertTriangle size={12} />}
                        {a.type}
                      </span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: C.textFaint }}><Clock size={10} />{a.time}</span>
                    </div>
                    <p className="text-[12px] mb-1" style={{ color: C.text }}>{a.msg}</p>
                    <span className="text-[10.5px]" style={{ color: C.textMuted }}>{a.district}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tracking */}
            {tab === "tracking" && (
              <div className="flex flex-col gap-2">
                {vehicles.map((v) => (
                  <div key={v.id} className="rounded-lg border p-2.5" style={{ borderColor: C.panelBorder, background: C.panel2 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: C.text }}>
                        {cargoIcon(v.icon)} {v.id}
                      </span>
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{
                        color: v.status === "Delayed" ? C.blocked : v.status === "Delivered" ? C.open : C.accent,
                        background: v.status === "Delayed" ? `${C.blocked}1a` : v.status === "Delivered" ? `${C.open}1a` : `${C.accent}1a`,
                      }}>{v.status}</span>
                    </div>
                    <p className="text-[11px] mb-1.5" style={{ color: C.textMuted }}>{v.cargo}</p>
                    <div className="flex items-center gap-1.5 text-[10.5px] mb-1.5" style={{ color: C.textFaint }}>
                      <span>{byId(v.from).name}</span><ArrowRight size={10} /><span>{byId(v.to).name}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: C.ridge }}>
                      <div className="h-full rounded-full" style={{ width: `${v.progress}%`, background: v.status === "Delayed" ? C.blocked : C.accent, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Route planner */}
            {tab === "routing" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px]" style={{ color: C.textMuted }}>
                    {t.from}
                    <select className="ner-select mt-1 w-full text-[12px] rounded-md px-2 py-1.5 border" style={{ background: C.panel2, borderColor: C.panelBorder, color: C.text }}
                      value={origin} onChange={(e) => setOrigin(e.target.value)}>
                      {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px]" style={{ color: C.textMuted }}>
                    {t.to}
                    <select className="ner-select mt-1 w-full text-[12px] rounded-md px-2 py-1.5 border" style={{ background: C.panel2, borderColor: C.panelBorder, color: C.text }}
                      value={dest} onChange={(e) => setDest(e.target.value)}>
                      {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                </div>
                <button onClick={runRoutePrediction} className="flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md py-2"
                  style={{ background: C.accent, color: "#0E1A15" }}>
                  <Navigation size={13} /> {t.getRoute}
                </button>

                {routeResult && (
                  <div className="flex flex-col gap-2.5 mt-1">
                    {routeResult.primary ? (
                      <div className="rounded-lg border p-2.5" style={{ borderColor: `${C.accent}55`, background: `${C.accent}0f` }}>
                        <div className="text-[11px] font-semibold mb-1.5" style={{ color: C.accent }}>{t.primary}</div>
                        <div className="text-[11.5px] mb-1.5" style={{ color: C.text }}>
                          {routeResult.primary.path.map((id) => byId(id).name).join(" → ")}
                        </div>
                        <div className="flex items-center gap-3 text-[10.5px]" style={{ color: C.textMuted }}>
                          <span className="flex items-center gap-1"><Clock size={11} /> ~{Math.round(routeResult.primary.stats.time / 60)} hr</span>
                          {routeResult.primary.stats.hasRestricted && <span className="flex items-center gap-1" style={{ color: C.restricted }}><AlertTriangle size={11} /> weather risk</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border p-2.5 text-[11.5px]" style={{ borderColor: `${C.blocked}55`, background: `${C.blocked}12`, color: C.blocked }}>
                        No accessible route found — all corridors blocked.
                      </div>
                    )}
                    {routeResult.alternate && (
                      <div className="rounded-lg border p-2.5" style={{ borderColor: C.panelBorder, background: C.panel2 }}>
                        <div className="text-[11px] font-semibold mb-1.5" style={{ color: C.textMuted }}>{t.alternate}</div>
                        <div className="text-[11.5px] mb-1.5" style={{ color: C.text }}>
                          {routeResult.alternate.path.map((id) => byId(id).name).join(" → ")}
                        </div>
                        <div className="flex items-center gap-1 text-[10.5px]" style={{ color: C.textFaint }}>
                          <Clock size={11} /> ~{Math.round(routeResult.alternate.stats.time / 60)} hr
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Field report */}
            {tab === "report" && (
              <div className="flex flex-col gap-2.5">
                <label className="text-[11px]" style={{ color: C.textMuted }}>
                  {t.district}
                  <select className="ner-select mt-1 w-full text-[12px] rounded-md px-2 py-1.5 border" style={{ background: C.panel2, borderColor: C.panelBorder, color: C.text }}
                    value={reportDistrict} onChange={(e) => setReportDistrict(e.target.value)}>
                    {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="text-[11px]" style={{ color: C.textMuted }}>
                  {t.category}
                  <select className="ner-select mt-1 w-full text-[12px] rounded-md px-2 py-1.5 border" style={{ background: C.panel2, borderColor: C.panelBorder, color: C.text }}
                    value={reportCategory} onChange={(e) => setReportCategory(e.target.value)}>
                    {["Landslide", "Flood", "Road damage", "Bridge damage", "Traffic congestion", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-[11px]" style={{ color: C.textMuted }}>
                  {t.description}
                  <textarea rows={3} value={reportDesc} onChange={(e) => setReportDesc(e.target.value)}
                    className="mt-1 w-full text-[12px] rounded-md px-2 py-1.5 border resize-none"
                    style={{ background: C.panel2, borderColor: C.panelBorder, color: C.text }}
                    placeholder="What's happening on the ground?" />
                </label>
                <button onClick={() => setPhotoAttached((p) => !p)} className="flex items-center gap-1.5 text-[11.5px] rounded-md px-2.5 py-1.5 border self-start"
                  style={{ borderColor: photoAttached ? `${C.open}66` : C.panelBorder, color: photoAttached ? C.open : C.textMuted, background: photoAttached ? `${C.open}14` : "transparent" }}>
                  {photoAttached ? <CheckCircle2 size={13} /> : <Camera size={13} />} {photoAttached ? t.photoAdded : t.photo}
                </button>
                <button onClick={submitReport} className="flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md py-2 mt-1"
                  style={{ background: online ? C.accent : C.panel2, color: online ? "#0E1A15" : C.textMuted, border: online ? "none" : `1px solid ${C.panelBorder}` }}>
                  <RadioTower size={13} /> {online ? t.submit : t.queued}
                </button>
                {reportConfirmed && (
                  <div className="text-[11px] flex items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ color: C.open, background: `${C.open}14` }}>
                    <CheckCircle2 size={13} /> {t.submitted}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4 px-4 pb-4">
        {[
          [t.connected, stats.districts, MapPin, C.accent],
          [t.activeAlerts, stats.activeAlerts, AlertTriangle, C.restricted],
          [t.inTransit, stats.inTransit, Truck, C.open],
          [t.avgDelay, `${stats.avgDelay} min`, Clock, C.river],
        ].map(([label, value, Icon, color], i) => (
          <div key={i} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: C.panelBorder, background: C.panel }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a` }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div className="ner-head text-lg font-semibold leading-none" style={{ color: C.text }}>{value}</div>
              <div className="text-[10.5px] mt-1" style={{ color: C.textFaint }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
