import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { voiceService } from './voice/voiceService.js';
import { validateFlagRequest, validateTriggerRequest, validateAndNormalizePhone, maskPhone } from './voice/securityGuardrails.js';
import { processStatusWebhook } from './voice/webhookHandler.js';
import { getPool, isDatabaseConfigured, testConnection, initializeDatabase, vehicleRepository, deploymentRepository, userRepository } from './db/index.js';
import { resolveLocationCoordinates, NER_HUB_LOCATIONS } from './db/schema.js';
import { validateAndNormalizeEmail, validatePassword, hashPassword, verifyPassword, generateToken, toSafeUser, getJwtSecret } from './auth/authUtils.js';
import { authenticateUser, requireRole, optionalAuth } from './auth/authMiddleware.js';

// Link repositories for backward-compatibility active deployment and safe owner projections
vehicleRepository.setDeploymentRepository(deploymentRepository);
vehicleRepository.setUserRepository(userRepository);
deploymentRepository.setVehicleRepository(vehicleRepository);

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

// =========================================================================
// TEMPORARY SYNCHRONOUS TRACK 4 COMPATIBILITY CACHE
//
// Authoritative Model:
// - PostgreSQL is the AUTHORITATIVE persistent vehicle source whenever DATABASE_URL is set.
// - `vehicles[]` is a temporary synchronous compatibility cache for Track 4 voiceService.
// - Normal CRUD operations refresh this cache from vehicleRepository.
// - Track 4 direct object mutations temporarily exist in memory until Phase 3A.3
//   migrates those mutations to repository/database writes.
// - Phase 3A.3 will remove/directly replace this synchronous mutation dependency.
// =========================================================================
let vehicles = [];

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

// ==========================================
// Authentication & Identity Endpoints
// ==========================================

/**
 * Public User Registration
 * Strictly creates 'USER' role accounts. Client attempts to pass 'ADMIN' are rejected/forced to 'USER'.
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    const emailVal = validateAndNormalizeEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({ success: false, message: emailVal.error });
    }

    const passVal = validatePassword(password);
    if (!passVal.valid) {
      return res.status(400).json({ success: false, message: passVal.error });
    }

    const existing = await userRepository.getUserByEmail(emailVal.email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    // Privilege Escalation Prevention: Force role to USER
    const newUser = await userRepository.createUser({
      fullName: fullName.trim(),
      email: emailVal.email,
      passwordHash,
      role: 'USER',
      isActive: true,
    });

    const token = generateToken(newUser);
    const safeUser = toSafeUser(newUser);

    console.log(`[Auth API] New user registered: ${safeUser.id} (${safeUser.email})`);
    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[Auth API] Registration error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to complete registration.' });
  }
});

/**
 * User / Admin Login
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const emailVal = validateAndNormalizeEmail(email);
    if (!emailVal.valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = await userRepository.getUserByEmail(emailVal.email);
    if (!user) {
      // Generic invalid credentials response to prevent account enumeration
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact administrator.' });
    }

    const token = generateToken(user);
    const safeUser = toSafeUser(user);

    console.log(`[Auth API] Authentication successful: ${safeUser.id} (${safeUser.role})`);
    res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[Auth API] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Internal authentication failure.' });
  }
});

/**
 * Authenticated User Profile
 */
app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * Logout
 */
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// Incidents Endpoints
app.get('/api/incidents', optionalAuth, async (req, res) => {
  try {
    let filtered = [...incidents];
    if (req.user && req.user.role === 'USER') {
      // Collect vehicle IDs owned by this user
      let userVehicleIds = new Set();
      try {
        const userVehicles = await vehicleRepository.getAllVehicles({ ownerUserId: req.user.id });
        userVehicleIds = new Set(userVehicles.map((v) => String(v.id).toLowerCase()));
      } catch (e) {
        // Continue with empty set if lookup fails
      }

      filtered = incidents.filter((inc) => {
        // 1. Public / regional operational warnings and verified incidents
        const isVerified = inc.status === 'VERIFIED' || inc.verified === true;
        if (isVerified) return true;

        // 2. Incidents reported by this authenticated user
        if (inc.reporterId && inc.reporterId === req.user.id) return true;

        // 3. Incidents associated with this user's vehicles/deployments
        if (inc.vehicleId && userVehicleIds.has(String(inc.vehicleId).toLowerCase())) return true;

        // Never leak unverified private reports from other users
        return false;
      });
    } else if (!req.user) {
      // Unauthenticated / public callers only receive verified regional alerts
      filtered = incidents.filter((inc) => inc.status === 'VERIFIED' || inc.verified === true);
    }
    // ADMIN role receives all operational incidents

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    console.error('[Incidents API] Error retrieving incidents:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve incidents.' });
  }
});

app.get('/api/incidents/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const inc = incidents.find((i) => i.id.toLowerCase() === String(id).toLowerCase());
    if (!inc) {
      return res.status(404).json({ success: false, message: `Incident '${id}' not found.` });
    }

    if (req.user && req.user.role === 'USER') {
      const isVerified = inc.status === 'VERIFIED' || inc.verified === true;
      let isOwnVehicle = false;
      if (inc.vehicleId) {
        try {
          const veh = await vehicleRepository.getVehicleById(inc.vehicleId);
          isOwnVehicle = veh && veh.ownerUserId === req.user.id;
        } catch (e) {}
      }
      const isOwner = inc.reporterId && inc.reporterId === req.user.id;
      if (!isVerified && !isOwner && !isOwnVehicle) {
        return res.status(404).json({ success: false, message: `Incident '${id}' not found.` });
      }
    } else if (!req.user) {
      const isVerified = inc.status === 'VERIFIED' || inc.verified === true;
      if (!isVerified) {
        return res.status(404).json({ success: false, message: `Incident '${id}' not found.` });
      }
    }

    res.json({ success: true, data: inc });
  } catch (err) {
    console.error('[Incidents API] Error retrieving incident:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve incident.' });
  }
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

// Incident Creation Endpoint
app.post('/api/incidents', optionalAuth, (req, res) => {
  const { title, location, district, severity, lat, lng, type, incidentType, description, affectedCorridor, vehicleId } = req.body;
  const reporterName = req.user ? req.user.fullName : (req.body.reportedBy || 'NER Logistics Operator');
  const reporterId = req.user ? req.user.id : null;
  const reporterRole = req.user ? req.user.role : 'PUBLIC';

  let finalLat = null;
  let finalLng = null;

  if (lat !== undefined && lat !== null && !isNaN(Number(lat)) && lng !== undefined && lng !== null && !isNaN(Number(lng))) {
    finalLat = parseFloat(lat);
    finalLng = parseFloat(lng);
  } else if (location || district) {
    const resolved = resolveLocationCoordinates(location || district);
    if (resolved) {
      finalLat = resolved.lat;
      finalLng = resolved.lng;
    }
  }

  const newInc = {
    id: `INC-NER-${Date.now().toString(36).toUpperCase()}`,
    title: title || 'Reported Corridor Hazard',
    location: location || 'NER Corridor',
    district: district || 'Unknown District',
    severity: severity || 'MEDIUM',
    lat: finalLat,
    lng: finalLng,
    type: incidentType || type || 'OBSTRUCTION',
    description: description || '',
    affectedCorridor: affectedCorridor || 'General Transit Arterial',
    verified: false,
    vehicleId: vehicleId || null,
    reportedBy: reporterName,
    reporterId,
    reporterRole,
    reportedAt: new Date().toISOString(),
  };
  incidents.unshift(newInc);
  console.log(`[Incident Reporting] New incident ${newInc.id} recorded by ${reporterName} (${reporterRole}): ${newInc.title}`);
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
app.get('/api/vehicles', optionalAuth, async (req, res) => {
  try {
    const isUser = req.user && req.user.role === 'USER';
    const list = isUser
      ? await vehicleRepository.getAllVehicles({ ownerUserId: req.user.id })
      : await vehicleRepository.getAllVehicles();

    const projectedList = await Promise.all(
      list.map(async (v) => {
        const projected = await vehicleRepository.projectActiveDeployment(v);
        if (req.user && req.user.role === 'ADMIN') {
          return await vehicleRepository.attachSafeOwner(projected);
        }
        return projected;
      })
    );
    vehicles = projectedList;
    res.json({
      success: true,
      count: projectedList.length,
      data: projectedList,
    });
  } catch (err) {
    console.error('[Vehicle API] Error retrieving vehicles:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicle fleet.' });
  }
});

app.get('/api/vehicles/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await vehicleRepository.getVehicleById(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    // USER role may only access own vehicles; unauthorized returns 404 to avoid enumeration
    if (req.user && req.user.role === 'USER' && vehicle.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    let projected = await vehicleRepository.projectActiveDeployment(vehicle);
    if (req.user && req.user.role === 'ADMIN') {
      projected = await vehicleRepository.attachSafeOwner(projected);
    }

    res.json({ success: true, data: projected });
  } catch (err) {
    console.error('[Vehicle API] Error retrieving vehicle:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicle.' });
  }
});

app.post('/api/vehicles', authenticateUser, async (req, res) => {
  try {
    const v = req.body || {};
    const isUser = req.user.role === 'USER';

    // 1. Validation: Vehicle / Fleet Identifier
    const vehicleName = (v.name || v.vehicleName || v.fleetName || '').trim();
    if (!vehicleName) {
      return res.status(400).json({ success: false, message: 'Please provide a vehicle or fleet identifier.' });
    }

    // 2. Validation: License Plate / Registration
    const rawReg = (v.licensePlate || v.regNumber || v.registration || v.registrationNumber || '').trim();
    if (!rawReg) {
      return res.status(400).json({ success: false, message: 'Please provide a valid registration / license plate.' });
    }

    // 3. Validation: Driver Name
    const driverName = (v.driverName || '').trim();
    if (!driverName) {
      return res.status(400).json({ success: false, message: 'Please enter the primary assigned driver name.' });
    }

    // 4. Validation: Driver Contact Phone
    if (!v.driverPhone || typeof v.driverPhone !== 'string' || !v.driverPhone.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a driver contact phone number.' });
    }
    const phoneVal = validateAndNormalizePhone(v.driverPhone);
    if (!phoneVal.valid) {
      return res.status(400).json({ success: false, message: phoneVal.error });
    }
    const driverPhone = phoneVal.phone;

    // 5. Validation: Payload Capacity
    if (v.cargoCapacityKg !== undefined && v.cargoCapacityKg !== null) {
      const capNum = Number(v.cargoCapacityKg);
      if (isNaN(capNum) || capNum <= 0 || capNum > 100000) {
        return res.status(400).json({ success: false, message: 'Enter a valid payload capacity.' });
      }
    } else if (v.capacity !== undefined && v.capacity !== null) {
      const capNum = parseFloat(String(v.capacity).trim());
      if (isNaN(capNum) || capNum <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid payload capacity.' });
      }
    }

    // 6. Server-Controlled Ownership:
    // USER accounts are strictly assigned req.user.id as owner (client payloads ignored)
    // ADMIN accounts default to null (admin-managed) unless specified
    const ownerUserId = isUser ? req.user.id : (v.ownerUserId || null);

    const newVeh = await vehicleRepository.createVehicle({
      ...v,
      name: vehicleName,
      regNumber: rawReg.toUpperCase(),
      licensePlate: rawReg.toUpperCase(),
      driverName,
      driverPhone,
      ownerUserId,
    });

    const projected = await vehicleRepository.projectActiveDeployment(newVeh);
    vehicles = await vehicleRepository.getAllVehicles();
    console.log(`[Fleet Management] New vehicle ${newVeh.id} registered (Owner: ${newVeh.ownerUserId || 'ADMIN-MANAGED'}, Driver: ${newVeh.driverName}, Phone: ${maskPhone(newVeh.driverPhone)})`);
    return res.status(201).json({ success: true, data: projected });
  } catch (err) {
    if (err.code === '23505' || err.status === 409 || (err.message && err.message.toLowerCase().includes('already exists'))) {
      return res.status(409).json({ success: false, message: 'A vehicle with this registration number already exists.' });
    }
    if (err.status === 400 || err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('[Vehicle API] Error registering vehicle:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to register vehicle right now. Please try again.' });
  }
});

app.put('/api/vehicles/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await vehicleRepository.getVehicleById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    // If USER role, verify ownership (IDOR guard)
    if (req.user.role === 'USER' && existing.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    const updates = { ...req.body };
    // Strip client attempts to alter ownership or vehicle ID
    delete updates.id;
    delete updates.ownerUserId;
    delete updates.owner_user_id;

    if (updates.driverPhone !== undefined) {
      const phoneVal = validateAndNormalizePhone(updates.driverPhone);
      if (!phoneVal.valid) {
        return res.status(400).json({ success: false, message: phoneVal.error });
      }
      updates.driverPhone = phoneVal.phone;
    }

    const updated = await vehicleRepository.updateVehicle(id, updates);
    const projected = await vehicleRepository.projectActiveDeployment(updated);
    vehicles = await vehicleRepository.getAllVehicles();

    console.log(`[Fleet Management] Vehicle ${id} updated (Driver: ${updated.driverName}, Phone: ${maskPhone(updated.driverPhone)})`);
    res.json({ success: true, data: projected });
  } catch (err) {
    console.error('[Vehicle API] Error updating vehicle:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update vehicle.' });
  }
});

app.delete('/api/vehicles/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await vehicleRepository.getVehicleById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    // If USER role, verify ownership (IDOR guard)
    if (req.user.role === 'USER' && existing.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }

    // Safety guard 1: reject deletion while an active safety call is in progress
    if (existing.safetyStatus === 'PENDING_CALL') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vehicle ${id} while an active safety call is in progress.`,
      });
    }

    // Safety guard 2: reject deletion while an active deployment is in progress
    const activeDeployment = await deploymentRepository.getActiveDeploymentByVehicleId(id);
    if (activeDeployment) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vehicle ${id} while an active deployment (${activeDeployment.id}) is in progress. Complete or cancel deployment first.`,
      });
    }

    // Safety guard 3: restrict deletion if historical deployments exist (preserving relational integrity)
    const historicalDeployments = await deploymentRepository.getDeploymentsByVehicleId(id);
    if (historicalDeployments && historicalDeployments.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vehicle ${id} because ${historicalDeployments.length} historical deployment record(s) exist. Deletion is restricted to preserve audit history.`,
      });
    }

    const deleted = await vehicleRepository.deleteVehicle(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
    }
    vehicles = await vehicleRepository.getAllVehicles();
    res.json({ success: true, data: deleted });
  } catch (err) {
    console.error('[Vehicle API] Error deleting vehicle:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete vehicle.' });
  }
});

// ==========================================
// Vehicle Deployment / Trip Management Endpoints
// ==========================================

app.get('/api/deployments', optionalAuth, async (req, res) => {
  try {
    const { status, vehicleId } = req.query;
    const isUser = req.user && req.user.role === 'USER';
    const filters = { status, vehicleId };
    if (isUser) {
      filters.ownerUserId = req.user.id;
    }

    const list = await deploymentRepository.getAllDeployments(filters);
    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error('[Deployment API] Error retrieving deployments:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve deployments.' });
  }
});

app.get('/api/deployments/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = await deploymentRepository.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
    }

    // Scoped retrieval for USER: check underlying vehicle ownership
    if (req.user && req.user.role === 'USER') {
      const vehicle = await vehicleRepository.getVehicleById(deployment.vehicleId);
      if (!vehicle || vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
    }

    res.json({ success: true, data: deployment });
  } catch (err) {
    console.error('[Deployment API] Error retrieving deployment:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve deployment.' });
  }
});

app.get('/api/vehicles/:vehicleId/deployments', optionalAuth, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { status } = req.query;

    const vehicle = await vehicleRepository.getVehicleById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `Vehicle '${vehicleId}' not found.` });
    }

    // Scoped retrieval for USER: check vehicle ownership
    if (req.user && req.user.role === 'USER' && vehicle.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: `Vehicle '${vehicleId}' not found.` });
    }

    const list = await deploymentRepository.getDeploymentsByVehicleId(vehicleId, { status });
    res.json({
      success: true,
      vehicleId,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error('[Deployment API] Error retrieving vehicle deployments:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicle deployments.' });
  }
});

app.post('/api/deployments', authenticateUser, async (req, res) => {
  try {
    const { vehicleId, origin, destination, assignedCorridor, cargo, priority, status } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId is required.' });
    }
    if (!origin || !destination) {
      return res.status(400).json({ success: false, message: 'origin and destination are required.' });
    }

    const vehicle = await vehicleRepository.getVehicleById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `Vehicle '${vehicleId}' not found in registry.` });
    }

    // USER role must own the vehicle to deploy it
    if (req.user.role === 'USER' && vehicle.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: `Vehicle '${vehicleId}' not found in registry.` });
    }

    // Check if vehicle already has an active deployment
    const activeDep = await deploymentRepository.getActiveDeploymentByVehicleId(vehicleId);
    if (activeDep) {
      return res.status(409).json({
        success: false,
        message: `Vehicle '${vehicleId}' already has an active deployment (${activeDep.id} - ${activeDep.origin} → ${activeDep.destination}). Complete or cancel it before deploying again.`,
      });
    }

    const newDep = await deploymentRepository.createDeployment({
      vehicleId,
      origin: String(origin).trim(),
      destination: String(destination).trim(),
      assignedCorridor: assignedCorridor || `${origin} - ${destination}`,
      cargo: cargo || vehicle.cargo || 'General Relief Cargo',
      priority: priority || vehicle.priority || 'MEDIUM',
      originLat: req.body.originLat,
      originLng: req.body.originLng,
      destinationLat: req.body.destinationLat,
      destinationLng: req.body.destinationLng,
      status: status || 'ACTIVE',
    });

    console.log(`[Deployment Management] New deployment ${newDep.id} created for vehicle ${vehicleId} (${origin} → ${destination})`);
    res.status(201).json({ success: true, data: newDep });
  } catch (err) {
    console.error('[Deployment API] Error creating deployment:', err.message);
    const isConflict = err.message && err.message.includes('already has an active deployment');
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: err.message || 'Failed to create deployment.',
    });
  }
});

app.post('/api/deployments/:id/start', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = await deploymentRepository.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
    }

    // USER ownership check
    if (req.user.role === 'USER') {
      const vehicle = await vehicleRepository.getVehicleById(deployment.vehicleId);
      if (!vehicle || vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
    }

    const started = await deploymentRepository.startDeployment(id);
    console.log(`[Deployment Management] Deployment ${id} started for vehicle ${started.vehicleId}`);
    res.json({ success: true, data: started });
  } catch (err) {
    console.error('[Deployment API] Error starting deployment:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/deployments/:id/complete', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = await deploymentRepository.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
    }

    // USER ownership check
    if (req.user.role === 'USER') {
      const vehicle = await vehicleRepository.getVehicleById(deployment.vehicleId);
      if (!vehicle || vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
    }

    const completed = await deploymentRepository.completeDeployment(id);
    console.log(`[Deployment Management] Deployment ${id} completed for vehicle ${completed.vehicleId}`);
    res.json({ success: true, data: completed });
  } catch (err) {
    console.error('[Deployment API] Error completing deployment:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/deployments/:id/cancel', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = await deploymentRepository.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
    }

    // USER ownership check
    if (req.user.role === 'USER') {
      const vehicle = await vehicleRepository.getVehicleById(deployment.vehicleId);
      if (!vehicle || vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
    }

    const cancelled = await deploymentRepository.cancelDeployment(id);
    console.log(`[Deployment Management] Deployment ${id} cancelled for vehicle ${cancelled.vehicleId}`);
    res.json({ success: true, data: cancelled });
  } catch (err) {
    console.error('[Deployment API] Error cancelling deployment:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
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
app.post('/api/voice/flag-vehicle', authenticateUser, requireRole('ADMIN'), async (req, res) => {
  const validation = validateFlagRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { vehicleId, reason, flagged = true } = req.body;
  const result = await voiceService.flagVehicle(vehicles, vehicleId, reason, flagged);
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
app.post('/api/voice/calls/trigger', authenticateUser, requireRole('ADMIN'), async (req, res) => {
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
app.post('/api/voice/calls/:callId/resolve', authenticateUser, requireRole('ADMIN'), async (req, res) => {
  const { callId } = req.params;
  const { notes = 'Escalation resolved by operator.' } = req.body;
  const result = await voiceService.resolveEscalation(vehicles, callId, notes);

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
app.post('/api/voice/simulate-call', authenticateUser, requireRole('ADMIN'), async (req, res) => {
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

app.post('/api/routes/plan', async (req, res) => {
  try {
    const {
      origin,
      destination,
      vehicleType = 'Heavy Truck (10-Wheeler)',
      cargo = 'Relief Supplies & Medicines',
      priority = 'HIGH',
      avoidDisruptions = true,
      originCoords: clientOriginCoords,
      destCoords: clientDestCoords,
    } = req.body || {};

    if (!origin || !String(origin).trim()) {
      return res.status(400).json({ success: false, message: 'Origin location is required for route planning.' });
    }
    if (!destination || !String(destination).trim()) {
      return res.status(400).json({ success: false, message: 'Destination location is required for route planning.' });
    }

    const cleanOrigin = String(origin).trim();
    const cleanDestination = String(destination).trim();

    if (cleanOrigin.toLowerCase() === cleanDestination.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Origin and Destination must be different locations.' });
    }

    const originCoords = clientOriginCoords || resolveLocationCoordinates(cleanOrigin);
    const destCoords = clientDestCoords || resolveLocationCoordinates(cleanDestination);

    if (!originCoords || !destCoords) {
      return res.status(400).json({
        success: false,
        message: `Unable to resolve coordinates for route: ${!originCoords ? `unknown origin '${cleanOrigin}'` : ''} ${!destCoords ? `unknown destination '${cleanDestination}'` : ''}`.trim(),
      });
    }

    const isSonapurAvoided = (cleanOrigin === 'Guwahati' && cleanDestination === 'Silchar') ||
      (cleanOrigin === 'Shillong' && cleanDestination === 'Silchar') ||
      (cleanOrigin === 'Guwahati' && cleanDestination === 'Agartala');

    const activeCriticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
    const criticalWeather = weather.filter((w) => w.alertLevel === 'RED' || w.alertLevel === 'AMBER').map((w) => `${w.district} (${w.condition})`);

    let aiPlan = null;
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (groqKey && groqKey !== 'mock-groq-api-key') {
      try {
        const groqPrompt = `You are the NER Disruption-Aware Tactical Route AI for the Brahmaputra Strategic Logistics Corridor.
Plan the optimal route from ${cleanOrigin} to ${cleanDestination} for a ${vehicleType} carrying ${cargo} with priority ${priority}.
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
    {"name": "${cleanOrigin} Hub", "lat": ${originCoords.lat}, "lng": ${originCoords.lng}, "type": "ORIGIN", "note": "Departure terminal"},
    {"name": "${cleanDestination} Terminal", "lat": ${destCoords.lat}, "lng": ${destCoords.lng}, "type": "DESTINATION", "note": "Delivery point"}
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
      { name: `${cleanOrigin} Central Hub`, lat: originCoords.lat, lng: originCoords.lng, type: 'ORIGIN', note: 'Primary dispatch point' },
    ];

    if (isSonapurAvoided && avoidDisruptions) {
      if (cleanOrigin === 'Guwahati' && cleanDestination === 'Silchar') {
        defaultWaypoints.push({ name: 'Nagaon Bypass Junction (NH-27)', lat: 26.3450, lng: 92.6840, type: 'TRANSIT', note: 'Detour entry avoiding NH-6 Sonapur bottleneck' });
        defaultWaypoints.push({ name: 'Haflong Mountain Highway Staging (NH-627)', lat: 25.1667, lng: 93.0167, type: 'TRANSIT', note: 'Safe terrain corridor' });
        defaultWaypoints.push({ name: 'Silchar Distribution Depot', lat: 24.8170, lng: 92.7960, type: 'TRANSIT', note: 'Barak Valley cross-docking junction' });
      }
    } else if (cleanOrigin !== cleanDestination) {
      // Midpoint interpolation
      const midLat = (originCoords.lat + destCoords.lat) / 2;
      const midLng = (originCoords.lng + destCoords.lng) / 2;
      defaultWaypoints.push({ name: `${cleanOrigin} - ${cleanDestination} Transit Checkpoint`, lat: Number(midLat.toFixed(4)), lng: Number(midLng.toFixed(4)), type: 'TRANSIT', note: 'Monitored highway checkpoint' });
    }

    defaultWaypoints.push({ name: `${cleanDestination} Terminal Depot`, lat: destCoords.lat, lng: destCoords.lng, type: 'DESTINATION', note: 'Cargo delivery terminal' });

    const generatedRoute = {
      routeId: `RTE-NER-${Date.now().toString(36).toUpperCase()}`,
      origin: cleanOrigin,
      destination: cleanDestination,
      vehicleType,
      cargo,
      priority,
      avoidDisruptions,
      status: aiPlan?.status || 'OPTIMAL_CALCULATED',
      recommendedCorridor: aiPlan?.recommendedCorridor || (isSonapurAvoided ? `${cleanOrigin} → Nagaon (NH-27) → Haflong Bypass → ${cleanDestination}` : `${cleanOrigin} → ${cleanDestination} Direct Arterial`),
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

// =========================================================================
// Database Startup & Server Initialization
//
// Startup Lifecycle:
// CASE A (DATABASE_URL unset):
//   - Uses in-memory development repository.
//   - Logs: "[Database] DATABASE_URL unset. Using in-memory development repository."
//   - Starts HTTP server normally.
//
// CASE B (DATABASE_URL set and connection/schema succeeds):
//   - Verifies connection with SELECT 1.
//   - Initializes schema via initializeDatabase(pool) (creates table & seeds if empty).
//   - Hydrates Track 4 compatibility cache BEFORE server begins accepting traffic.
//   - Logs success and starts HTTP server.
//
// CASE C (DATABASE_URL set but connection/schema fails):
//   - Rejects startup and logs sanitized fatal error.
//   - NEVER silently falls back to in-memory mode in production.
//   - Exits process with non-zero exit code.
// =========================================================================

export async function initializePersistenceAndHydrate({ exitOnError = true } = {}) {
  // Enforce JWT secret presence in production
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    const errorMsg = '[Security Fatal] Insecure production configuration: JWT_SECRET environment variable is required in production mode.';
    console.error(errorMsg);
    if (exitOnError) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  if (!isDatabaseConfigured()) {
    console.log('[Database] DATABASE_URL unset. Using in-memory development repository.');

    // Bootstrap in-memory admin account for development/testing ONLY if explicitly configured
    const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_INITIAL_NAME || process.env.ADMIN_NAME || 'NER Command Administrator';

    if (adminEmail && adminPass) {
      const existingAdmin = await userRepository.getUserByEmail(adminEmail);
      if (!existingAdmin) {
        const passwordHash = await hashPassword(adminPass);
        await userRepository.createUser({
          id: 'USR-NER-ADMIN-001',
          fullName: adminName,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        });
        console.log(`[Database] In-memory administrator account bootstrapped (${adminEmail}).`);
      }
    } else {
      console.log('[Database] No initial admin bootstrap credentials configured (ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD). Skipping in-memory admin bootstrap.');
    }

    return { mode: 'IN_MEMORY', count: vehicles.length };
  }

  try {
    const pool = getPool();
    const conn = await testConnection();
    if (!conn.ok) {
      const sanitizedError = conn.error ? conn.error.replace(/:\/\/[^:]+:([^@]+)@/g, '://[REDACTED_USER]:[REDACTED_SECRET]@') : 'Connection failed';
      const errorMsg = `[Database] FATAL: DATABASE_URL is configured but PostgreSQL connection failed: ${sanitizedError}`;
      console.error(errorMsg);
      if (exitOnError) {
        process.exit(1);
      }
      throw new Error(errorMsg);
    }

    console.log('[Database] PostgreSQL connection verified.');
    const initRes = await initializeDatabase(pool);
    userRepository.setPool(pool);
    vehicleRepository.setPool(pool);
    deploymentRepository.setPool(pool);

    // PRE-STARTUP HYDRATION: Hydrate Track 4 compatibility cache BEFORE server listens
    const loaded = await vehicleRepository.getAllVehicles();
    vehicles = loaded;
    console.log(`[Database] Track 4 vehicle compatibility cache hydrated with ${loaded.length} records from PostgreSQL.`);

    return { mode: 'POSTGRESQL', count: loaded.length, seeded: initRes.seeded };
  } catch (err) {
    const sanitizedMsg = err.message ? err.message.replace(/:\/\/[^:]+:([^@]+)@/g, '://[REDACTED_USER]:[REDACTED_SECRET]@') : 'Initialization failed';
    const fatalMsg = `[Database] FATAL: PostgreSQL initialization failed: ${sanitizedMsg}`;
    console.error(fatalMsg);
    if (exitOnError) {
      process.exit(1);
    }
    throw new Error(fatalMsg);
  }
}

async function startServer() {
  await initializePersistenceAndHydrate({ exitOnError: true });

  // Start Server bound to 0.0.0.0 for Render / cloud environments
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`[NER Backend] Service online and listening on http://${HOST}:${PORT}`);
    console.log(`[NER Backend] Health check: http://${HOST}:${PORT}/api/health`);
  });
}

startServer();
