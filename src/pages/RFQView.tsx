import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, FileText, Users, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { procurementService } from '../services/procurementService';
import { RFQ } from '../types/models';

type StepState = 'complete' | 'current' | 'pending';

interface WorkflowStep {
    key: string;
    title: string;
    detail: string;
    state: StepState;
}

const RFQView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        void loadRFQ(id);
    }, [id]);

    async function loadRFQ(rfqId: string) {
        try {
            setIsLoading(true);
            const data = await procurementService.getRFQ(rfqId);
            setRfq(data);
        } catch (error) {
            console.error('Error fetching RFQ:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const workflowSteps = useMemo<WorkflowStep[]>(() => {
        if (!rfq) return [];

        const invitedVendorCount = rfq.rfqVendors?.length || rfq.vendorIds?.length || 0;
        const invited = invitedVendorCount > 0;
        const quotesReceived = (rfq.quotations?.length || 0) > 0;
        const closed = rfq.status === 'Closed';

        return [
            {
                key: 'created',
                title: 'RFQ Created',
                detail: `Created for PR ${rfq.purchaseRequisition?.prNo || rfq.prId}`,
                state: 'complete',
            },
            {
                key: 'vendors',
                title: 'Vendors Added',
                detail: invited ? `${invitedVendorCount} vendor(s) invited` : 'No vendors invited yet',
                state: invited ? 'complete' : 'current',
            },
            {
                key: 'quotes',
                title: 'Quotation Stage',
                detail: quotesReceived ? `${rfq.quotations?.length || 0} quotation(s) received` : 'Waiting for quotations',
                state: quotesReceived ? 'complete' : invited ? 'current' : 'pending',
            },
            {
                key: 'closure',
                title: 'Closure',
                detail: closed ? 'RFQ is closed' : 'RFQ is still active',
                state: closed ? 'complete' : quotesReceived ? 'current' : 'pending',
            },
        ];
    }, [rfq]);

    const statusTone = rfq?.status === 'Closed'
        ? 'badge-success'
        : rfq?.status === 'Sent'
            ? 'badge-warning'
            : 'badge-info';

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading RFQ...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span>RFQ Management</span>
                <span>/</span>
                <span className="text-vscode-text">{rfq?.rfqNo || 'View'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <FileText size={16} className="text-vscode-accent" />
                    RFQ View
                </h2>
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={() => navigate('/procurement/rfq')}>
                    <ArrowLeft size={14} />
                    <span>Back</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {rfq && (
                    <>
                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-vscode-text">{rfq.rfqNo}</h3>
                                    <div className="text-sm text-vscode-text-muted">PR: {rfq.purchaseRequisition?.prNo || rfq.prId}</div>
                                    <div className="text-sm text-vscode-text-muted">Department: {rfq.purchaseRequisition?.department || '-'}</div>
                                    <div className="text-sm text-vscode-text-muted">Due Date: {rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : '-'}</div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div><span className={`badge ${statusTone}`}>{rfq.status}</span></div>
                                    <div className="text-sm text-vscode-text-muted">Created: {rfq.createdDate ? new Date(rfq.createdDate).toLocaleDateString() : '-'}</div>
                                    <div className="font-mono text-vscode-text">Quotes: {rfq.quotations?.length || 0}</div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">RFQ Status Flow</h3>
                                <p className="text-xs text-vscode-text-muted">This shows what is completed and what is still pending for this RFQ.</p>
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

                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Users size={16} className="text-vscode-accent" />
                                    <h3 className="font-semibold text-vscode-text">Invited Vendors</h3>
                                </div>
                                <div className="space-y-3">
                                    {(rfq.rfqVendors || []).map((row, index) => (
                                        <div key={row.id || `${row.vendorId}-${index}`} className="border border-vscode-border rounded p-3 bg-vscode-bg">
                                            <div className="font-medium text-vscode-text">{row.vendor?.name || row.vendorId}</div>
                                            <div className="text-sm text-vscode-text-muted">{row.vendor?.email || '-'}</div>
                                        </div>
                                    ))}
                                    {(rfq.rfqVendors || []).length === 0 && (
                                        <div className="text-sm text-vscode-text-muted">
                                            {(rfq.vendorIds?.length || 0) > 0 ? `${rfq.vendorIds?.length || 0} vendor id(s) linked.` : 'No vendors linked yet.'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="mb-4">
                                    <h3 className="font-semibold text-vscode-text">Requested Items</h3>
                                </div>
                                <div className="overflow-auto">
                                    <table className="table-vscode">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qty</th>
                                                <th>Required Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(rfq.purchaseRequisition?.prItems || []).map((line, index) => (
                                                <tr key={line.id || `${line.itemId}-${index}`}>
                                                    <td>{line.item?.code || line.itemId} - {line.item?.name || 'Item'}</td>
                                                    <td className="font-mono">{Number(line.quantity).toFixed(2)}</td>
                                                    <td>{line.requiredDate ? new Date(line.requiredDate).toLocaleDateString() : '-'}</td>
                                                </tr>
                                            ))}
                                            {(rfq.purchaseRequisition?.prItems || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-4 text-center text-vscode-text-muted">No requested items found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Quotations</h3>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Vendor</th>
                                            <th>Status</th>
                                            <th>Total</th>
                                            <th>Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(rfq.quotations || []).map((quote) => (
                                            <tr key={quote.id}>
                                                <td>{quote.vendor?.name || quote.vendorId}</td>
                                                <td><span className="badge badge-info">{quote.status}</span></td>
                                                <td className="font-mono">${Number(quote.totalAmount).toFixed(2)}</td>
                                                <td>{quote.submittedDate ? new Date(quote.submittedDate).toLocaleDateString() : '-'}</td>
                                            </tr>
                                        ))}
                                        {(rfq.quotations || []).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-vscode-text-muted">No quotations received yet.</td>
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

export default RFQView;
