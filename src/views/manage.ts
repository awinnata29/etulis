import { Note } from '../types';
import { escapeHtml } from '../utils/format';
import { renderLayout } from './layout';

export interface ManageViewProps {
  note: Note;
  token: string;
  csrfToken: string;
  success?: string;
  error?: string;
}

export function renderManage(props: ManageViewProps): string {
  const { note, token, csrfToken, success, error } = props;
  const successHtml = success ? `<div class="admin-alert success">${escapeHtml(success)}</div>` : '';
  const errorHtml = error ? `<div class="field-error">${escapeHtml(error)}</div>` : '';

  const content = `
<section class="manage-note-page wrap">
 <a class="settings-back" href="/${note.slug}">Kembali ke catatan</a>
 <div class="settings-card">
  <div class="settings-heading"><span>KELOLA CATATAN</span><h1>Ubah password</h1><p>/${escapeHtml(note.slug)}</p></div>
  ${successHtml}
  <form method="POST" action="/kelola/${note.slug}/${escapeHtml(token)}">
   <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
   <input type="hidden" name="_method" value="PUT">
   <label>Password baru<input type="password" name="password" placeholder="Kosongkan untuk menghapus password"></label>
   ${errorHtml}
   <label>Konfirmasi password<input type="password" name="password_confirmation"></label>
   <button type="submit">Simpan perubahan</button>
  </form>
 </div>
</section>
`;

  return renderLayout(content, {
    title: 'Kelola Password Catatan',
    csrfToken,
    showPromotion: true,
  });
}
