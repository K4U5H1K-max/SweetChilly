import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

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
    title: 'Major Landslide at Sonapur Tunnel',
    corridorId: 'COR-04',
    corridorName: 'Shillong - Silchar (NH-6)',
    type: 'LANDSLIDE',
    severity: 'HIGH',
    status: 'VERIFIED',
    aiConfidence: 0.94,
    reportedBy: 'Officer D. Sangma (Field Post 4)',
    lat: 25.1147,
    lng: 92.3685,
    reportedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    description: 'Debris flow and boulder collapse completely obstructing both carriageways near east portal. Excavation underway.',
    estimatedClearanceHours: 6.5,
    alternateRoute: 'Via Haflong - Umrangso route (adds ~85 km)',
    imageUrl: null,
  },
  {
    id: 'INC-NER-002',
    title: 'Flash Flood & Siltation at Nagaon Bypass',
    corridorId: 'COR-03',
    corridorName: 'Guwahati - Dimapur (NH-27)',
    type: 'FLOOD',
    severity: 'MEDIUM',
    status: 'VERIFIED',
    aiConfidence: 0.89,
    reportedBy: 'Patrol Unit Alpha-7',
    lat: 26.3456,
    lng: 92.6841,
    reportedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    description: 'Brahmaputra tributary overflow causing 1.5 ft water overtopping on right lane. Single-lane slow transit allowed.',
    estimatedClearanceHours: 3.0,
    alternateRoute: 'Slow convoy escort in place',
    imageUrl: null,
  },
  {
    id: 'INC-NER-003',
    title: 'Jiribam Bridge Scour & Load Restriction',
    corridorId: 'COR-05',
    corridorName: 'Silchar - Imphal (NH-37)',
    type: 'INFRASTRUCTURE_FAILURE',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    aiConfidence: 0.96,
    reportedBy: 'Highway Engineer R. K. Singh',
    lat: 24.8021,
    lng: 93.1235,
    reportedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    description: 'Pillar scouring observed following continuous monsoon torrents. Vehicles over 5 Ton prohibited until structural reinforcement.',
    estimatedClearanceHours: 12.0,
    alternateRoute: 'Light vehicles only; heavy convoys held at Silchar depot',
    imageUrl: null,
  },
];

let alerts = [
  {
    id: 'ALT-NER-101',
    incidentId: 'INC-NER-001',
    headline: 'NH-6 BLOCKED: Sonapur Tunnel Inactive',
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
  },
  {
    id: 'VEH-NER-309',
    regNumber: 'MN-01-A-3319',
    name: 'Manipur Relief Lifeline 09',
    type: 'Medium Cargo Truck',
    capacity: '7 Ton',
    cargo: 'Baby Food, ORS & Hospital Supplies',
    status: 'IN_TRANSIT',
    speedKmH: 32,
    origin: 'Silchar',
    destination: 'Imphal',
    currentPos: { lat: 24.8100, lng: 92.9500 },
    assignedCorridor: 'NH-37',
    delayEstMinutes: 240,
    priority: 'EMERGENCY_CRITICAL',
  },
  {
    id: 'VEH-NER-412',
    regNumber: 'AR-02-B-6721',
    name: 'Arunachal Hydro Grid Express 12',
    type: 'Utility Technical Dispatch',
    capacity: '4 Ton',
    cargo: 'Substation Transformers & Repair Parts',
    status: 'IN_TRANSIT',
    speedKmH: 58,
    origin: 'Guwahati',
    destination: 'Itanagar',
    currentPos: { lat: 26.6500, lng: 92.8000 },
    assignedCorridor: 'NH-15',
    delayEstMinutes: 30,
    priority: 'MEDIUM',
  },
  {
    id: 'VEH-NER-505',
    regNumber: 'TR-01-T-1144',
    name: 'Tripura Fuel Logistics Tanker 05',
    type: 'Bulk Fuel Tanker',
    capacity: '15,000 Liters',
    cargo: 'Diesel Fuel for Generator Stations',
    status: 'STATIONARY',
    speedKmH: 0,
    origin: 'Silchar',
    destination: 'Agartala',
    currentPos: { lat: 24.8170, lng: 92.7960 },
    assignedCorridor: 'NH-8',
    delayEstMinutes: 0,
    priority: 'HIGH',
  },
];

const weather = [
  { corridorId: 'COR-01', location: 'Guwahati-Shillong', rainfallMm: 12.4, visibilityM: 4200, condition: 'Light Rain & Fog', landslideRisk: 'LOW' },
  { corridorId: 'COR-02', location: 'Guwahati-Itanagar', rainfallMm: 38.0, visibilityM: 2800, condition: 'Moderate Showers', landslideRisk: 'MODERATE' },
  { corridorId: 'COR-03', location: 'Guwahati-Dimapur', rainfallMm: 24.5, visibilityM: 3500, condition: 'Intermittent Rain', landslideRisk: 'LOW' },
  { corridorId: 'COR-04', location: 'Shillong-Silchar (Sonapur)', rainfallMm: 94.2, visibilityM: 800, condition: 'Heavy Downpour & Mist', landslideRisk: 'CRITICAL' },
  { corridorId: 'COR-05', location: 'Silchar-Imphal (Jiribam)', rainfallMm: 78.6, visibilityM: 1200, condition: 'Continuous Monsoon Torrent', landslideRisk: 'HIGH' },
  { corridorId: 'COR-06', location: 'Silchar-Aizawl', rainfallMm: 62.1, visibilityM: 1500, condition: 'Cloudburst & Slush', landslideRisk: 'HIGH' },
  { corridorId: 'COR-07', location: 'Silchar-Agartala', rainfallMm: 18.2, visibilityM: 5000, condition: 'Overcast', landslideRisk: 'LOW' },
  { corridorId: 'COR-08', location: 'Siliguri-Gangtok', rainfallMm: 55.4, visibilityM: 1800, condition: 'Valley Mist & Rain', landslideRisk: 'MODERATE' },
];

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NER Logistics Intelligence API',
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

// Standard Manual Incident POST Endpoint (Fallback)
app.post('/api/incidents', (req, res) => {
  const { title, corridorId, corridorName, type, severity, reportedBy, lat, lng, description, imageUrl } = req.body;

  if (!title || !lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'Title, latitude, and longitude are required.',
    });
  }

  const nextIncNum = incidents.reduce((max, inc) => {
    const match = String(inc.id).match(/INC-NER-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0) + 1;

  const newIncident = {
    id: `INC-NER-${String(nextIncNum).padStart(3, '0')}`,
    title,
    corridorId: corridorId || 'COR-UNASSIGNED',
    corridorName: corridorName || 'Regional Route',
    type: type || 'ROAD_BLOCKAGE',
    severity: severity || 'MEDIUM',
    status: 'VERIFIED',
    aiConfidence: 0.90,
    reportedBy: reportedBy || 'Field Officer',
    lat: Number(lat),
    lng: Number(lng),
    reportedAt: new Date().toISOString(),
    description: description || '',
    estimatedClearanceHours: 4.0,
    alternateRoute: null,
    imageUrl: imageUrl || null,
  };

  incidents.unshift(newIncident);

  res.status(201).json({
    success: true,
    message: 'Incident reported successfully',
    data: newIncident,
  });
});

// Alerts Endpoint
app.get('/api/alerts', (req, res) => {
  res.json({
    success: true,
    count: alerts.length,
    data: alerts,
  });
});

// Vehicles Endpoints
app.get('/api/vehicles', (req, res) => {
  res.json({
    success: true,
    count: vehicles.length,
    data: vehicles,
  });
});

app.post('/api/vehicles', (req, res) => {
  const {
    id,
    vehicleId,
    name,
    regNumber,
    type,
    capacity,
    cargo,
    origin,
    source,
    destination,
    status,
    currentPos,
    latitude,
    longitude,
    priority,
    driverName,
    driverPhone,
    speedKmH,
  } = req.body;

  const resolvedId = id || vehicleId || `VEH-NER-${String(vehicles.length + 101).padStart(3, '0')}`;
  const resolvedOrigin = origin || source;
  const resolvedDestination = destination;
  const resolvedType = type || 'Truck';

  if (!resolvedOrigin || !resolvedDestination) {
    return res.status(400).json({
      success: false,
      message: 'Source/Origin and Destination locations are required.',
    });
  }

  // Duplicate Check
  const existing = vehicles.find((v) => v.id.toLowerCase() === resolvedId.toLowerCase() || (regNumber && v.regNumber.toLowerCase() === regNumber.toLowerCase()));
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Vehicle with ID or Registration '${resolvedId}' already exists in active fleet registry.`,
    });
  }

  // Position Resolution
  let lat = 26.1445;
  let lng = 91.7362;
  if (currentPos && typeof currentPos.lat === 'number' && typeof currentPos.lng === 'number') {
    lat = currentPos.lat;
    lng = currentPos.lng;
  } else if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
    lat = Number(latitude);
    lng = Number(longitude);
  }

  // Status Normalization
  let normalizedStatus = 'IN_TRANSIT';
  if (status) {
    const s = String(status).toUpperCase().replace(/\s+/g, '_');
    if (['IN_TRANSIT', 'DELAYED', 'AT_DESTINATION', 'EMERGENCY', 'IDLE', 'STATIONARY'].includes(s)) {
      normalizedStatus = s;
    }
  }

  const newVehicle = {
    id: resolvedId,
    name: name || `NER ${resolvedType} (${resolvedOrigin} → ${resolvedDestination})`,
    regNumber: regNumber || `NER-${Math.floor(1000 + Math.random() * 9000)}`,
    type: resolvedType,
    capacity: capacity || '5 Ton',
    cargo: cargo || 'Relief Supplies',
    status: normalizedStatus,
    speedKmH: typeof speedKmH === 'number' ? speedKmH : (normalizedStatus === 'IN_TRANSIT' ? 45 : 0),
    origin: resolvedOrigin,
    destination: resolvedDestination,
    currentPos: { lat, lng },
    assignedCorridor: `${resolvedOrigin} - ${resolvedDestination}`,
    delayEstMinutes: normalizedStatus === 'DELAYED' ? 45 : 0,
    priority: priority || (normalizedStatus === 'EMERGENCY' ? 'EMERGENCY_CRITICAL' : 'HIGH'),
    driverName: driverName || 'Authorized Field Operator',
    driverPhone: driverPhone || '+91-98640-XXXXX',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  vehicles.unshift(newVehicle);

  console.log(`[NER Fleet] Vehicle added: ${newVehicle.id} (${newVehicle.type}, ${newVehicle.status})`);

  res.status(201).json({
    success: true,
    message: 'Vehicle registered successfully in logistics registry',
    data: newVehicle,
  });
});

// Update Vehicle Status, Coordinates, or Telemetry
app.put('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const vehicleIndex = vehicles.findIndex((v) => v.id.toLowerCase() === id.toLowerCase());

  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Vehicle with ID '${id}' not found in active fleet registry.`,
    });
  }

  const currentVehicle = vehicles[vehicleIndex];
  const {
    status,
    currentPos,
    latitude,
    longitude,
    speedKmH,
    delayEstMinutes,
    cargo,
    priority,
    destination,
    driverName,
  } = req.body;

  let updatedStatus = currentVehicle.status;
  if (status) {
    const s = String(status).toUpperCase().replace(/\s+/g, '_');
    if (['IN_TRANSIT', 'DELAYED', 'AT_DESTINATION', 'EMERGENCY', 'IDLE', 'STATIONARY'].includes(s)) {
      updatedStatus = s;
    }
  }

  let updatedPos = { ...currentVehicle.currentPos };
  if (currentPos && typeof currentPos.lat === 'number' && typeof currentPos.lng === 'number') {
    updatedPos = { lat: currentPos.lat, lng: currentPos.lng };
  } else if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
    updatedPos = { lat: Number(latitude), lng: Number(longitude) };
  }

  const updatedVehicle = {
    ...currentVehicle,
    status: updatedStatus,
    currentPos: updatedPos,
    speedKmH: typeof speedKmH === 'number' ? speedKmH : (updatedStatus === 'IN_TRANSIT' ? currentVehicle.speedKmH || 48 : 0),
    delayEstMinutes: typeof delayEstMinutes === 'number' ? delayEstMinutes : (updatedStatus === 'DELAYED' ? (currentVehicle.delayEstMinutes || 30) : 0),
    cargo: cargo !== undefined ? cargo : currentVehicle.cargo,
    priority: priority !== undefined ? priority : currentVehicle.priority,
    destination: destination !== undefined ? destination : currentVehicle.destination,
    driverName: driverName !== undefined ? driverName : currentVehicle.driverName,
    updatedAt: new Date().toISOString(),
  };

  vehicles[vehicleIndex] = updatedVehicle;

  console.log(`[NER Fleet] Vehicle updated: ${updatedVehicle.id} -> Status: ${updatedVehicle.status}, Pos: [${updatedPos.lat.toFixed(4)}, ${updatedPos.lng.toFixed(4)}]`);

  res.json({
    success: true,
    message: 'Vehicle telemetry updated successfully',
    data: updatedVehicle,
  });
});

app.delete('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const initialCount = vehicles.length;
  vehicles = vehicles.filter((v) => v.id.toLowerCase() !== id.toLowerCase());

  if (vehicles.length === initialCount) {
    return res.status(404).json({
      success: false,
      message: `Vehicle with ID '${id}' not found.`,
    });
  }

  res.json({
    success: true,
    message: `Vehicle '${id}' decommissioned from active fleet.`,
  });
});

// ==========================================
// AI-Powered Disruption-Aware Dynamic Route Planner
// ==========================================
const NER_HUB_LOCATIONS = {
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Shillong: { lat: 25.5788, lng: 91.8933 },
  Silchar: { lat: 24.8170, lng: 92.7960 },
  Imphal: { lat: 24.8170, lng: 93.9368 },
  Agartala: { lat: 23.8315, lng: 91.2868 },
  Aizawl: { lat: 23.7271, lng: 92.7176 },
  Kohima: { lat: 25.6751, lng: 94.1086 },
  Itanagar: { lat: 27.0844, lng: 93.6053 },
  Gangtok: { lat: 27.3389, lng: 88.6065 },
  Siliguri: { lat: 26.7271, lng: 88.3953 },
  Dimapur: { lat: 25.9090, lng: 93.7266 },
  Nagaon: { lat: 26.3456, lng: 92.6841 },
  Haflong: { lat: 25.1667, lng: 93.0167 },
  Jiribam: { lat: 24.8021, lng: 93.1235 },
  Sonapur: { lat: 25.1147, lng: 92.3685 },
  Jorhat: { lat: 26.7509, lng: 94.2037 },
  Dibrugarh: { lat: 27.4728, lng: 94.9120 },
};

app.post('/api/routes/plan', async (req, res) => {
  try {
    const {
      origin,
      destination,
      vehicleType = 'Heavy Cargo Truck',
      cargo = 'Relief Supplies',
      priority = 'HIGH',
      avoidDisruptions = true,
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required for route calculation.',
      });
    }

    const originCoords = NER_HUB_LOCATIONS[origin] || { lat: 26.1445, lng: 91.7362 };
    const destCoords = NER_HUB_LOCATIONS[destination] || { lat: 24.8170, lng: 92.7960 };

    const activeDisruptions = incidents
      .filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
      .map((i) => `${i.title} (${i.corridorName}, Severity: ${i.severity})`);

    const criticalWeather = weather
      .filter((w) => w.landslideRisk === 'CRITICAL' || w.landslideRisk === 'HIGH')
      .map((w) => `${w.location}: ${w.rainfallMm}mm rain, ${w.condition}`);

    const groqApiKey = process.env.GROQ_API_KEY;
    const routeModel = process.env.GROQ_ROUTE_MODEL || 'openai/gpt-oss-120b';

    let aiPlan = null;

    if (groqApiKey) {
      try {
        console.log(`[NER Route Planner] Requesting AI path optimization (${routeModel}) for ${origin} → ${destination}...`);

        const promptText = `You are the chief GIS routing and disaster-resilient logistics AI for the North Eastern Region (NER) of India.
Plan an optimal, disruption-aware freight convoy route from "${origin}" to "${destination}".
Vehicle Details: ${vehicleType} carrying ${cargo} (Priority: ${priority}).
Avoid Disruptions: ${avoidDisruptions ? 'YES - MUST BYPASS ALL ACTIVE LANDSLIDES & IMPASSABLE BRIDGES' : 'NO'}.

Current Real-Time Ground Disruption Telemetry:
- Active Landslides / Bottlenecks: ${activeDisruptions.length > 0 ? activeDisruptions.join('; ') : 'None Reported'}
- High Risk Monsoon Corridors: ${criticalWeather.length > 0 ? criticalWeather.join('; ') : 'Nominal'}
- Strategic Arterial Corridors in Region: NH-27 (Guwahati-Dimapur), NH-6 (Shillong-Silchar via Sonapur), NH-37 (Silchar-Imphal via Jiribam), NH-15 (North Bank Assam-Itanagar), NH-8 (Silchar-Agartala), NH-10 (Siliguri-Gangtok), Haflong-Umrangso Bypass.

Calculate an optimal route plan and respond ONLY with a JSON object in this exact schema (no markdown formatting, valid JSON only):
{
  "recommendedCorridor": "string (e.g. NH-27 Nagaon -> Haflong Pass Bypass -> Silchar)",
  "status": "OPTIMAL_CALCULATED",
  "distanceKm": number,
  "estimatedDurationHours": number,
  "delayAvoidedMinutes": number,
  "avoidedIncidents": ["string"],
  "activeHazardsOnPath": ["string"],
  "terrainAdvisory": "string",
  "summary": "string",
  "waypoints": [
    { "name": "${origin}", "lat": ${originCoords.lat}, "lng": ${originCoords.lng}, "type": "ORIGIN", "note": "Convoy Departure Hub" },
    { "name": "Intermediate Transit Hub", "lat": number, "lng": number, "type": "DETOUR"|"TRANSIT", "note": "string" },
    { "name": "${destination}", "lat": ${destCoords.lat}, "lng": ${destCoords.lng}, "type": "DESTINATION", "note": "Delivery Destination" }
  ]
}`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: routeModel,
            messages: [
              {
                role: 'system',
                content: 'You are an expert GIS logistics route planning engine for North East India. Return strict JSON.',
              },
              { role: 'user', content: promptText },
            ],
            temperature: 0.2,
            max_tokens: 500,
            response_format: { type: 'json_object' },
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            aiPlan = JSON.parse(content);
          }
        } else {
          console.warn('[NER Route Planner] Groq API returned status:', groqRes.status);
        }
      } catch (err) {
        console.warn('[NER Route Planner] Groq inference fallback activated:', err.message);
      }
    }

    // Topographical Algorithmic Fallback & Route Synthesizer
    const isSonapurAvoided = avoidDisruptions && (origin === 'Guwahati' || origin === 'Shillong') && (destination === 'Silchar' || destination === 'Imphal' || destination === 'Agartala' || destination === 'Aizawl');
    const isJiribamAvoided = avoidDisruptions && destination === 'Imphal';

    const defaultWaypoints = [
      { name: `${origin} Departure Hub`, lat: originCoords.lat, lng: originCoords.lng, type: 'ORIGIN', note: 'Start of transit route' },
    ];

    if (isSonapurAvoided) {
      defaultWaypoints.push({ name: 'Nagaon Transit Junction (NH-27)', lat: 26.3456, lng: 92.6841, type: 'TRANSIT', note: 'Diverting north of Meghalaya plateau' });
      defaultWaypoints.push({ name: 'Haflong High-Pass Detour', lat: 25.1667, lng: 93.0167, type: 'DETOUR', note: 'Bypassing blocked Sonapur Tunnel' });
      if (destination !== 'Silchar') {
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
