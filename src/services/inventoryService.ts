import { GRN, StockLevel, StockTransaction, MaterialRequest } from '../types/models';
import grnData from '../mock-data/grn.json';
import stockData from '../mock-data/stock.json'; // Initial stock levels
import materialRequestsData from '../mock-data/materialRequests.json';
import { simulateApiCall } from './api';

// In-memory state
let grns: GRN[] = [...grnData] as GRN[];
let stockLevels: StockLevel[] = [...stockData] as StockLevel[];
let transactions: StockTransaction[] = [];
let materialRequests: MaterialRequest[] = [...materialRequestsData] as MaterialRequest[];

export const inventoryService = {
    // GRN
    getGRNs: async (): Promise<GRN[]> => simulateApiCall(grns),
    createGRN: async (grn: Omit<GRN, 'id' | 'grnNo'>): Promise<GRN> => {
        const newGRN = {
            ...grn,
            id: `grn${Date.now()}`,
            grnNo: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(3, '0')}`
        };
        grns.push(newGRN);
        return simulateApiCall(newGRN);
    },

    // Stock
    getStockLevels: async (): Promise<StockLevel[]> => simulateApiCall(stockLevels),
    updateStock: async (itemId: string, warehouseId: string, quantityChange: number): Promise<void> => {
        const existing = stockLevels.find(s => s.itemId === itemId && s.warehouseId === warehouseId);
        if (existing) {
            existing.quantity += quantityChange;
        } else if (quantityChange > 0) {
            stockLevels.push({ itemId, warehouseId, quantity: quantityChange, minStockLevel: 0 });
        }
        await simulateApiCall(null);
    },

    // Transactions
    getTransactions: async (): Promise<StockTransaction[]> => simulateApiCall(transactions),
    addTransaction: async (tx: Omit<StockTransaction, 'id' | 'date'>): Promise<StockTransaction> => {
        const newTx = {
            ...tx,
            id: `tx${Date.now()}`,
            date: new Date().toISOString()
        };
        transactions.unshift(newTx);
        return simulateApiCall(newTx);
    },

    // Material Requests
    getMaterialRequests: async (): Promise<MaterialRequest[]> => simulateApiCall(materialRequests),
    createMaterialRequest: async (req: Omit<MaterialRequest, 'id' | 'requestNo'>): Promise<MaterialRequest> => {
        const newReq = {
            ...req,
            id: `mr${Date.now()}`,
            requestNo: `MR-${new Date().getFullYear()}-${String(materialRequests.length + 1).padStart(3, '0')}`
        };
        materialRequests.push(newReq);
        return simulateApiCall(newReq);
    }
};
