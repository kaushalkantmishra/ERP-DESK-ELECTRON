import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import { users } from '../db/schema.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

export interface AuthRequest extends Request {
    user?: {
        id: number | string;
        role: string;
    };
    file?: Express.Multer.File;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number | string; role: string };
        const numericUserId = typeof decoded.id === 'number' ? decoded.id : Number(decoded.id);
        if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, numericUserId),
        });

        if (!user) {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }

        req.user = {
            id: user.id,
            role: user.role,
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

export const roleMiddleware = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
