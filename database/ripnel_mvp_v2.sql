
/* ============================================================
   RIPNEL MVP v2 - PostgreSQL 16 Schema (full script)
   Enfoque:
   - ERP MVP operativo para RIPNEL
   - preparado para analítica básica y futura capa SaaS sin sobrecomplicar
   - pensado para ejecutarse en una BD nueva

   Cambios principales vs versión anterior:
   - customers unificado con document_type + document_number
   - regla mayorista por cantidad total de venta
   - descuento global por venta
   - pricing_rule_applied en detalle de venta
   - transferencias con timestamps y unique por variante
   - user_locations para restringir operación por ubicación
   - inventory_adjustments como documento formal
   - exchanges rediseñado con líneas direction IN / OUT
   - más auditoría: cancelled_by/cancelled_at, confirmed_by, etc.

   NOTA:
   - La consistencia transaccional de stock, venta, cambios y transferencias
     se implementa en backend usando transacciones SQL.
   ============================================================ */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

/* ============================================================
   RESET DEV (descomentar con cuidado)
   ============================================================ */
/*
DROP TABLE IF EXISTS cash_closings CASCADE;

DROP TABLE IF EXISTS exchange_lines CASCADE;
DROP TABLE IF EXISTS exchanges CASCADE;

DROP TABLE IF EXISTS sales_receipts CASCADE;
DROP TABLE IF EXISTS sales_payment_reversals CASCADE;
DROP TABLE IF EXISTS sale_cancellations CASCADE;
DROP TABLE IF EXISTS sales_payments CASCADE;
DROP TABLE IF EXISTS sales_details CASCADE;
DROP TABLE IF EXISTS sales CASCADE;

DROP TABLE IF EXISTS stock_transfer_lines CASCADE;
DROP TABLE IF EXISTS stock_transfers CASCADE;

DROP TABLE IF EXISTS inventory_adjustment_lines CASCADE;
DROP TABLE IF EXISTS inventory_adjustments CASCADE;

DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

DROP TABLE IF EXISTS style_size_prices CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;

DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS style_colors CASCADE;
DROP TABLE IF EXISTS style_sizes CASCADE;
DROP TABLE IF EXISTS product_styles CASCADE;

DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS user_locations CASCADE;
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
-- 1) SEGURIDAD
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
  password_hash TEXT NOT NULL,
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
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fabrics (
  fabric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(80) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fabric_details (
  fabric_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS colors (
  color_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name VARCHAR(40) NOT NULL UNIQUE,
  hex VARCHAR(7),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3) UBICACIONES + ASIGNACIÓN DE USUARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  type VARCHAR(20) NOT NULL,
  address VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (type IN ('store','warehouse','workshop','third_party'))
);

CREATE TABLE IF NOT EXISTS user_locations (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, location_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_locations_default
  ON user_locations(user_id)
  WHERE is_default = TRUE;

-- ============================================================
-- 4) CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  internal_code VARCHAR(30) UNIQUE,
  document_type VARCHAR(20) NOT NULL DEFAULT 'none',
  document_number VARCHAR(30),

  full_name VARCHAR(160),
  business_name VARCHAR(160),
  commercial_name VARCHAR(160),

  email VARCHAR(120),
  phone VARCHAR(20),

  ubigeo_code VARCHAR(6),
  department VARCHAR(80),
  province VARCHAR(80),
  district VARCHAR(80),
  zone VARCHAR(120),
  address VARCHAR(255),

  assigned_seller_user_id UUID REFERENCES users(user_id),
  notes TEXT,

  customer_type VARCHAR(20) NOT NULL DEFAULT 'retail',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (customer_type IN ('retail','wholesale')),
  CHECK (document_type IN ('none','dni','ruc','ce','passport')),
  CHECK (
    (document_type = 'none' AND document_number IS NULL)
    OR
    (document_type <> 'none' AND document_number IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_document
  ON customers(document_type, document_number)
  WHERE document_type <> 'none';

CREATE INDEX IF NOT EXISTS idx_customers_name
  ON customers(full_name);

CREATE INDEX IF NOT EXISTS idx_customers_business_name
  ON customers(business_name);

CREATE INDEX IF NOT EXISTS idx_customers_assigned_seller
  ON customers(assigned_seller_user_id);

-- ============================================================
-- 5) PRODUCTOS: MODELO -> VARIANTE
-- ============================================================

CREATE TABLE IF NOT EXISTS product_styles (
  style_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garment_type_id UUID NOT NULL REFERENCES garment_types(garment_type_id),
  style_code VARCHAR(30) UNIQUE,
  name VARCHAR(140) NOT NULL,
  description TEXT,

  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_technical_profiles (
  technical_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL UNIQUE REFERENCES product_styles(style_id) ON DELETE CASCADE,
  fabric_id UUID REFERENCES fabrics(fabric_id),
  fabric_detail_id UUID REFERENCES fabric_details(fabric_detail_id),
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
CREATE INDEX IF NOT EXISTS idx_variants_size    ON product_variants(size_id);
CREATE INDEX IF NOT EXISTS idx_variants_color   ON product_variants(color_id);

-- ============================================================
-- 6) PRECIOS Y REGLAS COMERCIALES
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_pricing_rules_rule_type'
      AND conrelid = 'pricing_rules'::regclass
  ) THEN
    ALTER TABLE pricing_rules
      ADD CONSTRAINT uq_pricing_rules_rule_type UNIQUE (rule_type);
  END IF;
END$$;

-- ============================================================
-- 7) INVENTARIO + KARDEX + AJUSTES
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
  location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (location_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant
  ON inventory(variant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_location
  ON inventory(location_id);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  adjustment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(30) UNIQUE,
  location_id UUID NOT NULL REFERENCES locations(location_id),

  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  reason VARCHAR(200),
  notes TEXT,

  created_by UUID REFERENCES users(user_id),
  confirmed_by UUID REFERENCES users(user_id),
  cancelled_by UUID REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('draft','confirmed','cancelled'))
);

CREATE TABLE IF NOT EXISTS inventory_adjustment_lines (
  adjustment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(adjustment_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  system_qty INT NOT NULL CHECK (system_qty >= 0),
  counted_qty INT NOT NULL CHECK (counted_qty >= 0),
  difference_qty INT GENERATED ALWAYS AS (counted_qty - system_qty) STORED,

  notes TEXT,

  UNIQUE (adjustment_id, variant_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(location_id),
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  movement_type VARCHAR(10) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),

  reason VARCHAR(200),
  reference_type VARCHAR(20),
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
  cancelled_by UUID REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
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

  notes TEXT,

  CHECK (qty_shipped  <= qty_requested),
  CHECK (qty_received <= qty_shipped),

  UNIQUE (transfer_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer
  ON stock_transfer_lines(transfer_id);

-- ============================================================
-- 9) VENTAS + PAGOS + SNAPSHOT CLIENTE
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number VARCHAR(30) UNIQUE,

  location_id UUID NOT NULL REFERENCES locations(location_id),
  seller_user_id UUID NOT NULL REFERENCES users(user_id),
  customer_id UUID REFERENCES customers(customer_id),

  customer_name_text VARCHAR(160),
  customer_doc_type VARCHAR(20),
  customer_doc_number VARCHAR(30),
  customer_address_text VARCHAR(255),

  document_type VARCHAR(20) NOT NULL DEFAULT 'proforma',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,

  currency VARCHAR(3) NOT NULL DEFAULT 'PEN',

  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  sale_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sale_discount_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  sale_discount_reason VARCHAR(200),
  discounted_by UUID REFERENCES users(user_id),
  discounted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_by UUID REFERENCES users(user_id),

  CONSTRAINT chk_sales_status
    CHECK (status IN ('draft','confirmed','cancelled')),

  CONSTRAINT chk_sales_document_type
    CHECK (document_type IN ('none','proforma','boleta','factura')),

  CONSTRAINT chk_sales_customer_doc_type
    CHECK (customer_doc_type IS NULL OR customer_doc_type IN ('none','dni','ruc','ce','passport')),

  CONSTRAINT chk_sales_tax_rate_range
    CHECK (tax_rate >= 0 AND tax_rate <= 1),

  CONSTRAINT chk_sales_proforma_no_igv
    CHECK (document_type <> 'proforma' OR (tax_rate = 0 AND tax_amount = 0)),

  CONSTRAINT chk_sales_discount_audit
    CHECK (
      sale_discount_amount = 0
      OR (
        sale_discount_reason IS NOT NULL
        AND discounted_by IS NOT NULL
        AND discounted_at IS NOT NULL
      )
    ),

  CONSTRAINT chk_sales_correlative_confirmed
    CHECK (
      status <> 'confirmed'
      OR (
        sale_number IS NOT NULL
        AND (
          (document_type = 'proforma' AND sale_number ~ '^P-[0-9]{6}$')
          OR (document_type = 'boleta'   AND sale_number ~ '^B-[0-9]{6}$')
          OR (document_type = 'factura'  AND sale_number ~ '^F-[0-9]{6}$')
          OR (document_type = 'none'     AND sale_number IS NOT NULL)
        )
      )
    ),

  CONSTRAINT chk_sales_boleta_requires_dni
    CHECK (
      status <> 'confirmed'
      OR document_type <> 'boleta'
      OR (
        customer_name_text IS NOT NULL
        AND customer_doc_type IN ('dni','ce')
        AND customer_doc_number IS NOT NULL
      )
    ),

  CONSTRAINT chk_sales_factura_requires_ruc_address
    CHECK (
      status <> 'confirmed'
      OR document_type <> 'factura'
      OR (
        customer_name_text IS NOT NULL
        AND customer_doc_type = 'ruc'
        AND customer_doc_number IS NOT NULL
        AND customer_address_text IS NOT NULL
      )
    )
);

CREATE TABLE IF NOT EXISTS sales_details (
  sale_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),

  quantity INT NOT NULL CHECK (quantity > 0),

  unit_price_list NUMERIC(10,2) NOT NULL CHECK (unit_price_list >= 0),
  unit_price_final NUMERIC(10,2) NOT NULL CHECK (unit_price_final >= 0),

  price_type_applied VARCHAR(20) NOT NULL DEFAULT 'retail',
  pricing_basis VARCHAR(30) NOT NULL DEFAULT 'auto',
  pricing_rule_applied VARCHAR(60),
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

  method VARCHAR(20) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reference VARCHAR(80),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (method IN ('cash','yape','plin','transfer'))
);

CREATE TABLE IF NOT EXISTS sale_cancellations (
  sale_cancellation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(location_id),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  reason VARCHAR(200) NOT NULL,
  notes TEXT,
  cancelled_by UUID REFERENCES users(user_id),
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_sale_cancellations_sale UNIQUE (sale_id),
  CONSTRAINT chk_sale_cancellations_status
    CHECK (status IN ('confirmed'))
);

CREATE INDEX IF NOT EXISTS idx_sale_cancellations_location_date
  ON sale_cancellations(location_id, cancelled_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_cancellations_cancelled_at
  ON sale_cancellations(cancelled_at DESC);

CREATE TABLE IF NOT EXISTS sales_payment_reversals (
  payment_reversal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES sales_payments(payment_id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(location_id),
  method VARCHAR(20) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason VARCHAR(200) NOT NULL,
  notes TEXT,
  reversed_by UUID REFERENCES users(user_id),
  reversed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_sales_payment_reversals_payment UNIQUE (payment_id),
  CONSTRAINT chk_sales_payment_reversals_method
    CHECK (method IN ('cash','yape','plin','transfer'))
);

CREATE INDEX IF NOT EXISTS idx_sales_payment_reversals_sale
  ON sales_payment_reversals(sale_id);

CREATE INDEX IF NOT EXISTS idx_sales_payment_reversals_location_date
  ON sales_payment_reversals(location_id, reversed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_payment_reversals_reversed_at
  ON sales_payment_reversals(reversed_at DESC);

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
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('open','closed')),
  UNIQUE (location_id, business_date)
);


CREATE TABLE IF NOT EXISTS sales_receipts (
  sales_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL UNIQUE REFERENCES sales(sale_id) ON DELETE CASCADE,

  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('boleta','factura')),
  series VARCHAR(4) NOT NULL,          -- B001 / F001
  correlative VARCHAR(8) NOT NULL,     -- 00000001
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  provider VARCHAR(30),                -- greenter, nubefact, etc.
  external_id VARCHAR(100),            -- ticket o id externo
  sunat_status VARCHAR(20),            -- sent/accepted/rejected/voided
  sunat_code VARCHAR(20),
  sunat_message TEXT,

  xml_url TEXT,
  cdr_url TEXT,
  pdf_url TEXT,
  qr_payload TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (
    sunat_status IS NULL
    OR sunat_status IN ('pending','sent','accepted','rejected','voided','error')
  ),

  UNIQUE (series, correlative)
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
  notes TEXT,
  original_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (original_total >= 0),
  replacement_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (replacement_total >= 0),
  difference_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  settlement_type VARCHAR(20) NOT NULL DEFAULT 'none',
  settlement_payment_id UUID REFERENCES sales_payments(payment_id),

  created_by UUID REFERENCES users(user_id),
  confirmed_by UUID REFERENCES users(user_id),
  cancelled_by UUID REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('draft','confirmed','cancelled')),
  CHECK (settlement_type IN ('none','charge','refund_pending','credit_pending'))
);

CREATE TABLE IF NOT EXISTS exchange_lines (
  exchange_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(exchange_id) ON DELETE CASCADE,

  direction VARCHAR(10) NOT NULL,
  variant_id UUID NOT NULL REFERENCES product_variants(variant_id),
  sale_detail_id UUID REFERENCES sales_details(sale_detail_id),
  quantity INT NOT NULL CHECK (quantity > 0),

  unit_reference_price NUMERIC(10,2),
  unit_price_list NUMERIC(10,2),
  unit_price_final NUMERIC(10,2),
  line_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_subtotal >= 0),
  line_tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_tax >= 0),
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  price_source VARCHAR(30),
  notes TEXT,

  CHECK (direction IN ('IN','OUT'))
);

CREATE INDEX IF NOT EXISTS idx_exchange_lines_exchange
  ON exchange_lines(exchange_id);

CREATE INDEX IF NOT EXISTS idx_exchange_lines_variant
  ON exchange_lines(variant_id);

CREATE INDEX IF NOT EXISTS idx_exchange_lines_sale_detail
  ON exchange_lines(sale_detail_id);

CREATE INDEX IF NOT EXISTS idx_exchanges_settlement_payment
  ON exchanges(settlement_payment_id);

-- ============================================================
-- 11) FUNCIÓN: PRECIO VIGENTE
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
-- 12) ÍNDICES OPERATIVOS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_locations_type_active
  ON locations(type, active);

CREATE INDEX IF NOT EXISTS idx_sales_location_date
  ON sales(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_status_created
  ON sales(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_doc_created
  ON sales(document_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_seller_created
  ON sales(seller_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_customer
  ON sales(customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_details_sale
  ON sales_details(sale_id);

CREATE INDEX IF NOT EXISTS idx_sales_details_variant
  ON sales_details(variant_id);

CREATE INDEX IF NOT EXISTS idx_sales_details_rule
  ON sales_details(pricing_rule_applied);

CREATE INDEX IF NOT EXISTS idx_sales_payments_sale
  ON sales_payments(sale_id);

CREATE INDEX IF NOT EXISTS idx_sales_payments_method_paid
  ON sales_payments(method, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_receipts_sunat_status
  ON sales_receipts(sunat_status, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_adjustments_location_created
  ON inventory_adjustments(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_from_created
  ON stock_transfers(from_location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_to_created
  ON stock_transfers(to_location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_status_created
  ON stock_transfers(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchanges_location_created
  ON exchanges(location_id, created_at DESC);

-- ============================================================
-- 13) TRIGGERS updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_garment_types_updated_at ON garment_types;
CREATE TRIGGER trg_garment_types_updated_at
BEFORE UPDATE ON garment_types
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_fabrics_updated_at ON fabrics;
CREATE TRIGGER trg_fabrics_updated_at
BEFORE UPDATE ON fabrics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_fabric_details_updated_at ON fabric_details;
CREATE TRIGGER trg_fabric_details_updated_at
BEFORE UPDATE ON fabric_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_colors_updated_at ON colors;
CREATE TRIGGER trg_colors_updated_at
BEFORE UPDATE ON colors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sizes_updated_at ON sizes;
CREATE TRIGGER trg_sizes_updated_at
BEFORE UPDATE ON sizes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_targets_updated_at ON targets;
CREATE TRIGGER trg_targets_updated_at
BEFORE UPDATE ON targets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations;
CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_styles_updated_at ON product_styles;
CREATE TRIGGER trg_styles_updated_at
BEFORE UPDATE ON product_styles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_technical_profiles_updated_at ON product_technical_profiles;
CREATE TRIGGER trg_product_technical_profiles_updated_at
BEFORE UPDATE ON product_technical_profiles
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

DROP TRIGGER IF EXISTS trg_adjustments_updated_at ON inventory_adjustments;
CREATE TRIGGER trg_adjustments_updated_at
BEFORE UPDATE ON inventory_adjustments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transfers_updated_at ON stock_transfers;
CREATE TRIGGER trg_transfers_updated_at
BEFORE UPDATE ON stock_transfers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_details_updated_at ON sales_details;
CREATE TRIGGER trg_sales_details_updated_at
BEFORE UPDATE ON sales_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cash_closings_updated_at ON cash_closings;
CREATE TRIGGER trg_cash_closings_updated_at
BEFORE UPDATE ON cash_closings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_receipts_updated_at ON sales_receipts;
CREATE TRIGGER trg_sales_receipts_updated_at
BEFORE UPDATE ON sales_receipts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_exchanges_updated_at ON exchanges;
CREATE TRIGGER trg_exchanges_updated_at
BEFORE UPDATE ON exchanges
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 14) SEEDS MÍNIMOS
-- ============================================================

INSERT INTO roles(name, description)
VALUES
  ('ADMIN',   'Acceso total'),
  ('TIENDA',  'Operación de ventas y consultas'),
  ('ALMACEN', 'Operación de stock y transferencias'),
  ('CAJA',    'Cobros y cierre diario')
ON CONFLICT (name) DO NOTHING;

INSERT INTO pricing_rules(rule_type, min_qty, active, valid_from, valid_to)
VALUES ('WHOLESALE_MIN_QTY_TOTAL', 3, TRUE, CURRENT_DATE, NULL)
ON CONFLICT (rule_type) DO UPDATE
SET min_qty    = EXCLUDED.min_qty,
    active     = EXCLUDED.active,
    valid_from = COALESCE(EXCLUDED.valid_from, pricing_rules.valid_from),
    valid_to   = EXCLUDED.valid_to,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- 15) COMENTARIOS META
-- ============================================================

COMMENT ON TABLE product_styles IS
'Modelo o producto base. En UI puede mostrarse como Modelo, no necesariamente como Style.';

COMMENT ON TABLE product_technical_profiles IS
'Capa tecnica minima del producto. Conserva tela y detalle tecnico fuera del nucleo comercial.';

COMMENT ON TABLE product_variants IS
'SKU vendible por combinación de modelo, talla y color.';

COMMENT ON TABLE pricing_rules IS
'Reglas comerciales globales. En MVP: mayorista por cantidad total de la venta.';

COMMENT ON TABLE stock_movements IS
'Kardex: historial de movimientos IN / OUT / ADJUST con referencia a venta, transferencia, cambio o ajuste.';

COMMENT ON TABLE inventory_adjustments IS
'Documento formal de ajuste de inventario. Al confirmar genera movimientos tipo ADJUST en stock_movements.';

COMMENT ON TABLE sales IS
'Venta interna con snapshot de cliente, descuento global opcional y soporte para proforma/boleta/factura.';

COMMENT ON TABLE sales_details IS
'Líneas de venta por variante. pricing_rule_applied ayuda a analítica comercial futura.';

COMMENT ON TABLE sales_receipts IS
'Comprobante electrónico asociado a una venta confirmada y su estado de integración SUNAT.';

COMMENT ON TABLE exchanges IS
'Cabecera de cambios/reposiciones. Puede asociarse o no a una venta previa.';

COMMENT ON TABLE exchange_lines IS
'Líneas flexibles de cambio: direction IN / OUT para soportar cambios simples y mayoristas.';
