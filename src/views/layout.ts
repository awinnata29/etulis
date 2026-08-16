import { escapeHtml } from '../utils/format';

export interface LayoutOptions {
  title?: string;
  csrfToken?: string;
  showPromotion?: boolean;
  scripts?: string;
}

export function renderLayout(content: string, options: LayoutOptions = {}): string {
  const title = options.title ? `${escapeHtml(options.title)} — etulis` : 'etulis — tulis, bagikan, selesai';
  const showPromotion = options.showPromotion !== false;
  const csrfToken = options.csrfToken || '';
  const currentYear = new Date().getFullYear();

  const promotionHtml = `
<aside class="side-promotion side-promotion-left" aria-label="Promosi">
 <span>Promosi</span>
 <a href="https://akundigital.id" target="_blank" rel="noopener sponsored">
  <img src="/images/ads/ads1.png" alt="Promosi AkunDigital" width="758" height="2075">
 </a>
</aside>
<aside class="side-promotion side-promotion-right" aria-label="Promosi">
 <span>Promosi</span>
 <a href="https://akundigital.id" target="_blank" rel="noopener sponsored">
  <img src="/images/ads/ads2.png" alt="Promosi AkunDigital" width="758" height="2075">
 </a>
</aside>
<aside class="inline-promotions wrap" aria-label="Promosi">
 <div class="inline-promotion-head"><span>Promosi</span><span>Geser untuk melihat lainnya</span></div>
 <div class="inline-promotion-list">
  <a href="https://akundigital.id" target="_blank" rel="noopener sponsored"><img src="/images/ads/ad1.png" alt="Promosi AkunDigital" width="2172" height="724" loading="lazy"></a>
  <a href="https://akundigital.id" target="_blank" rel="noopener sponsored"><img src="/images/ads/ad2.png" alt="Promosi AkunDigital" width="2172" height="724" loading="lazy"></a>
 </div>
</aside>
`;

  return `<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="${escapeHtml(csrfToken)}">
    <title>${title}</title>
    <link rel="icon" type="image/png" href="/images/brand/etulis.png">
    <link rel="stylesheet" href="/dist/assets/style.css">
</head>
<body>
<div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<header class="site-header">
 <div class="nav wrap">
    <a href="/" class="brand brand-image"><img src="/images/brand/etulis.png" alt="etulis" width="1536" height="1024"></a>
    <a class="header-action" href="/">Mulai menulis <i></i></a>
 </div>
</header>
<main>${content}</main>
${showPromotion ? promotionHtml : ''}
<footer class="site-footer">
 <div class="footer-shell wrap">
  <div class="footer-main">
   <div><a class="footer-logo footer-logo-image" href="/"><img src="/images/brand/etulis.png" alt="etulis" width="1536" height="1024"></a><p>Catatan sederhana untuk dibagikan.</p></div>
   <a class="footer-cta" href="/">Buat catatan <i></i></a>
  </div>
  <div class="footer-bottom"><span>© ${currentYear} etulis</span><div><span>Link otomatis</span><span>Password opsional</span><span>Tanpa akun</span></div></div>
 </div>
</footer>
<script type="module" src="/dist/assets/app.js"></script>
${options.scripts || ''}
</body>
</html>`;
}
