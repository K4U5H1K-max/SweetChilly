# AGENT OPERATING RULES & PROTOCOLS
## Project Brahmaputra — Autonomous Engineering Mode

---

### Operating Rules

#### RULE 1 — REPOSITORY IS SOURCE OF TRUTH
Inspect the actual codebase, migrations, and tests before deciding what exists or what state the system is in. Never assume features exist without verifying code.

#### RULE 2 — ONE BOUNDED MILESTONE AT A TIME
Do not attempt the entire remaining project in one monolithic code change. Execute sequentially through defined milestones.

#### RULE 3 — TEST BEFORE PROCEEDING
For each milestone:
`inspect` $\rightarrow$ `plan` $\rightarrow$ `implement` $\rightarrow$ `targeted tests` $\rightarrow$ `full regression` $\rightarrow$ `build` $\rightarrow$ `review` $\rightarrow$ `PASS/FAIL`.

#### RULE 4 — FIX BEFORE MOVING ON
If the current milestone fails due to a defect within its scope:
`diagnose` $\rightarrow$ `fix` $\rightarrow$ `retest`. Do not advance while the current milestone is broken.

#### RULE 5 — DO NOT WEAKEN TESTS
Never delete or disable meaningful test assertions merely to force a PASS.

#### RULE 6 — BACKEND IS SECURITY AUTHORITY
Never rely on frontend hiding or client-side filtering for authorization. All resource scoping, role checks, and ownership validations must be enforced on the server.

#### RULE 7 — SERVER-CONTROLLED OWNERSHIP
USER resource ownership comes strictly from the verified authenticated identity (`req.user.id`). Never trust owner IDs supplied in request bodies.

#### RULE 8 — PRESERVE HISTORY
Do not destroy vehicles, historical deployments, or telemetry records to simplify lifecycle logic. Maintain relational integrity (`ON DELETE RESTRICT`).

#### RULE 9 — PRESERVE TRACK 4
Do not redesign working Track 4 voice provider abstraction, webhook processing, or safety escalation logic without verified defect requirements.

#### RULE 10 — NO FAKE DATA
Do not populate production-facing interfaces with fabricated operational records simply to make UI appear full. Frontend must hydrate authoritative backend data.

#### RULE 11 — NO SECRET EXPOSURE
Never output, store, log, or commit:
- API keys
- Plaintext passwords or bcrypt hashes in responses
- JWT signing secrets
- DATABASE_URL / raw database credentials
- Raw authentication tokens in console logs

#### RULE 12 — MINIMAL NECESSARY CHANGE
Avoid unrelated refactors, aesthetic overhauls, or scope creep outside the target milestone.

#### RULE 13 — DOCUMENT IMPORTANT DECISIONS
Update `agent/DECISIONS.md` when architectural patterns or schemas meaningfully change.

#### RULE 14 — KEEP PROJECT_STATE CURRENT
After each milestone, update `agent/PROJECT_STATE.md` with verified evidence and test counts.

---

### Human Approval Gates

#### Autonomous Execution Allowed For:
- Reading repository and inspecting state
- Creating and editing local source files
- Creating local schema migrations and repository code
- Writing and updating tests
- Running automated test suites (`npm test`)
- Running production builds (`npm run build`)
- Local browser / frontend component verification
- Mock/dry-run Track 4 testing
- Fixing local regressions and defects
- Updating `/agent` documentation
- Advancing from one verified milestone to the next

#### STOP and Request Human Approval Before:
1. `git commit`
2. `git push`
3. Creating or deleting git branches
4. Production cloud deployments (e.g. Render, Vercel, AWS)
5. Render or cloud infrastructure configuration
6. Production database schema alteration
7. Destructive database operations (e.g. `DROP DATABASE`, `TRUNCATE`)
8. Changing production secrets or environment credentials
9. Creating real production credentials
10. Purchasing or activating paid third-party services
11. Initiating live telephone calls (telephony billing)
12. Modifying live production Sarvam / AI provider configurations
13. Sending live external SMS, notifications, or emails
14. Deleting production user or operational data
15. Major product-scope changes not covered by the Master Specification
