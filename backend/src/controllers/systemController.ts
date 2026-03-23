import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { activityLogs } from '../db/schema.js';
import { desc } from 'drizzle-orm';

function normalizeUserId(userId: unknown) {
    if (userId === null || userId === undefined || userId === '') return null;
    const numericUserId = typeof userId === 'number' ? userId : Number(userId);
    return Number.isInteger(numericUserId) && numericUserId > 0 ? numericUserId : null;
}

export const getActivityLogs = async (req: Request, res: Response) => {
    try {
        const result = await db.query.activityLogs.findMany({
            orderBy: [desc(activityLogs.timestamp)],
            limit: 100
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching activity logs' });
    }
};

export const createActivityLog = async (req: Request, res: Response) => {
    try {
        const payload = {
            ...req.body,
            userId: normalizeUserId(req.body?.userId),
        };
        const newLog = await db.insert(activityLogs).values(payload).returning();
        res.status(201).json(newLog[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating activity log' });
    }
};
