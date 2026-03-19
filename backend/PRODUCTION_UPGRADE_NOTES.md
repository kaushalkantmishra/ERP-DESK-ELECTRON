# Production Upgrade Notes

## Scope

This upgrade hardens the ERP from demo flow into a safer Procurement + Inventory system for local/offline deployment, with finance kept light but future-ready.

## Architecture Decisions

- Backend is now the source of truth for business rules, not the UI.
- Procurement, inventory, and finance workflows use backend-controlled state transitions.
- Document numbers are generated from fiscal-year-aware backend sequences.
- Monetary values are stored as base amount, tax amount, and total amount.
- Inventory keeps weighted average cost and reservation-aware stock levels.
- Audit logging stores before/after snapshots for immutable traceability.
- Version numbers are used on mutable transactional documents to reduce concurrent overwrite risk.
- Settings such as tolerance and negative-stock policy are stored in `system_settings`.

## Implemented Backend Changes

- Added strict transition maps for PR, PO, GRN, Invoice, and Payment.
- Added sequence-backed numbering through `document_sequences`.
- Added configurable ERP settings through `system_settings`.
- Added stock reservation support through `stock_reservations`.
- Added weighted average cost and reserved quantity to `stock_levels`.
- Added VAT-ready totals to quotation, PO, GRN, invoice, and payment structures.
- Added richer audit history with `before_data` and `after_data`.
- Added GRN reversal endpoint with stock rollback safeguards.
- Added 3-way-match style controls:
  - GRN cannot exceed PO quantity beyond tolerance
  - Invoice cannot exceed received/accepted quantity beyond tolerance
  - Payment cannot exceed approved invoice balance
- Added price variance tracking from master/PO baseline into quotation and PO lines.

## Validation Rules Now Enforced

- PR can only use valid active items.
- RFQ can only be created from approved PRs.
- RFQ vendors must exist and be active.
- Manual quotations must belong to invited vendors.
- PO can only be created from approved PRs when linked to PR.
- PO issue/cancel/close transitions are backend validated.
- GRN can only post against issued or partially received POs.
- GRN reversal is blocked if stock has already been consumed below safe rollback quantity.
- Invoice requires PO, matching vendor, and prior GRN activity.
- Invoice lines are validated against accepted not-yet-invoiced quantity.
- Payment allocations are validated against invoice balance and status.
- Master data creation now blocks common duplicates and invalid references.

## Edge Cases Covered

- One PO to multiple GRNs
- Partial receipts
- Partial invoicing
- Partial payments
- Price variance above threshold
- GRN rejection quantities
- Duplicate vendor prevention
- Inactive item blocked for new documents
- Concurrent document updates blocked through optimistic version checks
- Duplicate stock submission reduced via idempotency keys on stock ledger operations

## UI Surface Improvements

- PO Workbench shows open receipt quantity and variance badges.
- Quotations show price variance percentages.
- Invoice Matching shows open invoice quantity and mismatch warnings.
- Payments shows invoice status during allocation.

## Remaining Recommended Next Steps

- Add delete/deactivate guards for master data already used in transactions.
- Add explicit RFQ comparison matrix and split-award UI.
- Add dedicated reservation consumption/release flows for material issue posting.
- Add background retry queue for offline client write retries.
- Add automated tests for state transitions and transactional integrity.
- Add configurable approval matrix execution instead of simulation-only display.
