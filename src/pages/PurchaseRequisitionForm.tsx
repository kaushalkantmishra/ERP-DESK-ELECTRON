import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Plus, Save, Send, Trash2, X, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Priority, PRItem, PRStatus, PurchaseRequisition } from '../types/models';
import { procurementService } from '../services/procurementService';

interface DraftLine {
    id: number;
    itemId: string;
    quantity: number;
    requiredDate: string;
}

const emptyLine = (id: number): DraftLine => ({ id, itemId: '', quantity: 1, requiredDate: '' });

const PurchaseRequisitionForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, items: masterItems } = useAppContext();
    const [record, setRecord] = useState<PurchaseRequisition | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [department, setDepartment] = useState(currentUser?.department || '');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [justification, setJustification] = useState('');
    const [lines, setLines] = useState<DraftLine[]>([emptyLine(1)]);
    const [requiredDate, setRequiredDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!id) return;
        void loadPR(id);
    }, [id]);

    const isReadOnly = !!record && !['Draft', 'Rejected'].includes(record.status);
    const canApprove = record?.status === 'Submitted';
    const canResubmit = record?.status === 'Rejected';

    const lineCount = useMemo(() => lines.filter((line) => line.itemId).length, [lines]);

    async function loadPR(prId: string) {
        try {
            setIsLoading(true);
            const pr = await procurementService.getPR(prId);
            setRecord(pr);
            setDepartment(pr.department);
            setPriority(pr.priority);
            setJustification(pr.justification || '');
            const incoming = (pr.prItems || []).map((line, index) => ({
                id: index + 1,
                itemId: line.itemId,
                quantity: Number(line.quantity),
                requiredDate: line.requiredDate ? line.requiredDate.split('T')[0] : '',
            }));
            setLines(incoming.length > 0 ? incoming : [emptyLine(1)]);
            setRequiredDate(incoming[0]?.requiredDate || new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('Error fetching PR:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function updateLine(lineId: number, patch: Partial<DraftLine>) {
        setLines((current) => current.map((line) => line.id === lineId ? { ...line, ...patch } : line));
    }

    function addLine() {
        setLines((current) => [...current, emptyLine(Date.now())]);
    }

    function removeLine(lineId: number) {
        setLines((current) => current.length === 1 ? current : current.filter((line) => line.id !== lineId));
    }

    function buildPayload(status: PRStatus) {
        const preparedLines: PRItem[] = lines
            .filter((line) => line.itemId && line.quantity > 0)
            .map((line) => ({
                itemId: line.itemId,
                quantity: Number(line.quantity),
                requiredDate: line.requiredDate || requiredDate,
            }));

        if (preparedLines.length === 0) {
            throw new Error('Add at least one valid item line');
        }
        if (!department.trim()) {
            throw new Error('Department is required');
        }
        if (!justification.trim()) {
            throw new Error('Justification is required');
        }

        return {
            requestorId: currentUser?.id,
            department,
            date: new Date().toISOString(),
            priority,
            status,
            justification,
            items: preparedLines,
        };
    }

    async function save(status: PRStatus) {
        try {
            setIsSubmitting(true);
            if (!currentUser) return;
            await procurementService.createPR(buildPayload(status));
            navigate('/procurement/purchase-requisition');
        } catch (error: any) {
            console.error(error);
            alert(error?.message || 'Unable to save purchase request');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleStatusChange(nextStatus: PRStatus) {
        if (!record) return;
        try {
            setIsSubmitting(true);
            let rejectionReason: string | undefined;
            if (nextStatus === 'Rejected') {
                rejectionReason = window.prompt('Enter rejection reason') || undefined;
                if (!rejectionReason) {
                    setIsSubmitting(false);
                    return;
                }
            }
            await procurementService.updatePRStatus(record.id, nextStatus, rejectionReason);
            navigate('/procurement/purchase-requisition');
        } catch (error: any) {
            console.error(error);
            alert(error?.message || 'Unable to update requisition');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span>Purchase Requisition</span>
                <span>/</span>
                <span className="text-vscode-text">{record?.prNo || 'New'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                {!id && (
                    <>
                        <button className="btn-secondary flex items-center gap-2" disabled={isSubmitting} onClick={() => void save('Draft')}>
                            <Save size={14} />
                            <span>{isSubmitting ? 'Saving...' : 'Save Draft'}</span>
                        </button>
                        <button className="btn-primary flex items-center gap-2" disabled={isSubmitting} onClick={() => void save('Submitted')}>
                            <Send size={14} />
                            <span>{isSubmitting ? 'Submitting...' : 'Submit For Approval'}</span>
                        </button>
                    </>
                )}
                {canResubmit && (
                    <button className="btn-primary flex items-center gap-2" disabled={isSubmitting} onClick={() => void handleStatusChange('Submitted')}>
                        <Send size={14} />
                        <span>Resubmit</span>
                    </button>
                )}
                {canApprove && (
                    <>
                        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm" disabled={isSubmitting} onClick={() => void handleStatusChange('Approved')}>
                            <CheckCircle size={14} />
                            <span>Approve</span>
                        </button>
                        <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm" disabled={isSubmitting} onClick={() => void handleStatusChange('Rejected')}>
                            <XCircle size={14} />
                            <span>Reject</span>
                        </button>
                    </>
                )}
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={() => navigate('/procurement/purchase-requisition')}>
                    <X size={14} />
                    <span>Close</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4 relative">
                {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">Loading requisition...</div>}

                <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div>
                            <label className="form-label">Department</label>
                            <input className="input-vscode w-full" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div>
                            <label className="form-label">Requested By</label>
                            <input className="input-vscode w-full" value={record?.requestor?.name || currentUser?.name || ''} disabled />
                        </div>
                        <div>
                            <label className="form-label">Priority</label>
                            <select className="input-vscode w-full" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} disabled={isReadOnly}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Overall Required Date</label>
                            <input type="date" className="input-vscode w-full" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} disabled={isReadOnly} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="form-label">Business Justification</label>
                        <textarea className="form-textarea w-full" rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} disabled={isReadOnly} />
                    </div>
                    {record?.rejectionReason && (
                        <div className="mt-4 p-3 rounded border border-red-500/40 bg-red-950/20 text-sm text-red-300">
                            Rejection reason: {record.rejectionReason}
                        </div>
                    )}
                </section>

                <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold">Requested Items</h2>
                            <p className="text-xs text-vscode-text-muted">Add only items that are truly needed. Duplicate and empty lines are ignored.</p>
                        </div>
                        {!isReadOnly && (
                            <button className="btn-primary flex items-center gap-2" onClick={addLine}>
                                <Plus size={14} />
                                <span>Add Line</span>
                            </button>
                        )}
                    </div>
                    <div className="overflow-auto">
                        <table className="table-vscode">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>UOM</th>
                                    <th>Quantity</th>
                                    <th>Required Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line) => {
                                    const item = masterItems.find((entry) => entry.id === line.itemId);
                                    return (
                                        <tr key={line.id}>
                                            <td>
                                                <select className="input-vscode w-full" value={line.itemId} disabled={isReadOnly} onChange={(e) => updateLine(line.id, { itemId: e.target.value })}>
                                                    <option value="">Select item</option>
                                                    {masterItems.map((entry) => (
                                                        <option key={entry.id} value={entry.id}>{entry.code} - {entry.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>{item?.uom || '-'}</td>
                                            <td>
                                                <input type="number" min="1" className="input-vscode w-full" value={line.quantity} disabled={isReadOnly} onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 0 })} />
                                            </td>
                                            <td>
                                                <input type="date" className="input-vscode w-full" value={line.requiredDate || requiredDate} disabled={isReadOnly} onChange={(e) => updateLine(line.id, { requiredDate: e.target.value })} />
                                            </td>
                                            <td>
                                                {!isReadOnly && (
                                                    <button className="text-status-error hover:bg-vscode-hover p-1 rounded" onClick={() => removeLine(line.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 text-xs text-vscode-text-muted">{lineCount} valid line(s)</div>
                </section>
            </div>
        </div>
    );
};

export default PurchaseRequisitionForm;
