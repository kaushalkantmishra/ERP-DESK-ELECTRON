import type { Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        console.log(`User found: ${user ? 'Yes' : 'No'}`);
        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('Comparing passwords...');
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password match: ${isMatch}`);

        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('Signing JWT...');
        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        console.log('JWT signed successfully');

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            user: userWithoutPassword,
            token,
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
    }
};

export const logout = (req: Request, res: Response) => {
    // In JWT, logout is usually handled by client by deleting the token.
    // We can just return success.
    res.json({ message: 'Logged out successfully' });
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const allUsers = await db.query.users.findMany();
        // Remove passwords
        const usersWithoutPasswords = allUsers.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(usersWithoutPasswords);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, id as string),
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
};
