import api from './api';
import { PurchaseOrder, PurchaseRequisition, PRStatus, POStatus, Quotation, RFQ } from '../types/models';

export interface StatusUpdateResponse {
    message: string;
    pendingApproval?: boolean;
}

export const procurementService = {
    getPRs: async (): Promise<PurchaseRequisition[]> => {
        const response = await api.get('/procurement/prs');
        return response.data;
    },
    getPR: async (id: string): Promise<PurchaseRequisition> => {
        const response = await api.get(`/procurement/prs/${id}`);
        return response.data;
    },
    createPR: async (pr: any): Promise<PurchaseRequisition> => {
        const response = await api.post('/procurement/prs', pr);
        return response.data;
    },
    updatePR: async (id: string, pr: any): Promise<PurchaseRequisition> => {
        const response = await api.patch(`/procurement/prs/${id}`, pr);
        return response.data;
    },
    updatePRStatus: async (id: string, status: PRStatus, rejectionReason?: string): Promise<StatusUpdateResponse> => {
        const response = await api.patch(`/procurement/prs/${id}/status`, { status, rejectionReason });
        return response.data;
    },

    getRFQs: async (): Promise<RFQ[]> => {
        const response = await api.get('/procurement/rfqs');
        return response.data;
    },
    getRFQ: async (id: string): Promise<RFQ> => {
        const response = await api.get(`/procurement/rfqs/${id}`);
        return response.data;
    },
    createRFQ: async (rfq: any): Promise<RFQ> => {
        const response = await api.post('/procurement/rfqs', rfq);
        return response.data;
    },

    getQuotes: async (): Promise<Quotation[]> => {
        const response = await api.get('/procurement/quotes');
        return response.data;
    },
    submitQuote: async (quote: any): Promise<Quotation> => {
        const response = await api.post('/procurement/quotes', quote);
        return response.data;
    },
    importQuote: async (file: File): Promise<Quotation> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/procurement/quotes/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    updateQuoteStatus: async (id: string, status: 'Pending' | 'Accepted' | 'Rejected'): Promise<void> => {
        await api.patch(`/procurement/quotes/${id}/status`, { status });
    },

    getPOs: async (): Promise<PurchaseOrder[]> => {
        const response = await api.get('/procurement/pos');
        return response.data;
    },
    getPO: async (id: string): Promise<PurchaseOrder> => {
        const response = await api.get(`/procurement/pos/${id}`);
        return response.data;
    },
    createPO: async (po: any): Promise<PurchaseOrder> => {
        const response = await api.post('/procurement/pos', po);
        return response.data;
    },
    updatePOStatus: async (id: string, status: POStatus): Promise<StatusUpdateResponse> => {
        const response = await api.patch(`/procurement/pos/${id}/status`, { status });
        return response.data;
    },
};
