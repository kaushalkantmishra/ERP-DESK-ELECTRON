import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Package } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { inventoryService } from '../services/inventoryService';
import { PurchaseOrder } from '../types/models';
import { useAppContext } from '../contexts/AppContext';

interface ReceiptLineDraft {
    poItemId: string;
    itemId: string;
    expectedQty: number;
    remainingQty: number;
    acceptedQty: number;
    rejectedQty: number;
    rejectionReason: string;
}

const GoodsReceipt: React.FC = () => {
    const { currentUser, warehouses } = useAppContext();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [selectedPOId, setSelectedPOId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [receiptLines, setReceiptLines] = useState<ReceiptLineDraft[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        void fetchPOs();
    }, []);

    useEffect(() => {
        if (!selectedWarehouseId && warehouses.length > 0) {
            setSelectedWarehouseId(warehouses[0].id);
        }
    }, [selectedWarehouseId, warehouses]);

    async function fetchPOs() {
        try {
            setIsLoading(true);
            const data = await procurementService.getPOs();
            setPurchaseOrders(data.filter((po) => ['Issued', 'Partially Received'].includes(po.status)));
        } catch (error) {
            console.error('Error fetching POs:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const selectedPO = useMemo(() => purchaseOrders.find((po) => String(po.id) === selectedPOId), [purchaseOrders, selectedPOId]);

    function selectPO(po: PurchaseOrder) {
        setSelectedPOId(String(po.id));
        setReceiptLines((po.poItems || []).map((line) => {
            const remaining = Number(line.orderedQty) - Number(line.receivedQty) - Number(line.cancelledQty);
            return {
                poItemId: line.id,
                itemId: line.itemId,
                expectedQty: Number(line.orderedQty),
                remainingQty: remaining,
                acceptedQty: remaining > 0 ? remaining : 0,
                rejectedQty: 0,
                rejectionReason: '',
            };
        }).filter((line) => line.remainingQty > 0));
    }

    function updateLine(index: number, patch: Partial<ReceiptLineDraft>) {
        setReceiptLines((current) => current.map((line, currentIndex) => currentIndex === index ? { ...line, ...patch } : line));
    }

    async function handlePostGRN() {
        if (!selectedPO || !selectedWarehouseId) {
            alert('Select PO and warehouse');
            return;
        }

        const payloadLines = receiptLines
            .filter((line) => line.acceptedQty + line.rejectedQty > 0)
            .map((line) => ({
                poItemId: line.poItemId,
                itemId: line.itemId,
                receivedQty: line.acceptedQty + line.rejectedQty,
                acceptedQty: line.acceptedQty,
                rejectedQty: line.rejectedQty,
                rejectionReason: line.rejectedQty > 0 ? line.rejectionReason : undefined,
                disposition: line.rejectedQty > 0 ? 'Rejected' : 'Accepted',
            }));

        if (payloadLines.length === 0) {
            alert('Enter at least one accepted or rejected quantity');
            return;
        }

        try {
            setIsLoading(true);
            await inventoryService.createGRN({
                poId: selectedPO.id,
                warehouseId: selectedWarehouseId,
                receivedDate: new Date().toISOString(),
                items: payloadLines,
                idempotencyKey: `ui-grn-${selectedPO.id}-${Date.now()}`,
            });
            setSelectedPOId('');
            setReceiptLines([]);
            await fetchPOs();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to post GRN');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span className="text-vscode-text">Goods Receipt</span>
            </div>

            <div className="flex-1 overflow-hidden flex">
                <div className="w-80 border-r border-vscode-border bg-vscode-sidebar flex flex-col">
                    <div className="p-3 border-b border-vscode-border font-semibold text-xs uppercase text-vscode-text-muted">Issued Purchase Orders</div>
                    <div className="flex-1 overflow-auto">
                        {purchaseOrders.map((po) => (
                            <button key={po.id} className={`w-full text-left p-3 border-b border-vscode-border hover:bg-vscode-hover ${selectedPOId === String(po.id) ? 'bg-vscode-active border-l-2 border-l-vscode-accent' : ''}`} onClick={() => selectPO(po)}>
                                <div className="font-semibold text-sm">{po.poNo}</div>
                                <div className="text-xs text-vscode-text-muted mt-1">{po.vendor?.name || po.vendorId}</div>
                                <div className="text-xs text-vscode-text-muted">Status: {po.status}</div>
                            </button>
                        ))}
                        {!isLoading && purchaseOrders.length === 0 && <div className="p-4 text-xs text-vscode-text-muted">No issued POs waiting for receipt.</div>}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 relative">
                    {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">Loading receipt workspace...</div>}
                    {selectedPO ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Post GRN for {selectedPO.poNo}</h2>
                                    <p className="text-xs text-vscode-text-muted">Only accepted quantity will increase stock. Rejected quantity remains outside inventory.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-vscode-text-muted">Storekeeper: {currentUser?.name}</span>
                                    <select className="input-vscode py-1 text-xs" value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)}>
                                        {warehouses.map((warehouse) => (
                                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Ordered</th>
                                            <th>Remaining</th>
                                            <th>Accepted</th>
                                            <th>Rejected</th>
                                            <th>Reason</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receiptLines.map((line, index) => {
                                            const item = selectedPO.poItems.find((poLine) => poLine.id === line.poItemId)?.item;
                                            const totalReceipt = line.acceptedQty + line.rejectedQty;
                                            const overRemaining = totalReceipt > line.remainingQty;
                                            return (
                                                <tr key={line.poItemId}>
                                                    <td>{item?.code || line.itemId} - {item?.name || 'Item'}</td>
                                                    <td>{line.expectedQty}</td>
                                                    <td>{line.remainingQty}</td>
                                                    <td>
                                                        <input type="number" min="0" className="input-vscode w-full" value={line.acceptedQty} onChange={(e) => updateLine(index, { acceptedQty: Number(e.target.value) || 0 })} />
                                                    </td>
                                                    <td>
                                                        <input type="number" min="0" className="input-vscode w-full" value={line.rejectedQty} onChange={(e) => updateLine(index, { rejectedQty: Number(e.target.value) || 0 })} />
                                                    </td>
                                                    <td>
                                                        <input className="input-vscode w-full" placeholder="Required if rejected" value={line.rejectionReason} onChange={(e) => updateLine(index, { rejectionReason: e.target.value })} />
                                                    </td>
                                                    <td>
                                                        {overRemaining ? (
                                                            <span className="flex items-center gap-1 text-status-error text-xs"><AlertTriangle size={12} /> Over receipt</span>
                                                        ) : line.rejectedQty > 0 ? (
                                                            <span className="flex items-center gap-1 text-status-warning text-xs"><AlertTriangle size={12} /> Partial reject</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-status-success text-xs"><Check size={12} /> Valid</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <button className="btn-primary flex items-center gap-2" onClick={() => void handlePostGRN()}>
                                    <Package size={14} />
                                    <span>Post GRN</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-vscode-text-muted">Select an issued PO to post goods receipt.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoodsReceipt;
