import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, PlusCircle, Send } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { masterService } from '../services/masterService';
import { PurchaseOrder, PurchaseRequisition, Vendor } from '../types/models';

const PurchaseOrderList: React.FC = () => {
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPrId, setSelectedPrId] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});

    useEffect(() => {
        void fetchData();
    }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [poData, prData, vendorData] = await Promise.all([
                procurementService.getPOs(),
                procurementService.getPRs(),
                masterService.getVendors(),
            ]);
            setPos(poData);
            setPrs(prData);
            setVendors(vendorData);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const approvedPRs = useMemo(() => prs.filter((pr) => pr.status === 'Approved'), [prs]);
    const selectedPR = approvedPRs.find((pr) => pr.id === selectedPrId);

    useEffect(() => {
        if (!selectedPR) return;
        const nextPrices: Record<string, number> = {};
        (selectedPR.prItems || []).forEach((line) => {
            nextPrices[line.itemId] = line.item?.price || 0;
        });
        setPriceMap(nextPrices);
    }, [selectedPR]);

    async function handleCreatePO() {
        if (!selectedPR || !vendorId) {
            alert('Select an approved PR and vendor');
            return;
        }

        try {
            setIsLoading(true);
            await procurementService.createPO({
                prId: selectedPR.id,
                vendorId,
                deliveryDate: new Date(deliveryDate).toISOString(),
                items: (selectedPR.prItems || []).map((line) => ({
                    itemId: line.itemId,
                    orderedQty: Number(line.quantity),
                    unitPrice: Number(priceMap[line.itemId] || 0),
                })),
            });
            setIsCreating(false);
            setSelectedPrId('');
            setVendorId('');
            await fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to create PO');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleIssuePO(po: PurchaseOrder) {
        try {
            setIsLoading(true);
            await procurementService.updatePOStatus(po.id, 'Issued');
            await fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to issue PO');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">Purchase Order Workbench</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div>
                    <div className="text-sm font-semibold">Purchase Orders</div>
                    <div className="text-xs text-vscode-text-muted">Create draft POs from approved PRs, review price variance, then issue them for receipt.</div>
                </div>
                <button className="btn-primary flex items-center gap-2 ml-auto" onClick={() => setIsCreating((current) => !current)}>
                    <PlusCircle size={14} />
                    <span>{isCreating ? 'Close Builder' : 'Create PO'}</span>
                </button>
                <button className="btn-secondary flex items-center gap-2">
                    <Download size={14} />
                    <span>Export</span>
                </button>
            </div>

            {isCreating && (
                <div className="m-4 p-4 bg-vscode-sidebar border border-vscode-border rounded-lg space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">Approved PR</label>
                            <select className="input-vscode w-full" value={selectedPrId} onChange={(e) => setSelectedPrId(e.target.value)}>
                                <option value="">Select approved PR</option>
                                {approvedPRs.map((pr) => (
                                    <option key={pr.id} value={pr.id}>{pr.prNo} - {pr.department}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Vendor</label>
                            <select className="input-vscode w-full" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                                <option value="">Select vendor</option>
                                {vendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Expected Delivery Date</label>
                            <input type="date" className="input-vscode w-full" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                        </div>
                    </div>

                    {selectedPR && (
                        <div className="overflow-auto">
                            <table className="table-vscode">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Suggested Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedPR.prItems || []).map((line) => (
                                        <tr key={line.id || line.itemId}>
                                            <td>{line.item?.code || line.itemId} - {line.item?.name || 'Item'}</td>
                                            <td>{Number(line.quantity)}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="input-vscode w-full"
                                                    value={priceMap[line.itemId] ?? 0}
                                                    onChange={(e) => setPriceMap((current) => ({ ...current, [line.itemId]: Number(e.target.value) || 0 }))}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button className="btn-primary" onClick={() => void handleCreatePO()}>Create Draft PO</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto relative">
                {isLoading && <div className="absolute inset-0 bg-vscode-bg/40 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">Loading purchase orders...</div>}
                <table className="table-vscode">
                    <thead className="sticky top-0">
                        <tr>
                            <th>PO No</th>
                            <th>PR</th>
                            <th>Vendor</th>
                            <th>Delivery</th>
                            <th>Total</th>
                            <th>Open Qty</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pos.map((po) => (
                            <tr key={po.id}>
                                <td className="font-mono text-xs font-semibold">{po.poNo}</td>
                                <td>{po.pr?.prNo || '-'}</td>
                                <td>{po.vendor?.name || vendors.find((vendor) => vendor.id === po.vendorId)?.name || po.vendorId}</td>
                                <td>{po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '-'}</td>
                                <td className="font-mono">${Number(po.totalAmount).toFixed(2)}</td>
                                <td className="font-mono text-xs">
                                    {(po.poItems || []).reduce((sum, line) => sum + Number(line.openReceiptQty ?? (Number(line.orderedQty) - Number(line.receivedQty) - Number(line.cancelledQty))), 0).toFixed(2)}
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <span className="badge badge-info">{po.status}</span>
                                        {po.varianceAlert && <span className="badge badge-warning">Variance</span>}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        {po.status === 'Draft' && (
                                            <button
                                                className={`btn-secondary py-1 px-2 text-xs flex items-center gap-1 ${po.varianceAlert ? 'opacity-70' : ''}`}
                                                onClick={() => {
                                                    if (po.varianceAlert && !window.confirm('This PO has a price variance above threshold. Do you still want to issue it?')) return;
                                                    void handleIssuePO(po);
                                                }}
                                            >
                                                <Send size={12} />
                                                Issue
                                            </button>
                                        )}
                                        <button
                                            className="text-vscode-accent hover:text-vscode-accent-hover p-1"
                                            title="View lines"
                                            onClick={() => alert((po.poItems || []).map((line) => `${line.item?.name || line.itemId}: ordered ${line.orderedQty}, received ${line.receivedQty}, open receipt ${Number(line.openReceiptQty ?? (Number(line.orderedQty) - Number(line.receivedQty) - Number(line.cancelledQty))).toFixed(2)}, variance ${Number(line.priceVariancePct || 0).toFixed(2)}%`).join('\n'))}
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && pos.length === 0 && (
                            <tr><td colSpan={8} className="p-4 text-center text-vscode-text-muted">No purchase orders yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseOrderList;
