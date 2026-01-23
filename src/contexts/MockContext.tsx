import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
    User, Item, Vendor, PurchaseRequisition, RFQ,
    Quotation, PurchaseOrder, GRN, Role,
    Warehouse, StockLevel, StockTransaction, Invoice, MaterialRequest,
    ActivityLog, Category
} from '../types/models';

// Dummy Data Initialization
const initialUsers: User[] = [
    { id: 'u1', name: 'Admin User', role: 'Admin', department: 'IT', email: 'admin@erp.com', password: 'password' },
    { id: 'u2', name: 'John Buyer', role: 'Procurement', department: 'Procurement', email: 'buyer@erp.com', password: 'password' },
    { id: 'u3', name: 'Sarah Store', role: 'Store', department: 'Warehouse', email: 'store@erp.com', password: 'password' },
    { id: 'u4', name: 'Mike Requestor', role: 'Dept', department: 'Marketing', email: 'requestor@erp.com', password: 'password' },
    { id: 'u5', name: 'Alice Finance', role: 'Finance', department: 'Finance', email: 'finance@erp.com', password: 'password' },
];

const initialWarehouses: Warehouse[] = [
    { id: 'w1', name: 'Main Warehouse', location: 'Building A' },
    { id: 'w2', name: 'Distribution Center', location: 'Industrial Zone' },
];

const initialItems: Item[] = [
    { id: 'i1', code: 'LAP-001', name: 'Dell Latitude 5420', category: 'Electronics', uom: 'PCS', price: 1200 },
    { id: 'i2', code: 'MSE-001', name: 'Logitech M185 Mouse', category: 'Accessories', uom: 'PCS', price: 15 },
    { id: 'i3', code: 'MON-001', name: 'Dell 24" Monitor', category: 'Electronics', uom: 'PCS', price: 180 },
    { id: 'i4', code: 'PAP-A4', name: 'A4 Paper Ream', category: 'Stationery', uom: 'REAM', price: 5 },
    { id: 'i5', code: 'INK-BLK', name: 'HP 650 Black Ink', category: 'Stationery', uom: 'PCS', price: 25 },
];

// Initial Stock (Distributed)
const initialStockLevels: StockLevel[] = [
    { itemId: 'i1', warehouseId: 'w1', quantity: 10, minStockLevel: 5 },
    { itemId: 'i1', warehouseId: 'w2', quantity: 2, minStockLevel: 0 },
    { itemId: 'i2', warehouseId: 'w1', quantity: 45, minStockLevel: 20 },
    { itemId: 'i3', warehouseId: 'w1', quantity: 8, minStockLevel: 5 },
    { itemId: 'i4', warehouseId: 'w1', quantity: 80, minStockLevel: 50 },
    { itemId: 'i4', warehouseId: 'w2', quantity: 20, minStockLevel: 10 },
    { itemId: 'i5', warehouseId: 'w1', quantity: 15, minStockLevel: 10 },
];

const initialVendors: Vendor[] = [
    { id: 'v1', name: 'Tech Solutions Inc', email: 'sales@techsol.com', phone: '555-0101', rating: 4.5, address: '123 Tech St', taxId: 'TAX-001' },
    { id: 'v2', name: 'Office Depot', email: 'b2b@officedepot.com', phone: '555-0102', rating: 4.0, address: '456 Paper Ln', taxId: 'TAX-002' },
    { id: 'v3', name: 'Global Importers', email: 'orders@globalimp.com', phone: '555-0103', rating: 3.5, address: '789 Ship Rd', taxId: 'TAX-003' },
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
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;
    switchRole: (role: Role) => void;
    
    // Data
    items: Item[];
    vendors: Vendor[];
    warehouses: Warehouse[];
    stockLevels: StockLevel[];
    stockTransactions: StockTransaction[];
    materialRequests: MaterialRequest[];
    
    prs: PurchaseRequisition[];
    rfqs: RFQ[];
    quotes: Quotation[];
    pos: PurchaseOrder[];
    grns: GRN[];
    invoices: Invoice[];
    logs: ActivityLog[];

    // Actions
    addItem: (item: Omit<Item, 'id'>) => void;
    addVendor: (vendor: Omit<Vendor, 'id'>) => void;
    addWarehouse: (wh: Omit<Warehouse, 'id'>) => void;
    
    addPR: (pr: Omit<PurchaseRequisition, 'id' | 'prNo'>) => void;
    updatePRStatus: (id: string, status: PurchaseRequisition['status']) => void;
    
    createRFQ: (prId: string, dueDate: string, vendorIds: string[]) => void;
    submitQuote: (rfqId: string, vendorId: string, price: number) => void;
    
    createPO: (quoteId: string) => void;
    
    createGRN: (poId: string, warehouseId: string, receivedItems: { itemId: string, qty: number, accepted: number, rejected: number }[]) => void;
    
    createStockTransaction: (tx: Omit<StockTransaction, 'id' | 'date' | 'performedBy'>, log?: boolean) => void;
    createMaterialRequest: (req: Omit<MaterialRequest, 'id' | 'requestNo'>) => void;
    
    createInvoice: (poId: string, vendorId: string, amount: number, dueDate: string, invoiceNo: string) => void;
    updateInvoiceStatus: (id: string, status: Invoice['status']) => void;

    // Master Data Actions
    categories: Category[];
    addCategory: (category: Omit<Category, 'id'>) => void;

    logActivity: (userId: string, userName: string, action: string, description: string, module: ActivityLog['module']) => void;
}

const MockContext = createContext<MockContextType | undefined>(undefined);

export const MockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const login = async (email: string, pass: string): Promise<boolean> => {
        const user = initialUsers.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            logActivity(user.id, user.name, 'Login', 'User logged in', 'Auth');
            return true;
        }
        return false;
    };

    const logout = () => {
        if (currentUser) {
            logActivity(currentUser.id, currentUser.name, 'Logout', 'User logged out', 'Auth');
        }
        setCurrentUser(null);
        setIsAuthenticated(false);
    };

    // Master Data
    const [items, setItems] = useState<Item[]>(initialItems);
    const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
    const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
    const [categories, setCategories] = useState<Category[]>([
        { id: 'c1', name: 'Electronics', description: 'Computers, screens, etc.', uom: 'PCS' },
        { id: 'c2', name: 'Accessories', description: 'Mice, keyboards, cables', uom: 'PCS' },
        { id: 'c3', name: 'Stationery', description: 'Paper, pencils, ink', uom: 'REAM' },
    ]);
    
    // Inventory
    const [stockLevels, setStockLevels] = useState<StockLevel[]>(initialStockLevels);
    const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
    const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);

    // Procurement
    const [prs, setPrs] = useState<PurchaseRequisition[]>(initialPRs);
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([
        {
            id: 'po_init_1',
            poNo: 'PO-2024-001',
            rfqId: 'rfq_init_1',
            vendorId: 'v1', // Tech Solutions Inc
            date: '2024-01-20',
            deliveryDate: '2024-01-25',
            status: 'Sent',
            totalAmount: 2400,
            items: [{ itemId: 'i1', qty: 2, unitPrice: 1200 }]
        }
    ]);
    const [grns, setGrns] = useState<GRN[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([
        { id: 'l1', userId: 'u1', userName: 'Admin User', action: 'System Startup', description: 'System initialized', timestamp: new Date().toISOString(), module: 'System' }
    ]);

    const switchRole = (role: Role) => {
        const user = initialUsers.find(u => u.role === role);
        if (user) {
            setCurrentUser(user);
            logActivity(user.id, user.name, 'Role Switch', `Switched to role: ${role}`, 'Auth');
        }
    };

    const logActivity = (userId: string, userName: string, action: string, description: string, module: ActivityLog['module']) => {
        const newLog: ActivityLog = {
            id: `log${Date.now()}-${Math.random()}`,
            userId,
            userName,
            action,
            description,
            timestamp: new Date().toISOString(),
            module
        };
        setLogs(prev => [newLog, ...prev]);
    };

    // --- Actions ---

    const addItem = (item: Omit<Item, 'id'>) => {
        if (!currentUser) return;
        setItems([...items, { ...item, id: `i${Date.now()}` }]);
        logActivity(currentUser.id, currentUser.name, 'Add Item', `Added item: ${item.code}`, 'Inventory');
    };

    const addVendor = (vendor: Omit<Vendor, 'id'>) => {
        if (!currentUser) return;
        setVendors([...vendors, { ...vendor, id: `v${Date.now()}` }]);
        logActivity(currentUser.id, currentUser.name, 'Add Vendor', `Added vendor: ${vendor.name}`, 'Procurement');
    };

    const addWarehouse = (wh: Omit<Warehouse, 'id'>) => {
        if (!currentUser) return;
        setWarehouses([...warehouses, { ...wh, id: `w${Date.now()}` }]);
        logActivity(currentUser.id, currentUser.name, 'Add Warehouse', `Added warehouse: ${wh.name}`, 'Inventory');
    };

    const addCategory = (category: Omit<Category, 'id'>) => {
        if (!currentUser) return;
        setCategories([...categories, { ...category, id: `c${Date.now()}` }]);
        logActivity(currentUser.id, currentUser.name, 'Add Category', `Added category: ${category.name}`, 'System');
    };

    const addPR = (prData: Omit<PurchaseRequisition, 'id' | 'prNo'>) => {
        if (!currentUser) return;
        const newPR: PurchaseRequisition = {
            ...prData,
            id: `pr${Date.now()}`,
            prNo: `PR-${new Date().getFullYear()}-${String(prs.length + 1).padStart(3, '0')}`
        };
        setPrs([newPR, ...prs]);
        logActivity(currentUser.id, currentUser.name, 'Create PR', `Created PR: ${newPR.prNo}`, 'Procurement');
    };

    const updatePRStatus = (id: string, status: PurchaseRequisition['status']) => {
        setPrs(prs.map(pr => pr.id === id ? { ...pr, status } : pr));
        // logActivity(currentUser.id, currentUser.name, 'Update PR', `Updated PR ${id} to ${status}`, 'Procurement');
    };

    const createRFQ = (prId: string, dueDate: string, vendorIds: string[]) => {
        if (!currentUser) return;
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
        logActivity(currentUser.id, currentUser.name, 'Create RFQ', `Created RFQ: ${newRFQ.rfqNo}`, 'Procurement');
    };

    const submitQuote = (rfqId: string, vendorId: string, price: number) => {
        if (!currentUser) return;
        const rfq = rfqs.find(r => r.id === rfqId);
        if (!rfq) return;

        // Find items for this RFQ (via PR)
        const pr = prs.find(p => p.id === rfq.prId);
        if (!pr) return;

        const newQuote: Quotation = {
            id: `qt${Date.now()}${vendorId}`,
            rfqId,
            vendorId,
            items: pr.items.map(i => ({ itemId: i.itemId, qty: i.quantity, unitPrice: price })), // simplified
            totalAmount: pr.items.reduce((acc, curr) => acc + (curr.quantity * price), 0),
            deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            submittedDate: new Date().toISOString().split('T')[0],
            status: 'Pending'
        };
        setQuotes([...quotes, newQuote]);
        logActivity(currentUser.id, currentUser.name, 'Submit Quote', `Vendor ${vendorId} submitted quote`, 'Procurement');
    };

    const createPO = (quoteId: string) => {
        if (!currentUser) return;
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
        setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: 'Accepted' } : q));
        logActivity(currentUser.id, currentUser.name, 'Create PO', `Created PO: ${newPO.poNo}`, 'Procurement');
    };

    const createGRN = (poId: string, warehouseId: string, receivedItems: { itemId: string, qty: number, accepted: number, rejected: number }[]) => {
        if (!currentUser) return;
        const po = pos.find(p => p.id === poId);
        if (!po) return;

        const newGRN: GRN = {
            id: `grn${Date.now()}`,
            grnNo: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(3, '0')}`,
            poId,
            warehouseId,
            receivedDate: new Date().toISOString().split('T')[0],
            receivedBy: currentUser.name,
            items: receivedItems.map(i => ({ itemId: i.itemId, receivedQty: i.qty, acceptedQty: i.accepted, rejectedQty: i.rejected })),
            status: 'Completed'
        };
        setGrns([...grns, newGRN]);

        // Update PO Status
        setPos(pos.map(p => p.id === poId ? { ...p, status: 'Completed' } : p));

        // Update Stock Levels
        const newStockLevels = [...stockLevels];
        receivedItems.forEach(recItem => {
            const existingLevelIndex = newStockLevels.findIndex(sl => sl.itemId === recItem.itemId && sl.warehouseId === warehouseId);
            
            if (existingLevelIndex > -1) {
                newStockLevels[existingLevelIndex] = {
                    ...newStockLevels[existingLevelIndex],
                    quantity: newStockLevels[existingLevelIndex].quantity + recItem.accepted
                };
            } else {
                newStockLevels.push({
                    itemId: recItem.itemId,
                    warehouseId: warehouseId,
                    quantity: recItem.accepted,
                    minStockLevel: 0 // Default
                });
            }
        });
        setStockLevels(newStockLevels);

        // Record Transaction
        receivedItems.forEach(recItem => {
             createStockTransaction({
                 itemId: recItem.itemId,
                 type: 'Receipt',
                 quantity: recItem.accepted,
                 targetWarehouseId: warehouseId,
                 referenceId: newGRN.grnNo,
                 notes: 'Goods Receipt from PO ' + po.poNo
             }, false); // prevent double logging if we log in stock tx
        });
        
        logActivity(currentUser.id, currentUser.name, 'Create GRN', `Created GRN: ${newGRN.grnNo}`, 'Inventory');
    };

    const createStockTransaction = (tx: Omit<StockTransaction, 'id' | 'date' | 'performedBy'>, log = true) => {
        if (!currentUser) return;
        const transaction: StockTransaction = {
             ...tx,
             id: `tx${Date.now()}-${Math.random()}`,
             date: new Date().toISOString(),
             performedBy: currentUser.name
        };
        setStockTransactions(prev => [...prev, transaction]);
        
        if (log) logActivity(currentUser.id, currentUser.name, 'Stock Transaction', `${tx.type} of ${tx.quantity} units`, 'Inventory');
        
        if (tx.type === 'Transfer') {
             if (!tx.sourceWarehouseId || !tx.targetWarehouseId) return;
             updateStockQty(tx.itemId, tx.sourceWarehouseId, -tx.quantity);
             updateStockQty(tx.itemId, tx.targetWarehouseId, tx.quantity);
        } else if (tx.type === 'Issue') {
             if (!tx.sourceWarehouseId) return;
             updateStockQty(tx.itemId, tx.sourceWarehouseId, -tx.quantity);
        } else if (tx.type === 'Adjustment') {
             if (!tx.sourceWarehouseId) return;
             updateStockQty(tx.itemId, tx.sourceWarehouseId, tx.quantity);
        }
    };
    
    const updateStockQty = (itemId: string, warehouseId: string, delta: number) => {
        setStockLevels(prev => {
            const index = prev.findIndex(sl => sl.itemId === itemId && sl.warehouseId === warehouseId);
            if (index > -1) {
                const newLevels = [...prev];
                newLevels[index] = { ...newLevels[index], quantity: newLevels[index].quantity + delta };
                return newLevels;
            } else if (delta > 0) {
                 return [...prev, { itemId, warehouseId, quantity: delta, minStockLevel: 0 }];
            }
            return prev;
        });
    };

    const createMaterialRequest = (req: Omit<MaterialRequest, 'id' | 'requestNo'>) => {
        if (!currentUser) return;
        const newReq: MaterialRequest = {
            ...req,
            id: `mr${Date.now()}`,
            requestNo: `MR-${new Date().getFullYear()}-${String(materialRequests.length + 1).padStart(3, '0')}`
        };
        setMaterialRequests([...materialRequests, newReq]);
        logActivity(currentUser.id, currentUser.name, 'Material Request', `Created MR: ${newReq.requestNo}`, 'Inventory');
    };

    const createInvoice = (poId: string, vendorId: string, amount: number, dueDate: string, invoiceNo: string) => {
         if (!currentUser) return;
         const newInvoice: Invoice = {
             id: `inv${Date.now()}`,
             invoiceNo,
             poId,
             vendorId,
             amount,
             dueDate,
             date: new Date().toISOString().split('T')[0],
             status: 'Received'
         };
         setInvoices([...invoices, newInvoice]);
         logActivity(currentUser.id, currentUser.name, 'Register Invoice', `Registered Invoice: ${invoiceNo}`, 'Finance');
    };

    const updateInvoiceStatus = (id: string, status: Invoice['status']) => {
        if (!currentUser) return;
        setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
        logActivity(currentUser.id, currentUser.name, 'Update Invoice', `Updated Invoice ${id} to ${status}`, 'Finance');
    };

    return (
        <MockContext.Provider value={{
            currentUser, isAuthenticated, login, logout, switchRole,
            items, vendors, warehouses, categories, stockLevels, stockTransactions, materialRequests,
            prs, rfqs, quotes, pos, grns, invoices, logs,
            addItem, addVendor, addWarehouse, addCategory,
            addPR, updatePRStatus, createRFQ, submitQuote, createPO, createGRN,
            createStockTransaction, createMaterialRequest,
            createInvoice, updateInvoiceStatus, logActivity
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
