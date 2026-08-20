import { Note, AdminAccount, NoteEditLog, AdminEditLogStats } from '../types';
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
 * Update content and metadata of a note.
 */
export async function updateNoteContent(
  db: D1Database,
  id: number,
  data: {
    title?: string | null;
    content: string;
    slug?: string;
    expires_at?: string | null;
  }
): Promise<Note> {
  let query = "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now')";
  const bindings: any[] = [data.title ?? null, data.content];

  if (data.slug) {
    query += ', slug = ?';
    bindings.push(data.slug);
  }

  if (data.expires_at !== undefined) {
    query += ', expires_at = ?';
    bindings.push(data.expires_at);
  }

  query += ' WHERE id = ? RETURNING *';
  bindings.push(id);

  const note = await db
    .prepare(query)
    .bind(...bindings)
    .first<Note>();

  if (!note) {
    throw new Error('Gagal memperbarui catatan di database.');
  }

  return note;
}

/**
 * Auto-ensure note_edit_logs table exists on D1 database.
 */
let editLogsTableChecked = false;
export async function ensureEditLogsTable(db: D1Database): Promise<void> {
  if (editLogsTableChecked) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS note_edit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        editor_type TEXT NOT NULL,
        editor_ip TEXT,
        old_title TEXT,
        new_title TEXT,
        old_content TEXT NOT NULL,
        new_content TEXT NOT NULL,
        diff_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    editLogsTableChecked = true;
  } catch (e) {
    console.error('Error ensuring note_edit_logs table:', e);
  }
}


/**
 * Create a new edit log record.
 */
export async function createEditLog(
  db: D1Database,
  data: {
    note_id: number;
    editor_type: 'admin' | 'guest';
    editor_ip?: string | null;
    old_title?: string | null;
    new_title?: string | null;
    old_content: string;
    new_content: string;
    diff_summary?: string | null;
  }
): Promise<NoteEditLog | null> {
  await ensureEditLogsTable(db);
  try {
    const query = `
      INSERT INTO note_edit_logs (note_id, editor_type, editor_ip, old_title, new_title, old_content, new_content, diff_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      RETURNING *
    `;

    const log = await db
      .prepare(query)
      .bind(
        data.note_id,
        data.editor_type,
        data.editor_ip ?? null,
        data.old_title ?? null,
        data.new_title ?? null,
        data.old_content,
        data.new_content,
        data.diff_summary ?? null
      )
      .first<NoteEditLog>();

    return log || null;
  } catch (err) {
    console.error('Failed to create edit log:', err);
    return null;
  }
}

/**
 * Get all edit logs for a specific note.
 */
export async function getEditLogsByNoteId(
  db: D1Database,
  noteId: number
): Promise<NoteEditLog[]> {
  await ensureEditLogsTable(db);
  try {
    const res = await db
      .prepare('SELECT * FROM note_edit_logs WHERE note_id = ? ORDER BY created_at DESC')
      .bind(noteId)
      .all<NoteEditLog>();
    return res.results || [];
  } catch (err) {
    console.error('Failed to fetch edit logs for note:', err);
    return [];
  }
}

/**
 * Get paginated edit logs with joined note info for admin panel.
 */
export async function getAdminEditLogs(
  db: D1Database,
  page = 1,
  perPage = 15,
  searchQuery?: string,
  editorFilter?: string
): Promise<{
  logs: NoteEditLog[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  await ensureEditLogsTable(db);
  try {
    const offset = (page - 1) * perPage;
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (editorFilter && (editorFilter === 'admin' || editorFilter === 'guest')) {
      conditions.push('l.editor_type = ?');
      bindings.push(editorFilter);
    }

    if (searchQuery) {
      conditions.push('(n.slug LIKE ? OR n.title LIKE ? OR l.diff_summary LIKE ? OR l.new_title LIKE ?)');
      const q = `%${searchQuery}%`;
      bindings.push(q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as count
      FROM note_edit_logs l
      LEFT JOIN notes n ON l.note_id = n.id
      ${whereClause}
    `;

    const countRes = await db
      .prepare(countQuery)
      .bind(...bindings)
      .first<{ count: number }>();
    const total = countRes?.count || 0;

    const selectQuery = `
      SELECT 
        l.*,
        n.slug as note_slug,
        n.title as note_current_title
      FROM note_edit_logs l
      LEFT JOIN notes n ON l.note_id = n.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const listRes = await db
      .prepare(selectQuery)
      .bind(...bindings, perPage, offset)
      .all<NoteEditLog>();

    const logs = listRes.results || [];
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return {
      logs,
      total,
      totalPages,
      currentPage: page,
    };
  } catch (err) {
    console.error('Failed to fetch admin edit logs:', err);
    return {
      logs: [],
      total: 0,
      totalPages: 1,
      currentPage: page,
    };
  }
}

/**
 * Get statistics of edit logs for admin dashboard.
 */
export async function getAdminEditLogStats(db: D1Database): Promise<AdminEditLogStats> {
  await ensureEditLogsTable(db);
  try {
    const totalRow = await db
      .prepare('SELECT COUNT(*) as count FROM note_edit_logs')
      .first<{ count: number }>();

    const adminRow = await db
      .prepare("SELECT COUNT(*) as count FROM note_edit_logs WHERE editor_type = 'admin'")
      .first<{ count: number }>();

    const guestRow = await db
      .prepare("SELECT COUNT(*) as count FROM note_edit_logs WHERE editor_type = 'guest'")
      .first<{ count: number }>();

    const uniqueNotesRow = await db
      .prepare('SELECT COUNT(DISTINCT note_id) as count FROM note_edit_logs')
      .first<{ count: number }>();

    return {
      totalEdits: totalRow?.count || 0,
      adminEdits: adminRow?.count || 0,
      guestEdits: guestRow?.count || 0,
      uniqueNotesEdited: uniqueNotesRow?.count || 0,
    };
  } catch (err) {
    console.error('Failed to fetch admin edit log stats:', err);
    return {
      totalEdits: 0,
      adminEdits: 0,
      guestEdits: 0,
      uniqueNotesEdited: 0,
    };
  }
}

/**
 * Get a specific edit log by ID with joined note info.
 */
export async function getEditLogById(
  db: D1Database,
  id: number
): Promise<NoteEditLog | null> {
  await ensureEditLogsTable(db);
  try {
    const query = `
      SELECT 
        l.*,
        n.slug as note_slug,
        n.title as note_current_title
      FROM note_edit_logs l
      LEFT JOIN notes n ON l.note_id = n.id
      WHERE l.id = ?
      LIMIT 1
    `;
    return await db
      .prepare(query)
      .bind(id)
      .first<NoteEditLog>();
  } catch (err) {
    console.error('Failed to fetch edit log by ID:', err);
    return null;
  }
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
