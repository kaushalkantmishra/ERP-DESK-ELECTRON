import { and, eq, sql } from 'drizzle-orm';
import {
    activityLogs,
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

export interface ApprovalMatrixRule {
    id: string;
    role: string;
    document: string;
    minAmount: number;
    maxAmount: number;
    approvers: number;
    active: boolean;
}

export interface ApprovalMatrixConfig {
    simulationMode: boolean;
    adminBypass: boolean;
    rules: ApprovalMatrixRule[];
}

export const APPROVAL_MATRIX_SETTINGS_KEY = 'erp.approval_matrix';

export const DEFAULT_APPROVAL_MATRIX: ApprovalMatrixConfig = {
    simulationMode: false,
    adminBypass: true,
    rules: [
        { id: '1', role: 'Procurement', document: 'Purchase Requisition', minAmount: 0, maxAmount: 50000, approvers: 1, active: true },
        { id: '2', role: 'Admin', document: 'Purchase Requisition', minAmount: 50001, maxAmount: 0, approvers: 1, active: true },
        { id: '3', role: 'Procurement', document: 'Purchase Order', minAmount: 0, maxAmount: 50000, approvers: 1, active: true },
        { id: '4', role: 'Finance', document: 'Purchase Order', minAmount: 50001, maxAmount: 200000, approvers: 1, active: true },
        { id: '5', role: 'Admin', document: 'Purchase Order', minAmount: 200001, maxAmount: 0, approvers: 1, active: true },
        { id: '6', role: 'Store', document: 'Material Request', minAmount: 0, maxAmount: 0, approvers: 1, active: true },
        { id: '7', role: 'Finance', document: 'Vendor Invoice', minAmount: 0, maxAmount: 50000, approvers: 1, active: true },
        { id: '8', role: 'Admin', document: 'Vendor Invoice', minAmount: 50001, maxAmount: 0, approvers: 1, active: true },
        { id: '9', role: 'Finance', document: 'Payment', minAmount: 0, maxAmount: 0, approvers: 1, active: true },
    ],
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

export function toId(value: string | number | null | undefined, field = 'id'): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${field}`);
    }
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

export async function getApprovalMatrix(tx: AnyTx): Promise<ApprovalMatrixConfig> {
    const row = await tx.query.systemSettings.findFirst({
        where: eq(systemSettings.key, APPROVAL_MATRIX_SETTINGS_KEY),
    });

    if (!row?.value || typeof row.value !== 'object') {
        return DEFAULT_APPROVAL_MATRIX;
    }

    const value = row.value as Partial<ApprovalMatrixConfig>;
    return {
        simulationMode: value.simulationMode === true,
        adminBypass: value.adminBypass !== false,
        rules: Array.isArray(value.rules)
            ? value.rules.map((rule) => ({
                id: String((rule as any).id || ''),
                role: String((rule as any).role || ''),
                document: String((rule as any).document || ''),
                minAmount: toDecimal((rule as any).minAmount),
                maxAmount: toDecimal((rule as any).maxAmount),
                approvers: Math.max(1, Number((rule as any).approvers || 1)),
                active: (rule as any).active !== false,
            }))
            : DEFAULT_APPROVAL_MATRIX.rules,
    };
}

function normalizeApprovalText(value: string) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function documentMatches(ruleDocument: string, targetDocument: string) {
    const normalizedRule = normalizeApprovalText(ruleDocument);
    const normalizedTarget = normalizeApprovalText(targetDocument);
    const aliases: Record<string, string[]> = {
        purchaserequisition: ['pr'],
        purchaseorder: ['po'],
        vendorinvoice: ['invoice'],
        materialrequest: ['mr'],
    };

    return normalizedRule === normalizedTarget || (aliases[normalizedTarget] || []).includes(normalizedRule);
}

function roleMatches(ruleRole: string, userRole: string) {
    const normalizedRule = normalizeApprovalText(ruleRole);
    const normalizedUserRole = normalizeApprovalText(userRole);
    if (normalizedRule === normalizedUserRole) return true;

    const roleAliases: Record<string, string[]> = {
        admin: ['administrator', 'director', 'management'],
        procurement: ['procurementmanager', 'purchasemanager', 'buyer'],
        finance: ['financemanager', 'accounts', 'accountspayable'],
        store: ['storemanager', 'warehouse', 'warehousemanager'],
        dept: ['department', 'departmentmanager', 'requestor'],
        vendor: ['supplier'],
    };

    return (roleAliases[normalizedUserRole] || []).includes(normalizedRule);
}

export async function evaluateApprovalDecision(
    tx: AnyTx,
    params: {
        req: { user?: { id: string | number; role: string } };
        document: string;
        amount: number;
        entityType: string;
        entityId: number;
        targetStatus: string;
        currentStatus: string;
        entityVersion: number;
    },
) {
    const matrix = await getApprovalMatrix(tx);
    if (matrix.simulationMode) return { mode: 'simulation' as const };

    const userRole = params.req.user?.role || '';
    if (matrix.adminBypass && userRole === 'Admin') return { mode: 'bypass' as const };

    const matchingRules = matrix.rules
        .filter((rule) => rule.active)
        .filter((rule) => documentMatches(rule.document, params.document))
        .filter((rule) => {
            if (rule.minAmount === 0 && rule.maxAmount === 0) return true;
            if (rule.maxAmount === 0) return params.amount >= rule.minAmount;
            return params.amount >= rule.minAmount && params.amount <= rule.maxAmount;
        })
        .sort((a, b) => b.minAmount - a.minAmount);

    const rule = matchingRules[0];
    if (!rule) return { mode: 'no_rule' as const };

    if (!roleMatches(rule.role, userRole)) {
        throw new Error(`${params.document} requires approval by ${rule.role} for amount ${params.amount.toFixed(2)}`);
    }

    if (rule.approvers <= 1) {
        return { mode: 'final' as const, rule, approvalsRecorded: 1, approvalsRequired: 1 };
    }

    const approvalLogs = await tx.query.activityLogs.findMany({
        where: and(eq(activityLogs.entityType, params.entityType), eq(activityLogs.entityId, params.entityId), eq(activityLogs.action, 'APPROVAL_STEP_RECORDED')),
    });

    const relevantLogs = approvalLogs.filter((log: any) => {
        const payload = (log.payload && typeof log.payload === 'object') ? log.payload as Record<string, unknown> : {};
        return payload.document === params.document
            && payload.targetStatus === params.targetStatus
            && payload.currentStatus === params.currentStatus
            && Number(payload.entityVersion) === params.entityVersion;
    });

    const distinctApproverIds = [...new Set(
        relevantLogs
            .map((log: any) => Number(log.userId))
            .filter((value: number) => Number.isInteger(value) && value > 0),
    )];
    const currentUserId = typeof params.req.user?.id === 'number' ? params.req.user.id : Number(params.req.user?.id);

    if (distinctApproverIds.includes(currentUserId)) {
        throw new Error(`You have already approved this ${params.document}. Waiting for ${Math.max(0, rule.approvers - distinctApproverIds.length)} more approval(s).`);
    }

    const nextApprovalCount = distinctApproverIds.length + 1;
    if (nextApprovalCount < rule.approvers) {
        return {
            mode: 'record_only' as const,
            rule,
            approvalsRecorded: nextApprovalCount,
            approvalsRequired: rule.approvers,
        };
    }

    return {
        mode: 'final' as const,
        rule,
        approvalsRecorded: nextApprovalCount,
        approvalsRequired: rule.approvers,
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
    id: number,
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
