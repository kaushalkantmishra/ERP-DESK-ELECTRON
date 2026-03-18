import React, { useEffect, useState } from 'react';
import { Minus, PackageMinus, Plus, Send } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { masterService } from '../services/masterService';
import { useAppContext } from '../contexts/AppContext';
import { Item, MaterialRequest } from '../types/models';

const MaterialIssue: React.FC = () => {
    const { currentUser, warehouses } = useAppContext();
    const [items, setItems] = useState<Item[]>([]);
    const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [reqItems, setReqItems] = useState<{ itemId: string; quantity: number }[]>([{ itemId: '', quantity: 1 }]);
    const [department, setDepartment] = useState(currentUser?.department || '');
    const [warehouseId, setWarehouseId] = useState('');

    useEffect(() => {
        if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id);
    }, [warehouseId, warehouses]);

    useEffect(() => { void fetchData(); }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [itemData, requestData] = await Promise.all([
                masterService.getItems(),
                inventoryService.getMaterialRequests(),
            ]);
            setItems(itemData);
            setMaterialRequests(requestData);
        } catch (error) {
            console.error('Error fetching material data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleItemChange(index: number, field: 'itemId' | 'quantity', value: string | number) {
        setReqItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!currentUser) return;
        try {
            await inventoryService.createMaterialRequest({
                requestorId: currentUser.id,
                department,
                date: new Date().toISOString(),
                items: reqItems.filter((item) => item.itemId && item.quantity > 0),
                status: 'Requested',
            });
            setIsCreating(false);
            setReqItems([{ itemId: '', quantity: 1 }]);
            await fetchData();
        } catch (error) {
            console.error('Error creating request:', error);
        }
    }

    async function handleIssue(request: MaterialRequest) {
        if (!warehouseId) {
            alert('Select a warehouse');
            return;
        }
        try {
            setIsLoading(true);
            for (const item of request.items) {
                await inventoryService.createStockTransaction({
                    itemId: item.itemId,
                    warehouseId,
                    type: 'Issue',
                    quantity: item.quantity,
                    referenceType: 'Material Request',
                    referenceId: request.requestNo,
                    notes: `Issued to ${request.department}`,
                    idempotencyKey: `issue-${request.id}-${item.itemId}-${Date.now()}`,
                });
            }
            await fetchData();
            alert('Stock issue posted. Material request status endpoint is still pending in backend.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to issue stock');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="text-vscode-text-muted">Processing requests...</div></div>}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><span>Inventory</span><span>/</span><span className="text-vscode-text">Material Issue</span></div>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2"><PackageMinus size={16} className="text-vscode-accent" />Material Requests</h2>
                <select className="input-vscode text-xs ml-auto" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                    {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
                <button onClick={() => setIsCreating((current) => !current)} className="btn-primary flex items-center gap-2">
                    <Plus size={14} />
                    <span>{isCreating ? 'Cancel' : 'New Request'}</span>
                </button>
            </div>

            {isCreating && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="form-label">Department</label>
                            <input type="text" className="input-vscode w-full max-w-sm" value={department} onChange={(e) => setDepartment(e.target.value)} />
                        </div>
                        <div className="mb-4">
                            <label className="form-label mb-2">Items</label>
                            {reqItems.map((item, index) => (
                                <div key={index} className="flex gap-2 mb-2 items-center">
                                    <select className="input-vscode flex-1" value={item.itemId} onChange={(e) => handleItemChange(index, 'itemId', e.target.value)} required>
                                        <option value="">Select Item</option>
                                        {items.map((entry) => <option key={entry.id} value={entry.id}>{entry.code} - {entry.name}</option>)}
                                    </select>
                                    <input type="number" min="1" className="input-vscode w-24 text-right" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} />
                                    <button type="button" onClick={() => setReqItems((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="p-1 hover:bg-vscode-hover rounded text-vscode-text-muted hover:text-red-400"><Minus size={14} /></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setReqItems((current) => [...current, { itemId: '', quantity: 1 }])} className="text-vscode-accent text-xs hover:underline flex items-center gap-1 mt-2"><Plus size={12} />Add Item</button>
                        </div>
                        <button type="submit" className="btn-primary flex items-center gap-2"><Send size={14} />Submit Request</button>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Request No</th>
                            <th>Department</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materialRequests.map((request) => (
                            <tr key={request.id}>
                                <td className="font-mono text-xs font-semibold">{request.requestNo}</td>
                                <td>{request.department}</td>
                                <td>{new Date(request.date).toLocaleDateString()}</td>
                                <td>{request.items.map((item) => `${items.find((entry) => entry.id === item.itemId)?.code || item.itemId}: ${item.quantity}`).join(', ')}</td>
                                <td><span className="badge badge-info">{request.status}</span></td>
                                <td>{request.status === 'Requested' && <button className="btn-secondary py-1 px-2 text-xs" onClick={() => void handleIssue(request)}>Issue from Stock</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MaterialIssue;
