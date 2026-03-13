import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import {
    purchaseRequisitions, prItems,
    rfqs, rfqVendors,
    quotations, quotationItems,
    purchaseOrders, poItems
} from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Purchase Requisitions
export const getPRs = async (req: Request, res: Response) => {
    try {
        const result = await db.query.purchaseRequisitions.findMany({
            with: {
                prItems: {
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
                prItems: {
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
            const [pr] = await tx.insert(purchaseRequisitions).values(prData).returning();
            if (items && items.length > 0) {
                await tx.insert(prItems).values(
                    items.map((item: any) => ({ ...item, prId: pr.id }))
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
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching RFQs' });
    }
};

export const createRFQ = async (req: Request, res: Response) => {
    const { vendorIds, ...rfqData } = req.body;
    try {
        const newRFQ = await db.transaction(async (tx) => {
            const [rfq] = await tx.insert(rfqs).values(rfqData).returning();
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
            const [quote] = await tx.insert(quotations).values(quoteData).returning();
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
            const [po] = await tx.insert(purchaseOrders).values(poData).returning();
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
