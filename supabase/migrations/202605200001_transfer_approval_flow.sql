ALTER TABLE stock_transfers
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

UPDATE stock_transfers
SET status = 'requested'
WHERE status = 'draft';

ALTER TABLE stock_transfers
  DROP CONSTRAINT IF EXISTS stock_transfers_status_check;

ALTER TABLE stock_transfers
  ADD CONSTRAINT stock_transfers_status_check
  CHECK (status IN ('requested', 'approved', 'shipped', 'received', 'cancelled'));
