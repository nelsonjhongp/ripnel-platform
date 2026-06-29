CREATE TABLE IF NOT EXISTS product_technical_profiles (
  technical_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL UNIQUE REFERENCES product_styles(style_id) ON DELETE CASCADE,
  fabric_id UUID REFERENCES fabrics(fabric_id),
  fabric_detail_id UUID REFERENCES fabric_details(fabric_detail_id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO product_technical_profiles (
  style_id,
  fabric_id,
  fabric_detail_id,
  active,
  created_at,
  updated_at
)
SELECT
  ps.style_id,
  ps.fabric_id,
  ps.fabric_detail_id,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM product_styles ps
WHERE ps.fabric_id IS NOT NULL
   OR ps.fabric_detail_id IS NOT NULL
ON CONFLICT (style_id) DO UPDATE
SET fabric_id = EXCLUDED.fabric_id,
    fabric_detail_id = EXCLUDED.fabric_detail_id,
    updated_at = CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS trg_product_technical_profiles_updated_at ON product_technical_profiles;
CREATE TRIGGER trg_product_technical_profiles_updated_at
BEFORE UPDATE ON product_technical_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE product_styles
  DROP COLUMN IF EXISTS fabric_id,
  DROP COLUMN IF EXISTS fabric_detail_id,
  DROP COLUMN IF EXISTS target_id;
