import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { activityLogs, systemSettings } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';
import { APPROVAL_MATRIX_SETTINGS_KEY, DEFAULT_APPROVAL_MATRIX } from '../erp.js';

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

export const getApprovalMatrix = async (_req: AuthRequest, res: Response) => {
    try {
        const existing = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, APPROVAL_MATRIX_SETTINGS_KEY),
        });

        const value = existing?.value && typeof existing.value === 'object'
            ? existing.value
            : DEFAULT_APPROVAL_MATRIX;

        res.json(value);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching approval matrix' });
    }
};

export const updateApprovalMatrix = async (req: AuthRequest, res: Response) => {
    try {
        const payload = req.body || {};
        const rules = Array.isArray(payload.rules) ? payload.rules : [];

        const normalizedRules = rules.map((rule: any, index: number) => ({
            id: String(rule.id || `${Date.now()}-${index}`),
            role: String(rule.role || '').trim(),
            document: String(rule.document || '').trim(),
            minAmount: Number(rule.minAmount || 0),
            maxAmount: Number(rule.maxAmount || 0),
            approvers: Number(rule.approvers || 1),
            active: rule.active !== false,
        }));

        if (normalizedRules.some((rule: any) => !rule.role || !rule.document)) {
            return res.status(400).json({ message: 'Each approval rule must have role and document type' });
        }

        if (normalizedRules.some((rule: any) => rule.minAmount < 0 || rule.maxAmount < 0 || rule.approvers <= 0)) {
            return res.status(400).json({ message: 'Amount ranges must be non-negative and approvers must be at least 1' });
        }

        const value = {
            simulationMode: payload.simulationMode === true,
            adminBypass: payload.adminBypass !== false,
            rules: normalizedRules,
        };

        const existing = await db.query.systemSettings.findFirst({
            where: eq(systemSettings.key, APPROVAL_MATRIX_SETTINGS_KEY),
        });

        if (existing) {
            await db.update(systemSettings)
                .set({ value, updatedAt: new Date() })
                .where(eq(systemSettings.key, APPROVAL_MATRIX_SETTINGS_KEY));
        } else {
            await db.insert(systemSettings).values({
                key: APPROVAL_MATRIX_SETTINGS_KEY,
                value,
            });
        }

        res.json(value);
    } catch (error) {
        res.status(500).json({ message: 'Error updating approval matrix' });
    }
};
