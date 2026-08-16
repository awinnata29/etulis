import { Note } from '../types';
import { escapeHtml } from '../utils/format';
import { renderLayout } from './layout';

export interface UnlockViewProps {
  note: Note;
  csrfToken: string;
  error?: string;
}

export function renderUnlock(props: UnlockViewProps): string {
  const { note, csrfToken, error } = props;
  const errorHtml = error ? `<div class="unlock-error" role="alert">${escapeHtml(error)}</div>` : '';

  const content = `
<section class="unlock-page wrap">
    <div class="unlock-card">
        <div class="unlock-visual" aria-hidden="true">
            <div class="unlock-orbit orbit-one"></div>
            <div class="unlock-orbit orbit-two"></div>
            <div class="unlock-shield">
                <svg viewBox="0 0 64 64" fill="none">
                    <path d="M32 7 51 14v15c0 13-7.8 22.4-19 28C20.8 51.4 13 42 13 29V14l19-7Z" stroke="currentColor" stroke-width="3"/>
                    <rect x="24" y="29" width="16" height="13" rx="3" fill="currentColor"/>
                    <path d="M27 29v-4a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="3"/>
                </svg>
            </div>
            <div class="unlock-visual-copy">
                <span>PRIVASI TERJAGA</span>
                <strong>Hanya pemilik password yang dapat membuka catatan ini.</strong>
            </div>
        </div>

        <div class="unlock-form-panel">
            <div class="unlock-heading">
                <span>CATATAN TERLINDUNGI</span>
                <h1>Masukkan<br><em>password.</em></h1>
                <p>Pemilik catatan melindungi isi tautan ini. Masukkan password untuk melanjutkan.</p>
            </div>

            <form method="POST" action="/${note.slug}/buka">
                <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
                <div class="unlock-label-row">
                    <label for="note-password">Password</label>
                    <button id="toggle-note-password" type="button">Tampilkan</button>
                </div>
                <div class="unlock-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" stroke-width="1.7"/></svg>
                    <input id="note-password" type="password" name="password" autofocus autocomplete="current-password" placeholder="Masukkan password" required>
                </div>
                ${errorHtml}
                <button class="unlock-submit" type="submit"><span>Buka catatan</span><i></i></button>
            </form>

            <div class="unlock-trust"><span>✓</span> Password diproses dengan aman</div>
        </div>
    </div>
</section>
`;

  const scripts = `
<script>
const toggleNotePassword = document.querySelector('#toggle-note-password');
const notePassword = document.querySelector('#note-password');
toggleNotePassword.addEventListener('click', () => {
    const isVisible = notePassword.type === 'text';
    notePassword.type = isVisible ? 'password' : 'text';
    toggleNotePassword.textContent = isVisible ? 'Tampilkan' : 'Sembunyikan';
    notePassword.focus();
});
</script>
`;

  return renderLayout(content, {
    title: 'Catatan Terlindungi',
    csrfToken,
    showPromotion: true,
    scripts,
  });
}
