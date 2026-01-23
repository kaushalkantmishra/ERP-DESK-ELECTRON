import React, { useState } from 'react';
import { useMockData } from '../contexts/MockContext';
import { Package, Check, AlertTriangle } from 'lucide-react';
import { PurchaseOrder } from '../types/models';

const GoodsReceipt: React.FC = () => {
    const { pos, grns, createGRN, currentUser } = useMockData(); // consume createGRN - need to implement
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [receivedItems, setReceivedItems] = useState<{ itemId: string, qty: number, accepted: number, rejected: number }[]>([]);

    // Filter POs that are "Sent" or "Partially Received"
    const openPOs = pos.filter(po => po.status === 'Sent' || po.status === 'Partially Received');
    const selectedPO = pos.find(p => p.id === selectedPOId);

    const handleSelectPO = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        // Initialize receive buffer
        setReceivedItems(po.items.map(i => ({
            itemId: i.itemId,
            qty: i.qty, // Expected
            accepted: i.qty, // Default all accepted
            rejected: 0
        })));
    };

    const handleReceive = () => {
        if (!selectedPOId) return;
        // Logic to update MockContext would go here -> createGRN(selectedPOId, receivedItems)
        alert(`Goods Received for PO ${selectedPO?.poNo}. Inventory Updated.`);
        setSelectedPOId(null);
    };

    if (currentUser.role !== 'Store' && currentUser.role !== 'Admin') {
        return <div className="p-4 text-vscode-text-muted">Access Denied. Store/Inventory Role Required.</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span className="text-vscode-text">Goods Receipt (GRN)</span>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Pending POs */}
                <div className="w-72 border-r border-vscode-border bg-vscode-sidebar flex flex-col">
                    <div className="p-3 border-b border-vscode-border font-semibold text-xs uppercase text-vscode-text-muted">
                        Pending POs
                    </div>
                    <div className="flex-1 overflow-auto">
                        {openPOs.length === 0 ? (
                            <div className="p-4 text-xs text-vscode-text-muted">No pending Purchase Orders.</div>
                        ) : (
                            openPOs.map(po => (
                                <div
                                    key={po.id}
                                    className={`p-3 border-b border-vscode-border cursor-pointer hover:bg-vscode-hover ${selectedPOId === po.id ? 'bg-vscode-active border-l-2 border-l-vscode-accent' : ''}`}
                                    onClick={() => handleSelectPO(po)}
                                >
                                    <div className="font-semibold text-sm mb-1">{po.poNo}</div>
                                    <div className="text-xs text-vscode-text-muted">{po.vendorId}</div>
                                    <div className="text-xs text-vscode-text-muted mt-1">Due: {po.deliveryDate}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* GRN Entry */}
                <div className="flex-1 overflow-auto p-4">
                    {selectedPO ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Receive Goods - {selectedPO.poNo}</h2>
                            </div>

                            <div className="bg-vscode-sidebar border border-vscode-border p-4 mb-4">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Expected Qty</th>
                                            <th className="w-24">Accepted</th>
                                            <th className="w-24">Rejected</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receivedItems.map((item, idx) => (
                                            <tr key={item.itemId}>
                                                <td>{item.itemId}</td>
                                                <td>{item.qty}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input-vscode w-full"
                                                        value={item.accepted}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newItems = [...receivedItems];
                                                            newItems[idx].accepted = val;
                                                            setReceivedItems(newItems);
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input-vscode w-full"
                                                        value={item.rejected}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newItems = [...receivedItems];
                                                            newItems[idx].rejected = val;
                                                            setReceivedItems(newItems);
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    {item.rejected > 0 ? (
                                                        <span className="flex items-center gap-1 text-status-error text-xs"><AlertTriangle size={12} /> Issue</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-status-success text-xs"><Check size={12} /> OK</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button className="btn-secondary">Save Draft</button>
                                <button
                                    className="btn-primary flex items-center gap-2"
                                    onClick={handleReceive}
                                >
                                    <Package size={14} />
                                    <span>Complete GRN & Update Stock</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-vscode-text-muted">
                            Select a PO to receive goods
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoodsReceipt;
