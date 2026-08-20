-- Migration: 0002_edit_logs.sql
-- Cloudflare D1 Database Schema for Note Edit History & Logs

CREATE TABLE IF NOT EXISTS note_edit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    editor_type TEXT NOT NULL, -- 'admin' or 'guest'
    editor_ip TEXT,
    old_title TEXT,
    new_title TEXT,
    old_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    diff_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edit_logs_note_id ON note_edit_logs(note_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_created_at ON note_edit_logs(created_at);
