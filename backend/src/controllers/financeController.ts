import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { invoices } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const result = await db.select().from(invoices);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoices' });
    }
};

export const createInvoice = async (req: Request, res: Response) => {
    try {
        const newInvoice = await db.insert(invoices).values(req.body).returning();
        res.status(201).json(newInvoice[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating invoice' });
    }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.update(invoices)
            .set({ status })
            .where(eq(invoices.id, id as string));
        res.json({ message: 'Invoice status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating invoice status' });
    }
};
