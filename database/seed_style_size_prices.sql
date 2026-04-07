-- ============================================================
-- OFFICIAL SEED: style_size_prices
-- Canonical executable seed for prices using real IDs resolved
-- from style_code and size_code.
-- Focused subset to unblock the prices module without loading
-- the full catalog.
-- ============================================================

INSERT INTO style_size_prices (
  style_id,
  size_id,
  price_type,
  price,
  start_date,
  end_date,
  active
)
SELECT
  ps.style_id,
  s.size_id,
  seeded.price_type,
  seeded.price,
  seeded.start_date::date,
  seeded.end_date::date,
  seeded.active
FROM (
  VALUES
    -- CAF-RIP (Cafarena) - Sizes: ST, L
    ('CAF-RIP', 'ST', 'retail', 49.90, '2026-03-26', NULL, true),
    ('CAF-RIP', 'ST', 'wholesale', 35.90, '2026-03-26', NULL, true),
    ('CAF-RIP', 'L', 'retail', 49.90, '2026-03-26', NULL, true),
    ('CAF-RIP', 'L', 'wholesale', 35.90, '2026-03-26', NULL, true),

    -- JOG-FTER (Jogger) - Sizes: S, M, L, XL
    ('JOG-FTER', 'S', 'retail', 89.90, '2026-03-26', NULL, true),
    ('JOG-FTER', 'S', 'wholesale', 65.00, '2026-03-26', NULL, true),
    ('JOG-FTER', 'M', 'retail', 89.90, '2026-03-26', NULL, true),
    ('JOG-FTER', 'M', 'wholesale', 65.00, '2026-03-26', NULL, true),
    ('JOG-FTER', 'L', 'retail', 99.90, '2026-03-26', NULL, true),
    ('JOG-FTER', 'L', 'wholesale', 72.00, '2026-03-26', NULL, true),
    ('JOG-FTER', 'XL', 'retail', 109.90, '2026-03-26', NULL, true),
    ('JOG-FTER', 'XL', 'wholesale', 79.50, '2026-03-26', NULL, true),

    -- LEG-SUP (Legging) - Sizes: S, M, L, XL
    ('LEG-SUP', 'S', 'retail', 79.90, '2026-03-26', NULL, true),
    ('LEG-SUP', 'S', 'wholesale', 58.00, '2026-03-26', NULL, true),
    ('LEG-SUP', 'M', 'retail', 79.90, '2026-03-26', NULL, true),
    ('LEG-SUP', 'M', 'wholesale', 58.00, '2026-03-26', NULL, true),
    ('LEG-SUP', 'L', 'retail', 89.90, '2026-03-26', NULL, true),
    ('LEG-SUP', 'L', 'wholesale', 65.00, '2026-03-26', NULL, true),
    ('LEG-SUP', 'XL', 'retail', 99.90, '2026-03-26', NULL, true),
    ('LEG-SUP', 'XL', 'wholesale', 72.00, '2026-03-26', NULL, true),

    -- POL-FLIC (Polo Manga Corta - Full Licra) - Sizes: ST, L, XL
    ('POL-FLIC', 'ST', 'retail', 39.90, '2026-03-26', NULL, true),
    ('POL-FLIC', 'ST', 'wholesale', 28.50, '2026-03-26', NULL, true),
    ('POL-FLIC', 'L', 'retail', 39.90, '2026-03-26', NULL, true),
    ('POL-FLIC', 'L', 'wholesale', 28.50, '2026-03-26', NULL, true),
    ('POL-FLIC', 'XL', 'retail', 44.90, '2026-03-26', NULL, true),
    ('POL-FLIC', 'XL', 'wholesale', 31.90, '2026-03-26', NULL, true),

    -- SHO-CHA (Short - Chaliz) - Sizes: ST
    ('SHO-CHA', 'ST', 'retail', 59.90, '2026-03-26', NULL, true),
    ('SHO-CHA', 'ST', 'wholesale', 42.50, '2026-03-26', NULL, true)
) AS seeded(style_code, size_code, price_type, price, start_date, end_date, active)
INNER JOIN product_styles ps ON ps.style_code = seeded.style_code
INNER JOIN sizes s ON s.code = seeded.size_code
INNER JOIN style_sizes ss ON ss.style_id = ps.style_id AND ss.size_id = s.size_id
ON CONFLICT (style_id, size_id, price_type, start_date) DO UPDATE
SET
  price = EXCLUDED.price,
  end_date = EXCLUDED.end_date,
  active = EXCLUDED.active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- SUMMARY
-- ============================================================
-- This script inserts or normalizes:
-- - 28 retail/wholesale prices for 5 styles
-- - one current validity window per style+size+type
-- - enough data to list, filter and validate the prices module
--
-- The backend computes validity_status automatically from:
-- - start_date
-- - end_date
-- - active
-- ============================================================
