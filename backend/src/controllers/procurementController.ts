import type { Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import {
    items,
    poItems,
    purchaseOrders,
    purchaseRequisitions,
    prItems,
    quotations,
    quotationItems,
    rfqs,
    rfqVendors,
    stockReservations,
    vendors,
} from '../db/schema.js';
import type { AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../audit.js';
import {
    STRICT_TRANSITIONS,
    assertTransition,
    computeTaxAmounts,
    enforceTolerance,
    generateDocumentNo,
    getSettings,
    normalizeText,
    optimisticVersionUpdate,
    percentVariance,
    roundMoney,
    toDecimal,
    toId,
} from '../erp.js';

function requireUserId(req: AuthRequest): number {
    if (!req.user?.id) throw new Error('Authenticated user is required');
    return req.user.id;
}

async function getActiveItemsByIds(itemIds: number[]) {
    if (itemIds.length === 0) return [];
    return db.select().from(items).where(inArray(items.id, itemIds));
}

function enrichPOLines(po: any) {
    const lines = (po.poItems || []).map((line: any) => {
        const orderedQty = toDecimal(line.orderedQty);
        const receivedQty = toDecimal(line.receivedQty);
        const acceptedQty = toDecimal(line.acceptedQty);
        const invoicedQty = toDecimal(line.invoicedQty);
        const paidQty = toDecimal(line.paidQty);
        const cancelledQty = toDecimal(line.cancelledQty);
        return {
            ...line,
            orderedQty,
            receivedQty,
            acceptedQty,
            invoicedQty,
            paidQty,
            cancelledQty,
            openReceiptQty: roundMoney(Math.max(0, orderedQty - receivedQty - cancelledQty)),
            openInvoiceQty: roundMoney(Math.max(0, acceptedQty - invoicedQty)),
            openPaymentQty: roundMoney(Math.max(0, invoicedQty - paidQty)),
        };
    });
    return { ...po, poItems: lines };
}

export const getPRs = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.purchaseRequisitions.findMany({
            with: {
                prItems: { with: { item: true } },
                requestor: true,
                purchaseOrders: { with: { poItems: true } },
            },
            orderBy: (prs, { desc }) => [desc(prs.date)],
        });

        const enriched = result.map((pr) => {
            const sourcedByItem = new Map<number, number>();
            for (const po of pr.purchaseOrders || []) {
                for (const line of po.poItems || []) {
                    sourcedByItem.set(line.itemId, roundMoney((sourcedByItem.get(line.itemId) || 0) + toDecimal(line.orderedQty)));
                }
            }
            return {
                ...pr,
                prItems: (pr.prItems || []).map((line) => ({
                    ...line,
                    quantity: toDecimal(line.quantity),
                    sourcedQty: sourcedByItem.get(line.itemId) || 0,
                    openQty: roundMoney(Math.max(0, toDecimal(line.quantity) - (sourcedByItem.get(line.itemId) || 0))),
                })),
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching PRs' });
    }
};

export const getPR = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, toId(String(req.params.id), 'purchase requisition id')),
            with: {
                prItems: { with: { item: true } },
                requestor: true,
                purchaseOrders: { with: { poItems: true } },
            },
        });
        if (!result) return res.status(404).json({ message: 'PR not found' });

        const sourcedByItem = new Map<number, number>();
        for (const po of result.purchaseOrders || []) {
            for (const line of po.poItems || []) {
                sourcedByItem.set(line.itemId, roundMoney((sourcedByItem.get(line.itemId) || 0) + toDecimal(line.orderedQty)));
            }
        }

        res.json({
            ...result,
            prItems: (result.prItems || []).map((line) => ({
                ...line,
                quantity: toDecimal(line.quantity),
                sourcedQty: sourcedByItem.get(line.itemId) || 0,
                openQty: roundMoney(Math.max(0, toDecimal(line.quantity) - (sourcedByItem.get(line.itemId) || 0))),
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching PR' });
    }
};

export const createPR = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items: requestItems, status, ...prData } = req.body;

    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        return res.status(400).json({ message: 'PR must contain at least one item' });
    }

    const initialStatus = status === 'Submitted' ? 'Submitted' : 'Draft';

    try {
        const itemIds = [...new Set(requestItems.map((item: any) => toId(item.itemId, 'item id')).filter(Boolean))];
        const masterItems = await getActiveItemsByIds(itemIds);
        const itemMap = new Map(masterItems.map((item) => [item.id, item]));

        for (const line of requestItems) {
            const masterItem = itemMap.get(toId(line.itemId, 'item id'));
            if (!masterItem) return res.status(400).json({ message: `Invalid item ${line.itemId}` });
            if (!masterItem.active) return res.status(400).json({ message: `Item ${masterItem.code} is inactive and cannot be used in a new PR` });
            if (toDecimal(line.quantity) <= 0) return res.status(400).json({ message: 'PR quantity must be greater than zero' });
        }

        const newPR = await db.transaction(async (tx) => {
            const prNo = await generateDocumentNo(tx, 'PR', new Date(prData.date || new Date()));
            const [pr] = await tx.insert(purchaseRequisitions).values({
                ...prData,
                prNo,
                requestorId: prData.requestorId ? toId(prData.requestorId, 'requestor id') : userId,
                status: initialStatus,
                submittedAt: initialStatus === 'Submitted' ? new Date() : null,
            }).returning();

            const insertedLines = await tx.insert(prItems).values(
                requestItems.map((item: any) => ({
                    prId: pr.id,
                    itemId: toId(item.itemId, 'item id'),
                    quantity: Number(item.quantity).toFixed(2),
                    requiredDate: item.requiredDate,
                })),
            ).returning();

            await logActivity(tx, {
                userId,
                action: 'PR_CREATED',
                description: `Purchase requisition ${prNo} created`,
                module: 'Procurement',
                entityType: 'PurchaseRequisition',
                entityId: pr.id,
                afterData: { ...pr, prItems: insertedLines },
                payload: { itemCount: insertedLines.length, initialStatus },
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
    const { status, rejectionReason } = req.body;

    try {
        const pr = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, toId(String(req.params.id), 'purchase requisition id')),
            with: { prItems: true, purchaseOrders: true },
        });
        if (!pr) return res.status(404).json({ message: 'PR not found' });

        assertTransition(pr.status, status, STRICT_TRANSITIONS.PR, 'PR');

        if (status === 'Rejected' && !rejectionReason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        if (status === 'Cancelled') {
            const hasPo = (pr.purchaseOrders || []).some((po) => po.status !== 'Cancelled');
            if (hasPo) return res.status(400).json({ message: 'PR cannot be cancelled after PO creation has started' });
        }

        const patch: Record<string, unknown> = { status };
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
            const updated = await optimisticVersionUpdate(tx, purchaseRequisitions, purchaseRequisitions.id, pr.id, pr.versionNo, patch);

            if (status === 'Approved') {
                const existingReservations = await tx.query.stockReservations.findMany({
                    where: and(eq(stockReservations.sourceType, 'PurchaseRequisition'), eq(stockReservations.sourceId, pr.id)),
                });

                if (existingReservations.length === 0) {
                    await tx.insert(stockReservations).values((pr.prItems || []).map((line) => ({
                        itemId: line.itemId,
                        sourceType: 'PurchaseRequisition',
                        sourceId: pr.id,
                        sourceLineId: line.id,
                        quantity: Number(line.quantity).toFixed(2),
                    })));
                }
            }

            await logActivity(tx, {
                userId,
                action: 'PR_STATUS_UPDATED',
                description: `Purchase requisition ${pr.prNo} moved from ${pr.status} to ${status}`,
                module: 'Procurement',
                entityType: 'PurchaseRequisition',
                entityId: pr.id,
                beforeData: pr,
                afterData: updated,
                payload: { from: pr.status, to: status },
            });
        });

        res.json({ message: 'PR status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating PR status' });
    }
};

export const getRFQs = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.rfqs.findMany({
            with: {
                purchaseRequisition: { with: { prItems: { with: { item: true } } } },
                rfqVendors: { with: { vendor: true } },
                quotations: { with: { vendor: true, quotationItems: { with: { item: true } } } },
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
    const { vendorIds = [], ...rfqData } = req.body;

    try {
        const normalizedPrId = toId(rfqData.prId, 'purchase requisition id');
        const normalizedVendorIds = vendorIds.map((vendorId: unknown) => toId(vendorId as string | number, 'vendor id'));
        const pr = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, normalizedPrId),
            with: { prItems: true },
        });
        if (!pr) return res.status(404).json({ message: 'PR not found' });
        if (pr.status !== 'Approved') return res.status(400).json({ message: 'Only approved PRs can move to RFQ' });
        if (!Array.isArray(vendorIds) || vendorIds.length === 0) return res.status(400).json({ message: 'Select at least one vendor' });

        const invitedVendors = await db.select().from(vendors).where(inArray(vendors.id, normalizedVendorIds));
        if (invitedVendors.length !== normalizedVendorIds.length) return res.status(400).json({ message: 'One or more selected vendors are invalid' });
        if (invitedVendors.some((vendor) => !vendor.active)) return res.status(400).json({ message: 'Inactive vendors cannot be invited to RFQ' });

        const newRFQ = await db.transaction(async (tx) => {
            const rfqNo = await generateDocumentNo(tx, 'RFQ', new Date(rfqData.dueDate || new Date()));
            const [rfq] = await tx.insert(rfqs).values({
                ...rfqData,
                rfqNo,
                status: 'Created',
            }).returning();

            await tx.insert(rfqVendors).values(normalizedVendorIds.map((vendorId: number) => ({ rfqId: rfq.id, vendorId })));

            await logActivity(tx, {
                userId,
                action: 'RFQ_CREATED',
                description: `RFQ ${rfqNo} created for PR ${pr.prNo}`,
                module: 'Procurement',
                entityType: 'RFQ',
                entityId: rfq.id,
                payload: { prId: pr.id, vendorIds: normalizedVendorIds },
            });

            return rfq;
        });

        res.status(201).json(newRFQ);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating RFQ' });
    }
};

export const getQuotes = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.quotations.findMany({
            with: {
                vendor: true,
                rfq: { with: { purchaseRequisition: true } },
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
    const { items: submittedItems, ...quoteData } = req.body;

    if (!Array.isArray(submittedItems) || submittedItems.length === 0) {
        return res.status(400).json({ message: 'Quotation must contain at least one line' });
    }

    try {
        const normalizedRfqId = toId(quoteData.rfqId, 'rfq id');
        const normalizedVendorId = toId(quoteData.vendorId, 'vendor id');
        const rfq = await db.query.rfqs.findFirst({
            where: eq(rfqs.id, normalizedRfqId),
            with: {
                purchaseRequisition: { with: { prItems: true } },
                rfqVendors: true,
            },
        });
        if (!rfq) return res.status(404).json({ message: 'RFQ not found' });
        if (rfq.status === 'Closed') return res.status(400).json({ message: 'RFQ is already closed' });
        if (!(rfq.rfqVendors || []).some((row) => row.vendorId === normalizedVendorId)) {
            return res.status(400).json({ message: 'Vendor is not invited on this RFQ' });
        }

        const itemIds = [...new Set(submittedItems.map((item: any) => toId(item.itemId, 'item id')))];
        const masterItems = await getActiveItemsByIds(itemIds);
        const itemMap = new Map(masterItems.map((item) => [item.id, item]));

        let baseAmount = 0;
        let taxAmount = 0;

        const preparedLines = submittedItems.map((line: any) => {
            const normalizedItemId = toId(line.itemId, 'item id');
            const item = itemMap.get(normalizedItemId);
            if (!item) throw new Error(`Invalid item ${line.itemId}`);
            const qty = toDecimal(line.qty ?? line.quantity);
            const unitPrice = toDecimal(line.unitPrice);
            if (qty <= 0) throw new Error('Quotation quantity must be greater than zero');

            const taxRate = toDecimal(item.taxRate);
            const amounts = computeTaxAmounts(qty, unitPrice, taxRate);
            baseAmount = roundMoney(baseAmount + amounts.baseAmount);
            taxAmount = roundMoney(taxAmount + amounts.taxAmount);

            return {
                itemId: normalizedItemId,
                qty: qty.toFixed(2),
                unitPrice: unitPrice.toFixed(2),
                taxRate: taxRate.toFixed(2),
                baseAmount: amounts.baseAmount.toFixed(2),
                taxAmount: amounts.taxAmount.toFixed(2),
                totalAmount: amounts.totalAmount.toFixed(2),
                priceVariancePct: percentVariance(toDecimal(item.price), unitPrice).toFixed(2),
            };
        });

        const totalAmount = roundMoney(baseAmount + taxAmount);

        const newQuote = await db.transaction(async (tx) => {
            const [quote] = await tx.insert(quotations).values({
                ...quoteData,
                rfqId: normalizedRfqId,
                vendorId: normalizedVendorId,
                currency: quoteData.currency || 'AED',
                baseAmount: baseAmount.toFixed(2),
                taxAmount: taxAmount.toFixed(2),
                totalAmount: totalAmount.toFixed(2),
                status: quoteData.status || 'Pending',
            }).returning();

            const insertedLines = await tx.insert(quotationItems).values(
                preparedLines.map((line) => ({
                    quotationId: quote.id,
                    ...line,
                })),
            ).returning();

            await logActivity(tx, {
                userId,
                action: 'QUOTE_CAPTURED',
                description: `Quotation captured for RFQ ${quote.rfqId}`,
                module: 'Procurement',
                entityType: 'Quotation',
                entityId: quote.id,
                afterData: { ...quote, quotationItems: insertedLines },
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
    const { status } = req.body;

    try {
        const quote = await db.query.quotations.findFirst({ where: eq(quotations.id, toId(String(req.params.id), 'quotation id')) });
        if (!quote) return res.status(404).json({ message: 'Quotation not found' });
        if (!['Pending', 'Accepted', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Invalid quotation status' });
        if (quote.status === status) return res.json({ message: 'Quote status unchanged' });
        if (quote.status !== 'Pending') return res.status(400).json({ message: 'Only pending quotations can be changed' });

        await db.transaction(async (tx) => {
            const [updated] = await tx.update(quotations)
                .set({ status, versionNo: quote.versionNo + 1 })
                .where(and(eq(quotations.id, quote.id), eq(quotations.versionNo, quote.versionNo)))
                .returning();

            if (!updated) throw new Error('Quotation was updated by another user');

            await logActivity(tx, {
                userId,
                action: 'QUOTE_STATUS_UPDATED',
                description: `Quotation moved from ${quote.status} to ${status}`,
                module: 'Procurement',
                entityType: 'Quotation',
                entityId: quote.id,
                beforeData: quote,
                afterData: updated,
                payload: { from: quote.status, to: status },
            });
        });

        res.json({ message: 'Quote status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating quote status' });
    }
};

export const getPOs = async (_req: AuthRequest, res: Response) => {
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
        res.json(result.map(enrichPOLines));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching POs' });
    }
};

export const createPO = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items: requestItems, prId, vendorId, deliveryDate, rfqId, ...poData } = req.body;

    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        return res.status(400).json({ message: 'PO must contain at least one item' });
    }

    try {
        const normalizedVendorId = toId(vendorId, 'vendor id');
        const normalizedPrId = prId ? toId(prId, 'purchase requisition id') : null;
        const normalizedRfqId = rfqId ? toId(rfqId, 'rfq id') : null;
        const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, normalizedVendorId) });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        if (!vendor.active) return res.status(400).json({ message: 'Inactive vendor cannot be used for PO creation' });

        let pr: any = null;
        if (normalizedPrId) {
            pr = await db.query.purchaseRequisitions.findFirst({
                where: eq(purchaseRequisitions.id, normalizedPrId),
                with: { prItems: true },
            });
            if (!pr) return res.status(404).json({ message: 'PR not found' });
            if (pr.status !== 'Approved') return res.status(400).json({ message: 'PO can only be created from an approved PR' });
        }

        const settings = await db.transaction((tx) => getSettings(tx));
        const itemIds = [...new Set(requestItems.map((item: any) => toId(item.itemId, 'item id')).filter(Boolean))];
        const masterItems = await getActiveItemsByIds(itemIds);
        const itemMap = new Map(masterItems.map((item) => [item.id, item]));
        const prItemMap = new Map<number, any>((pr?.prItems || []).map((line: any) => [line.itemId, line]));

        let baseAmount = 0;
        let taxAmount = 0;
        let varianceAlert = false;
        let maxVariancePct = 0;

        const preparedLines = requestItems.map((line: any) => {
            const normalizedItemId = toId(line.itemId, 'item id');
            const item = itemMap.get(normalizedItemId);
            if (!item) throw new Error(`Invalid item ${line.itemId}`);
            if (!item.active) throw new Error(`Inactive item ${item.code} cannot be used on a new PO`);

            const orderedQty = toDecimal(line.orderedQty ?? line.qty);
            const unitPrice = toDecimal(line.unitPrice);
            if (orderedQty <= 0) throw new Error('PO quantity must be greater than zero');

            const prLine = prItemMap.get(normalizedItemId);
            if (prLine) {
                const requestedQty = toDecimal(prLine.quantity);
                enforceTolerance(orderedQty, requestedQty, settings.qtyTolerancePct, `PO quantity for item ${item.code}`, settings.warnOnlyOnTolerance);
            }

            const taxRate = toDecimal(item.taxRate);
            const amounts = computeTaxAmounts(orderedQty, unitPrice, taxRate);
            const variancePct = percentVariance(toDecimal(item.price), unitPrice);
            if (Math.abs(variancePct) > settings.priceVariancePct) varianceAlert = true;
            maxVariancePct = Math.max(maxVariancePct, Math.abs(variancePct));

            baseAmount = roundMoney(baseAmount + amounts.baseAmount);
            taxAmount = roundMoney(taxAmount + amounts.taxAmount);

            return {
                itemId: normalizedItemId,
                orderedQty: orderedQty.toFixed(2),
                unitPrice: unitPrice.toFixed(2),
                taxRate: taxRate.toFixed(2),
                baseAmount: amounts.baseAmount.toFixed(2),
                taxAmount: amounts.taxAmount.toFixed(2),
                totalAmount: amounts.totalAmount.toFixed(2),
                priceVariancePct: variancePct.toFixed(2),
            };
        });

        const totalAmount = roundMoney(baseAmount + taxAmount);

        const newPO = await db.transaction(async (tx) => {
            const poNo = await generateDocumentNo(tx, 'PO', new Date(deliveryDate || new Date()));
            const [po] = await tx.insert(purchaseOrders).values({
                ...poData,
                prId: normalizedPrId,
                rfqId: normalizedRfqId,
                vendorId: normalizedVendorId,
                poNo,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                currency: poData.currency || 'AED',
                baseAmount: baseAmount.toFixed(2),
                taxAmount: taxAmount.toFixed(2),
                totalAmount: totalAmount.toFixed(2),
                priceVariancePct: maxVariancePct.toFixed(2),
                varianceAlert,
                status: 'Draft',
            }).returning();

            const insertedLines = await tx.insert(poItems).values(preparedLines.map((line) => ({
                poId: po.id,
                ...line,
            }))).returning();

            await logActivity(tx, {
                userId,
                action: 'PO_CREATED',
                description: `Purchase order ${poNo} created`,
                module: 'Procurement',
                entityType: 'PurchaseOrder',
                entityId: po.id,
                afterData: { ...po, poItems: insertedLines },
                payload: { prId: normalizedPrId, vendorId: normalizedVendorId, totalAmount, varianceAlert, rfqId: normalizedRfqId },
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
    const { status } = req.body;

    try {
        const po = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, toId(String(req.params.id), 'purchase order id')),
            with: { poItems: true },
        });
        if (!po) return res.status(404).json({ message: 'PO not found' });

        assertTransition(po.status, status, STRICT_TRANSITIONS.PO, 'PO');

        const hasReceipts = (po.poItems || []).some((line) => toDecimal(line.receivedQty) > 0);
        if (status === 'Cancelled' && hasReceipts) {
            return res.status(400).json({ message: 'PO cannot be cancelled after GRN posting has started' });
        }

        if (status === 'Closed') {
            const stillOpen = (po.poItems || []).some((line) => {
                const orderedQty = toDecimal(line.orderedQty);
                const receivedQty = toDecimal(line.receivedQty);
                const cancelledQty = toDecimal(line.cancelledQty);
                return receivedQty + cancelledQty < orderedQty;
            });
            if (stillOpen) return res.status(400).json({ message: 'PO cannot be closed while receipt quantity is still open' });
        }

        const patch: Record<string, unknown> = { status };
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
            const updated = await optimisticVersionUpdate(tx, purchaseOrders, purchaseOrders.id, po.id, po.versionNo, patch);

            await logActivity(tx, {
                userId,
                action: 'PO_STATUS_UPDATED',
                description: `Purchase order ${po.poNo} moved from ${po.status} to ${status}`,
                module: 'Procurement',
                entityType: 'PurchaseOrder',
                entityId: po.id,
                beforeData: po,
                afterData: updated,
                payload: { from: po.status, to: status },
            });
        });

        res.json({ message: 'PO status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating PO status' });
    }
};
