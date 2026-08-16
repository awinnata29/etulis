import { Note } from '../types';
import { diffForHumans, escapeHtml } from '../utils/format';
import { renderLayout } from './layout';

export interface CreatedViewProps {
  note: Note;
  origin: string;
  manageToken?: string | null;
  csrfToken?: string;
}

export function renderCreated(props: CreatedViewProps): string {
  const { note, origin, manageToken } = props;
  const noteUrl = `${origin}/${note.slug}`;
  const manageUrl = manageToken ? `${origin}/kelola/${note.slug}/${manageToken}` : '';

  const expiryText = note.expires_at
    ? `Berakhir ${diffForHumans(note.expires_at)}`
    : 'Tidak kedaluwarsa';

  const content = `
<section class="created-page wrap">
    <div class="created-card">
        <div class="created-hero">
            <div class="created-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="m7 12.5 3.2 3.2L17.5 8.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="created-eyebrow">CATATAN BERHASIL DITERBITKAN</span>
            <h1>Catatanmu siap<br><em>dibagikan.</em></h1>
            <p>Tautan sudah aktif dan bisa langsung kamu kirim kepada siapa pun.</p>
        </div>

        <div class="created-content">
            <div class="created-section-head">
                <div><span>TAUTAN PUBLIK</span><h2>Bagikan catatan</h2></div>
                <span class="created-live"><i></i> Aktif</span>
            </div>

            <div class="created-copy">
                <span class="created-link-icon" aria-hidden="true">↗</span>
                <input id="public-link" readonly value="${escapeHtml(noteUrl)}" aria-label="Tautan publik catatan">
                <button type="button" data-copy-target="public-link"><span>Salin tautan</span></button>
            </div>

            <div class="created-status">
                <div><span class="status-icon">${note.password ? '◆' : '○'}</span><p><small>AKSES</small><strong>${note.password ? 'Dilindungi password' : 'Catatan publik'}</strong></p></div>
                <div><span class="status-icon">⌁</span><p><small>MASA AKTIF</small><strong>${escapeHtml(expiryText)}</strong></p></div>
            </div>

            ${
              manageToken
                ? `
                <div class="created-manage">
                    <div class="created-manage-copy">
                        <span>TAUTAN PENGELOLAAN</span>
                        <h3>Simpan tautan khusus ini</h3>
                        <p>Gunakan untuk mengubah password catatan. Jangan bagikan tautan ini kepada orang lain.</p>
                    </div>
                    <div class="created-copy compact">
                        <input id="manage-link" readonly value="${escapeHtml(manageUrl)}" aria-label="Tautan pengelolaan catatan">
                        <button type="button" data-copy-target="manage-link" aria-label="Salin tautan pengelolaan"><span>Salin</span></button>
                    </div>
                </div>
            `
                : ''
            }

            <div class="created-actions">
                <a class="created-primary" href="/${note.slug}">Lihat catatan <i></i></a>
                ${
                  manageToken
                    ? `<a class="created-secondary" href="/kelola/${note.slug}/${manageToken}">Kelola password</a>`
                    : ''
                }
                <a class="created-quiet" href="/">Buat catatan baru</a>
            </div>
        </div>
    </div>
    <p class="created-footnote"><span>✓</span> Tautan publik dapat langsung dibuka tanpa akun etulis.</p>
</section>
`;

  const scripts = `
<script>
document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
        const input = document.getElementById(button.dataset.copyTarget);
        try {
            await navigator.clipboard.writeText(input.value);
        } catch (_) {
            input.select();
            document.execCommand('copy');
            window.getSelection()?.removeAllRanges();
        }
        const label = button.querySelector('span');
        const original = label.textContent;
        button.classList.add('copied');
        label.textContent = 'Tersalin ✓';
        window.setTimeout(() => {
            button.classList.remove('copied');
            label.textContent = original;
        }, 1800);
    });
});
</script>
`;

  return renderLayout(content, {
    title: 'Catatan Siap Dibagikan',
    csrfToken: props.csrfToken,
    showPromotion: true,
    scripts,
  });
}
