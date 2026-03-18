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
import { logActivity } from '../lib/audit.js';
import { assertTransition, invoiceTransitions, roundMoney, toDecimal } from '../lib/workflow.js';

function requireUserId(req: AuthRequest): string {
    if (!req.user?.id) {
        throw new Error('Authenticated user is required');
    }
    return req.user.id;
}

function generateDocumentNo(prefix: string): string {
    return `${prefix}-${Date.now()}`;
}

export const getInvoices = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.invoices.findMany({
            with: {
                vendor: true,
                po: true,
                invoiceLines: {
                    with: {
                        item: true,
                        poItem: true,
                    },
                },
                paymentAllocations: true,
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching invoices' });
    }
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { lines, poId, vendorId, amount, ...invoiceData } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ message: 'Invoice must contain at least one line' });
    }

    try {
        const po = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, poId as string),
            with: { poItems: true },
        });

        if (!po) {
            return res.status(404).json({ message: 'PO not found' });
        }
        if (po.vendorId !== vendorId) {
            return res.status(400).json({ message: 'Invoice vendor must match PO vendor' });
        }
        if (!['Partially Received', 'Fully Received', 'Closed'].includes(po.status)) {
            return res.status(400).json({ message: 'Invoice can only be entered after receipt activity has started' });
        }

        const poItemMap = new Map(po.poItems.map((line) => [line.id, line]));
        const invoiceTotal = roundMoney(lines.reduce((sum: number, line: any) => {
            return sum + (toDecimal(line.quantity) * toDecimal(line.unitPrice));
        }, 0));
        const requestedAmount = roundMoney(toDecimal(amount ?? invoiceTotal));

        if (requestedAmount !== invoiceTotal) {
            return res.status(400).json({ message: 'Invoice amount must equal the sum of invoice lines' });
        }

        const newInvoice = await db.transaction(async (tx) => {
            const [invoice] = await tx.insert(invoices).values({
                ...invoiceData,
                invoiceNo: invoiceData.invoiceNo || generateDocumentNo('INV'),
                vendorInvoiceNo: invoiceData.vendorInvoiceNo || invoiceData.invoiceNo || generateDocumentNo('VINV'),
                poId,
                vendorId,
                amount: requestedAmount.toFixed(2),
                matchedAmount: invoiceTotal.toFixed(2),
                paidAmount: '0.00',
                balanceAmount: requestedAmount.toFixed(2),
                status: 'Matched',
                enteredBy: userId,
            }).returning();

            for (const line of lines) {
                const poLine = poItemMap.get(line.poItemId);
                if (!poLine) {
                    throw new Error('Invoice line references an invalid PO line');
                }

                const lineQty = toDecimal(line.quantity);
                const alreadyInvoicedQty = toDecimal(poLine.invoicedQty);
                const receivedAcceptedQty = toDecimal(poLine.acceptedQty);
                if (line.itemId !== poLine.itemId) {
                    throw new Error('Invoice item must match PO item');
                }
                if (lineQty <= 0) {
                    throw new Error('Invoice quantity must be greater than zero');
                }
                if (alreadyInvoicedQty + lineQty > receivedAcceptedQty) {
                    throw new Error('Invoice quantity exceeds accepted quantity on the PO');
                }

                const lineAmount = roundMoney(lineQty * toDecimal(line.unitPrice));
                await tx.insert(invoiceLines).values({
                    invoiceId: invoice.id,
                    poItemId: poLine.id,
                    itemId: poLine.itemId,
                    quantity: lineQty.toFixed(2),
                    unitPrice: toDecimal(line.unitPrice).toFixed(2),
                    lineAmount: lineAmount.toFixed(2),
                });

                await tx.update(poItems).set({
                    invoicedQty: (alreadyInvoicedQty + lineQty).toFixed(2),
                }).where(eq(poItems.id, poLine.id));
            }

            await logActivity(tx, {
                userId,
                action: 'INVOICE_CREATED',
                description: `Invoice ${invoice.invoiceNo} entered against PO ${po.poNo}`,
                module: 'Finance',
                entityType: 'Invoice',
                entityId: invoice.id,
                payload: { poId, vendorId, amount: requestedAmount },
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
    const userId = requireUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    try {
        const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, id as string) });
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        assertTransition(invoice.status, status, invoiceTransitions, 'Invoice');

        await db.transaction(async (tx) => {
            await tx.update(invoices).set({
                status,
                approvedAt: status === 'Approved' ? new Date() : invoice.approvedAt,
                approvedBy: status === 'Approved' ? userId : invoice.approvedBy,
            }).where(eq(invoices.id, id as string));

            await logActivity(tx, {
                userId,
                action: 'INVOICE_STATUS_UPDATED',
                description: `Invoice ${invoice.invoiceNo} moved from ${invoice.status} to ${status}`,
                module: 'Finance',
                entityType: 'Invoice',
                entityId: invoice.id,
                payload: { from: invoice.status, to: status },
            });
        });

        res.json({ message: 'Invoice status updated' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error updating invoice status' });
    }
};

export const getPayments = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.payments.findMany({
            with: {
                vendor: true,
                paymentAllocations: {
                    with: {
                        invoice: true,
                    },
                },
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' });
    }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { allocations, vendorId, amount, method, ...paymentData } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({ message: 'Payment must contain at least one allocation' });
    }

    try {
        const paymentAmount = roundMoney(toDecimal(amount));
        const allocationTotal = roundMoney(allocations.reduce((sum: number, allocation: any) => {
            return sum + toDecimal(allocation.allocatedAmount);
        }, 0));

        if (paymentAmount !== allocationTotal) {
            return res.status(400).json({ message: 'Payment amount must equal allocation total' });
        }

        const newPayment = await db.transaction(async (tx) => {
            const [payment] = await tx.insert(payments).values({
                ...paymentData,
                paymentNo: paymentData.paymentNo || generateDocumentNo('PAY'),
                vendorId,
                amount: paymentAmount.toFixed(2),
                method,
                status: 'Posted',
                createdBy: userId,
                postedAt: new Date(),
                postedBy: userId,
            }).returning();

            for (const allocation of allocations) {
                const invoice = await tx.query.invoices.findFirst({
                    where: and(eq(invoices.id, allocation.invoiceId), eq(invoices.vendorId, vendorId)),
                });
                if (!invoice) {
                    throw new Error('Allocation references an invalid invoice for this vendor');
                }
                if (!['Approved', 'Partially Paid'].includes(invoice.status)) {
                    throw new Error(`Invoice ${invoice.invoiceNo} is not ready for payment`);
                }

                const allocatedAmount = toDecimal(allocation.allocatedAmount);
                const currentPaid = toDecimal(invoice.paidAmount);
                const currentBalance = toDecimal(invoice.balanceAmount);
                if (allocatedAmount <= 0) {
                    throw new Error('Allocated amount must be greater than zero');
                }
                if (allocatedAmount > currentBalance) {
                    throw new Error(`Allocation exceeds remaining balance for invoice ${invoice.invoiceNo}`);
                }

                await tx.insert(paymentAllocations).values({
                    paymentId: payment.id,
                    invoiceId: invoice.id,
                    allocatedAmount: allocatedAmount.toFixed(2),
                });

                const newPaid = roundMoney(currentPaid + allocatedAmount);
                const newBalance = roundMoney(currentBalance - allocatedAmount);
                await tx.update(invoices).set({
                    paidAmount: newPaid.toFixed(2),
                    balanceAmount: newBalance.toFixed(2),
                    status: newBalance === 0 ? 'Paid' : 'Partially Paid',
                }).where(eq(invoices.id, invoice.id));
            }

            await logActivity(tx, {
                userId,
                action: 'PAYMENT_POSTED',
                description: `Payment ${payment.paymentNo} posted`,
                module: 'Finance',
                entityType: 'Payment',
                entityId: payment.id,
                payload: { vendorId, amount: paymentAmount },
            });

            return payment;
        });

        res.status(201).json(newPayment);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating payment' });
    }
};
