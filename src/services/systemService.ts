import api from './api';
import { ActivityLog } from '../types/models';

export const systemService = {
    getLogs: async (): Promise<ActivityLog[]> => {
        const response = await api.get('/system/logs');
        return response.data;
    },
    createLog: async (log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
        const response = await api.post('/system/logs', log);
        return response.data;
    }
};
