import type { Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import {
    invoiceLines,
    invoices,
    paymentAllocations,
    payments,
    poItems,
    purchaseOrders,
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
    optimisticVersionUpdate,
    percentVariance,
    roundMoney,
    toDecimal,
    toId,
} from '../erp.js';

function requireUserId(req: AuthRequest): string | number {
    if (!req.user?.id) throw new Error('Authenticated user is required');
    return req.user.id;
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

function enrichInvoice(invoice: any) {
    const amount = toDecimal(invoice.amount);
    const paidAmount = toDecimal(invoice.paidAmount);
    const balanceAmount = toDecimal(invoice.balanceAmount);
    return {
        ...invoice,
        amount,
        paidAmount,
        balanceAmount,
        openPaymentAmount: roundMoney(Math.max(0, balanceAmount)),
    };
}

export const getInvoices = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.invoices.findMany({
            with: {
                vendor: true,
                po: { with: { poItems: { with: { item: true } } } },
                invoiceLines: { with: { item: true, poItem: true } },
                paymentAllocations: true,
            },
        });
        res.json(result.map(enrichInvoice));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching invoices' });
    }
};

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, toId(String(req.params.id), 'invoice id')),
            with: {
                vendor: true,
                po: { with: { poItems: { with: { item: true } } } },
                invoiceLines: { with: { item: true, poItem: true } },
                paymentAllocations: { with: { invoice: true } },
            },
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(enrichInvoice(invoice));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching invoice' });
    }
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { lines, poId, vendorId, amount, ...invoiceData } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ message: 'Invoice must contain at least one line' });
    }

    try {
        const normalizedPoId = toId(poId, 'purchase order id');
        const normalizedVendorId = toId(vendorId, 'vendor id');
        const po = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, normalizedPoId),
            with: { poItems: { with: { item: true } }, grns: true },
        });
        if (!po) return res.status(404).json({ message: 'PO not found' });
        if (po.vendorId !== normalizedVendorId) return res.status(400).json({ message: 'Invoice vendor must match PO vendor' });
        if (!['Partially Received', 'Fully Received', 'Closed'].includes(po.status)) {
            return res.status(400).json({ message: 'Invoice can only be entered after goods receipt activity has started' });
        }
        if ((po.grns || []).length === 0) {
            return res.status(400).json({ message: 'Invoice cannot be entered before GRN exists' });
        }

        const settings = await db.transaction((tx) => getSettings(tx));
        const poItemMap = new Map((po.poItems || []).map((line) => [line.id, line]));
        const matchWarnings: string[] = [];

        let baseAmount = 0;
        let taxAmount = 0;

        const preparedLines = lines.map((line: any) => {
            const normalizedPoItemId = toId(line.poItemId, 'purchase order item id');
            const poLine = poItemMap.get(normalizedPoItemId);
            if (!poLine) throw new Error('Invoice line references an invalid PO line');

            const lineQty = toDecimal(line.quantity);
            const unitPrice = toDecimal(line.unitPrice);
            const acceptedQty = toDecimal(poLine.acceptedQty);
            const invoicedQty = toDecimal(poLine.invoicedQty);
            const openInvoiceQty = roundMoney(acceptedQty - invoicedQty);
            if (lineQty <= 0) throw new Error('Invoice quantity must be greater than zero');
            const toleranceResult = enforceTolerance(lineQty, openInvoiceQty, settings.qtyTolerancePct, `Invoice quantity for ${poLine.item?.code || poLine.itemId}`, settings.warnOnlyOnTolerance);
            if (toleranceResult.message) matchWarnings.push(toleranceResult.message);

            const priceVariancePct = percentVariance(toDecimal(poLine.unitPrice), unitPrice);
            if (Math.abs(priceVariancePct) > settings.priceVariancePct) {
                matchWarnings.push(`Invoice unit price variance exceeded threshold for ${poLine.item?.code || poLine.itemId}`);
            }

            const taxRate = toDecimal(poLine.taxRate);
            const amounts = computeTaxAmounts(lineQty, unitPrice, taxRate);
            baseAmount = roundMoney(baseAmount + amounts.baseAmount);
            taxAmount = roundMoney(taxAmount + amounts.taxAmount);

            return {
                poItemId: poLine.id,
                itemId: poLine.itemId,
                quantity: lineQty.toFixed(2),
                unitPrice: unitPrice.toFixed(2),
                taxRate: taxRate.toFixed(2),
                baseAmount: amounts.baseAmount.toFixed(2),
                taxAmount: amounts.taxAmount.toFixed(2),
                totalAmount: amounts.totalAmount.toFixed(2),
                lineAmount: amounts.totalAmount.toFixed(2),
            };
        });

        const invoiceTotal = roundMoney(baseAmount + taxAmount);
        const requestedAmount = roundMoney(toDecimal(amount ?? invoiceTotal));
        if (requestedAmount !== invoiceTotal) {
            return res.status(400).json({ message: 'Invoice amount must equal the sum of invoice lines including VAT' });
        }

        const newInvoice = await db.transaction(async (tx) => {
            const invoiceDate = toOptionalDate(invoiceData.date) || new Date();
            const dueDate = toOptionalDate(invoiceData.dueDate);
            const invoiceNo = await generateDocumentNo(tx, 'INV', invoiceDate);
            const [invoice] = await tx.insert(invoices).values({
                ...invoiceData,
                invoiceNo,
                vendorInvoiceNo: invoiceData.vendorInvoiceNo || invoiceNo,
                poId: normalizedPoId,
                vendorId: normalizedVendorId,
                date: invoiceDate,
                dueDate,
                currency: invoiceData.currency || 'AED',
                baseAmount: baseAmount.toFixed(2),
                taxAmount: taxAmount.toFixed(2),
                amount: requestedAmount.toFixed(2),
                matchedAmount: invoiceTotal.toFixed(2),
                paidAmount: '0.00',
                balanceAmount: requestedAmount.toFixed(2),
                matchWarnings: matchWarnings.length > 0 ? matchWarnings : null,
                status: 'Matched',
                enteredBy: userId ?? null,
            }).returning();

            const insertedLines = [];
            for (const preparedLine of preparedLines) {
                const [insertedLine] = await tx.insert(invoiceLines).values({
                    invoiceId: invoice.id,
                    ...preparedLine,
                }).returning();
                insertedLines.push(insertedLine);

                const poLine = poItemMap.get(preparedLine.poItemId)!;
                await tx.update(poItems).set({
                    invoicedQty: roundMoney(toDecimal(poLine.invoicedQty) + toDecimal(preparedLine.quantity)).toFixed(2),
                }).where(eq(poItems.id, poLine.id));
            }

            await logActivity(tx, {
                userId,
                action: 'INVOICE_CREATED',
                description: `Invoice ${invoiceNo} entered against PO ${po.poNo}`,
                module: 'Finance',
                entityType: 'Invoice',
                entityId: invoice.id,
                afterData: { ...invoice, invoiceLines: insertedLines },
                payload: { poId: normalizedPoId, vendorId: normalizedVendorId, amount: requestedAmount, matchWarnings },
            });

            return invoice;
        });

        res.status(201).json(newInvoice);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating invoice' });
    }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { status } = req.body;

    try {
        const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, toId(String(req.params.id), 'invoice id')),
            with: { invoiceLines: true },
        });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        assertTransition(invoice.status, status, STRICT_TRANSITIONS.Invoice, 'Invoice');

        if (status === 'Cancelled' && toDecimal(invoice.paidAmount) > 0) {
            return res.status(400).json({ message: 'Paid or partially paid invoices cannot be cancelled' });
        }

        const patch: Record<string, unknown> = { status };
        if (status === 'Approved') {
            patch.approvedAt = new Date();
            patch.approvedBy = userId ?? null;
        }

        await db.transaction(async (tx) => {
            const updated = await optimisticVersionUpdate(tx, invoices, invoices.id, invoice.id, invoice.versionNo, patch);

            if (status === 'Cancelled') {
                for (const line of invoice.invoiceLines || []) {
                    const poLine = await tx.query.poItems.findFirst({ where: eq(poItems.id, line.poItemId) });
                    if (!poLine) continue;
                    await tx.update(poItems).set({
                        invoicedQty: roundMoney(toDecimal(poLine.invoicedQty) - toDecimal(line.quantity)).toFixed(2),
                    }).where(eq(poItems.id, poLine.id));
                }
            }

            await logActivity(tx, {
                userId,
                action: 'INVOICE_STATUS_UPDATED',
                description: `Invoice ${invoice.invoiceNo} moved from ${invoice.status} to ${status}`,
                module: 'Finance',
                entityType: 'Invoice',
                entityId: invoice.id,
                beforeData: invoice,
                afterData: updated,
                payload: { from: invoice.status, to: status },
            });
        });

        res.json({ message: 'Invoice status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating invoice status' });
    }
};

export const getPayments = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.payments.findMany({
            with: {
                vendor: true,
                paymentAllocations: { with: { invoice: true } },
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' });
    }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
    try {
        const payment = await db.query.payments.findFirst({
            where: eq(payments.id, toId(String(req.params.id), 'payment id')),
            with: {
                vendor: true,
                paymentAllocations: {
                    with: {
                        invoice: {
                            with: {
                                vendor: true,
                                po: true,
                            },
                        },
                    },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json(payment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching payment' });
    }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
    const userId = getAuditUserId(req);
    const { allocations, vendorId, amount, method, ...paymentData } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({ message: 'Payment must contain at least one allocation' });
    }

    try {
        const paymentAmount = roundMoney(toDecimal(amount));
        const allocationTotal = roundMoney(allocations.reduce((sum: number, allocation: any) => sum + toDecimal(allocation.allocatedAmount), 0));
        if (paymentAmount !== allocationTotal) {
            return res.status(400).json({ message: 'Payment amount must equal allocation total' });
        }
        const normalizedVendorId = toId(vendorId, 'vendor id');

        const newPayment = await db.transaction(async (tx) => {
            const paymentDate = toOptionalDate(paymentData.paymentDate) || new Date();
            const paymentNo = await generateDocumentNo(tx, 'PAY', paymentDate);
            const [payment] = await tx.insert(payments).values({
                ...paymentData,
                paymentNo,
                vendorId: normalizedVendorId,
                paymentDate,
                baseAmount: paymentAmount.toFixed(2),
                taxAmount: '0.00',
                totalAmount: paymentAmount.toFixed(2),
                amount: paymentAmount.toFixed(2),
                method,
                status: 'Posted',
                createdBy: userId ?? null,
                postedAt: new Date(),
                postedBy: userId ?? null,
            }).returning();

            for (const allocation of allocations) {
                const invoice = await tx.query.invoices.findFirst({
                    where: and(eq(invoices.id, toId(allocation.invoiceId, 'invoice id')), eq(invoices.vendorId, normalizedVendorId)),
                    with: { invoiceLines: true },
                });
                if (!invoice) throw new Error('Allocation references an invalid invoice for this vendor');
                if (!['Approved', 'Partially Paid'].includes(invoice.status)) throw new Error(`Invoice ${invoice.invoiceNo} is not ready for payment`);

                const allocatedAmount = toDecimal(allocation.allocatedAmount);
                const currentPaid = toDecimal(invoice.paidAmount);
                const currentBalance = toDecimal(invoice.balanceAmount);
                if (allocatedAmount <= 0) throw new Error('Allocated amount must be greater than zero');
                if (allocatedAmount > currentBalance) throw new Error(`Allocation exceeds remaining balance for invoice ${invoice.invoiceNo}`);

                await tx.insert(paymentAllocations).values({
                    paymentId: payment.id,
                    invoiceId: invoice.id,
                    allocatedAmount: allocatedAmount.toFixed(2),
                });

                const newPaid = roundMoney(currentPaid + allocatedAmount);
                const newBalance = roundMoney(currentBalance - allocatedAmount);
                const nextStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';
                await optimisticVersionUpdate(tx, invoices, invoices.id, invoice.id, invoice.versionNo, {
                    paidAmount: newPaid.toFixed(2),
                    balanceAmount: newBalance.toFixed(2),
                    status: nextStatus,
                });

                const allocationRatio = invoice.amount ? allocatedAmount / toDecimal(invoice.amount) : 0;
                for (const line of invoice.invoiceLines || []) {
                    const poLine = await tx.query.poItems.findFirst({ where: eq(poItems.id, line.poItemId) });
                    if (!poLine) continue;
                    const paidQtyDelta = roundMoney(toDecimal(line.quantity) * allocationRatio);
                    await tx.update(poItems).set({
                        paidQty: roundMoney(toDecimal(poLine.paidQty) + paidQtyDelta).toFixed(2),
                    }).where(eq(poItems.id, poLine.id));
                }
            }

            await logActivity(tx, {
                userId,
                action: 'PAYMENT_POSTED',
                description: `Payment ${paymentNo} posted`,
                module: 'Finance',
                entityType: 'Payment',
                entityId: payment.id,
                afterData: payment,
                payload: { vendorId: normalizedVendorId, amount: paymentAmount },
            });

            return payment;
        });

        res.status(201).json(newPayment);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating payment' });
    }
};
