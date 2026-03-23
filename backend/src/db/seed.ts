import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './drizzle.js';
import * as schema from './schema.js';

const DEFAULT_PASSWORD = 'admin123';

async function resetDatabase() {
    await db.delete(schema.paymentAllocations);
    await db.delete(schema.payments);
    await db.delete(schema.invoiceLines);
    await db.delete(schema.invoices);
    await db.delete(schema.stockTransactions);
    await db.delete(schema.stockLevels);
    await db.delete(schema.grnItems);
    await db.delete(schema.grns);
    await db.delete(schema.poItems);
    await db.delete(schema.purchaseOrders);
    await db.delete(schema.quotationItems);
    await db.delete(schema.quotations);
    await db.delete(schema.rfqVendors);
    await db.delete(schema.rfqs);
    await db.delete(schema.prItems);
    await db.delete(schema.purchaseRequisitions);
    await db.delete(schema.materialRequestItems);
    await db.delete(schema.materialRequests);
    await db.delete(schema.activityLogs);
    await db.delete(schema.items);
    await db.delete(schema.vendors);
    await db.delete(schema.warehouses);
    await db.delete(schema.categories);
    await db.delete(schema.uoms);
    await db.delete(schema.users);
}

async function seed() {
    console.log('Resetting existing data...');
    await resetDatabase();

    console.log('Seeding starter data...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const [pcs, box, kg, ltr, roll, set] = await db.insert(schema.uoms).values([
        { code: 'PCS', name: 'Pieces' },
        { code: 'BOX', name: 'Box' },
        { code: 'KG', name: 'Kilogram' },
        { code: 'LTR', name: 'Liter' },
        { code: 'ROLL', name: 'Roll' },
        { code: 'SET', name: 'Set' },
    ]).returning();

    const [electronics, office, rawMaterials, consumables, packaging] = await db.insert(schema.categories).values([
        { name: 'Electronics', description: 'Systems, peripherals and hardware items', uom: pcs.code },
        { name: 'Office Supplies', description: 'Stationery and desk consumables', uom: box.code },
        { name: 'Raw Materials', description: 'Production input materials', uom: kg.code },
        { name: 'Consumables', description: 'Frequent-use maintenance and utility supplies', uom: ltr.code },
        { name: 'Packaging', description: 'Labels, tapes and cartons', uom: roll.code },
    ]).returning();

    const [admin, procurement, store, finance, department] = await db.insert(schema.users).values([
        { name: 'ERP Administrator', email: 'admin@erp.com', password: hashedPassword, role: 'Admin', department: 'Management' },
        { name: 'Priya Procurement', email: 'procurement@erp.com', password: hashedPassword, role: 'Procurement', department: 'Procurement' },
        { name: 'Sanjay Store', email: 'store@erp.com', password: hashedPassword, role: 'Store', department: 'Warehouse' },
        { name: 'Farah Finance', email: 'finance@erp.com', password: hashedPassword, role: 'Finance', department: 'Finance' },
        { name: 'Ravi Operations', email: 'dept@erp.com', password: hashedPassword, role: 'Dept', department: 'Operations' },
    ]).returning();

    const [mainWarehouse, qualityWarehouse, retailStore] = await db.insert(schema.warehouses).values([
        { name: 'Main Warehouse', code: 'WH-MAIN', location: 'Ground Floor - Receiving Bay', managerId: store.id },
        { name: 'Quality Hold', code: 'WH-QA', location: 'Inspection Area', managerId: store.id },
        { name: 'Retail Back Store', code: 'WH-RETAIL', location: 'Shop Rear Storage', managerId: admin.id },
    ]).returning();

    const [vendorTech, vendorOffice, vendorSteel, vendorPack] = await db.insert(schema.vendors).values([
        { name: 'Tech Solutions India', email: 'sales@techsolutions.in', phone: '9876500001', rating: 5, address: 'Mumbai Industrial Park', taxId: 'GSTTECH1234', paymentTerms: '30 Days', contactPerson: 'Anita Rao', active: true },
        { name: 'Office Essentials Co', email: 'orders@officeessentials.in', phone: '9876500002', rating: 4, address: 'Bengaluru Trade Center', taxId: 'GSTOFFC5678', paymentTerms: '15 Days', contactPerson: 'Rahul Sen', active: true },
        { name: 'Global Metals Supply', email: 'sales@globalmetals.in', phone: '9876500003', rating: 4, address: 'Pune MIDC Zone', taxId: 'GSTMETL9012', paymentTerms: '21 Days', contactPerson: 'Sonia Mehta', active: true },
        { name: 'Prime Packaging Works', email: 'support@primepack.in', phone: '9876500004', rating: 3, address: 'Ahmedabad Packaging Hub', taxId: 'GSTPACK3456', paymentTerms: 'Cash on Delivery', contactPerson: 'Vikas Shah', active: true },
    ]).returning();

    const createdItems = await db.insert(schema.items).values([
        { code: 'ITM-LAP-15', name: 'Business Laptop 15 inch', categoryId: electronics.id, uomId: pcs.id, price: '52000.00', active: true, taxRate: '18.00', reorderLevel: '3.00' },
        { code: 'ITM-MON-24', name: '24 inch LED Monitor', categoryId: electronics.id, uomId: pcs.id, price: '9800.00', active: true, taxRate: '18.00', reorderLevel: '4.00' },
        { code: 'ITM-CHA-ERG', name: 'Ergonomic Office Chair', categoryId: office.id, uomId: pcs.id, price: '7200.00', active: true, taxRate: '18.00', reorderLevel: '5.00' },
        { code: 'ITM-PAP-A4', name: 'A4 Copier Paper Box', categoryId: office.id, uomId: box.id, price: '1450.00', active: true, taxRate: '12.00', reorderLevel: '20.00' },
        { code: 'ITM-STEEL-01', name: 'Steel Sheet 1mm', categoryId: rawMaterials.id, uomId: kg.id, price: '72.00', active: true, taxRate: '18.00', reorderLevel: '500.00' },
        { code: 'ITM-CLEAN-05', name: 'Industrial Cleaner 5L', categoryId: consumables.id, uomId: ltr.id, price: '180.00', active: true, taxRate: '18.00', reorderLevel: '60.00' },
        { code: 'ITM-TAPE-48', name: 'Packing Tape 48mm', categoryId: packaging.id, uomId: roll.id, price: '55.00', active: true, taxRate: '18.00', reorderLevel: '100.00' },
        { code: 'ITM-KIT-SAFE', name: 'Safety Kit', categoryId: consumables.id, uomId: set.id, price: '850.00', active: true, taxRate: '18.00', reorderLevel: '15.00' },
    ]).returning();

    const itemByCode = Object.fromEntries(createdItems.map((item) => [item.code, item]));

    await db.insert(schema.stockLevels).values([
        { itemId: itemByCode['ITM-LAP-15'].id, warehouseId: mainWarehouse.id, quantity: '4.00', minStockLevel: '3.00' },
        { itemId: itemByCode['ITM-MON-24'].id, warehouseId: mainWarehouse.id, quantity: '7.00', minStockLevel: '4.00' },
        { itemId: itemByCode['ITM-CHA-ERG'].id, warehouseId: retailStore.id, quantity: '6.00', minStockLevel: '5.00' },
        { itemId: itemByCode['ITM-PAP-A4'].id, warehouseId: mainWarehouse.id, quantity: '12.00', minStockLevel: '20.00' },
        { itemId: itemByCode['ITM-STEEL-01'].id, warehouseId: mainWarehouse.id, quantity: '820.00', minStockLevel: '500.00' },
        { itemId: itemByCode['ITM-CLEAN-05'].id, warehouseId: mainWarehouse.id, quantity: '44.00', minStockLevel: '60.00' },
        { itemId: itemByCode['ITM-TAPE-48'].id, warehouseId: mainWarehouse.id, quantity: '135.00', minStockLevel: '100.00' },
        { itemId: itemByCode['ITM-KIT-SAFE'].id, warehouseId: qualityWarehouse.id, quantity: '10.00', minStockLevel: '15.00' },
    ]);

    const [prDraft, prSubmitted, prApprovedForPO, prApprovedForRFQ] = await db.insert(schema.purchaseRequisitions).values([
        { prNo: 'PR-2026-0001', requestorId: department.id, department: 'Operations', date: new Date('2026-03-15T09:00:00Z'), priority: 'Medium', status: 'Draft', justification: 'Spare office chairs for new hires joining next month.', versionNo: 1 },
        { prNo: 'PR-2026-0002', requestorId: department.id, department: 'Operations', date: new Date('2026-03-16T10:00:00Z'), priority: 'Urgent', status: 'Submitted', justification: 'A4 paper and cleaning stock are below reorder levels.', submittedAt: new Date('2026-03-16T10:10:00Z'), versionNo: 1 },
        { prNo: 'PR-2026-0003', requestorId: department.id, department: 'Operations', date: new Date('2026-03-10T08:30:00Z'), priority: 'High', status: 'PO Created', justification: 'Need laptops and monitors for branch expansion rollout.', submittedAt: new Date('2026-03-10T09:00:00Z'), approvedAt: new Date('2026-03-10T12:00:00Z'), approvedBy: admin.id, versionNo: 2 },
        { prNo: 'PR-2026-0004', requestorId: department.id, department: 'Operations', date: new Date('2026-03-11T08:30:00Z'), priority: 'High', status: 'Approved', justification: 'Annual vendor comparison for steel sheets and packaging materials.', submittedAt: new Date('2026-03-11T09:00:00Z'), approvedAt: new Date('2026-03-11T12:00:00Z'), approvedBy: admin.id, versionNo: 2 },
    ]).returning();

    await db.insert(schema.prItems).values([
        { prId: prDraft.id, itemId: itemByCode['ITM-CHA-ERG'].id, quantity: '4.00', requiredDate: new Date('2026-03-31T00:00:00Z') },
        { prId: prSubmitted.id, itemId: itemByCode['ITM-PAP-A4'].id, quantity: '18.00', requiredDate: new Date('2026-03-20T00:00:00Z') },
        { prId: prSubmitted.id, itemId: itemByCode['ITM-CLEAN-05'].id, quantity: '24.00', requiredDate: new Date('2026-03-20T00:00:00Z') },
        { prId: prApprovedForPO.id, itemId: itemByCode['ITM-LAP-15'].id, quantity: '3.00', requiredDate: new Date('2026-03-25T00:00:00Z') },
        { prId: prApprovedForPO.id, itemId: itemByCode['ITM-MON-24'].id, quantity: '3.00', requiredDate: new Date('2026-03-25T00:00:00Z') },
        { prId: prApprovedForRFQ.id, itemId: itemByCode['ITM-STEEL-01'].id, quantity: '600.00', requiredDate: new Date('2026-03-30T00:00:00Z') },
        { prId: prApprovedForRFQ.id, itemId: itemByCode['ITM-TAPE-48'].id, quantity: '200.00', requiredDate: new Date('2026-03-30T00:00:00Z') },
    ]);

    const [rfq] = await db.insert(schema.rfqs).values([
        { rfqNo: 'RFQ-2026-0001', prId: prApprovedForRFQ.id, createdDate: new Date('2026-03-12T09:00:00Z'), dueDate: new Date('2026-03-19T18:00:00Z'), status: 'Created' },
    ]).returning();

    await db.insert(schema.rfqVendors).values([
        { rfqId: rfq.id, vendorId: vendorSteel.id },
        { rfqId: rfq.id, vendorId: vendorPack.id },
    ]);

    const [quoteSteel, quotePack] = await db.insert(schema.quotations).values([
        { rfqId: rfq.id, vendorId: vendorSteel.id, totalAmount: '54200.00', deliveryDate: new Date('2026-03-26T00:00:00Z'), submittedDate: new Date('2026-03-13T14:00:00Z'), status: 'Pending' },
        { rfqId: rfq.id, vendorId: vendorPack.id, totalAmount: '55800.00', deliveryDate: new Date('2026-03-28T00:00:00Z'), submittedDate: new Date('2026-03-13T15:00:00Z'), status: 'Pending' },
    ]).returning();

    await db.insert(schema.quotationItems).values([
        { quotationId: quoteSteel.id, itemId: itemByCode['ITM-STEEL-01'].id, qty: '600.00', unitPrice: '70.00' },
        { quotationId: quoteSteel.id, itemId: itemByCode['ITM-TAPE-48'].id, qty: '200.00', unitPrice: '61.00' },
        { quotationId: quotePack.id, itemId: itemByCode['ITM-STEEL-01'].id, qty: '600.00', unitPrice: '72.00' },
        { quotationId: quotePack.id, itemId: itemByCode['ITM-TAPE-48'].id, qty: '200.00', unitPrice: '63.00' },
    ]);

    const [poDraft, poIssued] = await db.insert(schema.purchaseOrders).values([
        { poNo: 'PO-2026-0001', prId: prApprovedForPO.id, vendorId: vendorTech.id, date: new Date('2026-03-12T10:00:00Z'), totalAmount: '185400.00', status: 'Draft', deliveryDate: new Date('2026-03-27T00:00:00Z'), versionNo: 1 },
        { poNo: 'PO-2026-0002', prId: prApprovedForPO.id, vendorId: vendorTech.id, date: new Date('2026-03-08T10:00:00Z'), totalAmount: '113800.00', status: 'Partially Received', deliveryDate: new Date('2026-03-18T00:00:00Z'), issuedAt: new Date('2026-03-08T12:00:00Z'), issuedBy: procurement.id, versionNo: 2 },
    ]).returning();

    const [poDraftLaptop, poDraftMonitor, poIssuedLaptop, poIssuedMonitor] = await db.insert(schema.poItems).values([
        { poId: poDraft.id, itemId: itemByCode['ITM-LAP-15'].id, orderedQty: '3.00', unitPrice: '52000.00', receivedQty: '0.00', acceptedQty: '0.00', invoicedQty: '0.00', cancelledQty: '0.00' },
        { poId: poDraft.id, itemId: itemByCode['ITM-MON-24'].id, orderedQty: '3.00', unitPrice: '9800.00', receivedQty: '0.00', acceptedQty: '0.00', invoicedQty: '0.00', cancelledQty: '0.00' },
        { poId: poIssued.id, itemId: itemByCode['ITM-LAP-15'].id, orderedQty: '3.00', unitPrice: '52000.00', receivedQty: '2.00', acceptedQty: '2.00', invoicedQty: '2.00', cancelledQty: '0.00' },
        { poId: poIssued.id, itemId: itemByCode['ITM-MON-24'].id, orderedQty: '3.00', unitPrice: '9800.00', receivedQty: '1.00', acceptedQty: '1.00', invoicedQty: '1.00', cancelledQty: '0.00' },
    ]).returning();

    const [grnPosted] = await db.insert(schema.grns).values([
        { grnNo: 'GRN-2026-0001', poId: poIssued.id, receivedDate: new Date('2026-03-14T11:00:00Z'), receivedBy: store.id, warehouseId: mainWarehouse.id, status: 'Posted', postedAt: new Date('2026-03-14T11:30:00Z'), postedBy: store.id },
    ]).returning();

    await db.insert(schema.grnItems).values([
        { grnId: grnPosted.id, poItemId: poIssuedLaptop.id, itemId: itemByCode['ITM-LAP-15'].id, receivedQty: '2.00', acceptedQty: '2.00', rejectedQty: '0.00', disposition: 'Accepted' },
        { grnId: grnPosted.id, poItemId: poIssuedMonitor.id, itemId: itemByCode['ITM-MON-24'].id, receivedQty: '1.00', acceptedQty: '1.00', rejectedQty: '0.00', disposition: 'Accepted' },
    ]);

    await db.insert(schema.stockTransactions).values([
        { itemId: itemByCode['ITM-LAP-15'].id, warehouseId: mainWarehouse.id, type: 'Receipt', quantity: '2.00', unitCost: '52000.00', referenceType: 'GRN', referenceId: String(grnPosted.id), targetWarehouseId: mainWarehouse.id, notes: 'Starter seed receipt for laptops', performedBy: store.id, idempotencyKey: 'seed-grn-laptop-1' },
        { itemId: itemByCode['ITM-MON-24'].id, warehouseId: mainWarehouse.id, type: 'Receipt', quantity: '1.00', unitCost: '9800.00', referenceType: 'GRN', referenceId: String(grnPosted.id), targetWarehouseId: mainWarehouse.id, notes: 'Starter seed receipt for monitors', performedBy: store.id, idempotencyKey: 'seed-grn-monitor-1' },
    ]);

    await db.update(schema.stockLevels).set({ quantity: '6.00', updatedAt: new Date(), versionNo: 2 }).where(eq(schema.stockLevels.itemId, itemByCode['ITM-LAP-15'].id));
    await db.update(schema.stockLevels).set({ quantity: '8.00', updatedAt: new Date(), versionNo: 2 }).where(eq(schema.stockLevels.itemId, itemByCode['ITM-MON-24'].id));

    const [invoiceApproved, invoicePaid] = await db.insert(schema.invoices).values([
        { invoiceNo: 'INV-2026-0001', vendorInvoiceNo: 'TSI-4451', vendorId: vendorTech.id, poId: poIssued.id, date: new Date('2026-03-15T10:00:00Z'), dueDate: new Date('2026-04-14T00:00:00Z'), amount: '113800.00', matchedAmount: '113800.00', paidAmount: '0.00', balanceAmount: '113800.00', status: 'Approved', remarks: 'Partial delivery invoice awaiting payment', enteredBy: finance.id, approvedAt: new Date('2026-03-15T15:00:00Z'), approvedBy: finance.id },
        { invoiceNo: 'INV-2026-0002', vendorInvoiceNo: 'OEC-2201', vendorId: vendorOffice.id, poId: poDraft.id, date: new Date('2026-03-05T10:00:00Z'), dueDate: new Date('2026-03-20T00:00:00Z'), amount: '7250.00', matchedAmount: '7250.00', paidAmount: '7250.00', balanceAmount: '0.00', status: 'Paid', remarks: 'Starter paid invoice for finance screen', enteredBy: finance.id, approvedAt: new Date('2026-03-06T12:00:00Z'), approvedBy: finance.id },
    ]).returning();

    await db.insert(schema.invoiceLines).values([
        { invoiceId: invoiceApproved.id, poItemId: poIssuedLaptop.id, itemId: itemByCode['ITM-LAP-15'].id, quantity: '2.00', unitPrice: '52000.00', lineAmount: '104000.00' },
        { invoiceId: invoiceApproved.id, poItemId: poIssuedMonitor.id, itemId: itemByCode['ITM-MON-24'].id, quantity: '1.00', unitPrice: '9800.00', lineAmount: '9800.00' },
        { invoiceId: invoicePaid.id, poItemId: poDraftMonitor.id, itemId: itemByCode['ITM-MON-24'].id, quantity: '1.00', unitPrice: '7250.00', lineAmount: '7250.00' },
    ]);

    const [paymentPaid] = await db.insert(schema.payments).values([
        { paymentNo: 'PAY-2026-0001', vendorId: vendorOffice.id, paymentDate: new Date('2026-03-07T10:00:00Z'), amount: '7250.00', method: 'Bank Transfer', status: 'Posted', referenceNo: 'UTR0099123', remarks: 'Seed payment posted for paid invoice', createdBy: finance.id, postedAt: new Date('2026-03-07T10:15:00Z'), postedBy: finance.id },
    ]).returning();

    await db.insert(schema.paymentAllocations).values([
        { paymentId: paymentPaid.id, invoiceId: invoicePaid.id, allocatedAmount: '7250.00' },
    ]);

    const [materialRequest] = await db.insert(schema.materialRequests).values([
        { requestNo: 'MR-2026-0001', requestorId: department.id, department: 'Operations', date: new Date('2026-03-17T10:00:00Z'), status: 'Requested' },
    ]).returning();

    await db.insert(schema.materialRequestItems).values([
        { mrId: materialRequest.id, itemId: itemByCode['ITM-TAPE-48'].id, quantity: '12.00' },
        { mrId: materialRequest.id, itemId: itemByCode['ITM-CLEAN-05'].id, quantity: '5.00' },
    ]);

    await db.insert(schema.activityLogs).values([
        { userId: admin.id, userName: admin.name, action: 'SEED_INIT', description: 'Starter environment created', module: 'System', entityType: 'SeedRun' },
        { userId: procurement.id, userName: procurement.name, action: 'PO_CREATED', description: 'Starter PO created for demo flows', module: 'Procurement', entityType: 'PurchaseOrder', entityId: poIssued.id },
        { userId: store.id, userName: store.name, action: 'GRN_POSTED', description: 'Starter GRN posted for demo flows', module: 'Inventory', entityType: 'GRN', entityId: grnPosted.id },
        { userId: finance.id, userName: finance.name, action: 'INVOICE_CREATED', description: 'Starter invoice entered for demo flows', module: 'Finance', entityType: 'Invoice', entityId: invoiceApproved.id },
    ]);

    console.log('Seed completed successfully.');
    console.log('Login Credentials (all use password: admin123)');
    console.log('  Admin       : admin@erp.com');
    console.log('  Procurement : procurement@erp.com');
    console.log('  Store       : store@erp.com');
    console.log('  Finance     : finance@erp.com');
    console.log('  Department  : dept@erp.com');
}

seed().catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
});
