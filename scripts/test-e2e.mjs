/**
 * Comprehensive Automated End-to-End Integration Test Suite for Etulis on Cloudflare Workers & D1
 * Includes tests for Note Creation, Note Editing (Guest & Admin), Edit Logs, Permissions & Security.
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

    // ----------------------------------------------------
    // TEST 2: Homepage
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Homepage ---');
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, 'Homepage status 200');
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes('name="title"'), 'Title input exists');
    assert(homeHtml.includes('name="content"'), 'Textarea exists');

    let cookies = parseCookies(homeRes);
    let csrfToken = extractCsrf(homeHtml);
    assert(csrfToken.length > 0, `CSRF token extracted (${csrfToken.substring(0, 8)}...)`);

    // ----------------------------------------------------
    // TEST 3: Create Public Note (Plaintext)
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Note Creation (Public) ---');
    const note1Params = new URLSearchParams({
      _token: csrfToken,
      title: 'Catatan Awal Sebelum Diedit',
      content: 'Ini adalah paragraf awal catatan pengujian Etulis.',
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
    const slug1 = redirectUrl1.replace('/dibuat/', '');
    cookies = { ...cookies, ...parseCookies(createRes1) };

    // View public note
    const noteRes1 = await fetch(`${BASE_URL}/${slug1}`, {
      headers: { 'Cookie': cookieString(cookies) },
    });
    assert(noteRes1.status === 200, 'Public note loaded with status 200');
    const noteHtml1 = await noteRes1.text();
    assert(noteHtml1.includes('Catatan Awal Sebelum Diedit'), 'Note title rendered');
    assert(noteHtml1.includes('Ini adalah paragraf awal catatan'), 'Note content rendered');
    assert(noteHtml1.includes('Edit catatan'), 'Edit button rendered for creator');

    // ----------------------------------------------------
    // TEST 4: Guest Note Edit Feature
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Guest Note Edit Feature ---');
    const editPageRes = await fetch(`${BASE_URL}/${slug1}/edit`, {
      headers: { 'Cookie': cookieString(cookies) },
    });
    assert(editPageRes.status === 200, 'Guest edit page accessible for creator');
    const editHtml = await editPageRes.text();
    assert(editHtml.includes('Perbarui Catatan Kamu'), 'Edit header rendered');
    assert(editHtml.includes('Catatan Awal Sebelum Diedit'), 'Original title prefilled');

    const editCsrf = extractCsrf(editHtml);
    const editParams = new URLSearchParams({
      _token: editCsrf,
      _method: 'PUT',
      title: 'Catatan Sudah Diedit Oleh Guest',
      content: 'Ini adalah konten terbaru yang berhasil diubah oleh pembuat catatan secara instan.',
    });

    const editSubmitRes = await fetch(`${BASE_URL}/${slug1}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(cookies),
      },
      body: editParams.toString(),
      redirect: 'manual',
    });
    assert(editSubmitRes.status === 302, 'Guest edit submit returned 302 redirect');
    cookies = { ...cookies, ...parseCookies(editSubmitRes) };

    // Verify updated content on public view
    const updatedNoteRes = await fetch(`${BASE_URL}/${slug1}`, {
      headers: { 'Cookie': cookieString(cookies) },
    });
    const updatedHtml = await updatedNoteRes.text();
    assert(updatedHtml.includes('Catatan Sudah Diedit Oleh Guest'), 'Updated title displayed');
    assert(updatedHtml.includes('konten terbaru yang berhasil diubah'), 'Updated content displayed');
    assert(updatedHtml.includes('Diedit'), 'Updated timestamp displayed');

    // ----------------------------------------------------
    // TEST 5: Password-Protected Note & Unlock
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Protected Note & Password Edit Authorization ---');
    const homeRes2 = await fetch(`${BASE_URL}/`);
    let cookies2 = parseCookies(homeRes2);
    let csrfToken2 = extractCsrf(await homeRes2.text());

    const note2Params = new URLSearchParams({
      _token: csrfToken2,
      title: 'Catatan Sangat Rahasia',
      content: 'Isi dokumen rahasia perusahaan 123.',
      password: 'passwordRahasia99',
      expires: '1d',
    });

    const createRes2 = await fetch(`${BASE_URL}/tulis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(cookies2),
      },
      body: note2Params.toString(),
      redirect: 'manual',
    });
    const slug2 = createRes2.headers.get('location').replace('/dibuat/', '');

    // Access from a fresh session (locked)
    let freshCookies = {};
    const lockedRes = await fetch(`${BASE_URL}/${slug2}`);
    assert(lockedRes.status === 200, 'Protected note requires password');
    const lockedHtml = await lockedRes.text();
    assert(lockedHtml.includes('CATATAN TERLINDUNGI'), 'Unlock screen rendered');
    freshCookies = parseCookies(lockedRes);
    let unlockCsrf = extractCsrf(lockedHtml);

    // Try to visit /edit directly without unlocking -> should render verification prompt
    const unauthorizedEditRes = await fetch(`${BASE_URL}/${slug2}/edit`, {
      headers: { 'Cookie': cookieString(freshCookies) },
    });
    const unauthorizedEditHtml = await unauthorizedEditRes.text();
    assert(unauthorizedEditHtml.includes('VERIFIKASI AKSES EDIT'), 'Verification prompt rendered');

    // Unlock with password
    const unlockParams = new URLSearchParams({
      _token: unlockCsrf,
      password: 'passwordRahasia99',
    });
    const unlockRes = await fetch(`${BASE_URL}/${slug2}/buka`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(freshCookies),
      },
      body: unlockParams.toString(),
      redirect: 'manual',
    });
    assert(unlockRes.status === 302, 'Unlock successful with 302 redirect');
    freshCookies = { ...freshCookies, ...parseCookies(unlockRes) };

    // Now edit page should be accessible!
    const authorizedEditRes = await fetch(`${BASE_URL}/${slug2}/edit`, {
      headers: { 'Cookie': cookieString(freshCookies) },
    });
    assert(authorizedEditRes.status === 200, 'Edit accessible after unlocking');

    // ----------------------------------------------------
    // TEST 6: Admin Authentication & Dashboard
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Admin Authentication & Dashboard ---');
    const adminLoginRes = await fetch(`${BASE_URL}/backend/login`);
    assert(adminLoginRes.status === 200, 'Admin login page status 200');
    let adminCookies = parseCookies(adminLoginRes);
    let adminCsrf = extractCsrf(await adminLoginRes.text());

    let loginPassword = 'Manusiabaik1';
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
      loginPassword = 'AdminPasswordBaru123!';
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

    assert(loginRes.status === 302, 'Admin login succeeded with 302 redirect');
    adminCookies = { ...adminCookies, ...parseCookies(loginRes) };

    const dashRes = await fetch(`${BASE_URL}/backend`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert(dashRes.status === 200, 'Admin dashboard accessible');
    const dashHtml = await dashRes.text();
    assert(dashHtml.includes('Riwayat Edit'), 'Admin topbar includes Riwayat Edit link');
    assert(dashHtml.includes(`/backend/catatan/${slug1}/edit`), 'Dashboard table has Edit link for note');

    // ----------------------------------------------------
    // TEST 7: Admin Note Edit Feature
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Admin Note Edit ---');
    const adminEditRes = await fetch(`${BASE_URL}/backend/catatan/${slug1}/edit`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert(adminEditRes.status === 200, 'Admin note edit form returned 200');
    const adminEditHtml = await adminEditRes.text();
    assert(adminEditHtml.includes('Mode Admin Edit'), 'Admin edit view rendered');

    const adminEditCsrf = extractCsrf(adminEditHtml);
    const adminEditSubmitParams = new URLSearchParams({
      _token: adminEditCsrf,
      _method: 'PUT',
      title: 'Judul Diubah Oleh Administrator',
      content: 'Konten telah direvisi langsung oleh admin melalui panel administrasi.',
      slug: slug1,
      expires: 'keep',
    });

    const adminEditPostRes = await fetch(`${BASE_URL}/backend/catatan/${slug1}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString(adminCookies),
      },
      body: adminEditSubmitParams.toString(),
      redirect: 'manual',
    });
    assert(adminEditPostRes.status === 302, 'Admin edit submitted with 302 redirect');
    adminCookies = { ...adminCookies, ...parseCookies(adminEditPostRes) };

    // ----------------------------------------------------
    // TEST 8: Admin Riwayat Edit (Edit Logs & Diff View)
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Admin Riwayat Edit (Logs & History) ---');
    const logsRes = await fetch(`${BASE_URL}/backend/riwayat-edit`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    assert(logsRes.status === 200, 'Riwayat edit page status 200');
    const logsHtml = await logsRes.text();
    assert(logsHtml.includes('Riwayat Edit'), 'Riwayat edit heading rendered');
    assert(logsHtml.includes('Total Riwayat Edit'), 'Stats cards rendered');
    assert(logsHtml.includes('Admin'), 'Admin editor badge rendered in table');
    assert(logsHtml.includes('Guest'), 'Guest editor badge rendered in table');
    assert(logsHtml.includes('Bandingkan'), 'Diff comparison button rendered');
    assert(logsHtml.includes('Judul Sebelumnya') || logsHtml.includes('Isi Teks Sebelumnya'), 'Diff comparison modal contents present');

    // Check Note Detail View for Riwayat Edit Section
    const noteDetailRes = await fetch(`${BASE_URL}/backend/catatan/${slug1}`, {
      headers: { 'Cookie': cookieString(adminCookies) },
    });
    const noteDetailHtml = await noteDetailRes.text();
    assert(noteDetailHtml.includes('Riwayat Edit Catatan Ini'), 'Edit history section rendered on note detail');
    assert(noteDetailHtml.includes('Lihat Perubahan'), 'Per-note diff modal button rendered');

    // ----------------------------------------------------
    // TEST 9: Admin Delete Note
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Admin Note Deletion ---');
    const deleteCsrf = extractCsrf(noteDetailHtml);
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
