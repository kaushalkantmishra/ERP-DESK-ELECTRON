import api from './api';
import { Invoice, InvoiceStatus, Payment } from '../types/models';
import type { StatusUpdateResponse } from './procurementService';

export const financeService = {
    getInvoices: async (): Promise<Invoice[]> => {
        const response = await api.get('/finance/invoices');
        return response.data;
    },
    getInvoice: async (id: string): Promise<Invoice> => {
        const response = await api.get(`/finance/invoice/${id}`);
        return response.data;
    },
    createInvoice: async (invoice: any): Promise<Invoice> => {
        const response = await api.post('/finance/invoice', invoice);
        return response.data;
    },
    updateInvoiceStatus: async (id: string, status: InvoiceStatus): Promise<StatusUpdateResponse> => {
        const response = await api.patch(`/finance/invoice/${id}/status`, { status });
        return response.data;
    },
    getPayments: async (): Promise<Payment[]> => {
        const response = await api.get('/finance/payments');
        return response.data;
    },
    getPayment: async (id: string): Promise<Payment> => {
        const response = await api.get(`/finance/payment/${id}`);
        return response.data;
    },
    createPayment: async (payment: any): Promise<Payment> => {
        const response = await api.post('/finance/payment', payment);
        return response.data;
    },
};
