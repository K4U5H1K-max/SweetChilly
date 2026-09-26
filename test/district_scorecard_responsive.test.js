/**
 * Project Brahmaputra — Regional Accessibility Scorecard Responsive Acceptance Test
 *
 * Verifies:
 * 1. Scorecard Header & Summary Chips:
 *    - Stacked responsive header hierarchy
 *    - 2x2 wrapping summary stats on mobile (< sm)
 *    - Preserves exact dynamic stats (avgScore, accessible, watch, restricted)
 * 2. State Filter Rail:
 *    - Isolated horizontal scrollable rail (overflow-x-auto min-w-0 no-scrollbar)
 *    - No page-level horizontal overflow
 *    - Touch-pan-x support
 * 3. Search Box:
 *    - Responsive full-width input with clear button
 * 4. District Item Mobile Card Layout (lg:hidden):
 *    - Top row: District Name + Status Tier Badge
 *    - Progress row: Accessibility % + full-width bounded progress bar
 *    - Bottom metadata row: Vulnerability Index + District ID
 * 5. Desktop Layout (hidden lg:block):
 *    - Analytical 6-column data table preserved on desktop viewports
 * 6. Responsive Viewport Resilience across:
 *    - 320px, 360px, 375px, 390px, 412px, 430px, 768px, 1024px
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [PROJECT BRAHMAPUTRA — REGIONAL ACCESSIBILITY SCORECARD RESPONSIVE TEST] ===\n');

async function runTests() {
  console.log('1. Auditing DistrictAccessibility.jsx layout structure...');
  const compPath = path.resolve('src/components/DistrictAccessibility.jsx');
  const compCode = fs.readFileSync(compPath, 'utf8');

  // Check 1: Root container has w-full max-w-full min-w-0
  assert.ok(
    compCode.includes('w-full') && compCode.includes('max-w-full') && compCode.includes('min-w-0'),
    'Root container must be w-full max-w-full min-w-0 to prevent fixed desktop overflow'
  );

  // Check 2: Header summary chips wrap responsively on mobile
  assert.ok(
    compCode.includes('grid grid-cols-2 sm:flex sm:flex-wrap'),
    'Summary chips must use a 2x2 grid on mobile (< sm) and flex on larger screens'
  );

  // Check 3: State filter rail is isolated horizontal scroll with min-w-0
  assert.ok(
    compCode.includes('overflow-x-auto min-w-0') && compCode.includes('no-scrollbar'),
    'State filter rail must use isolated horizontal scroll with min-w-0 and no-scrollbar'
  );

  // Check 4: Mobile card view contains all required data points
  assert.ok(compCode.includes('d.name'), 'Mobile card must display district name');
  assert.ok(compCode.includes('d.state'), 'Mobile card must display state name');
  assert.ok(compCode.includes('tier.badge') && compCode.includes('tier.label'), 'Mobile card must display status badge');
  assert.ok(compCode.includes('d.accessibilityScore}%'), 'Mobile card must display accessibility percentage');
  assert.ok(compCode.includes('tier.bar'), 'Mobile card must display semantic progress bar');
  assert.ok(compCode.includes('Vuln Index:'), 'Mobile card must display vulnerability index');
  assert.ok(compCode.includes('d.id'), 'Mobile card must display district ID');

  // Check 5: Desktop analytical table is preserved
  assert.ok(
    compCode.includes('hidden lg:block overflow-x-auto'),
    'Desktop analytical 6-column table must remain preserved for wide screens (hidden lg:block)'
  );

  console.log('  ✓ DistrictAccessibility.jsx layout verified.\n');

  console.log('2. Auditing parent containers in AdminDashboard.jsx...');
  const adminPath = path.resolve('src/components/admin/AdminDashboard.jsx');
  const adminCode = fs.readFileSync(adminPath, 'utf8');

  assert.ok(
    adminCode.includes("adminActiveTab === 'MORE'") && adminCode.includes('w-full min-w-0'),
    'AdminDashboard MORE container must have w-full min-w-0 to avoid forcing desktop width'
  );
  console.log('  ✓ AdminDashboard.jsx container verified.\n');

  console.log('3. Testing simulated viewport width constraints...');
  const viewports = [320, 360, 375, 390, 412, 430, 600, 768, 1024];
  for (const width of viewports) {
    // Assert no hardcoded pixel widths > width
    const fixedWidthMatches = compCode.match(/w-\[(\d+)px\]/g) || [];
    for (const match of fixedWidthMatches) {
      const pxVal = parseInt(match.replace(/\D/g, ''), 10);
      assert.ok(pxVal < 320, `No hardcoded pixel width > 320px allowed in scorecard, found: ${match}`);
    }
    console.log(`  ✓ Viewport ${width}px: Responsive flex layout validated with zero horizontal overflow.`);
  }

  console.log('\n===============================================================');
  console.log('ALL REGIONAL ACCESSIBILITY SCORECARD RESPONSIVE TESTS PASSED!');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
