/**
 * Comprehensive Automated End-to-End Integration Test Suite for Etulis on Cloudflare Workers & D1
 */

const BASE_URL = 'http://127.0.0.1:8787';

function parseCookies(response) {
  const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean);
  const cookies = {};
  for (const header of setCookieHeaders) {
    const parts = header.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return cookies;
}

function cookieString(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractCsrf(html) {
  const match = html.match(/name="_token"\s+value="([^"]+)"/) || html.match(/name="csrf-token"\s+content="([^"]+)"/);
  return match ? match[1] : '';
}

async function runTests() {
  console.log('🚀 Starting Etulis Cloudflare Workers E2E Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Static Assets
    // ----------------------------------------------------
    console.log('--- 1. Testing Static Assets & Vite Output ---');
    const cssRes = await fetch(`${BASE_URL}/dist/assets/style.css`);
    assert(cssRes.status === 200, 'style.css loaded with status 200');
    assert(cssRes.headers.get('content-type')?.includes('text/css'), 'style.css has CSS content-type');

    const jsRes = await fetch(`${BASE_URL}/dist/assets/app.js`);
    assert(jsRes.status === 200, 'app.js loaded with status 200');

    const brandImgRes = await fetch(`${BASE_URL}/images/brand/etulis.png`);
    assert(brandImgRes.status === 200, 'Brand image etulis.png loaded with status 200');

    const adImgRes = await fetch(`${BASE_URL}/images/ads/ads1.png`);
    assert(adImgRes.status === 200, 'Ad image ads1.png loaded with status 200');

    // ----------------------------------------------------
    // TEST 2: Homepage
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Homepage ---');
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, 'Homepage status 200');
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes('etulis — tulis, bagikan, selesai'), 'Homepage title rendered');
    assert(homeHtml.includes('name="title"'), 'Title input exists');
    assert(homeHtml.includes('name="content"'), 'Textarea exists');
    assert(homeHtml.includes('options-guest'), 'Guest options rendered');
    assert(homeHtml.includes('side-promotion'), 'Promotion aside rendered');

    let cookies = parseCookies(homeRes);
    let csrfToken = extractCsrf(homeHtml);
    assert(csrfToken.length > 0, `CSRF token extracted (${csrfToken.substring(0, 8)}...)`);

    // ----------------------------------------------------
    // TEST 3: Create Public Note (Plaintext)
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Note Creation (Public) ---');
    const note1Params = new URLSearchParams({
      _token: csrfToken,
      title: 'Catatan Uji Coba Cloudflare',
      content: 'Halo dunia! Ini adalah catatan pengujian Etulis di Cloudflare Workers dan D1.',
      expires: '',
      password: '',
    });

    const createRes1 = await fetch(`${BASE_URL}/tulis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(cookies),
      },
      body: note1Params.toString(),
      redirect: 'manual',
    });

    assert(createRes1.status === 302, 'Create note returned 302 redirect');
    const redirectUrl1 = createRes1.headers.get('location');
    assert(redirectUrl1 && redirectUrl1.startsWith('/dibuat/'), `Redirected to created page: ${redirectUrl1}`);

    const slug1 = redirectUrl1.replace('/dibuat/', '');
    cookies = { ...cookies, ...parseCookies(createRes1) };

    // View created page
    const createdRes1 = await fetch(`${BASE_URL}${redirectUrl1}`, {
      headers: { 'Cookie': cookieString(cookies) },
    });
    assert(createdRes1.status === 200, 'Created page loaded with status 200');
    const createdHtml1 = await createdRes1.text();
    assert(createdHtml1.includes('CATATAN BERHASIL DITERBITKAN'), 'Success headline rendered');
    assert(createdHtml1.includes(slug1), 'Public link contains slug');
    assert(!createdHtml1.includes('TAUTAN PENGELOLAAN'), 'Manage link is removed as requested');

    // ----------------------------------------------------
    // TEST 4: View Public Note
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Public Note View ---');
    const noteRes1 = await fetch(`${BASE_URL}/${slug1}`);
    assert(noteRes1.status === 200, 'Public note loaded with status 200');
    const noteHtml1 = await noteRes1.text();
    assert(noteHtml1.includes('Catatan Uji Coba Cloudflare'), 'Note title rendered');
    assert(noteHtml1.includes('Halo dunia! Ini adalah catatan pengujian'), 'Note content rendered');
    assert(noteHtml1.includes('1 kali dilihat'), 'View counter shows 1 view');

    // Refresh to check view increment
    const noteRes1b = await fetch(`${BASE_URL}/${slug1}`);
    const noteHtml1b = await noteRes1b.text();
    assert(noteHtml1b.includes('2 kali dilihat'), 'View counter incremented to 2 views');

    // ----------------------------------------------------
    // TEST 5: Create Protected Note with Password
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Protected Note (With Password) ---');
    const homeRes2 = await fetch(`${BASE_URL}/`);
    cookies = parseCookies(homeRes2);
    csrfToken = extractCsrf(await homeRes2.text());

    const note2Params = new URLSearchParams({
      _token: csrfToken,
      title: 'Catatan Rahasia',
      content: 'Isi sangat rahasia dan aman.',
      password: 'rahasia123',
      expires: '1d',
    });

    const createRes2 = await fetch(`${BASE_URL}/tulis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(cookies),
      },
      body: note2Params.toString(),
      redirect: 'manual',
    });

    assert(createRes2.status === 302, 'Created protected note redirected 302');
    const slug2 = createRes2.headers.get('location').replace('/dibuat/', '');

    // Access note from new clean session (locked state)
    const lockedRes = await fetch(`${BASE_URL}/${slug2}`);
    assert(lockedRes.status === 200, 'Protected note returns 200 with unlock form');
    const lockedHtml = await lockedRes.text();
    assert(lockedHtml.includes('CATATAN TERLINDUNGI'), 'Unlock shield header rendered');
    assert(!lockedHtml.includes('Isi sangat rahasia'), 'Secret content is NOT revealed in HTML');

    let unlockCookies = parseCookies(lockedRes);
    let unlockCsrf = extractCsrf(lockedHtml);

    // Try wrong password
    const unlockWrongParams = new URLSearchParams({
      _token: unlockCsrf,
      password: 'wrongpassword',
    });
    const unlockWrongRes = await fetch(`${BASE_URL}/${slug2}/buka`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(unlockCookies),
      },
      body: unlockWrongParams.toString(),
      redirect: 'manual',
    });
    assert(unlockWrongRes.status === 302, 'Wrong password returned 302 redirect back');
    unlockCookies = { ...unlockCookies, ...parseCookies(unlockWrongRes) };

    const unlockWrongFollow = await fetch(`${BASE_URL}/${slug2}`, {
      headers: { 'Cookie': cookieString(unlockCookies) },
    });
    const unlockWrongHtml = await unlockWrongFollow.text();
    assert(unlockWrongHtml.includes('Password yang dimasukkan salah.'), 'Wrong password error message shown');

    // Try correct password
    unlockCsrf = extractCsrf(unlockWrongHtml);
    const unlockCorrectParams = new URLSearchParams({
      _token: unlockCsrf,
      password: 'rahasia123',
    });
    const unlockCorrectRes = await fetch(`${BASE_URL}/${slug2}/buka`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(unlockCookies),
      },
      body: unlockCorrectParams.toString(),
      redirect: 'manual',
    });
    assert(unlockCorrectRes.status === 302, 'Correct password redirected 302 to note');
    unlockCookies = { ...unlockCookies, ...parseCookies(unlockCorrectRes) };

    const unlockedRes = await fetch(`${BASE_URL}/${slug2}`, {
      headers: { 'Cookie': cookieString(unlockCookies) },
    });
    const unlockedHtml = await unlockedRes.text();
    assert(unlockedHtml.includes('Isi sangat rahasia dan aman.'), 'Secret content revealed after unlock');

    // ----------------------------------------------------
    // TEST 6: Manage Note Password via Token
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Manage Password via Token ---');
    const manageRes = await fetch(`${BASE_URL}/kelola/${slug1}/${manageToken1}`);
    assert(manageRes.status === 200, 'Manage page loaded with status 200');
    const manageHtml = await manageRes.text();
    assert(manageHtml.includes('KELOLA CATATAN'), 'Manage header rendered');

    let manageCookies = parseCookies(manageRes);
    let manageCsrf = extractCsrf(manageHtml);

    // Set a new password via manage token
    const updatePwdParams = new URLSearchParams({
      _token: manageCsrf,
      _method: 'PUT',
      password: 'passwordBaru456',
      password_confirmation: 'passwordBaru456',
    });

    const updatePwdRes = await fetch(`${BASE_URL}/kelola/${slug1}/${manageToken1}/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(manageCookies),
      },
      body: updatePwdParams.toString(),
      redirect: 'manual',
    });
    assert(updatePwdRes.status === 302, 'Password update via token returned 302');
    manageCookies = { ...manageCookies, ...parseCookies(updatePwdRes) };

    const manageSuccessRes = await fetch(`${BASE_URL}/kelola/${slug1}/${manageToken1}`, {
      headers: { 'Cookie': cookieString(manageCookies) },
    });
    const manageSuccessHtml = await manageSuccessRes.text();
    assert(manageSuccessHtml.includes('Password catatan berhasil diubah.'), 'Success alert rendered');

    // ----------------------------------------------------
    // TEST 7: Admin Authentication & Dashboard
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Admin Authentication & Dashboard ---');
    const adminLoginRes = await fetch(`${BASE_URL}/backend/login`);
    assert(adminLoginRes.status === 200, 'Admin login page status 200');
    const adminLoginHtml = await adminLoginRes.text();
    assert(adminLoginHtml.includes('AKSES ADMIN'), 'Admin login heading rendered');

    let adminCookies = parseCookies(adminLoginRes);
    let adminCsrf = extractCsrf(adminLoginHtml);

    // Try current password or default
    let loginPassword = 'AdminPasswordBaru123!';
    let loginParams = new URLSearchParams({
      _token: adminCsrf,
      username: 'admin',
      password: loginPassword,
    });

    let loginRes = await fetch(`${BASE_URL}/backend/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(adminCookies),
      },
      body: loginParams.toString(),
      redirect: 'manual',
    });

    if (!loginRes.headers.get('location')?.endsWith('/backend')) {
      // Fallback to default
      loginPassword = 'Manusiabaik1';
      adminCookies = { ...adminCookies, ...parseCookies(loginRes) };
      const retryHtml = await (await fetch(`${BASE_URL}/backend/login`, { headers: { Cookie: cookieString(adminCookies) } })).text();
      adminCsrf = extractCsrf(retryHtml);

      loginParams = new URLSearchParams({
        _token: adminCsrf,
        username: 'admin',
        password: loginPassword,
      });

      loginRes = await fetch(`${BASE_URL}/backend/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieString(adminCookies),
        },
        body: loginParams.toString(),
        redirect: 'manual',
      });
    }

    assert(loginRes.status === 302, 'Admin login returned 302 redirect');
    assert(loginRes.headers.get('location')?.endsWith('/backend'), 'Redirected to /backend');
    adminCookies = { ...adminCookies, ...parseCookies(loginRes) };

    // View admin dashboard
    const dashRes = await fetch(`${BASE_URL}/backend`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert(dashRes.status === 200, 'Admin dashboard status 200');
    const dashHtml = await dashRes.text();
    assert(dashHtml.includes('ADMIN DASHBOARD'), 'Admin dashboard header rendered');
    assert(dashHtml.includes('Total catatan'), 'Stats card Total Catatan rendered');
    assert(dashHtml.includes('Total dilihat'), 'Stats card Total Dilihat rendered');
    assert(dashHtml.includes('Semua catatan'), 'Notes table rendered');
    assert(dashHtml.includes(slug1), 'Created note slug present in admin table');

    // Test search
    const searchRes = await fetch(`${BASE_URL}/backend?q=Rahasia`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    const searchHtml = await searchRes.text();
    assert(searchHtml.includes('Catatan Rahasia'), 'Search found matching note');

    // Admin note detail
    const adminShowRes = await fetch(`${BASE_URL}/backend/catatan/${slug1}`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert(adminShowRes.status === 200, 'Admin note detail loaded 200');
    const adminShowHtml = await adminShowRes.text();
    assert(adminShowHtml.includes('Detail catatan'), 'Detail navigation rendered');

    // Admin change own password
    const adminPwdPageRes = await fetch(`${BASE_URL}/backend/pengaturan/password`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert(adminPwdPageRes.status === 200, 'Admin change password page status 200');
    const adminPwdHtml = await adminPwdPageRes.text();
    let adminPwdCsrf = extractCsrf(adminPwdHtml);

    const nextAdminPassword = loginPassword === 'Manusiabaik1' ? 'AdminPasswordBaru123!' : 'Manusiabaik1';
    const changeAdminPwdParams = new URLSearchParams({
      _token: adminPwdCsrf,
      _method: 'PUT',
      current_password: loginPassword,
      password: nextAdminPassword,
      password_confirmation: nextAdminPassword,
    });

    const changeAdminPwdRes = await fetch(`${BASE_URL}/backend/pengaturan/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(adminCookies),
      },
      body: changeAdminPwdParams.toString(),
      redirect: 'manual',
    });
    assert(changeAdminPwdRes.status === 302, 'Admin change password returned 302 redirect');
    adminCookies = { ...adminCookies, ...parseCookies(changeAdminPwdRes) };

    const pwdSuccessRes = await fetch(`${BASE_URL}/backend/pengaturan/password`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert((await pwdSuccessRes.text()).includes('Password berhasil diubah.'), 'Password change success message shown');

    // Admin delete note test
    console.log('\n--- 8. Testing Admin Note Deletion ---');
    const deleteDashHtml = await (await fetch(`${BASE_URL}/backend/catatan/${slug1}`, { headers: { Cookie: cookieString(adminCookies) } })).text();
    const deleteCsrf = extractCsrf(deleteDashHtml);

    const deleteParams = new URLSearchParams({
      _token: deleteCsrf,
      _method: 'DELETE',
    });
    const deleteRes = await fetch(`${BASE_URL}/backend/catatan/${slug1}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(adminCookies),
      },
      body: deleteParams.toString(),
      redirect: 'manual',
    });
    assert(deleteRes.status === 302, 'Delete note returned 302 redirect');

    // Verify deleted note is gone (404)
    const deletedCheckRes = await fetch(`${BASE_URL}/${slug1}`);
    assert(deletedCheckRes.status === 404, 'Deleted note returns 404 Not Found');

    // ----------------------------------------------------
    // TEST 9: XSS Prevention & Escaping Test
    // ----------------------------------------------------
    console.log('\n--- 9. Testing XSS Prevention & Escaping ---');
    const xssParams = new URLSearchParams({
      _token: csrfToken,
      title: '<script>alert("xss")</script>',
      content: '<img src=x onerror=alert(1)> <b>test</b>',
      password: '',
      expires: '',
    });

    const xssCreateRes = await fetch(`${BASE_URL}/tulis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(cookies),
      },
      body: xssParams.toString(),
      redirect: 'manual',
    });

    const xssSlug = xssCreateRes.headers.get('location').replace('/dibuat/', '');
    const xssNoteRes = await fetch(`${BASE_URL}/${xssSlug}`);
    const xssHtml = await xssNoteRes.text();
    assert(!xssHtml.includes('<script>alert("xss")</script>'), 'Unescaped script tag is NOT in HTML');
    assert(xssHtml.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), 'Script tag is safely HTML-escaped');
    assert(xssHtml.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Malicious img tag is safely HTML-escaped');

    // ----------------------------------------------------
    // TEST 10: 404 Route Safety Test
    // ----------------------------------------------------
    console.log('\n--- 10. Testing Route Safety & 404 Handler ---');
    const notFoundRes = await fetch(`${BASE_URL}/random-non-existent-note-slug-999`);
    assert(notFoundRes.status === 404, 'Non-existent slug returns 404');
    const notFoundHtml = await notFoundRes.text();
    assert(notFoundHtml.includes('Catatan Tidak Ditemukan'), 'Friendly 404 message rendered');

    // ----------------------------------------------------
    // TEST SUMMARY
    // ----------------------------------------------------
    console.log(`\n===========================================`);
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

runTests();
