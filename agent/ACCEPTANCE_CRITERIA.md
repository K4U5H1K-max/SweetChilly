# PROJECT BRAHMAPUTRA — ACCEPTANCE CRITERIA
## Quality, Security, and Functional Contracts

---

### Global Acceptance Standards

1. **Authentication & Session**:
   - `USER` and `ADMIN` identities persist reliably across browser reloads via token validation (`/api/auth/me`).
   - Passwords stored strictly as `bcrypt` hashes; plain passwords or hashes are never exposed in responses or logs.

2. **Role Authorization**:
   - `USER` is restricted to operator endpoints and blocked from `ADMIN` endpoints with `HTTP 403 Forbidden`.
   - `RoleRoute` guards prevent client-side navigation into unauthorized portal areas.

3. **Resource Ownership & Anti-IDOR**:
   - `USER` can only access, modify, delete, and deploy vehicles where `owner_user_id === req.user.id`.
   - Unauthorized requests to another tenant's resources return `HTTP 404 Not Found` (anti-enumeration).
   - Client-supplied `ownerUserId` in request payloads is discarded; server identity `req.user.id` is enforced.
   - `ADMIN` retains global visibility across all user-owned and legacy/admin-managed assets.

4. **Asset & Deployment Lifecycle**:
   - Vehicle is a persistent asset (`1:N` deployments). Completing or cancelling a deployment frees the vehicle and records the trip in history without deleting the vehicle asset.
   - Active deployment constraint: A vehicle cannot be deleted while in `ACTIVE` or `PLANNED` deployment state.
   - A vehicle cannot have multiple simultaneous active deployments.

5. **Track 4 Safety Engine**:
   - Administrative voice triggers remain `ADMIN`-only (`HTTP 403` for `USER`).
   - Webhook processing correctly classifies driver response and updates persistent vehicle safety status.
   - Track 4 `safetyStatus` remains strictly decoupled from `deploymentStatus`.

6. **Relational Integrity & Anti-Cascade**:
   - User FK on vehicles uses `ON DELETE RESTRICT`, preventing accidental cascading deletion of fleet history.

7. **Production Build & Test Health**:
   - `npm test` passes cleanly with 0 failing assertions.
   - `npm run build` completes with exit code 0.
   - Zero hardcoded secrets, database passwords, or unmasked PII.

---

### Phase-Specific Acceptance Criteria

#### Phase 3D: User Portal
- **3D.1 Dashboard & Navigation**: Operator dashboard hydrates live scoped metrics (My Vehicles count, Active Deployments count, Available Vehicles count).
- **3D.2 My Vehicles**: Operator can list owned vehicles, register a new vehicle with driver phone and cargo details, edit vehicle parameters, and delete available vehicles.
- **3D.3 Deployments**: Operator can deploy available owned vehicles (origin, destination, cargo, driver notes), view active deployment cards with progress markers, and complete or cancel journeys.
- **3D.4 User Journey History**: Operator can review past journeys with timing and status details.

#### Phase 3E: User $\rightarrow$ Admin Operational Sync
- User-registered vehicles and user-initiated deployments immediately reflect in Admin Command Center (GIS Map, KPIs, Vehicle Manager, and Deployments Table) without data duplication.

#### Phase 3F: Tracking & Accessibility Intelligence
- User Portal integrates read-only corridor accessibility scores, weather advisories, and terrain disruption telemetry.

#### Phase 3G: Field / Incident Reporting
- Authenticated users can submit road/corridor incident reports (`POST /api/incidents` or similar) with server-assigned author identity. Admin portal can view and resolve reports.

#### Phase 3H: Track 4 User-Deployed Workflow
- Admin can flag a user-deployed vehicle, trigger a mock Track 4 safety check, and have the persisted driver classification update the vehicle's safety status.

#### Phase 3I: System Acceptance & Hardening
- Complete automated end-to-end regression across all modules, responsive layout audit, security audit, and zero-defect validation.
