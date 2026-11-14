-- ============================================================================
-- NUSANTARA WEDDING CLOUD V3.0 - CLOUDFLARE D1 DATABASE SCHEMA
-- Multi-Tenant Digital Wedding Invitation Platform
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Tabel Admin / Users (Multi-Admin & Role Management)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'editor')),
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
);

-- 2. Tabel Koleksi Template Modular (10+ Tema Awal & Custom Template)
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    tier TEXT DEFAULT 'premium' CHECK (tier IN ('free', 'premium')),
    is_featured INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    config_json TEXT NOT NULL, -- Menyimpan palet warna, tipografi, animasi, ornamen SVG, layout
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Tabel Utama Undangan (Multi-Pasangan / Multi-Undangan)
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    custom_domain TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'disabled')),
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    expires_at TEXT,
    language TEXT DEFAULT 'id' CHECK (language IN ('id', 'en')),
    template_id TEXT NOT NULL,
    theme_overrides_json TEXT NOT NULL, -- Kustomisasi warna, font, ukuran, posisi, transparansi, animasi
    couple_json TEXT NOT NULL,          -- Identitas mempelai pria & wanita, orang tua, foto, bio
    events_json TEXT NOT NULL,          -- Array rangkaian acara (Akad, Resepsi, Walimatul 'Ursy, Ngunduh Mantu, dll)
    location_json TEXT NOT NULL,        -- Koordinat, alamat, link Google Maps, konfigurasi warna/ukuran QR Code
    audio_json TEXT NOT NULL,           -- Track musik, URL/MP3, volume, autoplay setelah buka sampul
    gallery_json TEXT NOT NULL,         -- Mode grid/slideshow, daftar foto, caption, video YouTube/prewedding
    love_story_json TEXT NOT NULL,      -- Status aktif/nonaktif & array timeline cerita cinta
    gift_json TEXT NOT NULL,            -- Status aktif/nonaktif, rekening bank, QRIS, alamat kado fisik
    extras_json TEXT NOT NULL,          -- Live streaming, WhatsApp, sosial media, efek bunga/confetti, buku tamu tutup/buka, urutan seksi
    views_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);
CREATE INDEX IF NOT EXISTS idx_invitations_owner ON invitations(owner_id);

-- 4. Tabel Daftar Tamu & Link Personal (Mendukung Ribuan Tamu per Undangan)
CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    invitation_id TEXT NOT NULL,
    unique_token TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    salutation TEXT DEFAULT 'Kepada Yth. Bapak/Ibu/Saudara/i',
    category TEXT DEFAULT 'Reguler',
    quota INTEGER DEFAULT 2,
    phone TEXT,
    opened_count INTEGER DEFAULT 0,
    last_opened_at TEXT,
    rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'hadir', 'tidak_hadir', 'ragu')),
    attending_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guests_invitation ON guests(invitation_id);
CREATE INDEX IF NOT EXISTS idx_guests_token ON guests(unique_token);

-- 5. Tabel RSVP & Buku Tamu Digital (Satu Tamu Satu Respons / Upsert Terkendali)
CREATE TABLE IF NOT EXISTS rsvps (
    id TEXT PRIMARY KEY,
    invitation_id TEXT NOT NULL,
    guest_id TEXT,
    guest_name TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('hadir', 'tidak_hadir', 'ragu')),
    pax INTEGER DEFAULT 1,
    message TEXT NOT NULL,
    ip_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rsvps_invitation ON rsvps(invitation_id);

-- 6. Tabel Rate Limiting & Audit Log Keamanan
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    hits INTEGER DEFAULT 1,
    reset_at INTEGER NOT NULL
);
