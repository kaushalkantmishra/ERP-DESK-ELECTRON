import React, { useState, useEffect } from 'react';
import { Package, Check, AlertTriangle } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { inventoryService } from '../services/inventoryService';
import { PurchaseOrder } from '../types/models';
import { useAppContext } from '../contexts/AppContext';

const GoodsReceipt: React.FC = () => {
    const { currentUser, warehouses, items: masterItems } = useAppContext() as any;
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [receivedItems, setReceivedItems] = useState<{ itemId: string, quantity: number, accepted: number, rejected: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPOs();
        if (warehouses.length > 0) {
            setSelectedWarehouseId(warehouses[0].id);
        }
    }, [warehouses]);

    const fetchPOs = async () => {
        try {
            setIsLoading(true);
            const fetchedPOs = await procurementService.getPOs();
            // Filter POs that are "Sent" or "Partially Received" or "Open"
            setPos(fetchedPOs.filter(po => (po.status as any) === 'Sent' || (po.status as any) === 'Partially Received' || (po.status as any) === 'Open'));
        } catch (error) {
            console.error('Error fetching POs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter POs that are "Sent" or "Partially Received" or "Open"
    const openPOs = pos.filter(po => (po.status as any) === 'Sent' || (po.status as any) === 'Partially Received' || (po.status as any) === 'Open');
    const selectedPO = pos.find(p => p.id === selectedPOId);

    const handleSelectPO = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        // Initialize receive buffer
        setReceivedItems(po.items.map((i: any) => ({
            itemId: i.itemId,
            quantity: i.quantity || i.qty, // Expected
            accepted: i.quantity || i.qty, // Default all accepted
            rejected: 0
        })));
    };

    const handleReceive = async () => {
        if (!selectedPOId || !selectedWarehouseId) return;
        try {
            setIsLoading(true);
            await inventoryService.createGRN({
                poId: selectedPOId,
                warehouseId: selectedWarehouseId,
                receivedDate: new Date().toISOString(),
                receivedBy: currentUser?.id || 'admin',
                items: receivedItems.map(ri => ({
                    itemId: ri.itemId,
                    receivedQty: ri.accepted + ri.rejected,
                    acceptedQty: ri.accepted,
                    rejectedQty: ri.rejected
                }))
            });
            await fetchPOs();
            alert(`Goods Received for PO ${selectedPO?.poNo}. Inventory Updated.`);
            setSelectedPOId(null);
        } catch (error) {
            console.error('Error creating GRN:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
                <div className="flex-1 overflow-auto p-4 relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="text-vscode-text-muted">Loading...</div>
                        </div>
                    )}
                    {selectedPO ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Receive Goods - {selectedPO.poNo}</h2>
                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-vscode-text-muted">Warehouse:</label>
                                    <select
                                        className="input-vscode py-1 text-xs"
                                        value={selectedWarehouseId}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    >
                                        {warehouses.map((wh: any) => (
                                            <option key={wh.id} value={wh.id}>{wh.name}</option>
                                        ))}
                                    </select>
                                </div>
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
                                        {receivedItems.map((item: any, idx) => (
                                            <tr key={item.itemId}>
                                                <td>{masterItems.find((m: any) => m.id === item.itemId)?.name || item.itemId}</td>
                                                <td>{item.quantity}</td>
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
