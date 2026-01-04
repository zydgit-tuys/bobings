# Journal Account Mappings – Reference

This document serves as the **Single Source of Truth** for required account mappings in the V2 Auto-Journaling system.
Any new marketplace or product type added to the system **MUST** have corresponding rows in the `journal_account_mappings` table.

## 1. Event Types
The system supports the following event types:
- `confirm_sales_order` (Standard Revenue)
- `credit_note` (Sales Return / Credit Note)
- `stock_adjustment` (Inventory Increase/Decrease)
- `stock_opname` (Stock Count Reconciliation)
- `customer_payment` (AR Settlement)
- `confirm_purchase` (AP Creation)
- `marketplace_payout` (Cash Settlement)

## 2. Required Mappings per Context

### A. Sales & Credit Notes (Marketplace Context)
For every active marketplace (e.g., `shopee`, `tokopedia`, `tiktok`, `lazada`), the following entries are **MANDATORY**:

| Event Type | Marketplace | Context | Side | Generic Account Dest | Description |
|------------|-------------|---------|------|----------------------|-------------|
| `confirm_sales_order` | `{code}` | `marketplace` | `credit` | **Revenue** (4-xxxx) | Gross Revenue for this channel |
| `confirm_sales_order` | `{code}` | `marketplace` | `debit` | **Piutang** (1-xxxx) | AR Clearing for this channel |
| `credit_note` | `{code}` | `marketplace` | `credit` | **Revenue** (4-xxxx) | Contra-Revenue (same as Revenue) |
| `credit_note` | `{code}` | `marketplace` | `debit` | **Piutang** (1-xxxx) | Contra-AR (same as Piutang) |

> **Note:** `credit_note` accounts usually point to the SAME accounts as `confirm_sales_order`. The logic handles the negation (negative Credit = Debit).

### B. Inventory & COGS (Product Type Context)
For every product type (e.g., `purchased`, `production`), base mappings are required if they differ from default.

| Event Type | Product Type | Side | Generic Account Dest | Description |
|------------|--------------|------|----------------------|-------------|
| `confirm_sales_order` | `purchased` | `credit` | **Revenue** (Trading) | Revenue for trading goods |
| `confirm_sales_order` | `production` | `credit` | **Revenue** (Production)| Revenue for manufactured goods |
| `confirm_sales_order` | `service` | `credit` | **Revenue** (Service) | Revenue for services |

### C. Operational Mappings (Global)
These usually exist once (Generic context).

| Event Type | Context | Side | Account Type | Description |
|------------|---------|------|--------------|-------------|
| `stock_adjustment` | `increase` | `credit` | **Contra-Expense** | Gain from stock adjust |
| `stock_adjustment` | `increase` | `debit` | **Inventory** | Stock asset increase |
| `stock_adjustment` | `decrease` | `debit` | **Expense** | Loss from stock adjust |
| `stock_adjustment` | `decrease` | `credit` | **Inventory** | Stock asset decrease |
| `stock_opname` | `increase` | `credit` | **Contra-Expense** | Opname Gain |
| `customer_payment` | `generic` | `credit` | **Piutang** | AR Relief |

## 3. Maintenance Workflow

### Adding a New Marketplace
1. **Identify the Marketplace Code** (e.g., `blibli`).
2. **Create Mappings**:
   ```sql
   INSERT INTO journal_account_mappings (event_type, marketplace_code, side, account_id) VALUES
   ('confirm_sales_order', 'blibli', 'credit', <Revenue_Acc_ID>),
   ('confirm_sales_order', 'blibli', 'debit',  <Piutang_Acc_ID>),
   ('credit_note',         'blibli', 'credit', <Revenue_Acc_ID>),
   ('credit_note',         'blibli', 'debit',  <Piutang_Acc_ID>);
   ```
3. **Run Validation**: Execute `rules/validate_mappings.sql` to confirm no missing rows.

### Adding a New Product Type
1. If the new type requires a distinct Revenue account, add a `product_type` specific mapping.
2. If distinct COGS account is needed, ensure `app_settings` or COGS logic supports it.

## 4. Troubleshooting
- **Error: "No mapping found for event check..."**
  - Check `journal_account_mappings` for the specific `marketplace_code` and `event_type`.
  - Fallback is often `app_settings` (V1), but V2 is preferred.
