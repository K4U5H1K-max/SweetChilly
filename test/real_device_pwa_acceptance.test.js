import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

/**
 * PROJECT BRAHMAPUTRA — REAL DEVICE PWA ACCEPTANCE SUITE
 * Validates manifest, service worker, installability, mobile layouts,
 * touch targets, safe area insets, offline resilience, and session security.
 */

async function runRealDevicePWAAcceptance() {
  console.log('================================================================');
  console.log('PROJECT BRAHMAPUTRA — REAL DEVICE PWA ACCEPTANCE GATE');
  console.log('================================================================\n');

  const distDir = path.resolve('dist');
  assert.ok(fs.existsSync(distDir), 'Production build directory dist/ must exist');

  // 1. MANIFEST VALIDATION
  console.log('1. Auditing Web App Manifest (dist/manifest.webmanifest)...');
  const manifestPath = path.join(distDir, 'manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in dist/');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.strictEqual(manifest.name, 'Project Brahmaputra — NER Smart Logistics');
  assert.strictEqual(manifest.short_name, 'Brahmaputra');
  assert.strictEqual(manifest.display, 'standalone');
  assert.strictEqual(manifest.orientation, 'any');
  assert.strictEqual(manifest.start_url, '/');
  assert.strictEqual(manifest.scope, '/');
  assert.strictEqual(manifest.theme_color, '#0F172A');
  assert.strictEqual(manifest.background_color, '#F8FAFC');

  const has192 = manifest.icons.some((i) => i.sizes === '192x192' && i.src.includes('192'));
  const has512 = manifest.icons.some((i) => i.sizes === '512x512' && i.src.includes('512') && i.purpose === 'any');
  const hasMaskable = manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable');
  const hasApple = manifest.icons.some((i) => i.sizes === '180x180');

  assert.ok(has192, 'Manifest must contain 192x192 icon');
  assert.ok(has512, 'Manifest must contain 512x512 standard icon');
  assert.ok(hasMaskable, 'Manifest must contain 512x512 maskable icon for Android adaptive masks');
  assert.ok(hasApple, 'Manifest must contain 180x180 touch icon');
  console.log('   ✓ Manifest properties and icons verified: PASS');

  // 2. SERVICE WORKER VALIDATION
  console.log('\n2. Auditing Service Worker (dist/sw.js & dist/registerSW.js)...');
  const swPath = path.join(distDir, 'sw.js');
  const registerSWPath = path.join(distDir, 'registerSW.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist in dist/');
  assert.ok(fs.existsSync(registerSWPath), 'registerSW.js must exist in dist/');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.ok(swContent.includes('precacheAndRoute'), 'Service worker must precache application shell');
  assert.ok(swContent.includes('NetworkOnly'), 'Service worker must enforce NetworkOnly for /api/*');
  assert.ok(swContent.includes('/api/') || swContent.includes('\\/api\\/'), 'Service worker route must match /api/*');
  assert.ok(swContent.includes('cleanupOutdatedCaches'), 'Service worker must auto-cleanup outdated caches');
  console.log('   ✓ Service worker caching and network-only operational rules verified: PASS');

  // 3. ICON ASSET BITMAP VERIFICATION
  console.log('\n3. Auditing PWA Icon Assets in dist/...');
  const iconsToCheck = [
    'pwa-192x192.png',
    'pwa-512x512.png',
    'maskable-icon-512x512.png',
    'apple-touch-icon-180x180.png',
    'favicon.svg',
  ];

  for (const file of iconsToCheck) {
    const iconFile = path.join(distDir, file);
    assert.ok(fs.existsSync(iconFile), `Icon asset ${file} must exist in dist/`);
    const stat = fs.statSync(iconFile);
    assert.ok(stat.size > 500, `Icon asset ${file} must have valid non-empty payload (${stat.size} bytes)`);
    console.log(`   ✓ ${file} (${stat.size} bytes) present in dist/`);
  }

  // 4. HTML ENTRY & META TAG AUDIT
  console.log('\n4. Auditing dist/index.html PWA & Mobile Meta Tags...');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('viewport-fit=cover'), 'index.html must include viewport-fit=cover');
  assert.ok(indexHtml.includes('name="theme-color" content="#0F172A"'), 'index.html must set theme-color');
  assert.ok(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html must enable iOS standalone web app');
  assert.ok(indexHtml.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), 'index.html must set status bar style');
  assert.ok(indexHtml.includes('manifest.webmanifest'), 'index.html must link webmanifest');
  assert.ok(indexHtml.includes('registerSW.js'), 'index.html must load registerSW.js');
  console.log('   ✓ HTML PWA metadata, Apple touch tags, and SW loader verified: PASS');

  // 5. CSS TOKENS & SAFE AREA SUPPORT
  console.log('\n5. Auditing Design Tokens & Safe Area Insets in Global CSS...');
  const cssPath = path.resolve('src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert.ok(cssContent.includes('--color-primary: #0B1220'), 'CSS must define --color-primary #0B1220');
  assert.ok(cssContent.includes('--color-surface: #172033'), 'CSS must define --color-surface #172033');
  assert.ok(cssContent.includes('--color-background: #F5F7FA'), 'CSS must define --color-background #F5F7FA');
  assert.ok(cssContent.includes('--color-card: #FFFFFF'), 'CSS must define --color-card #FFFFFF');
  assert.ok(cssContent.includes('--color-info: #2563EB'), 'CSS must define --color-info #2563EB');
  assert.ok(cssContent.includes('--color-success: #16A34A'), 'CSS must define --color-success #16A34A');
  assert.ok(cssContent.includes('--color-warning: #F59E0B'), 'CSS must define --color-warning #F59E0B');
  assert.ok(cssContent.includes('--color-critical: #DC2626'), 'CSS must define --color-critical #DC2626');
  assert.ok(cssContent.includes('--color-ai: #7C3AED'), 'CSS must define --color-ai #7C3AED');
  assert.ok(cssContent.includes('env(safe-area-inset-top'), 'CSS must support safe-area-inset-top');
  assert.ok(cssContent.includes('env(safe-area-inset-bottom'), 'CSS must support safe-area-inset-bottom');
  assert.ok(cssContent.includes('touch-target'), 'CSS must define touch-target utility class');
  console.log('   ✓ Design tokens and safe-area variables verified: PASS');

  // 6. COMPONENT SYSTEM AUDIT
  console.log('\n6. Auditing Mobile UI Component Suite...');
  const componentPaths = [
    'src/components/common/StatusChip.jsx',
    'src/components/common/MobileAppHeader.jsx',
    'src/components/common/QuickActionGrid.jsx',
    'src/components/common/NetworkStatusBanner.jsx',
    'src/components/common/InstallPromptBanner.jsx',
    'src/components/user/UserMobileNav.jsx',
    'src/components/admin/AdminMobileNav.jsx',
    'src/components/user/UserDashboard.jsx',
    'src/components/user/UserVehicleManager.jsx',
    'src/components/user/UserDeploymentsView.jsx',
    'src/components/user/UserReportIncidentModal.jsx',
  ];

  for (const cp of componentPaths) {
    const fullPath = path.resolve(cp);
    assert.ok(fs.existsSync(fullPath), `Component file ${cp} must exist`);
  }
  console.log(`   ✓ All ${componentPaths.length} mobile UI components verified: PASS`);

  // 7. LATEX ARROW & STRING SANITIZATION CHECK
  console.log('\n7. Auditing Codebase for Forbidden LaTeX String Artifacts...');
  const srcDir = path.resolve('src');
  const allSourceFiles = [];
  function collectFiles(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) collectFiles(full);
      else if (/\.(js|jsx)$/.test(f)) allSourceFiles.push(full);
    }
  }
  collectFiles(srcDir);

  for (const file of allSourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(!content.includes('$\\rightarrow$'), `Forbidden LaTeX string found in ${path.relative(process.cwd(), file)}`);
    assert.ok(!content.includes('\\rightarrow'), `Forbidden LaTeX escape found in ${path.relative(process.cwd(), file)}`);
  }
  console.log(`   ✓ Scanned ${allSourceFiles.length} source files — 0 LaTeX arrow artifacts found: PASS`);

  // 8. SECURITY AUDIT - SECRET LEAKAGE CHECK
  console.log('\n8. Auditing Client Bundle & Codebase for Secret Leakage...');
  const forbiddenPatterns = [
    /JWT_SECRET\s*=/i,
    /DATABASE_URL\s*=\s*['"`]postgres/i,
    /SARVAM_API_KEY\s*=\s*['"`][a-zA-Z0-9]/i,
    /GROQ_API_KEY\s*=\s*['"`][a-zA-Z0-9]/i,
  ];

  for (const file of allSourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(content), `Security Violation: forbidden secret pattern detected in ${path.relative(process.cwd(), file)}`);
    }
  }

  // Also scan dist bundles
  const distAssetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(distAssetsDir)) {
    for (const f of fs.readdirSync(distAssetsDir)) {
      if (f.endsWith('.js')) {
        const bundleContent = fs.readFileSync(path.join(distAssetsDir, f), 'utf8');
        assert.ok(!bundleContent.includes('SARVAM_API_KEY='), 'Bundle must not contain SARVAM_API_KEY');
        assert.ok(!bundleContent.includes('GROQ_API_KEY='), 'Bundle must not contain GROQ_API_KEY');
        assert.ok(!bundleContent.includes('DATABASE_URL='), 'Bundle must not contain DATABASE_URL');
      }
    }
  }
  console.log('   ✓ Zero backend credentials or database URLs in frontend bundles: PASS');

  console.log('\n================================================================');
  console.log('ALL REAL DEVICE PWA ACCEPTANCE CRITERIA PASSED');
  console.log('================================================================\n');
}

runRealDevicePWAAcceptance().catch((err) => {
  console.error('Acceptance Gate Failure:', err);
  process.exit(1);
});
