import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { activityLogs } from '../db/schema.js';
import { desc } from 'drizzle-orm';

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
        const newLog = await db.insert(activityLogs).values(req.body).returning();
        res.status(201).json(newLog[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating activity log' });
    }
};
