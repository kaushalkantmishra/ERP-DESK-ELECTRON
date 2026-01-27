import { PurchaseRequisition, RFQ, Quotation, PurchaseOrder, PRStatus } from '../types/models';
import prData from '../mock-data/pr.json';
import rfqData from '../mock-data/rfq.json';
import quotesData from '../mock-data/quotes.json';
import posData from '../mock-data/po.json';
import { simulateApiCall } from './api';

// In-memory state
let prs: PurchaseRequisition[] = [...prData] as PurchaseRequisition[];
let rfqs: RFQ[] = [...rfqData] as RFQ[];
let quotes: Quotation[] = [...quotesData] as Quotation[];
let pos: PurchaseOrder[] = [...posData] as PurchaseOrder[];

export const procurementService = {
    // PR
    getPRs: async (): Promise<PurchaseRequisition[]> => simulateApiCall(prs),
    getPRById: async (id: string): Promise<PurchaseRequisition | undefined> => simulateApiCall(prs.find(p => p.id === id)),
    createPR: async (pr: Omit<PurchaseRequisition, 'id' | 'prNo'>): Promise<PurchaseRequisition> => {
        const newPR = {
            ...pr,
            id: `pr${Date.now()}`,
            prNo: `PR-${new Date().getFullYear()}-${String(prs.length + 1).padStart(3, '0')}`
        };
        prs.unshift(newPR);
        return simulateApiCall(newPR);
    },
    updatePRStatus: async (id: string, status: PRStatus): Promise<PurchaseRequisition> => {
        const pr = prs.find(p => p.id === id);
        if (!pr) throw new Error('PR not found');
        pr.status = status;
        return simulateApiCall(pr);
    },

    // RFQ
    getRFQs: async (): Promise<RFQ[]> => simulateApiCall(rfqs),
    createRFQ: async (rfq: Omit<RFQ, 'id' | 'rfqNo'>): Promise<RFQ> => {
        const newRFQ = {
            ...rfq,
            id: `rfq${Date.now()}`,
            rfqNo: `RFQ-${new Date().getFullYear()}-${String(rfqs.length + 1).padStart(3, '0')}`
        };
        rfqs.push(newRFQ);
        
        // Update Linked PR
        const pr = prs.find(p => p.id === rfq.prId);
        if (pr) pr.status = 'RFQ Created';

        return simulateApiCall(newRFQ);
    },

    // Quotations
    getQuotes: async (): Promise<Quotation[]> => simulateApiCall(quotes),
    submitQuote: async (quote: Omit<Quotation, 'id'>): Promise<Quotation> => {
        const newQuote = { ...quote, id: `qt${Date.now()}` };
        quotes.push(newQuote);
        return simulateApiCall(newQuote);
    },
    updateQuoteStatus: async (id: string, status: Quotation['status']): Promise<Quotation> => {
        const quote = quotes.find(q => q.id === id);
        if (!quote) throw new Error('Quote not found');
        quote.status = status;
        return simulateApiCall(quote);
    },

    // PO
    getPOs: async (): Promise<PurchaseOrder[]> => simulateApiCall(pos),
    createPO: async (po: Omit<PurchaseOrder, 'id' | 'poNo'>): Promise<PurchaseOrder> => {
        const newPO = {
            ...po,
            id: `po${Date.now()}`,
            poNo: `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`
        };
        pos.push(newPO);
        return simulateApiCall(newPO);
    },
    updatePOStatus: async (id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder> => {
        const po = pos.find(p => p.id === id);
        if (!po) throw new Error('PO not found');
        po.status = status;
        return simulateApiCall(po);
    }
};
