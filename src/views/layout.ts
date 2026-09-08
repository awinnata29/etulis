import { escapeHtml } from '../utils/format';

export interface LayoutOptions {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  csrfToken?: string;
  showPromotion?: boolean;
  customInlinePromotion?: boolean;
  scripts?: string;
  jsonLd?: object | object[];
}

export function getInlinePromotionsHtml(): string {
  return `
<aside class="inline-promotions wrap" aria-label="Promosi">
 <div class="inline-promotion-head"><span>Promosi</span><span>Geser untuk melihat lainnya</span></div>
 <div class="inline-promotion-list">
  <a href="https://akundigital.id" target="_blank" rel="noopener sponsored"><img src="/images/ads/ad1.png" alt="Promosi AkunDigital" width="2172" height="724" loading="lazy"></a>
  <a href="https://akundigital.id" target="_blank" rel="noopener sponsored"><img src="/images/ads/ad2.png" alt="Promosi AkunDigital" width="2172" height="724" loading="lazy"></a>
 </div>
</aside>
`;
}

export function getPromoPopupHtml(): string {
  return `
<div id="promo-widget-container" class="promo-widget-container">
  <!-- Floating Widget Card -->
  <div id="promo-popup-card" class="promo-widget-card" role="dialog" aria-labelledby="promo-widget-title" aria-hidden="true">
    <div class="promo-widget-header">
      <div class="promo-widget-profile">
        <div class="promo-widget-avatar-wrap">
          <div class="promo-widget-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#0088CC"/>
              <path d="M5.4 11.9c2.7-1.2 6.8-2.9 8.2-3.5 3.9-1.6 4.7-1.9 5.2-1.9.1 0 .4 0 .6.2.2.1.2.3.3.5 0 .2 0 .4-.1.8-1 4.7-1.4 6.7-2 9.5-.2.9-.8 1.2-1.4 1.2-.6 0-1.1-.3-1.6-.7l-3-2.3-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.7-5.1c.2-.2 0-.3-.3-.1l-7 4.4-3-.9c-.7-.2-.7-.7.1-1z" fill="#FFF"/>
            </svg>
          </div>
          <span class="promo-avatar-status-dot"></span>
        </div>
        <div class="promo-widget-info">
          <strong id="promo-widget-title" class="promo-widget-name">Bot Auto Order</strong>
          <span class="promo-widget-status">
            <span class="promo-status-dot"></span>
            Online
          </span>
        </div>
      </div>
      <button type="button" id="promo-close-btn" class="promo-widget-close" aria-label="Tutup Promosi">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <div class="promo-widget-body">
      <p class="promo-widget-msg">
        Butuh ChatGPT, Gemini, Canva, Facebook, atau app premium lainnya? Order instan dan otomatis 24 jam di bot kami!
      </p>

      <div class="promo-widget-channel">
        <span class="promo-channel-label">Telegram Bot:</span>
        <span class="promo-channel-val">@akundigitalidbot</span>
      </div>

      <a href="https://t.me/akundigitalidbot" target="_blank" rel="noopener sponsored" class="promo-widget-cta" id="promo-cta-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#FFF"/>
          <path d="M5.4 11.9c2.7-1.2 6.8-2.9 8.2-3.5 3.9-1.6 4.7-1.9 5.2-1.9.1 0 .4 0 .6.2.2.1.2.3.3.5 0 .2 0 .4-.1.8-1 4.7-1.4 6.7-2 9.5-.2.9-.8 1.2-1.4 1.2-.6 0-1.1-.3-1.6-.7l-3-2.3-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.7-5.1c.2-.2 0-.3-.3-.1l-7 4.4-3-.9c-.7-.2-.7-.7.1-1z" fill="#0088CC"/>
        </svg>
        <span>Chat Telegram Sekarang</span>
      </a>
    </div>
  </div>

  <!-- Floating Launcher Bar -->
  <div class="promo-widget-launcher" id="promo-floating-trigger">
    <div class="promo-launcher-pill">
      <span class="promo-launcher-dot"></span>
      <span>Bot Auto Order</span>
    </div>
    <button type="button" class="promo-launcher-btn" aria-label="Buka Chat AkunDigital">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#0088CC"/>
        <path d="M5.4 11.9c2.7-1.2 6.8-2.9 8.2-3.5 3.9-1.6 4.7-1.9 5.2-1.9.1 0 .4 0 .6.2.2.1.2.3.3.5 0 .2 0 .4-.1.8-1 4.7-1.4 6.7-2 9.5-.2.9-.8 1.2-1.4 1.2-.6 0-1.1-.3-1.6-.7l-3-2.3-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.7-5.1c.2-.2 0-.3-.3-.1l-7 4.4-3-.9c-.7-.2-.7-.7.1-1z" fill="#FFF"/>
      </svg>
      <span class="promo-launcher-badge-dot"></span>
    </button>
  </div>
</div>
`;
}

export function renderLayout(content: string, options: LayoutOptions = {}): string {
  const pageTitle = options.title
    ? `${escapeHtml(options.title)} — etulis`
    : 'etulis — Notepad Online Gratis, Tulis & Bagikan Catatan Tanpa Akun';

  const metaDescription = escapeHtml(
    options.description ||
    'etulis adalah aplikasi notepad online gratis dan cepat. Tulis teks atau catatan, amankan dengan password, atur masa berlaku, dan bagikan tautan instan tanpa registrasi akun.'
  );

  const metaKeywords = escapeHtml(
    options.keywords ||
    'notepad online, catatan online, berbagi catatan, pastebin indonesia, text share online, notepad tanpa login, web catatan gratis, secure notepad online, etulis'
  );

  const canonicalUrl = options.canonicalUrl || 'https://etulis.com/';
  const ogImage = options.ogImage || 'https://etulis.com/images/brand/etulis.png';
  const ogType = options.ogType || 'website';
  const robots = options.noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
  const showPromotion = options.showPromotion !== false;
  const customInlinePromotion = options.customInlinePromotion === true;
  const csrfToken = options.csrfToken || '';
  const currentYear = new Date().getFullYear();

  // Structured Data (JSON-LD)
  const defaultJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'etulis',
      url: 'https://etulis.com',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      description: 'Aplikasi notepad online instan untuk menulis, mengamankan teks dengan password, dan membagikan catatan secara mudah tanpa perlu mendaftar.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'IDR',
      },
      featureList: [
        'Editor teks online instan',
        'Proteksi password WebCrypto PBKDF2',
        'Masa berlaku catatan otomatis',
        'Tautan acak aman tanpa login',
        'Hitung kata & karakter real-time',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'etulis',
      url: 'https://etulis.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://etulis.com/{search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  const jsonLdData = options.jsonLd ? options.jsonLd : defaultJsonLd;
  const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLdData)}</script>`;

  return `<!doctype html>
<html lang="id" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="csrf-token" content="${escapeHtml(csrfToken)}">

    <!-- Primary Meta Tags -->
    <title>${pageTitle}</title>
    <meta name="title" content="${pageTitle}">
    <meta name="description" content="${metaDescription}">
    <meta name="keywords" content="${metaKeywords}">
    <meta name="robots" content="${robots}">
    <meta name="language" content="Indonesian">
    <meta name="author" content="etulis">
    <meta name="theme-color" content="#2563eb">
    <meta name="apple-mobile-web-app-title" content="etulis">
    <meta name="application-name" content="etulis">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:image:alt" content="etulis logo">
    <meta property="og:site_name" content="etulis">
    <meta property="og:locale" content="id_ID">

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/images/brand/etulis.png">
    <link rel="apple-touch-icon" href="/images/brand/etulis.png">

    <!-- Preconnect Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/dist/assets/style.css">

    <!-- Structured Data -->
    ${jsonLdScript}
</head>
<body>
<div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<header class="site-header">
 <div class="nav wrap">
    <a href="/" class="brand brand-image" aria-label="etulis Beranda"><img src="/images/brand/etulis.png" alt="etulis" width="1536" height="1024"></a>
    <a class="header-action" href="/">Mulai menulis <i></i></a>
 </div>
</header>
<main>${content}</main>
${showPromotion && !customInlinePromotion ? getInlinePromotionsHtml() : ''}
${showPromotion ? getPromoPopupHtml() : ''}
<footer class="site-footer">
 <div class="footer-shell wrap">
  <div class="footer-main">
   <div><a class="footer-logo footer-logo-image" href="/" aria-label="etulis Beranda"><img src="/images/brand/etulis.png" alt="etulis" width="1536" height="1024"></a><p>Catatan sederhana untuk dibagikan tanpa akun.</p></div>
   <a class="footer-cta" href="/">Buat catatan baru <i></i></a>
  </div>
  <div class="footer-bottom"><span>© ${currentYear} etulis — Notepad Online Terpercaya</span><div><span>Link otomatis</span><span>Password opsional</span><span>Tanpa akun</span></div></div>
 </div>
</footer>
<script type="module" src="/dist/assets/app.js"></script>
${options.scripts || ''}
</body>
</html>`;
}
