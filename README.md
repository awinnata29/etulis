# etulis

etulis adalah aplikasi berbagi catatan berbasis Laravel. User dapat menulis catatan, membuat link acak, menambahkan password, dan menentukan masa berlaku. Admin memiliki dashboard untuk melihat, mencari, menghapus, dan mengelola password catatan.

## Fitur

- Catatan publik atau diproteksi password
- Link acak untuk user dan custom link khusus admin
- Masa berlaku 1 jam, 1 hari, 7 hari, atau 30 hari
- Penghitung kunjungan
- Salin isi dan salin link
- Pengelolaan password catatan melalui token rahasia
- Dashboard admin dengan pencarian dan statistik
- Penggantian password akun admin
- Banner promosi responsif
- Tampilan desktop, laptop, tablet, dan ponsel

## Persyaratan

- PHP 8.2 atau lebih baru
- Composer
- Node.js dan npm
- Ekstensi PHP SQLite

## Instalasi

```bash
git clone https://github.com/awinnata29/etulis.git
cd etulis
composer install
copy .env.example .env
php artisan key:generate
```

Buat file database SQLite:

```bash
type nul > database\database.sqlite
php artisan migrate
```

Pasang dan build aset frontend:

```bash
npm install
npm run build
```

Jalankan aplikasi:

```bash
php artisan serve
```

## Konfigurasi admin

Isi nilai berikut di `.env` sebelum login pertama:

```env
ADMIN_PATH=alamat-admin-rahasia
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password-kuat-dan-unik
```

Halaman login tersedia di `/{ADMIN_PATH}/login`. Setelah login pertama, password admin disimpan sebagai hash di database dan dapat diganti melalui dashboard.

Jangan commit `.env`, database SQLite, atau kredensial produksi.

## Aset promosi

File promosi berada di `public/images/ads`:

- `ads1.png` dan `ads2.png`: banner vertikal desktop/laptop
- `ad1.png` dan `ad2.png`: banner horizontal tablet/ponsel

Seluruh banner saat ini mengarah ke `https://akundigital.id`.

## Keamanan

- Password admin dan catatan disimpan menggunakan hash Laravel
- Token pengelolaan catatan disimpan sebagai hash
- Proteksi CSRF pada seluruh form
- Rate limit pada login, pembukaan catatan, dan perubahan password
- Header `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, dan `Permissions-Policy`
- Output catatan di-escape oleh Blade
- `.env` dan database SQLite dikecualikan dari Git

Untuk produksi, gunakan HTTPS, nonaktifkan `APP_DEBUG`, gunakan password admin unik, dan jalankan aplikasi di balik web server yang dikonfigurasi dengan benar.

## Pengujian

```bash
php artisan test
```

## Lisensi

MIT
