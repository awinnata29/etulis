import { Note } from '../../types';
import { countWords, escapeHtml } from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminEditViewProps {
  adminPath: string;
  note: Note;
  csrfToken: string;
  error?: string;
  success?: string;
}

export function renderAdminEdit(props: AdminEditViewProps): string {
  const { adminPath, note, csrfToken, error, success } = props;
  const currentTitle = escapeHtml(note.title || '');
  const currentContent = escapeHtml(note.content || '');
  const currentSlug = escapeHtml(note.slug);
  const errorHtml = error ? `<div class="admin-alert" style="background:#fff0f1; color:#ad3543; margin-bottom:20px;">${escapeHtml(error)}</div>` : '';
  const successHtml = success ? `<div class="admin-alert success" style="margin-bottom:20px;">${escapeHtml(success)}</div>` : '';
  const words = countWords(note.content);
  const chars = note.content.length;

  const content = `
<section class="admin-note-detail wrap">
  <div class="detail-nav">
    <a href="/${escapeHtml(adminPath)}/catatan/${note.slug}">← Kembali ke detail</a>
    <span>Edit catatan</span>
  </div>

  ${errorHtml}
  ${successHtml}

  <div class="detail-header" style="margin-bottom: 20px;">
    <div>
      <span class="detail-label">ADMIN PANEL • EDIT CATATAN</span>
      <h1 style="font-size: 32px;">Edit /${currentSlug}</h1>
    </div>
    <div class="detail-actions">
      <a href="/${note.slug}" target="_blank">Lihat publik ↗</a>
      <a href="/${escapeHtml(adminPath)}/catatan/${note.slug}">Batal</a>
    </div>
  </div>

  <form class="paper" method="POST" action="/${escapeHtml(adminPath)}/catatan/${note.slug}/edit" style="margin-bottom: 40px;">
    <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
    <input type="hidden" name="_method" value="PUT">

    <div class="paper-head">
      <div class="window-actions"><i></i><i></i><i></i></div>
      <input name="title" id="admin-edit-title" value="${currentTitle}" maxlength="120" placeholder="Beri judul catatan (opsional)">
      <span id="status"><i></i> Mode Admin Edit</span>
    </div>

    <textarea name="content" id="content" maxlength="100000" autofocus placeholder="Isi catatan...">${currentContent}</textarea>

    <div class="paper-foot">
      <span><b id="words">${words}</b> kata <i></i> <b id="chars">${chars}</b> karakter</span>
      <span>Diedit oleh Administrator</span>
    </div>

    <div class="options" style="grid-template-columns: repeat(2, 1fr);">
      <label>
        <span class="label-icon">↗</span>
        <span>Custom Link (Slug)<small>Tautan unik catatan (3-50 karakter)</small></span>
        <div class="slug">
          <span>/</span>
          <input name="slug" value="${currentSlug}" placeholder="nama-slug">
        </div>
      </label>

      <label>
        <span class="label-icon">◷</span>
        <span>Masa Berlaku<small>Batas waktu akses catatan</small></span>
        <select name="expires">
          <option value="keep" selected>Pertahankan saat ini ${note.expires_at ? '(Aktif)' : '(Selamanya)'}</option>
          <option value="never">Ubah ke Selamanya (Tanpa Batas)</option>
          <option value="1h">Atur 1 jam dari sekarang</option>
          <option value="1d">Atur 1 hari dari sekarang</option>
          <option value="7d">Atur 7 hari dari sekarang</option>
          <option value="30d">Atur 30 hari dari sekarang</option>
        </select>
      </label>
    </div>

    <div class="submit-row" style="border-top:1px solid var(--line);">
      <p style="margin:0; font-size:11px; color:var(--muted);">Setiap pengeditan akan dicatat di <strong>Riwayat Edit</strong> sebagai perubahan oleh Admin.</p>
      <div style="display:flex; gap:10px; align-items:center;">
        <a href="/${escapeHtml(adminPath)}/catatan/${note.slug}" class="btn secondary" style="box-shadow:none;">Batal</a>
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
  s.textContent='Sedang diedit (Admin)';
}
t.addEventListener('input',count);
</script>`;

  return renderLayout(content, {
    title: `Admin Edit - ${note.title || note.slug}`,
    csrfToken,
    showPromotion: false,
    noIndex: true,
    scripts,
  });
}
