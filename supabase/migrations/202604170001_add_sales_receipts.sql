-- Agrega soporte de comprobantes electronicos asociados a ventas confirmadas.

CREATE TABLE IF NOT EXISTS sales_receipts (
  sales_receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL UNIQUE REFERENCES sales(sale_id) ON DELETE CASCADE,

  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('boleta','factura')),
  series VARCHAR(4) NOT NULL,
  correlative VARCHAR(8) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  provider VARCHAR(30),
  external_id VARCHAR(100),
  sunat_status VARCHAR(20),
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

CREATE INDEX IF NOT EXISTS idx_sales_receipts_sunat_status
  ON sales_receipts(sunat_status, issued_at DESC);

DROP TRIGGER IF EXISTS trg_sales_receipts_updated_at ON sales_receipts;
CREATE TRIGGER trg_sales_receipts_updated_at
BEFORE UPDATE ON sales_receipts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE sales_receipts IS
'Comprobante electronico asociado a una venta confirmada y su estado de integracion SUNAT.';
