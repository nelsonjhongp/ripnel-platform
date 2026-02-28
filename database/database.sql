/* ============================================================
   RIPNEL MVP - PostgreSQL Schema (pgAdmin 4)
   Asume que YA estás conectado a la DB de RIPNEL.
   ============================================================ */

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- (Opcional) Si quieres re-ejecutar desde cero en DEV:
-- DESCOMENTA este bloque para borrar tablas (cuidado en PROD)
-- ============================================================
/*
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
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(30) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id UUID REFERENCES roles(role_id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(80) NOT NULL UNIQUE, -- e.g. inventory.adjust, price.manage
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 2) CATÁLOGOS (Dropdowns)
-- ============================================================

CREATE TABLE IF NOT EXISTS garment_types (
  garment_type_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE,          -- opcional: JOG, LEG, TOP...
  name VARCHAR(60) NOT NULL UNIQUE, -- Jogger, Legging, Top Tirita...
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fabrics (
  fabric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE,           -- FT, FLIC, RIP...
  name VARCHAR(80) NOT NULL UNIQUE,  -- French Terry, Full Licra...
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fabric_details (
  fabric_detail_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE,            -- PER, RIG, RAY...
  name VARCHAR(120) NOT NULL UNIQUE,  -- Perchado, Rigido, Rayas...
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS colors (
  color_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE,           -- NEG, BLA, TOP...
  name VARCHAR(40) NOT NULL UNIQUE,
  hex VARCHAR(7),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sizes (
  size_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) NOT NULL UNIQUE,  -- ST, S, M, L, XL, XXL, ONE...
  name VARCHAR(30) NOT NULL,         -- Small, Medium, Talla única...
  sort_order INT DEFAULT 0,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS targets (
  target_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(30) NOT NULL UNIQUE   -- Mujer/Hombre/Unisex
);

-- ============================================================
-- 3) UBICACIONES + CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- store, warehouse (futuro: workshop, third_party)
  address VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (type IN ('store','warehouse','workshop','third_party'))
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni VARCHAR(20) UNIQUE,
  ruc VARCHAR(20) UNIQUE,
  business_name VARCHAR(160),
  full_name VARCHAR(160),
  email VARCHAR(120),
  phone VARCHAR(20),
  customer_type VARCHAR(20) DEFAULT 'retail',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (customer_type IN ('retail','wholesale'))
);

-- ============================================================
-- 4) PRODUCTOS ROPA: STYLE -> VARIANTS (SKU)
-- ============================================================

-- STYLE = Modelo base (Prenda + Tela/Detalle)
CREATE TABLE IF NOT EXISTS product_styles (
  style_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garment_type_id UUID NOT NULL REFERENCES garment_types(garment_type_id),
  fabric_id UUID REFERENCES fabrics(fabric_id),
  fabric_detail_id UUID REFERENCES fabric_details(fabric_detail_id),
  target_id UUID REFERENCES targets(target_id),

  style_code VARCHAR(30) UNIQUE,     -- opcional (código corto)
  name VARCHAR(140) NOT NULL,        -- nombre humano (editable)
  description TEXT,

  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tallas disponibles por style
CREATE TABLE IF NOT EXISTS style_sizes (
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES sizes(size_id),
  PRIMARY KEY (style_id, size_id)
);

-- colores disponibles por style
CREATE TABLE IF NOT EXISTS style_colors (
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  color_id UUID NOT NULL REFERENCES colors(color_id),
  PRIMARY KEY (style_id, color_id)
);

-- VARIANT = SKU vendible (Style + Talla + Color)
CREATE TABLE IF NOT EXISTS product_variants (
  variant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES sizes(size_id),
  color_id UUID NOT NULL REFERENCES colors(color_id),

  sku VARCHAR(60) NOT NULL UNIQUE,
  barcode VARCHAR(80) UNIQUE,  -- para sticker/escáner

  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (style_id, size_id, color_id)
);

CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_style ON product_variants(style_id);

-- ============================================================
-- 5) PRECIOS (por Style + Talla) + vigencia
-- ============================================================

CREATE TABLE IF NOT EXISTS style_size_prices (
  style_size_price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id UUID NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES sizes(size_id),

  price_type VARCHAR(20) NOT NULL, -- retail / wholesale
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),

  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (price_type IN ('retail','wholesale')),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- evita duplicidad exacta de vigencias para el mismo combo
CREATE UNIQUE INDEX IF NOT EXISTS uq_style_size_prices
  ON style_size_prices(style_id, size_id, price_type, start_date);

CREATE INDEX IF NOT EXISTS idx_style_size_prices_lookup
  ON style_size_prices(style_id, size_id, price_type, start_date DESC);

-- ============================================================
-- 6) REGLA MAYORISTA (configurable) - por modelo (Style) sumando tallas+colores
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_type VARCHAR(60) NOT NULL, -- WHOLESALE_MIN_QTY_PER_STYLE
  min_qty INT NOT NULL CHECK (min_qty > 0),
  active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

-- ============================================================
-- 7) INVENTARIO + KARDEX (trazabilidad)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
  location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (location_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(location_id),
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  movement_type VARCHAR(10) NOT NULL, -- IN/OUT/ADJUST
  quantity INT NOT NULL CHECK (quantity > 0),

  reason VARCHAR(200),
  reference_type VARCHAR(20), -- sale/transfer/exchange/adjustment
  reference_id UUID,
  reference_line_id UUID,

  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (movement_type IN ('IN','OUT','ADJUST')),
  CHECK (reference_type IS NULL OR reference_type IN ('sale','transfer','exchange','adjustment'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ref
  ON stock_movements(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant
  ON stock_movements(variant_id, created_at DESC);

-- ============================================================
-- 8) TRANSFERENCIAS (ticket con estados)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_transfers (
  transfer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number VARCHAR(30) UNIQUE, -- opcional: T-000123
  from_location_id UUID NOT NULL REFERENCES locations(location_id),
  to_location_id UUID NOT NULL REFERENCES locations(location_id),

  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,

  created_by UUID REFERENCES users(user_id),
  shipped_by UUID REFERENCES users(user_id),
  received_by UUID REFERENCES users(user_id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('draft','shipped','received','cancelled')),
  CHECK (from_location_id <> to_location_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  transfer_line_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  qty_requested INT NOT NULL CHECK (qty_requested > 0),
  qty_shipped INT NOT NULL DEFAULT 0 CHECK (qty_shipped >= 0),
  qty_received INT NOT NULL DEFAULT 0 CHECK (qty_received >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer
  ON stock_transfer_lines(transfer_id);

-- ============================================================
-- 9) VENTAS (cabecera + líneas) + pagos mixtos
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  sale_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number VARCHAR(30) UNIQUE, -- opcional: V-000123
  location_id UUID NOT NULL REFERENCES locations(location_id),
  seller_user_id UUID NOT NULL REFERENCES users(user_id),
  customer_id UUID REFERENCES customers(customer_id),

  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,

  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('draft','confirmed','cancelled'))
);

CREATE TABLE IF NOT EXISTS sales_details (
  sale_detail_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  quantity INT NOT NULL CHECK (quantity > 0),

  -- precio sugerido por lista (opcional)
  unit_price_list NUMERIC(10,2) CHECK (unit_price_list >= 0),

  -- precio real aplicado (negociable)
  unit_price_final NUMERIC(10,2) NOT NULL CHECK (unit_price_final >= 0),

  -- retail/wholesale aplicado a esta línea
  price_type_applied VARCHAR(20) NOT NULL DEFAULT 'retail',
  pricing_basis VARCHAR(30) NOT NULL DEFAULT 'auto', -- auto / manual_override
  override_reason VARCHAR(200),

  line_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (price_type_applied IN ('retail','wholesale')),
  CHECK (pricing_basis IN ('auto','manual_override'))
);

CREATE INDEX IF NOT EXISTS idx_sales_details_sale ON sales_details(sale_id);

CREATE TABLE IF NOT EXISTS sales_payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,

  method VARCHAR(20) NOT NULL, -- cash/yape/plin/transfer
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reference VARCHAR(80),
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (method IN ('cash','yape','plin','transfer'))
);

-- ============================================================
-- 10) CAMBIOS / REPOSICIONES (sin reembolso)
-- ============================================================

CREATE TABLE IF NOT EXISTS exchanges (
  exchange_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange_number VARCHAR(30) UNIQUE, -- opcional: C-000123
  sale_id UUID REFERENCES sales(sale_id),
  location_id UUID NOT NULL REFERENCES locations(location_id),

  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  reason VARCHAR(200),

  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,

  CHECK (status IN ('draft','confirmed','cancelled'))
);

CREATE TABLE IF NOT EXISTS exchange_lines (
  exchange_line_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange_id UUID NOT NULL REFERENCES exchanges(exchange_id) ON DELETE CASCADE,

  variant_id_in UUID NOT NULL REFERENCES product_variants(variant_id),
  qty_in INT NOT NULL CHECK (qty_in > 0),

  variant_id_out UUID NOT NULL REFERENCES product_variants(variant_id),
  qty_out INT NOT NULL CHECK (qty_out > 0)
);

-- ============================================================
-- 11) Función precio vigente (por Style+Talla+Tipo)
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
-- 12) (Opcional) Triggers mínimos updated_at (solo tablas clave)
--     - Si no los quieres, puedes borrar esta sección.
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Para poder re-ejecutar sin error:
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

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transfers_updated_at ON stock_transfers;
CREATE TRIGGER trg_transfers_updated_at
BEFORE UPDATE ON stock_transfers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_details_updated_at ON sales_details;
CREATE TRIGGER trg_sales_details_updated_at
BEFORE UPDATE ON sales_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 13) Seeds mínimos (opcional): roles + regla docena
-- ============================================================

-- Roles básicos
INSERT INTO roles(name, description)
VALUES
  ('ADMIN','Acceso total'),
  ('TIENDA','Operación tienda'),
  ('ALMACEN','Operación almacén'),
  ('CAJA','Ventas/caja')
ON CONFLICT (name) DO NOTHING;

-- Regla mayorista por modelo (docena) - ajusta min_qty cuando confirmen
INSERT INTO pricing_rules(rule_type, min_qty, active)
VALUES ('WHOLESALE_MIN_QTY_PER_STYLE', 12, TRUE)
ON CONFLICT DO NOTHING; -- (sin unique) esto no evita duplicados; si quieres, dime y lo hacemos unique por rule_type.