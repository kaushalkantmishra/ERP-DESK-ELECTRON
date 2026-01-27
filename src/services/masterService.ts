import { Item, Vendor, Warehouse, Category, Uom } from '../types/models';
import itemsData from '../mock-data/items.json';
import vendorsData from '../mock-data/vendors.json';
import warehousesData from '../mock-data/warehouses.json';
import categoriesData from '../mock-data/categories.json';
import uomsData from '../mock-data/uoms.json';
import { simulateApiCall } from './api';

// In-memory state
let items: Item[] = [...itemsData] as Item[];
let vendors: Vendor[] = [...vendorsData] as Vendor[];
let warehouses: Warehouse[] = [...warehousesData] as Warehouse[];
let categories: Category[] = [...categoriesData] as Category[];
let uoms: Uom[] = [...uomsData] as Uom[];

export const masterService = {
    // Items
    getItems: async (): Promise<Item[]> => simulateApiCall(items),
    addItem: async (item: Omit<Item, 'id'>): Promise<Item> => {
        const newItem = { ...item, id: `i${Date.now()}` };
        items.push(newItem);
        return simulateApiCall(newItem);
    },
    updateItem: async (id: string, updates: Partial<Item>): Promise<Item> => {
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Item not found');
        items[index] = { ...items[index], ...updates };
        return simulateApiCall(items[index]);
    },

    // Vendors
    getVendors: async (): Promise<Vendor[]> => simulateApiCall(vendors),
    addVendor: async (vendor: Omit<Vendor, 'id'>): Promise<Vendor> => {
        const newVendor = { ...vendor, id: `v${Date.now()}` };
        vendors.push(newVendor);
        return simulateApiCall(newVendor);
    },

    // Warehouses
    getWarehouses: async (): Promise<Warehouse[]> => simulateApiCall(warehouses),
    addWarehouse: async (wh: Omit<Warehouse, 'id'>): Promise<Warehouse> => {
        const newWh = { ...wh, id: `w${Date.now()}` };
        warehouses.push(newWh);
        return simulateApiCall(newWh);
    },

    // Categories
    getCategories: async (): Promise<Category[]> => simulateApiCall(categories),
    addCategory: async (cat: Omit<Category, 'id'>): Promise<Category> => {
        const newCat = { ...cat, id: `c${Date.now()}` };
        categories.push(newCat);
        return simulateApiCall(newCat);
    },

    // UOMs
    getUoms: async (): Promise<Uom[]> => simulateApiCall(uoms),
    addUom: async (uom: Omit<Uom, 'id'>): Promise<Uom> => {
        const newUom = { ...uom, id: `u${Date.now()}` };
        uoms.push(newUom);
        return simulateApiCall(newUom);
    }
};
