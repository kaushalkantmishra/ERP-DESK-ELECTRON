import { Item, Vendor, Warehouse, Category, Uom } from '../types/models';
import api from './api';

export const masterService = {
    // Items
    getItems: async (): Promise<Item[]> => {
        const response = await api.get('/master/items');
        return response.data;
    },
    addItem: async (item: Omit<Item, 'id'>): Promise<Item> => {
        const response = await api.post('/master/items', item);
        return response.data;
    },

    // Vendors
    getVendors: async (): Promise<Vendor[]> => {
        const response = await api.get('/master/vendors');
        return response.data;
    },
    addVendor: async (vendor: Omit<Vendor, 'id'>): Promise<Vendor> => {
        const response = await api.post('/master/vendors', vendor);
        return response.data;
    },

    // Warehouses
    getWarehouses: async (): Promise<Warehouse[]> => {
        const response = await api.get('/master/warehouses');
        return response.data;
    },
    addWarehouse: async (wh: Omit<Warehouse, 'id'>): Promise<Warehouse> => {
        const response = await api.post('/master/warehouses', wh);
        return response.data;
    },

    // Categories
    getCategories: async (): Promise<Category[]> => {
        const response = await api.get('/master/categories');
        return response.data;
    },
    addCategory: async (category: Omit<Category, 'id'>): Promise<Category> => {
        const response = await api.post('/master/categories', category);
        return response.data;
    },

    // UoMs
    getUoms: async (): Promise<Uom[]> => {
        const response = await api.get('/master/uoms');
        return response.data;
    },
    addUom: async (uom: Omit<Uom, 'id'>): Promise<Uom> => {
        const response = await api.post('/master/uoms', uom);
        return response.data;
    }
};
