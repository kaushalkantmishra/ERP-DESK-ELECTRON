import api from './api';
import { ActivityLog, ApprovalMatrixConfig } from '../types/models';

export const systemService = {
    getLogs: async (): Promise<ActivityLog[]> => {
        const response = await api.get('/system/logs');
        return response.data;
    },
    createLog: async (log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
        const response = await api.post('/system/logs', log);
        return response.data;
    },
    getApprovalMatrix: async (): Promise<ApprovalMatrixConfig> => {
        const response = await api.get('/system/approval-matrix');
        return response.data;
    },
    updateApprovalMatrix: async (config: ApprovalMatrixConfig): Promise<ApprovalMatrixConfig> => {
        const response = await api.put('/system/approval-matrix', config);
        return response.data;
    },
};
