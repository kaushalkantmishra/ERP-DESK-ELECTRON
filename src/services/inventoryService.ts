import api from './api';
import { GRN, MaterialRequest, StockLevel, StockTransaction } from '../types/models';

const normalizeMaterialRequest = (request: any): MaterialRequest => ({
    ...request,
    items: request.materialRequestItems || request.items || [],
});

export const inventoryService = {
    getGRNs: async (): Promise<GRN[]> => {
        const response = await api.get('/inventory/grns');
        return response.data;
    },
    createGRN: async (grn: any): Promise<GRN> => {
        const response = await api.post('/inventory/grn', grn);
        return response.data;
    },

    getStockLevels: async (): Promise<StockLevel[]> => {
        const response = await api.get('/inventory/stock/levels');
        return response.data;
    },
    getTransactions: async (): Promise<StockTransaction[]> => {
        const response = await api.get('/inventory/stock/transactions');
        return response.data;
    },
    createStockTransaction: async (tx: any): Promise<StockTransaction> => {
        const response = await api.post('/inventory/stock/transaction', tx);
        return response.data;
    },

    getMaterialRequests: async (): Promise<MaterialRequest[]> => {
        const response = await api.get('/inventory/material-requests');
        return response.data.map(normalizeMaterialRequest);
    },
    createMaterialRequest: async (req: any): Promise<MaterialRequest> => {
        const response = await api.post('/inventory/material-request', req);
        return normalizeMaterialRequest(response.data);
    },
    issueMaterialRequest: async (id: string, warehouseId: string): Promise<MaterialRequest> => {
        const response = await api.post(`/inventory/material-requests/${id}/issue`, { warehouseId });
        return normalizeMaterialRequest(response.data);
    },
};
