export type Role = 'Admin' | 'Procurement' | 'Store' | 'Dept' | 'Finance' | 'Vendor';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: Role;
    department?: string;
}

export interface Uom {
    id: string;
    code: string;
    name: string;
}

export interface Item {
    id: string;
    code: string;
    name: string;
    category: string;
    uom: string;
    price: number;
    active: boolean;
    taxRate?: number;
    reorderLevel?: number;
}

export interface Vendor {
    id: string;
    name: string;
    email: string;
    phone: string;
    rating: number;
    address: string;
    taxId?: string;
    paymentTerms?: string;
    contactPerson?: string;
    active: boolean;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    uom?: string;
}

export interface Warehouse {
    id: string;
    name: string;
    code?: string;
    location: string;
    managerId?: string;
}

export interface StockLevel {
    itemId: string;
    warehouseId: string;
    quantity: number;
    reservedQty?: number;
    availableQty?: number;
    avgCost?: number;
    minStockLevel: number;
    versionNo?: number;
    item?: Item;
    warehouse?: Warehouse;
}

export type StockMovementType = 'Issue' | 'Transfer' | 'Adjustment+' | 'Adjustment-' | 'Receipt' | 'Reversal';
export type StockReferenceType = 'GRN' | 'Material Request' | 'Stock Transfer' | 'Stock Count' | 'Adjustment' | 'GRN Reversal';

export interface StockTransaction {
    id: string;
    itemId: string;
    warehouseId: string;
    type: StockMovementType;
    quantity: number;
    date: string;
    referenceType: StockReferenceType;
    referenceId: string;
    sourceWarehouseId?: string;
    targetWarehouseId?: string;
    notes?: string;
    performedBy?: string;
    item?: Item;
    warehouse?: Warehouse;
    sourceWarehouse?: Warehouse;
    targetWarehouse?: Warehouse;
}

export interface MaterialRequestLine {
    itemId: string;
    quantity: number;
    item?: Item;
}

export interface MaterialRequest {
    id: string;
    requestNo: string;
    requestorId: string;
    department: string;
    date: string;
    status: 'Requested' | 'Approved' | 'Issued' | 'Rejected';
    items: MaterialRequestLine[];
    requestor?: User;
    materialRequestItems?: MaterialRequestLine[];
}

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PRStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'PO Created' | 'Closed' | 'Cancelled';

export interface PRItem {
    id?: string;
    prId?: string;
    itemId: string;
    quantity: number;
    requiredDate: string;
    sourcedQty?: number;
    openQty?: number;
    item?: Item;
}

export interface PurchaseRequisition {
    id: string;
    prNo: string;
    requestorId: string;
    department: string;
    date: string;
    priority: Priority;
    status: PRStatus;
    justification: string;
    submittedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    requestor?: User;
    prItems?: PRItem[];
}

export type RFQStatus = 'Created' | 'Sent' | 'Closed';

export interface RFQ {
    id: string;
    rfqNo: string;
    prId: string;
    createdDate: string;
    dueDate: string;
    status: RFQStatus;
    vendorIds?: string[];
    purchaseRequisition?: PurchaseRequisition;
    rfqVendors?: { id?: string; vendorId: string; vendor?: Vendor }[];
    quotations?: Quotation[];
    emailSummary?: {
        invitedCount: number;
        sentCount: number;
        failedCount: number;
        failed: { vendorId: string | number; vendorName: string; reason?: string; sent: boolean; skipped: boolean }[];
    };
}

export interface QuotationLine {
    itemId: string;
    qty: number;
    unitPrice: number;
    taxRate?: number;
    baseAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    priceVariancePct?: number;
    item?: Item;
}

export interface Quotation {
    id: string;
    rfqId: string;
    vendorId: string;
    totalAmount: number;
    baseAmount?: number;
    taxAmount?: number;
    deliveryDate: string;
    submittedDate: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    notes?: string;
    quotationItems?: QuotationLine[];
    vendor?: Vendor;
    rfq?: RFQ;
}

export type POStatus = 'Draft' | 'Issued' | 'Partially Received' | 'Fully Received' | 'Closed' | 'Cancelled';

export interface PurchaseOrderLine {
    id: string;
    poId?: string;
    itemId: string;
    orderedQty: number;
    unitPrice: number;
    taxRate?: number;
    baseAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    receivedQty: number;
    acceptedQty: number;
    invoicedQty: number;
    paidQty?: number;
    cancelledQty: number;
    priceVariancePct?: number;
    openReceiptQty?: number;
    openInvoiceQty?: number;
    openPaymentQty?: number;
    item?: Item;
}

export interface PurchaseOrder {
    id: string;
    poNo: string;
    prId?: string;
    rfqId?: string;
    vendorId: string;
    date: string;
    totalAmount: number;
    baseAmount?: number;
    taxAmount?: number;
    currency?: string;
    priceVariancePct?: number;
    varianceAlert?: boolean;
    status: POStatus;
    deliveryDate: string;
    poItems: PurchaseOrderLine[];
    vendor?: Vendor;
    pr?: PurchaseRequisition;
    grns?: GRN[];
    invoices?: Invoice[];
}

export type GRNStatus = 'Draft' | 'Posted' | 'Reversed';

export interface GRNLine {
    id?: string;
    poItemId: string;
    itemId: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    unitCost?: number;
    baseAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    rejectionReason?: string;
    disposition?: string;
    item?: Item;
    poItem?: PurchaseOrderLine;
}

export interface GRN {
    id: string;
    grnNo: string;
    poId: string;
    receivedDate: string;
    receivedBy: string;
    warehouseId: string;
    baseAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    warnings?: string[];
    status: GRNStatus;
    grnItems?: GRNLine[];
    po?: PurchaseOrder;
    warehouse?: Warehouse;
}

export type InvoiceStatus = 'Draft' | 'Entered' | 'Matched' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disputed' | 'Cancelled';

export interface InvoiceLine {
    id?: string;
    invoiceId?: string;
    poItemId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    baseAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    lineAmount: number;
    item?: Item;
    poItem?: PurchaseOrderLine;
}

export interface Invoice {
    id: string;
    invoiceNo: string;
    vendorInvoiceNo: string;
    vendorId: string;
    poId: string;
    date: string;
    dueDate: string;
    currency?: string;
    baseAmount?: number;
    taxAmount?: number;
    amount: number;
    matchedAmount: number;
    paidAmount: number;
    balanceAmount: number;
    matchWarnings?: string[];
    status: InvoiceStatus;
    remarks?: string;
    vendor?: Vendor;
    po?: PurchaseOrder;
    invoiceLines?: InvoiceLine[];
}

export type PaymentStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface PaymentAllocation {
    id?: string;
    paymentId?: string;
    invoiceId: string;
    allocatedAmount: number;
    invoice?: Invoice;
}

export interface Payment {
    id: string;
    paymentNo: string;
    vendorId: string;
    paymentDate: string;
    baseAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    amount: number;
    method: string;
    status: PaymentStatus;
    referenceNo?: string;
    remarks?: string;
    vendor?: Vendor;
    paymentAllocations?: PaymentAllocation[];
}

export interface ActivityLog {
    id: string;
    userId?: string | number;
    userName: string;
    action: string;
    description: string;
    entityType?: string;
    entityId?: string | number;
    payload?: unknown;
    timestamp: string;
    module: 'Auth' | 'Procurement' | 'Inventory' | 'Finance' | 'System';
}

export interface ApprovalMatrixRule {
    id: string;
    role: string;
    document: string;
    minAmount: number;
    maxAmount: number;
    approvers: number;
    active: boolean;
}

export interface ApprovalMatrixConfig {
    simulationMode: boolean;
    adminBypass: boolean;
    rules: ApprovalMatrixRule[];
}
