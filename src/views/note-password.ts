import { Note } from '../types';
import { escapeHtml } from '../utils/format';
import { renderLayout } from './layout';

export interface NotePasswordViewProps {
  note: Note;
  csrfToken: string;
  success?: string;
  errors?: {
    current_password?: string;
    password?: string;
  };
}

export function renderNotePassword(props: NotePasswordViewProps): string {
  const { note, csrfToken, success, errors } = props;
  const successHtml = success ? `<div class="admin-alert success">${escapeHtml(success)}</div>` : '';
  const errorCurrentHtml = errors?.current_password
    ? `<div class="field-error">${escapeHtml(errors.current_password)}</div>`
    : '';
  const errorNewHtml = errors?.password
    ? `<div class="field-error">${escapeHtml(errors.password)}</div>`
    : '';

  const content = `
<section class="manage-note-page wrap">
 <a class="settings-back" href="/${note.slug}">Kembali ke catatan</a>
 <div class="settings-card">
  <div class="settings-heading"><span>KEAMANAN CATATAN</span><h1>Ubah password</h1><p>/${escapeHtml(note.slug)}</p></div>
  ${successHtml}
  <form method="POST" action="/${note.slug}/ubah-password">
   <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
   <input type="hidden" name="_method" value="PUT">
   <label>Password saat ini<input type="password" name="current_password" required></label>
   ${errorCurrentHtml}
   <label>Password baru<input type="password" name="password" required></label>
   ${errorNewHtml}
   <label>Konfirmasi password baru<input type="password" name="password_confirmation" required></label>
   <button type="submit">Simpan perubahan</button>
  </form>
 </div>
</section>
`;

  return renderLayout(content, {
    title: 'Ubah Password Catatan',
    csrfToken,
    showPromotion: true,
  });
}
