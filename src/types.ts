export interface Note {
  id: number;
  title: string | null;
  slug: string;
  content: string;
  password: string | null;
  manage_token: string | null;
  views: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAccount {
  id: number;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PATH?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

export interface SessionData {
  admin?: boolean;
  admin_id?: number;
  unlockedNotes?: number[];
  manageTokens?: Record<number, string>;
  csrfToken?: string;
  flash?: {
    success?: string;
    error?: string;
    errors?: Record<string, string>;
    old?: Record<string, string>;
    manage_token?: string;
  };
}
export interface NoteEditLog {
  id: number;
  note_id: number;
  editor_type: 'admin' | 'guest';
  editor_ip: string | null;
  old_title: string | null;
  new_title: string | null;
  old_content: string;
  new_content: string;
  diff_summary: string | null;
  created_at: string;
  // Joined note fields for logs list
  note_slug?: string;
  note_current_title?: string | null;
}

export interface AdminEditLogStats {
  totalEdits: number;
  adminEdits: number;
  guestEdits: number;
  uniqueNotesEdited: number;
}
