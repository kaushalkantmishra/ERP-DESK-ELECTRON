import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FileText, PackageCheck, Send, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { procurementService } from '../services/procurementService';
import { PurchaseOrder, POStatus } from '../types/models';

type StepState = 'complete' | 'current' | 'pending';

interface WorkflowStep {
    key: string;
    title: string;
    detail: string;
    state: StepState;
}

const PurchaseOrderView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        void loadPO(id);
    }, [id]);

    async function loadPO(poId: string) {
        try {
            setIsLoading(true);
            const data = await procurementService.getPO(poId);
            setPo(data);
        } catch (error) {
            console.error('Error fetching purchase order:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function updateStatus(status: POStatus, confirmationMessage?: string) {
        if (!po) return;
        if (confirmationMessage && !window.confirm(confirmationMessage)) return;

        try {
            setIsSubmitting(true);
            await procurementService.updatePOStatus(po.id, status);
            await loadPO(po.id);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || `Unable to update PO to ${status}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const totals = useMemo(() => {
        if (!po) return { ordered: 0, received: 0, invoiced: 0, openReceipt: 0 };

        return (po.poItems || []).reduce((summary, line) => ({
            ordered: summary.ordered + Number(line.orderedQty || 0),
            received: summary.received + Number(line.receivedQty || 0),
            invoiced: summary.invoiced + Number(line.invoicedQty || 0),
            openReceipt: summary.openReceipt + Number(line.openReceiptQty ?? (Number(line.orderedQty || 0) - Number(line.receivedQty || 0) - Number(line.cancelledQty || 0))),
        }), { ordered: 0, received: 0, invoiced: 0, openReceipt: 0 });
    }, [po]);

    const workflowSteps = useMemo<WorkflowStep[]>(() => {
        if (!po) return [];

        const issued = po.status !== 'Draft' && po.status !== 'Cancelled';
        const partiallyReceived = ['Partially Received', 'Fully Received', 'Closed'].includes(po.status);
        const fullyReceived = ['Fully Received', 'Closed'].includes(po.status);
        const closed = po.status === 'Closed';

        return [
            {
                key: 'draft',
                title: 'Draft Created',
                detail: `PO prepared for ${po.vendor?.name || po.vendorId}`,
                state: po.status === 'Cancelled' ? 'complete' : 'complete',
            },
            {
                key: 'issued',
                title: 'PO Issued',
                detail: issued ? 'PO released for receipt processing' : 'Waiting to issue PO',
                state: issued ? 'complete' : 'current',
            },
            {
                key: 'receipt',
                title: 'Receipt Progress',
                detail: fullyReceived
                    ? 'All ordered quantity has been received'
                    : partiallyReceived
                        ? 'Partial receipt has been completed'
                        : 'No receipt posted yet',
                state: fullyReceived ? 'complete' : issued ? 'current' : 'pending',
            },
            {
                key: 'closure',
                title: 'Closure',
                detail: closed ? 'PO is closed' : po.status === 'Cancelled' ? 'PO was cancelled' : 'PO is still open',
                state: closed || po.status === 'Cancelled' ? 'complete' : partiallyReceived ? 'current' : 'pending',
            },
        ];
    }, [po]);

    const statusTone = po?.status === 'Cancelled'
        ? 'badge-error'
        : po?.status === 'Closed' || po?.status === 'Fully Received'
            ? 'badge-success'
            : po?.status === 'Partially Received'
                ? 'badge-warning'
                : 'badge-info';

    const canIssue = po?.status === 'Draft';
    const canCancel = po?.status === 'Draft' || po?.status === 'Issued';
    const canClose = po?.status === 'Issued' || po?.status === 'Partially Received' || po?.status === 'Fully Received';

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading purchase order...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span>PO Workbench</span>
                <span>/</span>
                <span className="text-vscode-text">{po?.poNo || 'View'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <FileText size={16} className="text-vscode-accent" />
                    PO View
                </h2>
                <div className="ml-auto flex items-center gap-2">
                    {canIssue && (
                        <button
                            className={`btn-primary flex items-center gap-2 ${po?.varianceAlert ? 'opacity-80' : ''}`}
                            disabled={isSubmitting}
                            onClick={() => void updateStatus('Issued', po?.varianceAlert ? 'This PO has a price variance above threshold. Do you still want to issue it?' : undefined)}
                        >
                            <Send size={14} />
                            <span>{isSubmitting ? 'Updating...' : 'Issue PO'}</span>
                        </button>
                    )}
                    {canClose && (
                        <button
                            className="btn-secondary flex items-center gap-2"
                            disabled={isSubmitting}
                            onClick={() => void updateStatus('Closed')}
                        >
                            <PackageCheck size={14} />
                            <span>{isSubmitting ? 'Updating...' : 'Close PO'}</span>
                        </button>
                    )}
                    {canCancel && (
                        <button
                            className="btn-secondary flex items-center gap-2"
                            disabled={isSubmitting}
                            onClick={() => void updateStatus('Cancelled', 'This will cancel the PO. Do you want to continue?')}
                        >
                            <XCircle size={14} />
                            <span>{isSubmitting ? 'Updating...' : 'Cancel PO'}</span>
                        </button>
                    )}
                    <button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/procurement/purchase-order')}>
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {po && (
                    <>
                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-vscode-text">{po.poNo}</h3>
                                    <div className="text-sm text-vscode-text-muted">Vendor: {po.vendor?.name || po.vendorId}</div>
                                    <div className="text-sm text-vscode-text-muted">PR: {po.pr?.prNo || po.prId || '-'}</div>
                                    <div className="text-sm text-vscode-text-muted">Delivery Date: {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '-'}</div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div className="flex justify-end gap-2">
                                        <span className={`badge ${statusTone}`}>{po.status}</span>
                                        {po.varianceAlert && <span className="badge badge-warning">Variance</span>}
                                    </div>
                                    <div className="font-mono text-vscode-text">Total: ${Number(po.totalAmount).toFixed(2)}</div>
                                    <div className="font-mono text-vscode-text-muted">Open Receipt: {totals.openReceipt.toFixed(2)}</div>
                                    <div className="text-sm text-vscode-text-muted">Created: {new Date(po.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">PO Status Flow</h3>
                                <p className="text-xs text-vscode-text-muted">This shows what is completed and what is still pending for this purchase order.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                                <div className="text-sm font-semibold text-vscode-text mb-3">Receipt Summary</div>
                                <div className="space-y-2 text-sm text-vscode-text-muted">
                                    <div>Ordered Qty: <span className="font-mono text-vscode-text">{totals.ordered.toFixed(2)}</span></div>
                                    <div>Received Qty: <span className="font-mono text-vscode-text">{totals.received.toFixed(2)}</span></div>
                                    <div>Open Receipt Qty: <span className="font-mono text-vscode-text">{totals.openReceipt.toFixed(2)}</span></div>
                                </div>
                            </div>
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="text-sm font-semibold text-vscode-text mb-3">Invoice Summary</div>
                                <div className="space-y-2 text-sm text-vscode-text-muted">
                                    <div>Invoiced Qty: <span className="font-mono text-vscode-text">{totals.invoiced.toFixed(2)}</span></div>
                                    <div>Invoices Linked: <span className="font-mono text-vscode-text">{po.invoices?.length || 0}</span></div>
                                    <div>GRNs Linked: <span className="font-mono text-vscode-text">{po.grns?.length || 0}</span></div>
                                </div>
                            </div>
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="text-sm font-semibold text-vscode-text mb-3">Document Health</div>
                                <div className="space-y-2 text-sm text-vscode-text-muted">
                                    <div>Vendor: <span className="text-vscode-text">{po.vendor?.name || 'Not linked'}</span></div>
                                    <div>Source PR: <span className="text-vscode-text">{po.pr?.prNo || 'Direct PO'}</span></div>
                                    <div>Price Variance: <span className="text-vscode-text">{Number(po.priceVariancePct || 0).toFixed(2)}%</span></div>
                                </div>
                            </div>
                        </section>

                        {po.varianceAlert && (
                            <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-2 text-status-warning">
                                    <AlertTriangle size={16} />
                                    <h3 className="font-semibold">Variance Alert</h3>
                                </div>
                                <div className="text-sm text-vscode-text-muted">
                                    This PO has a price variance higher than the configured tolerance. Review the line values before issuing the order.
                                </div>
                            </section>
                        )}

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">PO Lines</h3>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Ordered</th>
                                            <th>Received</th>
                                            <th>Open Receipt</th>
                                            <th>Unit Price</th>
                                            <th>Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(po.poItems || []).map((line) => (
                                            <tr key={line.id}>
                                                <td>{line.item?.code || line.itemId} - {line.item?.name || 'Item'}</td>
                                                <td className="font-mono">{Number(line.orderedQty).toFixed(2)}</td>
                                                <td className="font-mono">{Number(line.receivedQty).toFixed(2)}</td>
                                                <td className="font-mono">{Number(line.openReceiptQty ?? 0).toFixed(2)}</td>
                                                <td className="font-mono">${Number(line.unitPrice).toFixed(2)}</td>
                                                <td className="font-mono">{Number(line.priceVariancePct || 0).toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                        {(po.poItems || []).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-4 text-center text-vscode-text-muted">No PO lines found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="mb-4">
                                    <h3 className="font-semibold text-vscode-text">Linked GRNs</h3>
                                </div>
                                <div className="space-y-3">
                                    {(po.grns || []).map((grn) => (
                                        <div key={grn.id} className="border border-vscode-border rounded p-3 bg-vscode-bg">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-medium text-vscode-text">{grn.grnNo}</div>
                                                    <div className="text-sm text-vscode-text-muted">{grn.warehouse?.name || grn.warehouseId}</div>
                                                </div>
                                                <span className="badge badge-info">{grn.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(po.grns || []).length === 0 && <div className="text-sm text-vscode-text-muted">No GRNs linked yet.</div>}
                                </div>
                            </div>

                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="mb-4">
                                    <h3 className="font-semibold text-vscode-text">Linked Invoices</h3>
                                </div>
                                <div className="space-y-3">
                                    {(po.invoices || []).map((invoice) => (
                                        <div key={invoice.id} className="border border-vscode-border rounded p-3 bg-vscode-bg">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-medium text-vscode-text">{invoice.invoiceNo}</div>
                                                    <div className="text-sm text-vscode-text-muted">Amount: ${Number(invoice.amount).toFixed(2)}</div>
                                                </div>
                                                <span className="badge badge-info">{invoice.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(po.invoices || []).length === 0 && <div className="text-sm text-vscode-text-muted">No invoices linked yet.</div>}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderView;
