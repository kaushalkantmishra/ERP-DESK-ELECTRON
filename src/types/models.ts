// User Roles & Auth
export type Role = 'Admin' | 'Procurement' | 'Store' | 'Dept' | 'Finance' | 'Vendor';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // For mock login
    role: Role;
    department?: string;
}

// Master Data
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
    price: number; // Standard/Last Purchase Price
    active: boolean;
    taxRate?: number;
    reorderLevel?: number;
}

export interface Vendor {
    id: string;
    name: string;
    email: string;
    phone: string;
    rating: number; // 1-5
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
    uom?: string; // e.g. PCS, KG, L
}

export interface Warehouse {
    id: string;
    name: string;
    code?: string;
    location: string;
    managerId?: string;
}

// Inventory Operations
export interface StockLevel {
    itemId: string;
    warehouseId: string;
    quantity: number;
    minStockLevel: number; // Reorder point
}

export type StockMovementType = 'Issue' | 'Transfer' | 'Adjustment' | 'Receipt';

export interface StockTransaction {
    id: string;
    itemId: string;
    type: StockMovementType;
    quantity: number;
    date: string;
    sourceWarehouseId?: string; // For Transfer/Issue
    targetWarehouseId?: string; // For Transfer/Receipt
    referenceId?: string; // PO URL, GRN ID, or Dept Request ID
    notes?: string;
    performedBy: string;
}

export interface MaterialRequest {
    id: string;
    requestNo: string;
    requestorId: string;
    department: string;
    date: string;
    items: { itemId: string; quantity: number }[];
    status: 'Requested' | 'Approved' | 'Issued' | 'Rejected';
}

// Procurement Flow
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PRStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'RFQ Created' | 'Completed';

export interface PRItem {
    itemId: string;
    quantity: number;
    requiredDate: string;
}

export interface PurchaseRequisition {
    id: string;
    prNo: string;
    requestorId: string;
    department: string;
    date: string;
    priority: Priority;
    status: PRStatus;
    items: PRItem[];
    justification: string;
    comments?: string[];
}

// RFQ & Quotation
export type RFQStatus = 'Created' | 'Sent' | 'Closed';

export interface RFQ {
    id: string;
    rfqNo: string;
    prId: string;
    createdDate: string;
    dueDate: string;
    status: RFQStatus;
    vendorIds: string[]; // Vendors sent to
}

export interface Quotation {
    id: string;
    rfqId: string;
    vendorId: string;
    items: { itemId: string; qty: number; unitPrice: number }[];
    totalAmount: number;
    deliveryDate: string;
    submittedDate: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
}

// Purchase Order
export type POStatus = 'Sent' | 'Acknowledged' | 'Partially Received' | 'Completed' | 'Closed';

export interface PurchaseOrder {
    id: string;
    poNo: string;
    rfqId?: string; // Could be direct PO
    vendorId: string;
    date: string;
    items: { itemId: string; qty: number; unitPrice: number }[];
    totalAmount: number;
    status: POStatus;
    deliveryDate: string;
}

// Inventory / GRN
export type GRNStatus = 'Pending' | 'Quality Check' | 'Completed';

export interface GRN {
    id: string;
    grnNo: string;
    poId: string;
    receivedDate: string;
    receivedBy: string;
    warehouseId: string; // Where items are stored
    items: { itemId: string; receivedQty: number; acceptedQty: number; rejectedQty: number }[];
    status: GRNStatus;
}

// Finance
export type InvoiceStatus = 'Received' | 'Verified' | 'Approved' | 'Paid' | 'Rejected';

export interface Invoice {
    id: string;
    invoiceNo: string;
    vendorId: string;
    poId: string;
    date: string;
    dueDate: string;
    amount: number;
    status: InvoiceStatus;
    remarks?: string;
}

// Audit & Control
export interface ActivityLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    description: string;
    timestamp: string;
    module: 'Auth' | 'Procurement' | 'Inventory' | 'Finance' | 'System';
}
