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
