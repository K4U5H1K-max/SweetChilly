# PROJECT BRAHMAPUTRA — ARCHITECTURAL DECISIONS LOG

---

### Decision Log

#### DEC-001: Authoritative Persistent Database Architecture
- **Date**: 2026-09-22
- **Decision**: PostgreSQL is the single authoritative persistent data store when `DATABASE_URL` is configured. If `DATABASE_URL` is unset, an in-memory repository implementation is used for lightweight local development and automated testing. If `DATABASE_URL` is configured but unreachable, server startup fails with a fatal exit (no silent fallback).
- **Affected Components**: `server/db/schema.js`, `server/db/vehicleRepository.js`, `server/db/deploymentRepository.js`, `server/db/userRepository.js`, `server/index.js`.

#### DEC-002: Asset vs. Trip Separation (1:N Vehicle to Deployment Domain)
- **Date**: 2026-09-22
- **Decision**: A physical Vehicle is permanent (`1`). A Deployment represents an individual journey (`N`). Completing or cancelling a deployment updates the deployment status to a terminal state and returns the vehicle to `AVAILABLE` without deleting the vehicle entity.
- **Affected Components**: `vehicles` table, `deployments` table, `deploymentRepository.js`, `VehicleManager.jsx`, `DeployVehicleModal.jsx`.

#### DEC-003: Two Portals, Single Backend and Shared Authoritative Database
- **Date**: 2026-09-22
- **Decision**: Rather than running separate applications or databases, both the **User Portal** and the **Admin Command Center** run as client routes within the same SPA and communicate with the same backend API.
- **Affected Components**: `src/App.jsx`, `src/components/auth/RoleRoute.jsx`, `src/components/admin/AdminDashboard.jsx`, `src/components/user/UserDashboard.jsx`.

#### DEC-004: Server-Enforced Resource Ownership & Anti-IDOR (Phase 3C.3)
- **Date**: 2026-09-22
- **Decision**: Resource ownership is strictly derived from the verified JWT identity (`req.user.id`). Any `ownerUserId` submitted in request payloads is ignored. Deployments inherit ownership from their parent vehicle (`deployments.vehicle_id` $\rightarrow$ `vehicles.owner_user_id`). Unauthorized queries return `HTTP 404 Not Found` rather than `403` to prevent object enumeration.
- **Affected Components**: `vehicles.owner_user_id`, `server/index.js`, `server/db/vehicleRepository.js`, `server/db/deploymentRepository.js`.

#### DEC-005: Decoupled Track 4 Driver Safety Domain
- **Date**: 2026-09-22
- **Decision**: Track 4 `safetyStatus` (`SAFE`, `DELAYED`, `BREAKDOWN`, `ROAD_BLOCKED`, `ASSISTANCE_REQUIRED`, `NO_RESPONSE`) is decoupled from operational `deploymentStatus` (`PLANNED`, `ACTIVE`, `COMPLETED`, `CANCELLED`). Track 4 administrative voice triggers remain strictly restricted to `ADMIN` (`HTTP 403 Forbidden` for users).
- **Affected Components**: `server/voice/*`, `server/index.js`, `DriverSafetyModal.jsx`.

#### DEC-006: Production Configuration Hardening & Zero-Fallback Credentials
- **Date**: 2026-09-22
- **Decision**: The application must never silently bootstrap an administrator account using a hardcoded default password. Admin bootstrap credentials (`ADMIN_INITIAL_EMAIL` / `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` / `ADMIN_PASSWORD`) must be explicitly configured in the environment; if omitted, admin provisioning is skipped. In production (`NODE_ENV === 'production'`), `JWT_SECRET` must be explicitly configured or startup fails with a fatal error.
- **Affected Components**: `server/db/schema.js`, `server/index.js`, `server/auth/authUtils.js`, `.env.example`, `test/auth_security.test.js`.
