import type { Request, Response } from 'express';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import { categories, items, uoms, vendors, warehouses } from '../db/schema.js';
import { normalizeText, toDecimal, toId } from '../erp.js';

export const getItems = async (_req: Request, res: Response) => {
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
            uom: uoms.code,
        })
            .from(items)
            .leftJoin(categories, eq(items.categoryId, categories.id))
            .leftJoin(uoms, eq(items.uomId, uoms.id));

        res.json(result.map((item) => ({
            ...item,
            price: Number(item.price),
            taxRate: Number(item.taxRate),
            reorderLevel: Number(item.reorderLevel),
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching items' });
    }
};

export const addItem = async (req: Request, res: Response) => {
    try {
        const { code, name, categoryId, uomId, price, active = true, taxRate = 0, reorderLevel = 0 } = req.body;
        if (!code || !name || !categoryId || !uomId) return res.status(400).json({ message: 'Code, name, category, and UOM are required' });
        if (toDecimal(price) < 0 || toDecimal(taxRate) < 0 || toDecimal(reorderLevel) < 0) {
            return res.status(400).json({ message: 'Price, tax rate, and reorder level must be non-negative' });
        }

        const normalizedCategoryId = toId(categoryId, 'category id');
        const normalizedUomId = toId(uomId, 'uom id');
        const category = await db.query.categories.findFirst({ where: eq(categories.id, normalizedCategoryId) });
        const uom = await db.query.uoms.findFirst({ where: eq(uoms.id, normalizedUomId) });
        if (!category) return res.status(400).json({ message: 'Invalid category selected' });
        if (!uom) return res.status(400).json({ message: 'Invalid UOM selected' });

        const existing = await db.query.items.findFirst({ where: eq(items.code, String(code).trim()) });
        if (existing) return res.status(400).json({ message: 'Item code already exists' });

        const [newItem] = await db.insert(items).values({
            code: String(code).trim().toUpperCase(),
            name: String(name).trim(),
            categoryId: normalizedCategoryId,
            uomId: normalizedUomId,
            price: toDecimal(price).toFixed(2),
            active: !!active,
            taxRate: toDecimal(taxRate).toFixed(2),
            reorderLevel: toDecimal(reorderLevel).toFixed(2),
        }).returning();

        res.status(201).json(newItem);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error adding item' });
    }
};

export const getVendors = async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(vendors);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching vendors' });
    }
};

export const addVendor = async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        if (!payload.name || !payload.email) return res.status(400).json({ message: 'Vendor name and email are required' });

        const normalizedName = normalizeText(String(payload.name));
        const existingVendor = await db.query.vendors.findFirst({
            where: or(
                eq(vendors.email, String(payload.email).trim().toLowerCase()),
                sql`lower(trim(${vendors.name})) = ${normalizedName}`,
            ),
        });

        if (existingVendor) {
            return res.status(400).json({ message: 'A vendor with the same name or email already exists' });
        }

        const [newVendor] = await db.insert(vendors).values({
            ...payload,
            name: String(payload.name).trim(),
            email: String(payload.email).trim().toLowerCase(),
            rating: Number(payload.rating || 0),
            active: payload.active !== false,
        }).returning();

        res.status(201).json(newVendor);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error adding vendor' });
    }
};

export const getWarehouses = async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(warehouses);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching warehouses' });
    }
};

export const addWarehouse = async (req: Request, res: Response) => {
    try {
        const { code, name, location, managerId } = req.body;
        if (!code || !name || !location) return res.status(400).json({ message: 'Warehouse code, name, and location are required' });
        const existing = await db.query.warehouses.findFirst({
            where: or(eq(warehouses.code, String(code).trim().toUpperCase()), eq(warehouses.name, String(name).trim())),
        });
        if (existing) return res.status(400).json({ message: 'Warehouse code or name already exists' });

        const [newWH] = await db.insert(warehouses).values({
            code: String(code).trim().toUpperCase(),
            name: String(name).trim(),
            location: String(location).trim(),
            managerId: managerId || null,
        }).returning();
        res.status(201).json(newWH);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error adding warehouse' });
    }
};

export const getCategories = async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(categories);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

export const addCategory = async (req: Request, res: Response) => {
    try {
        const { name, description, uom } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });
        const existing = await db.query.categories.findFirst({ where: eq(categories.name, String(name).trim()) });
        if (existing) return res.status(400).json({ message: 'Category already exists' });
        let normalizedUom: string | null = null;
        if (uom) {
            normalizedUom = String(uom).trim().toUpperCase();
            const existingUom = await db.query.uoms.findFirst({ where: eq(uoms.code, normalizedUom) });
            if (!existingUom) return res.status(400).json({ message: 'Invalid UOM selected' });
        }
        const [newCat] = await db.insert(categories).values({
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
            uom: normalizedUom,
        }).returning();
        res.status(201).json(newCat);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error adding category' });
    }
};

export const getUoms = async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(uoms);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching UoMs' });
    }
};

export const addUom = async (req: Request, res: Response) => {
    try {
        const { code, name } = req.body;
        if (!code || !name) return res.status(400).json({ message: 'UOM code and name are required' });
        const normalizedCode = String(code).trim().toUpperCase();
        const existing = await db.query.uoms.findFirst({ where: eq(uoms.code, normalizedCode) });
        if (existing) return res.status(400).json({ message: 'UOM code already exists' });
        const [newUom] = await db.insert(uoms).values({
            code: normalizedCode,
            name: String(name).trim(),
        }).returning();
        res.status(201).json(newUom);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error adding UoM' });
    }
};
