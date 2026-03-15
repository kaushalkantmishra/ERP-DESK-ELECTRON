import { pgTable, serial, text, varchar, timestamp, integer, decimal, boolean, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    role: varchar('role', { length: 50 }).notNull(), // Admin, Procurement, Store, Dept, Finance, Vendor
    department: varchar('department', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow(),
});

// Unit of Measure
export const uoms = pgTable('uoms', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
});

// Categories
export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
});

// Items
export const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: text('name').notNull(),
    categoryId: uuid('category_id').references(() => categories.id),
    uomId: uuid('uom_id').references(() => uoms.id),
    price: decimal('price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    active: boolean('active').default(true),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0.00'),
    reorderLevel: decimal('reorder_level', { precision: 12, scale: 2 }).default('0.00'),
});

// Vendors
export const vendors = pgTable('vendors', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 20 }),
    rating: integer('rating').default(0),
    address: text('address'),
    taxId: varchar('tax_id', { length: 50 }),
    paymentTerms: text('payment_terms'),
    contactPerson: varchar('contact_person', { length: 100 }),
    active: boolean('active').default(true),
});

// Warehouses
export const warehouses = pgTable('warehouses', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }).unique(),
    location: text('location'),
    managerId: uuid('manager_id'),
});

// Purchase Requisitions
export const purchaseRequisitions = pgTable('purchase_requisitions', {
    id: uuid('id').primaryKey().defaultRandom(),
    prNo: varchar('pr_no', { length: 50 }).notNull().unique(),
    requestorId: uuid('requestor_id').references(() => users.id),
    department: varchar('department', { length: 100 }),
    date: timestamp('date').defaultNow(),
    priority: varchar('priority', { length: 20 }).notNull(), // Low, Medium, High, Urgent
    status: varchar('status', { length: 50 }).notNull(), // Draft, Submitted, Approved, Rejected, RFQ Created, Completed
    justification: text('justification'),
});

export const prItems = pgTable('pr_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    prId: uuid('pr_id').references(() => purchaseRequisitions.id),
    itemId: uuid('item_id').references(() => items.id),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    requiredDate: timestamp('required_date'),
});

// RFQs
export const rfqs = pgTable('rfqs', {
    id: uuid('id').primaryKey().defaultRandom(),
    rfqNo: varchar('rfq_no', { length: 50 }).notNull().unique(),
    prId: uuid('pr_id').references(() => purchaseRequisitions.id),
    createdDate: timestamp('created_date').defaultNow(),
    dueDate: timestamp('due_date'),
    status: varchar('status', { length: 50 }).notNull(), // Created, Sent, Closed
});

export const rfqVendors = pgTable('rfq_vendors', {
    id: uuid('id').primaryKey().defaultRandom(),
    rfqId: uuid('rfq_id').references(() => rfqs.id),
    vendorId: uuid('vendor_id').references(() => vendors.id),
});

// Quotations
export const quotations = pgTable('quotations', {
    id: uuid('id').primaryKey().defaultRandom(),
    rfqId: uuid('rfq_id').references(() => rfqs.id),
    vendorId: uuid('vendor_id').references(() => vendors.id),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    deliveryDate: timestamp('delivery_date'),
    submittedDate: timestamp('submitted_date').defaultNow(),
    status: varchar('status', { length: 50 }).notNull(), // Pending, Accepted, Rejected
});

export const quotationItems = pgTable('quotation_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id').references(() => quotations.id),
    itemId: uuid('item_id').references(() => items.id),
    qty: decimal('qty', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
});

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    poNo: varchar('po_no', { length: 50 }).notNull().unique(),
    rfqId: uuid('rfq_id').references(() => rfqs.id),
    vendorId: uuid('vendor_id').references(() => vendors.id),
    date: timestamp('date').defaultNow(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // Sent, Acknowledged, Partially Received, Completed, Closed
    deliveryDate: timestamp('delivery_date'),
});

export const poItems = pgTable('po_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    poId: uuid('po_id').references(() => purchaseOrders.id),
    itemId: uuid('item_id').references(() => items.id),
    qty: decimal('qty', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
});

// GRNs
export const grns = pgTable('grns', {
    id: uuid('id').primaryKey().defaultRandom(),
    grnNo: varchar('grn_no', { length: 50 }).notNull().unique(),
    poId: uuid('po_id').references(() => purchaseOrders.id),
    receivedDate: timestamp('received_date').defaultNow(),
    receivedBy: varchar('received_by', { length: 100 }),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id),
    status: varchar('status', { length: 50 }).notNull(), // Pending, Quality Check, Completed
});

export const grnItems = pgTable('grn_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    grnId: uuid('grn_id').references(() => grns.id),
    itemId: uuid('item_id').references(() => items.id),
    receivedQty: decimal('received_qty', { precision: 12, scale: 2 }).notNull(),
    acceptedQty: decimal('accepted_qty', { precision: 12, scale: 2 }).notNull(),
    rejectedQty: decimal('rejected_qty', { precision: 12, scale: 2 }).notNull(),
});

// Stock Levels
export const stockLevels = pgTable('stock_levels', {
    itemId: uuid('item_id').references(() => items.id).notNull(),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull().default('0.00'),
    minStockLevel: decimal('min_stock_level', { precision: 12, scale: 2 }).default('0.00'),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.itemId, table.warehouseId] }),
    };
});

// Stock Transactions
export const stockTransactions = pgTable('stock_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id').references(() => items.id),
    type: varchar('type', { length: 50 }).notNull(), // Issue, Transfer, Adjustment, Receipt
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    date: timestamp('date').defaultNow(),
    sourceWarehouseId: uuid('source_warehouse_id').references(() => warehouses.id),
    targetWarehouseId: uuid('target_warehouse_id').references(() => warehouses.id),
    referenceId: varchar('reference_id', { length: 100 }),
    notes: text('notes'),
    performedBy: varchar('performed_by', { length: 100 }),
});

// Material Requests
export const materialRequests = pgTable('material_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    requestNo: varchar('request_no', { length: 50 }).notNull().unique(),
    requestorId: uuid('requestor_id').references(() => users.id),
    department: varchar('department', { length: 100 }),
    date: timestamp('date').defaultNow(),
    status: varchar('status', { length: 50 }).notNull(), // Requested, Approved, Issued, Rejected
});

export const materialRequestItems = pgTable('material_request_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    mrId: uuid('mr_id').references(() => materialRequests.id),
    itemId: uuid('item_id').references(() => items.id),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
});

// Invoices
export const invoices = pgTable('invoices', {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceNo: varchar('invoice_no', { length: 50 }).notNull().unique(),
    vendorId: uuid('vendor_id').references(() => vendors.id),
    poId: uuid('po_id').references(() => purchaseOrders.id),
    date: timestamp('date').defaultNow(),
    dueDate: timestamp('due_date'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // Received, Verified, Approved, Paid, Rejected
    remarks: text('remarks'),
});

// Activity Logs
export const activityLogs = pgTable('activity_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    userName: varchar('user_name', { length: 100 }),
    action: text('action').notNull(),
    description: text('description'),
    timestamp: timestamp('timestamp').defaultNow(),
    module: varchar('module', { length: 50 }), // Auth, Procurement, Inventory, Finance, System
});

// Table Relations
export const usersRelations = relations(users, ({ many }) => ({
    purchaseRequisitions: many(purchaseRequisitions),
    materialRequests: many(materialRequests),
    activityLogs: many(activityLogs),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
    category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
    uom: one(uoms, { fields: [items.uomId], references: [uoms.id] }),
    prItems: many(prItems),
    quotationItems: many(quotationItems),
    poItems: many(poItems),
    grnItems: many(grnItems),
    stockLevels: many(stockLevels),
    stockTransactions: many(stockTransactions),
}));

export const purchaseRequisitionsRelations = relations(purchaseRequisitions, ({ one, many }) => ({
    requestor: one(users, { fields: [purchaseRequisitions.requestorId], references: [users.id] }),
    items: many(prItems),
    rfq: one(rfqs, { fields: [purchaseRequisitions.id], references: [rfqs.prId] }),
}));

export const prItemsRelations = relations(prItems, ({ one }) => ({
    purchaseRequisition: one(purchaseRequisitions, { fields: [prItems.prId], references: [purchaseRequisitions.id] }),
    item: one(items, { fields: [prItems.itemId], references: [items.id] }),
}));

export const rfqsRelations = relations(rfqs, ({ one, many }) => ({
    purchaseRequisition: one(purchaseRequisitions, { fields: [rfqs.prId], references: [purchaseRequisitions.id] }),
    rfqVendors: many(rfqVendors),
    quotations: many(quotations),
}));

export const rfqVendorsRelations = relations(rfqVendors, ({ one }) => ({
    rfq: one(rfqs, { fields: [rfqVendors.rfqId], references: [rfqs.id] }),
    vendor: one(vendors, { fields: [rfqVendors.vendorId], references: [vendors.id] }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
    rfq: one(rfqs, { fields: [quotations.rfqId], references: [rfqs.id] }),
    vendor: one(vendors, { fields: [quotations.vendorId], references: [vendors.id] }),
    quotationItems: many(quotationItems),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
    quotation: one(quotations, { fields: [quotationItems.quotationId], references: [quotations.id] }),
    item: one(items, { fields: [quotationItems.itemId], references: [items.id] }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
    rfq: one(rfqs, { fields: [purchaseOrders.rfqId], references: [rfqs.id] }),
    vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
    poItems: many(poItems),
    grns: many(grns),
}));

export const poItemsRelations = relations(poItems, ({ one }) => ({
    purchaseOrder: one(purchaseOrders, { fields: [poItems.poId], references: [purchaseOrders.id] }),
    item: one(items, { fields: [poItems.itemId], references: [items.id] }),
}));

export const grnsRelations = relations(grns, ({ one, many }) => ({
    po: one(purchaseOrders, { fields: [grns.poId], references: [purchaseOrders.id] }),
    warehouse: one(warehouses, { fields: [grns.warehouseId], references: [warehouses.id] }),
    grnItems: many(grnItems),
}));

export const grnItemsRelations = relations(grnItems, ({ one }) => ({
    grn: one(grns, { fields: [grnItems.grnId], references: [grns.id] }),
    item: one(items, { fields: [grnItems.itemId], references: [items.id] }),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
    item: one(items, { fields: [stockLevels.itemId], references: [items.id] }),
    warehouse: one(warehouses, { fields: [stockLevels.warehouseId], references: [warehouses.id] }),
}));

export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
    item: one(items, { fields: [stockTransactions.itemId], references: [items.id] }),
    sourceWarehouse: one(warehouses, { fields: [stockTransactions.sourceWarehouseId], references: [warehouses.id] }),
    targetWarehouse: one(warehouses, { fields: [stockTransactions.targetWarehouseId], references: [warehouses.id] }),
}));

export const materialRequestsRelations = relations(materialRequests, ({ one, many }) => ({
    requestor: one(users, { fields: [materialRequests.requestorId], references: [users.id] }),
    materialRequestItems: many(materialRequestItems),
}));

export const materialRequestItemsRelations = relations(materialRequestItems, ({ one }) => ({
    materialRequest: one(materialRequests, { fields: [materialRequestItems.mrId], references: [materialRequests.id] }),
    item: one(items, { fields: [materialRequestItems.itemId], references: [items.id] }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
    rfqVendors: many(rfqVendors),
    quotations: many(quotations),
    purchaseOrders: many(purchaseOrders),
    invoices: many(invoices),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
    grns: many(grns),
    stockLevels: many(stockLevels),
    sourceTransactions: many(stockTransactions, { relationName: 'sourceWarehouse' }),
    targetTransactions: many(stockTransactions, { relationName: 'targetWarehouse' }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
    vendor: one(vendors, { fields: [invoices.vendorId], references: [vendors.id] }),
    po: one(purchaseOrders, { fields: [invoices.poId], references: [purchaseOrders.id] }),
}));
