import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, Receipt, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { Payment } from '../types/models';

type StepState = 'complete' | 'current' | 'pending';

interface PaymentStep {
    key: string;
    title: string;
    detail: string;
    state: StepState;
}

const PaymentView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [payment, setPayment] = useState<Payment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        void loadPayment(id);
    }, [id]);

    async function loadPayment(paymentId: string) {
        try {
            setIsLoading(true);
            const data = await financeService.getPayment(paymentId);
            setPayment(data);
        } catch (error) {
            console.error('Error fetching payment:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const totals = useMemo(() => {
        const allocations = payment?.paymentAllocations || [];
        const allocated = allocations.reduce((sum, allocation) => sum + Number(allocation.allocatedAmount || 0), 0);
        return {
            allocated,
            invoices: allocations.length,
        };
    }, [payment]);

    const workflowSteps = useMemo<PaymentStep[]>(() => {
        if (!payment) return [];

        const posted = payment.status === 'Posted';
        const cancelled = payment.status === 'Cancelled';

        return [
            {
                key: 'created',
                title: 'Payment Captured',
                detail: `Prepared on ${new Date(payment.paymentDate).toLocaleDateString()}`,
                state: 'complete',
            },
            {
                key: 'allocated',
                title: 'Allocations Applied',
                detail: totals.invoices > 0 ? `${totals.invoices} invoice(s) linked` : 'No allocations found',
                state: totals.invoices > 0 ? 'complete' : 'current',
            },
            {
                key: 'posted',
                title: 'Payment Status',
                detail: posted ? 'Payment has been posted successfully' : cancelled ? 'Payment was cancelled' : 'Waiting for posting',
                state: posted || cancelled ? 'complete' : 'current',
            },
        ];
    }, [payment, totals.invoices]);

    const statusTone = payment?.status === 'Cancelled' ? 'badge-error' : 'badge-success';

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading payment details...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Finance</span>
                <span>/</span>
                <span>Payments</span>
                <span>/</span>
                <span className="text-vscode-text">{payment?.paymentNo || 'View'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <CreditCard size={16} className="text-vscode-accent" />
                    Payment View
                </h2>
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={() => navigate('/finance/payments')}>
                    <ArrowLeft size={14} />
                    <span>Back</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {payment && (
                    <>
                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-vscode-text">{payment.paymentNo}</h3>
                                    <div className="text-sm text-vscode-text-muted">Vendor: {payment.vendor?.name || payment.vendorId}</div>
                                    <div className="text-sm text-vscode-text-muted">Method: {payment.method}</div>
                                    <div className="text-sm text-vscode-text-muted">Reference No: {payment.referenceNo || '-'}</div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div><span className={`badge ${statusTone}`}>{payment.status}</span></div>
                                    <div className="font-mono text-vscode-text">Amount: ${Number(payment.amount).toFixed(2)}</div>
                                    <div className="text-sm text-vscode-text-muted">Date: {new Date(payment.paymentDate).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Payment Flow</h3>
                                <p className="text-xs text-vscode-text-muted">This shows the current state of the payment and invoice allocation.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {workflowSteps.map((step) => {
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

                        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="text-sm font-semibold text-vscode-text mb-3">Payment Summary</div>
                                <div className="space-y-2 text-sm text-vscode-text-muted">
                                    <div>Total Amount: <span className="font-mono text-vscode-text">${Number(payment.amount).toFixed(2)}</span></div>
                                    <div>Allocated Amount: <span className="font-mono text-vscode-text">${totals.allocated.toFixed(2)}</span></div>
                                    <div>Invoices Linked: <span className="font-mono text-vscode-text">{totals.invoices}</span></div>
                                </div>
                            </div>
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5 xl:col-span-2">
                                <div className="text-sm font-semibold text-vscode-text mb-3">Remarks</div>
                                <div className="text-sm text-vscode-text-muted whitespace-pre-wrap">
                                    {payment.remarks || 'No remarks captured for this payment.'}
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <Receipt size={16} className="text-vscode-accent" />
                                <h3 className="font-semibold text-vscode-text">Allocated Invoices</h3>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>PO</th>
                                            <th>Invoice Amount</th>
                                            <th>Allocated</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(payment.paymentAllocations || []).map((allocation, index) => (
                                            <tr key={allocation.id || `${allocation.invoiceId}-${index}`}>
                                                <td>{allocation.invoice?.invoiceNo || allocation.invoiceId}</td>
                                                <td>{allocation.invoice?.po?.poNo || allocation.invoice?.poId || '-'}</td>
                                                <td className="font-mono">${Number(allocation.invoice?.amount || 0).toFixed(2)}</td>
                                                <td className="font-mono">${Number(allocation.allocatedAmount || 0).toFixed(2)}</td>
                                                <td><span className="badge badge-info">{allocation.invoice?.status || '-'}</span></td>
                                            </tr>
                                        ))}
                                        {(payment.paymentAllocations || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-vscode-text-muted">No invoice allocations found.</td>
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

export default PaymentView;
