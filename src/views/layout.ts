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

  const desktopSidePromotionsHtml = `
<aside class="side-promotion side-promotion-left" aria-label="Promosi">
 <span>Promosi</span>
 <a href="https://akundigital.id" target="_blank" rel="noopener sponsored">
  <img src="/images/ads/ads1.png" alt="Promosi AkunDigital Marketplace" width="758" height="2075" loading="lazy">
 </a>
</aside>
<aside class="side-promotion side-promotion-right" aria-label="Promosi">
 <span>Promosi</span>
 <a href="https://akundigital.id" target="_blank" rel="noopener sponsored">
  <img src="/images/ads/ads2.png" alt="Promosi AkunDigital Marketplace" width="758" height="2075" loading="lazy">
 </a>
</aside>
`;

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
${showPromotion ? desktopSidePromotionsHtml : ''}
${showPromotion && !customInlinePromotion ? getInlinePromotionsHtml() : ''}
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
