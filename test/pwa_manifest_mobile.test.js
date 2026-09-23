import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

/**
 * PWA Manifest, Mobile Shell & Security Acceptance Test
 */
async function runPWAAcceptanceTests() {
  console.log('====================================================');
  console.log('TEST SUITE: PROJECT BRAHMAPUTRA PWA & MOBILE SHELL');
  console.log('====================================================\n');

  // Test 1: Icon Assets Exist & Valid Sizes
  console.log('1. Validating PWA Icon Assets in public/...');
  const expectedIcons = [
    { name: 'pwa-192x192.png', minSize: 5000 },
    { name: 'pwa-512x512.png', minSize: 10000 },
    { name: 'maskable-icon-512x512.png', minSize: 10000 },
    { name: 'apple-touch-icon-180x180.png', minSize: 5000 },
    { name: 'favicon.svg', minSize: 200 },
  ];

  for (const icon of expectedIcons) {
    const iconPath = path.resolve('public', icon.name);
    assert.ok(fs.existsSync(iconPath), `Icon asset ${icon.name} must exist in public/`);
    const stat = fs.statSync(iconPath);
    assert.ok(stat.size >= icon.minSize, `Icon asset ${icon.name} size (${stat.size}B) must exceed ${icon.minSize}B`);
    console.log(`   ✓ ${icon.name} (${stat.size} bytes)`);
  }

  // Test 2: vite.config.js Manifest Configuration
  console.log('\n2. Validating vite.config.js PWA Manifest Configuration...');
  const viteConfigPath = path.resolve('vite.config.js');
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');

  assert.ok(viteConfigContent.includes('VitePWA'), 'vite.config.js must import and configure VitePWA');
  assert.ok(viteConfigContent.includes("name: 'Project Brahmaputra — NER Smart Logistics'"), 'Manifest name must match specification');
  assert.ok(viteConfigContent.includes("short_name: 'Brahmaputra'"), 'Manifest short_name must be Brahmaputra');
  assert.ok(viteConfigContent.includes("display: 'standalone'"), 'Manifest display mode must be standalone');
  assert.ok(viteConfigContent.includes("theme_color: '#0F172A'"), 'Manifest theme_color must match GovTech brand token #0F172A');
  assert.ok(viteConfigContent.includes("background_color: '#F8FAFC'"), 'Manifest background_color must match canvas #F8FAFC');
  assert.ok(viteConfigContent.includes("start_url: '/'"), 'Manifest start_url must be /');
  assert.ok(viteConfigContent.includes("scope: '/'"), 'Manifest scope must be /');
  assert.ok(viteConfigContent.includes('maskable-icon-512x512.png'), 'Manifest must include maskable icon');
  console.log('   ✓ Manifest properties: name, short_name, standalone, theme_color, start_url verified');

  // Test 3: Service Worker Caching Policy
  console.log('\n3. Validating Conservative Service Worker & API Network-Only Caching...');
  assert.ok(viteConfigContent.includes('NetworkOnly'), 'API runtime caching must be NetworkOnly');
  assert.ok(viteConfigContent.includes('/^\\/api\\/.*$/'), 'API pattern must cover /api/* routes');
  console.log('   ✓ Caching rule verified: /api/* is strictly Network-Only');

  // Test 4: index.html PWA and Apple Mobile Web App Metadata
  console.log('\n4. Validating index.html PWA and Mobile Viewport Metadata...');
  const indexPath = path.resolve('index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  assert.ok(indexContent.includes('viewport-fit=cover'), 'Viewport must contain viewport-fit=cover for safe area insets');
  assert.ok(indexContent.includes('name="theme-color" content="#0F172A"'), 'index.html must specify theme-color #0F172A');
  assert.ok(indexContent.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html must enable apple-mobile-web-app-capable');
  assert.ok(indexContent.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), 'index.html must specify status bar style');
  assert.ok(indexContent.includes('rel="apple-touch-icon"'), 'index.html must link apple-touch-icon');
  console.log('   ✓ Viewport, Apple Mobile Web App, and theme meta tags verified');

  // Test 5: Global CSS Safe Area Support
  console.log('\n5. Validating Global CSS Safe Area Insets & Touch Target Classes...');
  const cssPath = path.resolve('src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('env(safe-area-inset-bottom'), 'index.css must include safe-area-inset-bottom support');
  assert.ok(cssContent.includes('env(safe-area-inset-top'), 'index.css must include safe-area-inset-top support');
  assert.ok(cssContent.includes('touch-target'), 'index.css must include touch-target minimum sizing class');
  assert.ok(cssContent.includes('-webkit-tap-highlight-color: transparent'), 'index.css must disable mobile tap highlight flashing');
  console.log('   ✓ Safe area variables and touch target rules verified');

  // Test 6: Mobile Navigation Components
  console.log('\n6. Validating Mobile Navigation & Shell Components...');
  const mobileNavPath = path.resolve('src', 'components', 'user', 'UserMobileNav.jsx');
  const networkBannerPath = path.resolve('src', 'components', 'common', 'NetworkStatusBanner.jsx');
  const installBannerPath = path.resolve('src', 'components', 'common', 'InstallPromptBanner.jsx');

  assert.ok(fs.existsSync(mobileNavPath), 'UserMobileNav.jsx must exist');
  assert.ok(fs.existsSync(networkBannerPath), 'NetworkStatusBanner.jsx must exist');
  assert.ok(fs.existsSync(installBannerPath), 'InstallPromptBanner.jsx must exist');

  const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf8');
  assert.ok(mobileNavContent.includes('pb-safe'), 'UserMobileNav must utilize pb-safe');
  assert.ok(mobileNavContent.includes('OVERVIEW') && mobileNavContent.includes('VEHICLES') && mobileNavContent.includes('DEPLOYMENTS') && mobileNavContent.includes('ROUTES'), 'UserMobileNav must support all 4 primary destinations');
  console.log('   ✓ UserMobileNav, NetworkStatusBanner, and InstallPromptBanner verified');

  // Test 7: Security Audit - Frontend Bundle Secret Immunity
  console.log('\n7. Auditing Frontend Code for Leaked Secrets...');
  const srcDir = path.resolve('src');
  const allFiles = [];
  function scanDir(dir) {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) scanDir(full);
      else if (/\.(js|jsx|css|html)$/.test(file)) allFiles.push(full);
    }
  }
  scanDir(srcDir);

  const forbiddenPatterns = [
    /JWT_SECRET\s*=/i,
    /DATABASE_URL\s*=\s*['"`]postgres/i,
    /SARVAM_API_KEY\s*=\s*['"`][a-zA-Z0-9]/i,
    /GROQ_API_KEY\s*=\s*['"`][a-zA-Z0-9]/i,
  ];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(content), `Security Violation: forbidden secret pattern detected in ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(`   ✓ Scanned ${allFiles.length} frontend source files — 0 secrets or sensitive tokens leaked`);

  console.log('\n====================================================');
  console.log('ALL PWA & MOBILE CONVERSION TESTS PASSED');
  console.log('====================================================\n');
}

runPWAAcceptanceTests().catch((err) => {
  console.error('PWA Test Failure:', err);
  process.exit(1);
});
