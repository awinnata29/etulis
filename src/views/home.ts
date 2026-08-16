import { escapeHtml } from '../utils/format';
import { getInlinePromotionsHtml, renderLayout } from './layout';

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

  const faqItems = [
    {
      q: 'Apakah saya perlu mendaftar akun untuk menggunakan Etulis?',
      a: 'Tidak. Etulis 100% gratis dan bisa digunakan langsung tanpa registrasi akun. Cukup ketik teks catatan Anda dan klik Terbitkan Catatan untuk mendapatkan tautan instan.',
    },
    {
      q: 'Bagaimana cara memproteksi catatan dengan password?',
      a: 'Pada form pembuatan catatan, masukkan password pada kolom yang tersedia. Password akan dienkripsi dengan standar WebCrypto PBKDF2 100.000 iterasi. Hanya orang yang memiliki password yang dapat membaca isinya.',
    },
    {
      q: 'Apa itu fitur masa berlaku catatan?',
      a: 'Anda dapat memilih masa aktif catatan: 1 jam, 1 hari, 7 hari, 30 hari, atau selamanya. Setelah melewati batas waktu tersebut, catatan akan otomatis kedaluwarsa dan tidak dapat diakses lagi.',
    },
    {
      q: 'Apakah data catatan saya aman dari kebocoran?',
      a: 'Ya. Seluruh data diproses secara terenkripsi, menggunakan prepared statements pada database serverless Cloudflare D1, bebas dari celah injeksi SQL, dan output selalu disanitasi untuk mencegah XSS.',
    },
    {
      q: 'Berapa batas maksimal karakter yang bisa ditulis?',
      a: 'Etulis mendukung hingga 100.000 karakter dalam satu catatan, sangat cukup untuk dokumen panjang, artikel, kode pemrograman, daftar tugas, atau catatan harian.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const faqListHtml = faqItems
    .map(
      (item) => `
    <details class="seo-faq-item">
      <summary><h3>${escapeHtml(item.q)}</h3><span>+</span></summary>
      <div class="seo-faq-answer"><p>${escapeHtml(item.a)}</p></div>
    </details>
  `
    )
    .join('');

  const content = `
<section class="editor-wrap wrap">
 <div class="workspace-head">
   <div>
     <span class="eyebrow">NOTEPAD ONLINE INSTAN & AMAN</span>
     <h1 style="font-size:clamp(28px, 4vw, 42px); font-weight: 800; letter-spacing: -1.5px; margin: 0 0 8px;">Tulis, Amankan, & Bagikan Catatan</h1>
     <p style="margin:0; color:var(--muted); font-size:13px;">Simpan teks penting, bagikan tautan instan ke teman atau tim tanpa perlu registrasi.</p>
   </div>
 </div>

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

 <!-- Banner Promosi Mobile (Tepat di Bawah Form / di Atas Fitur Utama) -->
 <div style="margin-top: 36px;">
   ${getInlinePromotionsHtml()}
 </div>

 <!-- Rich SEO Semantic Content Section (Fitur Utama Etulis) -->
 <section class="seo-content-section" style="margin-top: 30px;">
   <div style="text-align: center; max-width: 760px; margin: 0 auto 45px;">
     <span class="eyebrow">FITUR UTAMA ETULIS</span>
     <h2 style="font-size: 28px; letter-spacing: -1px; margin: 6px 0 12px; color: var(--ink);">Mengapa Memilih Etulis Notepad Online?</h2>
     <p style="color: var(--muted); font-size: 13px; line-height: 1.7;">Etulis dirancang untuk memberikan kemudahan menulis dan berbagi teks secara cepat, aman, dan tanpa hambatan teknis.</p>
   </div>

   <div class="seo-feature-grid">
     <article class="seo-feature-card">
       <div class="seo-feature-icon">⚡</div>
       <h3>Instan & Tanpa Akun</h3>
       <p>Langsung mulai mengetik tanpa proses pendaftaran yang rumit. Tautan unik siap disalin dan dikirim dalam hitungan detik.</p>
     </article>

     <article class="seo-feature-card">
       <div class="seo-feature-icon">🔒</div>
       <h3>Proteksi Password Kuat</h3>
       <p>Gunakan enkripsi WebCrypto PBKDF2 100.000 iterasi untuk mengunci catatan rahasia Anda agar hanya bisa dibaca oleh penerima yang dituju.</p>
     </article>

     <article class="seo-feature-card">
       <div class="seo-feature-icon">⏳</div>
       <h3>Kedaluwarsa Otomatis</h3>
       <p>Atur batas waktu aktif catatan dari 1 jam hingga 30 hari. Catatan akan terhapus secara otomatis demi menjaga privasi Anda.</p>
     </article>

     <article class="seo-feature-card">
       <div class="seo-feature-icon">🌍</div>
       <h3>Akses Cepat di Semua Perangkat</h3>
       <p>Ditenagai oleh jaringan edge Cloudflare Workers global. Buka dan bagikan teks dengan lancar melalui laptop, tablet, maupun ponsel.</p>
     </article>
   </div>

   <!-- How It Works -->
   <div style="margin-top: 60px; padding: 40px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 12px 35px rgba(15,23,42,0.04);">
     <h2 style="font-size: 24px; letter-spacing: -0.8px; margin: 0 0 20px; color: var(--ink); text-align: center;">Cara Mudah Menggunakan Etulis</h2>
     <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;">
       <div style="text-align: center;">
         <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: #fff; display: grid; place-items: center; font-weight: 800; margin: 0 auto 12px; font-size: 14px;">1</div>
         <h3 style="font-size: 15px; margin: 0 0 6px; color: var(--ink);">Tulis Catatan</h3>
         <p style="margin: 0; color: var(--muted); font-size: 11px; line-height: 1.6;">Ketik atau tempel teks pada editor notepad online yang tersedia.</p>
       </div>
       <div style="text-align: center;">
         <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: #fff; display: grid; place-items: center; font-weight: 800; margin: 0 auto 12px; font-size: 14px;">2</div>
         <h3 style="font-size: 15px; margin: 0 0 6px; color: var(--ink);">Atur Opsi Keamanan</h3>
         <p style="margin: 0; color: var(--muted); font-size: 11px; line-height: 1.6;">Tambahkan password atau atur masa berlaku catatan jika dibutuhkan.</p>
       </div>
       <div style="text-align: center;">
         <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: #fff; display: grid; place-items: center; font-weight: 800; margin: 0 auto 12px; font-size: 14px;">3</div>
         <h3 style="font-size: 15px; margin: 0 0 6px; color: var(--ink);">Bagikan Tautan</h3>
         <p style="margin: 0; color: var(--muted); font-size: 11px; line-height: 1.6;">Klik Terbitkan dan salin tautan publik untuk dibagikan secara instan.</p>
       </div>
     </div>
   </div>

   <!-- FAQ Section -->
   <div style="margin-top: 60px;">
     <div style="text-align: center; margin-bottom: 30px;">
       <span class="eyebrow">FAQ</span>
       <h2 style="font-size: 26px; letter-spacing: -1px; margin: 6px 0 0; color: var(--ink);">Pertanyaan yang Sering Diajukan</h2>
     </div>
     <div class="seo-faq-container">
       ${faqListHtml}
     </div>
   </div>
 </section>
</section>

<style>
.seo-feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.seo-feature-card{padding:26px 22px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 8px 24px rgba(15,23,42,0.03)}
.seo-feature-icon{width:42px;height:42px;border-radius:11px;background:#eff6ff;display:grid;place-items:center;font-size:20px;margin-bottom:14px}
.seo-feature-card h3{margin:0 0 8px;font-size:15px;color:var(--ink);font-weight:700}
.seo-feature-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.7}
.seo-faq-container{display:flex;flex-direction:column;gap:12px;max-width:820px;margin:0 auto}
.seo-faq-item{border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden;transition:border-color 0.2s}
.seo-faq-item summary{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;cursor:pointer;list-style:none;font-weight:700;color:var(--ink)}
.seo-faq-item summary::-webkit-details-marker{display:none}
.seo-faq-item summary h3{margin:0;font-size:14px;font-weight:700;letter-spacing:-0.3px}
.seo-faq-item summary span{font-size:18px;color:var(--primary);font-weight:700;transition:transform 0.2s}
.seo-faq-item[open] summary span{transform:rotate(45deg)}
.seo-faq-answer{padding:0 22px 18px;color:var(--muted);font-size:12px;line-height:1.75}
.seo-faq-answer p{margin:0}
</style>
`;

  const scripts = `<script>const t=document.querySelector('#content'),w=document.querySelector('#words'),c=document.querySelector('#chars'),s=document.querySelector('#status');function count(){const v=t.value.trim();w.textContent=v?v.split(/\\s+/).length:0;c.textContent=t.value.length;s.textContent=t.value?'Siap dibuat':'Belum disimpan'}t.addEventListener('input',count);count()</script>`;

  return renderLayout(content, {
    title: 'Notepad Online Gratis & Berbagi Catatan Instan',
    description: 'Etulis adalah notepad online gratis terbaik di Indonesia. Tulis catatan, amankan dengan password, atur masa berlaku, dan bagikan tautan teks instan tanpa perlu akun.',
    keywords: 'notepad online, catatan online, catat online gratis, pastebin indonesia, text sharing online, notepad tanpa login, web catatan aman, aplikasi notepad, etulis',
    canonicalUrl: 'https://etulis.com/',
    csrfToken: props.csrfToken,
    showPromotion: true,
    customInlinePromotion: true,
    scripts,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'etulis',
        url: 'https://etulis.com',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All',
        description: 'Notepad online gratis untuk menulis, mengamankan teks dengan password, dan membagikan catatan secara mudah tanpa login.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'IDR',
        },
      },
      faqSchema,
    ],
  });
}
