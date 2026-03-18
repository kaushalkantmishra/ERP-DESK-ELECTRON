CREATE TYPE "public"."grn_status" AS ENUM('Draft', 'Posted', 'Reversed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('Draft', 'Entered', 'Matched', 'Approved', 'Partially Paid', 'Paid', 'Disputed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."material_request_status" AS ENUM('Requested', 'Approved', 'Issued', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('Draft', 'Posted', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('Draft', 'Issued', 'Partially Received', 'Fully Received', 'Closed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."pr_status" AS ENUM('Draft', 'Submitted', 'Approved', 'Rejected', 'PO Created', 'Closed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('Low', 'Medium', 'High', 'Urgent');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('Pending', 'Accepted', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('Created', 'Sent', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Admin', 'Procurement', 'Store', 'Dept', 'Finance', 'Vendor');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('Receipt', 'Issue', 'Transfer', 'Adjustment+', 'Adjustment-', 'Reversal');--> statement-breakpoint
CREATE TYPE "public"."stock_reference_type" AS ENUM('GRN', 'Material Request', 'Stock Transfer', 'Stock Count', 'Adjustment', 'GRN Reversal');--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"po_item_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_amount" numeric(12, 2) NOT NULL,
	CONSTRAINT "invoice_lines_quantity_positive_chk" CHECK ("invoice_lines"."quantity" > 0),
	CONSTRAINT "invoice_lines_unit_price_non_negative_chk" CHECK ("invoice_lines"."unit_price" >= 0),
	CONSTRAINT "invoice_lines_line_amount_non_negative_chk" CHECK ("invoice_lines"."line_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"allocated_amount" numeric(12, 2) NOT NULL,
	CONSTRAINT "payment_allocations_allocated_amount_positive_chk" CHECK ("payment_allocations"."allocated_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_no" varchar(50) NOT NULL,
	"vendor_id" uuid NOT NULL,
	"payment_date" timestamp DEFAULT now(),
	"amount" numeric(12, 2) NOT NULL,
	"method" varchar(50) NOT NULL,
	"status" "payment_status" DEFAULT 'Draft' NOT NULL,
	"reference_no" varchar(100),
	"remarks" text,
	"created_by" uuid,
	"posted_at" timestamp,
	"posted_by" uuid,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	CONSTRAINT "payments_payment_no_unique" UNIQUE("payment_no"),
	CONSTRAINT "payments_amount_positive_chk" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "grn_items" ALTER COLUMN "grn_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "grn_items" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "po_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "received_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "warehouse_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "status" SET DEFAULT 'Draft'::"public"."grn_status";--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "status" SET DATA TYPE "public"."grn_status" USING "status"::"public"."grn_status";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "vendor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "po_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'Draft'::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE "public"."invoice_status" USING "status"::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "material_request_items" ALTER COLUMN "mr_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "material_request_items" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "material_requests" ALTER COLUMN "status" SET DATA TYPE "public"."material_request_status" USING "status"::"public"."material_request_status";--> statement-breakpoint
ALTER TABLE "po_items" ALTER COLUMN "po_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pr_items" ALTER COLUMN "pr_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pr_items" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "vendor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'Draft'::"public"."po_status";--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DATA TYPE "public"."po_status" USING "status"::"public"."po_status";--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ALTER COLUMN "priority" SET DATA TYPE "public"."priority" USING "priority"::"public"."priority";--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ALTER COLUMN "status" SET DEFAULT 'Draft'::"public"."pr_status";--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ALTER COLUMN "status" SET DATA TYPE "public"."pr_status" USING "status"::"public"."pr_status";--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "quotation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "rfq_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "vendor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "status" SET DEFAULT 'Pending'::"public"."quotation_status";--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "status" SET DATA TYPE "public"."quotation_status" USING "status"::"public"."quotation_status";--> statement-breakpoint
ALTER TABLE "rfq_vendors" ALTER COLUMN "rfq_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rfq_vendors" ALTER COLUMN "vendor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ALTER COLUMN "status" SET DEFAULT 'Created'::"public"."rfq_status";--> statement-breakpoint
ALTER TABLE "rfqs" ALTER COLUMN "status" SET DATA TYPE "public"."rfq_status" USING "status"::"public"."rfq_status";--> statement-breakpoint
ALTER TABLE "stock_levels" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_levels" ALTER COLUMN "warehouse_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transactions" ALTER COLUMN "item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transactions" ALTER COLUMN "type" SET DATA TYPE "public"."stock_movement_type" USING "type"::"public"."stock_movement_type";--> statement-breakpoint
ALTER TABLE "stock_transactions" ALTER COLUMN "reference_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transactions" ALTER COLUMN "performed_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "entity_type" varchar(50);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "entity_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "po_item_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "disposition" varchar(30) DEFAULT 'Accepted';--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "posted_by" uuid;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "reversed_at" timestamp;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "reversed_by" uuid;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "reversal_reason" text;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vendor_invoice_no" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "matched_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "balance_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "entered_by" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "ordered_qty" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "received_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "accepted_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "invoiced_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "cancelled_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "pr_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "issued_by" uuid;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD COLUMN "warehouse_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD COLUMN "unit_cost" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD COLUMN "reference_type" "stock_reference_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD COLUMN "line_reference_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD COLUMN "idempotency_key" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD COLUMN "reversal_of_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_po_item_id_po_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_po_item_id_po_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."po_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grns" ADD CONSTRAINT "grns_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grns" ADD CONSTRAINT "grns_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grns" ADD CONSTRAINT "grns_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grns" ADD CONSTRAINT "grns_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_requisitions_pr_no_active_idx" ON "purchase_requisitions" USING btree ("pr_no");--> statement-breakpoint
ALTER TABLE "po_items" DROP COLUMN "qty";--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_received_qty_positive_chk" CHECK ("grn_items"."received_qty" > 0);--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_accepted_qty_non_negative_chk" CHECK ("grn_items"."accepted_qty" >= 0);--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_rejected_qty_non_negative_chk" CHECK ("grn_items"."rejected_qty" >= 0);--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_received_balance_chk" CHECK ("grn_items"."accepted_qty" + "grn_items"."rejected_qty" <= "grn_items"."received_qty");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amount_non_negative_chk" CHECK ("invoices"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_matched_amount_non_negative_chk" CHECK ("invoices"."matched_amount" >= 0);--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_amount_non_negative_chk" CHECK ("invoices"."paid_amount" >= 0);--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_balance_amount_non_negative_chk" CHECK ("invoices"."balance_amount" >= 0);--> statement-breakpoint
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_quantity_positive_chk" CHECK ("material_request_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_ordered_qty_positive_chk" CHECK ("po_items"."ordered_qty" > 0);--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_unit_price_non_negative_chk" CHECK ("po_items"."unit_price" >= 0);--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_received_qty_non_negative_chk" CHECK ("po_items"."received_qty" >= 0);--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_accepted_qty_non_negative_chk" CHECK ("po_items"."accepted_qty" >= 0);--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_invoiced_qty_non_negative_chk" CHECK ("po_items"."invoiced_qty" >= 0);--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_cancelled_qty_non_negative_chk" CHECK ("po_items"."cancelled_qty" >= 0);--> statement-breakpoint
ALTER TABLE "pr_items" ADD CONSTRAINT "pr_items_quantity_positive_chk" CHECK ("pr_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_total_non_negative_chk" CHECK ("purchase_orders"."total_amount" >= 0);--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_qty_positive_chk" CHECK ("quotation_items"."qty" > 0);--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_price_non_negative_chk" CHECK ("quotation_items"."unit_price" >= 0);--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_quantity_non_negative_chk" CHECK ("stock_levels"."quantity" >= 0);--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_min_stock_non_negative_chk" CHECK ("stock_levels"."min_stock_level" >= 0);--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_quantity_positive_chk" CHECK ("stock_transactions"."quantity" > 0);