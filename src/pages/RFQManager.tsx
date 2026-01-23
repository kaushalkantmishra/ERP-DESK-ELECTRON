import React, { useState } from 'react';
import { useMockData } from '../contexts/MockContext';
import { Send, CheckCircle, FileText } from 'lucide-react';

const RFQManager: React.FC = () => {
    const { prs, createRFQ, currentUser, updatePRStatus } = useMockData();
    const [selectedPRs, setSelectedPRs] = useState<string[]>([]);

    // Filter for PRs that are "Submitted" or "Approved" but haven't been turned into RFQs
    const pendingPRs = prs.filter(pr => pr.status === 'Submitted' || pr.status === 'Approved');

    const handleCreateRFQ = () => {
        if (selectedPRs.length === 0) return;

        selectedPRs.forEach(prId => {
            // For now, auto-assign 2 vendors and set due date +7 days
            createRFQ(prId, new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], ['v1', 'v2']);
        });

        setSelectedPRs([]);
        alert('RFQs Created Successfully!');
    };

    const handleApprovePR = (prId: string) => {
        updatePRStatus(prId, 'Approved');
    };

    if (currentUser.role !== 'Procurement' && currentUser.role !== 'Admin') {
        return <div className="p-4 text-vscode-text-muted">Access Denied. Procurement Role Required.</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">RFQ Management</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <button
                    className={`btn-primary flex items-center gap-2 ${selectedPRs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleCreateRFQ}
                    disabled={selectedPRs.length === 0}
                >
                    <Send size={14} />
                    <span>Create RFQ ({selectedPRs.length})</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <h3 className="text-sm font-semibold mb-3">Pending Requisitions for RFQ</h3>

                {pendingPRs.length === 0 ? (
                    <div className="text-center text-vscode-text-muted mt-10">No pending PRs found.</div>
                ) : (
                    <div className="grid gap-3">
                        {pendingPRs.map(pr => (
                            <div key={pr.id} className="bg-vscode-sidebar border border-vscode-border p-3 flex items-start gap-4 hover:border-vscode-accent transition-colors">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={selectedPRs.includes(pr.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedPRs([...selectedPRs, pr.id]);
                                            else setSelectedPRs(selectedPRs.filter(id => id !== pr.id));
                                        }}
                                        disabled={pr.status !== 'Approved'} // Only Approved PRs can be converted
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            <FileText size={14} className="text-vscode-accent" />
                                            {pr.prNo}
                                        </div>
                                        <div className={`badge ${pr.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                                            {pr.status}
                                        </div>
                                    </div>
                                    <div className="text-xs text-vscode-text-muted grid grid-cols-2 gap-2 mb-2">
                                        <div>Department: {pr.department}</div>
                                        <div>Date: {pr.date}</div>
                                        <div className="col-span-2">Justification: {pr.justification}</div>
                                    </div>

                                    {/* Items Preview */}
                                    <div className="bg-vscode-bg p-2 text-xs">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-vscode-text-muted">
                                                    <th>Item</th>
                                                    <th className="text-right">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pr.items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td>{item.itemId}</td>
                                                        <td className="text-right">{item.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {pr.status === 'Submitted' && (
                                        <button
                                            className="btn-secondary text-xs flex items-center gap-1"
                                            onClick={() => handleApprovePR(pr.id)}
                                        >
                                            <CheckCircle size={12} className="text-status-success" />
                                            Approve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RFQManager;
