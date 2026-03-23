ALTER TABLE "activity_logs" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "document_sequences" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "document_sequences" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "grn_items" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "grn_items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "grns" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "material_request_items" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "material_request_items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "material_requests" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "material_requests" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "payment_allocations" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "payment_allocations" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "po_items" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "po_items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "pr_items" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "pr_items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "rfq_vendors" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "rfq_vendors" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "rfqs" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "rfqs" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "stock_reservations" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "stock_reservations" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "stock_transactions" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "stock_transactions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "uoms" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "uoms" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "warehouses" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "warehouses" ALTER COLUMN "id" DROP IDENTITY;