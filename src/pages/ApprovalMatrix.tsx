import React, { useState } from 'react';
import { Shield, Plus } from 'lucide-react';

const ApprovalMatrix = () => {
    // Static dummy data for approval matrix
    const [rules] = useState([
        { id: '1', role: 'Procurement Manager', document: 'Purchase Order', minAmount: 0, maxAmount: 10000, approvers: 1 },
        { id: '2', role: 'Finance Manager', document: 'Purchase Order', minAmount: 10001, maxAmount: 50000, approvers: 1 },
        { id: '3', role: 'Director', document: 'Purchase Order', minAmount: 50001, maxAmount: 1000000, approvers: 2 },
        { id: '4', role: 'Store Manager', document: 'Material Request', minAmount: 0, maxAmount: 0, approvers: 1 }, // Amount irrelevant
        { id: '5', role: 'Finance Manager', document: 'Vendor Invoice', minAmount: 0, maxAmount: 50000, approvers: 1 },
    ]);

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Master Data</span>
                <span>/</span>
                <span className="text-vscode-text">Approval Matrix</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <Shield size={16} className="text-vscode-accent" />
                    Approval Workflow Rules
                </h2>
                <div className="flex-1"></div>
                <button className="btn-primary flex items-center gap-2 ml-auto" title="Feature Simulated">
                    <Plus size={14} />
                    <span>Add Rule</span>
                </button>
            </div>

            <div className="p-4"> 
                <div className="bg-vscode-sidebar/50 border border-vscode-border rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold mb-2 text-vscode-text-muted">System Policy</h3>
                    <p className="text-sm">This module configures the approval hierarchy for transactional documents. Currently running in <span className="text-vscode-accent font-mono">SIMULATION_MODE</span>. All users with 'Admin' role can bypass approvals.</p>
                </div>

                <div className="overflow-auto border border-vscode-border rounded-lg">
                    <table className="table-vscode w-full">
                        <thead className="bg-vscode-bg">
                            <tr>
                                <th>Role</th>
                                <th>Document Type</th>
                                <th>Value Range ($)</th>
                                <th>Required Approvers</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(rule => (
                                <tr key={rule.id} className="hover:bg-vscode-list-hover">
                                    <td className="font-medium text-vscode-text">{rule.role}</td>
                                    <td>{rule.document}</td>
                                    <td className="font-mono text-xs">
                                        {rule.minAmount === 0 && rule.maxAmount === 0 
                                            ? 'Any' 
                                            : `${rule.minAmount.toLocaleString()} - ${rule.maxAmount.toLocaleString()}`}
                                    </td>
                                    <td className="text-center">{rule.approvers}</td>
                                    <td>
                                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs border border-green-500/20">Active</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ApprovalMatrix;
