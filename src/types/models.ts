// User Roles & Auth
export type Role = 'Admin' | 'Procurement' | 'Store' | 'Dept' | 'Finance' | 'Vendor';

export interface User {
    id: string;
    name: string;
    role: Role;
    department?: string;
}

// Master Data
export interface Item {
    id: string;
    code: string;
    name: string;
    category: string;
    uom: string;
    currentStock: number;
    reorderLevel: number;
    price: number; // Standard/Last Purchase Price
}

export interface Vendor {
    id: string;
    name: string;
    email: string;
    phone: string;
    rating: number; // 1-5
    address: string;
}

export interface Warehouse {
    id: string;
    name: string;
    location: string;
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
    items: { itemId: string; receivedQty: number; acceptedQty: number; rejectedQty: number }[];
    status: GRNStatus;
}
