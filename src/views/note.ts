import { Note } from '../types';
import { diffForHumans, escapeHtml, formatIndonesianDateTime } from '../utils/format';
import { renderLayout } from './layout';

export interface NoteViewProps {
  note: Note;
  manageToken?: string | null;
  csrfToken?: string;
}

export function renderNote(props: NoteViewProps): string {
  const { note, manageToken } = props;
  const titleText = note.title ? escapeHtml(note.title) : 'Tanpa judul';

  const passwordActionHtml = manageToken
    ? `<a href="/kelola/${note.slug}/${manageToken}">Ubah password</a>`
    : note.password
      ? `<a href="/${note.slug}/ubah-password">Ubah password</a>`
      : '';

  const expirySpan = note.expires_at
    ? `<span>Berakhir ${diffForHumans(note.expires_at)}</span>`
    : '';

  const passwordSpan = note.password ? `<span>Diproteksi password</span>` : '';

  const content = `
<article class="public-note wrap">
 <header class="public-note-head">
  <div><span class="detail-label">CATATAN ETULIS</span><h1>${titleText}</h1></div>
  <div class="public-note-actions">
    ${passwordActionHtml}
    <button type="button" onclick="navigator.clipboard.writeText(document.querySelector('#note-content').innerText);this.textContent='Tersalin'">Salin isi</button>
    <button type="button" onclick="navigator.clipboard.writeText(location.href);this.textContent='Link tersalin'">Salin link</button>
  </div>
 </header>
 <div class="public-note-meta">
   <span>${formatIndonesianDateTime(note.created_at)}</span>
   <span>${note.views} kali dilihat</span>
   ${passwordSpan}
   ${expirySpan}
 </div>
 <div class="note-scroll-shell">
   <div class="public-note-content" id="note-content" data-scroll-content tabindex="0">${escapeHtml(note.content)}</div>
   <div class="note-scroll-hint" data-scroll-hint>Scroll untuk melihat isi lainnya</div>
 </div>
 <div class="public-note-bottom"><a href="/">Buat catatan baru</a></div>
</article>
`;

  const metaDesc = note.content.length > 150
    ? note.content.substring(0, 150).replace(/\s+/g, ' ') + '...'
    : note.content.replace(/\s+/g, ' ');

  return renderLayout(content, {
    title: note.title ? `${note.title}` : 'Catatan',
    description: metaDesc || 'Buka dan baca catatan teks di etulis notepad online.',
    canonicalUrl: `https://etulis.com/${note.slug}`,
    ogType: 'article',
    csrfToken: props.csrfToken,
    showPromotion: true,
  });
}
