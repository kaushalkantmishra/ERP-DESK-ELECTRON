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
import { sendPurchaseOrderEmail, sendRfqInvitationEmail } from '../lib/mailer.js';
import { buildQuotationTemplateWorkbook, parseQuotationTemplateWorkbook } from '../lib/quotationWorkbook.js';

function requireUserId(req: AuthRequest): string | number {
    if (!req.user?.id) throw new Error('Authenticated user is required');
    return req.user.id;
}

function requireUserRole(req: AuthRequest): string {
    if (!req.user?.role) throw new Error('Authenticated user role is required');
    return req.user.role;
}

function canEditPR(pr: any) {
    return ['Draft', 'Rejected'].includes(pr.status);
}

function assertPRActionAllowed(req: AuthRequest, pr: any, nextStatus?: string) {
    const userId = requireUserId(req);
    const role = requireUserRole(req);
    const isOwner = String(pr.requestorId) === String(userId);
    const isApprover = role === 'Admin' || role === 'Procurement';

    if (!nextStatus) {
        if (canEditPR(pr) && (isOwner || isApprover)) return;
        throw new Error('You do not have permission to edit this requisition');
    }

    if (nextStatus === 'Submitted') {
        if (canEditPR(pr) && (isOwner || isApprover)) return;
        throw new Error('Only the request owner or procurement team can submit this requisition');
    }

    if (nextStatus === 'Approved' || nextStatus === 'Rejected' || nextStatus === 'Closed') {
        if (isApprover) return;
        throw new Error(`Only Admin or Procurement can move PR to ${nextStatus}`);
    }

    if (nextStatus === 'Cancelled') {
        if (isApprover) return;
    if (isOwner && ['Draft', 'Submitted', 'Rejected'].includes(pr.status)) return;
        throw new Error('You do not have permission to cancel this requisition');
    }
}

function getAuditUserId(req: AuthRequest): number | undefined {
    const rawUserId = req.user?.id;
    if (rawUserId === null || rawUserId === undefined || rawUserId === '') return undefined;

    const numericUserId = typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        return undefined;
    }

    return numericUserId;
}

function toOptionalDate(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const parsedDate = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date value: ${value}`);
    }
    return parsedDate;
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

function enrichRFQ(rfq: any) {
    return {
        ...rfq,
        rfqVendors: rfq.rfqVendors || [],
        vendorIds: (rfq.rfqVendors || []).map((row: any) => String(row.vendorId)),
        quotations: rfq.quotations || [],
    };
}

function getQuotationImportNotes(source: 'manual' | 'import', lineNotes?: string[]) {
    const notes = source === 'import'
        ? ['Imported from vendor quotation Excel template', ...(lineNotes || []).filter(Boolean)]
        : (lineNotes || []).filter(Boolean);
    return notes.length > 0 ? notes.join(' | ') : undefined;
}

async function createQuotationRecord(params: {
    userId?: number;
    quoteData: any;
    submittedItems: any[];
    source?: 'manual' | 'import';
}) {
    const { userId, quoteData, submittedItems, source = 'manual' } = params;
    const normalizedRfqId = toId(quoteData.rfqId, 'rfq id');
    const normalizedVendorId = toId(quoteData.vendorId, 'vendor id');
    const rfq = await db.query.rfqs.findFirst({
        where: eq(rfqs.id, normalizedRfqId),
        with: {
            purchaseRequisition: { with: { prItems: true } },
            rfqVendors: true,
        },
    });
    if (!rfq) throw new Error('RFQ not found');
    if (rfq.status === 'Closed') throw new Error('RFQ is already closed');
    if (!(rfq.rfqVendors || []).some((row) => row.vendorId === normalizedVendorId)) {
        throw new Error('Vendor is not invited on this RFQ');
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
            notes: line.notes ? String(line.notes).trim() : null,
        };
    });

    const totalAmount = roundMoney(baseAmount + taxAmount);

    return db.transaction(async (tx) => {
        const [quote] = await tx.insert(quotations).values({
            ...quoteData,
            rfqId: normalizedRfqId,
            vendorId: normalizedVendorId,
            currency: quoteData.currency || 'AED',
            baseAmount: baseAmount.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            status: quoteData.status || 'Pending',
            deliveryDate: toOptionalDate(quoteData.deliveryDate) || new Date(),
            notes: getQuotationImportNotes(
                source,
                preparedLines.map((line) => line.notes || undefined).filter((note): note is string => !!note),
            ),
        }).returning();

        const insertedLines = await tx.insert(quotationItems).values(
            preparedLines.map(({ notes, ...line }) => ({
                quotationId: quote.id,
                ...line,
            })),
        ).returning();

        await logActivity(tx, {
            userId,
            action: source === 'import' ? 'QUOTE_IMPORTED' : 'QUOTE_CAPTURED',
            description: `${source === 'import' ? 'Quotation imported' : 'Quotation captured'} for RFQ ${quote.rfqId}`,
            module: 'Procurement',
            entityType: 'Quotation',
            entityId: quote.id,
            afterData: { ...quote, quotationItems: insertedLines },
            payload: { totalAmount, source },
        });

        return quote;
    });
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
    const userId = getAuditUserId(req);
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
            const transactionDate = toOptionalDate(prData.date) || new Date();
            const prNo = await generateDocumentNo(tx, 'PR', transactionDate);
            const [pr] = await tx.insert(purchaseRequisitions).values({
                ...prData,
                prNo,
                date: transactionDate,
                requestorId: prData.requestorId ? toId(prData.requestorId, 'requestor id') : userId ?? null,
                status: initialStatus,
                submittedAt: initialStatus === 'Submitted' ? new Date() : null,
            }).returning();

            const insertedLines = await tx.insert(prItems).values(
                requestItems.map((item: any) => ({
                    prId: pr.id,
                    itemId: toId(item.itemId, 'item id'),
                    quantity: Number(item.quantity).toFixed(2),
                    requiredDate: toOptionalDate(item.requiredDate),
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

export const updatePR = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { items: requestItems, status, ...prData } = req.body;

    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        return res.status(400).json({ message: 'PR must contain at least one item' });
    }

    try {
        const pr = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, toId(String(req.params.id), 'purchase requisition id')),
            with: { prItems: true },
        });
        if (!pr) return res.status(404).json({ message: 'PR not found' });

        assertPRActionAllowed(req, pr);

        const nextStatus = status === 'Submitted' ? 'Submitted' : 'Draft';
        if (pr.status === 'Rejected' && nextStatus === 'Draft') {
            throw new Error('Rejected PRs must be resubmitted, not saved as draft');
        }

        const itemIds = [...new Set(requestItems.map((item: any) => toId(item.itemId, 'item id')).filter(Boolean))];
        const masterItems = await getActiveItemsByIds(itemIds);
        const itemMap = new Map(masterItems.map((item) => [item.id, item]));

        for (const line of requestItems) {
            const masterItem = itemMap.get(toId(line.itemId, 'item id'));
            if (!masterItem) return res.status(400).json({ message: `Invalid item ${line.itemId}` });
            if (!masterItem.active) return res.status(400).json({ message: `Item ${masterItem.code} is inactive and cannot be used on this PR` });
            if (toDecimal(line.quantity) <= 0) return res.status(400).json({ message: 'PR quantity must be greater than zero' });
        }

        const updatedPR = await db.transaction(async (tx) => {
            const patch: Record<string, unknown> = {
                department: prData.department,
                priority: prData.priority,
                justification: prData.justification,
                date: toOptionalDate(prData.date) || pr.date,
                status: nextStatus,
                submittedAt: nextStatus === 'Submitted' ? new Date() : null,
                rejectedAt: nextStatus === 'Submitted' ? null : pr.rejectedAt,
                rejectedBy: nextStatus === 'Submitted' ? null : pr.rejectedBy,
                rejectionReason: nextStatus === 'Submitted' ? null : pr.rejectionReason,
                approvedAt: null,
                approvedBy: null,
            };

            const updated = await optimisticVersionUpdate(tx, purchaseRequisitions, purchaseRequisitions.id, pr.id, pr.versionNo, patch);

            await tx.delete(prItems).where(eq(prItems.prId, pr.id));
            const insertedLines = await tx.insert(prItems).values(
                requestItems.map((item: any) => ({
                    prId: pr.id,
                    itemId: toId(item.itemId, 'item id'),
                    quantity: Number(item.quantity).toFixed(2),
                    requiredDate: toOptionalDate(item.requiredDate),
                })),
            ).returning();

            await logActivity(tx, {
                userId,
                action: 'PR_UPDATED',
                description: `Purchase requisition ${pr.prNo} updated`,
                module: 'Procurement',
                entityType: 'PurchaseRequisition',
                entityId: pr.id,
                beforeData: pr,
                afterData: { ...updated, prItems: insertedLines },
                payload: { itemCount: insertedLines.length, status: nextStatus },
            });

            return { ...updated, prItems: insertedLines };
        });

        res.json(updatedPR);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating PR' });
    }
};

export const updatePRStatus = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { status, rejectionReason } = req.body;

    try {
        const pr = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, toId(String(req.params.id), 'purchase requisition id')),
            with: { prItems: true, purchaseOrders: true },
        });
        if (!pr) return res.status(404).json({ message: 'PR not found' });

        assertPRActionAllowed(req, pr, status);
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
            patch.approvedBy = userId ?? null;
        }
        if (status === 'Rejected') {
            patch.rejectedAt = new Date();
            patch.rejectedBy = userId ?? null;
            patch.rejectionReason = rejectionReason;
        }
        if (status === 'Closed') patch.closedAt = new Date();
        if (status === 'Cancelled') {
            patch.cancelledAt = new Date();
            patch.cancelledBy = userId ?? null;
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
        res.json(result.map(enrichRFQ));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching RFQs' });
    }
};

export const getRFQ = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.rfqs.findFirst({
            where: eq(rfqs.id, toId(String(req.params.id), 'rfq id')),
            with: {
                purchaseRequisition: { with: { requestor: true, prItems: { with: { item: true } } } },
                rfqVendors: { with: { vendor: true } },
                quotations: { with: { vendor: true, quotationItems: { with: { item: true } } } },
            },
        });

        if (!result) return res.status(404).json({ message: 'RFQ not found' });

        res.json(enrichRFQ(result));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching RFQ' });
    }
};

export const createRFQ = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { vendorIds = [], ...rfqData } = req.body;

    try {
        const normalizedPrId = toId(rfqData.prId, 'purchase requisition id');
        const normalizedVendorIds = vendorIds.map((vendorId: unknown) => toId(vendorId as string | number, 'vendor id'));
        const pr = await db.query.purchaseRequisitions.findFirst({
            where: eq(purchaseRequisitions.id, normalizedPrId),
            with: { prItems: { with: { item: true } }, requestor: true },
        });
        if (!pr) return res.status(404).json({ message: 'PR not found' });
        if (pr.status !== 'Approved') return res.status(400).json({ message: 'Only approved PRs can move to RFQ' });
        if (!Array.isArray(vendorIds) || vendorIds.length === 0) return res.status(400).json({ message: 'Select at least one vendor' });

        const invitedVendors = await db.select().from(vendors).where(inArray(vendors.id, normalizedVendorIds));
        if (invitedVendors.length !== normalizedVendorIds.length) return res.status(400).json({ message: 'One or more selected vendors are invalid' });
        if (invitedVendors.some((vendor) => !vendor.active)) return res.status(400).json({ message: 'Inactive vendors cannot be invited to RFQ' });

        const newRFQ = await db.transaction(async (tx) => {
            const dueDate = toOptionalDate(rfqData.dueDate);
            const rfqNo = await generateDocumentNo(tx, 'RFQ', dueDate || new Date());
            const [rfq] = await tx.insert(rfqs).values({
                ...rfqData,
                rfqNo,
                dueDate,
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

            return {
                ...rfq,
                dueDate,
                rfqVendors: normalizedVendorIds.map((vendorId: number) => ({
                    vendorId,
                    vendor: invitedVendors.find((vendor) => vendor.id === vendorId),
                })),
            };
        });

        const emailResults = await Promise.all(
            invitedVendors.map(async (vendor) => {
                try {
                    const attachmentBuffer = Buffer.from(await buildQuotationTemplateWorkbook({
                        rfqId: newRFQ.id,
                        rfqNo: newRFQ.rfqNo,
                        prNo: pr.prNo,
                        prDate: pr.date,
                        department: pr.department,
                        requestedBy: pr.requestor?.name || String(pr.requestorId || ''),
                        priority: pr.priority,
                        justification: pr.justification,
                        dueDate: newRFQ.dueDate,
                        vendorId: vendor.id,
                        vendorName: vendor.name,
                        lines: (pr.prItems || []).map((line) => ({
                            itemId: line.itemId,
                            itemCode: line.item?.code,
                            itemName: line.item?.name || `Item ${line.itemId}`,
                            uom: null,
                            requestedQty: toDecimal(line.quantity),
                            openQty: toDecimal(line.quantity),
                            requiredDate: line.requiredDate,
                            taxRate: toDecimal(line.item?.taxRate),
                        })),
                    }));
                    const result = await sendRfqInvitationEmail({
                        rfqNo: newRFQ.rfqNo,
                        rfqId: newRFQ.id,
                        prNo: pr.prNo,
                        dueDate: newRFQ.dueDate,
                        vendor,
                        attachment: {
                            filename: `${newRFQ.rfqNo}-${vendor.name.replace(/[^a-z0-9]+/gi, '_')}-quotation-template.xlsx`,
                            content: attachmentBuffer,
                        },
                    });
                    return { vendorId: vendor.id, vendorName: vendor.name, ...result };
                } catch (error: any) {
                    return {
                        vendorId: vendor.id,
                        vendorName: vendor.name,
                        sent: false,
                        skipped: false,
                        reason: error?.message || 'Failed to send email',
                    };
                }
            }),
        );

        const sentCount = emailResults.filter((result) => result.sent).length;
        const failed = emailResults.filter((result) => !result.sent);

        let finalRFQ = newRFQ;
        if (sentCount > 0) {
            const [updatedRfq] = await db.update(rfqs)
                .set({ status: 'Sent' })
                .where(eq(rfqs.id, newRFQ.id))
                .returning();

            if (updatedRfq) {
                finalRFQ = { ...finalRFQ, status: updatedRfq.status };
            }
        }

        res.status(201).json({
            ...enrichRFQ(finalRFQ),
            emailSummary: {
                invitedCount: invitedVendors.length,
                sentCount,
                failedCount: failed.length,
                failed,
            },
        });
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
    const userId = getAuditUserId(req);
    const { items: submittedItems, ...quoteData } = req.body;

    if (!Array.isArray(submittedItems) || submittedItems.length === 0) {
        return res.status(400).json({ message: 'Quotation must contain at least one line' });
    }

    try {
        const newQuote = await createQuotationRecord({
            userId,
            quoteData,
            submittedItems,
            source: 'manual',
        });

        res.status(201).json(newQuote);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error submitting quote' });
    }
};

export const importQuote = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);

    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ message: 'Quotation file is required' });
        }

        const imported = await parseQuotationTemplateWorkbook(req.file.buffer);
        const quote = await createQuotationRecord({
            userId,
            quoteData: {
                rfqId: imported.rfqId,
                vendorId: imported.vendorId,
                deliveryDate: imported.deliveryDate,
                status: 'Pending',
            },
            submittedItems: imported.items,
            source: 'import',
        });

        res.status(201).json(quote);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error importing quotation' });
    }
};

export const updateQuoteStatus = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
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

export const getPO = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, toId(String(req.params.id), 'purchase order id')),
            with: {
                pr: { with: { requestor: true, prItems: { with: { item: true } } } },
                vendor: true,
                poItems: { with: { item: true } },
                grns: { with: { warehouse: true, grnItems: { with: { item: true } } } },
                invoices: { with: { vendor: true, invoiceLines: { with: { item: true } } } },
            },
        });

        if (!result) return res.status(404).json({ message: 'PO not found' });

        res.json(enrichPOLines(result));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching PO' });
    }
};

export const createPO = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { items: requestItems, prId, vendorId, deliveryDate, rfqId, quotationId, ...poData } = req.body;

    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        return res.status(400).json({ message: 'PO must contain at least one item' });
    }

    try {
        const normalizedVendorId = toId(vendorId, 'vendor id');
        let normalizedPrId = prId ? toId(prId, 'purchase requisition id') : null;
        const normalizedRfqId = rfqId ? toId(rfqId, 'rfq id') : null;
        const normalizedQuotationId = quotationId ? toId(quotationId, 'quotation id') : null;
        const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, normalizedVendorId) });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        if (!vendor.active) return res.status(400).json({ message: 'Inactive vendor cannot be used for PO creation' });

        let quotation: any = null;
        if (normalizedQuotationId) {
            quotation = await db.query.quotations.findFirst({
                where: eq(quotations.id, normalizedQuotationId),
                with: { quotationItems: { with: { item: true } }, rfq: { with: { purchaseRequisition: true } }, vendor: true },
            });
            if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
            if (quotation.vendorId !== normalizedVendorId) return res.status(400).json({ message: 'Quotation vendor does not match selected vendor' });
            if (normalizedRfqId && quotation.rfqId !== normalizedRfqId) return res.status(400).json({ message: 'Quotation RFQ does not match selected RFQ' });
            if (!normalizedPrId) {
                normalizedPrId = quotation.rfq?.purchaseRequisition?.id || quotation.rfq?.prId || null;
            }
        }

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

        const poEmailItems = preparedLines.map((line) => ({
            itemCode: itemMap.get(line.itemId)?.code,
            itemName: itemMap.get(line.itemId)?.name || `Item ${line.itemId}`,
            quantity: toDecimal(line.orderedQty),
            unitPrice: toDecimal(line.unitPrice),
            taxRate: toDecimal(line.taxRate),
            totalAmount: toDecimal(line.totalAmount),
        }));

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
                payload: { prId: normalizedPrId, vendorId: normalizedVendorId, totalAmount, varianceAlert, rfqId: normalizedRfqId, quotationId: normalizedQuotationId },
            });

            return po;
        });

        const poDeliveryDate = deliveryDate ? new Date(deliveryDate) : null;
        try {
            await sendPurchaseOrderEmail({
                poNo: newPO.poNo,
                vendor,
                prNo: pr?.prNo || null,
                rfqNo: quotation?.rfq?.rfqNo || null,
                quotationId: normalizedQuotationId,
                requestConfirmation: !!normalizedQuotationId,
                deliveryDate: poDeliveryDate,
                totalAmount,
                items: poEmailItems,
            });
        } catch (emailError) {
            console.error('Failed to send purchase order email:', emailError);
        }

        res.status(201).json(newPO);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating PO' });
    }
};

export const updatePOStatus = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
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
            patch.issuedBy = userId ?? null;
        }
        if (status === 'Closed') patch.closedAt = new Date();
        if (status === 'Cancelled') {
            patch.cancelledAt = new Date();
            patch.cancelledBy = userId ?? null;
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
