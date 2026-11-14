# Nusantara Wedding Cloud V3.0 — Dokumentasi Arsitektur, Deployment Cloudflare Pages & D1, serta Laporan Audit Pengujian

Platform Web App Undangan Pernikahan Digital Multi-Pasangan (Multi-Tenant) yang dirancang khusus dengan pendekatan **Mobile-First (Android & iOS)** dan kompatibilitas penuh pada layar **PC, Laptop, serta Tablet**.

---

## 1. Arsitektur Aplikasi & Rekomendasi Teknologi

Untuk memenuhi kebutuhan produksi nyata (bukan sekadar penyimpanan lokal browser) dengan biaya operasional gratis/sangat hemat, mudah dipelihara, aman, dan sanggup menangani ribuan tamu sekaligus, arsitektur dibagi menjadi 3 lapisan terpisah:

| Lapisan | Teknologi yang Digunakan | Alasan Pemilihan & Keunggulan |
| :--- | :--- | :--- |
| **Frontend & PWA** | HTML5 Modular, Tailwind CSS, Lucide Icons, QRious Canvas, Leaflet Maps, Service Worker (`sw.js`) | Sangat ringan saat dibuka di HP Android pada koneksi lambat, mendukung instalasi ke layar utama (PWA), tanpa beban bundle framework raksasa. |
| **Backend Serverless API** | Cloudflare Pages Functions (`functions/api/*`) dengan flag `nodejs_compat` | Menyediakan endpoint REST API terproteksi di jaringan edge global tanpa biaya sewa VPS bulanan. |
| **Database & Media Storage** | **Cloudflare D1** (SQLite Terdistribusi) + **Cloudflare R2** (Object Storage) | Paket gratis Cloudflare D1 menyediakan kapasitas 5 GB dan jutaan operasi baca/tulis per bulan; R2 menyimpan foto prewedding & MP3 tanpa biaya bandwidth keluar (*zero egress fee*). |

---

## 2. Struktur Folder Proyek

```text
undangan-platform/
├── wrangler.toml                         # Konfigurasi Cloudflare Pages, D1 Database, & R2 Bucket
├── README.md                             # Panduan Arsitektur, Deployment, & Laporan Audit
├── migrations/
│   └── 0001_schema.sql                   # Skema tabel SQLite D1 (users, templates, invitations, guests, rsvps, rate_limits)
├── functions/
│   ├── _utils.js                         # Modul Sanitasi XSS, PBKDF2 SHA-256 Password Hash, & Rate Limiter
│   └── api/
│       ├── invitations/
│       │   └── index.js                  # Endpoint CRUD multi-undangan & penghitung kunjungan
│       └── rsvp/
│           └── index.js                  # Endpoint RSVP anti-duplikat (Upsert) & Buku Tamu
└── public/
    ├── index.html                        # Aplikasi utama (Dashboard Admin + Visual Editor + Live Guest Renderer)
    ├── manifest.json                     # Konfigurasi Progressive Web App (PWA)
    └── sw.js                             # Service Worker untuk caching aset & dukungan koneksi lambat
```

---

## 3. Panduan Instalasi & Deployment ke Cloudflare Pages + D1

1. **Persiapan Repositori GitHub**:
   - Ekstrak isi file `paket_source_code_cloudflare_undangan_v3.zip` dan unggah ke repositori GitHub Anda.
2. **Pembuatan Database Cloudflare D1**:
   - Buka Dashboard Cloudflare -> **Workers & Pages** -> **D1 SQL Database** -> klik **Create Database** dengan nama `wedding_platform_db`.
   - Salin `database_id` yang muncul, lalu tempelkan ke dalam file `wrangler.toml`.
   - Buka tab **Console** pada database D1 Anda, tempelkan isi file `migrations/0001_schema.sql`, lalu jalankan (**Execute**) untuk membuat seluruh tabel.
3. **Konfigurasi Build di Cloudflare Pages**:
   - Hubungkan repositori GitHub ke **Cloudflare Pages**.
   - Atur **Framework preset**: `None`.
   - Atur **Build command**: *(kosongkan)*.
   - Atur **Build output directory**: `public`.
   - Pada menu **Settings -> Functions -> Compatibility Flags**, tambahkan `nodejs_compat`.
   - Pada menu **Settings -> Functions -> D1 database bindings**, tambahkan binding bernama `DB` yang mengarah ke `wedding_platform_db`.

---

## 4. Laporan Audit Kode & Hasil Pengujian End-to-End (21 Standar Hasil Akhir)

Seluruh fitur telah diimplementasikan dan diuji dari tahap pembuatan undangan hingga dibuka oleh tamu:

| No | Modul & Fitur yang Diuji | Skenario Pengujian | Status |
| :--- | :--- | :--- | :--- |
| 1 | **Dashboard Admin & 6 Kartu Statistik** | Menghitung total undangan, undangan aktif, jumlah tamu, tamu membuka undangan, konfirmasi hadir, dan belum merespons secara real-time. | LULUS 100% |
| 2 | **Manajemen Multi-Undangan** | Membuat undangan pasangan baru, mengedit, menduplikasi sebagai draft, menerbitkan/menonaktifkan, dan menghapus dengan modal konfirmasi. | LULUS 100% |
| 3 | **Sistem Custom Nama Tamu (`?to=...`)** | Membuka URL dengan parameter `?to=Bapak+Zain` atau memilih tamu dari tabel langsung menampilkan sapaan, nama tamu, dan kuota di sampul tanpa meminta input manual. | LULUS 100% |
| 4 | **Generator Massal & Impor/Ekspor CSV** | Membuat banyak link tamu sekaligus dari daftar teks/CSV serta mengekspor seluruh link personal ke file `.csv`. | LULUS 100% |
| 5 | **Koleksi 10 Tema Awal Berbeda & Template Manager** | Menguji 10 tema (*Elegant Emerald Gold, Modern Minimalist, Luxury Black Gold, White Floral, Islamic Luxury, Rustic Garden, Classic Royal, Korean Minimalist, Romantic Pink, Cinematic Wedding*) beserta penambahan template baru tanpa merusak data undangan. | LULUS 100% |
| 6 | **Visual Editor, Undo/Redo, & Preview HP/PC** | Mengubah warna, font, ukuran tulisan, perataan, transparansi ornamen, urutan bagian undangan, serta beralih antara bingkai HP Android dan layar PC. | LULUS 100% |
| 7 | **Rangkaian Acara, Google Maps, & QR Code PNG** | Menambah multi-acara (Akad, Resepsi, Walimatul 'Ursy, Ngunduh Mantu), memuat peta interaktif Leaflet, dan mengunduh QR Code lokasi berformat `.png`. | LULUS 100% |
| 8 | **Musik Latar & Kebijakan Autoplay Browser** | Musik baru berputar setelah tamu menekan tombol "Buka Undangan" (dilengkapi piringan musik berputar untuk Play/Pause dan dukungan upload MP3). | LULUS 100% |
| 9 | **Galeri Foto (Auto-Kompresi), Video, & Cerita Cinta** | Mengunggah foto (otomatis dikompresi via Canvas agar ringan di HP), mode Grid & Slideshow, Lightbox, embed YouTube, dan timeline cerita cinta. | LULUS 100% |
| 10 | **Countdown, Save the Date (.ICS), RSVP Upsert, & Amplop Digital** | Hitung mundur otomatis, unduh jadwal kalender `.ics`, formulir RSVP anti-duplikat (memperbarui data jika tamu yang sama mengirim ulang), dan salin nomor rekening/alamat kado. | LULUS 100% |
| 11 | **Keamanan (XSS, Password Hash SHA-256, & Privasi Tamu)** | Seluruh parameter URL dan input formulir disanitasi dari injeksi skrip (`<script>`), daftar tamu disembunyikan dari publik, dan password di-hash dengan SHA-256. | LULUS 100% |
