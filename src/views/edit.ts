import { Note } from '../types';
import { countWords, escapeHtml } from '../utils/format';
import { renderLayout } from './layout';

export interface EditViewProps {
  note: Note;
  csrfToken: string;
  manageToken?: string | null;
  error?: string;
  success?: string;
  needsVerification?: boolean;
  verifyType?: 'password' | 'token';
}

export function renderEdit(props: EditViewProps): string {
  const { note, csrfToken, manageToken, error, success, needsVerification, verifyType } = props;
  const currentTitle = escapeHtml(note.title || '');
  const currentContent = escapeHtml(note.content || '');
  const errorHtml = error ? `<div class="error">${escapeHtml(error)}</div>` : '';
  const successHtml = success ? `<div class="success">${escapeHtml(success)}</div>` : '';

  // Verification Screen if user is not authorized yet
  if (needsVerification) {
    const isPasswordType = verifyType === 'password' || !!note.password;
    const verifyContent = `
<section class="manage-note-page wrap">
  <a class="settings-back" href="/${escapeHtml(note.slug)}">← Kembali ke catatan</a>
  <div class="settings-card">
    <div class="settings-heading">
      <span>VERIFIKASI AKSES EDIT</span>
      <h1>${isPasswordType ? 'Masukkan Password' : 'Verifikasi Kepemilikan'}</h1>
      <p>Catatan: <strong>/${escapeHtml(note.slug)}</strong></p>
    </div>
    ${errorHtml}
    <form method="POST" action="/${escapeHtml(note.slug)}/verifikasi-edit">
      <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
      ${
        isPasswordType
          ? `
      <label>Password Catatan
        <input type="password" name="password" placeholder="Masukkan password catatan..." autofocus required>
      </label>
      <p style="margin-top:8px; font-size:11px; color:var(--muted);">Catatan ini diproteksi password. Masukkan password yang benar untuk membuka akses edit.</p>
      `
          : `
      <label>Token Pengelolaan (Manage Token)
        <input type="password" name="manage_token" placeholder="Masukkan token kelola..." autofocus required>
      </label>
      <p style="margin-top:8px; font-size:11px; color:var(--muted);">Gunakan token pengelolaan atau tautan kelola yang kamu miliki saat membuat catatan ini.</p>
      `
      }
      <button type="submit" class="btn full" style="margin-top: 20px;">Verifikasi & Lanjutkan Edit</button>
    </form>
  </div>
</section>
`;

    return renderLayout(verifyContent, {
      title: `Verifikasi Edit - ${note.title || 'Catatan'}`,
      csrfToken,
      showPromotion: true,
      noIndex: true,
    });
  }

  // Full Editor Screen
  const words = countWords(note.content);
  const chars = note.content.length;
  const actionUrl = manageToken
    ? `/kelola/${escapeHtml(note.slug)}/${escapeHtml(manageToken)}/edit`
    : `/${escapeHtml(note.slug)}/edit`;

  const content = `
<section class="editor-wrap wrap">
  <div class="workspace-head">
    <div>
      <span class="eyebrow">EDIT CATATAN</span>
      <h1 style="font-size:clamp(26px, 3.5vw, 38px); font-weight: 800; letter-spacing: -1.2px; margin: 0 0 8px;">Perbarui Catatan Kamu</h1>
      <p style="margin:0; color:var(--muted); font-size:13px;">Tautan publik: <strong>/${escapeHtml(note.slug)}</strong>. Seluruh riwayat perubahan tersimpan aman.</p>
    </div>
    <div style="display:flex; gap:10px;">
      <a href="/${escapeHtml(note.slug)}" class="btn secondary" style="padding:10px 16px; font-size:11px;">Batal</a>
    </div>
  </div>

  <form class="paper" method="POST" action="${actionUrl}">
    <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
    <input type="hidden" name="_method" value="PUT">
    <div class="paper-head">
      <div class="window-actions"><i></i><i></i><i></i></div>
      <input name="title" id="edit-title" value="${currentTitle}" maxlength="120" placeholder="Beri judul (opsional)">
      <span id="status"><i></i> Mode Edit</span>
    </div>
    <textarea name="content" id="content" maxlength="100000" autofocus placeholder="Tulis isi catatan di sini...">${currentContent}</textarea>
    <div class="paper-foot">
      <span><b id="words">${words}</b> kata <i></i> <b id="chars">${chars}</b> karakter</span>
      <span>Plain text</span>
    </div>
    ${errorHtml}
    ${successHtml}
    <div class="submit-row" style="border-top:1px solid var(--line);">
      <p style="margin:0; font-size:11px; color:var(--muted);">Setiap kali kamu menyimpan perubahan, versi terbaru akan langsung diperbarui di tautan publik.</p>
      <div style="display:flex; gap:10px; align-items:center;">
        <a href="/${escapeHtml(note.slug)}" class="btn secondary" style="box-shadow:none;">Kembali</a>
        <button class="btn" type="submit">Simpan Perubahan <span>✓</span></button>
      </div>
    </div>
  </form>
</section>
`;

  const scripts = `<script>
const t=document.querySelector('#content'),w=document.querySelector('#words'),c=document.querySelector('#chars'),s=document.querySelector('#status');
function count(){
  const v=t.value.trim();
  w.textContent=v?v.split(/\\s+/).length:0;
  c.textContent=t.value.length;
  s.textContent='Sedang diedit';
}
t.addEventListener('input',count);
</script>`;

  return renderLayout(content, {
    title: `Edit: ${note.title || 'Catatan'}`,
    csrfToken,
    showPromotion: true,
    noIndex: true,
    scripts,
  });
}
