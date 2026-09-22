import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { voiceService } from './voice/voiceService.js';
import { validateFlagRequest, validateTriggerRequest, validateAndNormalizePhone, maskPhone } from './voice/securityGuardrails.js';
import { processStatusWebhook } from './voice/webhookHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Multer for in-memory file uploads (max 8MB image size)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, JPEG, PNG, WEBP) are supported.'), false);
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Reference NER Hub Locations for Geodetic Tagging
const NER_HUBS = [
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933 },
  { name: 'Silchar', state: 'Assam', lat: 24.8170, lng: 92.7960 },
  { name: 'Dimapur', state: 'Nagaland', lat: 25.9068, lng: 93.7273 },
  { name: 'Imphal', state: 'Manipur', lat: 24.8170, lng: 93.9368 },
  { name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053 },
  { name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176 },
  { name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868 },
  { name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065 },
  { name: 'Kohima', state: 'Nagaland', lat: 25.6751, lng: 94.1086 },
  { name: 'Tezpur', state: 'Assam', lat: 26.6338, lng: 92.7926 },
  { name: 'Jorhat', state: 'Assam', lat: 26.7509, lng: 94.2037 },
];

function getNearestHub(lat, lng) {
  let nearest = NER_HUBS[0];
  let minDistance = Infinity;

  for (const hub of NER_HUBS) {
    const d = Math.sqrt(Math.pow(hub.lat - lat, 2) + Math.pow(hub.lng - lng, 2));
    if (d < minDistance) {
      minDistance = d;
      nearest = hub;
    }
  }
  return `${nearest.name} (${nearest.state})`;
}

// In-Memory Seeded Store for Demo State
let incidents = [
  {
    id: 'INC-NER-001',
    title: 'Severe Landslide at Sonapur Tunnel (NH-6)',
    location: 'East Jaintia Hills, Meghalaya',
    corridorId: 'COR-001-NH6',
    corridorName: 'NH-6 (Guwahati - Shillong - Silchar Corridor)',
    type: 'LANDSLIDE',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    aiConfidence: 0.98,
    classification: 'High-Volume Mudslide & Boulder Obstruction',
    damageAssessment: '150 meters roadway buried under 3.5m mud and rock debris. Concrete barrier breached.',
    damage_assessment: '150 meters roadway buried under 3.5m mud and rock debris. Concrete barrier breached.',
    operationalImpact: 'Total blockage of NH-6 artery connecting Barak Valley, Mizoram and Tripura.',
    reasoning: 'Visible structural displacement, heavy mud accumulation across both carriageways, compromised hillside slope.',
    evidence: 'Visible structural displacement, heavy mud accumulation across both carriageways, compromised hillside slope.',
    recommendedAction: 'Immediate rerouting of all high-priority convoys via Haflong (NH-27 / NH-627). Dispatch NDRF clearing unit.',
    recommended_action: 'Immediate rerouting of all high-priority convoys via Haflong (NH-27 / NH-627). Dispatch NDRF clearing unit.',
    recommendedResponse: 'Immediate rerouting of all high-priority convoys via Haflong (NH-27 / NH-627). Dispatch NDRF clearing unit.',
    reportedBy: 'Field Officer (NDRF Unit 03)',
    lat: 25.1147,
    lng: 92.3685,
    reportedAt: '2026-09-21T06:30:00Z',
    description: 'Major hillside slope failure following 72h continuous monsoon downpour. Heavy mud and boulders blocking both lanes.',
    estimatedClearanceHours: 6.5,
    alternateRoute: 'Guwahati -> Nagaon (NH-27) -> Haflong Bypass (NH-627) -> Silchar',
    imageUrl: null,
  },
  {
    id: 'INC-NER-002',
    title: 'Flash Flood Inundation at Raha (NH-27)',
    location: 'Nagaon, Assam',
    corridorId: 'COR-002-NH27',
    corridorName: 'NH-27 (Guwahati - Nagaon - Dimapur East-West Corridor)',
    type: 'FLOOD',
    severity: 'HIGH',
    status: 'VERIFIED',
    aiConfidence: 0.94,
    classification: 'River Waterlogging / Shallow Inundation',
    damageAssessment: '45cm standing water over 800m highway stretch. Low-clearance LCVs stalled.',
    damage_assessment: '45cm standing water over 800m highway stretch. Low-clearance LCVs stalled.',
    operationalImpact: '30-45 min transit delay. Single-lane slow passage operational with police escort.',
    reasoning: 'Kopili River embankment overflow detected on western shoulder.',
    evidence: 'Kopili River embankment overflow detected on western shoulder.',
    recommendedAction: 'Limit traffic to heavy freight trucks (>10T) and emergency relief ambulances.',
    recommended_action: 'Limit traffic to heavy freight trucks (>10T) and emergency relief ambulances.',
    recommendedResponse: 'Limit traffic to heavy freight trucks (>10T) and emergency relief ambulances.',
    reportedBy: 'Assam Highway Patrol #12',
    lat: 26.2234,
    lng: 92.5218,
    reportedAt: '2026-09-21T08:15:00Z',
    description: 'Kopili River embankment overflow causing 45cm sheet flooding over carriageway.',
    estimatedClearanceHours: 3.0,
    alternateRoute: 'Nagaon Rural Bypass -> Doboka Junction',
    imageUrl: null,
  },
  {
    id: 'INC-NER-003',
    title: 'Structural Subsidence at Barak Bridge (NH-37)',
    location: 'Jiribam Border, Manipur',
    corridorId: 'COR-003-NH37',
    corridorName: 'NH-37 (Silchar - Jiribam - Imphal Lifeline)',
    type: 'BRIDGE_DAMAGE',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    aiConfidence: 0.96,
    classification: 'Bridge Pier Scour & Expansion Joint Shear',
    damageAssessment: 'Pier 2 footing exposed by swollen river current. Transverse crack along deck slab.',
    damage_assessment: 'Pier 2 footing exposed by swollen river current. Transverse crack along deck slab.',
    operationalImpact: 'Vehicles >5 Tons prohibited. Essential medical cargo transshipment required.',
    reasoning: 'High-speed flood velocity eroding abutment foundation.',
    evidence: 'High-speed flood velocity eroding abutment foundation.',
    recommendedAction: 'Engage BRO engineering team for Bailey bridge stabilization. Divert heavy trucks.',
    recommended_action: 'Engage BRO engineering team for Bailey bridge stabilization. Divert heavy trucks.',
    recommendedResponse: 'Engage BRO engineering team for Bailey bridge stabilization. Divert heavy trucks.',
    reportedBy: 'Manipur PWD Field Engineer',
    lat: 24.8012,
    lng: 93.1234,
    reportedAt: '2026-09-21T09:00:00Z',
    description: 'Severe erosion around central pier footing following flash flood in Barak tributary.',
    estimatedClearanceHours: 12.0,
    alternateRoute: 'Restricted transshipment via light motor vehicles only',
    imageUrl: null,
  },
];

let alerts = [
  {
    id: 'ALT-NER-101',
    incidentId: 'INC-NER-001',
    headline: 'CRITICAL: NH-6 Sonapur Tunnel Blocked by Landslide',
    district: 'West Jaintia Hills / Cachar',
    level: 'CRITICAL',
    impact: 'Barak Valley, Tripura, Mizoram isolated from direct Shillong road lifeline.',
    advisory: 'Reroute all high-priority medical & food convoys via Haflong corridor.',
    activeSince: '4 hours ago',
  },
  {
    id: 'ALT-NER-102',
    incidentId: 'INC-NER-002',
    headline: 'NH-27 DELAY: Waterlogging near Nagaon',
    district: 'Nagaon / Kamrup East',
    level: 'WARNING',
    impact: '30-45 min delay on Guwahati-Dimapur supply route.',
    advisory: 'Maintain minimum 50m vehicle spacing in flood plain section.',
    activeSince: '2 hours ago',
  },
  {
    id: 'ALT-NER-103',
    incidentId: 'INC-NER-003',
    headline: 'NH-37 RESTRICTION: Jiribam Bridge <5T Only',
    district: 'Imphal West / Cachar Border',
    level: 'CRITICAL',
    impact: 'Heavy freight to Imphal Valley suspended.',
    advisory: 'Transship essential cargo into light commercial vehicles (LCVs).',
    activeSince: '1 hour ago',
  },
];

let vehicles = [
  {
    id: 'VEH-NER-101',
    regNumber: 'AS-01-GC-4482',
    name: 'Assam Pharma-Logistics MedTruck 01',
    type: 'Refrigerated Medical Van',
    capacity: '3.5 Ton',
    cargo: 'Vaccines, Blood Plasma & Insulin',
    status: 'IN_TRANSIT',
    speedKmH: 48,
    origin: 'Guwahati',
    destination: 'Silchar',
    currentPos: { lat: 25.4200, lng: 92.1500 },
    assignedCorridor: 'NH-6',
    delayEstMinutes: 180,
    priority: 'EMERGENCY_CRITICAL',
    driverName: 'B. Kalita',
    driverPhone: '+91-98640-12345',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-204',
    regNumber: 'ML-05-E-9012',
    name: 'Meghalaya Essential Food Supply 04',
    type: 'Heavy Cargo Truck',
    capacity: '12 Ton',
    cargo: 'Rice & Fortified Grains',
    status: 'IN_TRANSIT',
    speedKmH: 54,
    origin: 'Guwahati',
    destination: 'Shillong',
    currentPos: { lat: 25.8500, lng: 91.8100 },
    assignedCorridor: 'GS Road / NH-27',
    delayEstMinutes: 0,
    priority: 'HIGH',
    driverName: 'S. Marak',
    driverPhone: '+91-94361-23456',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-309',
    regNumber: 'TR-01-B-3319',
    name: 'Tripura POL Tanker Convoy #09',
    type: 'POL Petroleum Tanker (18KL)',
    capacity: '18 KL',
    cargo: 'High-Speed Diesel (HSD) & Petrol',
    status: 'IN_TRANSIT',
    speedKmH: 38,
    origin: 'Guwahati',
    destination: 'Agartala',
    currentPos: { lat: 24.9500, lng: 92.4000 },
    assignedCorridor: 'NH-6 / NH-8',
    delayEstMinutes: 240,
    priority: 'HIGH',
    driverName: 'R. Debbarma',
    driverPhone: '+91-98620-34567',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-412',
    regNumber: 'MN-01-AA-7821',
    name: 'Manipur Valley Oxygen & Medical LCV',
    type: 'Cryogenic Liquid Oxygen Tanker',
    capacity: '4.0 Ton',
    cargo: 'Liquid Medical Oxygen (LMO)',
    status: 'REROUTED',
    speedKmH: 42,
    origin: 'Silchar',
    destination: 'Imphal',
    currentPos: { lat: 24.8100, lng: 92.9500 },
    assignedCorridor: 'NH-37 (Via Jiribam Transshipment)',
    delayEstMinutes: 90,
    priority: 'EMERGENCY_CRITICAL',
    driverName: 'N. Singh',
    driverPhone: '+91-98561-45678',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-515',
    regNumber: 'NL-07-C-5541',
    name: 'Nagaland Disaster Relief Express',
    type: 'Container Freight Truck',
    capacity: '10 Ton',
    cargo: 'Dry Rations, Tarpaulins & Water Purification Kits',
    status: 'IN_TRANSIT',
    speedKmH: 60,
    origin: 'Guwahati',
    destination: 'Kohima',
    currentPos: { lat: 26.3100, lng: 93.4200 },
    assignedCorridor: 'NH-27 / NH-29',
    delayEstMinutes: 30,
    priority: 'HIGH',
    driverName: 'K. Angami',
    driverPhone: '+91-94360-56789',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-602',
    regNumber: 'MZ-01-A-1120',
    name: 'Mizoram High-Altitude LCV Convoy',
    type: 'Medium Duty Truck (4x4)',
    capacity: '6 Ton',
    cargo: 'Baby Food & Pharmaceutical Supplies',
    status: 'IDLE_STAGING',
    speedKmH: 0,
    origin: 'Silchar',
    destination: 'Aizawl',
    currentPos: { lat: 24.8170, lng: 92.7960 },
    assignedCorridor: 'NH-306 / NH-54',
    delayEstMinutes: 0,
    priority: 'HIGH',
    driverName: 'L. Sailo',
    driverPhone: '+91-98625-67890',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-708',
    regNumber: 'AR-01-D-8890',
    name: 'Arunachal Strategic Border Supply #08',
    type: 'Heavy 6x6 All-Terrain Hauler',
    capacity: '15 Ton',
    cargo: 'Heavy Engineering Spares & Bridge Panels',
    status: 'IN_TRANSIT',
    speedKmH: 35,
    origin: 'Tezpur',
    destination: 'Itanagar',
    currentPos: { lat: 26.8500, lng: 93.2500 },
    assignedCorridor: 'NH-15 / NH-415',
    delayEstMinutes: 0,
    priority: 'HIGH',
    driverName: 'T. Riba',
    driverPhone: '+91-94362-78901',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-819',
    regNumber: 'SK-01-J-2244',
    name: 'Sikkim Hill Corridor Express',
    type: 'Multi-Axle Mountain Truck',
    capacity: '8 Ton',
    cargo: 'Emergency Hospital Oxygen Cylinders',
    status: 'IN_TRANSIT',
    speedKmH: 40,
    origin: 'Siliguri',
    destination: 'Gangtok',
    currentPos: { lat: 27.0500, lng: 88.4700 },
    assignedCorridor: 'NH-10 (Sevoke-Rongpo Corridor)',
    delayEstMinutes: 45,
    priority: 'HIGH',
    driverName: 'D. Bhutia',
    driverPhone: '+91-97330-89012',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
];

const weather = [
  { district: 'East Jaintia Hills', state: 'Meghalaya', condition: 'Torrential Rain & Monsoon Downpour', rainfallMm: 165, alertLevel: 'RED', windKmH: 45 },
  { district: 'Cachar', state: 'Assam', condition: 'Heavy Rain & Thunderstorms', rainfallMm: 98, alertLevel: 'AMBER', windKmH: 32 },
  { district: 'Nagaon', state: 'Assam', condition: 'Moderate Continuous Rain', rainfallMm: 62, alertLevel: 'YELLOW', windKmH: 24 },
  { district: 'Kamrup Metropolitan', state: 'Assam', condition: 'Overcast & Intermittent Showers', rainfallMm: 35, alertLevel: 'GREEN', windKmH: 18 },
  { district: 'Kohima', state: 'Nagaland', condition: 'Dense Mountain Fog & Mist', rainfallMm: 45, alertLevel: 'YELLOW', windKmH: 15 },
  { district: 'Jiribam', state: 'Manipur', condition: 'Flash Flood Watch & Heavy Rain', rainfallMm: 120, alertLevel: 'RED', windKmH: 38 },
  { district: 'Aizawl', state: 'Mizoram', condition: 'Heavy Showers & Pavement Mud', rainfallMm: 85, alertLevel: 'AMBER', windKmH: 28 },
  { district: 'Papum Pare', state: 'Arunachal Pradesh', condition: 'Scattered High-Altitude Showers', rainfallMm: 40, alertLevel: 'GREEN', windKmH: 20 },
];

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'Project Brahmaputra - Strategic NER Logistics Intelligence Engine',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development',
    groqConfigured: !!process.env.GROQ_API_KEY,
  });
});

// Incidents Endpoints
app.get('/api/incidents', (req, res) => {
  res.json({
    success: true,
    count: incidents.length,
    data: incidents,
  });
});

// ==========================================
// AI Vision Incident Verification Endpoint
// ==========================================
app.post('/api/incidents/verify', upload.single('image'), async (req, res) => {
  try {
    const { incidentType, severity, latitude, longitude, description, reportedBy, corridorName } = req.body;

    // Validation
    if (!incidentType) {
      return res.status(400).json({ success: false, message: 'Incident type is required.' });
    }
    if (!latitude || !longitude || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({ success: false, message: 'Valid GPS latitude and longitude coordinates are required.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Incident evidence photograph is required for AI verification.' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({
        success: false,
        message: 'GROQ_API_KEY is not configured on the backend server. Please configure GROQ_API_KEY in .env.',
      });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    const nearestHub = getNearestHub(latNum, lngNum);
    const visionModel = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';

    // Base64 encode the uploaded image buffer
    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const promptText = `You are an expert GIS and emergency disaster management verification AI for the North Eastern Region (NER) of India.
A field officer has submitted an incident report claiming:
- Claimed Incident Type: ${incidentType}
- Claimed Severity: ${severity || 'HIGH'}
- Location Coordinates: ${latNum.toFixed(4)}°N, ${lngNum.toFixed(4)}°E (Near ${nearestHub})
- Field Officer Description: ${description || 'Visual evidence submitted from field unit.'}

Carefully inspect the uploaded evidence photo.
Evaluate whether the image genuinely depicts the claimed incident (e.g. Landslide, Flash Flood, Roadblock, Bridge Damage, Road Damage, Rockfall, Mudslide, Erosion) or if it shows a normal unaffected roadway, clear traffic, or an unrelated subject.

Respond ONLY with a JSON object in this exact schema (no surrounding markdown text, just valid JSON):
{
  "verified": boolean,
  "confidence": number,
  "classification": string,
  "damage_assessment": string,
  "reasoning": string,
  "recommended_action": string
}`;

    console.log(`[NER AI Verification] Submitting evidence to Groq (${visionModel}) for ${incidentType} near ${nearestHub}...`);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(35000),
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 350,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('[NER AI Verification] Groq API Error:', groqResponse.status, errorText);
      return res.status(502).json({
        success: false,
        message: `Groq AI Vision inference failed (HTTP ${groqResponse.status}).`,
        error: errorText,
      });
    }

    const groqResult = await groqResponse.json();
    const content = groqResult.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        success: false,
        message: 'Groq AI returned an empty response.',
      });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseErr) {
      console.warn('[NER AI Verification] Failed direct JSON parse, attempting cleanup:', parseErr);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Unable to parse AI verification JSON output.');
      }
    }

    const isVerified = Boolean(parsedResult.verified);
    const confidence = typeof parsedResult.confidence === 'number' ? parsedResult.confidence : 0.85;
    const classification = parsedResult.classification || incidentType;
    const damageAssessment = parsedResult.damage_assessment || 'Physical disruption evaluated by AI vision system.';
    const reasoning = parsedResult.reasoning || 'Visual evidence analyzed by multimodal attention model.';
    const recommendedAction = parsedResult.recommended_action || 'Dispatch local emergency response unit.';

    console.log(`[NER AI Verification] Result: Verified=${isVerified}, Conf=${(confidence * 100).toFixed(1)}%, Class=${classification}`);

    // If genuinely verified, create incident and alert in application state
    if (isVerified && confidence >= 0.65) {
      const nextIncNum = incidents.reduce((max, inc) => {
        const match = String(inc.id).match(/INC-NER-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0) + 1;
      const nextAltNum = alerts.reduce((max, alt) => {
        const match = String(alt.id).match(/ALT-NER-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 100) + 1;

      const newIncident = {
        id: `INC-NER-${String(nextIncNum).padStart(3, '0')}`,
        title: `${classification} near ${nearestHub}`,
        location: nearestHub,
        corridorId: 'COR-FIELD-ALERT',
        corridorName: corridorName || `Corridor near ${nearestHub} (${latNum.toFixed(2)}°N, ${lngNum.toFixed(2)}°E)`,
        type: classification.toUpperCase().replace(/\s+/g, '_'),
        severity: (severity || 'HIGH').toUpperCase(),
        status: 'VERIFIED',
        aiConfidence: confidence,
        classification: classification,
        damageAssessment: damageAssessment,
        damage_assessment: damageAssessment,
        operationalImpact: damageAssessment,
        reasoning: reasoning,
        evidence: reasoning,
        recommendedAction: recommendedAction,
        recommended_action: recommendedAction,
        recommendedResponse: recommendedAction,
        reportedBy: reportedBy || 'Field Officer (Mobile GIS)',
        lat: latNum,
        lng: lngNum,
        reportedAt: new Date().toISOString(),
        description: description || damageAssessment,
        estimatedClearanceHours: severity === 'CRITICAL' ? 8.0 : severity === 'HIGH' ? 5.0 : 3.0,
        alternateRoute: recommendedAction,
        imageUrl: dataUrl,
      };

      const newAlert = {
        id: `ALT-NER-${String(nextAltNum).padStart(3, '0')}`,
        incidentId: newIncident.id,
        headline: `${newIncident.severity} ALERT: ${newIncident.title}`,
        district: nearestHub,
        level: newIncident.severity === 'CRITICAL' ? 'CRITICAL' : newIncident.severity === 'HIGH' ? 'WARNING' : 'CAUTION',
        impact: damageAssessment,
        advisory: recommendedAction,
        activeSince: 'Just now',
      };

      incidents.unshift(newIncident);
      alerts.unshift(newAlert);

      const responsePayload = {
        success: true,
        verified: true,
        confidence: confidence,
        classification: classification,
        damage_assessment: damageAssessment,
        damageAssessment: damageAssessment,
        operationalImpact: damageAssessment,
        reasoning: reasoning,
        evidence: reasoning,
        recommended_action: recommendedAction,
        recommendedAction: recommendedAction,
        recommendedResponse: recommendedAction,
        incident: newIncident,
        alert: newAlert,
      };

      return res.status(201).json({
        ...responsePayload,
        data: responsePayload,
      });
    } else {
      // Rejection / Inconclusive
      const responsePayload = {
        success: true,
        verified: false,
        confidence: confidence,
        classification: classification,
        damage_assessment: damageAssessment,
        damageAssessment: damageAssessment,
        operationalImpact: damageAssessment,
        reasoning: reasoning,
        evidence: reasoning,
        recommended_action: recommendedAction,
        recommendedAction: recommendedAction,
        recommendedResponse: recommendedAction,
        message: 'AI verification rejected or deemed inconclusive. Incident was not approved as a verified alert.',
      };

      return res.status(200).json({
        ...responsePayload,
        data: responsePayload,
      });
    }
  } catch (err) {
    console.error('[NER AI Verification] Server Exception:', err);
    return res.status(500).json({
      success: false,
      message: err.name === 'TimeoutError'
        ? 'AI Vision inference timed out after 35s. Please retry with a smaller photo or check connection.'
        : (err.message || 'Internal server error during AI verification processing.'),
    });
  }
});

// Manual Incident Creation Fallback
app.post('/api/incidents', (req, res) => {
  const { title, location, district, severity, lat, lng, type, description, affectedCorridor } = req.body;
  const newInc = {
    id: `INC-NER-${Date.now().toString(36).toUpperCase()}`,
    title: title || 'Reported Hazard',
    location: location || 'NER Corridor',
    district: district || 'Unknown',
    severity: severity || 'MEDIUM',
    lat: parseFloat(lat) || 26.1445,
    lng: parseFloat(lng) || 91.7362,
    type: type || 'OBSTRUCTION',
    description: description || '',
    affectedCorridor: affectedCorridor || 'General Transit Arterial',
    verified: false,
    reportedAt: new Date().toISOString(),
  };
  incidents.unshift(newInc);
  res.status(201).json({ success: true, data: newInc });
});

// Alerts Endpoint
app.get('/api/alerts', (req, res) => {
  res.json({
    success: true,
    count: alerts.length,
    data: alerts,
  });
});

// ==========================================
// Vehicle Fleet Management Endpoints
// ==========================================
app.get('/api/vehicles', (req, res) => {
  res.json({
    success: true,
    count: vehicles.length,
    data: vehicles,
  });
});

app.post('/api/vehicles', (req, res) => {
  const v = req.body;

  let driverPhone = v.driverPhone || '+91-98765-43210';
  if (v.driverPhone) {
    const phoneVal = validateAndNormalizePhone(v.driverPhone);
    if (!phoneVal.valid) {
      return res.status(400).json({ success: false, message: phoneVal.error });
    }
    driverPhone = phoneVal.phone;
  }

  const newVeh = {
    id: v.id || `VEH-NER-${Date.now().toString(36).toUpperCase()}`,
    regNumber: v.regNumber || 'AS-01-XX-0000',
    name: v.name || 'NER Freight Unit',
    type: v.type || 'Standard Cargo Truck',
    capacity: v.capacity || '5 Ton',
    cargo: v.cargo || 'General Freight',
    status: v.status || 'IN_TRANSIT',
    speedKmH: Number(v.speedKmH) || 45,
    origin: v.origin || 'Guwahati',
    destination: v.destination || 'Silchar',
    currentPos: v.currentPos || { lat: 26.1445, lng: 91.7362 },
    assignedCorridor: v.assignedCorridor || 'NH-27',
    delayEstMinutes: Number(v.delayEstMinutes) || 0,
    priority: v.priority || 'MEDIUM',
    driverName: v.driverName || 'Driver',
    driverPhone: driverPhone,
    isFlagged: Boolean(v.isFlagged),
    flagReason: v.flagReason || null,
    safetyStatus: v.safetyStatus || 'NOT_CHECKED',
    lastSafetyCheck: v.lastSafetyCheck || null,
    activeCallId: v.activeCallId || null,
  };
  vehicles.push(newVeh);
  console.log(`[Fleet Management] New vehicle ${newVeh.id} registered (Driver: ${newVeh.driverName}, Phone: ${maskPhone(newVeh.driverPhone)})`);
  res.status(201).json({ success: true, data: newVeh });
});

app.put('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const idx = vehicles.findIndex((v) => v.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: `Vehicle ${id} not found.` });
  }

  const updates = { ...req.body };
  if (updates.driverPhone !== undefined) {
    const phoneVal = validateAndNormalizePhone(updates.driverPhone);
    if (!phoneVal.valid) {
      return res.status(400).json({ success: false, message: phoneVal.error });
    }
    updates.driverPhone = phoneVal.phone;
  }

  vehicles[idx] = {
    ...vehicles[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  console.log(`[Fleet Management] Vehicle ${id} updated (Driver: ${vehicles[idx].driverName}, Phone: ${maskPhone(vehicles[idx].driverPhone)})`);
  res.json({ success: true, data: vehicles[idx] });
});

app.delete('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const idx = vehicles.findIndex((v) => v.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: `Vehicle ${id} not found.` });
  }
  const deleted = vehicles.splice(idx, 1)[0];
  res.json({ success: true, data: deleted });
});

// ==========================================
// Track 4: Driver Safety & Voice Endpoints
// ==========================================

// Initialize Voice Service with Fleet Store Accessor & Escalation Hook
voiceService.init(() => vehicles);

voiceService.registerEscalationHook(({ session, vehicle, outcome, summary }) => {
  const nextAltNum = alerts.reduce((max, alt) => {
    const match = String(alt.id).match(/ALT-NER-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 100) + 1;

  const regStr = vehicle?.regNumber || vehicle?.id || 'Fleet Unit';
  const corridorStr = vehicle?.assignedCorridor || 'Transit Arterial';
  const newAlert = {
    id: `ALT-NER-${String(nextAltNum).padStart(3, '0')}`,
    incidentId: session?.callId || vehicle?.id || 'TRACK4-VOICE',
    headline: `VOICE SAFETY ESCALATION: ${outcome.replace(/_/g, ' ')} (${regStr})`,
    district: corridorStr,
    level: outcome === 'ASSISTANCE_REQUIRED' || outcome === 'BREAKDOWN' ? 'CRITICAL' : 'WARNING',
    impact: summary || `Safety check evaluated with outcome ${outcome}. Operator intervention required.`,
    advisory: `Driver safety alert on corridor ${corridorStr}. Verify driver condition and review session ${session?.callId}.`,
    activeSince: 'Just now',
  };
  alerts.unshift(newAlert);
  console.log(`[Alert Registry] Operational escalation alert registered: ${newAlert.id} for session ${session?.callId}`);
});

// Voice Service Configuration Info (Safe for frontend consumption)
app.get('/api/voice/config', (req, res) => {
  const providerName = process.env.VOICE_PROVIDER || 'mock';
  const liveCallsEnabled = process.env.SARVAM_LIVE_CALLS_ENABLED === 'true';
  const enforceAllowlist = process.env.ENFORCE_SARVAM_CALL_ALLOWLIST !== 'false';

  res.json({
    success: true,
    data: {
      provider: providerName,
      isLiveSarvam: providerName === 'sarvam',
      liveCallsEnabled,
      enforceAllowlist,
    },
  });
});

// Flag / Unflag Vehicle for Safety Check
app.post('/api/voice/flag-vehicle', (req, res) => {
  const validation = validateFlagRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { vehicleId, reason, flagged = true } = req.body;
  const result = voiceService.flagVehicle(vehicles, vehicleId, reason, flagged);
  if (!result.success) {
    return res.status(404).json({ success: false, message: result.error });
  }

  res.json({
    success: true,
    message: flagged ? `Vehicle ${vehicleId} flagged for safety check.` : `Vehicle ${vehicleId} safety flag removed.`,
    data: result.vehicle,
  });
});

// Trigger a Mock Voice Safety Check Call
app.post('/api/voice/calls/trigger', async (req, res) => {
  const validation = validateTriggerRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { vehicleId, triggerSource = 'MANUAL_OPERATOR', flagReason, simulatedOutcome, customResponse } = req.body;
  const result = await voiceService.triggerSafetyCall(vehicles, {
    vehicleId,
    triggerSource,
    flagReason,
    simulatedOutcome,
    customResponse,
  });

  if (!result.success) {
    const statusCode = result.cooldown ? 429 : 400;
    return res.status(statusCode).json({ success: false, message: result.error, cooldownRemainingMs: result.cooldownRemainingMs });
  }

  res.status(201).json({
    success: true,
    message: `Safety call session initiated for vehicle ${vehicleId}.`,
    data: {
      session: result.session,
      vehicle: result.vehicle,
    },
  });
});

// List All Safety Call Sessions
app.get('/api/voice/calls', (req, res) => {
  const { vehicleId } = req.query;
  const sessions = voiceService.getSessions(vehicleId);
  res.json({
    success: true,
    count: sessions.length,
    data: sessions,
  });
});

// Get Single Call Session by ID
app.get('/api/voice/calls/:callId', (req, res) => {
  const { callId } = req.params;
  const session = voiceService.getSessionById(callId);
  if (!session) {
    return res.status(404).json({ success: false, message: `Safety call session ${callId} not found.` });
  }

  res.json({
    success: true,
    data: session,
  });
});

// Resolve Operator Escalation for a Call Session
app.post('/api/voice/calls/:callId/resolve', (req, res) => {
  const { callId } = req.params;
  const { notes = 'Escalation resolved by operator.' } = req.body;
  const result = voiceService.resolveEscalation(vehicles, callId, notes);

  if (!result.success) {
    return res.status(404).json({ success: false, message: result.error });
  }

  res.json({
    success: true,
    message: `Escalation for session ${callId} resolved.`,
    data: result.session,
  });
});

// Direct Simulation Helper Endpoint (Dev/Test)
app.post('/api/voice/simulate-call', async (req, res) => {
  const { vehicleId, simulatedOutcome = 'BREAKDOWN', flagReason = 'Test simulated safety audit' } = req.body;
  if (!vehicleId) {
    return res.status(400).json({ success: false, message: 'vehicleId is required.' });
  }

  const result = await voiceService.triggerSafetyCall(vehicles, {
    vehicleId,
    triggerSource: 'DEV_SIMULATION',
    flagReason,
    simulatedOutcome,
  });

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.error });
  }

  res.json({
    success: true,
    message: `Simulation executed with outcome ${simulatedOutcome}.`,
    data: {
      session: result.session,
      vehicle: result.vehicle,
    },
  });
});

// Telephony Provider Webhook Status Callback
app.post('/api/voice/webhooks/status', async (req, res) => {
  try {
    const result = await processStatusWebhook({
      headers: req.headers,
      body: req.body,
      query: req.query,
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[Voice Webhook] Status Handler Error:', err);
    return res.status(500).json({ success: false, error: 'Internal webhook processing error.' });
  }
});

// Telephony Provider Inbound Speech Turn Webhook
app.post('/api/voice/webhooks/speech', async (req, res) => {
  try {
    const { callId, speechText, detectedLanguage = 'en' } = req.body || {};
    if (!callId || !speechText) {
      return res.status(400).json({ success: false, error: 'callId and speechText are required.' });
    }
    const session = voiceService.getSessionById(callId);
    if (!session) {
      return res.status(404).json({ success: false, error: `Call session '${callId}' not found.` });
    }
    return res.json({
      success: true,
      message: 'Inbound speech recognized.',
      callId,
      detectedLanguage,
    });
  } catch (err) {
    console.error('[Voice Webhook] Speech Handler Error:', err);
    return res.status(500).json({ success: false, error: 'Internal webhook speech processing error.' });
  }
});

// ==========================================
// Route Planning & Disruption Intelligence
// ==========================================
const NER_HUB_LOCATIONS = {
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Shillong: { lat: 25.5788, lng: 91.8933 },
  Silchar: { lat: 24.8170, lng: 92.7960 },
  Dimapur: { lat: 25.9068, lng: 93.7273 },
  Imphal: { lat: 24.8170, lng: 93.9368 },
  Itanagar: { lat: 27.0844, lng: 93.6053 },
  Aizawl: { lat: 23.7271, lng: 92.7176 },
  Agartala: { lat: 23.8315, lng: 91.2868 },
  Gangtok: { lat: 27.3389, lng: 88.6065 },
  Kohima: { lat: 25.6751, lng: 94.1086 },
  Tezpur: { lat: 26.6338, lng: 92.7926 },
  Jorhat: { lat: 26.7509, lng: 94.2037 },
};

app.post('/api/routes/plan', async (req, res) => {
  try {
    const {
      origin = 'Guwahati',
      destination = 'Silchar',
      vehicleType = 'Heavy Truck (10-Wheeler)',
      cargo = 'Relief Supplies & Medicines',
      priority = 'HIGH',
      avoidDisruptions = true,
    } = req.body;

    const originCoords = NER_HUB_LOCATIONS[origin] || NER_HUB_LOCATIONS['Guwahati'];
    const destCoords = NER_HUB_LOCATIONS[destination] || NER_HUB_LOCATIONS['Silchar'];

    const isSonapurAvoided = (origin === 'Guwahati' && destination === 'Silchar') ||
      (origin === 'Shillong' && destination === 'Silchar') ||
      (origin === 'Guwahati' && destination === 'Agartala');

    const activeCriticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
    const criticalWeather = weather.filter((w) => w.alertLevel === 'RED' || w.alertLevel === 'AMBER').map((w) => `${w.district} (${w.condition})`);

    let aiPlan = null;
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (groqKey && groqKey !== 'mock-groq-api-key') {
      try {
        const groqPrompt = `You are the NER Disruption-Aware Tactical Route AI for the Brahmaputra Strategic Logistics Corridor.
Plan the optimal route from ${origin} to ${destination} for a ${vehicleType} carrying ${cargo} with priority ${priority}.
Active Corridor Incidents: ${JSON.stringify(activeCriticalIncidents.map(i => ({ title: i.title, loc: i.location, sev: i.severity })))}
Critical Weather: ${criticalWeather.join(', ') || 'Normal'}
Avoid Disruptions: ${avoidDisruptions}

Respond STRICTLY in JSON:
{
  "recommendedCorridor": "string route description with highways e.g. NH-27 -> Haflong -> Silchar",
  "distanceKm": 340,
  "estimatedDurationHours": 6.5,
  "delayAvoidedMinutes": 240,
  "avoidedIncidents": ["list of avoided incident titles"],
  "activeHazardsOnPath": ["advisories"],
  "terrainAdvisory": "string advisory",
  "summary": "string tactical summary",
  "status": "OPTIMAL_CALCULATED",
  "waypoints": [
    {"name": "${origin} Hub", "lat": ${originCoords.lat}, "lng": ${originCoords.lng}, "type": "ORIGIN", "note": "Departure terminal"},
    {"name": "${destination} Terminal", "lat": ${destCoords.lat}, "lng": ${destCoords.lng}, "type": "DESTINATION", "note": "Delivery point"}
  ]
}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: groqPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (groqRes.ok) {
          const parsed = await groqRes.json();
          const raw = parsed.choices?.[0]?.message?.content;
          if (raw) aiPlan = JSON.parse(raw);
        }
      } catch (err) {
        console.warn('[NER Route Planner] Groq dynamic planning fallback to local heuristics:', err.message);
      }
    }

    const defaultWaypoints = [
      { name: `${origin} Central Hub`, lat: originCoords.lat, lng: originCoords.lng, type: 'ORIGIN', note: 'Primary dispatch point' },
    ];

    if (isSonapurAvoided && avoidDisruptions) {
      if (origin === 'Guwahati' && destination === 'Silchar') {
        defaultWaypoints.push({ name: 'Nagaon Bypass Junction (NH-27)', lat: 26.3450, lng: 92.6840, type: 'TRANSIT', note: 'Detour entry avoiding NH-6 Sonapur bottleneck' });
        defaultWaypoints.push({ name: 'Haflong Mountain Highway Staging (NH-627)', lat: 25.1667, lng: 93.0167, type: 'TRANSIT', note: 'Safe terrain corridor' });
        defaultWaypoints.push({ name: 'Silchar Distribution Depot', lat: 24.8170, lng: 92.7960, type: 'TRANSIT', note: 'Barak Valley cross-docking junction' });
      }
    } else if (origin !== destination) {
      // Midpoint interpolation
      const midLat = (originCoords.lat + destCoords.lat) / 2;
      const midLng = (originCoords.lng + destCoords.lng) / 2;
      defaultWaypoints.push({ name: 'Mid-Corridor Staging Waypoint', lat: Number(midLat.toFixed(4)), lng: Number(midLng.toFixed(4)), type: 'TRANSIT', note: 'Monitored highway checkpoint' });
    }

    defaultWaypoints.push({ name: `${destination} Terminal Depot`, lat: destCoords.lat, lng: destCoords.lng, type: 'DESTINATION', note: 'Cargo delivery terminal' });

    const generatedRoute = {
      routeId: `RTE-NER-${Date.now().toString(36).toUpperCase()}`,
      origin,
      destination,
      vehicleType,
      cargo,
      priority,
      avoidDisruptions,
      status: aiPlan?.status || 'OPTIMAL_CALCULATED',
      recommendedCorridor: aiPlan?.recommendedCorridor || (isSonapurAvoided ? `${origin} → Nagaon (NH-27) → Haflong Bypass → ${destination}` : `${origin} → ${destination} Direct Arterial`),
      distanceKm: typeof aiPlan?.distanceKm === 'number' ? aiPlan.distanceKm : (isSonapurAvoided ? 342 : 245),
      estimatedDurationHours: typeof aiPlan?.estimatedDurationHours === 'number' ? aiPlan.estimatedDurationHours : (isSonapurAvoided ? 6.8 : 5.2),
      delayAvoidedMinutes: typeof aiPlan?.delayAvoidedMinutes === 'number' ? aiPlan.delayAvoidedMinutes : (isSonapurAvoided ? 240 : 0),
      avoidedIncidents: aiPlan?.avoidedIncidents || (isSonapurAvoided ? ['Major Landslide at Sonapur Tunnel (NH-6 Blocked)'] : []),
      activeHazardsOnPath: aiPlan?.activeHazardsOnPath || (criticalWeather.length > 0 ? [criticalWeather[0]] : ['Monsoon Wet Pavement Risk']),
      terrainAdvisory: aiPlan?.terrainAdvisory || (isSonapurAvoided ? 'NH-6 direct link blocked. Haflong mountain pass detour clear with single-lane police escort.' : 'Corridor operational. Maintain minimum 40m safe following distance.'),
      summary: aiPlan?.summary || (isSonapurAvoided ? 'Disruption-aware alternative corridor generated. Sonapur active bottleneck bypassed.' : 'Optimal corridor path calculated across arterial highway network.'),
      waypoints: (aiPlan?.waypoints && aiPlan.waypoints.length >= 2) ? aiPlan.waypoints : defaultWaypoints,
      disruptedSegment: isSonapurAvoided ? {
        name: 'NH-6 Sonapur Inactive Tunnel Zone',
        coordinates: [
          [25.5788, 91.8933],
          [25.1147, 92.3685],
          [24.8170, 92.7960],
        ],
        reason: 'CRITICAL Landslide Blockage (6.5h Clearance Est.)',
      } : null,
      generatedAt: new Date().toISOString(),
    };

    console.log(`[NER Route Planner] Generated route ${generatedRoute.routeId}: ${generatedRoute.recommendedCorridor} (${generatedRoute.distanceKm} km, ~${generatedRoute.estimatedDurationHours}h)`);

    res.json({
      success: true,
      message: 'Optimal disruption-aware route plan calculated',
      data: generatedRoute,
    });
  } catch (err) {
    console.error('[NER Route Planner] Server Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during route planning.',
    });
  }
});

// KPIs Endpoint
app.get('/api/kpis', (req, res) => {
  const inTransitCount = vehicles.filter((v) => {
    const s = String(v.status || '').toUpperCase().replace(/\s+/g, '_');
    return s === 'IN_TRANSIT';
  }).length;

  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const accessibility = Math.max(55, Math.round(84 - (criticalCount * 3.5)));

  res.json({
    success: true,
    data: {
      districtAccessibility: `${accessibility}.4%`,
      districtsMonitored: 16,
      activeAlerts: alerts.length,
      vehiclesInTransit: inTransitCount,
      averageCorridorDelay: `${Math.round(25 + (criticalCount * 8.5))} mins`,
      totalCorridorsTracked: 8,
      criticalBottlenecks: criticalCount,
    },
  });
});

// Weather Endpoint
app.get('/api/weather', (req, res) => {
  res.json({
    success: true,
    count: weather.length,
    data: weather,
  });
});

// ==========================================
// Production Static Frontend & SPA Fallback
// ==========================================
app.use(express.static(distPath));

app.use((req, res) => {
  // Never intercept unhandled API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `API endpoint '${req.path}' not found.` });
  }

  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>NER Logistics Intelligence</title></head>
          <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
            <h2>NER Smart Logistics Intelligence Backend Online</h2>
            <p>API service is operational. Health check: <a href="/api/health" style="color: #38bdf8;">/api/health</a></p>
            <p>To serve the full frontend, run <code>npm run build</code> first.</p>
          </body>
        </html>
      `);
    }
  });
});

// Start Server bound to 0.0.0.0 for Render / cloud environments
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[NER Backend] Service online and listening on http://${HOST}:${PORT}`);
  console.log(`[NER Backend] Health check: http://${HOST}:${PORT}/api/health`);
});
