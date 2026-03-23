import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Edit, Send, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { procurementService } from '../services/procurementService';
import { PurchaseRequisition, PRStatus } from '../types/models';
import { useAppContext } from '../contexts/AppContext';

type StepState = 'complete' | 'current' | 'pending';

interface WorkflowStep {
    key: string;
    title: string;
    detail: string;
    state: StepState;
}

function getRequestedByLabel(pr: PurchaseRequisition, currentUserName?: string) {
    if (pr.requestor?.name) return pr.requestor.name;
    if (pr.requestorId) return String(pr.requestorId);
    return currentUserName || 'Not assigned';
}

const PurchaseRequisitionView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { currentUser, items: masterItems } = useAppContext();
    const [pr, setPr] = useState<PurchaseRequisition | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        void loadPR(id);
    }, [id]);

    async function loadPR(prId: string) {
        try {
            setIsLoading(true);
            const data = await procurementService.getPR(prId);
            setPr(data);
        } catch (error) {
            console.error('Error fetching purchase requisition:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function updateStatus(status: PRStatus) {
        if (!pr) return;

        try {
            setIsSubmitting(true);
            let rejectionReason: string | undefined;

            if (status === 'Rejected') {
                rejectionReason = window.prompt('Enter rejection reason') || undefined;
                if (!rejectionReason) {
                    setIsSubmitting(false);
                    return;
                }
            }

            await procurementService.updatePRStatus(pr.id, status, rejectionReason);
            await loadPR(pr.id);
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || `Unable to update PR to ${status}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const workflowSteps = useMemo<WorkflowStep[]>(() => {
        if (!pr) return [];

        const submitted = ['Submitted', 'Approved', 'Closed'].includes(pr.status);
        const approved = ['Approved', 'Closed'].includes(pr.status);
        const closed = pr.status === 'Closed';
        const cancelled = pr.status === 'Cancelled';
        const rejected = pr.status === 'Rejected';

        return [
            {
                key: 'draft',
                title: 'Draft',
                detail: `Requisition created by ${getRequestedByLabel(pr, currentUser?.name)}`,
                state: 'complete',
            },
            {
                key: 'submitted',
                title: 'Submitted',
                detail: submitted ? 'Sent for approval' : rejected ? 'Submission was rejected' : cancelled ? 'PR cancelled before approval' : 'Waiting for submission',
                state: submitted ? 'complete' : pr.status === 'Draft' ? 'current' : 'pending',
            },
            {
                key: 'approval',
                title: 'Approval',
                detail: approved ? 'Approved for downstream processing' : rejected ? 'Rejected and sent back' : submitted ? 'Waiting for approval decision' : 'Approval not started',
                state: approved || rejected ? 'complete' : submitted ? 'current' : 'pending',
            },
            {
                key: 'closure',
                title: 'Closure',
                detail: closed ? 'PR is closed' : cancelled ? 'PR was cancelled' : 'PR is still open',
                state: closed || cancelled ? 'complete' : approved ? 'current' : 'pending',
            },
        ];
    }, [pr]);

    const statusTone = pr?.status === 'Rejected' || pr?.status === 'Cancelled'
        ? 'badge-error'
        : pr?.status === 'Approved' || pr?.status === 'Closed'
            ? 'badge-success'
            : pr?.status === 'Submitted'
                ? 'badge-warning'
                : 'badge-info';

    const canEdit = pr?.status === 'Draft' || pr?.status === 'Rejected';
    const isApprover = currentUser?.role === 'Admin' || currentUser?.role === 'Procurement';
    const isOwner = !!currentUser && String(currentUser.id) === String(pr?.requestorId);
    const canSubmit = (pr?.status === 'Draft' || pr?.status === 'Rejected') && (isOwner || isApprover);
    const canApprove = pr?.status === 'Submitted' && isApprover;
    const canCancel = !!pr && (isApprover || (isOwner && ['Draft', 'Submitted', 'Rejected'].includes(pr.status)));

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading requisition...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span>Purchase Requisition</span>
                <span>/</span>
                <span className="text-vscode-text">{pr?.prNo || 'View'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text">PR View</h2>
                <div className="ml-auto flex items-center gap-2">
                    {canEdit && (
                        <button
                            className="btn-secondary flex items-center gap-2"
                            onClick={() => navigate(`/procurement/purchase-requisition/${pr?.id}`)}
                        >
                            <Edit size={14} />
                            <span>Edit</span>
                        </button>
                    )}
                    {canSubmit && (
                        <button
                            className="btn-primary flex items-center gap-2"
                            disabled={isSubmitting}
                            onClick={() => void updateStatus('Submitted')}
                        >
                            <Send size={14} />
                            <span>{pr?.status === 'Rejected' ? 'Resubmit' : 'Submit'}</span>
                        </button>
                    )}
                    {canApprove && (
                        <>
                            <button
                                className="btn-primary flex items-center gap-2"
                                disabled={isSubmitting}
                                onClick={() => void updateStatus('Approved')}
                            >
                                <CheckCircle2 size={14} />
                                <span>Approve</span>
                            </button>
                            <button
                                className="btn-secondary flex items-center gap-2"
                                disabled={isSubmitting}
                                onClick={() => void updateStatus('Rejected')}
                            >
                                <XCircle size={14} />
                                <span>Reject</span>
                            </button>
                        </>
                    )}
                    {canCancel && (
                        <button
                            className="btn-secondary flex items-center gap-2"
                            disabled={isSubmitting}
                            onClick={() => void updateStatus('Cancelled')}
                        >
                            <XCircle size={14} />
                            <span>Cancel</span>
                        </button>
                    )}
                    <button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/procurement/purchase-requisition')}>
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {pr && (
                    <>
                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-vscode-text">{pr.prNo}</h3>
                                    <div className="text-sm text-vscode-text-muted">Department: {pr.department}</div>
                                    <div className="text-sm text-vscode-text-muted">Requested By: {getRequestedByLabel(pr, currentUser?.name)}</div>
                                    <div className="text-sm text-vscode-text-muted">Priority: {pr.priority}</div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div><span className={`badge ${statusTone}`}>{pr.status}</span></div>
                                    <div className="text-sm text-vscode-text-muted">Date: {new Date(pr.date).toLocaleDateString()}</div>
                                    <div className="font-mono text-vscode-text">Lines: {pr.prItems?.length || 0}</div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Approval Status</h3>
                                <p className="text-xs text-vscode-text-muted">This shows what is completed and what is still pending for this requisition.</p>
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

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Business Justification</h3>
                            </div>
                            <div className="text-sm text-vscode-text-muted whitespace-pre-wrap">
                                {pr.justification || 'No justification provided.'}
                            </div>
                            {pr.rejectionReason && (
                                <div className="mt-4 border border-red-500/40 rounded p-3 bg-red-950/20 text-sm text-red-300">
                                    Rejection reason: {pr.rejectionReason}
                                </div>
                            )}
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Requested Items</h3>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>UOM</th>
                                            <th>Quantity</th>
                                            <th>Required Date</th>
                                            <th>Open Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(pr.prItems || []).map((line, index) => {
                                            const masterItem = masterItems.find((entry) => String(entry.id) === String(line.itemId));
                                            return (
                                                <tr key={line.id || `${line.itemId}-${index}`}>
                                                    <td>{line.item?.code || masterItem?.code || line.itemId} - {line.item?.name || masterItem?.name || 'Item'}</td>
                                                    <td>{line.item?.uom || masterItem?.uom || '-'}</td>
                                                    <td className="font-mono">{Number(line.quantity).toFixed(2)}</td>
                                                    <td>{line.requiredDate ? new Date(line.requiredDate).toLocaleDateString() : '-'}</td>
                                                    <td className="font-mono">{Number((line as any).openQty ?? line.quantity).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                        {(pr.prItems || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-vscode-text-muted">No requisition lines found.</td>
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

export default PurchaseRequisitionView;
