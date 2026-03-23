import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, Filter, Plus } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { PurchaseRequisition, PRStatus } from '../types/models';

interface PurchaseRequisitionListProps {
    onNewPR: () => void;
}

function getRequestedByLabel(pr: PurchaseRequisition) {
    if (pr.requestor?.name) return pr.requestor.name;
    if (pr.requestorId) return String(pr.requestorId);
    return 'Not assigned';
}

function downloadFile(filename: string, content: BlobPart, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

    function exportExcel() {
        const rows = filteredPRs.map((pr) => ({
            prNo: pr.prNo,
            date: new Date(pr.date).toLocaleDateString(),
            department: pr.department,
            requestedBy: getRequestedByLabel(pr),
            priority: pr.priority,
            status: pr.status,
            lines: pr.prItems?.length || 0,
        }));

        const headers = ['PR No', 'Date', 'Department', 'Requested By', 'Priority', 'Status', 'Lines'];
        const csv = [
            headers.join(','),
            ...rows.map((row) => [
                row.prNo,
                row.date,
                row.department,
                row.requestedBy,
                row.priority,
                row.status,
                row.lines,
            ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        downloadFile(`purchase-requisitions-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
    }

    function exportPdf() {
        const popup = window.open('', '_blank', 'width=1200,height=800');
        if (!popup) {
            alert('Popup blocked. Please allow popups to export PDF.');
            return;
        }

        const rows = filteredPRs.map((pr) => `
            <tr>
                <td>${pr.prNo}</td>
                <td>${new Date(pr.date).toLocaleDateString()}</td>
                <td>${pr.department}</td>
                <td>${getRequestedByLabel(pr)}</td>
                <td>${pr.priority}</td>
                <td>${pr.status}</td>
                <td style="text-align:right;">${pr.prItems?.length || 0}</td>
            </tr>
        `).join('');

        popup.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>Purchase Requisition Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
                    h1 { margin-bottom: 4px; }
                    p { color: #555; margin-top: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12px; text-align: left; }
                    th { background: #f3f4f6; }
                </style>
            </head>
            <body>
                <h1>Purchase Requisitions</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
                <table>
                    <thead>
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
                    <tbody>${rows || '<tr><td colspan="7">No requisitions found.</td></tr>'}</tbody>
                </table>
            </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        popup.print();
    }

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
                    <button className="btn-secondary flex items-center gap-2" onClick={exportExcel}>
                        <Download size={14} />
                        <span>Excel</span>
                    </button>
                    <button className="btn-secondary flex items-center gap-2" onClick={exportPdf}>
                        <Download size={14} />
                        <span>PDF</span>
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
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={8} className="p-4 text-center text-vscode-text-muted">Loading requisitions...</td></tr>
                        ) : filteredPRs.map((pr, index) => (
                            <tr key={pr.id} className={selectedRow === index ? 'active' : ''} onClick={() => setSelectedRow(index)}>
                                <td className="font-mono text-xs font-semibold">{pr.prNo}</td>
                                <td className="font-mono text-xs">{new Date(pr.date).toLocaleDateString()}</td>
                                <td>{pr.department}</td>
                                <td>{getRequestedByLabel(pr)}</td>
                                <td>{pr.priority}</td>
                                <td><span className="badge badge-info">{pr.status}</span></td>
                                <td>{pr.prItems?.length || 0}</td>
                                <td>
                                    <button
                                        className="text-vscode-accent hover:text-vscode-accent-hover p-1"
                                        title="View requisition"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/procurement/purchase-requisition/${pr.id}/view`);
                                        }}
                                    >
                                        <Eye size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && filteredPRs.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-vscode-text-muted">No requisitions found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseRequisitionList;
