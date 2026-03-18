import { useEffect, useState } from 'react';
import { CheckCircle, FileText, Send } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { PurchaseRequisition, Vendor } from '../types/models';
import { useAppContext } from '../contexts/AppContext';

const RFQManager: React.FC = () => {
    const { vendors } = useAppContext();
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [selectedPRs, setSelectedPRs] = useState<string[]>([]);
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { void fetchData(); }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const fetchedPRs = await procurementService.getPRs();
            setPrs(fetchedPRs.filter((pr) => pr.status === 'Submitted' || pr.status === 'Approved'));
        } catch (error) {
            console.error('Error fetching PRs:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const pendingPRs = prs.filter((pr) => pr.status === 'Submitted' || pr.status === 'Approved');

    async function handleCreateRFQ() {
        if (selectedVendorIds.length === 0) {
            alert('Please select at least one vendor');
            return;
        }
        try {
            setIsLoading(true);
            for (const prId of selectedPRs) {
                await procurementService.createRFQ({ prId, dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), vendorIds: selectedVendorIds });
            }
            setSelectedPRs([]);
            setSelectedVendorIds([]);
            setIsVendorModalOpen(false);
            await fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to create RFQ');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleApprovePR(prId: string) {
        try {
            await procurementService.updatePRStatus(prId, 'Approved');
            await fetchData();
        } catch (error) {
            console.error('Error approving PR:', error);
        }
    }

    return (
        <div className="flex flex-col h-full relative">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2"><span>Procurement</span><span>/</span><span className="text-vscode-text">RFQ Management</span></div>
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <button className={`btn-primary flex items-center gap-2 ${selectedPRs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => setIsVendorModalOpen(true)} disabled={selectedPRs.length === 0}><Send size={14} /><span>Create RFQ ({selectedPRs.length})</span></button>
            </div>
            <div className="flex-1 overflow-auto p-4 relative">
                {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="text-vscode-text-muted">Loading...</div></div>}
                <h3 className="text-sm font-semibold mb-3">Pending Requisitions for RFQ</h3>
                <div className="grid gap-3">
                    {pendingPRs.map((pr) => (
                        <div key={pr.id} className="bg-vscode-sidebar border border-vscode-border p-3 flex items-start gap-4 hover:border-vscode-accent transition-colors">
                            <div className="pt-1">
                                <input type="checkbox" checked={selectedPRs.includes(pr.id)} onChange={(e) => setSelectedPRs((current) => e.target.checked ? [...current, pr.id] : current.filter((id) => id !== pr.id))} disabled={pr.status !== 'Approved'} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="font-semibold text-sm flex items-center gap-2"><FileText size={14} className="text-vscode-accent" />{pr.prNo}</div>
                                    <div className={`badge ${pr.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>{pr.status}</div>
                                </div>
                                <div className="text-xs text-vscode-text-muted grid grid-cols-2 gap-2 mb-2">
                                    <div>Department: {pr.department}</div>
                                    <div>Date: {new Date(pr.date).toLocaleDateString()}</div>
                                    <div className="col-span-2">Justification: {pr.justification}</div>
                                </div>
                                <div className="bg-vscode-bg p-2 text-xs">
                                    <table className="w-full text-left">
                                        <thead><tr className="text-vscode-text-muted"><th>Item</th><th className="text-right">Qty</th></tr></thead>
                                        <tbody>
                                            {(pr.prItems || []).map((item, index) => (
                                                <tr key={index}><td>{item.item?.name || item.itemId}</td><td className="text-right">{item.quantity}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>{pr.status === 'Submitted' && <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => void handleApprovePR(pr.id)}><CheckCircle size={12} className="text-status-success" />Approve</button>}</div>
                        </div>
                    ))}
                </div>
            </div>

            {isVendorModalOpen && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-vscode-bg border border-vscode-border shadow-xl rounded-lg w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-vscode-border flex items-center justify-between">
                            <h3 className="font-semibold text-vscode-text">Select Vendors for RFQ</h3>
                            <button onClick={() => setIsVendorModalOpen(false)} className="text-vscode-text-muted hover:text-vscode-text">Close</button>
                        </div>
                        <div className="p-4 flex-1 overflow-auto space-y-2">
                            {vendors.map((vendor: Vendor) => (
                                <label key={vendor.id} className="flex items-center gap-3 p-3 border border-vscode-border rounded hover:bg-vscode-list-hover cursor-pointer">
                                    <input type="checkbox" checked={selectedVendorIds.includes(vendor.id)} onChange={(e) => setSelectedVendorIds((current) => e.target.checked ? [...current, vendor.id] : current.filter((id) => id !== vendor.id))} />
                                    <div>
                                        <div className="font-medium text-sm">{vendor.name}</div>
                                        <div className="text-xs text-vscode-text-muted">{vendor.email} - Rating {vendor.rating}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div className="p-4 border-t border-vscode-border bg-vscode-sidebar flex justify-end gap-2 rounded-b-lg">
                            <button className="btn-secondary" onClick={() => setIsVendorModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" onClick={() => void handleCreateRFQ()} disabled={selectedVendorIds.length === 0}>Send RFQs ({selectedVendorIds.length})</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQManager;
