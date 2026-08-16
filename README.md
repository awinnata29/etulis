# 📝 etulis

**etulis** adalah aplikasi notepad dan berbagi catatan modern yang berjalan **100% di Cloudflare Workers**, ditenagai oleh **Hono**, **Cloudflare D1 (Serverless Edge Database)**, dan **Tailwind CSS**.

Aplikasi ini tidak memerlukan server PHP, VPS, Railway, atau web hosting konvensional. Seluruh backend dieksekusi secara instan di jaringan edge global Cloudflare dengan keamanan tinggi dan latensi rendah.

---

## ✨ Fitur Utama

- **Pembuatan Catatan Cepat**: Antarmuka editor bersih dengan penghitung kata dan karakter *real-time*.
- **Tautan Publik Acak & Aman**: Menggunakan slug berbasis cryptographic entropy tinggi agar sulit ditebak.
- **Proteksi Password Kuat**: Enkripsi password menggunakan **WebCrypto PBKDF2** (100.000 iterasi dengan salt acak 16-byte).
- **Masa Berlaku Fleksibel**: Pilihan kedaluwarsa otomatis (1 jam, 1 hari, 7 hari, 30 hari, atau selamanya).
- **Tautan Pengelolaan Rahasia**: Pemilik catatan mendapatkan *manage token* rahasia untuk mengubah atau menghapus password tanpa perlu membuat akun.
- **Admin Panel Terpadu**:
  - Statistik catatan (*total catatan, total dilihat, diproteksi, kedaluwarsa*).
  - Fitur pencarian catatan berdasarkan judul atau tautan slug.
  - Ubah password catatan langsung dari dashboard admin.
  - Hapus catatan.
  - Ubah password akun administrator.
  - Dukungan pembuatan *custom slug* khusus administrator.
- **Banner Promosi Responsif**: Banner promosi vertikal untuk desktop dan geser (*inline carousel*) untuk ponsel.
- **Keamanan Berlapis**:
  - Output di-escape penuh untuk mencegah stored XSS.
  - *Signed HttpOnly Cookies* untuk proteksi sesi.
  - Perlindungan CSRF pada seluruh *state-changing requests* (POST, PUT, DELETE).
  - *Rate limiting* aktif pada endpoint sensitif (login, unlock, ubah password, buat catatan).
  - Seluruh query database D1 menggunakan *prepared statements* terparameter (`.prepare().bind()`).

---

## 🛠️ Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) (V8 Edge Isolates)
- **Backend Framework**: [Hono](https://hono.dev/) (TypeScript)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless Edge SQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + CSS kustom Manrope Typography
- **Bundler & Build Tool**: [Vite](https://vite.dev/)
- **Deployment**: [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

## 🚀 Panduan Menjalankan di Lokal (Development)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- npm

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/awinnata29/etulis.git
cd etulis
npm install
```

### 3. Build Aset Frontend
```bash
npm run build
```

### 4. Terapkan Migrasi Database D1 Lokal
```bash
npm run d1:local
```

### 5. Jalankan Local Development Server
```bash
npm run dev
```
Aplikasi akan aktif di `http://127.0.0.1:8787`.

### 6. Jalankan Test Suite Otomatis
```bash
node scripts/test-e2e.mjs
```

---

## 🔐 Kredensial Administrator Awal

Secara default di lokal, kredensial admin awal:
- **Alamat Login**: `http://127.0.0.1:8787/backend/login`
- **Username**: `admin`
- **Password**: `Manusiabaik1`

*Setelah login pertama kali, password akun admin tersimpan secara aman sebagai PBKDF2 hash di tabel `admin_accounts` pada D1 dan dapat diubah melalui menu dashboard.*

---

## ☁️ Deployment ke Cloudflare Production

### 1. Buat Database D1 di Cloudflare
```bash
npx wrangler d1 create etulis-db
```
Salin nilai `database_id` yang dihasilkan ke dalam berkas `wrangler.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "etulis-db",
    "database_id": "YOUR_DATABASE_ID_HERE",
    "migrations_dir": "migrations"
  }
]
```

### 2. Atur Secret Enkripsi Sesi di Cloudflare
```bash
npx wrangler secret put SESSION_SECRET
```
*(Ketikkan string rahasia acak minimal 32 karakter)*

### 3. Terapkan Migrasi Database ke Cloudflare D1 Remote
```bash
npm run d1:remote
```

### 4. Build & Deploy Worker ke Production
```bash
npm run deploy
```

---

## 🌐 Menghubungkan Domain Kustom (etulis.com)

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) dan pilih akun Anda.
2. Buka menu **Workers & Pages** $\rightarrow$ Pilih Worker **etulis**.
3. Buka tab **Settings** $\rightarrow$ **Domains & Routes** $\rightarrow$ Klik **Add Custom Domain**.
4. Masukkan `etulis.com` (dan `www.etulis.com`).
5. Cloudflare akan mengonfigurasi DNS dan mengaktifkan sertifikat SSL secara otomatis.

---

## 📁 Struktur Berkas

```
etulis/
├── _legacy_laravel/             # Backup file source Laravel lama
├── migrations/
│   └── 0001_initial.sql         # Skema D1 Database
├── public/
│   ├── dist/assets/             # Aset hasil compile Vite (CSS & JS)
│   ├── images/                  # Aset logo & banner promosi
│   └── favicon.ico
├── resources/                   # Source CSS & client JS
├── src/
│   ├── services/db.ts           # D1 Database queries (prepared statements)
│   ├── utils/                   # Crypto (PBKDF2), Session, Anti-XSS, Rate Limiter
│   ├── views/                   # Server-Side Rendered (SSR) HTML views
│   ├── types.ts                 # TypeScript type definitions
│   └── index.ts                 # Main Hono Router & Controller handlers
├── scripts/
│   └── test-e2e.mjs             # End-to-end integration test suite
├── package.json
├── tsconfig.json
├── vite.config.js
└── wrangler.jsonc
```

---

## 📄 Lisensi

[MIT License](LICENSE)
