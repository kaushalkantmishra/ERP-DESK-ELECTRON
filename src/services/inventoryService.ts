import { GRN, StockLevel, StockTransaction, MaterialRequest } from '../types/models';
import api from './api';

export const inventoryService = {
    // GRNs
    getGRNs: async (): Promise<GRN[]> => {
        const response = await api.get('/inventory/grns');
        return response.data;
    },
    createGRN: async (grn: any): Promise<GRN> => {
        const response = await api.post('/inventory/grn', grn);
        return response.data;
    },

    // Stock
    getStockLevels: async (): Promise<StockLevel[]> => {
        const response = await api.get('/inventory/stock/levels');
        return response.data;
    },
    getTransactions: async (): Promise<StockTransaction[]> => {
        const response = await api.get('/inventory/stock/transactions');
        return response.data;
    },
    addTransaction: async (tx: any): Promise<StockTransaction> => {
        const response = await api.post('/inventory/stock/transaction', tx);
        return response.data;
    },
    createStockTransaction: async (tx: any): Promise<StockTransaction> => {
        const response = await api.post('/inventory/stock/transaction', tx);
        return response.data;
    },
    updateStock: async (itemId: string, warehouseId: string, quantity: number): Promise<void> => {
        // This is usually handled by backend when transactions are created, 
        // but if needed as a direct call:
        await api.patch('/inventory/stock/update', { itemId, warehouseId, quantity });
    },

    // Material Requests
    getMaterialRequests: async (): Promise<MaterialRequest[]> => {
        const response = await api.get('/inventory/material-requests');
        return response.data;
    },
    createMaterialRequest: async (req: Omit<MaterialRequest, 'id' | 'requestNo'>): Promise<MaterialRequest> => {
        const response = await api.post('/inventory/material-request', req);
        return response.data;
    }
};
