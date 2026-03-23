import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const AUTH_STORAGE_KEYS = ['token', 'user'] as const;

let authFailureHandler: (() => void) | null = null;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const clearStoredAuth = () => {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const decodeJwtPayload = (token: string): { exp?: number } | null => {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;

        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = atob(normalizedPayload);
        return JSON.parse(decodedPayload) as { exp?: number };
    } catch (error) {
        console.error('Failed to decode token payload:', error);
        return null;
    }
};

export const isTokenExpired = (token: string): boolean => {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;

    return payload.exp * 1000 <= Date.now();
};

export const hasValidStoredToken = (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    if (isTokenExpired(token)) {
        clearStoredAuth();
        return false;
    }

    return true;
};

export const setAuthFailureHandler = (handler: (() => void) | null) => {
    authFailureHandler = handler;
};

const handleExpiredSession = () => {
    clearStoredAuth();
    authFailureHandler?.();
};

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            if (isTokenExpired(token)) {
                handleExpiredSession();
                return Promise.reject(new Error('Session expired'));
            }
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && localStorage.getItem('token')) {
            handleExpiredSession();
        }

        return Promise.reject(error);
    }
);

export default api;
