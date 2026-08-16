import { Hono } from 'hono';
import { Env, SessionData } from './types';
import {
  generateSecureSlug,
  generateSecureToken,
  hashPassword,
  verifyPassword,
} from './utils/crypto';
import { isDatePast } from './utils/format';
import { checkRateLimit, getClientIp } from './utils/rateLimit';
import { getSession, saveSession, validateCsrf } from './utils/session';
import {
  bootstrapAdminAccount,
  createNote,
  deleteNote,
  getAdminAccountById,
  getAdminAccountByUsername,
  getAdminNotes,
  getAdminStats,
  getNoteById,
  getNoteBySlug,
  incrementNoteViews,
  isSlugTaken,
  updateAdminPassword,
  updateNotePassword,
} from './services/db';

// Views
import { renderHome } from './views/home';
import { renderCreated } from './views/created';
import { renderNote } from './views/note';
import { renderUnlock } from './views/unlock';
import { renderManage } from './views/manage';
import { renderNotePassword } from './views/note-password';
import { renderAdminLogin } from './views/admin/login';
import { renderAdminDashboard } from './views/admin/dashboard';
import { renderAdminShow } from './views/admin/show';
import { renderAdminPassword } from './views/admin/password';
import { renderLayout } from './views/layout';

const app = new Hono<{ Bindings: Env }>();

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

  // Admin note detail / actions
  const noteDetailMatch = path.match(new RegExp(`^/${adminPath}/catatan/([^/]+)(/password)?$`));
  if (noteDetailMatch) {
    const session = await getSession(c);
    if (!session.admin) return c.redirect(`/${adminPath}/login`);

    const noteSlug = noteDetailMatch[1];
    const isPasswordAction = !!noteDetailMatch[2];
    const note = await getNoteBySlug(c.env.DB, noteSlug);
    if (!note) return c.html(render404(), 404);

    const formData = c.req.method !== 'GET' ? await c.req.formData() : null;
    const method = formData?.get('_method')?.toString() || c.req.method;

    if (isPasswordAction && (method === 'PUT' || method === 'POST')) {
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
      return c.html(
        renderAdminShow({
          adminPath,
          note,
          origin,
          csrfToken: session.csrfToken!,
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

app.post('/:slug/ubah-password', handleNotePasswordWithCurrent);
app.put('/:slug/ubah-password', handleNotePasswordWithCurrent);

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
    })
  );
});

export default app;
