import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Receipt, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { Invoice } from '../types/models';

type StepState = 'complete' | 'current' | 'pending';

interface ApprovalStep {
    key: string;
    title: string;
    detail: string;
    state: StepState;
}

const VendorInvoiceView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        void loadInvoice(id);
    }, [id]);

    async function loadInvoice(invoiceId: string) {
        try {
            setIsLoading(true);
            const data = await financeService.getInvoice(invoiceId);
            setInvoice(data);
        } catch (error) {
            console.error('Error fetching invoice:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function approveInvoice() {
        if (!invoice) return;
        try {
            setIsSubmitting(true);
            const result = await financeService.updateInvoiceStatus(invoice.id, 'Approved');
            if (result?.message) {
                alert(result.message);
            }
            await loadInvoice(invoice.id);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to approve invoice');
        } finally {
            setIsSubmitting(false);
        }
    }

    const approvalSteps = useMemo<ApprovalStep[]>(() => {
        if (!invoice) return [];

        const isEntered = invoice.status !== 'Draft';
        const isMatched = ['Matched', 'Approved', 'Partially Paid', 'Paid'].includes(invoice.status);
        const isApproved = ['Approved', 'Partially Paid', 'Paid'].includes(invoice.status);
        const isPaid = invoice.status === 'Paid';
        const isPartiallyPaid = invoice.status === 'Partially Paid';

        return [
            {
                key: 'entered',
                title: 'Invoice Entered',
                detail: isEntered ? `Captured on ${new Date(invoice.date).toLocaleDateString()}` : 'Waiting for invoice entry',
                state: isEntered ? 'complete' : 'current',
            },
            {
                key: 'matched',
                title: 'Matched Against PO/GRN',
                detail: isMatched ? 'PO and receipt matching completed' : 'Matching pending',
                state: isMatched ? 'complete' : isEntered ? 'current' : 'pending',
            },
            {
                key: 'approved',
                title: 'Approval',
                detail: isApproved ? 'Approved for payment processing' : invoice.status === 'Matched' ? 'Waiting for approval' : 'Approval not started',
                state: isApproved ? 'complete' : isMatched ? 'current' : 'pending',
            },
            {
                key: 'payment',
                title: 'Payment',
                detail: isPaid ? 'Fully paid' : isPartiallyPaid ? 'Partially paid' : 'Payment not completed',
                state: isPaid ? 'complete' : isApproved ? 'current' : 'pending',
            },
        ];
    }, [invoice]);

    const statusTone = invoice?.status === 'Cancelled'
        ? 'badge-error'
        : invoice?.status === 'Approved' || invoice?.status === 'Paid'
            ? 'badge-success'
            : invoice?.status === 'Matched' || invoice?.status === 'Partially Paid'
                ? 'badge-warning'
                : 'badge-info';

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading invoice details...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Finance</span>
                <span>/</span>
                <span>Vendor Invoices</span>
                <span>/</span>
                <span className="text-vscode-text">{invoice?.invoiceNo || 'View'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <Receipt size={16} className="text-vscode-accent" />
                    Invoice View
                </h2>
                {invoice?.status === 'Matched' && (
                    <button
                        className="btn-primary flex items-center gap-2 ml-auto"
                        disabled={isSubmitting}
                        onClick={() => void approveInvoice()}
                    >
                        <CheckCircle2 size={14} />
                        <span>{isSubmitting ? 'Approving...' : 'Approve Invoice'}</span>
                    </button>
                )}
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={() => navigate('/finance/invoices')}>
                    <ArrowLeft size={14} />
                    <span>Back</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {invoice && (
                    <>
                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-vscode-text">{invoice.invoiceNo}</h3>
                                    <div className="text-sm text-vscode-text-muted">Vendor Invoice No: {invoice.vendorInvoiceNo}</div>
                                    <div className="text-sm text-vscode-text-muted">Vendor: {invoice.vendor?.name || invoice.vendorId}</div>
                                    <div className="text-sm text-vscode-text-muted">Purchase Order: {invoice.po?.poNo || invoice.poId}</div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div><span className={`badge ${statusTone}`}>{invoice.status}</span></div>
                                    <div className="font-mono text-vscode-text">Amount: ${Number(invoice.amount).toFixed(2)}</div>
                                    <div className="font-mono text-vscode-text-muted">Balance: ${Number(invoice.balanceAmount).toFixed(2)}</div>
                                    <div className="text-sm text-vscode-text-muted">Date: {new Date(invoice.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Approval Status</h3>
                                <p className="text-xs text-vscode-text-muted">This shows what is completed and what is still pending.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {approvalSteps.map((step) => {
                                    const icon = step.state === 'complete'
                                        ? <CheckCircle2 size={18} className="text-status-success" />
                                        : step.state === 'current'
                                            ? <Clock3 size={18} className="text-status-warning" />
                                            : <XCircle size={18} className="text-vscode-text-muted" />;
                                    return (
                                        <div key={step.key} className="border border-vscode-border rounded-lg p-4 bg-vscode-bg">
                                            <div className="flex items-center gap-2 mb-2">
                                                {icon}
                                                <div className="font-medium text-vscode-text">{step.title}</div>
                                            </div>
                                            <div className="text-sm text-vscode-text-muted">{step.detail}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {invoice.matchWarnings && invoice.matchWarnings.length > 0 && (
                            <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-3 text-status-warning">
                                    <AlertTriangle size={16} />
                                    <h3 className="font-semibold">Matching Warnings</h3>
                                </div>
                                <div className="space-y-2">
                                    {invoice.matchWarnings.map((warning, index) => (
                                        <div key={`${warning}-${index}`} className="text-sm text-vscode-text-muted border border-vscode-border rounded p-3 bg-vscode-bg">
                                            {warning}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Invoice Lines</h3>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                            <th>Line Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(invoice.invoiceLines || []).map((line, index) => (
                                            <tr key={`${line.poItemId}-${index}`}>
                                                <td>{line.item?.code || line.itemId} - {line.item?.name || 'Item'}</td>
                                                <td className="font-mono">{Number(line.quantity).toFixed(2)}</td>
                                                <td className="font-mono">${Number(line.unitPrice).toFixed(2)}</td>
                                                <td className="font-mono">${Number(line.lineAmount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {(invoice.invoiceLines || []).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-vscode-text-muted">No invoice lines found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default VendorInvoiceView;
