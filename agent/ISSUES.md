# PROJECT BRAHMAPUTRA — ISSUES & TRACKING LEDGER

---

### Active Issues
*None currently blocking.*

---

### Resolved Issues

| Issue ID | Severity | Phase | Description | Status | Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-001** | High | Phase 3A.1 | Silent database fallback if PostgreSQL unreachable | **RESOLVED** | Server startup exits fatally if `DATABASE_URL` is set but unreachable. |
| **ISSUE-002** | Medium | Phase 3A.2 | Static `INITIAL_VEHICLES` overriding backend on startup | **RESOLVED** | Hydration hooked into `AppContext` via `fetchVehicles()` on mount. |
| **ISSUE-003** | High | Phase 3B.1 | Vehicle deletion while deployment in progress | **RESOLVED** | Server enforces active deployment check before allowing vehicle deletion. |
| **ISSUE-004** | Critical | Phase 3C.1 | Role tampering in public registration | **RESOLVED** | Public registration ignores client-supplied `role` and forces `USER`. |
| **ISSUE-005** | Critical | Phase 3C.3 | Cross-user vehicle tampering (IDOR) | **RESOLVED** | Server checks `owner_user_id === req.user.id` on all mutations; returns 404 on unauthorized access. |
| **ISSUE-006** | Critical | Release Prep | Hardcoded default admin password fallback | **RESOLVED** | Removed all hardcoded default admin credentials from source. Admin provisioning requires explicit environment configuration (`ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD`), and `JWT_SECRET` is strictly enforced in production. |
