import { db } from './drizzle.js';
import * as schema from './schema.js';
import * as bcrypt from 'bcryptjs';

async function seed() {
    console.log('Seeding metadata...');

    // 1. UoMs
    const [uomPcs] = await db.insert(schema.uoms).values([
        { code: 'PCS', name: 'Pieces' },
        { code: 'KG', name: 'Kilograms' },
        { code: 'LTR', name: 'Liters' },
        { code: 'SET', name: 'Set' },
    ]).returning();

    // 2. Categories
    const [catElectro] = await db.insert(schema.categories).values([
        { name: 'Electronics', description: 'Electronic components and devices' },
        { name: 'Raw Materials', description: 'Basic production materials' },
        { name: 'Office Supplies', description: 'Stationery and office equipment' },
        { name: 'Consumables', description: 'Regularly used items' },
    ]).returning();

    // 3. Users
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db.insert(schema.users).values([
        {
            name: 'System Admin',
            email: 'admin@erp.com',
            password: hashedPassword,
            role: 'Admin',
            department: 'IT',
        },
        {
            name: 'Procurement Mgr',
            email: 'pm@erp.com',
            password: hashedPassword,
            role: 'Procurement',
            department: 'Procurement',
        },
        {
            name: 'Store Keeper',
            email: 'store@erp.com',
            password: hashedPassword,
            role: 'Store',
            department: 'Logistics',
        }
    ]).returning();

    // 4. Warehouses
    const [whMain] = await db.insert(schema.warehouses).values([
        { name: 'Main Warehouse', code: 'WH-MAIN', location: 'Section A - North', managerId: adminUser.id },
        { name: 'Buffer Store', code: 'WH-BUFF', location: 'Section B - South' },
    ]).returning();

    // 5. Vendors
    const [vendorA] = await db.insert(schema.vendors).values([
        {
            name: 'Tech Solutions Inc',
            email: 'sales@techsol.com',
            phone: '1234567890',
            rating: 5,
            address: '123 Tech Park',
            contactPerson: 'John Doe'
        },
        {
            name: 'Global Materials Co',
            email: 'orders@globalmat.com',
            phone: '0987654321',
            rating: 4,
            address: '456 Industrial Ave',
            contactPerson: 'Jane Smith'
        },
    ]).returning();

    // 6. Items
    const [item1] = await db.insert(schema.items).values([
        {
            code: 'ITEM-001',
            name: 'Industrial Laptop',
            categoryId: catElectro.id,
            uomId: uomPcs.id,
            price: '1200.00',
            active: true,
            reorderLevel: '5.00',
        },
        {
            code: 'ITEM-002',
            name: 'Aluminum Sheet',
            categoryId: catElectro.id, // Just using first cat for simplicity
            uomId: uomPcs.id,
            price: '45.00',
            active: true,
            reorderLevel: '100.00',
        }
    ]).returning();

    // 7. Initial Stock
    await db.insert(schema.stockLevels).values([
        { itemId: item1.id, warehouseId: whMain.id, quantity: '50.00', minStockLevel: '5.00' }
    ]);

    console.log('Seed completed successfully!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
