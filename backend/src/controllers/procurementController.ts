import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import {
    purchaseRequisitions, prItems,
    rfqs, rfqVendors,
    quotations, quotationItems,
    purchaseOrders, poItems
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId } from '../utils/idGenerator.js';

// Purchase Requisitions
export const getPRs = async (req: Request, res: Response) => {
    try {
        const result = await db.query.purchaseRequisitions.findMany({
            with: {
                items: {
                    with: {
                        item: true
                    }
                },
                requestor: true
            },
            orderBy: (prs, { desc }) => [desc(prs.date)]
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching PRs' });
    }
};

export const getPR = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, id as string),
            with: {
                items: {
                    with: {
                        item: true
                    }
                },
                requestor: true
            }
        });
        if (!result) return res.status(404).json({ message: 'PR not found' });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching PR' });
    }
};

export const createPR = async (req: Request, res: Response) => {
    const { items, ...prData } = req.body;
    try {
        const newPR = await db.transaction(async (tx) => {
            const [pr] = await tx.insert(purchaseRequisitions).values({
                ...prData,
                date: prData.date ? new Date(prData.date) : new Date(),
                prNo: generateId('PR')
            }).returning();
            if (items && items.length > 0) {
                await tx.insert(prItems).values(
                    items.map((item: any) => ({ 
                        ...item, 
                        prId: pr.id,
                        requiredDate: item.requiredDate ? new Date(item.requiredDate) : null
                    }))
                );
            }
            return pr;
        });
        res.status(201).json(newPR);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating PR' });
    }
};

export const updatePRStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.update(purchaseRequisitions)
            .set({ status })
            .where(eq(purchaseRequisitions.id, id as string));
        res.json({ message: 'PR status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating PR status' });
    }
};

// RFQs
export const getRFQs = async (req: Request, res: Response) => {
    try {
        const result = await db.query.rfqs.findMany({
            with: {
                rfqVendors: {
                    with: {
                        vendor: true
                    }
                }
            }
        });
        const formatted = result.map(rfq => ({
            ...rfq,
            vendorIds: rfq.rfqVendors.map((rv: any) => rv.vendorId)
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching RFQs' });
    }
};

export const createRFQ = async (req: Request, res: Response) => {
    const { vendorIds, ...rfqData } = req.body;
    try {
        const newRFQ = await db.transaction(async (tx) => {
            const [rfq] = await tx.insert(rfqs).values({
                ...rfqData,
                createdDate: rfqData.createdDate ? new Date(rfqData.createdDate) : new Date(),
                dueDate: rfqData.dueDate ? new Date(rfqData.dueDate) : null,
                rfqNo: generateId('RFQ'),
                status: 'Open'
            }).returning();
            if (vendorIds && vendorIds.length > 0) {
                await tx.insert(rfqVendors).values(
                    vendorIds.map((vId: string) => ({ rfqId: rfq.id, vendorId: vId }))
                );
            }
            // Update PR status
            await tx.update(purchaseRequisitions)
                .set({ status: 'RFQ Created' })
                .where(eq(purchaseRequisitions.id, rfqData.prId as string));
            return rfq;
        });
        res.status(201).json(newRFQ);
    } catch (error) {
        res.status(500).json({ message: 'Error creating RFQ' });
    }
};

// Quotations
export const getQuotes = async (req: Request, res: Response) => {
    try {
        const result = await db.query.quotations.findMany({
            with: {
                vendor: true,
                quotationItems: {
                    with: {
                        item: true
                    }
                }
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotes' });
    }
};

export const submitQuote = async (req: Request, res: Response) => {
    const { items, ...quoteData } = req.body;
    try {
        const newQuote = await db.transaction(async (tx) => {
            const [quote] = await tx.insert(quotations).values({
                ...quoteData,
                deliveryDate: quoteData.deliveryDate ? new Date(quoteData.deliveryDate) : null,
                submittedDate: quoteData.submittedDate ? new Date(quoteData.submittedDate) : new Date(),
            }).returning();
            if (items && items.length > 0) {
                await tx.insert(quotationItems).values(
                    items.map((item: any) => ({ ...item, quotationId: quote.id }))
                );
            }
            return quote;
        });
        res.status(201).json(newQuote);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting quote' });
    }
};

export const updateQuoteStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.update(quotations)
            .set({ status })
            .where(eq(quotations.id, id as string));
        res.json({ message: 'Quote status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating quote status' });
    }
};

// Purchase Orders
export const getPOs = async (req: Request, res: Response) => {
    try {
        const result = await db.query.purchaseOrders.findMany({
            with: {
                vendor: true,
                poItems: {
                    with: {
                        item: true
                    }
                }
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching POs' });
    }
};

export const createPO = async (req: Request, res: Response) => {
    const { items, ...poData } = req.body;
    try {
        const newPO = await db.transaction(async (tx) => {
            const [po] = await tx.insert(purchaseOrders).values({
                ...poData,
                date: poData.date ? new Date(poData.date) : new Date(),
                deliveryDate: poData.deliveryDate ? new Date(poData.deliveryDate) : null,
                poNo: generateId('PO'),
                status: 'Open'
            }).returning();
            if (items && items.length > 0) {
                await tx.insert(poItems).values(
                    items.map((item: any) => ({ ...item, poId: po.id }))
                );
            }
            return po;
        });
        res.status(201).json(newPO);
    } catch (error) {
        res.status(500).json({ message: 'Error creating PO' });
    }
};

export const updatePOStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.update(purchaseOrders)
            .set({ status })
            .where(eq(purchaseOrders.id, id as string));
        res.json({ message: 'PO status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating PO status' });
    }
};
