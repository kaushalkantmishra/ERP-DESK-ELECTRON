# ERP Desk Electron UI User Guide

This guide explains how to use the product step by step based on the current UI screens in the application.

## 1. What this product does

This ERP application is built around these modules:

- Master Data
- Procurement
- Inventory
- Finance
- Reports
- Audit Logs
- Settings

The normal business flow in the UI is:

1. Create master data
2. Create Purchase Requisition
3. Approve PR
4. Create RFQ
5. Compare Quotations
6. Create and Issue Purchase Order
7. Post Goods Receipt
8. Enter Vendor Invoice
9. Approve Invoice
10. Post Payment

## 2. Login screen

When the app opens, you land on the profile selection login screen.

### How to use

1. Open the app.
2. On the right side, find the `Available Accounts` panel.
3. Click the user profile you want to enter with.
4. The app logs you in and opens the workspace.

### Roles visible in the UI

- Admin
- Procurement
- Store
- Dept
- Finance

Different roles see different menu items in the left sidebar.

### Seeded/demo accounts

The UI is designed for seeded demo users. In the backend seed, the default password is `admin123`.

## 3. Main workspace layout

After login, the screen is divided into these parts:

- Top bar: title bar
- Left side: module navigation sidebar
- Top center: tab bar for opened screens
- Main area: page content

### How navigation works

1. Use the left sidebar to open a module.
2. Each opened page appears as a tab at the top.
3. Click a tab to switch screens.
4. Close tabs when not needed.
5. Use the sidebar collapse button if you want more working space.

## 4. Recommended first-time setup

Before daily transactions, set up the following screens in this order.

### 4.1 UoM Master

Menu: `Master Data > UoM Master`

Use this to create measurement units like PCS, KG, BOX, LTR.

Steps:

1. Open `Unit of Measure`.
2. Click `Add Unit`.
3. Enter `Unit Code`.
4. Enter `Unit Name`.
5. Click `Save Unit`.

### 4.2 Category Master

Menu: `Master Data > Category Master`

Use this to create item groups.

Steps:

1. Open `Categories`.
2. Click `Add Category`.
3. Enter `Category Name`.
4. Add `Description`.
5. Select `Default UOM`.
6. Click `Save Category`.

### 4.3 Item Master

Menu: `Master Data > Item Master`

Use this to create products or materials used in PR, PO, stock, and invoices.

Steps:

1. Open `Item Master`.
2. Click `Add Item`.
3. Fill in `Item Code`.
4. Fill in `Item Name`.
5. Select `Category`.
6. Select `UOM`.
7. Enter `Standard Price`.
8. Enter `Tax Rate`.
9. Enter `Reorder Level`.
10. Keep `Active Configuration` checked if usable.
11. Click `Save Item`.

### 4.4 Vendor Master

Menu: `Master Data > Vendor Master`

Use this to create supplier records.

Steps:

1. Open `Vendor Master`.
2. Click `Add Vendor`.
3. Enter company name, email, phone, and address.
4. Optionally fill tax ID, contact person, and payment terms.
5. Set rating.
6. Keep the vendor active.
7. Click `Save Vendor`.

### 4.5 Warehouse Master

Menu: `Master Data > Warehouse Master`

Use this to create storage locations.

Steps:

1. Open `Warehouse Master`.
2. Click `Add Warehouse`.
3. Enter warehouse code.
4. Enter warehouse name.
5. Enter location.
6. Optionally enter manager ID.
7. Click `Save Warehouse`.

### 4.6 Approval Matrix

Menu: `Master Data > Approval Matrix`

This screen currently acts as a simulated approval-rule reference. It shows approval rules, but the UI indicates the module is in `SIMULATION_MODE`.

## 5. Dashboard

Menu: `Dashboard`

This is the summary screen after login.

### What you can see

- Pending PR approvals
- POs awaiting receipt
- Invoices to settle
- Low stock alerts
- Recent documents
- Top inventory value
- Quick buttons for `New PR`, `PO Workbench`, and `Payments`

### How to use

1. Check pending counts.
2. Use quick action buttons to jump into urgent work.
3. Review recent documents and attention items.

## 6. Procurement flow

## 6.1 Purchase Requisition

Menu: `Procurement > Purchase Requisition`

This is the first transaction screen in the purchasing process.

### To create a new PR

1. Open `Purchase Requisition`.
2. Click `New PR`.
3. Enter `Department`.
4. Review `Requested By`.
5. Select `Priority`.
6. Set `Overall Required Date`.
7. Enter `Business Justification`.
8. In `Requested Items`, click `Add Line`.
9. Select item, quantity, and required date for each line.
10. Click `Save Draft` if not ready.
11. Click `Submit For Approval` when ready.

### To review an existing PR

1. Open the PR list.
2. Click any row to open the PR.
3. Review status, lines, and rejection reason if present.

### PR status behavior in UI

- `Draft`: saved but not sent
- `Submitted`: waiting for approval
- `Approved`: can move forward
- `Rejected`: can be corrected and resubmitted
- `PO Created`: already used for PO creation
- `Closed` or `Cancelled`: finished

### To approve or reject a PR

1. Open a PR with status `Submitted`.
2. Click `Approve` to continue the workflow.
3. Click `Reject` if not acceptable.
4. If rejected, enter a rejection reason.

### To resubmit a rejected PR

1. Open the rejected PR.
2. Review the rejection reason.
3. Click `Resubmit`.

## 6.2 RFQ Management

Menu: `Procurement > RFQ`

Use this screen to convert approved PRs into RFQs sent to vendors.

### How to use

1. Open `RFQ Management`.
2. Review pending requisitions.
3. If a PR is still `Submitted`, use the quick `Approve` button if needed.
4. Select the checkbox for approved PRs.
5. Click `Create RFQ`.
6. In the vendor modal, select one or more vendors.
7. Click `Send RFQs`.

### Important UI rule

Only approved PRs can be selected for RFQ creation.

## 6.3 Quotations

Menu: `Procurement > Quotations`

Use this screen to compare vendor responses and convert a quote into a PO.

### How to use

1. Open `Quotations`.
2. Select an RFQ from the left panel.
3. Compare vendor cards by:
   - total amount
   - delivery date
   - vendor rating
   - line prices
4. Click `Create PO` on the chosen quotation.

### Result

The system creates a Purchase Order from that quotation and marks the selected quote as accepted.

## 6.4 PO Workbench

Menu: `Procurement > PO Workbench`

Use this screen to create draft POs from approved PRs, or issue draft POs.

### To create a draft PO manually

1. Open `PO Workbench`.
2. Click `Create PO`.
3. Select an approved PR.
4. Select a vendor.
5. Set expected delivery date.
6. Review suggested prices for each line.
7. Update line prices if needed.
8. Click `Create Draft PO`.

### To issue a PO

1. Find the PO in the list.
2. If status is `Draft`, click `Issue`.

### PO status behavior in UI

- `Draft`: created but not released
- `Issued`: ready for receipt
- `Partially Received`: some items received
- `Fully Received` or `Closed`: receipt complete

## 7. Inventory flow

## 7.1 Goods Receipt

Menu: `Inventory > Goods Receipt`

Use this screen to receive material against issued POs.

### How to post GRN

1. Open `Goods Receipt`.
2. Select an issued PO from the left panel.
3. Choose the warehouse.
4. For each line, enter:
   - accepted quantity
   - rejected quantity
   - rejection reason if rejected
5. Check the status column for warnings.
6. Click `Post GRN`.

### Important UI rule

Only accepted quantity adds to stock. Rejected quantity does not increase inventory.

## 7.2 Stock Management

Menu: `Inventory > Stock Management`

Use this to view stock by item and warehouse and to make manual adjustments.

### How to use

1. Open `Stock Management`.
2. Search by item or filter by warehouse.
3. Review current quantity and reorder level.
4. If correction is needed, click `Adjust`.
5. Enter plus or minus quantity.
6. Enter reason.
7. Click `Confirm`.

### Notes

- Negative adjustment reduces stock.
- Positive adjustment increases stock.
- Low stock lines are visually highlighted.

## 7.3 Stock Transfer

Menu: `Inventory > Stock Transfer`

Use this to move stock between warehouses.

### How to use

1. Open `Stock Transfer`.
2. Select `Source Warehouse`.
3. Select `Target Warehouse`.
4. Select `Item`.
5. Enter `Quantity`.
6. Add notes if needed.
7. Click `Execute Transfer`.

### Important UI rules

- Source and target warehouse cannot be the same.
- Source warehouse must have enough stock.

## 7.4 Material Issue

Menu: `Inventory > Material Issue`

Use this screen to request and issue items from stock to a department.

### To create a material request

1. Open `Material Issue`.
2. Click `New Request`.
3. Enter or confirm department.
4. Add one or more items and quantities.
5. Click `Submit Request`.

### To issue stock against a request

1. Select the warehouse at the top.
2. Find a request with status `Requested`.
3. Click `Issue from Stock`.

### Current limitation shown in UI

The screen alerts that stock issue is posted, but the material request status update endpoint is still pending in backend.

## 8. Finance flow

## 8.1 Vendor Invoices

Menu: `Finance > Vendor Invoices`

Use this for invoice entry and matching after goods are received.

### Which POs can be invoiced

The screen allows invoice entry for POs in these statuses:

- `Partially Received`
- `Fully Received`
- `Closed`

### How to enter an invoice

1. Open `Vendor Invoices`.
2. Click `Enter Invoice`.
3. Select the PO.
4. Enter `Vendor Invoice No`.
5. Enter invoice date.
6. Enter due date.
7. Review invoice lines generated from accepted but not yet invoiced quantities.
8. Adjust invoice quantity or unit price if needed.
9. Add remarks.
10. Click `Save Matched Invoice`.

### To approve a matched invoice

1. Find an invoice with status `Matched`.
2. Click `Approve`.

## 8.2 Payments

Menu: `Finance > Payments`

Use this to post vendor payments against approved invoices.

### Which invoices can be paid

The screen shows invoices in these statuses:

- `Approved`
- `Partially Paid`

### How to post payment

1. Open `Payments`.
2. Click `Post Payment`.
3. Select a vendor.
4. Enter payment date.
5. Select method.
6. Enter reference number if available.
7. Review all open invoices for that vendor.
8. Adjust allocated amount for each invoice.
9. Add remarks if needed.
10. Click `Post Payment`.

## 9. Reports

Menu: `Reports`

Use this screen for management visibility.

### What you can see

- Inventory value
- Total paid spend
- Pending PR count
- Open PO count
- Vendor spend and performance
- Top inventory value items
- Critical low stock items
- PR status distribution
- Recent stock movement

### How to use

1. Open `Reports`.
2. Review the summary cards first.
3. Check low stock and open procurement workload.
4. Use vendor and inventory tables for decision making.

## 10. Audit Logs

Menu: `Audit Logs`

Use this screen to check user actions and system history.

### How to use

1. Open `Audit Logs`.
2. Search by user, action, or description.
3. Filter by module:
   - Auth
   - Procurement
   - Inventory
   - Finance
   - System
4. Review timestamp, user, action, and description.

This is useful for tracking who logged in, who approved records, and what actions happened in each module.

## 11. Settings

Menu: `Settings`

Use this screen for UI preferences.

### Available options in current UI

- Light theme
- Dark theme
- Warm theme
- Auto-save toggle

### How to use

1. Open `Settings`.
2. Choose the theme card you want.
3. Turn auto-save on or off as needed.

## 12. Role-wise usage summary

### Admin

- Full access
- Can review setup, procurement, inventory, finance, reports, and audit logs
- Can use approval-related screens

### Dept user

- Create Purchase Requisitions
- Create Material Requests
- View limited inventory-related functions

### Procurement user

- Review PRs
- Approve PRs in workflow screens
- Create RFQs
- Compare quotations
- Create and issue POs
- Maintain vendors and some master data

### Store user

- Maintain item and warehouse related masters
- Post GRN
- Manage stock
- Transfer stock
- Issue materials

### Finance user

- Enter and approve invoices
- Post payments
- Review financial workload

## 13. Best practice order for using the product

If you want to use the product correctly from start to finish, follow this order:

1. Login as Admin
2. Create UoM, Categories, Items, Vendors, and Warehouses
3. Login as Dept or Procurement user
4. Create Purchase Requisition
5. Approve the PR
6. Create RFQ for approved PR
7. Review quotations
8. Create PO
9. Issue PO
10. Login as Store user
11. Post Goods Receipt
12. Check stock in Stock Management
13. Login as Finance user
14. Enter Vendor Invoice
15. Approve Invoice
16. Post Payment
17. Review Reports and Audit Logs

## 14. Important current observations from the UI

- The app is tab-based, so multiple screens can remain open together.
- Access is role-based, so menu visibility changes by logged-in user.
- Approval Matrix is currently simulated.
- Material Issue shows a backend limitation message for request status update.
- The product is designed as a demo-ready ERP flow with seeded users and transactional screens.

## 15. Short quick-start

If you only want the fastest way to test the product:

1. Login as Admin.
2. Review master data screens.
3. Go to `Purchase Requisition` and create a PR.
4. Approve it.
5. Go to `RFQ` and create RFQ.
6. Go to `Quotations` and create PO.
7. Go to `PO Workbench` and issue PO if still draft.
8. Go to `Goods Receipt` and post GRN.
9. Go to `Vendor Invoices` and enter invoice.
10. Approve invoice.
11. Go to `Payments` and post payment.

