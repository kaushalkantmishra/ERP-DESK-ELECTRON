import type { Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import {
    purchaseRequisitions,
    prItems,
    rfqs,
    rfqVendors,
    quotations,
    quotationItems,
    purchaseOrders,
    poItems,
} from '../db/schema.js';
import type { AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../lib/audit.js';
import { assertTransition, poTransitions, prTransitions, roundMoney, toDecimal } from '../lib/workflow.js';

function requireUserId(req: AuthRequest): string {
    if (!req.user?.id) {
        throw new Error('Authenticated user is required');
    }
    return req.user.id;
}

function generateDocumentNo(prefix: string): string {
    return `${prefix}-${Date.now()}`;
}

export const getPRs = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.purchaseRequisitions.findMany({
            with: {
                prItems: { with: { item: true } },
                requestor: true,
            },
            orderBy: (prs, { desc }) => [desc(prs.date)],
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching PRs' });
    }
};

export const getPR = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, id as string),
            with: {
                prItems: { with: { item: true } },
                requestor: true,
            },
        });
        if (!result) return res.status(404).json({ message: 'PR not found' });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching PR' });
    }
};

export const createPR = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items, ...prData } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'PR must contain at least one item' });
    }

    try {
        const newPR = await db.transaction(async (tx) => {
            const [pr] = await tx.insert(purchaseRequisitions).values({
                ...prData,
                prNo: prData.prNo || generateDocumentNo('PR'),
                requestorId: prData.requestorId || userId,
                status: prData.status || 'Draft',
            }).returning();

            await tx.insert(prItems).values(
                items.map((item: any) => ({
                    prId: pr.id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                    requiredDate: item.requiredDate,
                })),
            );

            await logActivity(tx, {
                userId,
                action: 'PR_CREATED',
                description: `Purchase request ${pr.prNo} created`,
                module: 'Procurement',
                entityType: 'PurchaseRequisition',
                entityId: pr.id,
                payload: { itemCount: items.length },
            });

            return pr;
        });

        res.status(201).json(newPR);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error creating PR' });
    }
};

export const updatePRStatus = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    try {
        const pr = await db.query.purchaseRequisitions.findFirst({ where: eq(purchaseRequisitions.id, id as string) });
        if (!pr) {
            return res.status(404).json({ message: 'PR not found' });
        }

        assertTransition(pr.status, status, prTransitions, 'PR');

        if (status === 'Rejected' && !rejectionReason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const patch: Record<string, unknown> = { status, versionNo: pr.versionNo + 1 };
        if (status === 'Submitted') patch.submittedAt = new Date();
        if (status === 'Approved') {
            patch.approvedAt = new Date();
            patch.approvedBy = userId;
        }
        if (status === 'Rejected') {
            patch.rejectedAt = new Date();
            patch.rejectedBy = userId;
            patch.rejectionReason = rejectionReason;
        }
        if (status === 'Closed') patch.closedAt = new Date();
        if (status === 'Cancelled') {
            patch.cancelledAt = new Date();
            patch.cancelledBy = userId;
        }

        await db.transaction(async (tx) => {
            await tx.update(purchaseRequisitions).set(patch).where(eq(purchaseRequisitions.id, id as string));
            await logActivity(tx, {
                userId,
                action: 'PR_STATUS_UPDATED',
                description: `Purchase request ${pr.prNo} moved from ${pr.status} to ${status}`,
                module: 'Procurement',
                entityType: 'PurchaseRequisition',
                entityId: pr.id,
                payload: { from: pr.status, to: status },
            });
        });

        res.json({ message: 'PR status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating PR status' });
    }
};

export const getRFQs = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.rfqs.findMany({
            with: {
                purchaseRequisition: true,
                rfqVendors: { with: { vendor: true } },
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching RFQs' });
    }
};

export const createRFQ = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { vendorIds, ...rfqData } = req.body;

    try {
        const pr = await db.query.purchaseRequisitions.findFirst({ where: eq(purchaseRequisitions.id, rfqData.prId as string) });
        if (!pr) {
            return res.status(404).json({ message: 'PR not found' });
        }
        if (pr.status !== 'Approved') {
            return res.status(400).json({ message: 'Only approved PRs can be sourced' });
        }

        const newRFQ = await db.transaction(async (tx) => {
            const [rfq] = await tx.insert(rfqs).values({
                ...rfqData,
                rfqNo: rfqData.rfqNo || generateDocumentNo('RFQ'),
                status: rfqData.status || 'Created',
            }).returning();

            if (Array.isArray(vendorIds) && vendorIds.length > 0) {
                await tx.insert(rfqVendors).values(
                    vendorIds.map((vendorId: string) => ({ rfqId: rfq.id, vendorId })),
                );
            }

            await logActivity(tx, {
                userId,
                action: 'RFQ_CREATED',
                description: `RFQ ${rfq.rfqNo} created for PR ${pr.prNo}`,
                module: 'Procurement',
                entityType: 'RFQ',
                entityId: rfq.id,
                payload: { prId: pr.id, vendorCount: vendorIds?.length ?? 0 },
            });

            return rfq;
        });

        res.status(201).json(newRFQ);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating RFQ' });
    }
};

export const getQuotes = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.quotations.findMany({
            with: {
                vendor: true,
                rfq: true,
                quotationItems: { with: { item: true } },
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching quotes' });
    }
};

export const submitQuote = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items, ...quoteData } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Quotation must contain at least one line' });
    }

    try {
        const totalAmount = roundMoney(items.reduce((sum: number, item: any) => {
            return sum + (toDecimal(item.qty ?? item.quantity) * toDecimal(item.unitPrice));
        }, 0));

        const newQuote = await db.transaction(async (tx) => {
            const [quote] = await tx.insert(quotations).values({
                ...quoteData,
                totalAmount: quoteData.totalAmount || totalAmount.toFixed(2),
                status: quoteData.status || 'Pending',
            }).returning();

            await tx.insert(quotationItems).values(
                items.map((item: any) => ({
                    quotationId: quote.id,
                    itemId: item.itemId,
                    qty: item.qty ?? item.quantity,
                    unitPrice: item.unitPrice,
                })),
            );

            await logActivity(tx, {
                userId,
                action: 'QUOTE_CAPTURED',
                description: `Quotation captured for RFQ ${quote.rfqId}`,
                module: 'Procurement',
                entityType: 'Quotation',
                entityId: quote.id,
                payload: { totalAmount },
            });

            return quote;
        });

        res.status(201).json(newQuote);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error submitting quote' });
    }
};

export const updateQuoteStatus = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    try {
        const quote = await db.query.quotations.findFirst({ where: eq(quotations.id, id as string) });
        if (!quote) {
            return res.status(404).json({ message: 'Quotation not found' });
        }
        if (quote.status !== 'Pending') {
            return res.status(400).json({ message: 'Only pending quotations can be changed' });
        }
        if (!['Accepted', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid quotation status' });
        }

        await db.transaction(async (tx) => {
            await tx.update(quotations).set({ status }).where(eq(quotations.id, id as string));
            await logActivity(tx, {
                userId,
                action: 'QUOTE_STATUS_UPDATED',
                description: `Quotation moved from ${quote.status} to ${status}`,
                module: 'Procurement',
                entityType: 'Quotation',
                entityId: quote.id,
                payload: { from: quote.status, to: status },
            });
        });

        res.json({ message: 'Quote status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating quote status' });
    }
};

export const getPOs = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.purchaseOrders.findMany({
            with: {
                pr: true,
                vendor: true,
                poItems: { with: { item: true } },
                grns: true,
                invoices: true,
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching POs' });
    }
};

export const createPO = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items, prId, ...poData } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'PO must contain at least one item' });
    }

    try {
        const pr = prId
            ? await db.query.purchaseRequisitions.findFirst({ where: eq(purchaseRequisitions.id, prId as string) })
            : undefined;

        if (pr && pr.status !== 'Approved') {
            return res.status(400).json({ message: 'PO can only be created from an approved PR' });
        }

        const totalAmount = roundMoney(items.reduce((sum: number, item: any) => {
            return sum + (toDecimal(item.orderedQty ?? item.qty) * toDecimal(item.unitPrice));
        }, 0));

        const newPO = await db.transaction(async (tx) => {
            const [po] = await tx.insert(purchaseOrders).values({
                ...poData,
                prId,
                poNo: poData.poNo || generateDocumentNo('PO'),
                totalAmount: poData.totalAmount || totalAmount.toFixed(2),
                status: 'Draft',
            }).returning();

            await tx.insert(poItems).values(
                items.map((item: any) => ({
                    poId: po.id,
                    itemId: item.itemId,
                    orderedQty: item.orderedQty ?? item.qty,
                    unitPrice: item.unitPrice,
                })),
            );

            if (pr) {
                await tx.update(purchaseRequisitions)
                    .set({ status: 'PO Created', versionNo: pr.versionNo + 1 })
                    .where(eq(purchaseRequisitions.id, pr.id));
            }

            await logActivity(tx, {
                userId,
                action: 'PO_CREATED',
                description: `Purchase order ${po.poNo} created`,
                module: 'Procurement',
                entityType: 'PurchaseOrder',
                entityId: po.id,
                payload: { prId, totalAmount },
            });

            return po;
        });

        res.status(201).json(newPO);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating PO' });
    }
};

export const updatePOStatus = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    try {
        const po = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.id, id as string) });
        if (!po) {
            return res.status(404).json({ message: 'PO not found' });
        }

        assertTransition(po.status, status, poTransitions, 'PO');

        const patch: Record<string, unknown> = { status, versionNo: po.versionNo + 1 };
        if (status === 'Issued') {
            patch.issuedAt = new Date();
            patch.issuedBy = userId;
        }
        if (status === 'Closed') patch.closedAt = new Date();
        if (status === 'Cancelled') {
            patch.cancelledAt = new Date();
            patch.cancelledBy = userId;
        }

        await db.transaction(async (tx) => {
            await tx.update(purchaseOrders).set(patch).where(eq(purchaseOrders.id, id as string));
            await logActivity(tx, {
                userId,
                action: 'PO_STATUS_UPDATED',
                description: `Purchase order ${po.poNo} moved from ${po.status} to ${status}`,
                module: 'Procurement',
                entityType: 'PurchaseOrder',
                entityId: po.id,
                payload: { from: po.status, to: status },
            });
        });

        res.json({ message: 'PO status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating PO status' });
    }
};
