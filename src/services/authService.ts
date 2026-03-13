import { User } from '../types/models';
import api from './api';

export const authService = {
    login: async (email: string, pass: string): Promise<User | null> => {
        try {
            const response = await api.post('/auth/login', { email, password: pass });
            const { user, token } = response.data;
            if (token) {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }
            return user;
        } catch (error) {
            console.error('Login failed:', error);
            return null;
        }
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    },

    getUsers: async (): Promise<User[]> => {
        const response = await api.get('/auth/users'); // Assuming an endpoint for users
        return response.data;
    },

    getUserById: async (id: string): Promise<User | undefined> => {
        const response = await api.get(`/auth/users/${id}`);
        return response.data;
    }
};
