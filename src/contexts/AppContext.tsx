import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
    User, Item, Vendor,
    Warehouse, Category, Uom, ActivityLog
} from '../types/models';
import { authService } from '../services/authService';
import { hasValidStoredToken, setAuthFailureHandler } from '../services/api';
import { masterService } from '../services/masterService';
import { systemService } from '../services/systemService';

interface AppContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;

    // Master Data (Shared across many screens)
    items: Item[];
    vendors: Vendor[];
    warehouses: Warehouse[];
    categories: Category[];
    uoms: Uom[];

    isLoading: boolean;
    refreshMasterData: () => Promise<void>;
    logActivity: (action: string, description: string, module: ActivityLog['module']) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (!hasValidStoredToken()) return null;
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return hasValidStoredToken();
    });

    const [items, setItems] = useState<Item[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [uoms, setUoms] = useState<Uom[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const refreshMasterData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedVendors, fetchedWarehouses, fetchedCategories, fetchedUoms] = await Promise.all([
                masterService.getItems(),
                masterService.getVendors(),
                masterService.getWarehouses(),
                masterService.getCategories(),
                masterService.getUoms()
            ]);
            setItems(fetchedItems);
            setVendors(fetchedVendors);
            setWarehouses(fetchedWarehouses);
            setCategories(fetchedCategories);
            setUoms(fetchedUoms);
        } catch (error) {
            console.error("Error refreshing master data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            refreshMasterData();
        }
    }, [isAuthenticated, refreshMasterData]);

    useEffect(() => {
        const handleAuthFailure = () => {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setItems([]);
            setVendors([]);
            setWarehouses([]);
            setCategories([]);
            setUoms([]);
        };

        setAuthFailureHandler(handleAuthFailure);
        return () => setAuthFailureHandler(null);
    }, []);

    const login = async (email: string, pass: string): Promise<boolean> => {
        const user = await authService.login(email, pass);
        if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            await systemService.createLog({
                action: 'Login',
                description: `${user.name} logged in`,
                module: 'Auth',
                userId: user.id,
                userName: user.name
            });
            return true;
        }
        return false;
    };

    const logout = () => {
        authService.logout();
        setCurrentUser(null);
        setIsAuthenticated(false);
        // Clear data
        setItems([]);
        setVendors([]);
        setWarehouses([]);
        setCategories([]);
        setUoms([]);
    };

    const logActivity = async (action: string, description: string, module: ActivityLog['module']) => {
        if (!currentUser) return;
        try {
            await systemService.createLog({
                action,
                description,
                module,
                userId: currentUser.id,
                userName: currentUser.name
            });
        } catch (error) {
            console.error("Failed to log activity:", error);
        }
    };

    return (
        <AppContext.Provider value={{
            currentUser, isAuthenticated, login, logout,
            items, vendors, warehouses, categories, uoms,
            isLoading, refreshMasterData, logActivity
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
