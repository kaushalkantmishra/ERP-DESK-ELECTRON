import React, { useState } from 'react';
import { useMockData } from '../contexts/MockContext';
import { Send, CheckCircle, FileText } from 'lucide-react';

const RFQManager: React.FC = () => {
    const { prs, createRFQ, currentUser, updatePRStatus, vendors } = useMockData();
    const [selectedPRs, setSelectedPRs] = useState<string[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

    // Filter for PRs that are "Submitted" or "Approved" but haven't been turned into RFQs
    const pendingPRs = prs.filter(pr => pr.status === 'Submitted' || pr.status === 'Approved');

    const handleOpenVendorModal = () => {
        if (selectedPRs.length === 0) return;
        setIsVendorModalOpen(true);
    };

    const handleCreateRFQ = () => {
        if (selectedVendorIds.length === 0) {
            alert('Please select at least one vendor');
            return;
        }

        selectedPRs.forEach(prId => {
            // Assign selected vendors and set due date +7 days
            createRFQ(prId, new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], selectedVendorIds);
        });

        setSelectedPRs([]);
        setSelectedVendorIds([]);
        setIsVendorModalOpen(false);
        // alert('RFQs Created Successfully!'); // Optional, maybe snackbar later
        console.log('RFQs Created');
    };

    const handleApprovePR = (prId: string) => {
        updatePRStatus(prId, 'Approved');
    };

    if (!currentUser || (currentUser.role !== 'Procurement' && currentUser.role !== 'Admin')) {
        return <div className="p-4 text-vscode-text-muted">Access Denied. Procurement Role Required.</div>;
    }

    return (
        <div className="flex flex-col h-full relative">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">RFQ Management</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <button
                    className={`btn-primary flex items-center gap-2 ${selectedPRs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleOpenVendorModal}
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

            {/* Vendor Selection Modal */}
            {isVendorModalOpen && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-vscode-bg border border-vscode-border shadow-xl rounded-lg w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-vscode-border flex items-center justify-between">
                            <h3 className="font-semibold text-vscode-text">Select Vendors for RFQ</h3>
                            <button onClick={() => setIsVendorModalOpen(false)} className="text-vscode-text-muted hover:text-vscode-text">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-auto">
                            <p className="text-sm text-vscode-text-muted mb-3">Select eligible vendors to receive this request for quotation.</p>
                            <div className="space-y-2">
                                {vendors.map(vendor => (
                                    <label key={vendor.id} className="flex items-center gap-3 p-3 border border-vscode-border rounded hover:bg-vscode-list-hover cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedVendorIds.includes(vendor.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedVendorIds([...selectedVendorIds, vendor.id]);
                                                else setSelectedVendorIds(selectedVendorIds.filter(id => id !== vendor.id));
                                            }}
                                        />
                                        <div>
                                            <div className="font-medium text-sm">{vendor.name}</div>
                                            <div className="text-xs text-vscode-text-muted">{vendor.email} • Rating: {vendor.rating}★</div>
                                        </div>
                                    </label>
                                ))}
                                {vendors.length === 0 && <div className="text-sm text-vscode-text-muted">No vendors found.</div>}
                            </div>
                        </div>
                        <div className="p-4 border-t border-vscode-border bg-vscode-sidebar flex justify-end gap-2 rounded-b-lg">
                            <button className="btn-secondary" onClick={() => setIsVendorModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreateRFQ} disabled={selectedVendorIds.length === 0}>
                                Send RFQs ({selectedVendorIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQManager;
