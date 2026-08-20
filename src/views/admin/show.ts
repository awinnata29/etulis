import { Note, NoteEditLog } from '../../types';
import {
  diffForHumans,
  escapeHtml,
  formatIndonesianDateShort,
  formatIndonesianDateTime,
  formatTimeShort,
} from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminShowViewProps {
  adminPath: string;
  note: Note;
  origin: string;
  csrfToken: string;
  logs?: NoteEditLog[];
  error?: string;
  success?: string;
}

export function renderAdminShow(props: AdminShowViewProps): string {
  const { adminPath, note, origin, csrfToken, logs = [], error, success } = props;
  const titleText = note.title ? escapeHtml(note.title) : 'Tanpa judul';
  const errorPasswordHtml = error ? `<div class="field-error">${escapeHtml(error)}</div>` : '';
  const successHtml = success ? `<div class="admin-alert success" style="margin-bottom: 20px;">${escapeHtml(success)}</div>` : '';

  const isUpdated = note.updated_at && note.updated_at !== note.created_at;
  const updatedSpan = isUpdated ? `<span>Diedit ${diffForHumans(note.updated_at)}</span>` : '';

  // Render logs section
  let logsHtml = '';
  if (logs.length === 0) {
    logsHtml = `<div style="padding: 24px; text-align: center; color: var(--muted); font-size: 11px; background: #f9fafb; border-radius: 12px; border: 1px dashed #dfe3e8;">Belum ada riwayat pengeditan untuk catatan ini.</div>`;
  } else {
    const logItems = logs
      .map((log) => {
        const isAdmin = log.editor_type === 'admin';
        const editorBadge = isAdmin
          ? `<span class="access-pill" style="background:#eef2ff; color:#3b5998; font-weight:700;">Admin</span>`
          : `<span class="access-pill" style="background:#f0fdf4; color:#15803d; font-weight:700;">Guest</span>`;
        const diffText = log.diff_summary ? escapeHtml(log.diff_summary) : 'Perubahan teks';
        const oldTitleText = log.old_title ? escapeHtml(log.old_title) : '(Tanpa judul)';
        const newTitleText = log.new_title ? escapeHtml(log.new_title) : '(Tanpa judul)';

        return `
      <div style="padding: 16px; border: 1px solid #dfe3e8; border-radius: 12px; background: #fff; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            ${editorBadge}
            <strong style="font-size:11px; color:var(--ink);">${diffText}</strong>
            ${log.editor_ip ? `<small style="color:var(--muted); font-size:9px;">(${escapeHtml(log.editor_ip)})</small>` : ''}
          </div>
          <p style="margin:0; font-size:10px; color:var(--muted);">${formatIndonesianDateTime(log.created_at)}</p>
        </div>
        <div>
          <button type="button" class="btn secondary" style="font-size:9px; padding:6px 12px;" onclick="document.querySelector('#show-diff-modal-${log.id}').showModal()">Lihat Perubahan</button>
        </div>

        <dialog class="diff-modal" id="show-diff-modal-${log.id}" onclick="if(event.target===this)this.close()">
          <div class="diff-modal-card">
            <div class="diff-modal-head">
              <div>
                <span class="detail-label">PERBANDINGAN REVISI #${log.id}</span>
                <h3>/${escapeHtml(note.slug)}</h3>
                <p style="margin:4px 0 0; font-size:10px; color:var(--muted);">Diedit oleh <strong>${isAdmin ? 'Admin' : 'Guest'}</strong> pada ${formatIndonesianDateTime(log.created_at)}</p>
              </div>
              <button type="button" class="modal-close-btn" onclick="this.closest('dialog').close()" aria-label="Tutup">×</button>
            </div>

            <div class="diff-summary-banner">
              <strong>Ringkasan:</strong> ${diffText}
            </div>

            ${
              log.old_title !== log.new_title
                ? `
            <div class="diff-title-compare">
              <div class="diff-box old-box">
                <span class="diff-box-label">Judul Sebelum</span>
                <p>${oldTitleText}</p>
              </div>
              <div class="diff-box new-box">
                <span class="diff-box-label">Judul Sesudah</span>
                <p>${newTitleText}</p>
              </div>
            </div>
            `
                : ''
            }

            <div class="diff-content-compare">
              <div class="diff-box old-box">
                <div class="diff-box-header">
                  <span>Isi Sebelum</span>
                  <small>${log.old_content.length} karakter</small>
                </div>
                <pre class="diff-pre" tabindex="0">${escapeHtml(log.old_content)}</pre>
              </div>
              <div class="diff-box new-box">
                <div class="diff-box-header">
                  <span>Isi Sesudah</span>
                  <small>${log.new_content.length} karakter</small>
                </div>
                <pre class="diff-pre" tabindex="0">${escapeHtml(log.new_content)}</pre>
              </div>
            </div>

            <div class="diff-modal-foot">
              <button type="button" class="btn" style="font-size:10px; padding:8px 16px;" onclick="this.closest('dialog').close()">Tutup</button>
            </div>
          </div>
        </dialog>
      </div>`;
      })
      .join('');

    logsHtml = `<div style="display:flex; flex-direction:column; gap:10px;">${logItems}</div>`;
  }

  const content = `
<section class="admin-note-detail wrap">
 <div class="detail-nav"><a href="/${escapeHtml(adminPath)}">Kembali</a><span>Detail catatan</span></div>
 ${successHtml}
 <div class="detail-header">
  <div>
    <span class="detail-label">CATATAN</span>
    <h1>${titleText}</h1>
    <div class="detail-meta">
      <span>/${escapeHtml(note.slug)}</span>
      <span>${note.views} dilihat</span>
      ${updatedSpan}
      <span>${note.password ? 'Privat' : 'Publik'}</span>
      <span>${formatIndonesianDateTime(note.created_at)}</span>
    </div>
  </div>
  <div class="detail-actions">
    <a href="/${escapeHtml(adminPath)}/catatan/${note.slug}/edit" style="background:#111827; color:#fff; border-color:#111827;">✎ Edit catatan</a>
    <a href="/${note.slug}" target="_blank">Buka link ↗</a>
    <button type="button" onclick="navigator.clipboard.writeText(document.querySelector('#admin-note-content').innerText);this.textContent='Tersalin'">Salin isi</button>
    <button type="button" onclick="navigator.clipboard.writeText('${escapeHtml(origin)}/${note.slug}');this.textContent='Tersalin'">Salin link</button>
    <form method="POST" action="/${escapeHtml(adminPath)}/catatan/${note.slug}" onsubmit="return confirm('Hapus catatan ini?')">
      <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
      <input type="hidden" name="_method" value="DELETE">
      <button class="delete" type="submit">Hapus</button>
    </form>
  </div>
 </div>
 <div class="note-scroll-shell">
   <article class="detail-content"><pre id="admin-note-content" data-scroll-content tabindex="0">${escapeHtml(note.content)}</pre></article>
   <div class="note-scroll-hint" data-scroll-hint>Scroll untuk melihat isi lainnya</div>
 </div>

 <section class="note-password-panel">
   <div>
     <span>PASSWORD CATATAN</span>
     <h2>${note.password ? 'Ganti atau hapus password' : 'Tambahkan password'}</h2>
     <p>Kosongkan kolom untuk menghapus password.</p>
   </div>
   <form method="POST" action="/${escapeHtml(adminPath)}/catatan/${note.slug}/password">
     <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
     <input type="hidden" name="_method" value="PUT">
     <input type="password" name="password" placeholder="Password baru">
     <input type="password" name="password_confirmation" placeholder="Konfirmasi password">
     <button type="submit">Simpan</button>
   </form>
   ${errorPasswordHtml}
 </section>

 <section style="margin-top: 32px; padding: 28px; border: 1px solid #dfe3e8; border-radius: 16px; background: #fff; box-shadow: 0 14px 42px rgba(15,23,42,.04);">
   <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
     <div>
       <span class="detail-label" style="margin-bottom: 4px;">RIWAYAT PERUBAHAN</span>
       <h2 style="font-size: 20px; letter-spacing: -0.5px; margin: 0;">Riwayat Edit Catatan Ini</h2>
     </div>
     <span style="font-size: 11px; color: var(--muted);">${logs.length} kali diedit</span>
   </div>
   ${logsHtml}
 </section>
</section>
`;

  return renderLayout(content, {
    title: `Admin - ${note.title || 'Detail Catatan'}`,
    csrfToken,
    showPromotion: false,
    noIndex: true,
  });
}
