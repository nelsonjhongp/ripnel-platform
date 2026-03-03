/* ============================================================
   RIPNEL MVP - PostgreSQL Schema (pgAdmin 4)
   Script único: SCHEMA + PATCH (idempotente)

   Base operativa (tiendas + almacén) con:
   - Productos STYLE -> VARIANT (SKU + barcode)
   - Stock por ubicación + Kardex (stock_movements)
   - Transferencias con estados
   - Ventas: Proforma (sin IGV) / Boleta-Factura (con IGV interno)
   - Pagos mixtos
   - Cambios (exchanges) sin devolución
   - Precios por style+talla (retail/wholesale) + regla mayorista (>=3 por modelo)
   - Caja: cierre diario por tienda (opcional pero útil)

   NOTA IMPORTANTE:
   - La consistencia de stock (descontar/sumar inventory + insertar kardex)
     se implementa en BACKEND (Node) usando TRANSACCIONES.
   ============================================================ */

-- ============================================================
-- Extensión (UUID seguro). Esto NO es cifrado de columnas.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- (Opcional) Reset DEV (DESCOMENTA con cuidado)
-- ============================================================
/*
DROP TABLE IF EXISTS cash_closings CASCADE;

DROP TABLE IF EXISTS exchange_lines CASCADE;
DROP TABLE IF EXISTS exchanges CASCADE;

DROP TABLE IF EXISTS sales_payments CASCADE;
DROP TABLE IF EXISTS sales_details CASCADE;
DROP TABLE IF EXISTS sales CASCADE;

DROP TABLE IF EXISTS stock_transfer_lines CASCADE;
DROP TABLE IF EXISTS stock_transfers CASCADE;

DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

DROP TABLE IF EXISTS style_size_prices CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;

DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS style_colors CASCADE;
DROP TABLE IF EXISTS style_sizes CASCADE;
DROP TABLE IF EXISTS product_styles CASCADE;

DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TABLE IF EXISTS targets CASCADE;
DROP TABLE IF EXISTS sizes CASCADE;
DROP TABLE IF EXISTS colors CASCADE;
DROP TABLE IF EXISTS fabric_details CASCADE;
DROP TABLE IF EXISTS fabrics CASCADE;
DROP TABLE IF EXISTS garment_types CASCADE;
*/

-- ============================================================
-- 1) SEGURIDAD (Users / Roles / Permissions)
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(30) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- hash (bcrypt/argon2) en backend
  role_id UUID REFERENCES roles(role_id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 2) CATÁLOGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS garment_types (
  garment_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(60) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fabrics (
  fabric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(80) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fabric_details (
  fabric_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS colors (
  color_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(40) NOT NULL UNIQUE,
  hex VARCHAR(7),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sizes (
  size_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(30) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS targets (
  target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(30) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 3) UBICACIONES + CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  address VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (type IN ('store','warehouse','workshop','third_party'))
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni VARCHAR(20) UNIQUE,
  ruc VARCHAR(20) UNIQUE,
  business_name VARCHAR(160),
  full_name VARCHAR(160),
  address VARCHAR(255),
  email VARCHAR(120),
  phone VARCHAR(20),
  customer_type VARCHAR(20) NOT NULL DEFAULT 'retail',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (customer_type IN ('retail','wholesale'))
);

-- ============================================================
-- 4) PRODUCTOS ROPA: STYLE -> VARIANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS product_styles (
  style_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garment_type_id UUID NOT NULL REFERENCES garment_types(garment_type_id),
  fabric_id UUID REFERENCES fabrics(fabric_id),
  fabric_detail_id UUID REFERENCES fabric_details(fabric_detail_id),
  target_id UUID REFERENCES targets(target_id),

  style_code VARCHAR(30) UNIQUE,
  name VARCHAR(140) NOT NULL,
  description TEXT,

  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS style_sizes (
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES sizes(size_id),
  PRIMARY KEY (style_id, size_id)
);

CREATE TABLE IF NOT EXISTS style_colors (
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  color_id UUID NOT NULL REFERENCES colors(color_id),
  PRIMARY KEY (style_id, color_id)
);

CREATE TABLE IF NOT EXISTS product_variants (
  variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES sizes(size_id),
  color_id UUID NOT NULL REFERENCES colors(color_id),

  sku VARCHAR(60) NOT NULL UNIQUE,
  barcode VARCHAR(80) UNIQUE,

  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (style_id, size_id, color_id)
);

CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_style   ON product_variants(style_id);

-- ============================================================
-- 5) PRECIOS (Style + Talla) con vigencia
-- ============================================================

CREATE TABLE IF NOT EXISTS style_size_prices (
  style_size_price_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES sizes(size_id),

  price_type VARCHAR(20) NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),

  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (price_type IN ('retail','wholesale')),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_style_size_prices
  ON style_size_prices(style_id, size_id, price_type, start_date);

CREATE INDEX IF NOT EXISTS idx_style_size_prices_lookup
  ON style_size_prices(style_id, size_id, price_type, start_date DESC);

-- ============================================================
-- 6) REGLA MAYORISTA (configurable)
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type VARCHAR(60) NOT NULL,
  min_qty INT NOT NULL CHECK (min_qty > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

-- Solo 1 regla por tipo (MVP)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_pricing_rules_rule_type'
      AND conrelid = 'pricing_rules'::regclass
  ) THEN
    ALTER TABLE pricing_rules
      ADD CONSTRAINT uq_pricing_rules_rule_type UNIQUE (rule_type);
  END IF;
END$$;

-- ============================================================
-- 7) INVENTARIO + KARDEX
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
  location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (location_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant  ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(location_id),
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  movement_type VARCHAR(10) NOT NULL, -- IN/OUT/ADJUST
  quantity INT NOT NULL CHECK (quantity > 0),

  reason VARCHAR(200),
  reference_type VARCHAR(20), -- sale/transfer/exchange/adjustment
  reference_id UUID,
  reference_line_id UUID,

  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (movement_type IN ('IN','OUT','ADJUST')),
  CHECK (reference_type IS NULL OR reference_type IN ('sale','transfer','exchange','adjustment'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ref
  ON stock_movements(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant
  ON stock_movements(variant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_location_date
  ON stock_movements(location_id, created_at DESC);

-- ============================================================
-- 8) TRANSFERENCIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_transfers (
  transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(30) UNIQUE,
  from_location_id UUID NOT NULL REFERENCES locations(location_id),
  to_location_id UUID NOT NULL REFERENCES locations(location_id),

  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,

  created_by UUID REFERENCES users(user_id),
  shipped_by UUID REFERENCES users(user_id),
  received_by UUID REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('draft','shipped','received','cancelled')),
  CHECK (from_location_id <> to_location_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  transfer_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  qty_requested INT NOT NULL CHECK (qty_requested > 0),
  qty_shipped   INT NOT NULL DEFAULT 0 CHECK (qty_shipped >= 0),
  qty_received  INT NOT NULL DEFAULT 0 CHECK (qty_received >= 0),

  CHECK (qty_shipped  <= qty_requested),
  CHECK (qty_received <= qty_shipped)
);

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer
  ON stock_transfer_lines(transfer_id);

-- ============================================================
-- 9) VENTAS + PAGOS + DATOS CLIENTE (snapshots) + IMPUESTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number VARCHAR(30) UNIQUE, -- backend puede generar P-/B-/F-
  location_id UUID NOT NULL REFERENCES locations(location_id),
  seller_user_id UUID NOT NULL REFERENCES users(user_id),

  customer_id UUID REFERENCES customers(customer_id),

  customer_name_text VARCHAR(160),
  customer_doc_type VARCHAR(10),     -- dni/ruc/none
  customer_doc_number VARCHAR(20),
  customer_address_text VARCHAR(255),

  document_type VARCHAR(20) NOT NULL DEFAULT 'proforma', -- proforma/boleta/factura/none
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,

  currency VARCHAR(3) NOT NULL DEFAULT 'PEN',

  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('draft','confirmed','cancelled')),
  CHECK (document_type IN ('none','proforma','boleta','factura')),
  CHECK (customer_doc_type IS NULL OR customer_doc_type IN ('dni','ruc','none')),
  CHECK (tax_rate >= 0 AND tax_rate <= 1),

  CHECK (document_type <> 'proforma' OR (tax_rate = 0 AND tax_amount = 0))
);

CREATE TABLE IF NOT EXISTS sales_details (
  sale_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  quantity INT NOT NULL CHECK (quantity > 0),

  unit_price_list NUMERIC(10,2) CHECK (unit_price_list >= 0),
  unit_price_final NUMERIC(10,2) NOT NULL CHECK (unit_price_final >= 0),

  price_type_applied VARCHAR(20) NOT NULL DEFAULT 'retail',
  pricing_basis VARCHAR(30) NOT NULL DEFAULT 'auto',
  override_reason VARCHAR(200),

  overridden_by UUID REFERENCES users(user_id),
  overridden_at TIMESTAMPTZ,

  line_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_subtotal >= 0),
  line_tax      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_tax >= 0),
  line_total    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (price_type_applied IN ('retail','wholesale')),
  CHECK (pricing_basis IN ('auto','manual_override')),

  CHECK (
    (pricing_basis = 'auto'
      AND override_reason IS NULL
      AND overridden_by IS NULL
      AND overridden_at IS NULL)
    OR
    (pricing_basis = 'manual_override'
      AND override_reason IS NOT NULL
      AND overridden_by IS NOT NULL
      AND overridden_at IS NOT NULL)
  ),

  UNIQUE (sale_id, variant_id)
);

CREATE TABLE IF NOT EXISTS sales_payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,

  method VARCHAR(20) NOT NULL, -- cash/yape/plin/transfer
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reference VARCHAR(80),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (method IN ('cash','yape','plin','transfer'))
);

-- ============================================================
-- 9.1) CAJA (cierres diarios) - opcional
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_closings (
  cash_closing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(location_id),
  business_date DATE NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'open',
  opened_by UUID REFERENCES users(user_id),
  closed_by UUID REFERENCES users(user_id),

  total_cash     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_cash >= 0),
  total_yape     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_yape >= 0),
  total_plin     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_plin >= 0),
  total_transfer NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_transfer >= 0),
  total_all      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_all >= 0),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at  TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('open','closed')),
  UNIQUE (location_id, business_date)
);

-- ============================================================
-- 10) CAMBIOS / REPOSICIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS exchanges (
  exchange_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_number VARCHAR(30) UNIQUE,
  sale_id UUID REFERENCES sales(sale_id),
  location_id UUID NOT NULL REFERENCES locations(location_id),

  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  reason VARCHAR(200),

  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMPTZ,

  CHECK (status IN ('draft','confirmed','cancelled'))
);

CREATE TABLE IF NOT EXISTS exchange_lines (
  exchange_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(exchange_id) ON DELETE CASCADE,

  variant_id_in UUID NOT NULL REFERENCES product_variants(variant_id),
  qty_in INT NOT NULL CHECK (qty_in > 0),

  variant_id_out UUID NOT NULL REFERENCES product_variants(variant_id),
  qty_out INT NOT NULL CHECK (qty_out > 0)
);

-- ============================================================
-- 11) Función precio vigente (Style+Talla+Tipo)
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_style_size_price(
  p_style_id UUID,
  p_size_id UUID,
  p_price_type VARCHAR DEFAULT 'retail',
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC(10,2) AS $$
  SELECT price
  FROM style_size_prices
  WHERE style_id = p_style_id
    AND size_id = p_size_id
    AND price_type = p_price_type
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
    AND active = TRUE
  ORDER BY start_date DESC
  LIMIT 1;
$$ LANGUAGE sql;

-- ============================================================
-- 12) PATCH INTEGRADO (para BD existentes)
--     Evita errores cuando ya existían tablas sin columnas nuevas.
-- ============================================================

DO $$
BEGIN
  -- SALES: document_type y columnas nuevas
  IF to_regclass('public.sales') IS NOT NULL THEN
    ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) NOT NULL DEFAULT 'proforma',
      ADD COLUMN IF NOT EXISTS customer_name_text VARCHAR(160),
      ADD COLUMN IF NOT EXISTS customer_doc_type VARCHAR(10),
      ADD COLUMN IF NOT EXISTS customer_doc_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS customer_address_text VARCHAR(255),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
      ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

    -- Normaliza datos existentes (proforma por defecto, sin IGV)
    UPDATE sales
    SET
      document_type   = COALESCE(document_type, 'proforma'),
      tax_rate        = CASE WHEN COALESCE(document_type,'proforma')='proforma' THEN 0 ELSE tax_rate END,
      tax_amount      = CASE WHEN COALESCE(document_type,'proforma')='proforma' THEN 0 ELSE COALESCE(tax_amount,0) END,
      subtotal_amount = CASE WHEN COALESCE(document_type,'proforma')='proforma' THEN COALESCE(total_amount,0) ELSE COALESCE(subtotal_amount,0) END;
  END IF;

  -- SALES_DETAILS: columnas de override/auditoría y totales por línea
  IF to_regclass('public.sales_details') IS NOT NULL THEN
    ALTER TABLE sales_details
      ADD COLUMN IF NOT EXISTS unit_price_list NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS price_type_applied VARCHAR(20) NOT NULL DEFAULT 'retail',
      ADD COLUMN IF NOT EXISTS pricing_basis VARCHAR(30) NOT NULL DEFAULT 'auto',
      ADD COLUMN IF NOT EXISTS override_reason VARCHAR(200),
      ADD COLUMN IF NOT EXISTS overridden_by UUID,
      ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS line_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2) NOT NULL DEFAULT 0;

    UPDATE sales_details
    SET
      price_type_applied = COALESCE(price_type_applied,'retail'),
      pricing_basis      = COALESCE(pricing_basis,'auto');
  END IF;
END$$;

-- ============================================================
-- 13) ÍNDICES (después del patch, para que existan las columnas)
-- ============================================================

-- ventas (consultas comunes)
CREATE INDEX IF NOT EXISTS idx_sales_location_date
  ON sales(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_status_created
  ON sales(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_doc_created
  ON sales(document_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_seller_created
  ON sales(seller_user_id, created_at DESC);

-- detalles/pagos
CREATE INDEX IF NOT EXISTS idx_sales_details_sale
  ON sales_details(sale_id);

CREATE INDEX IF NOT EXISTS idx_sales_details_variant
  ON sales_details(variant_id);

CREATE INDEX IF NOT EXISTS idx_sales_payments_sale
  ON sales_payments(sale_id);

CREATE INDEX IF NOT EXISTS idx_sales_payments_method_paid
  ON sales_payments(method, paid_at DESC);

-- ============================================================
-- 14) Triggers updated_at (tablas clave)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_styles_updated_at ON product_styles;
CREATE TRIGGER trg_styles_updated_at
BEFORE UPDATE ON product_styles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_variants_updated_at ON product_variants;
CREATE TRIGGER trg_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_prices_updated_at ON style_size_prices;
CREATE TRIGGER trg_prices_updated_at
BEFORE UPDATE ON style_size_prices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rules_updated_at ON pricing_rules;
CREATE TRIGGER trg_rules_updated_at
BEFORE UPDATE ON pricing_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_details_updated_at ON sales_details;
CREATE TRIGGER trg_sales_details_updated_at
BEFORE UPDATE ON sales_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transfers_updated_at ON stock_transfers;
CREATE TRIGGER trg_transfers_updated_at
BEFORE UPDATE ON stock_transfers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cash_closings_updated_at ON cash_closings;
CREATE TRIGGER trg_cash_closings_updated_at
BEFORE UPDATE ON cash_closings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 15) Seeds mínimos
-- ============================================================

INSERT INTO roles(name, description)
VALUES
  ('ADMIN','Acceso total'),
  ('TIENDA','Operación tienda (ventas y consultas)'),
  ('ALMACEN','Operación almacén (stock/transferencias)'),
  ('CAJA','Caja (cobros y cierre diario)')
ON CONFLICT (name) DO NOTHING;

-- Regla mayorista RIPNEL: desde 3 unidades por modelo (sumando tallas+colores)
INSERT INTO pricing_rules(rule_type, min_qty, active, valid_from, valid_to)
VALUES ('WHOLESALE_MIN_QTY_PER_STYLE', 3, TRUE, CURRENT_DATE, NULL)
ON CONFLICT (rule_type) DO UPDATE
SET min_qty    = EXCLUDED.min_qty,
    active     = EXCLUDED.active,
    valid_from = COALESCE(EXCLUDED.valid_from, pricing_rules.valid_from),
    valid_to   = EXCLUDED.valid_to,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- 16) Comentarios “meta”
-- ============================================================

COMMENT ON TABLE sales IS
'Ventas internas: proforma (sin IGV) y boleta/factura (con IGV interno). Confirmación y stock se manejan en backend con transacciones.';

COMMENT ON TABLE sales_details IS
'Líneas de venta por SKU (variant). UNIQUE(sale_id, variant_id) evita duplicados y facilita el POS.';

COMMENT ON TABLE stock_movements IS
'Kardex: historial de cambios de stock (IN/OUT/ADJUST) con referencia a venta/transferencia/cambio.';

COMMENT ON TABLE cash_closings IS
'Cierre diario por tienda con totales por método de pago.';