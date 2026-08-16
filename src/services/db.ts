import { Note, AdminAccount } from '../types';
import { hashPassword } from '../utils/crypto';

/**
 * Check if a slug already exists in database.
 */
export async function isSlugTaken(db: D1Database, slug: string): Promise<boolean> {
  const res = await db
    .prepare('SELECT id FROM notes WHERE slug = ? LIMIT 1')
    .bind(slug)
    .first<{ id: number }>();
  return !!res;
}

/**
 * Create a new note in D1.
 */
export async function createNote(
  db: D1Database,
  data: {
    title?: string | null;
    slug: string;
    content: string;
    password?: string | null;
    manage_token?: string | null;
    expires_at?: string | null;
  }
): Promise<Note> {
  const query = `
    INSERT INTO notes (title, slug, content, password, manage_token, views, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
    RETURNING *
  `;

  const note = await db
    .prepare(query)
    .bind(
      data.title ?? null,
      data.slug,
      data.content,
      data.password ?? null,
      data.manage_token ?? null,
      data.expires_at ?? null
    )
    .first<Note>();

  if (!note) {
    throw new Error('Gagal menyimpan catatan ke database.');
  }

  return note;
}

/**
 * Get note by slug.
 */
export async function getNoteBySlug(db: D1Database, slug: string): Promise<Note | null> {
  return await db
    .prepare('SELECT * FROM notes WHERE slug = ? LIMIT 1')
    .bind(slug)
    .first<Note>();
}

/**
 * Get note by ID.
 */
export async function getNoteById(db: D1Database, id: number): Promise<Note | null> {
  return await db
    .prepare('SELECT * FROM notes WHERE id = ? LIMIT 1')
    .bind(id)
    .first<Note>();
}

/**
 * Increment view count for a note.
 */
export async function incrementNoteViews(db: D1Database, id: number): Promise<void> {
  await db
    .prepare("UPDATE notes SET views = views + 1, updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();
}

/**
 * Update or remove password for a note.
 */
export async function updateNotePassword(
  db: D1Database,
  id: number,
  hashedPassword: string | null
): Promise<void> {
  await db
    .prepare("UPDATE notes SET password = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(hashedPassword, id)
    .run();
}

/**
 * Delete a note from D1.
 */
export async function deleteNote(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('DELETE FROM notes WHERE id = ?')
    .bind(id)
    .run();
}

/**
 * Get dashboard statistics for admin.
 */
export async function getAdminStats(db: D1Database): Promise<{
  totalNotes: number;
  totalViews: number;
  protectedNotes: number;
  expiredNotes: number;
}> {
  const totalNotesRow = await db
    .prepare('SELECT COUNT(*) as count FROM notes')
    .first<{ count: number }>();

  const totalViewsRow = await db
    .prepare('SELECT SUM(views) as total FROM notes')
    .first<{ total: number | null }>();

  const protectedNotesRow = await db
    .prepare('SELECT COUNT(*) as count FROM notes WHERE password IS NOT NULL AND password != ""')
    .first<{ count: number }>();

  const expiredNotesRow = await db
    .prepare('SELECT COUNT(*) as count FROM notes WHERE expires_at IS NOT NULL')
    .first<{ count: number }>();

  return {
    totalNotes: totalNotesRow?.count || 0,
    totalViews: totalViewsRow?.total || 0,
    protectedNotes: protectedNotesRow?.count || 0,
    expiredNotes: expiredNotesRow?.count || 0,
  };
}

/**
 * Get paginated notes for admin dashboard.
 */
export async function getAdminNotes(
  db: D1Database,
  page = 1,
  perPage = 12,
  searchQuery?: string
): Promise<{
  notes: Note[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  const offset = (page - 1) * perPage;
  const q = searchQuery ? `%${searchQuery}%` : null;

  let total = 0;
  let notes: Note[] = [];

  if (q) {
    const countRes = await db
      .prepare('SELECT COUNT(*) as count FROM notes WHERE title LIKE ? OR slug LIKE ?')
      .bind(q, q)
      .first<{ count: number }>();
    total = countRes?.count || 0;

    const listRes = await db
      .prepare(
        'SELECT * FROM notes WHERE title LIKE ? OR slug LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .bind(q, q, perPage, offset)
      .all<Note>();
    notes = listRes.results || [];
  } else {
    const countRes = await db
      .prepare('SELECT COUNT(*) as count FROM notes')
      .first<{ count: number }>();
    total = countRes?.count || 0;

    const listRes = await db
      .prepare('SELECT * FROM notes ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(perPage, offset)
      .all<Note>();
    notes = listRes.results || [];
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    notes,
    total,
    totalPages,
    currentPage: page,
  };
}

/**
 * Get admin account by username.
 */
export async function getAdminAccountByUsername(
  db: D1Database,
  username: string
): Promise<AdminAccount | null> {
  return await db
    .prepare('SELECT * FROM admin_accounts WHERE username = ? LIMIT 1')
    .bind(username)
    .first<AdminAccount>();
}

/**
 * Get admin account by ID.
 */
export async function getAdminAccountById(
  db: D1Database,
  id: number
): Promise<AdminAccount | null> {
  return await db
    .prepare('SELECT * FROM admin_accounts WHERE id = ? LIMIT 1')
    .bind(id)
    .first<AdminAccount>();
}

/**
 * Update admin account password.
 */
export async function updateAdminPassword(
  db: D1Database,
  id: number,
  hashedPassword: string
): Promise<void> {
  await db
    .prepare("UPDATE admin_accounts SET password = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(hashedPassword, id)
    .run();
}

/**
 * Bootstrap default admin account in D1 if no admin exists yet.
 */
export async function bootstrapAdminAccount(
  db: D1Database,
  defaultUsername = 'admin',
  defaultPassword = 'Manusiabaik1'
): Promise<AdminAccount> {
  const existing = await db
    .prepare('SELECT * FROM admin_accounts WHERE username = ? LIMIT 1')
    .bind(defaultUsername)
    .first<AdminAccount>();

  if (existing) {
    return existing;
  }

  const hashedPassword = await hashPassword(defaultPassword);
  const newAccount = await db
    .prepare(
      "INSERT INTO admin_accounts (username, password, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now')) RETURNING *"
    )
    .bind(defaultUsername, hashedPassword)
    .first<AdminAccount>();

  if (!newAccount) {
    throw new Error('Gagal melakukan bootstrap admin account.');
  }

  return newAccount;
}
