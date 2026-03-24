import ExcelJS from 'exceljs';

type QuotationTemplateLine = {
    itemId: number;
    itemCode?: string | null;
    itemName: string;
    uom?: string | null;
    requestedQty: number;
    openQty?: number | null;
    requiredDate?: Date | null;
    taxRate?: number | null;
};

export type QuotationTemplatePayload = {
    rfqId: number;
    rfqNo: string;
    prNo?: string | null;
    prDate?: Date | null;
    department?: string | null;
    requestedBy?: string | null;
    priority?: string | null;
    justification?: string | null;
    dueDate?: Date | null;
    vendorId: number;
    vendorName: string;
    lines: QuotationTemplateLine[];
};

export type ImportedQuotationWorkbook = {
    rfqId: number;
    vendorId: number;
    deliveryDate: Date;
    items: Array<{
        itemId: number;
        qty: number;
        unitPrice: number;
        deliveryDate?: Date | null;
        notes?: string;
    }>;
};

export type PurchaseOrderWorkbookPayload = {
    poNo: string;
    vendorName: string;
    prNo?: string | null;
    rfqNo?: string | null;
    deliveryDate?: Date | null;
    totalAmount?: number;
    lines: Array<{
        itemCode?: string | null;
        itemName: string;
        uom?: string | null;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        totalAmount?: number;
    }>;
};

function formatDate(date?: Date | null) {
    return date ? date.toISOString().slice(0, 10) : '';
}

function getWorksheetCellText(worksheet: ExcelJS.Worksheet, address: string) {
    const rawValue = worksheet.getCell(address).value;
    if (rawValue === null || rawValue === undefined) return '';
    if (typeof rawValue === 'object' && 'text' in rawValue && rawValue.text) return String(rawValue.text).trim();
    return String(rawValue).trim();
}

function getNumericCellValue(value: ExcelJS.CellValue) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return null;
    if (typeof value === 'object' && value && 'result' in value && typeof value.result === 'number') return value.result;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : null;
}

export async function buildQuotationTemplateWorkbook(payload: QuotationTemplatePayload) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP Procurement';
    workbook.created = new Date();

    const guideSheet = workbook.addWorksheet('Instructions');
    guideSheet.columns = [{ width: 100 }];
    guideSheet.addRows([
        ['Quotation Template Instructions'],
        ['1. Do not change RFQ ID, Vendor ID, Item ID, or the sheet names.'],
        ['2. Review the attached PR details and item list exactly as shared by the buyer.'],
        ['3. Enter your quoted Unit Price only in the Quote sheet.'],
        ['4. Do not edit any other cells in the Quote sheet.'],
        ['5. Save the file and import it into the ERP Quotations screen.'],
    ]);
    guideSheet.getCell('A1').font = { bold: true, size: 14 };

    const metaSheet = workbook.addWorksheet('RFQ');
    metaSheet.columns = [{ width: 24 }, { width: 36 }];
    metaSheet.addRows([
        ['RFQ ID', payload.rfqId],
        ['RFQ No', payload.rfqNo],
        ['PR No', payload.prNo || ''],
        ['PR Date', formatDate(payload.prDate)],
        ['Department', payload.department || ''],
        ['Requested By', payload.requestedBy || ''],
        ['Priority', payload.priority || ''],
        ['Justification', payload.justification || ''],
        ['Vendor ID', payload.vendorId],
        ['Vendor Name', payload.vendorName],
        ['Due Date', formatDate(payload.dueDate)],
    ]);
    for (let index = 1; index <= 11; index += 1) {
        metaSheet.getCell(`A${index}`).font = { bold: true };
    }
    metaSheet.getCell('B8').alignment = { wrapText: true, vertical: 'top' };
    metaSheet.getRow(8).height = 42;

    const quoteSheet = workbook.addWorksheet('Quote');
    quoteSheet.columns = [
        { header: 'PR No', key: 'prNo', width: 16 },
        { header: 'Item ID', key: 'itemId', width: 12 },
        { header: 'Item Code', key: 'itemCode', width: 18 },
        { header: 'Item Name', key: 'itemName', width: 28 },
        { header: 'UOM', key: 'uom', width: 10 },
        { header: 'Requested Qty', key: 'requestedQty', width: 16 },
        { header: 'Required Date', key: 'requiredDate', width: 16 },
        { header: 'Open Qty', key: 'openQty', width: 14 },
        { header: 'Tax Rate (%)', key: 'taxRate', width: 14 },
        { header: 'Vendor Unit Price', key: 'unitPrice', width: 18 },
    ];

    quoteSheet.getRow(1).values = ['PR No', 'Item ID', 'Item Code', 'Item Name', 'UOM', 'Requested Qty', 'Required Date', 'Open Qty', 'Tax Rate (%)', 'Vendor Unit Price'];
    quoteSheet.getRow(1).font = { bold: true };
    quoteSheet.views = [{ state: 'frozen', ySplit: 1 }];

    payload.lines.forEach((line) => {
        quoteSheet.addRow({
            prNo: payload.prNo || '',
            itemId: line.itemId,
            itemCode: line.itemCode || '',
            itemName: line.itemName,
            uom: line.uom || '',
            requestedQty: line.requestedQty,
            requiredDate: formatDate(line.requiredDate),
            openQty: line.openQty ?? line.requestedQty,
            taxRate: line.taxRate ?? 0,
            unitPrice: '',
        });
    });

    quoteSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.getCell(1).protection = { locked: true };
        row.getCell(2).protection = { locked: true };
        row.getCell(3).protection = { locked: true };
        row.getCell(4).protection = { locked: true };
        row.getCell(5).protection = { locked: true };
        row.getCell(6).protection = { locked: true };
        row.getCell(7).protection = { locked: true };
        row.getCell(8).protection = { locked: true };
        row.getCell(9).protection = { locked: true };
    });

    return workbook.xlsx.writeBuffer();
}

export async function parseQuotationTemplateWorkbook(fileBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<ImportedQuotationWorkbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const metaSheet = workbook.getWorksheet('RFQ');
    const quoteSheet = workbook.getWorksheet('Quote');
    if (!metaSheet || !quoteSheet) {
        throw new Error('Invalid quotation file. Expected RFQ and Quote sheets.');
    }

    const rfqId = Number(getWorksheetCellText(metaSheet, 'B1'));
    const vendorId = Number(getWorksheetCellText(metaSheet, 'B9'));
    if (!Number.isInteger(rfqId) || rfqId <= 0) throw new Error('Invalid RFQ ID in quotation file');
    if (!Number.isInteger(vendorId) || vendorId <= 0) throw new Error('Invalid vendor ID in quotation file');

    const items: ImportedQuotationWorkbook['items'] = [];
    let derivedDeliveryDate: Date | null = null;

    quoteSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const itemId = getNumericCellValue(row.getCell(2).value);
        if (!itemId) return;

        const unitPrice = getNumericCellValue(row.getCell(10).value);
        if (unitPrice === null || unitPrice < 0) return;

        const qty = getNumericCellValue(row.getCell(8).value) ?? getNumericCellValue(row.getCell(6).value) ?? 0;
        if (qty <= 0) {
            throw new Error(`Invalid quantity for item ${itemId} in quotation file`);
        }

        items.push({
            itemId,
            qty,
            unitPrice,
        });
    });

    if (items.length === 0) {
        throw new Error('No quotation lines with unit prices were found in the file');
    }

    return {
        rfqId,
        vendorId,
        deliveryDate: derivedDeliveryDate || new Date(),
        items,
    };
}
