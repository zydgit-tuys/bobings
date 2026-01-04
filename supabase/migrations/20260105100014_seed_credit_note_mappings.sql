-- Migration: 20260105_seed_credit_note_mappings.sql
-- Description: Adds default mappings for 'credit_note' event type across marketplaces.
-- Matches the revenue/piutang accounts used in confirm_sales_order.

BEGIN;

-- 1. Ensure 'credit_note' is in any enum if necessary? 
-- The table "journal_account_mappings" uses text for event_type, so no enum update needed.

-- 2. Seed Mappings based on existing 'confirm_sales_order' logic
-- We want to map:
--   Credit Note -> Revenue (as Credit side - logic handles negating it) 
--   Credit Note -> Piutang (as Debit side - logic handles negating it)

-- Helper to insert if not exists
INSERT INTO journal_account_mappings (event_type, event_context, marketplace_code, side, account_id, priority, is_active)
SELECT 
    'credit_note' as event_type,
    event_context,
    marketplace_code,
    side,
    account_id,
    priority,
    true as is_active
FROM journal_account_mappings
WHERE event_type = 'confirm_sales_order'
  AND side IN ('debit', 'credit') -- We copy both Revenue (credit) and Piutang (debit) mappings
  AND is_active = true
ON CONFLICT DO NOTHING;

-- Note: The Edge Function logic for 'credit_note' uses:
--   - Revenue Account: from 'credit' side mapping (will typically be 4-xxxx)
--   - AR Account: from 'debit' side mapping (will typically be 1-xxxx)
-- This matches exactly what 'confirm_sales_order' does, so copying them is safe.

COMMIT;
