-- ============================================================================
-- SeleEvent — Seed Data for GCP Cloud SQL (PostgreSQL)
-- Sheila On 7 'Melompat Lebih Tinggi' Tour 2025
-- 5 Cities × 12,000 tickets = 60,000 total, 5% platform fee
-- ============================================================================

-- ─── Add platform_fee column to ticket_types ────────────────────────────
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ─── Clean existing data ────────────────────────────────────────────────
-- Using DO blocks with IF EXISTS checks to avoid errors if tables don't exist
DO $$
BEGIN
  DELETE FROM gate_logs_default; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gate_logs_default not found, skipping';
END$$;
DO $$ BEGIN DELETE FROM gate_logs_2026_04; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gate_logs_2026_04 not found, skipping'; END$$;
DO $$ BEGIN DELETE FROM redemptions; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM gate_staff; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM counter_staff; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM notifications; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM audit_logs; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM tickets; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM order_items; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM orders; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM seats; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM ticket_types; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM wristband_inventories; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM counters; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM gates; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM subscriptions; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM tenant_users; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM invoices; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM events; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM users; EXCEPTION WHEN undefined_table THEN NULL; END$$;
DO $$ BEGIN DELETE FROM tenants; EXCEPTION WHEN undefined_table THEN NULL; END$$;

-- ─── TENANT ────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, primary_color, secondary_color, plan, is_active, max_events, max_tickets, created_at, updated_at)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'SeleEvent',
    'seleevent',
    '#00A39D',
    '#F8AD3C',
    'enterprise',
    true,
    10,
    100000,
    '2025-03-01 12:00:00+00',
    '2025-03-01 12:00:00+00'
);

-- ─── USERS ─────────────────────────────────────────────────────────────
INSERT INTO users (id, google_id, email, name, role, status, created_at, updated_at) VALUES
    ('40000000-0000-0000-0000-000000000001', 'google-superadmin', 'bukdan101@gmail.com', 'Bukdan Admin', 'SUPER_ADMIN', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('40000000-0000-0000-0000-000000000002', 'google-admin', 'rizky@seleevent.id', 'Rizky Pratama', 'ADMIN', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('40000000-0000-0000-0000-000000000003', 'google-organizer', 'andi.wijaya@gmail.com', 'Andi Wijaya', 'ORGANIZER', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('40000000-0000-0000-0000-000000000004', 'google-counter', 'rina.w@gmail.com', 'Rina Wulandari', 'COUNTER_STAFF', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('40000000-0000-0000-0000-000000000005', 'google-gate', 'bayu.a@gmail.com', 'Bayu Aditya', 'GATE_STAFF', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('40000000-0000-0000-0000-000000000006', 'google-participant', 'budi.santoso@gmail.com', 'Budi Santoso', 'PARTICIPANT', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── TENANT_USERS ──────────────────────────────────────────────────────
INSERT INTO tenant_users (id, user_id, tenant_id, role, is_active, joined_at, created_at, updated_at) VALUES
    ('a4c49390-bf42-52f8-b069-7f4e0290719e', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', true, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2665b8a7-b544-5e76-bdec-c4b5c61dff19', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'ADMIN', true, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('428bbc4b-1e39-5740-8fa7-dfd7aaad0663', '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'ORGANIZER', true, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('89d4d466-33dc-5373-bfba-ecd449e77d08', '40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'COUNTER_STAFF', true, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('7bebfa08-5cee-54b0-802a-2e2595823109', '40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'GATE_STAFF', true, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('438aa80e-b1dd-56a1-a11e-9dfe7cff24a4', '40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'PARTICIPANT', true, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── SUBSCRIPTION ──────────────────────────────────────────────────────
INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
VALUES (
    'b1994801-3086-5f06-85ed-c17480229bbe',
    '10000000-0000-0000-0000-000000000001',
    'enterprise',
    'active',
    '2025-03-01 12:00:00+00',
    '2026-03-01 12:00:00+00',
    '2025-03-01 12:00:00+00',
    '2025-03-01 12:00:00+00'
);

-- ─── EVENTS ───────────────────────────────────────────────────────────
INSERT INTO events (id, tenant_id, slug, title, subtitle, date, doors_open, venue, city, address, capacity, status, created_at, updated_at) VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'sheila-on7-bandung', 'Sheila On 7 — BANDUNG', 'Melompat Lebih Tinggi Tour 2025', '2025-06-01 12:00:00+00', '2025-06-01 09:00:00+00', 'Baros Field', 'Bandung', 'Jl. Baros No.1, Cimahi, Jawa Barat 40511', 12000, 'published', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'sheila-on7-makassar', 'Sheila On 7 — MAKASSAR', 'Melompat Lebih Tinggi Tour 2025', '2025-06-08 12:00:00+00', '2025-06-08 09:00:00+00', 'Pantai Losari Arena', 'Makassar', 'Jl. Penghibur, Pantai Losari, Makassar, Sulawesi Selatan 90173', 12000, 'published', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'sheila-on7-medan', 'Sheila On 7 — MEDAN', 'Melompat Lebih Tinggi Tour 2025', '2025-06-15 12:00:00+00', '2025-06-15 09:00:00+00', 'Lapangan Merdeka Medan', 'Medan', 'Jl. Balai Kota, Medan Bar., Kota Medan, Sumatera Utara 20112', 12000, 'published', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'sheila-on7-jakarta', 'Sheila On 7 — JAKARTA', 'Melompat Lebih Tinggi Tour 2025', '2025-06-22 12:00:00+00', '2025-06-22 09:00:00+00', 'GBK Madya Stadium', 'Jakarta', 'Jl. Gatot Subroto, Senayan, Kebayoran Baru, Jakarta Pusat 10270', 12000, 'published', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'sheila-on7-balikpapan', 'Sheila On 7 — BALIKPAPAN', 'Melompat Lebih Tinggi Tour 2025', '2025-06-29 12:00:00+00', '2025-06-29 09:00:00+00', 'Lapangan Merdeka BPN', 'Balikpapan', 'Jl. Jend. Sudirman, Balikpapan Kota, Kalimantan Timur 76113', 12000, 'published', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── TICKET_TYPES ──────────────────────────────────────────────────────
INSERT INTO ticket_types (id, tenant_id, event_id, name, description, price, quota, sold, tier, zone, emoji, benefits, platform_fee, created_at, updated_at) VALUES
    ('43df68c6-5546-5143-9fa8-0be31de7c061', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'VVIP PIT', 'Standing paling depan — barisan depan panggung', 3250000, 170, 116, 'floor', 'PIT', '👑', '["Standing paling depan (barrier VVIP)", "Welcome drink + F&B gratis sepuasnya", "Exclusive merchandise pack (T-shirt + Poster)", "Early entry 30 menit sebelum gate buka", "Wristband premium (gold embossed)", "Meet & Greet session sebelum konser", "Photobooth area eksklusif", "Lounge area dengan sofa dan AC"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('5df4fc9f-cf56-5d23-93f1-1ccfb1b37dc8', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'VIP ZONE', 'Standing VIP — di belakang VVIP Pit', 2600000, 280, 115, 'floor', 'VIP', '⭐', '["Standing zone VIP (di belakang VVIP)", "Dedicated bar & food stall", "Merchandise discount 20%", "Early entry 15 menit", "Wristband VIP (teal embossed)"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('cd1c2cc4-d8c8-5cd4-8528-c5334d44be07', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FESTIVAL', 'General admission standing — bebas pilih posisi', 2000000, 1700, 890, 'floor', 'Festival', '🎵', '["General admission standing area", "Bebas pilih posisi dalam area festival", "Akses food court & merchandise area"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('09a241e2-b3c3-50d0-8719-269a21ebf7de', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CAT 1', 'Tribun Bawah Kiri — kursi bernomor', 1600000, 1100, 550, 'tribun', 'West', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun bawah kiri — view premium", "Pemandangan stage jelas", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('83c44352-6c37-5191-a6f9-c04f202df8f4', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CAT 2', 'Tribun Tengah Kiri — kursi bernomor', 1300000, 1700, 1243, 'tribun', 'East', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kiri — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('d638ca4f-dd19-5e5e-97a9-e66e6ac7316f', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CAT 3', 'Tribun Tengah Kanan — kursi bernomor', 1000000, 1700, 1197, 'tribun', 'North', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kanan — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('897e1f4f-0cfe-5900-83b6-4c9f7bd5660d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CAT 4', 'Tribun Atas Kanan — kursi bernomor', 750000, 2200, 1763, 'tribun', 'South', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun atas kanan", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6cb31cd9-a9d7-5b2c-b9c8-bb77939b4498', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CAT 5', 'Tribun Ujung Belakang — kursi bernomor', 500000, 1700, 746, 'tribun', 'Corner-NW', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun ujung belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('ec90c1f9-0ba8-5804-bf54-c3bba6f92b8a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CAT 6', 'Tribun Belakang — kursi bernomor', 300000, 1450, 855, 'tribun', 'Corner-SE', '🎫', '["Kursi bernomor (assigned seating)", "Tribun belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('5956b4fb-4767-5f1c-8cbd-6ea340fcf3df', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'VVIP PIT', 'Standing paling depan — barisan depan panggung', 3000000, 170, 70, 'floor', 'PIT', '👑', '["Standing paling depan (barrier VVIP)", "Welcome drink + F&B gratis sepuasnya", "Exclusive merchandise pack (T-shirt + Poster)", "Early entry 30 menit sebelum gate buka", "Wristband premium (gold embossed)", "Meet & Greet session sebelum konser", "Photobooth area eksklusif", "Lounge area dengan sofa dan AC"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a3078dc5-15e8-5895-9dd2-6e8a3b2b3d51', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'VIP ZONE', 'Standing VIP — di belakang VVIP Pit', 2400000, 280, 139, 'floor', 'VIP', '⭐', '["Standing zone VIP (di belakang VVIP)", "Dedicated bar & food stall", "Merchandise discount 20%", "Early entry 15 menit", "Wristband VIP (teal embossed)"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a9b6e44a-d92f-5fcd-b8b8-abbd2a48642c', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'FESTIVAL', 'General admission standing — bebas pilih posisi', 1850000, 1700, 1066, 'floor', 'Festival', '🎵', '["General admission standing area", "Bebas pilih posisi dalam area festival", "Akses food court & merchandise area"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('7e5b9ec0-f6e1-5bed-a304-b855686e6c81', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'CAT 1', 'Tribun Bawah Kiri — kursi bernomor', 1450000, 1100, 453, 'tribun', 'West', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun bawah kiri — view premium", "Pemandangan stage jelas", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('f95d6791-65de-5e93-bf66-530f5cace9f1', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'CAT 2', 'Tribun Tengah Kiri — kursi bernomor', 1150000, 1700, 832, 'tribun', 'East', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kiri — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a997614a-061c-5d3e-ad87-afeee185a0f3', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'CAT 3', 'Tribun Tengah Kanan — kursi bernomor', 900000, 1700, 1177, 'tribun', 'North', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kanan — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('68a3570d-398f-58cc-acb3-7193cc478516', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'CAT 4', 'Tribun Atas Kanan — kursi bernomor', 700000, 2200, 1419, 'tribun', 'South', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun atas kanan", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('15a68504-f399-5017-a655-b1a56f83c9b1', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'CAT 5', 'Tribun Ujung Belakang — kursi bernomor', 450000, 1700, 848, 'tribun', 'Corner-NW', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun ujung belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6aa8abd9-1158-5065-925f-4d0928db5816', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'CAT 6', 'Tribun Belakang — kursi bernomor', 275000, 1450, 964, 'tribun', 'Corner-SE', '🎫', '["Kursi bernomor (assigned seating)", "Tribun belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('ac02d737-9736-5e9e-bf9b-853984ffbc6f', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'VVIP PIT', 'Standing paling depan — barisan depan panggung', 3000000, 170, 129, 'floor', 'PIT', '👑', '["Standing paling depan (barrier VVIP)", "Welcome drink + F&B gratis sepuasnya", "Exclusive merchandise pack (T-shirt + Poster)", "Early entry 30 menit sebelum gate buka", "Wristband premium (gold embossed)", "Meet & Greet session sebelum konser", "Photobooth area eksklusif", "Lounge area dengan sofa dan AC"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('54212abd-de5d-5017-adca-026f1382fb53', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'VIP ZONE', 'Standing VIP — di belakang VVIP Pit', 2400000, 280, 112, 'floor', 'VIP', '⭐', '["Standing zone VIP (di belakang VVIP)", "Dedicated bar & food stall", "Merchandise discount 20%", "Early entry 15 menit", "Wristband VIP (teal embossed)"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('7b985d05-e85a-5797-a320-e17d2750f345', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'FESTIVAL', 'General admission standing — bebas pilih posisi', 1850000, 1700, 1296, 'floor', 'Festival', '🎵', '["General admission standing area", "Bebas pilih posisi dalam area festival", "Akses food court & merchandise area"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('9a5ff4d0-e2eb-5f1c-a804-baf167dfcf88', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CAT 1', 'Tribun Bawah Kiri — kursi bernomor', 1450000, 1100, 785, 'tribun', 'West', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun bawah kiri — view premium", "Pemandangan stage jelas", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('926a6ed0-4b8a-52ac-a49a-6f5ce26b3577', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CAT 2', 'Tribun Tengah Kiri — kursi bernomor', 1150000, 1700, 940, 'tribun', 'East', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kiri — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('ee31aceb-7abe-59e5-9278-0e041bc0130d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CAT 3', 'Tribun Tengah Kanan — kursi bernomor', 900000, 1700, 798, 'tribun', 'North', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kanan — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('d95d7cb2-c367-567d-99ed-f6bfdef6dfe8', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CAT 4', 'Tribun Atas Kanan — kursi bernomor', 700000, 2200, 1827, 'tribun', 'South', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun atas kanan", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('c65ec9b0-8f53-5f05-b88d-7d95865bcc21', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CAT 5', 'Tribun Ujung Belakang — kursi bernomor', 450000, 1700, 937, 'tribun', 'Corner-NW', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun ujung belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('94568f49-01af-5eba-8808-8dd84592d803', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CAT 6', 'Tribun Belakang — kursi bernomor', 275000, 1450, 640, 'tribun', 'Corner-SE', '🎫', '["Kursi bernomor (assigned seating)", "Tribun belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('8abd7339-645e-570f-8e2f-c676ab173165', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'VVIP PIT', 'Standing paling depan — barisan depan panggung', 3500000, 170, 75, 'floor', 'PIT', '👑', '["Standing paling depan (barrier VVIP)", "Welcome drink + F&B gratis sepuasnya", "Exclusive merchandise pack (T-shirt + Poster)", "Early entry 30 menit sebelum gate buka", "Wristband premium (gold embossed)", "Meet & Greet session sebelum konser", "Photobooth area eksklusif", "Lounge area dengan sofa dan AC"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2d0d82be-fb76-54ca-a0ac-ef3e98097d85', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'VIP ZONE', 'Standing VIP — di belakang VVIP Pit', 2800000, 280, 218, 'floor', 'VIP', '⭐', '["Standing zone VIP (di belakang VVIP)", "Dedicated bar & food stall", "Merchandise discount 20%", "Early entry 15 menit", "Wristband VIP (teal embossed)"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('d98fe9d7-2fcf-567b-8dff-cef3bb85d620', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'FESTIVAL', 'General admission standing — bebas pilih posisi', 2200000, 1700, 1141, 'floor', 'Festival', '🎵', '["General admission standing area", "Bebas pilih posisi dalam area festival", "Akses food court & merchandise area"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2c0e3b60-47f9-5557-a94e-3616dd5e8c72', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'CAT 1', 'Tribun Bawah Kiri — kursi bernomor', 1750000, 1100, 839, 'tribun', 'West', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun bawah kiri — view premium", "Pemandangan stage jelas", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('081c4b27-4a9f-5e9f-bebc-fa2e0d6a64d6', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'CAT 2', 'Tribun Tengah Kiri — kursi bernomor', 1400000, 1700, 1238, 'tribun', 'East', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kiri — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('edd3cc85-4c7f-5d20-86b0-6a3f9d7be5cf', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'CAT 3', 'Tribun Tengah Kanan — kursi bernomor', 1100000, 1700, 1090, 'tribun', 'North', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kanan — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('1a581d79-2b39-5a04-90ec-da1c05b03f99', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'CAT 4', 'Tribun Atas Kanan — kursi bernomor', 850000, 2200, 1843, 'tribun', 'South', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun atas kanan", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('5292f013-b07a-568c-846e-119d50476d36', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'CAT 5', 'Tribun Ujung Belakang — kursi bernomor', 550000, 1700, 969, 'tribun', 'Corner-NW', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun ujung belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a60b823d-e263-5211-84de-af8516aad02a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'CAT 6', 'Tribun Belakang — kursi bernomor', 350000, 1450, 940, 'tribun', 'Corner-SE', '🎫', '["Kursi bernomor (assigned seating)", "Tribun belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('17a0b8e0-3eae-5612-ae61-1dfe68dc071a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'VVIP PIT', 'Standing paling depan — barisan depan panggung', 2750000, 170, 131, 'floor', 'PIT', '👑', '["Standing paling depan (barrier VVIP)", "Welcome drink + F&B gratis sepuasnya", "Exclusive merchandise pack (T-shirt + Poster)", "Early entry 30 menit sebelum gate buka", "Wristband premium (gold embossed)", "Meet & Greet session sebelum konser", "Photobooth area eksklusif", "Lounge area dengan sofa dan AC"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('eee74b2b-b83d-55fc-bfa4-c454a3034e8d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'VIP ZONE', 'Standing VIP — di belakang VVIP Pit', 2200000, 280, 189, 'floor', 'VIP', '⭐', '["Standing zone VIP (di belakang VVIP)", "Dedicated bar & food stall", "Merchandise discount 20%", "Early entry 15 menit", "Wristband VIP (teal embossed)"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('81f706ab-14f1-58d7-bac5-765b16a998a0', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'FESTIVAL', 'General admission standing — bebas pilih posisi', 1700000, 1700, 1339, 'floor', 'Festival', '🎵', '["General admission standing area", "Bebas pilih posisi dalam area festival", "Akses food court & merchandise area"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('0c09ccdd-fb44-5851-9856-6e78bfc5e8cf', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CAT 1', 'Tribun Bawah Kiri — kursi bernomor', 1350000, 1100, 725, 'tribun', 'West', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun bawah kiri — view premium", "Pemandangan stage jelas", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('e8566e37-77ba-5f59-baf1-e09cacf74771', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CAT 2', 'Tribun Tengah Kiri — kursi bernomor', 1050000, 1700, 1218, 'tribun', 'East', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kiri — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('c4c8a0d5-30e0-5214-9eba-e5f3c4873f11', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CAT 3', 'Tribun Tengah Kanan — kursi bernomor', 850000, 1700, 715, 'tribun', 'North', '🎫', '["Kursi bernomor (assigned seating)", "Tribun tengah kanan — view baik", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('3d28c426-33a3-50a0-a6a0-a959e43873e6', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CAT 4', 'Tribun Atas Kanan — kursi bernomor', 650000, 2200, 1105, 'tribun', 'South', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun atas kanan", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('56cf71ac-4555-526f-b571-f91f572a33fe', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CAT 5', 'Tribun Ujung Belakang — kursi bernomor', 400000, 1700, 901, 'tribun', 'Corner-NW', '🎟️', '["Kursi bernomor (assigned seating)", "Tribun ujung belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('19a67156-09e3-5ec6-ad72-962db12fd41f', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CAT 6', 'Tribun Belakang — kursi bernomor', 250000, 1450, 632, 'tribun', 'Corner-SE', '🎫', '["Kursi bernomor (assigned seating)", "Tribun belakang", "Akses food court & merchandise"]', 5, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── COUNTERS ──────────────────────────────────────────────────────────
INSERT INTO counters (id, tenant_id, event_id, name, location, capacity, status, created_at, updated_at) VALUES
    ('e70ca7a8-65e9-5529-8c0b-483595b0c405', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Counter A', 'Gate 1', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('3c5ba1a7-1c76-5a2d-ad15-d51b537ca7ad', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Counter B', 'Gate 3', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('0419510d-8142-5893-a7c8-1cd431442df6', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Counter C', 'Gate 5', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('14bfcbd4-2b8b-5861-9cb1-417d9e348e68', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Counter A', 'Gate 1', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('c15825c4-10c8-59e0-827d-4500f27abdfa', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Counter B', 'Gate 3', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('8a0fc381-8ad0-5409-8b0f-ac6f4790b100', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Counter C', 'Gate 5', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('803e8694-7c90-5057-92c3-5208e95b55b5', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Counter A', 'Gate 1', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('b5fd2e50-54d2-5fbf-9f9a-51b04efd3937', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Counter B', 'Gate 3', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('965afa09-c9ae-593d-98b3-c19f388bc44b', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Counter C', 'Gate 5', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('09604a5d-02a0-5157-a259-4889af5696cc', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Counter A', 'Gate 1', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('880935f0-97be-5fd0-8644-e7504835d7d0', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Counter B', 'Gate 3', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2e637d64-4b5f-5e80-b64b-4d67d93cb477', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Counter C', 'Gate 5', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('ac0b555e-6138-5bb0-a5c9-7beff8846134', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Counter A', 'Gate 1', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('4b95a6a4-d19f-5dd2-b4e7-6583a6c10867', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Counter B', 'Gate 3', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('9e710b6d-1dab-52aa-90f9-b7570c7a87fb', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Counter C', 'Gate 5', 500, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── GATES ─────────────────────────────────────────────────────────────
INSERT INTO gates (id, tenant_id, event_id, name, type, location, capacity_per_min, status, created_at, updated_at) VALUES
    ('d1a19792-59f3-56a3-bf56-6ea269fe6ab2', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Gate 1', 'entry', 'North Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a1231639-9b71-59eb-a46d-ca463402cc61', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Gate 2', 'entry', 'South Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('e0376350-3e37-5cda-b2b9-5c4893979bef', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Gate 3', 'exit', 'North Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('08501fa4-060e-50ea-8bb5-e1454ae1dbf7', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Gate 4', 'both', 'VIP Entrance/Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('0eb26f24-9709-54db-8d06-6a167914b18a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Gate 1', 'entry', 'North Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('e75dd95f-7b8a-541c-93fa-996ac9e7c318', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Gate 2', 'entry', 'South Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('b6d726c1-1ddf-5961-92d6-9933fc20620a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Gate 3', 'exit', 'North Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('3f19373e-57c5-594c-b9df-017573b7a078', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Gate 4', 'both', 'VIP Entrance/Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('e3b1827d-4a69-5a53-9f8c-472addb5cf65', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Gate 1', 'entry', 'North Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('b960ba28-72ef-59a0-b82c-4178833ff50d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Gate 2', 'entry', 'South Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('012a0d44-28f5-5920-beed-81978683830a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Gate 3', 'exit', 'North Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('7ab63843-864f-55f5-a954-aeb4b83d1303', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Gate 4', 'both', 'VIP Entrance/Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('f59b0ef6-7dff-50c8-bc39-71c064557337', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Gate 1', 'entry', 'North Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('d4439420-165d-54c1-b773-cfeb88b45f82', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Gate 2', 'entry', 'South Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('3f97291e-9e7f-5c3b-be41-ae0c7c20016d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Gate 3', 'exit', 'North Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('21fe3c56-e330-51a9-a542-22a20103a922', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Gate 4', 'both', 'VIP Entrance/Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6df8e687-b871-5d3f-9de3-77a633dbc316', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Gate 1', 'entry', 'North Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('4d4da71e-a21d-5bed-a60f-2a0087d04436', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Gate 2', 'entry', 'South Entrance', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2c345a62-0f51-5112-95d2-4c6c07616cd2', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Gate 3', 'exit', 'North Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('3febe4bb-bc6a-5fc4-8257-2d544e135170', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Gate 4', 'both', 'VIP Entrance/Exit', 30, 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── COUNTER_STAFF ─────────────────────────────────────────────────────
INSERT INTO counter_staff (id, tenant_id, user_id, counter_id, status, assigned_at, created_at, updated_at) VALUES
    ('6fc06bc2-15d6-5f51-b0cf-15d98a2aad90', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'e70ca7a8-65e9-5529-8c0b-483595b0c405', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('fab2b396-3b10-5c59-ba7c-dba2a3010e0b', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', '14bfcbd4-2b8b-5861-9cb1-417d9e348e68', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('f342d0c6-4dee-5beb-9ed4-6c386b418333', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', '803e8694-7c90-5057-92c3-5208e95b55b5', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6fe9455f-4cc1-51cc-ac5c-3a60242b26ed', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', '09604a5d-02a0-5157-a259-4889af5696cc', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('31bc5c25-274c-56bb-b71c-e0171954aa30', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'ac0b555e-6138-5bb0-a5c9-7beff8846134', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── GATE_STAFF ────────────────────────────────────────────────────────
INSERT INTO gate_staff (id, tenant_id, user_id, gate_id, status, assigned_at, created_at, updated_at) VALUES
    ('687ef2c1-7b93-5545-bdf1-1a1a95ae9479', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'd1a19792-59f3-56a3-bf56-6ea269fe6ab2', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('663a3b73-ea65-50fa-938d-196c844637d9', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', '0eb26f24-9709-54db-8d06-6a167914b18a', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('d5fb033f-08b6-5251-bc82-9f8c9509a04f', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'e3b1827d-4a69-5a53-9f8c-472addb5cf65', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a2c359d9-48dd-5c68-bcc7-a86d6bdfaa24', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'f59b0ef6-7dff-50c8-bc39-71c064557337', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('bfc249fe-800d-5f6b-bf60-8460c7dfa83c', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', '6df8e687-b871-5d3f-9de3-77a633dbc316', 'active', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── WRISTBAND_INVENTORIES ─────────────────────────────────────────────
INSERT INTO wristband_inventories (id, tenant_id, event_id, color, color_hex, type, total_stock, used_stock, remaining_stock, created_at, updated_at) VALUES
    ('ac56cd2a-0090-56d5-9b62-3886aa8f9a8c', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Gold', '#FFD700', 'VVIP PIT', 170, 116, 54, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('b7a6df2d-ae3e-5be3-bed7-b891102e31a9', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Teal', '#00A39D', 'VIP ZONE', 280, 115, 165, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('da4971bb-5c52-5f1d-8f21-95ca6ac34a47', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Orange', '#F8AD3C', 'FESTIVAL', 1700, 890, 810, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('81836b14-3911-5dc6-94a0-5e9ac78562dd', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Merah', '#EF4444', 'CAT 1', 1100, 550, 550, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('9601dee9-fae3-54fa-b44a-9f64c5886ed7', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Biru', '#3B82F6', 'CAT 2', 1700, 1243, 457, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('f2332d84-5d20-5d93-b77c-fdc19308bed1', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Hijau', '#22C55E', 'CAT 3', 1700, 1197, 503, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('58ad55fe-bcb2-5c84-bdfa-d96d556d171b', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ungu', '#A855F7', 'CAT 4', 2200, 1763, 437, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('eb591be4-269c-5956-8325-5e40757d89e3', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Putih', '#F8FAFC', 'CAT 5', 1700, 746, 954, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('9066e435-424b-5b52-8efa-14c54c14dc05', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Kuning', '#EAB308', 'CAT 6', 1450, 855, 595, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a397d9bd-bb10-5476-82cf-e8adda78e5a6', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Gold', '#FFD700', 'VVIP PIT', 170, 70, 100, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('c1bf7a45-5b76-50a8-9ab2-9bab7b7f63a9', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Teal', '#00A39D', 'VIP ZONE', 280, 139, 141, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('df67b805-fe0b-5d03-b207-000b495edf5a', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Orange', '#F8AD3C', 'FESTIVAL', 1700, 1066, 634, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('b5b5196e-f03b-58d3-b7ec-19a2c84c3d4c', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Merah', '#EF4444', 'CAT 1', 1100, 453, 647, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('7cdf7b6d-2d24-5d48-aee6-88bf55201fa5', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Biru', '#3B82F6', 'CAT 2', 1700, 832, 868, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('1610f530-f3cf-5106-a7f8-067dfdd17642', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Hijau', '#22C55E', 'CAT 3', 1700, 1177, 523, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a21edd30-0974-5e50-b71e-2a42ba630d0d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Ungu', '#A855F7', 'CAT 4', 2200, 1419, 781, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6f7c9ccc-5eff-5fd1-a305-36dbeeb63295', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Putih', '#F8FAFC', 'CAT 5', 1700, 848, 852, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('09652ada-b987-565b-b67d-7265921b6076', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Kuning', '#EAB308', 'CAT 6', 1450, 964, 486, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('d3d1a343-4e7c-5a3e-b425-88bbc0cdd9ed', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Gold', '#FFD700', 'VVIP PIT', 170, 129, 41, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('889c25f7-c040-576e-b112-d78727c717c3', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Teal', '#00A39D', 'VIP ZONE', 280, 112, 168, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('c20cc884-fd0c-5afb-a6d3-6a5ecdc3c7d5', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Orange', '#F8AD3C', 'FESTIVAL', 1700, 1296, 404, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('df570da8-a615-585c-a5d5-9e065774be4e', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Merah', '#EF4444', 'CAT 1', 1100, 785, 315, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('c5197bce-ed50-5239-ab9d-e029cb261867', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Biru', '#3B82F6', 'CAT 2', 1700, 940, 760, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('07ec41e9-96ce-5122-96e0-7b2f103f14c4', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Hijau', '#22C55E', 'CAT 3', 1700, 798, 902, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2bc8cf05-c058-5d28-b3a1-54fd054e0b02', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Ungu', '#A855F7', 'CAT 4', 2200, 1827, 373, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('30001fd5-1f90-5eee-abb9-2df20b876294', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Putih', '#F8FAFC', 'CAT 5', 1700, 937, 763, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('2594526b-b12c-5c4f-9169-ae876984533b', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Kuning', '#EAB308', 'CAT 6', 1450, 640, 810, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('b88652f3-8cd6-5dfd-8053-b8bf069256b0', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Gold', '#FFD700', 'VVIP PIT', 170, 75, 95, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6d920a24-0ce2-5eff-aeec-3e94a525b627', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Teal', '#00A39D', 'VIP ZONE', 280, 218, 62, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('3b65d612-2850-5119-82e1-276c46a548a8', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Orange', '#F8AD3C', 'FESTIVAL', 1700, 1141, 559, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('06b0b91e-4808-55ca-a852-9c4d2e74a39d', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Merah', '#EF4444', 'CAT 1', 1100, 839, 261, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('125ef21a-da83-5a0e-a660-864180b58fa9', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Biru', '#3B82F6', 'CAT 2', 1700, 1238, 462, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('5249b56e-b525-521d-8fc8-d061b9399327', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Hijau', '#22C55E', 'CAT 3', 1700, 1090, 610, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('f774bdcc-04b9-5239-b2be-ac7020847f9e', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Ungu', '#A855F7', 'CAT 4', 2200, 1843, 357, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('01fbb937-ec29-5446-8bbf-971612ce3dfa', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Putih', '#F8FAFC', 'CAT 5', 1700, 969, 731, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('ac62c4ee-e42a-5e2c-af13-2524a09e194e', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'Kuning', '#EAB308', 'CAT 6', 1450, 940, 510, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('87a6edc0-07f5-51d3-b0d0-6a3bb6db27d1', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Gold', '#FFD700', 'VVIP PIT', 170, 131, 39, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('36f3a1a2-cbc6-5e5b-a5d3-a5938289c646', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Teal', '#00A39D', 'VIP ZONE', 280, 189, 91, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('bdfc612a-39ba-50e2-85c8-a06dd71c8112', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Orange', '#F8AD3C', 'FESTIVAL', 1700, 1339, 361, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('a3e7b990-188f-5b47-8345-ad416614e3b1', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Merah', '#EF4444', 'CAT 1', 1100, 725, 375, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('95d70f82-1066-5e20-a5cc-7a4917b6e860', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Biru', '#3B82F6', 'CAT 2', 1700, 1218, 482, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('6563ea09-f53b-5f85-889e-e6a41c7d7d66', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Hijau', '#22C55E', 'CAT 3', 1700, 715, 985, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('bff0fc9b-fe4a-5591-8235-cd894deebc24', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Ungu', '#A855F7', 'CAT 4', 2200, 1105, 1095, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('87d161bf-e5c8-51e9-ba35-32fb0b9cc8d3', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Putih', '#F8FAFC', 'CAT 5', 1700, 901, 799, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00'),
    ('245ffc2b-6560-5632-8e98-09f7c915945c', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Kuning', '#EAB308', 'CAT 6', 1450, 632, 818, '2025-03-01 12:00:00+00', '2025-03-01 12:00:00+00')
;

-- ─── SEED SUMMARY ──────────────────────────────────────────────────────
-- Total events: 5
-- Total quota:  60,000
-- Total sold:   37,215
-- Total available: 22,785
-- Platform fee: 5% per ticket

-- ─── Bandung (sheila-on7-bandung) ───
--   Quota: 12,000 | Sold: 7,475 | Available: 4,525
--   VVIP PIT     | Rp  3,250,000 + fee Rp  162,500 | quota:   170 | sold:   116 | avail:    54
--   VIP ZONE     | Rp  2,600,000 + fee Rp  130,000 | quota:   280 | sold:   115 | avail:   165
--   FESTIVAL     | Rp  2,000,000 + fee Rp  100,000 | quota: 1,700 | sold:   890 | avail:   810
--   CAT 1        | Rp  1,600,000 + fee Rp   80,000 | quota: 1,100 | sold:   550 | avail:   550
--   CAT 2        | Rp  1,300,000 + fee Rp   65,000 | quota: 1,700 | sold: 1,243 | avail:   457
--   CAT 3        | Rp  1,000,000 + fee Rp   50,000 | quota: 1,700 | sold: 1,197 | avail:   503
--   CAT 4        | Rp    750,000 + fee Rp   37,500 | quota: 2,200 | sold: 1,763 | avail:   437
--   CAT 5        | Rp    500,000 + fee Rp   25,000 | quota: 1,700 | sold:   746 | avail:   954
--   CAT 6        | Rp    300,000 + fee Rp   15,000 | quota: 1,450 | sold:   855 | avail:   595

-- ─── Makassar (sheila-on7-makassar) ───
--   Quota: 12,000 | Sold: 6,968 | Available: 5,032
--   VVIP PIT     | Rp  3,000,000 + fee Rp  150,000 | quota:   170 | sold:    70 | avail:   100
--   VIP ZONE     | Rp  2,400,000 + fee Rp  120,000 | quota:   280 | sold:   139 | avail:   141
--   FESTIVAL     | Rp  1,850,000 + fee Rp   92,500 | quota: 1,700 | sold: 1,066 | avail:   634
--   CAT 1        | Rp  1,450,000 + fee Rp   72,500 | quota: 1,100 | sold:   453 | avail:   647
--   CAT 2        | Rp  1,150,000 + fee Rp   57,500 | quota: 1,700 | sold:   832 | avail:   868
--   CAT 3        | Rp    900,000 + fee Rp   45,000 | quota: 1,700 | sold: 1,177 | avail:   523
--   CAT 4        | Rp    700,000 + fee Rp   35,000 | quota: 2,200 | sold: 1,419 | avail:   781
--   CAT 5        | Rp    450,000 + fee Rp   22,500 | quota: 1,700 | sold:   848 | avail:   852
--   CAT 6        | Rp    275,000 + fee Rp   13,750 | quota: 1,450 | sold:   964 | avail:   486

-- ─── Medan (sheila-on7-medan) ───
--   Quota: 12,000 | Sold: 7,464 | Available: 4,536
--   VVIP PIT     | Rp  3,000,000 + fee Rp  150,000 | quota:   170 | sold:   129 | avail:    41
--   VIP ZONE     | Rp  2,400,000 + fee Rp  120,000 | quota:   280 | sold:   112 | avail:   168
--   FESTIVAL     | Rp  1,850,000 + fee Rp   92,500 | quota: 1,700 | sold: 1,296 | avail:   404
--   CAT 1        | Rp  1,450,000 + fee Rp   72,500 | quota: 1,100 | sold:   785 | avail:   315
--   CAT 2        | Rp  1,150,000 + fee Rp   57,500 | quota: 1,700 | sold:   940 | avail:   760
--   CAT 3        | Rp    900,000 + fee Rp   45,000 | quota: 1,700 | sold:   798 | avail:   902
--   CAT 4        | Rp    700,000 + fee Rp   35,000 | quota: 2,200 | sold: 1,827 | avail:   373
--   CAT 5        | Rp    450,000 + fee Rp   22,500 | quota: 1,700 | sold:   937 | avail:   763
--   CAT 6        | Rp    275,000 + fee Rp   13,750 | quota: 1,450 | sold:   640 | avail:   810

-- ─── Jakarta (sheila-on7-jakarta) ───
--   Quota: 12,000 | Sold: 8,353 | Available: 3,647
--   VVIP PIT     | Rp  3,500,000 + fee Rp  175,000 | quota:   170 | sold:    75 | avail:    95
--   VIP ZONE     | Rp  2,800,000 + fee Rp  140,000 | quota:   280 | sold:   218 | avail:    62
--   FESTIVAL     | Rp  2,200,000 + fee Rp  110,000 | quota: 1,700 | sold: 1,141 | avail:   559
--   CAT 1        | Rp  1,750,000 + fee Rp   87,500 | quota: 1,100 | sold:   839 | avail:   261
--   CAT 2        | Rp  1,400,000 + fee Rp   70,000 | quota: 1,700 | sold: 1,238 | avail:   462
--   CAT 3        | Rp  1,100,000 + fee Rp   55,000 | quota: 1,700 | sold: 1,090 | avail:   610
--   CAT 4        | Rp    850,000 + fee Rp   42,500 | quota: 2,200 | sold: 1,843 | avail:   357
--   CAT 5        | Rp    550,000 + fee Rp   27,500 | quota: 1,700 | sold:   969 | avail:   731
--   CAT 6        | Rp    350,000 + fee Rp   17,500 | quota: 1,450 | sold:   940 | avail:   510

-- ─── Balikpapan (sheila-on7-balikpapan) ───
--   Quota: 12,000 | Sold: 6,955 | Available: 5,045
--   VVIP PIT     | Rp  2,750,000 + fee Rp  137,500 | quota:   170 | sold:   131 | avail:    39
--   VIP ZONE     | Rp  2,200,000 + fee Rp  110,000 | quota:   280 | sold:   189 | avail:    91
--   FESTIVAL     | Rp  1,700,000 + fee Rp   85,000 | quota: 1,700 | sold: 1,339 | avail:   361
--   CAT 1        | Rp  1,350,000 + fee Rp   67,500 | quota: 1,100 | sold:   725 | avail:   375
--   CAT 2        | Rp  1,050,000 + fee Rp   52,500 | quota: 1,700 | sold: 1,218 | avail:   482
--   CAT 3        | Rp    850,000 + fee Rp   42,500 | quota: 1,700 | sold:   715 | avail:   985
--   CAT 4        | Rp    650,000 + fee Rp   32,500 | quota: 2,200 | sold: 1,105 | avail: 1,095
--   CAT 5        | Rp    400,000 + fee Rp   20,000 | quota: 1,700 | sold:   901 | avail:   799
--   CAT 6        | Rp    250,000 + fee Rp   12,500 | quota: 1,450 | sold:   632 | avail:   818

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
