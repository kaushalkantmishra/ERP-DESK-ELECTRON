import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { items, vendors, warehouses, categories, uoms } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Items
export const getItems = async (req: Request, res: Response) => {
    try {
        const result = await db.select({
            id: items.id,
            code: items.code,
            name: items.name,
            price: items.price,
            active: items.active,
            taxRate: items.taxRate,
            reorderLevel: items.reorderLevel,
            category: categories.name,
            uom: uoms.code
        })
            .from(items)
            .leftJoin(categories, eq(items.categoryId, categories.id))
            .leftJoin(uoms, eq(items.uomId, uoms.id));

        // Correctly format numbers for frontend
        const formattedResult = result.map(item => ({
            ...item,
            price: Number(item.price),
            taxRate: Number(item.taxRate),
            reorderLevel: Number(item.reorderLevel)
        }));

        res.json(formattedResult);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching items' });
    }
};

export const addItem = async (req: Request, res: Response) => {
    try {
        const newItem = await db.insert(items).values(req.body).returning();
        res.status(201).json(newItem[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error adding item' });
    }
};

// Vendors
export const getVendors = async (req: Request, res: Response) => {
    try {
        const result = await db.select().from(vendors);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendors' });
    }
};

export const addVendor = async (req: Request, res: Response) => {
    try {
        const newVendor = await db.insert(vendors).values(req.body).returning();
        res.status(201).json(newVendor[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error adding vendor' });
    }
};

// Warehouses
export const getWarehouses = async (req: Request, res: Response) => {
    try {
        const result = await db.select().from(warehouses);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching warehouses' });
    }
};

export const addWarehouse = async (req: Request, res: Response) => {
    try {
        const newWH = await db.insert(warehouses).values(req.body).returning();
        res.status(201).json(newWH[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error adding warehouse' });
    }
};

// Categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const result = await db.select().from(categories);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

export const addCategory = async (req: Request, res: Response) => {
    try {
        const newCat = await db.insert(categories).values(req.body).returning();
        res.status(201).json(newCat[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error adding category' });
    }
};

// UoMs
export const getUoms = async (req: Request, res: Response) => {
    try {
        const result = await db.select().from(uoms);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching UoMs' });
    }
};

export const addUom = async (req: Request, res: Response) => {
    try {
        const newUom = await db.insert(uoms).values(req.body).returning();
        res.status(201).json(newUom[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error adding UoM' });
    }
};
