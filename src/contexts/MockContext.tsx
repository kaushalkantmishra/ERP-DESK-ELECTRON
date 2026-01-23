import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
    User, Item, Vendor, PurchaseRequisition, RFQ,
    Quotation, PurchaseOrder, GRN, Role
} from '../types/models';

// Dummy Data Initialization
const initialUsers: User[] = [
    { id: 'u1', name: 'Admin User', role: 'Admin', department: 'IT' },
    { id: 'u2', name: 'John Buyer', role: 'Procurement', department: 'Procurement' },
    { id: 'u3', name: 'Sarah Store', role: 'Store', department: 'Warehouse' },
    { id: 'u4', name: 'Mike Requestor', role: 'Dept', department: 'Marketing' },
    { id: 'u5', name: 'Alice Finance', role: 'Finance', department: 'Finance' },
];

const initialItems: Item[] = [
    { id: 'i1', code: 'LAP-001', name: 'Dell Latitude 5420', category: 'Electronics', uom: 'PCS', currentStock: 12, reorderLevel: 5, price: 1200 },
    { id: 'i2', code: 'MSE-001', name: 'Logitech M185 Mouse', category: 'Accessories', uom: 'PCS', currentStock: 45, reorderLevel: 20, price: 15 },
    { id: 'i3', code: 'MON-001', name: 'Dell 24" Monitor', category: 'Electronics', uom: 'PCS', currentStock: 8, reorderLevel: 10, price: 180 },
    { id: 'i4', code: 'PAP-A4', name: 'A4 Paper Reamn', category: 'Stationery', uom: 'REAM', currentStock: 100, reorderLevel: 50, price: 5 },
    { id: 'i5', code: 'INK-BLK', name: 'HP 650 Black Ink', category: 'Stationery', uom: 'PCS', currentStock: 15, reorderLevel: 10, price: 25 },
];

const initialVendors: Vendor[] = [
    { id: 'v1', name: 'Tech Solutions Inc', email: 'sales@techsol.com', phone: '555-0101', rating: 4.5, address: '123 Tech St' },
    { id: 'v2', name: 'Office Depot', email: 'b2b@officedepot.com', phone: '555-0102', rating: 4.0, address: '456 Paper Ln' },
    { id: 'v3', name: 'Global Importers', email: 'orders@globalimp.com', phone: '555-0103', rating: 3.5, address: '789 Ship Rd' },
];

const initialPRs: PurchaseRequisition[] = [
    {
        id: 'pr1', prNo: 'PR-2024-001', requestorId: 'u4', department: 'Marketing', date: '2024-01-15',
        priority: 'High', status: 'Submitted', justification: 'New hire equipment',
        items: [{ itemId: 'i1', quantity: 2, requiredDate: '2024-01-25' }]
    },
    {
        id: 'pr2', prNo: 'PR-2024-002', requestorId: 'u4', department: 'Marketing', date: '2024-01-18',
        priority: 'Medium', status: 'Draft', justification: 'Office supplies',
        items: [{ itemId: 'i4', quantity: 10, requiredDate: '2024-01-20' }]
    },
];

interface MockContextType {
    currentUser: User;
    switchRole: (role: Role) => void;
    // Data Access
    items: Item[];
    vendors: Vendor[];
    prs: PurchaseRequisition[];
    rfqs: RFQ[];
    quotes: Quotation[];
    pos: PurchaseOrder[];
    grns: GRN[];
    // Actions
    addPR: (pr: Omit<PurchaseRequisition, 'id' | 'prNo'>) => void;
    updatePRStatus: (id: string, status: PurchaseRequisition['status']) => void;
    createRFQ: (prId: string, dueDate: string, vendorIds: string[]) => void;
    submitQuote: (rfqId: string, vendorId: string, price: number) => void;
    createPO: (quoteId: string) => void;
    createGRN: (poId: string, receivedItems: { itemId: string, qty: number, accepted: number, rejected: number }[]) => void;
    // TODO: Add more actions as we build features
}

const MockContext = createContext<MockContextType | undefined>(undefined);

export const MockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);

    const [items, setItems] = useState<Item[]>(initialItems);
    const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
    const [prs, setPrs] = useState<PurchaseRequisition[]>(initialPRs);
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [grns, setGrns] = useState<GRN[]>([]);

    const switchRole = (role: Role) => {
        const user = initialUsers.find(u => u.role === role);
        if (user) setCurrentUser(user);
    };

    const addPR = (prData: Omit<PurchaseRequisition, 'id' | 'prNo'>) => {
        const newPR: PurchaseRequisition = {
            ...prData,
            id: `pr${Date.now()}`,
            prNo: `PR-${new Date().getFullYear()}-${String(prs.length + 1).padStart(3, '0')}`
        };
        setPrs([newPR, ...prs]);
    };

    const updatePRStatus = (id: string, status: PurchaseRequisition['status']) => {
        setPrs(prs.map(pr => pr.id === id ? { ...pr, status } : pr));
    };

    const createRFQ = (prId: string, dueDate: string, vendorIds: string[]) => {
        const newRFQ: RFQ = {
            id: `rfq${Date.now()}`,
            rfqNo: `RFQ-${new Date().getFullYear()}-${String(rfqs.length + 1).padStart(3, '0')}`,
            prId,
            createdDate: new Date().toISOString().split('T')[0],
            dueDate,
            status: 'Sent',
            vendorIds
        };
        setRfqs([...rfqs, newRFQ]);
        updatePRStatus(prId, 'RFQ Created');
    };

    const submitQuote = (rfqId: string, vendorId: string, price: number) => {
        const rfq = rfqs.find(r => r.id === rfqId);
        if (!rfq) return;

        // Find items for this RFQ (via PR)
        const pr = prs.find(p => p.id === rfq.prId);
        if (!pr) return;

        const newQuote: Quotation = {
            id: `qt${Date.now()}${vendorId}`,
            rfqId,
            vendorId,
            items: pr.items.map(i => ({ itemId: i.itemId, qty: i.quantity, unitPrice: price })), // simplified uniform price
            totalAmount: pr.items.reduce((acc, curr) => acc + (curr.quantity * price), 0),
            deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            submittedDate: new Date().toISOString().split('T')[0],
            status: 'Pending'
        };
        setQuotes([...quotes, newQuote]);
    };

    const createPO = (quoteId: string) => {
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote) return;

        const newPO: PurchaseOrder = {
            id: `po${Date.now()}`,
            poNo: `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`,
            rfqId: quote.rfqId,
            vendorId: quote.vendorId,
            date: new Date().toISOString().split('T')[0],
            items: quote.items,
            totalAmount: quote.totalAmount,
            status: 'Sent',
            deliveryDate: quote.deliveryDate
        };
        setPos([...pos, newPO]);
        // update quote status
        setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: 'Accepted' } : q));
    };

    const createGRN = (poId: string, receivedItems: { itemId: string, qty: number, accepted: number, rejected: number }[]) => {
        const po = pos.find(p => p.id === poId);
        if (!po) return;

        const newGRN: GRN = {
            id: `grn${Date.now()}`,
            grnNo: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(3, '0')}`,
            poId,
            receivedDate: new Date().toISOString().split('T')[0],
            receivedBy: currentUser.name,
            items: receivedItems.map(i => ({ itemId: i.itemId, receivedQty: i.qty, acceptedQty: i.accepted, rejectedQty: i.rejected })),
            status: 'Completed'
        };
        setGrns([...grns, newGRN]);

        // Update PO Status
        const isPartial = false; // logic can be enhanced for partial receipt
        setPos(pos.map(p => p.id === poId ? { ...p, status: isPartial ? 'Partially Received' : 'Completed' } : p));

        // Update Inventory Stock
        const updatedItems = [...items];
        receivedItems.forEach(recItem => {
            const itemIndex = updatedItems.findIndex(i => i.id === recItem.itemId);
            if (itemIndex > -1) {
                updatedItems[itemIndex].currentStock += recItem.accepted;
            }
        });
        setItems(updatedItems);
    };

    return (
        <MockContext.Provider value={{
            currentUser, switchRole,
            items, vendors, prs, rfqs, quotes, pos, grns,
            addPR, updatePRStatus, createRFQ, submitQuote, createPO, createGRN
        }}>
            {children}
        </MockContext.Provider>
    );
};

export const useMockData = () => {
    const context = useContext(MockContext);
    if (!context) throw new Error('useMockData must be used within a MockProvider');
    return context;
};
