import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
    User, Item, Vendor, PurchaseRequisition, RFQ,
    Quotation, PurchaseOrder, GRN, Role,
    Warehouse, StockLevel, StockTransaction, Invoice, MaterialRequest,
    ActivityLog, Category, PRStatus, Uom
} from '../types/models';
import { authService } from '../services/authService';
import { masterService } from '../services/masterService';
import { procurementService } from '../services/procurementService';
import { inventoryService } from '../services/inventoryService';
import { financeService } from '../services/financeService';

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
    uoms: Uom[];
    
    prs: PurchaseRequisition[];
    rfqs: RFQ[];
    quotes: Quotation[];
    pos: PurchaseOrder[];
    grns: GRN[];
    invoices: Invoice[];
    logs: ActivityLog[];

    // Actions
    addItem: (item: Omit<Item, 'id'>) => Promise<void>;
    addVendor: (vendor: Omit<Vendor, 'id'>) => Promise<void>;
    addWarehouse: (wh: Omit<Warehouse, 'id'>) => Promise<void>;
    addUom: (uom: Omit<Uom, 'id'>) => Promise<void>;
    
    addPR: (pr: Omit<PurchaseRequisition, 'id' | 'prNo'>) => Promise<void>;
    updatePRStatus: (id: string, status: PurchaseRequisition['status']) => Promise<void>;
    
    createRFQ: (prId: string, dueDate: string, vendorIds: string[]) => Promise<void>;
    submitQuote: (rfqId: string, vendorId: string, price: number) => Promise<void>;
    
    createPO: (quoteId: string) => Promise<void>;
    
    createGRN: (poId: string, warehouseId: string, receivedItems: { itemId: string, qty: number, accepted: number, rejected: number }[]) => Promise<void>;
    
    createStockTransaction: (tx: Omit<StockTransaction, 'id' | 'date' | 'performedBy'>, log?: boolean) => Promise<void>;
    createMaterialRequest: (req: Omit<MaterialRequest, 'id' | 'requestNo'>) => Promise<void>;
    
    createInvoice: (poId: string, vendorId: string, amount: number, dueDate: string, invoiceNo: string) => Promise<void>;
    updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;

    // Master Data Actions
    categories: Category[];
    addCategory: (category: Omit<Category, 'id'>) => Promise<void>;

    logActivity: (userId: string, userName: string, action: string, description: string, module: ActivityLog['module']) => void;
}

const MockContext = createContext<MockContextType | undefined>(undefined);

export const MockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // State
    const [items, setItems] = useState<Item[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [uoms, setUoms] = useState<Uom[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
    const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [grns, setGrns] = useState<GRN[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            setItems(await masterService.getItems());
            setVendors(await masterService.getVendors());
            setWarehouses(await masterService.getWarehouses());
            setCategories(await masterService.getCategories());
            setUoms(await masterService.getUoms());
            
            setPrs(await procurementService.getPRs());
            setRfqs(await procurementService.getRFQs());
            setQuotes(await procurementService.getQuotes());
            setPos(await procurementService.getPOs());
            
            setGrns(await inventoryService.getGRNs());
            setStockLevels(await inventoryService.getStockLevels());
            setStockTransactions(await inventoryService.getTransactions());
            setMaterialRequests(await inventoryService.getMaterialRequests());
            
            setInvoices(await financeService.getInvoices());
        };
        loadData();
    }, []);

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

    // Auth
    const login = async (email: string, pass: string): Promise<boolean> => {
        const user = await authService.login(email, pass);
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

    const switchRole = async (role: Role) => {
        const users = await authService.getUsers();
        const user = users.find(u => u.role === role);
        if (user) {
            setCurrentUser(user);
            logActivity(user.id, user.name, 'Role Switch', `Switched to role: ${role}`, 'Auth');
        }
    };

    // Master Data Actions
    const addItem = async (item: Omit<Item, 'id'>) => {
        if (!currentUser) return;
        await masterService.addItem(item);
        setItems(await masterService.getItems());
        logActivity(currentUser.id, currentUser.name, 'Add Item', `Added item: ${item.code}`, 'Inventory');
    };

    const addVendor = async (vendor: Omit<Vendor, 'id'>) => {
        if (!currentUser) return;
        await masterService.addVendor(vendor);
        setVendors(await masterService.getVendors());
        logActivity(currentUser.id, currentUser.name, 'Add Vendor', `Added vendor: ${vendor.name}`, 'Procurement');
    };

    const addWarehouse = async (wh: Omit<Warehouse, 'id'>) => {
        if (!currentUser) return;
        await masterService.addWarehouse(wh);
        setWarehouses(await masterService.getWarehouses());
        logActivity(currentUser.id, currentUser.name, 'Add Warehouse', `Added warehouse: ${wh.name}`, 'Inventory');
    };

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        if (!currentUser) return;
        await masterService.addCategory(cat);
        setCategories(await masterService.getCategories());
        logActivity(currentUser.id, currentUser.name, 'Add Category', `Added category: ${cat.name}`, 'System');
    };

    const addUom = async (uom: Omit<Uom, 'id'>) => {
        if (!currentUser) return;
        await masterService.addUom(uom);
        setUoms(await masterService.getUoms());
        logActivity(currentUser.id, currentUser.name, 'Add UoM', `Added Unit of Measure: ${uom.name}`, 'System');
    };

    // Procurement Actions
    const addPR = async (prData: Omit<PurchaseRequisition, 'id' | 'prNo'>) => {
        if (!currentUser) return;
        const newPR = await procurementService.createPR(prData);
        setPrs(await procurementService.getPRs());
        logActivity(currentUser.id, currentUser.name, 'Create PR', `Created PR: ${newPR.prNo}`, 'Procurement');
    };

    const updatePRStatus = async (id: string, status: PRStatus) => {
        await procurementService.updatePRStatus(id, status);
        setPrs(await procurementService.getPRs());
    };

    const createRFQ = async (prId: string, dueDate: string, vendorIds: string[]) => {
        if (!currentUser) return;
        const newRFQ = await procurementService.createRFQ({ prId, dueDate, vendorIds: vendorIds, createdDate: '', status: 'Sent' }); // Helper in service fills rest
        setRfqs(await procurementService.getRFQs());
        setPrs(await procurementService.getPRs()); // Update status
        logActivity(currentUser.id, currentUser.name, 'Create RFQ', `Created RFQ: ${newRFQ.rfqNo}`, 'Procurement');
    };

    const submitQuote = async (rfqId: string, vendorId: string, price: number) => {
        if (!currentUser) return;
        // Need to logic here or in service? Moved basic logic to here but creation to service
        // Need to get items from PR to creating quote, service handles simple CRUD
        // Let's keep business logic here for composition, calling service for persistence
        
        const rfq = rfqs.find(r => r.id === rfqId);
        if (!rfq) return;
        const pr = prs.find(p => p.id === rfq.prId);
        if (!pr) return;

        await procurementService.submitQuote({
            rfqId,
            vendorId,
            items: pr.items.map(i => ({ itemId: i.itemId, qty: i.quantity, unitPrice: price })),
            totalAmount: pr.items.reduce((acc, curr) => acc + (curr.quantity * price), 0),
            deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            submittedDate: new Date().toISOString().split('T')[0],
            status: 'Pending'
        });
        setQuotes(await procurementService.getQuotes());
        logActivity(currentUser.id, currentUser.name, 'Submit Quote', `Vendor ${vendorId} submitted quote`, 'Procurement');
    };

    const createPO = async (quoteId: string) => {
        if (!currentUser) return;
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote) return;

        // Create PO
        const newPO = await procurementService.createPO({
            rfqId: quote.rfqId,
            vendorId: quote.vendorId,
            date: new Date().toISOString().split('T')[0],
            items: quote.items,
            totalAmount: quote.totalAmount,
            status: 'Sent',
            deliveryDate: quote.deliveryDate
        });
        
        // Update Quote status
        await procurementService.updateQuoteStatus(quoteId, 'Accepted');

        setPos(await procurementService.getPOs());
        setQuotes(await procurementService.getQuotes());
        logActivity(currentUser.id, currentUser.name, 'Create PO', `Created PO: ${newPO.poNo}`, 'Procurement');
    };

    // Inventory Actions
    const createGRN = async (poId: string, warehouseId: string, receivedItems: { itemId: string, qty: number, accepted: number, rejected: number }[]) => {
        if (!currentUser) return;
        const po = pos.find(p => p.id === poId);
        if (!po) return;

        const newGRN = await inventoryService.createGRN({
            poId,
            warehouseId,
            receivedDate: new Date().toISOString().split('T')[0],
            receivedBy: currentUser.name,
            items: receivedItems.map(i => ({ itemId: i.itemId, receivedQty: i.qty, acceptedQty: i.accepted, rejectedQty: i.rejected })),
            status: 'Completed'
        });

        // Update PO Status
        await procurementService.updatePOStatus(poId, 'Completed');

        // Update Stock
        for (const recItem of receivedItems) {
            await inventoryService.updateStock(recItem.itemId, warehouseId, recItem.accepted);
            // Log Tx
            await inventoryService.addTransaction({
                 itemId: recItem.itemId,
                 type: 'Receipt',
                 quantity: recItem.accepted,
                 targetWarehouseId: warehouseId,
                 referenceId: newGRN.grnNo,
                 notes: 'Goods Receipt from PO ' + po.poNo,
                 performedBy: currentUser.name
            });
        }

        setGrns(await inventoryService.getGRNs());
        setPos(await procurementService.getPOs());
        setStockLevels(await inventoryService.getStockLevels());
        logActivity(currentUser.id, currentUser.name, 'Create GRN', `Created GRN: ${newGRN.grnNo}`, 'Inventory');
    };

    const createStockTransaction = async (tx: Omit<StockTransaction, 'id' | 'date' | 'performedBy'>, log = true) => {
        if (!currentUser) return;
        
        // Use service to record
        await inventoryService.addTransaction({
            ...tx,
            performedBy: currentUser.name
        });

        // Use service to update stock
        if (tx.type === 'Transfer') {
             if (!tx.sourceWarehouseId || !tx.targetWarehouseId) return;
             await inventoryService.updateStock(tx.itemId, tx.sourceWarehouseId, -tx.quantity);
             await inventoryService.updateStock(tx.itemId, tx.targetWarehouseId, tx.quantity);
        } else if (tx.type === 'Issue') {
             if (!tx.sourceWarehouseId) return;
             await inventoryService.updateStock(tx.itemId, tx.sourceWarehouseId, -tx.quantity);
        } else if (tx.type === 'Adjustment') {
             if (!tx.sourceWarehouseId) return;
             await inventoryService.updateStock(tx.itemId, tx.sourceWarehouseId, tx.quantity); // Can be negative? usually adjustment is additive or set, here assuming additive sign
        }

        setStockTransactions(await inventoryService.getTransactions());
        setStockLevels(await inventoryService.getStockLevels());
        
        if (log) logActivity(currentUser.id, currentUser.name, 'Stock Transaction', `${tx.type} of ${tx.quantity} units`, 'Inventory');
    };

    const createMaterialRequest = async (req: Omit<MaterialRequest, 'id' | 'requestNo'>) => {
        if (!currentUser) return;
        const newReq = await inventoryService.createMaterialRequest(req);
        setMaterialRequests(await inventoryService.getMaterialRequests());
        logActivity(currentUser.id, currentUser.name, 'Material Request', `Created MR: ${newReq.requestNo}`, 'Inventory');
    };

    // Finance Actions
    const createInvoice = async (poId: string, vendorId: string, amount: number, dueDate: string, invoiceNo: string) => {
         if (!currentUser) return;
         await financeService.createInvoice({
             invoiceNo,
             poId,
             vendorId,
             amount,
             dueDate,
             date: new Date().toISOString().split('T')[0],
             status: 'Received'
         });
         setInvoices(await financeService.getInvoices());
         logActivity(currentUser.id, currentUser.name, 'Register Invoice', `Registered Invoice: ${invoiceNo}`, 'Finance');
    };

    const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
        if (!currentUser) return;
        await financeService.updateInvoiceStatus(id, status);
        setInvoices(await financeService.getInvoices());
        logActivity(currentUser.id, currentUser.name, 'Update Invoice', `Updated Invoice ${id} to ${status}`, 'Finance');
    };

    return (
        <MockContext.Provider value={{
            currentUser, isAuthenticated, login, logout, switchRole,
            items, vendors, warehouses, categories, stockLevels, stockTransactions, materialRequests, uoms,
            prs, rfqs, quotes, pos, grns, invoices, logs,
            addItem, addVendor, addWarehouse, addCategory, addUom,
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
