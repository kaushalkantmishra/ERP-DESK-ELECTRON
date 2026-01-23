import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download } from 'lucide-react';

import { useMockData } from '../contexts/MockContext';

interface PurchaseRequisitionListProps {
    onNewPR: () => void;
}

const PurchaseRequisitionList: React.FC<PurchaseRequisitionListProps> = ({ onNewPR }) => {
    const { prs } = useMockData();
    const purchaseRequisitions = prs; // Use data from context

    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                onNewPR();
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedRow(prev =>
                    prev === null ? 0 : Math.min(prev + 1, purchaseRequisitions.length - 1)
                );
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedRow(prev =>
                    prev === null ? 0 : Math.max(prev - 1, 0)
                );
            }

            if (e.key === 'Enter' && selectedRow !== null) {
                // Navigate to PR detail
                console.log('Open PR:', purchaseRequisitions[selectedRow].prNo);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRow, onNewPR]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'text-priority-urgent';
            case 'High': return 'text-priority-high';
            case 'Medium': return 'text-priority-medium';
            case 'Low': return 'text-priority-low';
            default: return 'text-vscode-text';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved': return 'badge-success';
            case 'Rejected': return 'badge-error';
            case 'Pending': return 'badge-warning';
            case 'Draft': return 'badge-info';
            default: return 'badge-info';
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">Purchase Requisition</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <button className="btn-primary flex items-center gap-2" onClick={onNewPR}>
                    <Plus size={14} />
                    <span>New PR (Ctrl+N)</span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-vscode-text-muted" />
                        <select
                            className="input-vscode text-xs"
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            <option value="IT">IT</option>
                            <option value="HR">HR</option>
                            <option value="Finance">Finance</option>
                            <option value="Operations">Operations</option>
                            <option value="Marketing">Marketing</option>
                        </select>

                        <select
                            className="input-vscode text-xs"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    <button className="btn-secondary flex items-center gap-2">
                        <Download size={14} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Table */}
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
                        </tr>
                    </thead>
                    <tbody>
                        {purchaseRequisitions.map((pr, index) => (
                            <tr
                                key={pr.prNo}
                                className={selectedRow === index ? 'active' : ''}
                                onClick={() => setSelectedRow(index)}
                            >
                                <td className="font-mono text-xs font-semibold">{pr.prNo}</td>
                                <td className="font-mono text-xs">{pr.date}</td>
                                <td>{pr.department}</td>
                                <td>{pr.requestorId}</td> {/** Ideally map ID to Name */}
                                <td>
                                    <span className={`font-semibold ${getPriorityColor(pr.priority)}`}>
                                        {pr.priority}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge ${getStatusBadge(pr.status)}`}>
                                        {pr.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted flex items-center gap-4">
                <span>{purchaseRequisitions.length} items</span>
                {selectedRow !== null && (
                    <span>Row {selectedRow + 1} selected</span>
                )}
                <span className="ml-auto">Use ↑↓ to navigate, Enter to open</span>
            </div>
        </div>
    );
};

export default PurchaseRequisitionList;
