import { Note } from '../../types';
import { escapeHtml, formatIndonesianDateTime } from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminShowViewProps {
  adminPath: string;
  note: Note;
  origin: string;
  csrfToken: string;
  error?: string;
  success?: string;
}

export function renderAdminShow(props: AdminShowViewProps): string {
  const { adminPath, note, origin, csrfToken, error, success } = props;
  const titleText = note.title ? escapeHtml(note.title) : 'Tanpa judul';
  const errorPasswordHtml = error ? `<div class="field-error">${escapeHtml(error)}</div>` : '';
  const successHtml = success ? `<div class="admin-alert success" style="margin-bottom: 20px;">${escapeHtml(success)}</div>` : '';

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
      <span>${note.password ? 'Privat' : 'Publik'}</span>
      <span>${formatIndonesianDateTime(note.created_at)}</span>
    </div>
  </div>
  <div class="detail-actions">
    <a href="/${note.slug}" target="_blank">Buka link</a>
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
</section>
`;

  return renderLayout(content, {
    title: `Admin - ${note.title || 'Detail Catatan'}`,
    csrfToken,
    showPromotion: false,
  });
}
