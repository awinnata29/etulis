import { Note } from '../../types';
import {
  escapeHtml,
  formatIndonesianDateShort,
  formatTimeShort,
} from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminDashboardViewProps {
  adminPath: string;
  csrfToken: string;
  stats: {
    totalNotes: number;
    totalViews: number;
    protectedNotes: number;
    expiredNotes: number;
  };
  notes: Note[];
  total: number;
  currentPage: number;
  totalPages: number;
  query?: string;
  success?: string;
}

export function renderAdminDashboard(props: AdminDashboardViewProps): string {
  const { adminPath, csrfToken, stats, notes, total, currentPage, totalPages, query, success } = props;
  const successHtml = success ? `<div class="admin-alert success">${escapeHtml(success)}</div>` : '';

  let tableRows = '';
  if (notes.length === 0) {
    tableRows = `<tr><td colspan="6" class="admin-empty">${
      query ? 'Catatan tidak ditemukan.' : 'Belum ada catatan.'
    }</td></tr>`;
  } else {
    tableRows = notes
      .map((note) => {
        const titleText = note.title ? escapeHtml(note.title) : 'Tanpa judul';
        const snippet = escapeHtml(
          note.content.length > 55 ? note.content.substring(0, 55) + '...' : note.content
        );

        return `
    <tr>
      <td><strong>${titleText}</strong><small>${snippet}</small></td>
      <td><a class="admin-slug" href="/${note.slug}" target="_blank">/${escapeHtml(note.slug)}</a></td>
      <td><span class="access-pill ${note.password ? 'private' : ''}">${
          note.password ? 'Privat' : 'Publik'
        }</span></td>
      <td>${note.views}</td>
      <td><span>${formatIndonesianDateShort(note.created_at)}</span><small>${formatTimeShort(
          note.created_at
        )}</small></td>
      <td>
        <div class="row-actions">
          <a href="/${escapeHtml(adminPath)}/catatan/${note.slug}">Lihat</a>
          <button type="button" class="password-action" onclick="document.querySelector('#password-modal-${
            note.id
          }').showModal()">Password</button>
          <form method="POST" action="/${escapeHtml(adminPath)}/catatan/${note.slug}" onsubmit="return confirm('Hapus catatan ini?')">
            <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
            <input type="hidden" name="_method" value="DELETE">
            <button type="submit">Hapus</button>
          </form>
        </div>
        <dialog class="password-modal" id="password-modal-${
          note.id
        }" onclick="if(event.target===this)this.close()">
          <div class="password-modal-card">
            <div class="password-modal-head">
              <div><span>PASSWORD CATATAN</span><h3>${titleText}</h3></div>
              <button type="button" onclick="this.closest('dialog').close()" aria-label="Tutup">×</button>
            </div>
            <form method="POST" action="/${escapeHtml(adminPath)}/catatan/${note.slug}/password">
              <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
              <input type="hidden" name="_method" value="PUT">
              <label>Password baru<input type="password" name="password" placeholder="Kosongkan untuk menghapus"></label>
              <label>Konfirmasi password<input type="password" name="password_confirmation"></label>
              <div class="password-modal-actions">
                <button type="button" onclick="this.closest('dialog').close()">Batal</button>
                <button type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </dialog>
      </td>
    </tr>`;
      })
      .join('');
  }

  // Build pagination links
  const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
  let paginationHtml = '';
  if (totalPages > 1) {
    const prevLink =
      currentPage > 1
        ? `<a href="/${escapeHtml(adminPath)}?page=${currentPage - 1}${queryParam}">← Sebelumnya</a>`
        : `<span>← Sebelumnya</span>`;
    const nextLink =
      currentPage < totalPages
        ? `<a href="/${escapeHtml(adminPath)}?page=${currentPage + 1}${queryParam}">Berikutnya →</a>`
        : `<span>Berikutnya →</span>`;

    paginationHtml = `
      <nav role="navigation" style="display:flex; justify-content:space-between; align-items:center;">
        <div>Halaman ${currentPage} dari ${totalPages}</div>
        <div style="display:flex; gap:16px;">${prevLink} ${nextLink}</div>
      </nav>
    `;
  }

  const content = `
<section class="admin-dashboard wrap">
 <div class="admin-topbar">
  <div><span class="admin-label">ADMIN DASHBOARD</span><h1>Catatan</h1></div>
  <div class="admin-top-actions">
    <a class="admin-ghost" href="/${escapeHtml(adminPath)}/pengaturan/password">Ubah password</a>
    <a class="admin-primary" href="/">Buat catatan</a>
    <form method="POST" action="/${escapeHtml(adminPath)}/logout">
      <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
      <button type="submit">Keluar</button>
    </form>
  </div>
 </div>
 ${successHtml}
 <div class="admin-stats">
  <article><span>Total catatan</span><strong>${stats.totalNotes}</strong><small>Semua link</small></article>
  <article><span>Total dilihat</span><strong>${stats.totalViews}</strong><small>Seluruh kunjungan</small></article>
  <article><span>Diproteksi</span><strong>${stats.protectedNotes}</strong><small>Menggunakan password</small></article>
  <article><span>Kedaluwarsa</span><strong>${stats.expiredNotes}</strong><small>Memiliki batas waktu</small></article>
 </div>
 <div class="admin-content-card">
  <div class="admin-table-head">
    <div><h2>Semua catatan</h2><span>${total} hasil</span></div>
    <form method="GET" action="/${escapeHtml(adminPath)}">
      <input name="q" value="${escapeHtml(query || '')}" placeholder="Cari judul atau link">
      <button type="submit">Cari</button>
    </form>
  </div>
  <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>Catatan</th><th>Link</th><th>Akses</th><th>Dilihat</th><th>Dibuat</th><th></th></tr></thead>
      <tbody>
      ${tableRows}
      </tbody>
    </table>
  </div>
  <div class="admin-pagination">${paginationHtml}</div>
 </div>
</section>
<style>.password-modal[open]{position:fixed;inset:0;display:block;margin:auto;max-height:calc(100vh - 32px)}</style>
`;

  return renderLayout(content, {
    title: 'Admin Dashboard',
    csrfToken,
    showPromotion: false,
  });
}
