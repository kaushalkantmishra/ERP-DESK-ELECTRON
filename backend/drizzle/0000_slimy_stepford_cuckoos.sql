CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_name" varchar(100),
	"action" text NOT NULL,
	"description" text,
	"timestamp" timestamp DEFAULT now(),
	"module" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "grn_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_id" uuid,
	"item_id" uuid,
	"received_qty" numeric(12, 2) NOT NULL,
	"accepted_qty" numeric(12, 2) NOT NULL,
	"rejected_qty" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_no" varchar(50) NOT NULL,
	"po_id" uuid,
	"received_date" timestamp DEFAULT now(),
	"received_by" varchar(100),
	"warehouse_id" uuid,
	"status" varchar(50) NOT NULL,
	CONSTRAINT "grns_grn_no_unique" UNIQUE("grn_no")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_no" varchar(50) NOT NULL,
	"vendor_id" uuid,
	"po_id" uuid,
	"date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(50) NOT NULL,
	"remarks" text,
	CONSTRAINT "invoices_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"uom_id" uuid,
	"price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"active" boolean DEFAULT true,
	"tax_rate" numeric(5, 2) DEFAULT '0.00',
	"reorder_level" numeric(12, 2) DEFAULT '0.00',
	CONSTRAINT "items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "material_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mr_id" uuid,
	"item_id" uuid,
	"quantity" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_no" varchar(50) NOT NULL,
	"requestor_id" uuid,
	"department" varchar(100),
	"date" timestamp DEFAULT now(),
	"status" varchar(50) NOT NULL,
	CONSTRAINT "material_requests_request_no_unique" UNIQUE("request_no")
);
--> statement-breakpoint
CREATE TABLE "po_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid,
	"item_id" uuid,
	"qty" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pr_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid,
	"item_id" uuid,
	"quantity" numeric(12, 2) NOT NULL,
	"required_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_no" varchar(50) NOT NULL,
	"rfq_id" uuid,
	"vendor_id" uuid,
	"date" timestamp DEFAULT now(),
	"total_amount" numeric(12, 2) NOT NULL,
	"status" varchar(50) NOT NULL,
	"delivery_date" timestamp,
	CONSTRAINT "purchase_orders_po_no_unique" UNIQUE("po_no")
);
--> statement-breakpoint
CREATE TABLE "purchase_requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_no" varchar(50) NOT NULL,
	"requestor_id" uuid,
	"department" varchar(100),
	"date" timestamp DEFAULT now(),
	"priority" varchar(20) NOT NULL,
	"status" varchar(50) NOT NULL,
	"justification" text,
	CONSTRAINT "purchase_requisitions_pr_no_unique" UNIQUE("pr_no")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid,
	"item_id" uuid,
	"qty" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid,
	"vendor_id" uuid,
	"total_amount" numeric(12, 2) NOT NULL,
	"delivery_date" timestamp,
	"submitted_date" timestamp DEFAULT now(),
	"status" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid,
	"vendor_id" uuid
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_no" varchar(50) NOT NULL,
	"pr_id" uuid,
	"created_date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"status" varchar(50) NOT NULL,
	CONSTRAINT "rfqs_rfq_no_unique" UNIQUE("rfq_no")
);
--> statement-breakpoint
CREATE TABLE "stock_levels" (
	"item_id" uuid,
	"warehouse_id" uuid,
	"quantity" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"min_stock_level" numeric(12, 2) DEFAULT '0.00',
	CONSTRAINT "stock_levels_item_id_warehouse_id_pk" PRIMARY KEY("item_id","warehouse_id")
);
--> statement-breakpoint
CREATE TABLE "stock_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid,
	"type" varchar(50) NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"date" timestamp DEFAULT now(),
	"source_warehouse_id" uuid,
	"target_warehouse_id" uuid,
	"reference_id" varchar(100),
	"notes" text,
	"performed_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "uoms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "uoms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"department" varchar(100),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"rating" integer DEFAULT 0,
	"address" text,
	"tax_id" varchar(50),
	"payment_terms" text,
	"contact_person" varchar(100),
	"active" boolean DEFAULT true,
	CONSTRAINT "vendors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50),
	"location" text,
	"manager_id" uuid,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grn_id_grns_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."grns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grns" ADD CONSTRAINT "grns_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grns" ADD CONSTRAINT "grns_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uoms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_mr_id_material_requests_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."material_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_requestor_id_users_id_fk" FOREIGN KEY ("requestor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_items" ADD CONSTRAINT "pr_items_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_items" ADD CONSTRAINT "pr_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requestor_id_users_id_fk" FOREIGN KEY ("requestor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_vendors" ADD CONSTRAINT "rfq_vendors_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_vendors" ADD CONSTRAINT "rfq_vendors_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_target_warehouse_id_warehouses_id_fk" FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;