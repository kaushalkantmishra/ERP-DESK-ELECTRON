import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import {
    grns, grnItems,
    stockTransactions, stockLevels,
    materialRequests, materialRequestItems,
    purchaseOrders
} from '../db/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import { generateId } from '../utils/idGenerator.js';

// GRNs
export const getGRNs = async (req: Request, res: Response) => {
    try {
        const result = await db.query.grns.findMany({
            with: {
                po: true,
                warehouse: true,
                grnItems: {
                    with: {
                        item: true
                    }
                }
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching GRNs' });
    }
};

export const createGRN = async (req: Request, res: Response) => {
    const { items, poId, warehouseId, ...grnData } = req.body;
    try {
        const newGRN = await db.transaction(async (tx) => {
            const [grn] = await tx.insert(grns).values({
                ...grnData,
                poId,
                warehouseId,
                grnNo: generateId('GRN')
            }).returning();
            if (items && items.length > 0) {
                await tx.insert(grnItems).values(
                    items.map((item: any) => ({ ...item, grnId: grn.id }))
                );

                // Update Stock for each item
                for (const item of items) {
                    // Create Stock Transaction
                    await tx.insert(stockTransactions).values({
                        itemId: item.itemId,
                        type: 'Receipt',
                        quantity: item.acceptedQty.toString(),
                        targetWarehouseId: warehouseId,
                        date: new Date(),
                        notes: `GRN: ${grn.grnNo}`
                    });

                    // Update Stock Level (Upsert)
                    await tx.insert(stockLevels)
                        .values({ 
                            itemId: item.itemId, 
                            warehouseId: warehouseId, 
                            quantity: item.acceptedQty.toString() 
                        })
                        .onConflictDoUpdate({
                            target: [stockLevels.itemId, stockLevels.warehouseId],
                            set: { quantity: sql`${stockLevels.quantity} + ${item.acceptedQty.toString()}` }
                        });
                }
            }
            // Update PO Status
            await tx.update(purchaseOrders)
                .set({ status: 'Completed' })
                .where(eq(purchaseOrders.id, poId as string));

            return grn;
        });
        res.status(201).json(newGRN);
    } catch (error) {
        res.status(500).json({ message: 'Error creating GRN' });
    }
};

// Stock
export const getStockLevels = async (req: Request, res: Response) => {
    try {
        const result = await db.query.stockLevels.findMany({
            with: {
                item: true,
                warehouse: true
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stock levels' });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const result = await db.query.stockTransactions.findMany({
            with: {
                item: true,
                sourceWarehouse: true,
                targetWarehouse: true
            },
            orderBy: (transactions, { desc }) => [desc(transactions.date)]
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stock transactions' });
    }
};

export const createStockTransaction = async (req: Request, res: Response) => {
    const { itemId, type, quantity, sourceWarehouseId, targetWarehouseId, ...txData } = req.body;
    try {
        const result = await db.transaction(async (tx) => {
            const [transaction] = await tx.insert(stockTransactions).values({
                itemId, type, quantity, sourceWarehouseId, targetWarehouseId, ...txData
            }).returning();

            // Update Stock Levels
            if (type === 'Receipt' || type === 'Adjustment') {
                await tx.insert(stockLevels)
                    .values({ itemId, warehouseId: targetWarehouseId || sourceWarehouseId, quantity: quantity.toString() })
                    .onConflictDoUpdate({
                        target: [stockLevels.itemId, stockLevels.warehouseId],
                        set: { quantity: sql`${stockLevels.quantity} + ${quantity.toString()}` }
                    });
            } else if (type === 'Issue') {
                await tx.update(stockLevels)
                    .set({ quantity: sql`${stockLevels.quantity} - ${quantity.toString()}` })
                    .where(and(eq(stockLevels.itemId, itemId as string), eq(stockLevels.warehouseId, sourceWarehouseId as string)));
            } else if (type === 'Transfer') {
                await tx.update(stockLevels)
                    .set({ quantity: sql`${stockLevels.quantity} - ${quantity.toString()}` })
                    .where(and(eq(stockLevels.itemId, itemId as string), eq(stockLevels.warehouseId, sourceWarehouseId as string)));

                await tx.insert(stockLevels)
                    .values({ itemId, warehouseId: targetWarehouseId, quantity: quantity.toString() })
                    .onConflictDoUpdate({
                        target: [stockLevels.itemId, stockLevels.warehouseId],
                        set: { quantity: sql`${stockLevels.quantity} + ${quantity.toString()}` }
                    });
            }

            return transaction;
        });
        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing stock transaction' });
    }
};

// Material Requests
export const getMaterialRequests = async (req: Request, res: Response) => {
    try {
        const result = await db.query.materialRequests.findMany({
            with: {
                requestor: true,
                materialRequestItems: {
                    with: {
                        item: true
                    }
                }
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching material requests' });
    }
};

export const createMaterialRequest = async (req: Request, res: Response) => {
    const { items, ...mrData } = req.body;
    try {
        const newMR = await db.transaction(async (tx) => {
            const [mr] = await tx.insert(materialRequests).values({
                ...mrData,
                requestNo: generateId('MR')
            }).returning();
            if (items && items.length > 0) {
                await tx.insert(materialRequestItems).values(
                    items.map((item: any) => ({ ...item, mrId: mr.id }))
                );
            }
            return mr;
        });
        res.status(201).json(newMR);
    } catch (error) {
        res.status(500).json({ message: 'Error creating material request' });
    }
};
