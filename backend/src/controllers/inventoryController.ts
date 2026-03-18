import type { Response } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import {
    grns,
    grnItems,
    materialRequests,
    materialRequestItems,
    poItems,
    purchaseOrders,
    stockLevels,
    stockTransactions,
} from '../db/schema.js';
import type { AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../lib/audit.js';
import { roundMoney, toDecimal } from '../lib/workflow.js';

function requireUserId(req: AuthRequest): string {
    if (!req.user?.id) {
        throw new Error('Authenticated user is required');
    }
    return req.user.id;
}

function generateDocumentNo(prefix: string): string {
    return `${prefix}-${Date.now()}`;
}

function generateIdempotencyKey(prefix: string, fallback: string) {
    return `${prefix}-${fallback}`;
}

async function upsertStock(tx: any, itemId: string, warehouseId: string, delta: number) {
    if (delta === 0) {
        return;
    }

    if (delta > 0) {
        await tx.insert(stockLevels)
            .values({
                itemId,
                warehouseId,
                quantity: delta.toFixed(2),
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: [stockLevels.itemId, stockLevels.warehouseId],
                set: {
                    quantity: sql`${stockLevels.quantity} + ${delta.toFixed(2)}`,
                    versionNo: sql`${stockLevels.versionNo} + 1`,
                    updatedAt: new Date(),
                },
            });
        return;
    }

    const [current] = await tx.select().from(stockLevels)
        .where(and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId)));

    const existingQty = current ? toDecimal(current.quantity) : 0;
    if (existingQty + delta < 0) {
        throw new Error('Stock cannot go negative');
    }

    if (!current) {
        throw new Error('Stock level not found for warehouse');
    }

    await tx.update(stockLevels)
        .set({
            quantity: (existingQty + delta).toFixed(2),
            versionNo: current.versionNo + 1,
            updatedAt: new Date(),
        })
        .where(and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId)));
}

export const getGRNs = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.grns.findMany({
            with: {
                po: true,
                warehouse: true,
                grnItems: {
                    with: {
                        item: true,
                        poItem: true,
                    },
                },
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching GRNs' });
    }
};

export const createGRN = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items, poId, warehouseId, idempotencyKey, ...grnData } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'GRN must contain at least one line' });
    }

    try {
        const po = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, poId as string),
            with: { poItems: true },
        });

        if (!po) {
            return res.status(404).json({ message: 'PO not found' });
        }

        if (!['Issued', 'Partially Received'].includes(po.status)) {
            return res.status(400).json({ message: 'Goods can only be received against an issued PO' });
        }

        const poItemMap = new Map(po.poItems.map((line) => [line.id, line]));
        const poItemByItemId = new Map(po.poItems.map((line) => [line.itemId, line]));

        const newGRN = await db.transaction(async (tx) => {
            const grnNo = grnData.grnNo || generateDocumentNo('GRN');
            const [grn] = await tx.insert(grns).values({
                ...grnData,
                grnNo,
                poId,
                warehouseId,
                receivedBy: userId,
                status: 'Posted',
                postedAt: new Date(),
                postedBy: userId,
            }).returning();

            for (let index = 0; index < items.length; index += 1) {
                const line = items[index];
                const poItem = line.poItemId ? poItemMap.get(line.poItemId) : poItemByItemId.get(line.itemId);
                if (!poItem) {
                    throw new Error(`PO line not found for item ${line.itemId}`);
                }

                const receivedQty = toDecimal(line.receivedQty);
                const acceptedQty = toDecimal(line.acceptedQty);
                const rejectedQty = toDecimal(line.rejectedQty);
                const orderedQty = toDecimal(poItem.orderedQty);
                const currentReceived = toDecimal(poItem.receivedQty);
                const currentAccepted = toDecimal(poItem.acceptedQty);
                const currentCancelled = toDecimal(poItem.cancelledQty);
                const remainingQty = orderedQty - currentReceived - currentCancelled;

                if (receivedQty <= 0) {
                    throw new Error('Received quantity must be greater than zero');
                }
                if (acceptedQty < 0 || rejectedQty < 0 || acceptedQty + rejectedQty > receivedQty) {
                    throw new Error('Accepted and rejected quantities must balance the receipt');
                }
                if (receivedQty > remainingQty) {
                    throw new Error(`Receipt exceeds remaining PO quantity for item ${poItem.itemId}`);
                }

                const [grnLine] = await tx.insert(grnItems).values({
                    grnId: grn.id,
                    poItemId: poItem.id,
                    itemId: poItem.itemId,
                    receivedQty: receivedQty.toFixed(2),
                    acceptedQty: acceptedQty.toFixed(2),
                    rejectedQty: rejectedQty.toFixed(2),
                    rejectionReason: line.rejectionReason,
                    disposition: line.disposition || (rejectedQty > 0 ? 'Rejected' : 'Accepted'),
                }).returning();

                await tx.update(poItems).set({
                    receivedQty: (currentReceived + receivedQty).toFixed(2),
                    acceptedQty: (currentAccepted + acceptedQty).toFixed(2),
                }).where(eq(poItems.id, poItem.id));

                if (acceptedQty > 0) {
                    await upsertStock(tx, poItem.itemId, warehouseId, acceptedQty);
                    await tx.insert(stockTransactions).values({
                        itemId: poItem.itemId,
                        warehouseId,
                        type: 'Receipt',
                        quantity: acceptedQty.toFixed(2),
                        unitCost: poItem.unitPrice,
                        referenceType: 'GRN',
                        referenceId: grn.id,
                        lineReferenceId: grnLine.id,
                        targetWarehouseId: warehouseId,
                        performedBy: userId,
                        idempotencyKey: `${idempotencyKey || generateIdempotencyKey(grnNo, String(index + 1))}-receipt`,
                        notes: `GRN ${grnNo} posted`,
                    });
                }
            }

            const refreshedPoItems = await tx.query.poItems.findMany({ where: eq(poItems.poId, po.id) });
            const isFullyReceived = refreshedPoItems.every((line: any) => {
                return toDecimal(line.receivedQty) + toDecimal(line.cancelledQty) >= toDecimal(line.orderedQty);
            });

            await tx.update(purchaseOrders).set({
                status: isFullyReceived ? 'Fully Received' : 'Partially Received',
                versionNo: po.versionNo + 1,
            }).where(eq(purchaseOrders.id, po.id));

            await logActivity(tx, {
                userId,
                action: 'GRN_POSTED',
                description: `Goods receipt ${grnNo} posted for PO ${po.poNo}`,
                module: 'Inventory',
                entityType: 'GRN',
                entityId: grn.id,
                payload: { poId: po.id, warehouseId },
            });

            return grn;
        });

        res.status(201).json(newGRN);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating GRN' });
    }
};

export const getStockLevels = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.stockLevels.findMany({
            with: {
                item: true,
                warehouse: true,
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stock levels' });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.stockTransactions.findMany({
            with: {
                item: true,
                warehouse: true,
                sourceWarehouse: true,
                targetWarehouse: true,
            },
            orderBy: (transactions, { desc }) => [desc(transactions.date)],
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stock transactions' });
    }
};

export const createStockTransaction = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const {
        itemId,
        type,
        quantity,
        warehouseId,
        sourceWarehouseId,
        targetWarehouseId,
        referenceType,
        referenceId,
        idempotencyKey,
        notes,
    } = req.body;

    try {
        const qty = toDecimal(quantity);
        if (qty <= 0) {
            return res.status(400).json({ message: 'Quantity must be greater than zero' });
        }

        const result = await db.transaction(async (tx) => {
            if (type === 'Issue') {
                if (!warehouseId) throw new Error('warehouseId is required for issue');
                await upsertStock(tx, itemId, warehouseId, -qty);
            } else if (type === 'Receipt' || type === 'Adjustment+') {
                if (!warehouseId) throw new Error('warehouseId is required for receipt/adjustment');
                await upsertStock(tx, itemId, warehouseId, qty);
            } else if (type === 'Adjustment-') {
                if (!warehouseId) throw new Error('warehouseId is required for negative adjustment');
                await upsertStock(tx, itemId, warehouseId, -qty);
            } else if (type === 'Transfer') {
                if (!sourceWarehouseId || !targetWarehouseId) {
                    throw new Error('sourceWarehouseId and targetWarehouseId are required for transfer');
                }
                await upsertStock(tx, itemId, sourceWarehouseId, -qty);
                await upsertStock(tx, itemId, targetWarehouseId, qty);
            } else {
                throw new Error('Unsupported stock movement type');
            }

            const [transaction] = await tx.insert(stockTransactions).values({
                itemId,
                warehouseId: warehouseId || sourceWarehouseId || targetWarehouseId,
                type,
                quantity: qty.toFixed(2),
                referenceType,
                referenceId,
                sourceWarehouseId,
                targetWarehouseId,
                notes,
                performedBy: userId,
                idempotencyKey: idempotencyKey || generateIdempotencyKey('stock', `${Date.now()}`),
            }).returning();

            await logActivity(tx, {
                userId,
                action: 'STOCK_TRANSACTION_CREATED',
                description: `Stock transaction ${type} created`,
                module: 'Inventory',
                entityType: 'StockTransaction',
                entityId: transaction.id,
                payload: { itemId, type, quantity: qty },
            });

            return transaction;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error processing stock transaction' });
    }
};

export const getMaterialRequests = async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.materialRequests.findMany({
            with: {
                requestor: true,
                materialRequestItems: { with: { item: true } },
            },
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching material requests' });
    }
};

export const createMaterialRequest = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { items, ...mrData } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Material request must contain at least one item' });
    }

    try {
        const newMR = await db.transaction(async (tx) => {
            const [mr] = await tx.insert(materialRequests).values({
                ...mrData,
                requestNo: mrData.requestNo || generateDocumentNo('MR'),
            }).returning();

            await tx.insert(materialRequestItems).values(
                items.map((item: any) => ({
                    mrId: mr.id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                })),
            );

            await logActivity(tx, {
                userId,
                action: 'MATERIAL_REQUEST_CREATED',
                description: `Material request ${mr.requestNo} created`,
                module: 'Inventory',
                entityType: 'MaterialRequest',
                entityId: mr.id,
                payload: { itemCount: items.length },
            });

            return mr;
        });

        res.status(201).json(newMR);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating material request' });
    }
};
