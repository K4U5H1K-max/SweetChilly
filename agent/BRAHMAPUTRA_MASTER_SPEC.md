# PROJECT BRAHMAPUTRA — MASTER ARCHITECTURE SPECIFICATION
## AI-Based Smart Logistics & Accessibility Intelligence Platform (NER)

---

### 1. Architectural Overview

Project Brahmaputra provides unified logistics management, accessibility intelligence, and active driver safety monitoring across the North Eastern Region of India.

The platform architecture features **TWO Portals** sharing **ONE Backend** and **ONE Authoritative PostgreSQL Database**:

```
                    PROJECT BRAHMAPUTRA
                            │
                     Authentication
                            │
                ┌───────────┴───────────┐
                │                       │
               USER                   ADMIN
                │                       │
          User Portal            Command Center
         (/user/dashboard)     (/admin/dashboard)
                │                       │
                └───────────┬───────────┘
                            │
                        Backend API
                     (Node / Express)
                            │
                  PostgreSQL Repository
                            │
               ┌────────────┴────────────┐
               │                         │
      Vehicles / Deployments          Track 4
      (1:N Asset/Trip Domain)   (Voice AI Safety Engine)
```

---

### 2. Portals and User Roles

#### 2.1 User Portal (`/user/dashboard` & sub-routes)
- Dedicated workspace for logistics operators and vehicle owners.
- **Capabilities**:
  - Secure registration, authentication, and session restoration.
  - Operator Dashboard summarizing owned assets, active trips, alerts, and quick actions.
  - **My Vehicles**: Register, view, edit, and safely manage operator-owned vehicles.
  - **Deployments**: Create journey deployments for owned available vehicles, track active deployments, complete or cancel journeys, and inspect deployment history.
  - **Route & Accessibility Intelligence**: Access corridor accessibility scores, flood vulnerability data, and terrain constraints.
  - **Field Reporting**: Submit road disruption and incident reports.
- **Security Invariant**: A `USER` can only access, modify, or deploy vehicles and deployments owned by their authenticated identity (`owner_user_id === req.user.id`).

#### 2.2 Admin Command Center (`/admin/dashboard`)
- Comprehensive command & control dashboard for government authorities and fleet supervisors.
- **Capabilities**:
  - Full visibility across **ALL** vehicles (user-owned and legacy admin-managed assets).
  - Monitoring of **ALL** active deployments across regional corridors.
  - Interactive GIS Map with live telemetry overlays and district flood risk indicators.
  - Logistics KPIs (Fleet Utilization, Active Journeys, Bottlenecks, Safety Alerts).
  - **Track 4 Safety Escalation**: Administrative trigger for automated voice calls, live transcription reviews, safety classifications, and escalation workflows.

---

### 3. Core Domain & Ownership Model

```
Users (users)
  │ (1)
  │ (N)
Vehicles (vehicles)
  │ (1)
  │ (N)
Deployments (deployments)
```

- **Vehicle**: Persistent physical asset (e.g. `AS-01-AB-1234`). Retains permanent identity, driver contact, cargo capacity, and lifetime telemetry history.
- **Deployment**: An individual journey lifecycle (`PLANNED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED` / `CANCELLED`).
  - One vehicle can have multiple sequential historical deployments over time.
  - A vehicle can have at most **ONE** active deployment at any given moment.
  - Completing or cancelling a deployment frees the vehicle for subsequent journeys without deleting vehicle asset records.
- **Deployment Ownership**: Inherited directly from `vehicles.owner_user_id`. No duplicate owner fields exist on the deployment table.
- **Legacy Records**: Pre-existing vehicles created prior to multi-tenant auth have `owner_user_id = NULL`. These remain visible and operational for `ADMIN`, but hidden from ordinary `USER` accounts.

---

### 4. Track 4 Driver Safety Engine

- **Workflow**:
  1. Vehicle flagged by Admin (or automated system trigger).
  2. Track 4 resolves verified driver phone number from persisted vehicle record.
  3. AI Voice provider (Sarvam Voice Agent / mock provider) conducts structured vernacular check-in call.
  4. Webhook response parsed for conversation transcript and raw telemetry.
  5. Post-call intelligence classifies safety outcome (`SAFE`, `DELAYED`, `BREAKDOWN`, `ROAD_BLOCKED`, `ASSISTANCE_REQUIRED`, `NO_RESPONSE`, `UNKNOWN`).
  6. Persistent vehicle state updated with safety classification; Admin Command Center alerted for emergency escalations.
- **Separation of Domains**: Track 4 `safetyStatus` is strictly decoupled from `deploymentStatus`.

---

### 5. API & Route Scoping Standards

| Endpoint | Method | Role | Scoping / Authorization Rule |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Enforces `role = USER`; hashes password with bcrypt. |
| `/api/auth/login` | `POST` | Public | Returns signed JWT; generic error on credential mismatch. |
| `/api/auth/me` | `GET` | Authenticated | Returns sanitized profile for authenticated session. |
| `/api/vehicles` | `GET` | Authenticated | `USER`: Returns only owned vehicles.<br>`ADMIN`: Returns all vehicles with safe owner projections. |
| `/api/vehicles/:id` | `GET` | Authenticated | `USER`: 404 if not owned.<br>`ADMIN`: Accessible for all vehicles. |
| `/api/vehicles` | `POST` | Authenticated | `USER`: Forces `owner_user_id = req.user.id`.<br>`ADMIN`: Allows `owner_user_id = null`. |
| `/api/vehicles/:id` | `PUT` | Authenticated | `USER`: May update only owned vehicles (ownership immutable).<br>`ADMIN`: May update any vehicle. |
| `/api/vehicles/:id` | `DELETE` | Authenticated | Requires ownership + active deployment deletion guard. |
| `/api/deployments` | `GET` | Authenticated | `USER`: Scoped to user's vehicles.<br>`ADMIN`: Global list. |
| `/api/deployments` | `POST` | Authenticated | `USER`: Requires ownership of target vehicle.<br>`ADMIN`: Any eligible vehicle. |
| `/api/deployments/:id/*` | `POST` | Authenticated | Lifecycle transitions (`/complete`, `/cancel`) scoped by vehicle ownership. |
| `/api/track4/*` | `POST` | `ADMIN` only | Protected by `requireRole('ADMIN')`. Returns 403 for `USER`. |
| `/api/sarvam/voice-webhook`| `POST` | Webhook | Protected by webhook signature/token; bypasses interactive auth. |
