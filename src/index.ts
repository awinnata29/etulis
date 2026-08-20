import { Hono } from 'hono';
import { Env, Note, SessionData } from './types';
import {
  generateSecureSlug,
  generateSecureToken,
  hashPassword,
  verifyPassword,
} from './utils/crypto';
import { computeDiffSummary, isDatePast } from './utils/format';
import { checkRateLimit, getClientIp } from './utils/rateLimit';
import { getSession, saveSession, validateCsrf } from './utils/session';
import {
  bootstrapAdminAccount,
  createEditLog,
  createNote,
  deleteNote,
  getAdminAccountById,
  getAdminAccountByUsername,
  getAdminEditLogs,
  getAdminEditLogStats,
  getAdminNotes,
  getAdminStats,
  getEditLogsByNoteId,
  getNoteById,
  getNoteBySlug,
  incrementNoteViews,
  isSlugTaken,
  updateAdminPassword,
  updateNoteContent,
  updateNotePassword,
} from './services/db';

// Views
import { renderHome } from './views/home';
import { renderCreated } from './views/created';
import { renderNote } from './views/note';
import { renderEdit } from './views/edit';
import { renderUnlock } from './views/unlock';
import { renderManage } from './views/manage';
import { renderNotePassword } from './views/note-password';
import { renderAdminLogin } from './views/admin/login';
import { renderAdminDashboard } from './views/admin/dashboard';
import { renderAdminShow } from './views/admin/show';
import { renderAdminEdit } from './views/admin/edit';
import { renderAdminLogs } from './views/admin/logs';
import { renderAdminPassword } from './views/admin/password';
import { renderLayout } from './views/layout';

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error('Unhandled Application Error:', err);
  const content = `
<section class="created-page wrap" style="text-align:center; padding: 100px 0;">
  <h1 style="font-size: 64px; margin-bottom: 12px; color: var(--danger);">500</h1>
  <h2 style="font-size: 24px; margin-bottom: 20px; color: var(--ink);">Terjadi Kesalahan</h2>
  <p style="color: var(--muted); margin-bottom: 30px;">Sistem mengalami kendala saat memproses permintaan. Silakan refresh halaman.</p>
  <a class="btn" href="/">Kembali ke Beranda</a>
</section>
`;
  return c.html(renderLayout(content, { title: '500 - Error', noIndex: true }), 500);
});

// Helper to get admin path prefix
function getAdminPath(c: any): string {
  const p = c.env.ADMIN_PATH || 'backend';
  return p.replace(/^\/+|\/+$/g, '');
}

// Reserved system slugs that should not be matched by /:slug
const RESERVED_SLUGS = new Set([
  'tulis',
  'dibuat',
  'kelola',
  'admin',
  'backend',
  'api',
  'dist',
  'assets',
  'images',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

// Friendly 404 page
function render404(): string {
  const content = `
<section class="created-page wrap" style="text-align:center; padding: 100px 0;">
  <h1 style="font-size: 64px; margin-bottom: 12px; color: var(--ink);">404</h1>
  <h2 style="font-size: 24px; margin-bottom: 20px; color: var(--muted);">Catatan Tidak Ditemukan</h2>
  <p style="color: var(--muted); margin-bottom: 30px;">Halaman atau catatan yang kamu cari tidak ada atau tautan salah.</p>
  <a class="btn" href="/">Kembali ke Beranda</a>
</section>
`;
  return renderLayout(content, { title: '404 - Tidak Ditemukan' });
}

// Friendly 410 Expired page
function render410(): string {
  const content = `
<section class="created-page wrap" style="text-align:center; padding: 100px 0;">
  <h1 style="font-size: 64px; margin-bottom: 12px; color: var(--danger);">410</h1>
  <h2 style="font-size: 24px; margin-bottom: 20px; color: var(--ink);">Catatan Sudah Kedaluwarsa</h2>
  <p style="color: var(--muted); margin-bottom: 30px;">Catatan ini telah melewati batas masa aktifnya dan tidak dapat diakses lagi.</p>
  <a class="btn" href="/">Buat Catatan Baru</a>
</section>
`;
  return renderLayout(content, { title: '410 - Catatan Kedaluwarsa' });
}

// ----------------------------------------------------
// SEO: SITEMAP & ROBOTS
// ----------------------------------------------------

app.get('/sitemap.xml', (c) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://etulis.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  return c.text(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  });
});

app.get('/robots.txt', (c) => {
  const robots = `User-agent: *
Allow: /
Allow: /dist/
Allow: /images/
Disallow: /backend/
Disallow: /kelola/

Sitemap: https://etulis.com/sitemap.xml
`;
  return c.text(robots, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  });
});

// ----------------------------------------------------
// 1. HOME & CREATE NOTE
// ----------------------------------------------------

app.get('/', async (c) => {
  const session = await getSession(c);
  const flash = session.flash || {};

  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  const html = renderHome({
    csrfToken: session.csrfToken!,
    isAdmin: !!session.admin,
    error: flash.error,
    old: flash.old,
  });

  return c.html(html);
});

app.post('/tulis', async (c) => {
  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  // Rate limiting (max 20 note creations / min)
  const rate = checkRateLimit(`create:${ip}`, 20, 60_000);
  if (!rate.allowed) {
    session.flash = { error: 'Terlalu banyak permintaan. Silakan tunggu sebentar.' };
    await saveSession(c, session);
    return c.redirect('/');
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();

  if (!validateCsrf(session, csrfToken)) {
    session.flash = { error: 'Sesi telah kedaluwarsa. Silakan coba lagi.' };
    await saveSession(c, session);
    return c.redirect('/');
  }

  const title = formData.get('title')?.toString().trim() || null;
  const content = formData.get('content')?.toString() || '';
  const customSlug = formData.get('slug')?.toString().trim().toLowerCase() || null;
  const password = formData.get('password')?.toString() || null;
  const expires = formData.get('expires')?.toString() || null;

  // Validation
  if (!content.trim()) {
    session.flash = {
      error: 'Tulis sesuatu terlebih dahulu.',
      old: { title: title || '', content, slug: customSlug || '' },
    };
    await saveSession(c, session);
    return c.redirect('/');
  }

  if (content.length > 100_000) {
    session.flash = {
      error: 'Isi catatan maksimal 100.000 karakter.',
      old: { title: title || '', content, slug: customSlug || '' },
    };
    await saveSession(c, session);
    return c.redirect('/');
  }

  if (title && title.length > 120) {
    session.flash = {
      error: 'Judul catatan maksimal 120 karakter.',
      old: { title, content, slug: customSlug || '' },
    };
    await saveSession(c, session);
    return c.redirect('/');
  }

  if (password && (password.length < 4 || password.length > 100)) {
    session.flash = {
      error: 'Password catatan minimal 4 dan maksimal 100 karakter.',
      old: { title: title || '', content, slug: customSlug || '' },
    };
    await saveSession(c, session);
    return c.redirect('/');
  }

  // Slug generation / validation
  let slug = '';
  if (session.admin && customSlug) {
    if (!/^[a-z0-9-_]{3,50}$/.test(customSlug) || RESERVED_SLUGS.has(customSlug)) {
      session.flash = {
        error: 'Tautan khusus tidak valid (hanya huruf, angka, tanda hubung, 3-50 karakter).',
        old: { title: title || '', content, slug: customSlug },
      };
      await saveSession(c, session);
      return c.redirect('/');
    }

    const taken = await isSlugTaken(c.env.DB, customSlug);
    if (taken) {
      session.flash = {
        error: 'Tautan khusus ini sudah digunakan.',
        old: { title: title || '', content, slug: customSlug },
      };
      await saveSession(c, session);
      return c.redirect('/');
    }
    slug = customSlug;
  } else {
    // Generate secure random slug
    let attempts = 0;
    do {
      slug = generateSecureSlug(7);
      attempts++;
      if (attempts > 10) slug = generateSecureSlug(10);
    } while (await isSlugTaken(c.env.DB, slug));
  }

  // Expiration calculation
  let expiresAt: string | null = null;
  const nowMs = Date.now();
  if (expires === '1h') {
    expiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();
  } else if (expires === '1d') {
    expiresAt = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
  } else if (expires === '7d') {
    expiresAt = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expires === '30d') {
    expiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Manage token & Password hashing with PBKDF2 WebCrypto
  const rawManageToken = generateSecureToken(24); // 48 chars
  const hashedManageToken = await hashPassword(rawManageToken);
  const hashedPassword = password ? await hashPassword(password) : null;

  const note = await createNote(c.env.DB, {
    title,
    slug,
    content,
    password: hashedPassword,
    manage_token: hashedManageToken,
    expires_at: expiresAt,
  });

  if (!session.manageTokens) session.manageTokens = {};
  session.manageTokens[note.id] = rawManageToken;
  session.flash = { manage_token: rawManageToken };
  await saveSession(c, session);

  return c.redirect(`/dibuat/${note.slug}`);
});

app.get('/dibuat/:slug', async (c) => {
  const slug = c.req.param('slug');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note) return c.html(render404(), 404);

  const session = await getSession(c);
  const manageToken = session.flash?.manage_token || session.manageTokens?.[note.id] || null;

  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  const url = new URL(c.req.url);
  const origin = `${url.protocol}//${url.host}`;

  const html = renderCreated({
    note,
    origin,
    manageToken,
    csrfToken: session.csrfToken,
  });

  return c.html(html);
});

// ----------------------------------------------------
// 2. MANAGE NOTE VIA TOKEN
// ----------------------------------------------------

app.get('/kelola/:slug/:token', async (c) => {
  const slug = c.req.param('slug');
  const token = c.req.param('token');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note || !note.manage_token) return c.html(render404(), 404);

  const isValid = await verifyPassword(token, note.manage_token);
  if (!isValid) return c.html(render404(), 404);

  const session = await getSession(c);
  if (!session.manageTokens) session.manageTokens = {};
  session.manageTokens[note.id] = token;

  const flash = session.flash || {};
  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  const html = renderManage({
    note,
    token,
    csrfToken: session.csrfToken!,
    success: flash.success,
    error: flash.error,
  });

  return c.html(html);
});

async function handleManagePasswordUpdate(c: any) {
  const slug = c.req.param('slug');
  const token = c.req.param('token');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note || !note.manage_token) return c.html(render404(), 404);

  const isValid = await verifyPassword(token, note.manage_token);
  if (!isValid) return c.html(render404(), 404);

  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  const rate = checkRateLimit(`manage-pwd:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    session.flash = { error: 'Terlalu banyak percobaan. Silakan coba lagi sebentar lagi.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}`);
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();

  if (!validateCsrf(session, csrfToken)) {
    session.flash = { error: 'Sesi telah kedaluwarsa. Silakan refresh dan coba lagi.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}`);
  }

  const newPassword = formData.get('password')?.toString() || '';
  const confirmation = formData.get('password_confirmation')?.toString() || '';

  if (newPassword && newPassword !== confirmation) {
    session.flash = { error: 'Konfirmasi password tidak sesuai.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}`);
  }

  if (newPassword && newPassword.length < 4) {
    session.flash = { error: 'Password minimal 4 karakter.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}`);
  }

  const newHash = newPassword ? await hashPassword(newPassword) : null;
  await updateNotePassword(c.env.DB, note.id, newHash);

  // Clear unlocked state for this note
  if (session.unlockedNotes) {
    session.unlockedNotes = session.unlockedNotes.filter((id) => id !== note.id);
  }

  session.flash = {
    success: newPassword ? 'Password catatan berhasil diubah.' : 'Password catatan berhasil dihapus.',
  };
  await saveSession(c, session);

  return c.redirect(`/kelola/${slug}/${token}`);
}

app.post('/kelola/:slug/:token/password', handleManagePasswordUpdate);
app.put('/kelola/:slug/:token/password', handleManagePasswordUpdate);
app.post('/kelola/:slug/:token', handleManagePasswordUpdate);
app.put('/kelola/:slug/:token', handleManagePasswordUpdate);

app.get('/kelola/:slug/:token/edit', async (c) => {
  const slug = c.req.param('slug');
  const token = c.req.param('token');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note || !note.manage_token) return c.html(render404(), 404);

  const isValid = await verifyPassword(token, note.manage_token);
  if (!isValid) return c.html(render404(), 404);

  const session = await getSession(c);
  if (!session.manageTokens) session.manageTokens = {};
  session.manageTokens[note.id] = token;

  const flash = session.flash || {};
  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  const html = renderEdit({
    note,
    csrfToken: session.csrfToken!,
    manageToken: token,
    error: flash.error,
    success: flash.success,
  });

  return c.html(html);
});

async function handleManageEdit(c: any) {
  const slug = c.req.param('slug');
  const token = c.req.param('token');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note || !note.manage_token) return c.html(render404(), 404);

  const isValid = await verifyPassword(token, note.manage_token);
  if (!isValid) return c.html(render404(), 404);

  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  const rate = checkRateLimit(`manage-edit:${ip}`, 15, 60_000);
  if (!rate.allowed) {
    session.flash = { error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}/edit`);
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();

  if (!validateCsrf(session, csrfToken)) {
    session.flash = { error: 'Sesi telah kedaluwarsa. Silakan refresh dan coba lagi.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}/edit`);
  }

  const title = formData.get('title')?.toString().trim() || null;
  const content = formData.get('content')?.toString() || '';

  if (!content.trim()) {
    session.flash = { error: 'Isi catatan tidak boleh kosong.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}/edit`);
  }

  if (content.length > 100_000) {
    session.flash = { error: 'Isi catatan maksimal 100.000 karakter.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}/edit`);
  }

  if (title && title.length > 120) {
    session.flash = { error: 'Judul catatan maksimal 120 karakter.' };
    await saveSession(c, session);
    return c.redirect(`/kelola/${slug}/${token}/edit`);
  }

  const titleChanged = (note.title || '') !== (title || '');
  const contentChanged = note.content !== content;

  if (!titleChanged && !contentChanged) {
    session.flash = { success: 'Tidak ada perubahan pada catatan.' };
    await saveSession(c, session);
    return c.redirect(`/${note.slug}`);
  }

  const diffSummary = computeDiffSummary(note.title, title, note.content, content);

  await createEditLog(c.env.DB, {
    note_id: note.id,
    editor_type: session.admin ? 'admin' : 'guest',
    editor_ip: ip,
    old_title: note.title,
    new_title: title,
    old_content: note.content,
    new_content: content,
    diff_summary: diffSummary,
  });

  await updateNoteContent(c.env.DB, note.id, { title, content });

  session.flash = { success: 'Catatan berhasil diperbarui.' };
  await saveSession(c, session);

  return c.redirect(`/${note.slug}`);
}

app.post('/kelola/:slug/:token/edit', handleManageEdit);
app.put('/kelola/:slug/:token/edit', handleManageEdit);


// ----------------------------------------------------
// 3. ADMIN PANEL
// ----------------------------------------------------

app.use('*', async (c, next) => {
  const adminPath = getAdminPath(c);
  const url = new URL(c.req.url);
  const path = url.pathname;

  // Handle Admin routes
  if (path === `/${adminPath}/login` || path === `/${adminPath}/login/`) {
    const session = await getSession(c);
    if (session.admin) {
      return c.redirect(`/${adminPath}`);
    }

    if (c.req.method === 'GET') {
      const flash = session.flash || {};
      if (session.flash) {
        session.flash = undefined;
      }
      await saveSession(c, session);

      return c.html(
        renderAdminLogin({
          adminPath,
          csrfToken: session.csrfToken!,
          error: flash.error,
          oldUsername: flash.old?.username,
        })
      );
    }

    if (c.req.method === 'POST') {
      const ip = getClientIp(c.req.raw);
      const rate = checkRateLimit(`admin-login:${ip}`, 5, 60_000);
      if (!rate.allowed) {
        session.flash = { error: 'Terlalu banyak percobaan login. Silakan tunggu 1 menit.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/login`);
      }

      const formData = await c.req.formData();
      const csrfToken = formData.get('_token')?.toString();
      if (!validateCsrf(session, csrfToken)) {
        session.flash = { error: 'Sesi kedaluwarsa. Silakan coba lagi.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/login`);
      }

      const username = formData.get('username')?.toString().trim() || '';
      const password = formData.get('password')?.toString() || '';

      // Bootstrap admin if DB has no admin
      const defaultUser = c.env.ADMIN_USERNAME || 'admin';
      const defaultPass = c.env.ADMIN_PASSWORD || 'Manusiabaik1';
      await bootstrapAdminAccount(c.env.DB, defaultUser, defaultPass);

      const account = await getAdminAccountByUsername(c.env.DB, username);
      if (account && (await verifyPassword(password, account.password))) {
        session.admin = true;
        session.admin_id = account.id;
        session.flash = { success: 'Selamat datang di Admin Panel.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}`);
      }

      session.flash = {
        error: 'Username atau password tidak sesuai.',
        old: { username },
      };
      await saveSession(c, session);
      return c.redirect(`/${adminPath}/login`);
    }
  }

  if (path === `/${adminPath}/logout` || path === `/${adminPath}/logout/`) {
    if (c.req.method === 'POST') {
      const session = await getSession(c);
      session.admin = undefined;
      session.admin_id = undefined;
      await saveSession(c, session);
      return c.redirect(`/${adminPath}/login`);
    }
  }

  if (path === `/${adminPath}` || path === `/${adminPath}/`) {
    const session = await getSession(c);
    if (!session.admin) return c.redirect(`/${adminPath}/login`);

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const query = url.searchParams.get('q') || undefined;

    const stats = await getAdminStats(c.env.DB);
    const paginated = await getAdminNotes(c.env.DB, page, 12, query);

    const flash = session.flash || {};
    if (session.flash) {
      session.flash = undefined;
    }
    await saveSession(c, session);

    return c.html(
      renderAdminDashboard({
        adminPath,
        csrfToken: session.csrfToken!,
        stats,
        notes: paginated.notes,
        total: paginated.total,
        currentPage: paginated.currentPage,
        totalPages: paginated.totalPages,
        query,
        success: flash.success,
      })
    );
  }

  // Admin Riwayat Edit (Edit Logs)
  if (path === `/${adminPath}/riwayat-edit` || path === `/${adminPath}/riwayat-edit/`) {
    const session = await getSession(c);
    if (!session.admin) return c.redirect(`/${adminPath}/login`);

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const query = url.searchParams.get('q') || undefined;
    const editorFilter = url.searchParams.get('editor') || undefined;

    const stats = await getAdminEditLogStats(c.env.DB);
    const paginated = await getAdminEditLogs(c.env.DB, page, 15, query, editorFilter);

    const flash = session.flash || {};
    if (session.flash) {
      session.flash = undefined;
    }
    await saveSession(c, session);

    return c.html(
      renderAdminLogs({
        adminPath,
        csrfToken: session.csrfToken!,
        stats,
        logs: paginated.logs,
        total: paginated.total,
        currentPage: paginated.currentPage,
        totalPages: paginated.totalPages,
        query,
        editorFilter,
        success: flash.success,
      })
    );
  }

  // Admin note detail / actions (view, edit, password, delete)
  const noteDetailMatch = path.match(new RegExp(`^/${adminPath}/catatan/([^/]+)(/password|/edit)?$`));
  if (noteDetailMatch) {
    const session = await getSession(c);
    if (!session.admin) return c.redirect(`/${adminPath}/login`);

    const noteSlug = noteDetailMatch[1];
    const action = noteDetailMatch[2]; // '/password', '/edit', or undefined
    const note = await getNoteBySlug(c.env.DB, noteSlug);
    if (!note) return c.html(render404(), 404);

    const formData = c.req.method !== 'GET' ? await c.req.formData() : null;
    const method = formData?.get('_method')?.toString() || c.req.method;

    // Handle Admin Edit Note
    if (action === '/edit') {
      if (c.req.method === 'GET') {
        const flash = session.flash || {};
        if (session.flash) {
          session.flash = undefined;
        }
        await saveSession(c, session);

        return c.html(
          renderAdminEdit({
            adminPath,
            note,
            csrfToken: session.csrfToken!,
            error: flash.error,
            success: flash.success,
          })
        );
      }

      if (method === 'PUT' || method === 'POST') {
        const ip = getClientIp(c.req.raw);
        const rate = checkRateLimit(`admin-edit:${ip}`, 30, 60_000);
        if (!rate.allowed) {
          session.flash = { error: 'Terlalu banyak permintaan. Silakan tunggu sebentar.' };
          await saveSession(c, session);
          return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
        }

        const csrfToken = formData?.get('_token')?.toString();
        if (!validateCsrf(session, csrfToken)) {
          session.flash = { error: 'Sesi telah kedaluwarsa.' };
          await saveSession(c, session);
          return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
        }

        const title = formData?.get('title')?.toString().trim() || null;
        const content = formData?.get('content')?.toString() || '';
        const customSlug = formData?.get('slug')?.toString().trim().toLowerCase() || note.slug;
        const expires = formData?.get('expires')?.toString() || 'keep';

        if (!content.trim()) {
          session.flash = { error: 'Isi catatan tidak boleh kosong.' };
          await saveSession(c, session);
          return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
        }

        if (content.length > 100_000) {
          session.flash = { error: 'Isi catatan maksimal 100.000 karakter.' };
          await saveSession(c, session);
          return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
        }

        if (title && title.length > 120) {
          session.flash = { error: 'Judul catatan maksimal 120 karakter.' };
          await saveSession(c, session);
          return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
        }

        // Slug validation if changed
        let newSlug = note.slug;
        if (customSlug && customSlug !== note.slug) {
          if (!/^[a-z0-9-_]{3,50}$/.test(customSlug) || RESERVED_SLUGS.has(customSlug)) {
            session.flash = { error: 'Tautan khusus tidak valid (3-50 karakter, huruf/angka/-/_).' };
            await saveSession(c, session);
            return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
          }

          const taken = await isSlugTaken(c.env.DB, customSlug);
          if (taken) {
            session.flash = { error: 'Tautan khusus ini sudah digunakan oleh catatan lain.' };
            await saveSession(c, session);
            return c.redirect(`/${adminPath}/catatan/${note.slug}/edit`);
          }
          newSlug = customSlug;
        }

        // Expiry calculation
        let newExpiresAt: string | null | undefined = undefined;
        if (expires === 'never') {
          newExpiresAt = null;
        } else if (expires === '1h') {
          newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        } else if (expires === '1d') {
          newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        } else if (expires === '7d') {
          newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (expires === '30d') {
          newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const diffSummary = computeDiffSummary(note.title, title, note.content, content);

        await createEditLog(c.env.DB, {
          note_id: note.id,
          editor_type: 'admin',
          editor_ip: ip,
          old_title: note.title,
          new_title: title,
          old_content: note.content,
          new_content: content,
          diff_summary: diffSummary,
        });

        await updateNoteContent(c.env.DB, note.id, {
          title,
          content,
          slug: newSlug !== note.slug ? newSlug : undefined,
          expires_at: newExpiresAt,
        });

        session.flash = { success: 'Catatan berhasil diperbarui.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/catatan/${newSlug}`);
      }
    }

    if (action === '/password' && (method === 'PUT' || method === 'POST')) {
      const csrfToken = formData?.get('_token')?.toString();
      if (!validateCsrf(session, csrfToken)) {
        session.flash = { error: 'Sesi telah kedaluwarsa.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}`);
      }

      const newPassword = formData?.get('password')?.toString() || '';
      const confirmation = formData?.get('password_confirmation')?.toString() || '';

      if (newPassword && newPassword !== confirmation) {
        session.flash = { error: 'Konfirmasi password tidak sesuai.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}`);
      }

      const newHash = newPassword ? await hashPassword(newPassword) : null;
      await updateNotePassword(c.env.DB, note.id, newHash);

      session.flash = {
        success: newPassword ? 'Password catatan berhasil diubah.' : 'Password catatan berhasil dihapus.',
      };
      await saveSession(c, session);
      return c.redirect(`/${adminPath}`);
    }

    if (method === 'DELETE') {
      const csrfToken = formData?.get('_token')?.toString();
      if (!validateCsrf(session, csrfToken)) {
        session.flash = { error: 'Sesi telah kedaluwarsa.' };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}`);
      }

      await deleteNote(c.env.DB, note.id);
      session.flash = { success: 'Catatan berhasil dihapus.' };
      await saveSession(c, session);
      return c.redirect(`/${adminPath}`);
    }

    if (c.req.method === 'GET') {
      const flash = session.flash || {};
      if (session.flash) {
        session.flash = undefined;
      }
      await saveSession(c, session);

      const origin = `${url.protocol}//${url.host}`;
      const logs = await getEditLogsByNoteId(c.env.DB, note.id);

      return c.html(
        renderAdminShow({
          adminPath,
          note,
          origin,
          csrfToken: session.csrfToken!,
          logs,
          error: flash.error,
          success: flash.success,
        })
      );
    }
  }


  // Admin change password
  if (path === `/${adminPath}/pengaturan/password` || path === `/${adminPath}/pengaturan/password/`) {
    const session = await getSession(c);
    if (!session.admin || !session.admin_id) return c.redirect(`/${adminPath}/login`);

    if (c.req.method === 'GET') {
      const flash = session.flash || {};
      if (session.flash) {
        session.flash = undefined;
      }
      await saveSession(c, session);

      return c.html(
        renderAdminPassword({
          adminPath,
          csrfToken: session.csrfToken!,
          success: flash.success,
          errors: flash.errors,
        })
      );
    }

    const formData = await c.req.formData();
    const method = formData.get('_method')?.toString() || c.req.method;

    if (method === 'PUT' || method === 'POST') {
      const ip = getClientIp(c.req.raw);
      const rate = checkRateLimit(`admin-pwd:${ip}`, 5, 60_000);
      if (!rate.allowed) {
        session.flash = { errors: { current_password: 'Terlalu banyak percobaan. Tunggu 1 menit.' } };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/pengaturan/password`);
      }

      const csrfToken = formData.get('_token')?.toString();
      if (!validateCsrf(session, csrfToken)) {
        session.flash = { errors: { current_password: 'Sesi kedaluwarsa. Silakan coba lagi.' } };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/pengaturan/password`);
      }

      const currentPassword = formData.get('current_password')?.toString() || '';
      const newPassword = formData.get('password')?.toString() || '';
      const confirmation = formData.get('password_confirmation')?.toString() || '';

      const account = await getAdminAccountById(c.env.DB, session.admin_id);
      if (!account || !(await verifyPassword(currentPassword, account.password))) {
        session.flash = { errors: { current_password: 'Password saat ini salah.' } };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/pengaturan/password`);
      }

      if (newPassword.length < 8) {
        session.flash = { errors: { password: 'Password baru minimal 8 karakter.' } };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/pengaturan/password`);
      }

      if (newPassword !== confirmation) {
        session.flash = { errors: { password: 'Konfirmasi password tidak sesuai.' } };
        await saveSession(c, session);
        return c.redirect(`/${adminPath}/pengaturan/password`);
      }

      const newHash = await hashPassword(newPassword);
      await updateAdminPassword(c.env.DB, session.admin_id, newHash);

      session.flash = { success: 'Password berhasil diubah.' };
      await saveSession(c, session);
      return c.redirect(`/${adminPath}/pengaturan/password`);
    }
  }

  await next();
});

// ----------------------------------------------------
// 4. PUBLIC NOTE VIEW, UNLOCK, AND CHANGE PASSWORD
// ----------------------------------------------------

// Unlock protected note
app.post('/:slug/buka', async (c) => {
  const slug = c.req.param('slug');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note) return c.html(render404(), 404);

  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  const rate = checkRateLimit(`unlock:${slug}:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    session.flash = { error: 'Terlalu banyak percobaan. Tunggu sebentar.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}`);
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();
  if (!validateCsrf(session, csrfToken)) {
    session.flash = { error: 'Sesi kedaluwarsa. Silakan coba lagi.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}`);
  }

  const password = formData.get('password')?.toString() || '';
  if (!note.password || !(await verifyPassword(password, note.password))) {
    session.flash = { error: 'Password yang dimasukkan salah.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}`);
  }

  if (!session.unlockedNotes) session.unlockedNotes = [];
  if (!session.unlockedNotes.includes(note.id)) {
    session.unlockedNotes.push(note.id);
  }
  await saveSession(c, session);

  return c.redirect(`/${slug}`);
});

// Change password using current password
app.get('/:slug/ubah-password', async (c) => {
  const slug = c.req.param('slug');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note || !note.password) return c.html(render404(), 404);

  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const flash = session.flash || {};
  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  const html = renderNotePassword({
    note,
    csrfToken: session.csrfToken!,
    success: flash.success,
    errors: flash.errors,
  });

  return c.html(html);
});

async function handleNotePasswordWithCurrent(c: any) {
  const slug = c.req.param('slug');
  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note || !note.password) return c.html(render404(), 404);

  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  const rate = checkRateLimit(`pwd-change:${slug}:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    session.flash = { errors: { current_password: 'Terlalu banyak percobaan. Tunggu 1 menit.' } };
    await saveSession(c, session);
    return c.redirect(`/${slug}/ubah-password`);
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();
  if (!validateCsrf(session, csrfToken)) {
    session.flash = { errors: { current_password: 'Sesi kedaluwarsa. Silakan coba lagi.' } };
    await saveSession(c, session);
    return c.redirect(`/${slug}/ubah-password`);
  }

  const currentPassword = formData.get('current_password')?.toString() || '';
  const newPassword = formData.get('password')?.toString() || '';
  const confirmation = formData.get('password_confirmation')?.toString() || '';

  if (!(await verifyPassword(currentPassword, note.password))) {
    session.flash = { errors: { current_password: 'Password saat ini salah.' } };
    await saveSession(c, session);
    return c.redirect(`/${slug}/ubah-password`);
  }

  if (newPassword.length < 4) {
    session.flash = { errors: { password: 'Password minimal 4 karakter.' } };
    await saveSession(c, session);
    return c.redirect(`/${slug}/ubah-password`);
  }

  if (newPassword !== confirmation) {
    session.flash = { errors: { password: 'Konfirmasi password tidak sesuai.' } };
    await saveSession(c, session);
    return c.redirect(`/${slug}/ubah-password`);
  }

  const newHash = await hashPassword(newPassword);
  await updateNotePassword(c.env.DB, note.id, newHash);

  // Clear unlocked state
  if (session.unlockedNotes) {
    session.unlockedNotes = session.unlockedNotes.filter((id) => id !== note.id);
  }

  session.flash = { success: 'Password catatan berhasil diubah.' };
  await saveSession(c, session);

  return c.redirect(`/${slug}/ubah-password`);
}

// ----------------------------------------------------
// PUBLIC NOTE EDIT & VERIFICATION
// ----------------------------------------------------

async function checkNoteEditAuthorization(
  note: Note,
  session: SessionData
): Promise<{ authorized: boolean; needsVerification: boolean; verifyType: 'password' | 'token' }> {
  // 1. Admin is always authorized
  if (session.admin) {
    return { authorized: true, needsVerification: false, verifyType: 'password' };
  }

  // 2. Manage Token in session
  const sessionToken = session.manageTokens?.[note.id];
  if (sessionToken && note.manage_token && (await verifyPassword(sessionToken, note.manage_token))) {
    return { authorized: true, needsVerification: false, verifyType: 'token' };
  }

  // 3. Unlocked password note
  if (note.password && session.unlockedNotes?.includes(note.id)) {
    return { authorized: true, needsVerification: false, verifyType: 'password' };
  }

  // Not authorized yet
  if (note.password) {
    return { authorized: false, needsVerification: true, verifyType: 'password' };
  } else {
    return { authorized: false, needsVerification: true, verifyType: 'token' };
  }
}

// GET /:slug/edit
app.get('/:slug/edit', async (c) => {
  const slug = c.req.param('slug');
  if (RESERVED_SLUGS.has(slug) || slug.startsWith('_')) {
    return c.html(render404(), 404);
  }

  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note) return c.html(render404(), 404);

  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const flash = session.flash || {};
  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  const auth = await checkNoteEditAuthorization(note, session);

  if (!auth.authorized) {
    return c.html(
      renderEdit({
        note,
        csrfToken: session.csrfToken!,
        needsVerification: true,
        verifyType: auth.verifyType,
        error: flash.error,
        success: flash.success,
      })
    );
  }

  const manageToken = session.manageTokens?.[note.id] || null;

  return c.html(
    renderEdit({
      note,
      csrfToken: session.csrfToken!,
      manageToken,
      error: flash.error,
      success: flash.success,
    })
  );
});

// POST /:slug/verifikasi-edit
app.post('/:slug/verifikasi-edit', async (c) => {
  const slug = c.req.param('slug');
  if (RESERVED_SLUGS.has(slug) || slug.startsWith('_')) {
    return c.html(render404(), 404);
  }

  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note) return c.html(render404(), 404);

  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  const rate = checkRateLimit(`verify-edit:${slug}:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    session.flash = { error: 'Terlalu banyak percobaan verifikasi. Silakan tunggu 1 menit.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();
  if (!validateCsrf(session, csrfToken)) {
    session.flash = { error: 'Sesi kedaluwarsa. Silakan coba lagi.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  const password = formData.get('password')?.toString();
  const manageToken = formData.get('manage_token')?.toString();

  if (password && note.password) {
    const isPassValid = await verifyPassword(password, note.password);
    if (isPassValid) {
      if (!session.unlockedNotes) session.unlockedNotes = [];
      if (!session.unlockedNotes.includes(note.id)) {
        session.unlockedNotes.push(note.id);
      }
      session.flash = { success: 'Verifikasi password berhasil.' };
      await saveSession(c, session);
      return c.redirect(`/${slug}/edit`);
    }
  }

  if (manageToken && note.manage_token) {
    const isTokenValid = await verifyPassword(manageToken, note.manage_token);
    if (isTokenValid) {
      if (!session.manageTokens) session.manageTokens = {};
      session.manageTokens[note.id] = manageToken;
      session.flash = { success: 'Verifikasi token berhasil.' };
      await saveSession(c, session);
      return c.redirect(`/${slug}/edit`);
    }
  }

  session.flash = { error: note.password ? 'Password yang dimasukkan salah.' : 'Token pengelolaan tidak valid.' };
  await saveSession(c, session);
  return c.redirect(`/${slug}/edit`);
});

// POST & PUT /:slug/edit
async function handlePublicNoteEdit(c: any) {
  const slug = c.req.param('slug');
  if (RESERVED_SLUGS.has(slug) || slug.startsWith('_')) {
    return c.html(render404(), 404);
  }

  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note) return c.html(render404(), 404);

  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const ip = getClientIp(c.req.raw);

  const rate = checkRateLimit(`public-edit:${slug}:${ip}`, 15, 60_000);
  if (!rate.allowed) {
    session.flash = { error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  const auth = await checkNoteEditAuthorization(note, session);
  if (!auth.authorized) {
    session.flash = { error: 'Akses ditolak. Silakan verifikasi password atau token terlebih dahulu.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  const formData = await c.req.formData();
  const csrfToken = formData.get('_token')?.toString();
  if (!validateCsrf(session, csrfToken)) {
    session.flash = { error: 'Sesi telah kedaluwarsa. Silakan refresh dan coba lagi.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  const title = formData.get('title')?.toString().trim() || null;
  const content = formData.get('content')?.toString() || '';

  if (!content.trim()) {
    session.flash = { error: 'Isi catatan tidak boleh kosong.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  if (content.length > 100_000) {
    session.flash = { error: 'Isi catatan maksimal 100.000 karakter.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  if (title && title.length > 120) {
    session.flash = { error: 'Judul catatan maksimal 120 karakter.' };
    await saveSession(c, session);
    return c.redirect(`/${slug}/edit`);
  }

  const titleChanged = (note.title || '') !== (title || '');
  const contentChanged = note.content !== content;

  if (!titleChanged && !contentChanged) {
    session.flash = { success: 'Tidak ada perubahan pada catatan.' };
    await saveSession(c, session);
    return c.redirect(`/${note.slug}`);
  }

  const diffSummary = computeDiffSummary(note.title, title, note.content, content);

  await createEditLog(c.env.DB, {
    note_id: note.id,
    editor_type: session.admin ? 'admin' : 'guest',
    editor_ip: ip,
    old_title: note.title,
    new_title: title,
    old_content: note.content,
    new_content: content,
    diff_summary: diffSummary,
  });

  await updateNoteContent(c.env.DB, note.id, { title, content });

  session.flash = { success: 'Catatan berhasil diperbarui.' };
  await saveSession(c, session);

  return c.redirect(`/${note.slug}`);
}

app.post('/:slug/edit', handlePublicNoteEdit);
app.put('/:slug/edit', handlePublicNoteEdit);

// Wildcard route for public note
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (RESERVED_SLUGS.has(slug) || slug.startsWith('_')) {
    return c.html(render404(), 404);
  }

  const note = await getNoteBySlug(c.env.DB, slug);
  if (!note) return c.html(render404(), 404);

  // Check expiration
  if (isDatePast(note.expires_at)) {
    return c.html(render410(), 410);
  }

  const session = await getSession(c);
  const flash = session.flash || {};
  if (session.flash) {
    session.flash = undefined;
  }
  await saveSession(c, session);

  // Check if protected and locked
  const isUnlocked = session.unlockedNotes?.includes(note.id);
  if (note.password && !isUnlocked) {
    return c.html(
      renderUnlock({
        note,
        csrfToken: session.csrfToken!,
        error: flash.error,
      })
    );
  }

  // Note is accessible: increment views
  await incrementNoteViews(c.env.DB, note.id);
  note.views += 1;

  const manageToken = session.manageTokens?.[note.id] || null;

  return c.html(
    renderNote({
      note,
      manageToken,
      csrfToken: session.csrfToken,
      success: flash.success,
    })
  );
});


export default app;
