CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" varchar(30) NOT NULL,
	"fiscal_year" integer NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_sequences_doc_type_year_prefix_idx"
ON "document_sequences" ("doc_type", "fiscal_year", "prefix");

CREATE TABLE IF NOT EXISTS "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL REFERENCES "items"("id"),
	"warehouse_id" uuid REFERENCES "warehouses"("id"),
	"source_type" varchar(50) NOT NULL,
	"source_id" uuid NOT NULL,
	"source_line_id" uuid,
	"quantity" numeric(12, 2) NOT NULL,
	"consumed_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"released_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(30) DEFAULT 'Open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"released_at" timestamp,
	CONSTRAINT "stock_reservations_quantity_positive_chk" CHECK ("quantity" > 0)
);

ALTER TABLE "quotations"
	ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'AED' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "notes" text,
	ADD COLUMN IF NOT EXISTS "version_no" integer DEFAULT 1 NOT NULL;

ALTER TABLE "quotation_items"
	ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "awarded_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "price_variance_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL;

ALTER TABLE "purchase_orders"
	ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'AED' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "price_variance_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "variance_alert" boolean DEFAULT false NOT NULL;

ALTER TABLE "po_items"
	ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "paid_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "price_variance_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL;

ALTER TABLE "grns"
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "warnings" jsonb,
	ADD COLUMN IF NOT EXISTS "version_no" integer DEFAULT 1 NOT NULL;

ALTER TABLE "grn_items"
	ADD COLUMN IF NOT EXISTS "unit_cost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;

ALTER TABLE "stock_levels"
	ADD COLUMN IF NOT EXISTS "reserved_qty" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "avg_cost" numeric(12, 4) DEFAULT '0.0000' NOT NULL;

ALTER TABLE "material_requests"
	ADD COLUMN IF NOT EXISTS "version_no" integer DEFAULT 1 NOT NULL;

ALTER TABLE "invoices"
	ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'AED' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "match_warnings" jsonb,
	ADD COLUMN IF NOT EXISTS "version_no" integer DEFAULT 1 NOT NULL;

ALTER TABLE "invoice_lines"
	ADD COLUMN IF NOT EXISTS "grn_item_id" uuid REFERENCES "grn_items"("id"),
	ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL;

ALTER TABLE "payments"
	ADD COLUMN IF NOT EXISTS "base_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "total_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	ADD COLUMN IF NOT EXISTS "version_no" integer DEFAULT 1 NOT NULL;

ALTER TABLE "activity_logs"
	ADD COLUMN IF NOT EXISTS "before_data" jsonb,
	ADD COLUMN IF NOT EXISTS "after_data" jsonb;

INSERT INTO "system_settings" ("key", "value")
VALUES (
	'erp.procurement_inventory',
	'{
		"qtyTolerancePct": 5,
		"priceVariancePct": 5,
		"allowNegativeStock": false,
		"warnOnlyOnTolerance": false,
		"fiscalYearStartMonth": 1,
		"documentPrefixes": {
			"PR": "PR",
			"RFQ": "RFQ",
			"QT": "QT",
			"PO": "PO",
			"GRN": "GRN",
			"INV": "INV",
			"PAY": "PAY",
			"MR": "MR"
		}
	}'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
