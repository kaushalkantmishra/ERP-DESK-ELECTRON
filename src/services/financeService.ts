import { Invoice } from '../types/models';
import api from './api';

export const financeService = {
    getInvoices: async (): Promise<Invoice[]> => {
        const response = await api.get('/finance/invoices');
        return response.data;
    },
    createInvoice: async (invoice: any): Promise<Invoice> => {
        const response = await api.post('/finance/invoice', invoice);
        return response.data;
    },
    updateInvoiceStatus: async (id: string, status: Invoice['status']): Promise<void> => {
        await api.patch(`/finance/invoice/${id}/status`, { status });
    }
};
