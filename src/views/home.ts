import { escapeHtml } from '../utils/format';
import { renderLayout } from './layout';

export interface HomeViewProps {
  csrfToken: string;
  isAdmin?: boolean;
  error?: string;
  old?: {
    title?: string;
    content?: string;
    slug?: string;
  };
}

export function renderHome(props: HomeViewProps): string {
  const oldTitle = escapeHtml(props.old?.title || '');
  const oldContent = escapeHtml(props.old?.content || '');
  const oldSlug = escapeHtml(props.old?.slug || '');
  const errorHtml = props.error ? `<div class="error">${escapeHtml(props.error)}</div>` : '';

  const content = `
<section class="editor-wrap wrap">
 <form class="paper" method="POST" action="/tulis">
  <input type="hidden" name="_token" value="${escapeHtml(props.csrfToken)}">
  <div class="paper-head"><div class="window-actions"><i></i><i></i><i></i></div><input name="title" value="${oldTitle}" maxlength="120" placeholder="Beri judul (opsional)"><span id="status"><i></i> Draf baru</span></div>
  <textarea name="content" id="content" maxlength="100000" autofocus placeholder="Mulai menulis di sini...">${oldContent}</textarea>
  <div class="paper-foot"><span><b id="words">0</b> kata <i></i> <b id="chars">0</b> karakter</span><span>Plain text</span></div>
  ${errorHtml}
  <div class="options ${props.isAdmin ? '' : 'options-guest'}">
   ${
     props.isAdmin
       ? `<label><span class="label-icon">↗</span><span>Custom link<small>Khusus administrator</small></span><div class="slug"><span>/</span><input name="slug" value="${oldSlug}" placeholder="nama-link"></div></label>`
       : ''
   }
   <label><span class="label-icon">⌘</span><span>Password<small>Opsional, minimal 4 karakter</small></span><input type="password" name="password" placeholder="Masukkan password"></label>
   <label><span class="label-icon">◷</span><span>Masa berlaku<small>Hapus otomatis setelah</small></span><select name="expires"><option value="">Selamanya</option><option value="1h">1 jam</option><option value="1d">1 hari</option><option value="7d">7 hari</option><option value="30d">30 hari</option></select></label>
  </div>
  <div class="submit-row"><p>Link acak akan dibuat otomatis dan siap dibagikan.</p><button class="btn" type="submit">Terbitkan catatan <span>↗</span></button></div>
 </form>
</section>
`;

  const scripts = `<script>const t=document.querySelector('#content'),w=document.querySelector('#words'),c=document.querySelector('#chars'),s=document.querySelector('#status');function count(){const v=t.value.trim();w.textContent=v?v.split(/\\s+/).length:0;c.textContent=t.value.length;s.textContent=t.value?'Siap dibuat':'Belum disimpan'}t.addEventListener('input',count);count()</script>`;

  return renderLayout(content, {
    csrfToken: props.csrfToken,
    showPromotion: true,
    scripts,
  });
}
