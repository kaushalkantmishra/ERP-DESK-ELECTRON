import { Invoice } from '../types/models';
import invoicesData from '../mock-data/invoices.json';
import { simulateApiCall } from './api';

// In-memory state
let invoices: Invoice[] = [...invoicesData] as Invoice[];

export const financeService = {
    getInvoices: async (): Promise<Invoice[]> => simulateApiCall(invoices),
    createInvoice: async (inv: Omit<Invoice, 'id'>): Promise<Invoice> => {
        const newInv = { ...inv, id: `inv${Date.now()}` };
        invoices.push(newInv);
        return simulateApiCall(newInv);
    },
    updateInvoiceStatus: async (id: string, status: Invoice['status']): Promise<Invoice> => {
        const inv = invoices.find(i => i.id === id);
        if (!inv) throw new Error('Invoice not found');
        inv.status = status;
        return simulateApiCall(inv);
    }
};
