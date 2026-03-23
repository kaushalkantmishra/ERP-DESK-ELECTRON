import type { Response } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import {
    grnItems,
    grns,
    items,
    materialRequestItems,
    materialRequests,
    poItems,
    purchaseOrders,
    stockLevels,
    stockReservations,
    stockTransactions,
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
    roundMoney,
    toDecimal,
    toId,
} from '../erp.js';

function requireUserId(req: AuthRequest): number {
    if (!req.user?.id) throw new Error('Authenticated user is required');
    return req.user.id;
}

async function getStockLevel(tx: any, itemId: number, warehouseId: number) {
    return tx.query.stockLevels.findFirst({
        where: and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId)),
    });
}

async function increaseStock(tx: any, itemId: number, warehouseId: number, qty: number, unitCost: number) {
    const current = await getStockLevel(tx, itemId, warehouseId);
    if (!current) {
        await tx.insert(stockLevels).values({
            itemId,
            warehouseId,
            quantity: qty.toFixed(2),
            reservedQty: '0.00',
            avgCost: unitCost.toFixed(4),
            updatedAt: new Date(),
        });
        return { quantity: qty, avgCost: unitCost };
    }

    const currentQty = toDecimal(current.quantity);
    const currentAvg = toDecimal(current.avgCost);
    const nextQty = roundMoney(currentQty + qty);
    const nextAvg = nextQty <= 0 ? currentAvg : Number((((currentQty * currentAvg) + (qty * unitCost)) / nextQty).toFixed(4));

    await tx.update(stockLevels).set({
        quantity: nextQty.toFixed(2),
        avgCost: nextAvg.toFixed(4),
        versionNo: current.versionNo + 1,
        updatedAt: new Date(),
    }).where(and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId), eq(stockLevels.versionNo, current.versionNo)));

    return { quantity: nextQty, avgCost: nextAvg };
}

async function decreaseStock(tx: any, itemId: number, warehouseId: number, qty: number, allowNegativeStock: boolean) {
    const current = await getStockLevel(tx, itemId, warehouseId);
    if (!current) throw new Error('Stock level not found for the selected warehouse');

    const currentQty = toDecimal(current.quantity);
    const nextQty = roundMoney(currentQty - qty);
    if (!allowNegativeStock && nextQty < 0) throw new Error('Stock cannot go negative');

    const result = await tx.update(stockLevels).set({
        quantity: nextQty.toFixed(2),
        versionNo: current.versionNo + 1,
        updatedAt: new Date(),
    }).where(and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId), eq(stockLevels.versionNo, current.versionNo))).returning();

    if (result.length === 0) throw new Error('Concurrent stock update detected. Please retry.');

    return { quantity: nextQty, avgCost: toDecimal(current.avgCost) };
}

async function adjustReservation(tx: any, itemId: number, warehouseId: number | null, qtyDelta: number) {
    if (!warehouseId || qtyDelta === 0) return;
    const current = await getStockLevel(tx, itemId, warehouseId);
    if (!current) {
        if (qtyDelta < 0) throw new Error('Cannot release reservation from a non-existent stock level');
        await tx.insert(stockLevels).values({
            itemId,
            warehouseId,
            quantity: '0.00',
            reservedQty: qtyDelta.toFixed(2),
            avgCost: '0.0000',
            updatedAt: new Date(),
        });
        return;
    }

    const reservedQty = roundMoney(toDecimal(current.reservedQty) + qtyDelta);
    if (reservedQty < 0) throw new Error('Reservation quantity cannot go negative');

    await tx.update(stockLevels).set({
        reservedQty: reservedQty.toFixed(2),
        versionNo: current.versionNo + 1,
        updatedAt: new Date(),
    }).where(and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId), eq(stockLevels.versionNo, current.versionNo)));
}

async function createLedgerEntry(tx: any, params: any) {
    const existing = params.idempotencyKey
        ? await tx.query.stockTransactions.findFirst({ where: eq(stockTransactions.idempotencyKey, params.idempotencyKey) })
        : undefined;

    if (existing) return existing;

    const [entry] = await tx.insert(stockTransactions).values(params).returning();
    return entry;
}

export const getGRNs = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.grns.findMany({
            with: {
                po: true,
                warehouse: true,
                grnItems: { with: { item: true, poItem: true } },
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
    const { items: receiptItems, poId, warehouseId, idempotencyKey, ...grnData } = req.body;

    if (!Array.isArray(receiptItems) || receiptItems.length === 0) {
        return res.status(400).json({ message: 'GRN must contain at least one line' });
    }

    try {
        const normalizedPoId = toId(poId, 'purchase order id');
        const normalizedWarehouseId = toId(warehouseId, 'warehouse id');
        const po = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, normalizedPoId),
            with: { poItems: { with: { item: true } } },
        });
        if (!po) return res.status(404).json({ message: 'PO not found' });
        if (!['Issued', 'Partially Received'].includes(po.status)) {
            return res.status(400).json({ message: 'Goods can only be received against an issued or partially received PO' });
        }

        const settings = await db.transaction((tx) => getSettings(tx));
        const poItemMap = new Map((po.poItems || []).map((line) => [line.id, line]));

        const newGRN = await db.transaction(async (tx) => {
            const grnNo = await generateDocumentNo(tx, 'GRN', new Date(grnData.receivedDate || new Date()));
            const warnings: string[] = [];
            let baseAmount = 0;
            let taxAmount = 0;

            const [grn] = await tx.insert(grns).values({
                ...grnData,
                grnNo,
                poId: normalizedPoId,
                warehouseId: normalizedWarehouseId,
                receivedBy: userId,
                status: 'Posted',
                postedAt: new Date(),
                postedBy: userId,
                warnings,
            }).returning();

            for (let index = 0; index < receiptItems.length; index += 1) {
                const line = receiptItems[index];
                const poLine = poItemMap.get(toId(line.poItemId, 'purchase order item id'));
                if (!poLine) throw new Error(`PO line not found for ${line.poItemId}`);

                const receivedQty = toDecimal(line.receivedQty);
                const acceptedQty = toDecimal(line.acceptedQty);
                const rejectedQty = toDecimal(line.rejectedQty);
                const orderedQty = toDecimal(poLine.orderedQty);
                const currentReceived = toDecimal(poLine.receivedQty);
                const currentCancelled = toDecimal(poLine.cancelledQty);
                const remainingQty = roundMoney(orderedQty - currentReceived - currentCancelled);

                if (receivedQty <= 0) throw new Error('Received quantity must be greater than zero');
                if (acceptedQty < 0 || rejectedQty < 0 || roundMoney(acceptedQty + rejectedQty) !== roundMoney(receivedQty)) {
                    throw new Error('Accepted quantity plus rejected quantity must equal received quantity');
                }

                const toleranceResult = enforceTolerance(receivedQty, remainingQty, settings.qtyTolerancePct, `GRN quantity for ${poLine.item?.code || poLine.itemId}`, settings.warnOnlyOnTolerance);
                if (toleranceResult.message) warnings.push(toleranceResult.message);

                const amounts = computeTaxAmounts(acceptedQty, toDecimal(poLine.unitPrice), toDecimal(poLine.taxRate));
                baseAmount = roundMoney(baseAmount + amounts.baseAmount);
                taxAmount = roundMoney(taxAmount + amounts.taxAmount);

                const [grnLine] = await tx.insert(grnItems).values({
                    grnId: grn.id,
                    poItemId: poLine.id,
                    itemId: poLine.itemId,
                    receivedQty: receivedQty.toFixed(2),
                    acceptedQty: acceptedQty.toFixed(2),
                    rejectedQty: rejectedQty.toFixed(2),
                    unitCost: poLine.unitPrice,
                    baseAmount: amounts.baseAmount.toFixed(2),
                    taxAmount: amounts.taxAmount.toFixed(2),
                    totalAmount: amounts.totalAmount.toFixed(2),
                    rejectionReason: line.rejectionReason,
                    disposition: rejectedQty > 0 ? 'Rejected' : 'Accepted',
                }).returning();

                await tx.update(poItems).set({
                    receivedQty: roundMoney(currentReceived + receivedQty).toFixed(2),
                    acceptedQty: roundMoney(toDecimal(poLine.acceptedQty) + acceptedQty).toFixed(2),
                }).where(eq(poItems.id, poLine.id));

                if (acceptedQty > 0) {
                    const stockState = await increaseStock(tx, poLine.itemId, normalizedWarehouseId, acceptedQty, toDecimal(poLine.unitPrice));
                    await createLedgerEntry(tx, {
                        itemId: poLine.itemId,
                        warehouseId: normalizedWarehouseId,
                        type: 'Receipt',
                        quantity: acceptedQty.toFixed(2),
                        unitCost: toDecimal(poLine.unitPrice).toFixed(2),
                        referenceType: 'GRN',
                        referenceId: grn.id,
                        lineReferenceId: grnLine.id,
                        targetWarehouseId: normalizedWarehouseId,
                        performedBy: userId,
                        idempotencyKey: `${idempotencyKey || grnNo}-${index + 1}-receipt`,
                        notes: `GRN ${grnNo} posted at weighted average ${stockState.avgCost}`,
                    });
                }
            }

            const refreshedPoItems = await tx.query.poItems.findMany({ where: eq(poItems.poId, po.id) });
            const allReceived = refreshedPoItems.every((line: any) => roundMoney(toDecimal(line.receivedQty) + toDecimal(line.cancelledQty)) >= toDecimal(line.orderedQty));
            await optimisticVersionUpdate(tx, purchaseOrders, purchaseOrders.id, po.id, po.versionNo, {
                status: allReceived ? 'Fully Received' : 'Partially Received',
            });

            const totalAmount = roundMoney(baseAmount + taxAmount);
            const updatedWarnings = warnings.length > 0 ? warnings : null;
            await optimisticVersionUpdate(tx, grns, grns.id, grn.id, grn.versionNo, {
                baseAmount: baseAmount.toFixed(2),
                taxAmount: taxAmount.toFixed(2),
                totalAmount: totalAmount.toFixed(2),
                warnings: updatedWarnings,
            });

            await logActivity(tx, {
                userId,
                action: 'GRN_POSTED',
                description: `Goods receipt ${grnNo} posted for PO ${po.poNo}`,
                module: 'Inventory',
                entityType: 'GRN',
                entityId: grn.id,
                afterData: { ...grn, baseAmount, taxAmount, totalAmount, warnings: updatedWarnings },
                payload: { poId: normalizedPoId, warehouseId: normalizedWarehouseId, warnings: updatedWarnings },
            });

            return grn;
        });

        res.status(201).json(newGRN);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating GRN' });
    }
};

export const reverseGRN = async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { reason } = req.body;

    try {
        const grn = await db.query.grns.findFirst({
            where: eq(grns.id, toId(String(req.params.id), 'grn id')),
            with: { grnItems: { with: { poItem: true } }, po: { with: { poItems: true } } },
        });
        if (!grn) return res.status(404).json({ message: 'GRN not found' });
        assertTransition(grn.status, 'Reversed', STRICT_TRANSITIONS.GRN, 'GRN');
        if (!reason) return res.status(400).json({ message: 'Reversal reason is required' });

        const settings = await db.transaction((tx) => getSettings(tx));

        await db.transaction(async (tx) => {
            for (const line of grn.grnItems || []) {
                const acceptedQty = toDecimal(line.acceptedQty);
                const current = await getStockLevel(tx, line.itemId, grn.warehouseId);
                if (!current) throw new Error('Cannot reverse GRN because stock record is missing');
                if (!settings.allowNegativeStock && toDecimal(current.quantity) < acceptedQty) {
                    throw new Error('Cannot reverse GRN because stock has already been consumed');
                }

                await decreaseStock(tx, line.itemId, grn.warehouseId, acceptedQty, settings.allowNegativeStock);
                await tx.update(poItems).set({
                    receivedQty: roundMoney(toDecimal(line.poItem?.receivedQty || 0) - toDecimal(line.receivedQty)).toFixed(2),
                    acceptedQty: roundMoney(toDecimal(line.poItem?.acceptedQty || 0) - acceptedQty).toFixed(2),
                }).where(eq(poItems.id, line.poItemId));

                await createLedgerEntry(tx, {
                    itemId: line.itemId,
                    warehouseId: grn.warehouseId,
                    type: 'Reversal',
                    quantity: acceptedQty.toFixed(2),
                    unitCost: line.unitCost,
                    referenceType: 'GRN Reversal',
                    referenceId: grn.id,
                    lineReferenceId: line.id,
                    performedBy: userId,
                    idempotencyKey: `grn-reversal-${grn.id}-${line.id}`,
                    notes: `Reversal of GRN ${grn.grnNo}: ${reason}`,
                    reversalOfTransactionId: null,
                });
            }

            const po = await tx.query.purchaseOrders.findFirst({
                where: eq(purchaseOrders.id, grn.poId),
                with: { poItems: true },
            });
            if (po) {
                const hasReceipts = (po.poItems || []).some((line) => toDecimal(line.receivedQty) > 0);
                await optimisticVersionUpdate(tx, purchaseOrders, purchaseOrders.id, po.id, po.versionNo, {
                    status: hasReceipts ? 'Partially Received' : 'Issued',
                });
            }

            const updated = await optimisticVersionUpdate(tx, grns, grns.id, grn.id, grn.versionNo, {
                status: 'Reversed',
                reversedAt: new Date(),
                reversedBy: userId,
                reversalReason: reason,
            });

            await logActivity(tx, {
                userId,
                action: 'GRN_REVERSED',
                description: `Goods receipt ${grn.grnNo} reversed`,
                module: 'Inventory',
                entityType: 'GRN',
                entityId: grn.id,
                beforeData: grn,
                afterData: updated,
                payload: { reason },
            });
        });

        res.json({ message: 'GRN reversed successfully' });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error reversing GRN' });
    }
};

export const getStockLevels = async (_req: AuthRequest, res: Response) => {
    try {
        const result = await db.query.stockLevels.findMany({
            with: { item: true, warehouse: true },
        });
        res.json(result.map((level) => ({
            ...level,
            quantity: toDecimal(level.quantity),
            reservedQty: toDecimal(level.reservedQty),
            avgCost: toDecimal(level.avgCost),
            availableQty: roundMoney(toDecimal(level.quantity) - toDecimal(level.reservedQty)),
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stock levels' });
    }
};

export const getTransactions = async (_req: AuthRequest, res: Response) => {
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
        if (qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than zero' });
        const settings = await db.transaction((tx) => getSettings(tx));
        const normalizedItemId = toId(itemId, 'item id');
        const normalizedWarehouseId = warehouseId ? toId(warehouseId, 'warehouse id') : null;
        const normalizedSourceWarehouseId = sourceWarehouseId ? toId(sourceWarehouseId, 'source warehouse id') : null;
        const normalizedTargetWarehouseId = targetWarehouseId ? toId(targetWarehouseId, 'target warehouse id') : null;

        const result = await db.transaction(async (tx) => {
            const item = await tx.query.items.findFirst({ where: eq(items.id, normalizedItemId) });
            if (!item) throw new Error('Invalid item');

            let sourceCost = 0;
            if (type === 'Issue') {
                if (!normalizedWarehouseId) throw new Error('warehouseId is required for issue');
                const source = await decreaseStock(tx, normalizedItemId, normalizedWarehouseId, qty, settings.allowNegativeStock);
                sourceCost = source.avgCost;
            } else if (type === 'Receipt' || type === 'Adjustment+') {
                if (!normalizedWarehouseId) throw new Error('warehouseId is required for receipt/adjustment');
                sourceCost = toDecimal(item.price);
                await increaseStock(tx, normalizedItemId, normalizedWarehouseId, qty, sourceCost);
            } else if (type === 'Adjustment-') {
                if (!normalizedWarehouseId) throw new Error('warehouseId is required for negative adjustment');
                const source = await decreaseStock(tx, normalizedItemId, normalizedWarehouseId, qty, settings.allowNegativeStock);
                sourceCost = source.avgCost;
            } else if (type === 'Transfer') {
                if (!normalizedSourceWarehouseId || !normalizedTargetWarehouseId) throw new Error('sourceWarehouseId and targetWarehouseId are required for transfer');
                if (normalizedSourceWarehouseId === normalizedTargetWarehouseId) throw new Error('Source and target warehouse must be different');
                const source = await decreaseStock(tx, normalizedItemId, normalizedSourceWarehouseId, qty, settings.allowNegativeStock);
                sourceCost = source.avgCost;
                await increaseStock(tx, normalizedItemId, normalizedTargetWarehouseId, qty, sourceCost);
            } else {
                throw new Error('Unsupported stock movement type');
            }

            const transaction = await createLedgerEntry(tx, {
                itemId: normalizedItemId,
                warehouseId: normalizedWarehouseId || normalizedSourceWarehouseId || normalizedTargetWarehouseId,
                type,
                quantity: qty.toFixed(2),
                unitCost: sourceCost.toFixed(2),
                referenceType,
                referenceId,
                sourceWarehouseId: normalizedSourceWarehouseId,
                targetWarehouseId: normalizedTargetWarehouseId,
                notes,
                performedBy: userId,
                idempotencyKey: idempotencyKey || `stock-${normalizedItemId}-${Date.now()}`,
            });

            await logActivity(tx, {
                userId,
                action: 'STOCK_TRANSACTION_CREATED',
                description: `Stock transaction ${type} created`,
                module: 'Inventory',
                entityType: 'StockTransaction',
                entityId: transaction.id,
                afterData: transaction,
                payload: { itemId: normalizedItemId, type, quantity: qty },
            });

            return transaction;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error processing stock transaction' });
    }
};

export const getMaterialRequests = async (_req: AuthRequest, res: Response) => {
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
    const { items: requestItems, warehouseId, ...mrData } = req.body;

    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        return res.status(400).json({ message: 'Material request must contain at least one item' });
    }

    try {
        const itemIds = [...new Set(requestItems.map((item: any) => toId(item.itemId, 'item id')))];
        const validItems = await db.select().from(items).where(inArray(items.id, itemIds));
        if (validItems.length !== itemIds.length) return res.status(400).json({ message: 'One or more material request items are invalid' });

        const newMR = await db.transaction(async (tx) => {
            const requestNo = await generateDocumentNo(tx, 'MR', new Date(mrData.date || new Date()));
            const [mr] = await tx.insert(materialRequests).values({
                ...mrData,
                requestNo,
            }).returning();

            const insertedLines = await tx.insert(materialRequestItems).values(
                requestItems.map((item: any) => ({
                    mrId: mr.id,
                    itemId: toId(item.itemId, 'item id'),
                    quantity: Number(item.quantity).toFixed(2),
                })),
            ).returning();

            if (warehouseId) {
                const normalizedWarehouseId = toId(warehouseId, 'warehouse id');
                await tx.insert(stockReservations).values(insertedLines.map((line: any) => ({
                    itemId: line.itemId,
                    warehouseId: normalizedWarehouseId,
                    sourceType: 'MaterialRequest',
                    sourceId: mr.id,
                    sourceLineId: line.id,
                    quantity: line.quantity,
                })));

                for (const line of insertedLines) {
                    await adjustReservation(tx, line.itemId, normalizedWarehouseId, toDecimal(line.quantity));
                }
            }

            await logActivity(tx, {
                userId,
                action: 'MATERIAL_REQUEST_CREATED',
                description: `Material request ${requestNo} created`,
                module: 'Inventory',
                entityType: 'MaterialRequest',
                entityId: mr.id,
                afterData: { ...mr, materialRequestItems: insertedLines },
                payload: { itemCount: insertedLines.length, warehouseId },
            });

            return mr;
        });

        res.status(201).json(newMR);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error creating material request' });
    }
};
