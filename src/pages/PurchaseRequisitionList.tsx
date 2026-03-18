import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Plus } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { PurchaseRequisition, PRStatus } from '../types/models';

interface PurchaseRequisitionListProps {
    onNewPR: () => void;
}

const PurchaseRequisitionList: React.FC<PurchaseRequisitionListProps> = ({ onNewPR }) => {
    const navigate = useNavigate();
    const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { void fetchPRs(); }, []);

    async function fetchPRs() {
        try {
            setIsLoading(true);
            const data = await procurementService.getPRs();
            setPurchaseRequisitions(data);
        } catch (error) {
            console.error('Error fetching PRs:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredPRs = purchaseRequisitions.filter((pr) => {
        const deptMatch = filterDepartment ? pr.department === filterDepartment : true;
        const statusMatch = filterStatus ? pr.status === filterStatus : true;
        return deptMatch && statusMatch;
    });

    const statuses: PRStatus[] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'PO Created', 'Closed', 'Cancelled'];

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">Purchase Requisition</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <button className="btn-primary flex items-center gap-2" onClick={() => { onNewPR(); navigate('/procurement/purchase-requisition/new'); }}>
                    <Plus size={14} />
                    <span>New PR</span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                    <Filter size={14} className="text-vscode-text-muted" />
                    <input className="input-vscode text-xs" placeholder="Department" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} />
                    <select className="input-vscode text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <button className="btn-secondary flex items-center gap-2">
                        <Download size={14} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0">
                        <tr>
                            <th>PR No</th>
                            <th>Date</th>
                            <th>Department</th>
                            <th>Requested By</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Lines</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={7} className="p-4 text-center text-vscode-text-muted">Loading requisitions...</td></tr>
                        ) : filteredPRs.map((pr, index) => (
                            <tr key={pr.id} className={selectedRow === index ? 'active' : ''} onClick={() => { setSelectedRow(index); navigate(`/procurement/purchase-requisition/${pr.id}`); }}>
                                <td className="font-mono text-xs font-semibold">{pr.prNo}</td>
                                <td className="font-mono text-xs">{new Date(pr.date).toLocaleDateString()}</td>
                                <td>{pr.department}</td>
                                <td>{pr.requestor?.name || pr.requestorId}</td>
                                <td>{pr.priority}</td>
                                <td><span className="badge badge-info">{pr.status}</span></td>
                                <td>{pr.prItems?.length || 0}</td>
                            </tr>
                        ))}
                        {!isLoading && filteredPRs.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-vscode-text-muted">No requisitions found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseRequisitionList;
