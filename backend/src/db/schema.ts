import {
    boolean,
    check,
    decimal,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['Admin', 'Procurement', 'Store', 'Dept', 'Finance', 'Vendor']);
export const priorityEnum = pgEnum('priority', ['Low', 'Medium', 'High', 'Urgent']);
export const prStatusEnum = pgEnum('pr_status', ['Draft', 'Submitted', 'Approved', 'Rejected', 'PO Created', 'Closed', 'Cancelled']);
export const poStatusEnum = pgEnum('po_status', ['Draft', 'Issued', 'Partially Received', 'Fully Received', 'Closed', 'Cancelled']);
export const grnStatusEnum = pgEnum('grn_status', ['Draft', 'Posted', 'Reversed']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['Draft', 'Entered', 'Matched', 'Approved', 'Partially Paid', 'Paid', 'Disputed', 'Cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['Draft', 'Posted', 'Cancelled']);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['Receipt', 'Issue', 'Transfer', 'Adjustment+', 'Adjustment-', 'Reversal']);
export const stockReferenceTypeEnum = pgEnum('stock_reference_type', ['GRN', 'Material Request', 'Stock Transfer', 'Stock Count', 'Adjustment', 'GRN Reversal']);
export const quotationStatusEnum = pgEnum('quotation_status', ['Pending', 'Accepted', 'Rejected']);
export const rfqStatusEnum = pgEnum('rfq_status', ['Created', 'Sent', 'Closed']);
export const materialRequestStatusEnum = pgEnum('material_request_status', ['Requested', 'Approved', 'Issued', 'Rejected']);

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    role: roleEnum('role').notNull(),
    department: varchar('department', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow(),
});

export const uoms = pgTable('uoms', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
});

export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    uom: varchar('uom', { length: 20 }),
});

export const items = pgTable('items', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: text('name').notNull(),
    categoryId: integer('category_id').references(() => categories.id),
    uomId: integer('uom_id').references(() => uoms.id),
    price: decimal('price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    active: boolean('active').default(true),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0.00'),
    reorderLevel: decimal('reorder_level', { precision: 12, scale: 2 }).default('0.00'),
});

export const vendors = pgTable('vendors', {
    id: serial('id').primaryKey(),
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

export const warehouses = pgTable('warehouses', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }).unique(),
    location: text('location'),
    managerId: integer('manager_id').references(() => users.id),
});

export const systemSettings = pgTable('system_settings', {
    key: varchar('key', { length: 100 }).primaryKey(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const documentSequences = pgTable('document_sequences', {
    id: serial('id').primaryKey(),
    docType: varchar('doc_type', { length: 30 }).notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    prefix: varchar('prefix', { length: 20 }).notNull(),
    lastNumber: integer('last_number').notNull().default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    docSequenceUnique: uniqueIndex('document_sequences_doc_type_year_prefix_idx').on(table.docType, table.fiscalYear, table.prefix),
}));

export const purchaseRequisitions = pgTable('purchase_requisitions', {
    id: serial('id').primaryKey(),
    prNo: varchar('pr_no', { length: 50 }).notNull().unique(),
    requestorId: integer('requestor_id').references(() => users.id),
    department: varchar('department', { length: 100 }),
    date: timestamp('date').defaultNow(),
    priority: priorityEnum('priority').notNull(),
    status: prStatusEnum('status').notNull().default('Draft'),
    justification: text('justification'),
    submittedAt: timestamp('submitted_at'),
    approvedAt: timestamp('approved_at'),
    approvedBy: integer('approved_by').references(() => users.id),
    rejectedAt: timestamp('rejected_at'),
    rejectedBy: integer('rejected_by').references(() => users.id),
    rejectionReason: text('rejection_reason'),
    closedAt: timestamp('closed_at'),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: integer('cancelled_by').references(() => users.id),
    versionNo: integer('version_no').notNull().default(1),
    deletedAt: timestamp('deleted_at'),
    deletedBy: integer('deleted_by').references(() => users.id),
}, (table) => ({
    activePrNumberIdx: uniqueIndex('purchase_requisitions_pr_no_active_idx').on(table.prNo),
}));

export const prItems = pgTable('pr_items', {
    id: serial('id').primaryKey(),
    prId: integer('pr_id').notNull().references(() => purchaseRequisitions.id),
    itemId: integer('item_id').notNull().references(() => items.id),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    requiredDate: timestamp('required_date'),
}, (table) => ({
    quantityPositive: check('pr_items_quantity_positive_chk', sql`${table.quantity} > 0`),
}));

export const rfqs = pgTable('rfqs', {
    id: serial('id').primaryKey(),
    rfqNo: varchar('rfq_no', { length: 50 }).notNull().unique(),
    prId: integer('pr_id').references(() => purchaseRequisitions.id),
    createdDate: timestamp('created_date').defaultNow(),
    dueDate: timestamp('due_date'),
    status: rfqStatusEnum('status').notNull().default('Created'),
});

export const rfqVendors = pgTable('rfq_vendors', {
    id: serial('id').primaryKey(),
    rfqId: integer('rfq_id').notNull().references(() => rfqs.id),
    vendorId: integer('vendor_id').notNull().references(() => vendors.id),
});

export const quotations = pgTable('quotations', {
    id: serial('id').primaryKey(),
    rfqId: integer('rfq_id').notNull().references(() => rfqs.id),
    vendorId: integer('vendor_id').notNull().references(() => vendors.id),
    currency: varchar('currency', { length: 10 }).notNull().default('AED'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    deliveryDate: timestamp('delivery_date'),
    notes: text('notes'),
    submittedDate: timestamp('submitted_date').defaultNow(),
    status: quotationStatusEnum('status').notNull().default('Pending'),
    versionNo: integer('version_no').notNull().default(1),
});

export const quotationItems = pgTable('quotation_items', {
    id: serial('id').primaryKey(),
    quotationId: integer('quotation_id').notNull().references(() => quotations.id),
    itemId: integer('item_id').notNull().references(() => items.id),
    qty: decimal('qty', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    awardedQty: decimal('awarded_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    priceVariancePct: decimal('price_variance_pct', { precision: 7, scale: 2 }).notNull().default('0.00'),
}, (table) => ({
    qtyPositive: check('quotation_items_qty_positive_chk', sql`${table.qty} > 0`),
    priceNonNegative: check('quotation_items_price_non_negative_chk', sql`${table.unitPrice} >= 0`),
}));

export const purchaseOrders = pgTable('purchase_orders', {
    id: serial('id').primaryKey(),
    poNo: varchar('po_no', { length: 50 }).notNull().unique(),
    prId: integer('pr_id').references(() => purchaseRequisitions.id),
    rfqId: integer('rfq_id').references(() => rfqs.id),
    vendorId: integer('vendor_id').notNull().references(() => vendors.id),
    date: timestamp('date').defaultNow(),
    currency: varchar('currency', { length: 10 }).notNull().default('AED'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    priceVariancePct: decimal('price_variance_pct', { precision: 7, scale: 2 }).notNull().default('0.00'),
    varianceAlert: boolean('variance_alert').notNull().default(false),
    status: poStatusEnum('status').notNull().default('Draft'),
    deliveryDate: timestamp('delivery_date'),
    issuedAt: timestamp('issued_at'),
    issuedBy: integer('issued_by').references(() => users.id),
    closedAt: timestamp('closed_at'),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: integer('cancelled_by').references(() => users.id),
    versionNo: integer('version_no').notNull().default(1),
    deletedAt: timestamp('deleted_at'),
    deletedBy: integer('deleted_by').references(() => users.id),
}, (table) => ({
    poTotalNonNegative: check('purchase_orders_total_non_negative_chk', sql`${table.totalAmount} >= 0`),
}));

export const poItems = pgTable('po_items', {
    id: serial('id').primaryKey(),
    poId: integer('po_id').notNull().references(() => purchaseOrders.id),
    itemId: integer('item_id').notNull().references(() => items.id),
    orderedQty: decimal('ordered_qty', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    receivedQty: decimal('received_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    acceptedQty: decimal('accepted_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    invoicedQty: decimal('invoiced_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    paidQty: decimal('paid_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    cancelledQty: decimal('cancelled_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    priceVariancePct: decimal('price_variance_pct', { precision: 7, scale: 2 }).notNull().default('0.00'),
}, (table) => ({
    orderedQtyPositive: check('po_items_ordered_qty_positive_chk', sql`${table.orderedQty} > 0`),
    unitPriceNonNegative: check('po_items_unit_price_non_negative_chk', sql`${table.unitPrice} >= 0`),
    receivedQtyNonNegative: check('po_items_received_qty_non_negative_chk', sql`${table.receivedQty} >= 0`),
    acceptedQtyNonNegative: check('po_items_accepted_qty_non_negative_chk', sql`${table.acceptedQty} >= 0`),
    invoicedQtyNonNegative: check('po_items_invoiced_qty_non_negative_chk', sql`${table.invoicedQty} >= 0`),
    cancelledQtyNonNegative: check('po_items_cancelled_qty_non_negative_chk', sql`${table.cancelledQty} >= 0`),
}));

export const grns = pgTable('grns', {
    id: serial('id').primaryKey(),
    grnNo: varchar('grn_no', { length: 50 }).notNull().unique(),
    poId: integer('po_id').notNull().references(() => purchaseOrders.id),
    receivedDate: timestamp('received_date').defaultNow(),
    receivedBy: integer('received_by').references(() => users.id),
    warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    warnings: jsonb('warnings'),
    status: grnStatusEnum('status').notNull().default('Draft'),
    postedAt: timestamp('posted_at'),
    postedBy: integer('posted_by').references(() => users.id),
    reversedAt: timestamp('reversed_at'),
    reversedBy: integer('reversed_by').references(() => users.id),
    reversalReason: text('reversal_reason'),
    versionNo: integer('version_no').notNull().default(1),
    deletedAt: timestamp('deleted_at'),
    deletedBy: integer('deleted_by').references(() => users.id),
});

export const grnItems = pgTable('grn_items', {
    id: serial('id').primaryKey(),
    grnId: integer('grn_id').notNull().references(() => grns.id),
    poItemId: integer('po_item_id').notNull().references(() => poItems.id),
    itemId: integer('item_id').notNull().references(() => items.id),
    receivedQty: decimal('received_qty', { precision: 12, scale: 2 }).notNull(),
    acceptedQty: decimal('accepted_qty', { precision: 12, scale: 2 }).notNull(),
    rejectedQty: decimal('rejected_qty', { precision: 12, scale: 2 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    rejectionReason: text('rejection_reason'),
    disposition: varchar('disposition', { length: 30 }).default('Accepted'),
}, (table) => ({
    receivedQtyPositive: check('grn_items_received_qty_positive_chk', sql`${table.receivedQty} > 0`),
    acceptedQtyNonNegative: check('grn_items_accepted_qty_non_negative_chk', sql`${table.acceptedQty} >= 0`),
    rejectedQtyNonNegative: check('grn_items_rejected_qty_non_negative_chk', sql`${table.rejectedQty} >= 0`),
    receivedBalanceValid: check('grn_items_received_balance_chk', sql`${table.acceptedQty} + ${table.rejectedQty} <= ${table.receivedQty}`),
}));

export const stockLevels = pgTable('stock_levels', {
    itemId: integer('item_id').notNull().references(() => items.id),
    warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull().default('0.00'),
    reservedQty: decimal('reserved_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    avgCost: decimal('avg_cost', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    minStockLevel: decimal('min_stock_level', { precision: 12, scale: 2 }).default('0.00'),
    versionNo: integer('version_no').notNull().default(1),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    pk: primaryKey({ columns: [table.itemId, table.warehouseId] }),
    quantityNonNegative: check('stock_levels_quantity_non_negative_chk', sql`${table.quantity} >= 0`),
    minStockNonNegative: check('stock_levels_min_stock_non_negative_chk', sql`${table.minStockLevel} >= 0`),
}));

export const stockTransactions = pgTable('stock_transactions', {
    id: serial('id').primaryKey(),
    itemId: integer('item_id').notNull().references(() => items.id),
    warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
    type: stockMovementTypeEnum('type').notNull(),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).default('0.00'),
    date: timestamp('date').defaultNow(),
    referenceType: stockReferenceTypeEnum('reference_type').notNull(),
    referenceId: varchar('reference_id', { length: 100 }).notNull(),
    lineReferenceId: integer('line_reference_id'),
    sourceWarehouseId: integer('source_warehouse_id').references(() => warehouses.id),
    targetWarehouseId: integer('target_warehouse_id').references(() => warehouses.id),
    notes: text('notes'),
    performedBy: integer('performed_by').references(() => users.id),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull().unique(),
    reversalOfTransactionId: integer('reversal_of_transaction_id'),
}, (table) => ({
    quantityPositive: check('stock_transactions_quantity_positive_chk', sql`${table.quantity} > 0`),
}));

export const stockReservations = pgTable('stock_reservations', {
    id: serial('id').primaryKey(),
    itemId: integer('item_id').notNull().references(() => items.id),
    warehouseId: integer('warehouse_id').references(() => warehouses.id),
    sourceType: varchar('source_type', { length: 50 }).notNull(),
    sourceId: integer('source_id').notNull(),
    sourceLineId: integer('source_line_id'),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    consumedQty: decimal('consumed_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    releasedQty: decimal('released_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    status: varchar('status', { length: 30 }).notNull().default('Open'),
    createdAt: timestamp('created_at').defaultNow(),
    releasedAt: timestamp('released_at'),
}, (table) => ({
    reservationQtyPositive: check('stock_reservations_quantity_positive_chk', sql`${table.quantity} > 0`),
}));

export const materialRequests = pgTable('material_requests', {
    id: serial('id').primaryKey(),
    requestNo: varchar('request_no', { length: 50 }).notNull().unique(),
    requestorId: integer('requestor_id').references(() => users.id),
    department: varchar('department', { length: 100 }),
    date: timestamp('date').defaultNow(),
    status: materialRequestStatusEnum('status').notNull(),
    versionNo: integer('version_no').notNull().default(1),
});

export const materialRequestItems = pgTable('material_request_items', {
    id: serial('id').primaryKey(),
    mrId: integer('mr_id').notNull().references(() => materialRequests.id),
    itemId: integer('item_id').notNull().references(() => items.id),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
    quantityPositive: check('material_request_items_quantity_positive_chk', sql`${table.quantity} > 0`),
}));

export const invoices = pgTable('invoices', {
    id: serial('id').primaryKey(),
    invoiceNo: varchar('invoice_no', { length: 50 }).notNull().unique(),
    vendorInvoiceNo: varchar('vendor_invoice_no', { length: 100 }).notNull(),
    vendorId: integer('vendor_id').notNull().references(() => vendors.id),
    poId: integer('po_id').notNull().references(() => purchaseOrders.id),
    date: timestamp('date').defaultNow(),
    dueDate: timestamp('due_date'),
    currency: varchar('currency', { length: 10 }).notNull().default('AED'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    matchedAmount: decimal('matched_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    balanceAmount: decimal('balance_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    matchWarnings: jsonb('match_warnings'),
    status: invoiceStatusEnum('status').notNull().default('Draft'),
    remarks: text('remarks'),
    enteredBy: integer('entered_by').references(() => users.id),
    approvedAt: timestamp('approved_at'),
    approvedBy: integer('approved_by').references(() => users.id),
    versionNo: integer('version_no').notNull().default(1),
    deletedAt: timestamp('deleted_at'),
    deletedBy: integer('deleted_by').references(() => users.id),
}, (table) => ({
    invoiceAmountNonNegative: check('invoices_amount_non_negative_chk', sql`${table.amount} >= 0`),
    matchedAmountNonNegative: check('invoices_matched_amount_non_negative_chk', sql`${table.matchedAmount} >= 0`),
    paidAmountNonNegative: check('invoices_paid_amount_non_negative_chk', sql`${table.paidAmount} >= 0`),
    balanceAmountNonNegative: check('invoices_balance_amount_non_negative_chk', sql`${table.balanceAmount} >= 0`),
}));

export const invoiceLines = pgTable('invoice_lines', {
    id: serial('id').primaryKey(),
    invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
    poItemId: integer('po_item_id').notNull().references(() => poItems.id),
    grnItemId: integer('grn_item_id').references(() => grnItems.id),
    itemId: integer('item_id').notNull().references(() => items.id),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    lineAmount: decimal('line_amount', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
    quantityPositive: check('invoice_lines_quantity_positive_chk', sql`${table.quantity} > 0`),
    unitPriceNonNegative: check('invoice_lines_unit_price_non_negative_chk', sql`${table.unitPrice} >= 0`),
    lineAmountNonNegative: check('invoice_lines_line_amount_non_negative_chk', sql`${table.lineAmount} >= 0`),
}));

export const payments = pgTable('payments', {
    id: serial('id').primaryKey(),
    paymentNo: varchar('payment_no', { length: 50 }).notNull().unique(),
    vendorId: integer('vendor_id').notNull().references(() => vendors.id),
    paymentDate: timestamp('payment_date').defaultNow(),
    baseAmount: decimal('base_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    method: varchar('method', { length: 50 }).notNull(),
    status: paymentStatusEnum('status').notNull().default('Draft'),
    referenceNo: varchar('reference_no', { length: 100 }),
    remarks: text('remarks'),
    createdBy: integer('created_by').references(() => users.id),
    postedAt: timestamp('posted_at'),
    postedBy: integer('posted_by').references(() => users.id),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: integer('cancelled_by').references(() => users.id),
    versionNo: integer('version_no').notNull().default(1),
}, (table) => ({
    amountPositive: check('payments_amount_positive_chk', sql`${table.amount} > 0`),
}));

export const paymentAllocations = pgTable('payment_allocations', {
    id: serial('id').primaryKey(),
    paymentId: integer('payment_id').notNull().references(() => payments.id),
    invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
    allocatedAmount: decimal('allocated_amount', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
    allocatedAmountPositive: check('payment_allocations_allocated_amount_positive_chk', sql`${table.allocatedAmount} > 0`),
}));

export const activityLogs = pgTable('activity_logs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    userName: varchar('user_name', { length: 100 }),
    action: text('action').notNull(),
    description: text('description'),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: integer('entity_id'),
    beforeData: jsonb('before_data'),
    afterData: jsonb('after_data'),
    payload: jsonb('payload'),
    timestamp: timestamp('timestamp').defaultNow(),
    module: varchar('module', { length: 50 }),
});

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
    invoiceLines: many(invoiceLines),
}));

export const purchaseRequisitionsRelations = relations(purchaseRequisitions, ({ one, many }) => ({
    requestor: one(users, { fields: [purchaseRequisitions.requestorId], references: [users.id] }),
    prItems: many(prItems),
    rfq: one(rfqs, { fields: [purchaseRequisitions.id], references: [rfqs.prId] }),
    purchaseOrders: many(purchaseOrders),
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
    pr: one(purchaseRequisitions, { fields: [purchaseOrders.prId], references: [purchaseRequisitions.id] }),
    rfq: one(rfqs, { fields: [purchaseOrders.rfqId], references: [rfqs.id] }),
    vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
    poItems: many(poItems),
    grns: many(grns),
    invoices: many(invoices),
}));

export const poItemsRelations = relations(poItems, ({ one, many }) => ({
    purchaseOrder: one(purchaseOrders, { fields: [poItems.poId], references: [purchaseOrders.id] }),
    item: one(items, { fields: [poItems.itemId], references: [items.id] }),
    grnItems: many(grnItems),
    invoiceLines: many(invoiceLines),
}));

export const grnsRelations = relations(grns, ({ one, many }) => ({
    po: one(purchaseOrders, { fields: [grns.poId], references: [purchaseOrders.id] }),
    warehouse: one(warehouses, { fields: [grns.warehouseId], references: [warehouses.id] }),
    grnItems: many(grnItems),
}));

export const grnItemsRelations = relations(grnItems, ({ one }) => ({
    grn: one(grns, { fields: [grnItems.grnId], references: [grns.id] }),
    poItem: one(poItems, { fields: [grnItems.poItemId], references: [poItems.id] }),
    item: one(items, { fields: [grnItems.itemId], references: [items.id] }),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
    item: one(items, { fields: [stockLevels.itemId], references: [items.id] }),
    warehouse: one(warehouses, { fields: [stockLevels.warehouseId], references: [warehouses.id] }),
}));

export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
    item: one(items, { fields: [stockTransactions.itemId], references: [items.id] }),
    warehouse: one(warehouses, { fields: [stockTransactions.warehouseId], references: [warehouses.id] }),
    sourceWarehouse: one(warehouses, { fields: [stockTransactions.sourceWarehouseId], references: [warehouses.id] }),
    targetWarehouse: one(warehouses, { fields: [stockTransactions.targetWarehouseId], references: [warehouses.id] }),
    performedByUser: one(users, { fields: [stockTransactions.performedBy], references: [users.id] }),
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
    payments: many(payments),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
    grns: many(grns),
    stockLevels: many(stockLevels),
    stockTransactions: many(stockTransactions),
    sourceTransactions: many(stockTransactions, { relationName: 'sourceWarehouse' }),
    targetTransactions: many(stockTransactions, { relationName: 'targetWarehouse' }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    vendor: one(vendors, { fields: [invoices.vendorId], references: [vendors.id] }),
    po: one(purchaseOrders, { fields: [invoices.poId], references: [purchaseOrders.id] }),
    invoiceLines: many(invoiceLines),
    paymentAllocations: many(paymentAllocations),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
    invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
    poItem: one(poItems, { fields: [invoiceLines.poItemId], references: [poItems.id] }),
    item: one(items, { fields: [invoiceLines.itemId], references: [items.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
    vendor: one(vendors, { fields: [payments.vendorId], references: [vendors.id] }),
    paymentAllocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
    payment: one(payments, { fields: [paymentAllocations.paymentId], references: [payments.id] }),
    invoice: one(invoices, { fields: [paymentAllocations.invoiceId], references: [invoices.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
    user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));
