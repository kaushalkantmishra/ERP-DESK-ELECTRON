CREATE TABLE "document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" varchar(30) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"source_type" varchar(50) NOT NULL,
	"source_id" uuid NOT NULL,
	"source_line_id" uuid,
	"quantity" numeric(12, 2) NOT NULL,
	"consumed_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"released_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(30) DEFAULT 'Open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"released_at" timestamp,
	CONSTRAINT "stock_reservations_quantity_positive_chk" CHECK ("stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "before_data" jsonb;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "after_data" jsonb;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "unit_cost" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grn_items" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "warnings" jsonb;--> statement-breakpoint
ALTER TABLE "grns" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "grn_item_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "currency" varchar(10) DEFAULT 'AED' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "match_warnings" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "material_requests" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "paid_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "po_items" ADD COLUMN "price_variance_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "currency" varchar(10) DEFAULT 'AED' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "price_variance_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "variance_alert" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "awarded_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "price_variance_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "currency" varchar(10) DEFAULT 'AED' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "version_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD COLUMN "reserved_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD COLUMN "avg_cost" numeric(12, 4) DEFAULT '0.0000' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_sequences_doc_type_year_prefix_idx" ON "document_sequences" USING btree ("doc_type","fiscal_year","prefix");--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_grn_item_id_grn_items_id_fk" FOREIGN KEY ("grn_item_id") REFERENCES "public"."grn_items"("id") ON DELETE no action ON UPDATE no action;