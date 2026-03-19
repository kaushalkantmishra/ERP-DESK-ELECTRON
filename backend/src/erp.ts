import { and, eq, sql } from 'drizzle-orm';
import {
    documentSequences,
    systemSettings,
} from './db/schema.js';

type AnyTx = any;

export const STRICT_TRANSITIONS = {
    PR: {
        Draft: ['Submitted', 'Cancelled'],
        Submitted: ['Approved', 'Rejected', 'Cancelled'],
        Approved: ['Closed', 'Cancelled'],
        Rejected: ['Submitted', 'Cancelled'],
        Closed: [],
        Cancelled: [],
    } as Record<string, string[]>,
    PO: {
        Draft: ['Issued', 'Cancelled'],
        Issued: ['Partially Received', 'Fully Received', 'Closed', 'Cancelled'],
        'Partially Received': ['Fully Received', 'Closed'],
        'Fully Received': ['Closed'],
        Closed: [],
        Cancelled: [],
    } as Record<string, string[]>,
    GRN: {
        Draft: ['Posted'],
        Posted: ['Reversed'],
        Reversed: [],
    } as Record<string, string[]>,
    Invoice: {
        Draft: ['Matched', 'Cancelled'],
        Matched: ['Approved', 'Cancelled'],
        Approved: ['Partially Paid', 'Paid'],
        'Partially Paid': ['Paid'],
        Paid: [],
        Cancelled: [],
    } as Record<string, string[]>,
    Payment: {
        Draft: ['Posted', 'Cancelled'],
        Posted: ['Cancelled'],
        Cancelled: [],
    } as Record<string, string[]>,
} as const;

export interface ProcurementSettings {
    qtyTolerancePct: number;
    priceVariancePct: number;
    allowNegativeStock: boolean;
    warnOnlyOnTolerance: boolean;
    fiscalYearStartMonth: number;
    documentPrefixes: Record<string, string>;
}

export const DEFAULT_SETTINGS: ProcurementSettings = {
    qtyTolerancePct: 5,
    priceVariancePct: 5,
    allowNegativeStock: false,
    warnOnlyOnTolerance: false,
    fiscalYearStartMonth: 1,
    documentPrefixes: {
        PR: 'PR',
        RFQ: 'RFQ',
        QT: 'QT',
        PO: 'PO',
        GRN: 'GRN',
        INV: 'INV',
        PAY: 'PAY',
        MR: 'MR',
    },
};

export function assertTransition(currentStatus: string, nextStatus: string, transitions: Record<string, string[]>, entityName: string) {
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
        throw new Error(`${entityName} cannot move from ${currentStatus} to ${nextStatus}`);
    }
}

export function toDecimal(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) throw new Error(`Invalid numeric value: ${value}`);
    return parsed;
}

export function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}

export function percentVariance(base: number, actual: number): number {
    if (base === 0) return actual === 0 ? 0 : 100;
    return roundMoney(((actual - base) / base) * 100);
}

export function computeTaxAmounts(quantity: number, unitPrice: number, taxRate: number) {
    const baseAmount = roundMoney(quantity * unitPrice);
    const taxAmount = roundMoney(baseAmount * (taxRate / 100));
    const totalAmount = roundMoney(baseAmount + taxAmount);
    return { baseAmount, taxAmount, totalAmount, taxableAmount: baseAmount, vatAmount: taxAmount };
}

export function getFiscalYear(date: Date, fiscalYearStartMonth = 1) {
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    return month >= fiscalYearStartMonth ? year : year - 1;
}

export async function getSettings(tx: AnyTx): Promise<ProcurementSettings> {
    const row = await tx.query.systemSettings.findFirst({
        where: eq(systemSettings.key, 'erp.procurement_inventory'),
    });

    if (!row?.value || typeof row.value !== 'object') {
        return DEFAULT_SETTINGS;
    }

    return {
        ...DEFAULT_SETTINGS,
        ...(row.value as Partial<ProcurementSettings>),
        documentPrefixes: {
            ...DEFAULT_SETTINGS.documentPrefixes,
            ...(((row.value as Partial<ProcurementSettings>).documentPrefixes) || {}),
        },
    };
}

export async function generateDocumentNo(tx: AnyTx, docType: string, txnDate = new Date()) {
    const settings = await getSettings(tx);
    const fiscalYear = getFiscalYear(txnDate, settings.fiscalYearStartMonth);
    const prefix = settings.documentPrefixes[docType] || docType;

    const existing = await tx.query.documentSequences.findFirst({
        where: and(
            eq(documentSequences.docType, docType),
            eq(documentSequences.fiscalYear, fiscalYear),
            eq(documentSequences.prefix, prefix),
        ),
    });

    const persistedLastNumber = existing?.lastNumber || 0;
    const maxUsedNumber = await getMaxExistingDocumentNumber(tx, docType, prefix, fiscalYear);
    const nextNumber = Math.max(persistedLastNumber, maxUsedNumber) + 1;

    if (existing) {
        await tx.update(documentSequences)
            .set({ lastNumber: nextNumber, updatedAt: new Date() })
            .where(and(
                eq(documentSequences.docType, docType),
                eq(documentSequences.fiscalYear, fiscalYear),
                eq(documentSequences.prefix, prefix),
            ));
    } else {
        await tx.insert(documentSequences).values({
            docType,
            fiscalYear,
            prefix,
            lastNumber: nextNumber,
        });
    }

    return `${prefix}-${fiscalYear}-${String(nextNumber).padStart(4, '0')}`;
}

async function getMaxExistingDocumentNumber(tx: AnyTx, docType: string, prefix: string, fiscalYear: number) {
    const mapping: Record<string, { table: string; column: string }> = {
        PR: { table: 'purchase_requisitions', column: 'pr_no' },
        RFQ: { table: 'rfqs', column: 'rfq_no' },
        PO: { table: 'purchase_orders', column: 'po_no' },
        GRN: { table: 'grns', column: 'grn_no' },
        INV: { table: 'invoices', column: 'invoice_no' },
        PAY: { table: 'payments', column: 'payment_no' },
        MR: { table: 'material_requests', column: 'request_no' },
    };

    const target = mapping[docType];
    if (!target) return 0;

    const likePattern = `${prefix}-${fiscalYear}-%`;
    const query = sql.raw(`
        select coalesce(max(cast(right(${target.column}, 4) as integer)), 0) as max_no
        from ${target.table}
        where ${target.column} like '${likePattern}'
    `);

    const result = await tx.execute(query);
    return Number(result.rows?.[0]?.max_no || 0);
}

export function enforceTolerance(actual: number, limit: number, tolerancePct: number, label: string, warnOnly = false) {
    const upperLimit = roundMoney(limit * (1 + tolerancePct / 100));
    if (actual <= upperLimit) {
        return {
            withinTolerance: actual > limit,
            message: actual > limit ? `${label} exceeds base value but is within configured tolerance` : null,
        };
    }
    const errorMessage = `${label} exceeds allowed tolerance. Actual ${actual}, limit ${limit}, tolerance ${tolerancePct}%`;
    if (warnOnly) {
        return {
            withinTolerance: true,
            message: errorMessage,
        };
    }
    throw new Error(errorMessage);
}

export async function optimisticVersionUpdate(
    tx: AnyTx,
    table: any,
    idColumn: any,
    id: string,
    currentVersion: number,
    patch: Record<string, unknown>,
) {
    const result = await tx.update(table)
        .set({ ...patch, versionNo: currentVersion + 1 })
        .where(and(eq(idColumn, id), eq(table.versionNo, currentVersion)))
        .returning();

    if (result.length === 0) {
        throw new Error('The record was modified by another user. Please refresh and try again.');
    }

    return result[0];
}

export function normalizeText(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
