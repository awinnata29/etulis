import assert from 'node:assert';

const BASE_URL = 'http://127.0.0.1:8787';

async function runTest() {
  console.log('Testing Promotional Chat Widget on etulis...');

  // 1. Homepage
  const resHome = await fetch(`${BASE_URL}/`);
  assert.strictEqual(resHome.status, 200, 'Homepage should return 200');
  const homeHtml = await resHome.text();

  assert(homeHtml.includes('id="promo-popup-card"'), 'Homepage must contain #promo-popup-card');
  assert(homeHtml.includes('https://t.me/akundigitalidbot'), 'Homepage must contain Telegram bot URL https://t.me/akundigitalidbot');
  assert(homeHtml.includes('id="promo-close-btn"'), 'Homepage must contain close button');
  assert(homeHtml.includes('id="promo-floating-trigger"'), 'Homepage must contain floating trigger');
  assert(homeHtml.includes('Bot Auto Order'), 'Homepage must contain Bot Auto Order title');
  assert(homeHtml.includes('ChatGPT, Gemini, Canva'), 'Homepage must contain app premium list message');
  console.log('✅ Homepage includes updated Bot Auto Order chat widget & launcher');

  // 2. Static CSS
  const resCss = await fetch(`${BASE_URL}/dist/assets/style.css`);
  assert.strictEqual(resCss.status, 200, 'CSS should return 200');
  const cssText = await resCss.text();
  assert(cssText.includes('.promo-widget-container'), 'CSS must include .promo-widget-container');
  assert(cssText.includes('.promo-widget-card'), 'CSS must include .promo-widget-card');
  assert(cssText.includes('.promo-widget-launcher'), 'CSS must include .promo-widget-launcher');
  console.log('✅ CSS includes widget container and launcher styles');

  // 3. Static JS
  const resJs = await fetch(`${BASE_URL}/dist/assets/app.js`);
  assert.strictEqual(resJs.status, 200, 'JS should return 200');
  const jsText = await resJs.text();
  assert(jsText.includes('promo-popup-card'), 'JS must reference promo-popup-card');
  assert(jsText.includes('promo-floating-trigger'), 'JS must reference promo-floating-trigger');
  console.log('✅ JS includes promo widget toggle and dismissal logic');

  // 4. Admin page should NOT show promotion
  const resAdmin = await fetch(`${BASE_URL}/backend/login`);
  assert.strictEqual(resAdmin.status, 200, 'Admin login should return 200');
  const adminHtml = await resAdmin.text();
  assert(!adminHtml.includes('id="promo-popup-card"'), 'Admin login must NOT show promotional widget');
  console.log('✅ Admin login page correctly excludes promotional widget');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
