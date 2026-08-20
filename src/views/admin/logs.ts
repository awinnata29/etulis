import { AdminEditLogStats, NoteEditLog } from '../../types';
import {
  escapeHtml,
  formatIndonesianDateShort,
  formatIndonesianDateTime,
  formatTimeShort,
} from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminLogsViewProps {
  adminPath: string;
  csrfToken: string;
  stats: AdminEditLogStats;
  logs: NoteEditLog[];
  total: number;
  currentPage: number;
  totalPages: number;
  query?: string;
  editorFilter?: string;
  success?: string;
}

export function renderAdminLogs(props: AdminLogsViewProps): string {
  const {
    adminPath,
    csrfToken,
    stats,
    logs,
    total,
    currentPage,
    totalPages,
    query,
    editorFilter,
    success,
  } = props;

  const successHtml = success ? `<div class="admin-alert success">${escapeHtml(success)}</div>` : '';

  let tableRows = '';
  if (logs.length === 0) {
    tableRows = `<tr><td colspan="5" class="admin-empty">${
      query || editorFilter ? 'Tidak ada riwayat edit yang cocok dengan filter.' : 'Belum ada riwayat pengeditan catatan.'
    }</td></tr>`;
  } else {
    tableRows = logs
      .map((log) => {
        const slug = log.note_slug ? escapeHtml(log.note_slug) : `ID #${log.note_id}`;
        const currentTitle = log.note_current_title
          ? escapeHtml(log.note_current_title)
          : 'Tanpa judul';
        const oldTitleText = log.old_title ? escapeHtml(log.old_title) : '(Tanpa judul)';
        const newTitleText = log.new_title ? escapeHtml(log.new_title) : '(Tanpa judul)';
        const diffText = log.diff_summary ? escapeHtml(log.diff_summary) : 'Perubahan teks';
        const isAdmin = log.editor_type === 'admin';
        const editorBadge = isAdmin
          ? `<span class="access-pill" style="background:#eef2ff; color:#3b5998; font-weight:700;">Admin</span>`
          : `<span class="access-pill" style="background:#f0fdf4; color:#15803d; font-weight:700;">Guest</span>`;

        const ipText = log.editor_ip ? `<small style="color:var(--muted); font-size:8px;">${escapeHtml(log.editor_ip)}</small>` : '';

        return `
    <tr>
      <td>
        <strong>${currentTitle}</strong>
        <a class="admin-slug" href="/${escapeHtml(log.note_slug || '')}" target="_blank">/${slug}</a>
      </td>
      <td>
        ${editorBadge}
        ${ipText}
      </td>
      <td>
        <span style="font-size:10px; font-weight:600; color:var(--ink);">${diffText}</span>
      </td>
      <td>
        <span>${formatIndonesianDateShort(log.created_at)}</span>
        <small>${formatTimeShort(log.created_at)}</small>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn-diff-modal" onclick="document.querySelector('#diff-modal-${log.id}').showModal()">Bandingkan</button>
        </div>

        <dialog class="diff-modal" id="diff-modal-${log.id}" onclick="if(event.target===this)this.close()">
          <div class="diff-modal-card">
            <div class="diff-modal-head">
              <div>
                <span class="detail-label">DETAIL RIWAYAT EDIT #${log.id}</span>
                <h3>Catatan: /${slug}</h3>
                <p style="margin:4px 0 0; font-size:10px; color:var(--muted);">Diedit oleh <strong>${isAdmin ? 'Administrator' : 'Guest'}</strong> pada ${formatIndonesianDateTime(log.created_at)} ${log.editor_ip ? `(${escapeHtml(log.editor_ip)})` : ''}</p>
              </div>
              <button type="button" class="modal-close-btn" onclick="this.closest('dialog').close()" aria-label="Tutup">×</button>
            </div>

            <div class="diff-summary-banner">
              <strong>Ringkasan Perubahan:</strong> ${diffText}
            </div>

            ${
              log.old_title !== log.new_title
                ? `
            <div class="diff-title-compare">
              <div class="diff-box old-box">
                <span class="diff-box-label">Judul Sebelumnya</span>
                <p>${oldTitleText}</p>
              </div>
              <div class="diff-box new-box">
                <span class="diff-box-label">Judul Sesudah Edit</span>
                <p>${newTitleText}</p>
              </div>
            </div>
            `
                : ''
            }

            <div class="diff-content-compare">
              <div class="diff-box old-box">
                <div class="diff-box-header">
                  <span>Isi Teks Sebelumnya</span>
                  <small>${log.old_content.length} karakter</small>
                </div>
                <pre class="diff-pre" tabindex="0">${escapeHtml(log.old_content)}</pre>
              </div>
              <div class="diff-box new-box">
                <div class="diff-box-header">
                  <span>Isi Teks Terbaru (Hasil Edit)</span>
                  <small>${log.new_content.length} karakter</small>
                </div>
                <pre class="diff-pre" tabindex="0">${escapeHtml(log.new_content)}</pre>
              </div>
            </div>

            <div class="diff-modal-foot">
              <a href="/${escapeHtml(adminPath)}/catatan/${escapeHtml(log.note_slug || '')}" class="btn secondary" style="font-size:10px; padding:8px 14px;">Buka Detail Catatan</a>
              <button type="button" class="btn" style="font-size:10px; padding:8px 16px;" onclick="this.closest('dialog').close()">Tutup</button>
            </div>
          </div>
        </dialog>
      </td>
    </tr>`;
      })
      .join('');
  }

  // Build pagination links
  const queryParams = new URLSearchParams();
  if (query) queryParams.set('q', query);
  if (editorFilter) queryParams.set('editor', editorFilter);
  const qStr = queryParams.toString() ? `&${queryParams.toString()}` : '';

  let paginationHtml = '';
  if (totalPages > 1) {
    const prevLink =
      currentPage > 1
        ? `<a href="/${escapeHtml(adminPath)}/riwayat-edit?page=${currentPage - 1}${qStr}">← Sebelumnya</a>`
        : `<span>← Sebelumnya</span>`;
    const nextLink =
      currentPage < totalPages
        ? `<a href="/${escapeHtml(adminPath)}/riwayat-edit?page=${currentPage + 1}${qStr}">Berikutnya →</a>`
        : `<span>Berikutnya →</span>`;

    paginationHtml = `
      <nav role="navigation" style="display:flex; justify-content:space-between; align-items:center;">
        <div>Halaman ${currentPage} dari ${totalPages} (${total} total riwayat)</div>
        <div style="display:flex; gap:16px;">${prevLink} ${nextLink}</div>
      </nav>
    `;
  }

  const content = `
<section class="admin-dashboard wrap">
  <div class="admin-topbar">
    <div>
      <span class="admin-label">ADMIN PANEL</span>
      <h1>Riwayat Edit</h1>
    </div>
    <div class="admin-top-actions">
      <a class="admin-ghost" href="/${escapeHtml(adminPath)}">Daftar Catatan</a>
      <a class="admin-ghost" href="/${escapeHtml(adminPath)}/pengaturan/password">Ubah Password</a>
      <a class="admin-primary" href="/">Buat Catatan Baru</a>
      <form method="POST" action="/${escapeHtml(adminPath)}/logout">
        <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
        <button type="submit">Keluar</button>
      </form>
    </div>
  </div>

  ${successHtml}

  <div class="admin-stats">
    <article>
      <span>Total Riwayat Edit</span>
      <strong>${stats.totalEdits}</strong>
      <small>Semua aktivitas edit</small>
    </article>
    <article>
      <span>Diedit Admin</span>
      <strong>${stats.adminEdits}</strong>
      <small>Melalui admin panel</small>
    </article>
    <article>
      <span>Diedit Guest</span>
      <strong>${stats.guestEdits}</strong>
      <small>Oleh pembuat catatan</small>
    </article>
    <article>
      <span>Catatan Diedit</span>
      <strong>${stats.uniqueNotesEdited}</strong>
      <small>Catatan yang pernah diubah</small>
    </article>
  </div>

  <div class="admin-content-card">
    <div class="admin-table-head">
      <div>
        <h2>Aktivitas Pengeditan</h2>
        <span>${total} hasil ditemukan</span>
      </div>
      <form method="GET" action="/${escapeHtml(adminPath)}/riwayat-edit" style="display:flex; gap:8px; flex-wrap:wrap;">
        <select name="editor" style="height:36px; padding:0 10px; border:1px solid #dfe3e8; border-radius:8px; background:#f8f9fa; font:500 9px 'Manrope'; outline:none;">
          <option value="" ${!editorFilter ? 'selected' : ''}>Semua Pengedit</option>
          <option value="admin" ${editorFilter === 'admin' ? 'selected' : ''}>Admin Saja</option>
          <option value="guest" ${editorFilter === 'guest' ? 'selected' : ''}>Guest Saja</option>
        </select>
        <input name="q" value="${escapeHtml(query || '')}" placeholder="Cari slug, judul, atau ringkasan...">
        <button type="submit">Filter</button>
        ${query || editorFilter ? `<a href="/${escapeHtml(adminPath)}/riwayat-edit" class="btn secondary" style="font-size:9px; padding:0 10px; display:grid; place-items:center; height:36px;">Reset</a>` : ''}
      </form>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Catatan</th>
            <th>Pengedit</th>
            <th>Ringkasan Perubahan</th>
            <th>Waktu Edit</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="admin-pagination">${paginationHtml}</div>
  </div>
</section>
`;

  return renderLayout(content, {
    title: 'Admin - Riwayat Edit & Log Catatan',
    csrfToken,
    showPromotion: false,
    noIndex: true,
  });
}
