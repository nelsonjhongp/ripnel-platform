-- ============================================================
-- SEED: style_size_prices
-- Datos de ejemplo para poblar tabla de precios por style y talla
-- Ejecutar después de que existan styles y sizes
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
  seeded.start_date,
  seeded.end_date,
  seeded.active
FROM (
  VALUES
    -- JOG-FTER (Jogger) - Tallas: S, M, L, XL
    ('JOG-FTER', 'S', 'retail', 89.90, '2026-01-15', NULL, true),
    ('JOG-FTER', 'S', 'wholesale', 65.00, '2026-01-15', NULL, true),
    ('JOG-FTER', 'M', 'retail', 89.90, '2026-01-15', NULL, true),
    ('JOG-FTER', 'M', 'wholesale', 65.00, '2026-01-15', NULL, true),
    ('JOG-FTER', 'L', 'retail', 99.90, '2026-01-15', NULL, true),
    ('JOG-FTER', 'L', 'wholesale', 72.00, '2026-01-15', NULL, true),
    ('JOG-FTER', 'XL', 'retail', 109.90, '2026-01-15', NULL, true),
    ('JOG-FTER', 'XL', 'wholesale', 79.50, '2026-01-15', NULL, true),
    
    -- LEG-SUP (Legging) - Tallas: S, M, L, XL
    ('LEG-SUP', 'S', 'retail', 79.90, '2026-02-01', NULL, true),
    ('LEG-SUP', 'S', 'wholesale', 58.00, '2026-02-01', NULL, true),
    ('LEG-SUP', 'M', 'retail', 79.90, '2026-02-01', NULL, true),
    ('LEG-SUP', 'M', 'wholesale', 58.00, '2026-02-01', NULL, true),
    ('LEG-SUP', 'L', 'retail', 89.90, '2026-02-01', NULL, true),
    ('LEG-SUP', 'L', 'wholesale', 65.00, '2026-02-01', NULL, true),
    ('LEG-SUP', 'XL', 'retail', 99.90, '2026-02-01', NULL, true),
    ('LEG-SUP', 'XL', 'wholesale', 72.00, '2026-02-01', NULL, true),
    
    -- POL-FLIC (Polo) - Tallas: ST, L, XL
    ('POL-FLIC', 'ST', 'retail', 69.90, '2026-01-20', NULL, true),
    ('POL-FLIC', 'ST', 'wholesale', 50.00, '2026-01-20', NULL, true),
    ('POL-FLIC', 'L', 'retail', 69.90, '2026-01-20', NULL, true),
    ('POL-FLIC', 'L', 'wholesale', 50.00, '2026-01-20', NULL, true),
    ('POL-FLIC', 'XL', 'retail', 79.90, '2026-01-20', NULL, true),
    ('POL-FLIC', 'XL', 'wholesale', 58.00, '2026-01-20', NULL, true),
    
    -- SHO-CHA (Short) - Talla: ST
    ('SHO-CHA', 'ST', 'retail', 59.90, '2026-02-10', NULL, true),
    ('SHO-CHA', 'ST', 'wholesale', 43.00, '2026-02-10', NULL, true),
    
    -- CAF-RIP (Cafarena) - Tallas: ST, L
    ('CAF-RIP', 'ST', 'retail', 49.90, '2026-02-15', NULL, true),
    ('CAF-RIP', 'ST', 'wholesale', 35.90, '2026-02-15', NULL, true),
    ('CAF-RIP', 'L', 'retail', 49.90, '2026-02-15', NULL, true),
    ('CAF-RIP', 'L', 'wholesale', 35.90, '2026-02-15', NULL, true),

    -- Precios programados (vigentes después de 2026-04-01)
    ('JOG-FTER', 'S', 'retail', 94.90, '2026-04-01', NULL, true),
    ('JOG-FTER', 'S', 'wholesale', 68.50, '2026-04-01', NULL, true),
    ('LEG-SUP', 'M', 'retail', 84.90, '2026-04-01', NULL, true),
    ('LEG-SUP', 'M', 'wholesale', 61.00, '2026-04-01', NULL, true),
    ('POL-FLIC', 'L', 'retail', 74.90, '2026-04-01', NULL, true),
    ('POL-FLIC', 'L', 'wholesale', 54.00, '2026-04-01', NULL, true)
    
) AS seeded(style_code, size_code, price_type, price, start_date, end_date, active)
INNER JOIN product_styles ps ON ps.style_code = seeded.style_code
INNER JOIN sizes s ON s.code = seeded.size_code
ON CONFLICT (style_id, size_id, price_type, start_date) DO NOTHING;

-- ============================================================
-- RESUMEN
-- ============================================================
-- Ejecutar este script inserta:
-- - 30 precios retail/wholesale para 5 styles
-- - Vigencias actuales desde enero/febrero 2026
-- - Precios programados para abril 2026
-- 
-- El backend calculará automáticamente:
--   - validity_status: active | scheduled | expired | inactive
--   - Basado en: start_date, end_date, active flag
-- ============================================================
