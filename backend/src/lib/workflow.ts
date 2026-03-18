export const prTransitions: Record<string, string[]> = {
    Draft: ['Submitted', 'Cancelled'],
    Submitted: ['Approved', 'Rejected', 'Cancelled'],
    Approved: ['PO Created', 'Cancelled'],
    Rejected: [],
    'PO Created': ['Closed'],
    Closed: [],
    Cancelled: [],
};

export const poTransitions: Record<string, string[]> = {
    Draft: ['Issued', 'Cancelled'],
    Issued: ['Partially Received', 'Fully Received', 'Cancelled', 'Closed'],
    'Partially Received': ['Fully Received', 'Cancelled', 'Closed'],
    'Fully Received': ['Closed'],
    Closed: [],
    Cancelled: [],
};

export const invoiceTransitions: Record<string, string[]> = {
    Draft: ['Entered', 'Cancelled'],
    Entered: ['Matched', 'Disputed', 'Cancelled'],
    Matched: ['Approved', 'Disputed', 'Cancelled'],
    Approved: ['Partially Paid', 'Paid', 'Disputed'],
    'Partially Paid': ['Paid', 'Disputed'],
    Paid: [],
    Disputed: ['Matched', 'Approved', 'Cancelled'],
    Cancelled: [],
};

export function assertTransition(
    currentStatus: string,
    nextStatus: string,
    transitions: Record<string, string[]>,
    entityName: string,
) {
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
        throw new Error(`${entityName} cannot move from ${currentStatus} to ${nextStatus}`);
    }
}

export function toDecimal(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
        return 0;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) {
        throw new Error(`Invalid numeric value: ${value}`);
    }

    return parsed;
}

export function roundMoney(value: number): number {
    return Number(value.toFixed(2));
}
