import { User } from '../types/models';
import usersData from '../mock-data/users.json';
import { simulateApiCall } from './api';

// In-memory state
let users: User[] = [...usersData] as User[];

export const authService = {
    login: async (email: string, pass: string): Promise<User | null> => {
        const user = users.find(u => u.email === email && u.password === pass);
        return simulateApiCall(user || null);
    },

    getUsers: async (): Promise<User[]> => {
        return simulateApiCall(users);
    },
    
    getUserById: async (id: string): Promise<User | undefined> => {
        return simulateApiCall(users.find(u => u.id === id));
    }
};
