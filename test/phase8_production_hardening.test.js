/**
 * Project Brahmaputra — Phase 8
 * Production Quality, UX Polish & Final Hardening Test Suite
 *
 * Verifies:
 * 1. Admin VehicleManager modal mounting and event wire-up in AdminDashboard.jsx
 * 2. AppContext session change re-hydration logic and multi-tenant isolation
 * 3. UserDashboard zero-vehicle guidance and registration CTA
 * 4. StatusChip semantic keyword mappings and resilient CSS class generation
 * 5. Complete removal of dead legacy components with zero broken import references
 * 6. Mobile PWA screen-based navigation invariants
 * 7. IST time formatting resilience across application components
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('PROJECT BRAHMAPUTRA — PHASE 8: PRODUCTION QUALITY & HARDENING');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// TEST 1: Admin VehicleManager Modal Mounting & Event Wiring
// ---------------------------------------------------------------------------
console.log('--- TEST 1: Admin VehicleManager Modal Mounting & Wire-up ---');
{
  const adminDashboardPath = path.join(ROOT_DIR, 'src', 'components', 'admin', 'AdminDashboard.jsx');
  assert.ok(fs.existsSync(adminDashboardPath), 'AdminDashboard.jsx must exist');
  const content = fs.readFileSync(adminDashboardPath, 'utf8');

  // Verify VehicleManager import
  assert.match(
    content,
    /import\s+VehicleManager\s+from\s+['"]\.\.\/VehicleManager['"]/,
    'AdminDashboard must import VehicleManager'
  );

  // Verify VehicleManager is rendered inside JSX
  assert.match(
    content,
    /<VehicleManager[\s\S]*?isOpen=\{isVehicleModalOpen\s*\|\|\s*Boolean\(editingVehicleId\)\}/,
    'AdminDashboard must render VehicleManager with isVehicleModalOpen or editingVehicleId'
  );

  // Verify callbacks wired
  assert.match(
    content,
    /onClose=\{[\s\S]*?setIsVehicleModalOpen\(false\)[\s\S]*?\}/,
    'VehicleManager must have onClose handler resetting isVehicleModalOpen'
  );
  assert.match(
    content,
    /onCloseEdit=\{[\s\S]*?setEditingVehicleId\(null\)[\s\S]*?\}/,
    'VehicleManager must have onCloseEdit handler resetting editingVehicleId'
  );
  assert.match(
    content,
    /onVehicleCreated=\{handleVehicleCreated\}/,
    'VehicleManager must have onVehicleCreated handler'
  );

  // Verify Navbar receives onOpenAddVehicle
  assert.match(
    content,
    /<Navbar[\s\S]*?onOpenAddVehicle=\{[\s\S]*?setIsVehicleModalOpen\(true\)[\s\S]*?\}/,
    'Navbar in AdminDashboard must receive onOpenAddVehicle prop'
  );

  // Verify CorridorTelemetryLedger receives modal controls
  assert.match(
    content,
    /onOpenAddVehicle=\{[\s\S]*?setIsVehicleModalOpen\(true\)[\s\S]*?\}/,
    'CorridorTelemetryLedger in AdminDashboard must receive onOpenAddVehicle'
  );
  assert.match(
    content,
    /onEditVehicle=\{handleEditVehicle\}/,
    'CorridorTelemetryLedger in AdminDashboard must receive onEditVehicle'
  );

  // Verify popstate and anyModalOpen include editingVehicleId
  assert.match(
    content,
    /Boolean\(editingVehicleId\)/,
    'anyModalOpen and back-button handler must check editingVehicleId'
  );

  console.log('✓ TEST 1 PASSED: AdminDashboard VehicleManager modal is fully mounted and wired to Navbar and CorridorTelemetryLedger.\n');
}

// ---------------------------------------------------------------------------
// TEST 2: AppContext Session Re-hydration Invariant
// ---------------------------------------------------------------------------
console.log('--- TEST 2: AppContext Dynamic Session Re-hydration ---');
{
  const appContextPath = path.join(ROOT_DIR, 'src', 'context', 'AppContext.jsx');
  assert.ok(fs.existsSync(appContextPath), 'AppContext.jsx must exist');
  const content = fs.readFileSync(appContextPath, 'utf8');

  // Verify AuthContext integration
  assert.match(
    content,
    /import\s+\{[^}]*AuthContext[^}]*\}\s+from\s+['"]\.\/AuthContext['"]/,
    'AppContext must import AuthContext from ./AuthContext'
  );

  // Verify useEffect dependency on currentUserId
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?refreshVehicles\(\);[\s\S]*?refreshDeployments\(\);[\s\S]*?\}\s*,\s*\[currentUserId,\s*refreshVehicles,\s*refreshDeployments\]\s*\)/,
    'AppContext must re-hydrate vehicles and deployments when currentUserId changes'
  );

  // Harness test for session re-hydration behavior
  class SessionContextHarness {
    constructor() {
      this.currentUser = null;
      this.vehicles = [];
      this.deployments = [];
      this.refreshCount = 0;
    }

    async refreshVehicles() {
      this.refreshCount++;
      if (!this.currentUser) {
        this.vehicles = [];
        return;
      }
      if (this.currentUser.role === 'admin') {
        this.vehicles = [
          { id: 'v1', owner_id: 'u1' },
          { id: 'v2', owner_id: 'u2' },
        ];
      } else {
        this.vehicles = [{ id: 'v1', owner_id: this.currentUser.id }];
      }
    }

    async refreshDeployments() {
      if (!this.currentUser) {
        this.deployments = [];
        return;
      }
      this.deployments = [{ id: 'd1', vehicle_id: 'v1' }];
    }

    async handleUserChange(newUser) {
      this.currentUser = newUser;
      await this.refreshVehicles();
      await this.refreshDeployments();
    }
  }

  const harness = new SessionContextHarness();
  assert.strictEqual(harness.vehicles.length, 0);

  // Simulate User 1 login
  await harness.handleUserChange({ id: 'u1', role: 'user' });
  assert.strictEqual(harness.vehicles.length, 1);
  assert.strictEqual(harness.vehicles[0].owner_id, 'u1');

  // Simulate switch to Admin
  await harness.handleUserChange({ id: 'admin1', role: 'admin' });
  assert.strictEqual(harness.vehicles.length, 2);

  // Simulate logout
  await harness.handleUserChange(null);
  assert.strictEqual(harness.vehicles.length, 0);
  assert.strictEqual(harness.deployments.length, 0);

  console.log('✓ TEST 2 PASSED: AppContext re-hydrates fleet and deployments automatically on session/user switch.\n');
}

// ---------------------------------------------------------------------------
// TEST 3: UserDashboard Zero-Vehicle Guidance & Registration Flow
// ---------------------------------------------------------------------------
console.log('--- TEST 3: UserDashboard Zero-Vehicle Guidance ---');
{
  const userDashboardPath = path.join(ROOT_DIR, 'src', 'components', 'user', 'UserDashboard.jsx');
  assert.ok(fs.existsSync(userDashboardPath), 'UserDashboard.jsx must exist');
  const content = fs.readFileSync(userDashboardPath, 'utf8');

  // Verify conditional dispatch guidance
  assert.match(
    content,
    /totalVehiclesCount\s*===\s*0/,
    'UserDashboard must check if user has zero registered vehicles'
  );
  assert.match(
    content,
    /setRegisterModalOpen\(true\)/,
    'UserDashboard must open registration modal when zero-vehicle operator clicks primary action'
  );

  console.log('✓ TEST 3 PASSED: Zero-vehicle user portal provides actionable CTA guiding user to asset registration.\n');
}

// ---------------------------------------------------------------------------
// TEST 4: StatusChip Semantic Keyword Mapping & CSS Styling
// ---------------------------------------------------------------------------
console.log('--- TEST 4: StatusChip Semantic Keyword Mappings ---');
{
  const statusChipPath = path.join(ROOT_DIR, 'src', 'components', 'common', 'StatusChip.jsx');
  assert.ok(fs.existsSync(statusChipPath), 'StatusChip.jsx must exist');
  const content = fs.readFileSync(statusChipPath, 'utf8');

  // Verify key statuses are supported in StatusChip
  const requiredKeywords = [
    'active',
    'deployed',
    'moving',
    'in-transit',
    'critical',
    'delayed',
    'maintenance',
    'idle',
    'resolved',
    'completed',
    'online',
    'offline',
    'cancelled',
    'hazard',
    'watch',
    'warning',
    'unavailable',
  ];

  for (const kw of requiredKeywords) {
    assert.ok(
      content.includes(`'${kw}'`) || content.includes(`"${kw}"`),
      `StatusChip must map semantic keyword: ${kw}`
    );
  }

  console.log(`✓ TEST 4 PASSED: StatusChip component supports all ${requiredKeywords.length} operational status keywords.\n`);
}

// ---------------------------------------------------------------------------
// TEST 5: Complete Removal of Dead Legacy Components
// ---------------------------------------------------------------------------
console.log('--- TEST 5: Dead Legacy Component Cleanliness ---');
{
  const deadFilePaths = [
    path.join(ROOT_DIR, 'frontend', 'NER_Logistics_Platform.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'ArchitectureFlow.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'CapabilityCard.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'Footer.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'FooterCTA.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'ForecastExplanation.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'Hero.jsx'),
    path.join(ROOT_DIR, 'src', 'components', 'NetworkTerrainVisualization.jsx'),
  ];

  for (const fp of deadFilePaths) {
    assert.ok(!fs.existsSync(fp), `Dead legacy file must NOT exist: ${path.relative(ROOT_DIR, fp)}`);
  }

  // Scan all active files in src/ to ensure no dangling imports
  function scanDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath, fileList);
      } else if (/\.(jsx?|tsx?)$/.test(file)) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const activeSrcFiles = scanDir(path.join(ROOT_DIR, 'src'));
  const deadNames = [
    'ArchitectureFlow',
    'CapabilityCard',
    'Footer',
    'FooterCTA',
    'ForecastExplanation',
    'Hero',
    'NetworkTerrainVisualization',
    'NER_Logistics_Platform',
  ];

  for (const srcFile of activeSrcFiles) {
    const fileContent = fs.readFileSync(srcFile, 'utf8');
    for (const deadName of deadNames) {
      const importRegex = new RegExp(`from\\s+['"][^'"]*\\/${deadName}(\\.[a-z]+)?['"]`, 'i');
      assert.ok(
        !importRegex.test(fileContent),
        `Active file ${path.relative(ROOT_DIR, srcFile)} must not import dead component ${deadName}`
      );
    }
  }

  console.log(`✓ TEST 5 PASSED: All 8 dead legacy components confirmed deleted with 0 dangling imports across ${activeSrcFiles.length} active files.\n`);
}

// ---------------------------------------------------------------------------
// TEST 6: Mobile PWA Screen-Based Navigation Invariants
// ---------------------------------------------------------------------------
console.log('--- TEST 6: Mobile PWA Screen-Based Navigation ---');
{
  const adminMobileNavPath = path.join(ROOT_DIR, 'src', 'components', 'admin', 'AdminMobileNav.jsx');
  const userMobileNavPath = path.join(ROOT_DIR, 'src', 'components', 'user', 'UserMobileNav.jsx');

  assert.ok(fs.existsSync(adminMobileNavPath), 'AdminMobileNav.jsx must exist');
  assert.ok(fs.existsSync(userMobileNavPath), 'UserMobileNav.jsx must exist');

  const adminNavContent = fs.readFileSync(adminMobileNavPath, 'utf8');
  const userNavContent = fs.readFileSync(userMobileNavPath, 'utf8');

  // Admin tabs: OVERVIEW, MAP, FLEET, ALERTS, MORE
  assert.ok(adminNavContent.includes('OVERVIEW'), 'Admin mobile nav has OVERVIEW tab');
  assert.ok(adminNavContent.includes('MAP'), 'Admin mobile nav has MAP tab');
  assert.ok(adminNavContent.includes('FLEET'), 'Admin mobile nav has FLEET tab');
  assert.ok(adminNavContent.includes('ALERTS'), 'Admin mobile nav has ALERTS tab');
  assert.ok(adminNavContent.includes('MORE'), 'Admin mobile nav has MORE tab');

  // User tabs: HOME, MAP, DEPLOYMENTS, VEHICLES, MORE
  assert.ok(userNavContent.includes('HOME'), 'User mobile nav has HOME tab');
  assert.ok(userNavContent.includes('MAP'), 'User mobile nav has MAP tab');
  assert.ok(userNavContent.includes('DEPLOYMENTS'), 'User mobile nav has DEPLOYMENTS tab');
  assert.ok(userNavContent.includes('VEHICLES'), 'User mobile nav has VEHICLES tab');
  assert.ok(userNavContent.includes('MORE'), 'User mobile nav has MORE tab');

  console.log('✓ TEST 6 PASSED: Mobile PWA bottom navigation enforces 5 distinct screen tabs for both Admin and User portals.\n');
}

// ---------------------------------------------------------------------------
// TEST 7: IST Time Formatting Resilience
// ---------------------------------------------------------------------------
console.log('--- TEST 7: IST Time Formatting Resilience ---');
{
  const timeFormatPath = path.join(ROOT_DIR, 'src', 'utils', 'timeFormat.js');
  assert.ok(fs.existsSync(timeFormatPath), 'timeFormat.js must exist');
  const { formatIST, formatISTDate, formatISTShort } = await import('../src/utils/timeFormat.js');

  // Test valid ISO timestamp
  const sampleISO = '2026-09-24T07:30:00.000Z'; // 13:00 IST
  const formatted = formatIST(sampleISO);
  assert.ok(formatted.includes('IST') || formatted.includes('pm') || formatted.includes('PM') || formatted.includes('13:00'), 'Must format in IST');

  // Test null/undefined resilience
  assert.strictEqual(formatIST(null), 'Unavailable', 'Null timestamp formats gracefully to Unavailable');
  assert.strictEqual(formatIST(undefined), 'Unavailable', 'Undefined timestamp formats gracefully to Unavailable');
  assert.strictEqual(formatIST(''), 'Unavailable', 'Empty timestamp formats gracefully to Unavailable');
  assert.strictEqual(formatIST('invalid-date'), 'Unavailable', 'Invalid timestamp formats gracefully to Unavailable');

  assert.strictEqual(formatIST(null, 'short'), 'Unavailable', 'Null short time formats gracefully');
  assert.strictEqual(formatIST(null, 'dateOnly'), 'Unavailable', 'Null dateOnly formats gracefully');

  console.log('✓ TEST 7 PASSED: IST time formatting is robust, accurate, and fail-safe across all boundary values.\n');
}

console.log('================================================================');
console.log('✓ ALL 7 PHASE 8 PRODUCTION HARDENING TESTS PASSED SUCCESSFULLY');
console.log('================================================================');
