import React, { useState } from 'react';
import { Plus, Minus, Send, PackageMinus } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { MaterialRequest } from '../types/models';

const MaterialIssue = () => {
    const { currentUser, items, materialRequests, createMaterialRequest, createStockTransaction } = useMockData();
    const [isCreating, setIsCreating] = useState(false);
    
    // New Request State
    const [reqItems, setReqItems] = useState<{ itemId: string; quantity: number }[]>([{ itemId: '', quantity: 1 }]);
    const [department, setDepartment] = useState(currentUser.department || '');

    const handleAddItem = () => {
        setReqItems([...reqItems, { itemId: '', quantity: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = reqItems.filter((_, i) => i !== index);
        setReqItems(newItems.length ? newItems : [{ itemId: '', quantity: 1 }]);
    };

    const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string | number) => {
        const newItems = [...reqItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setReqItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMaterialRequest({
            requestorId: currentUser.id,
            department,
            date: new Date().toISOString().split('T')[0],
            items: reqItems,
            status: 'Requested'
        });
        setIsCreating(false);
        setReqItems([{ itemId: '', quantity: 1 }]);
    };

    const handleIssue = (request: MaterialRequest) => {
       alert("Stock Issued. (Status update in UI pending backend wiring)");
       
       request.items.forEach(item => {
           createStockTransaction({
               itemId: item.itemId,
               type: 'Issue',
               quantity: item.quantity,
               sourceWarehouseId: 'w1', // Defaulting for simple mock
               referenceId: request.requestNo,
               notes: 'Material Issue for ' + request.department
           });
       });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>Inventory</span>
                    <span>/</span>
                    <span className="text-vscode-text">Material Issue</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
               <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <PackageMinus size={16} className="text-vscode-accent" />
                    Material Requests
               </h2>
               <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="btn-primary flex items-center gap-2 ml-auto"
                >
                    <Plus size={14} />
                    <span>{isCreating ? 'Cancel' : 'New Request'}</span>
                </button>
            </div>

            {isCreating && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">Create Material Request</h2>
                    <form onSubmit={handleSubmit}>
                         <div className="mb-4 form-group">
                            <label className="form-label">Department</label>
                            <input
                                type="text"
                                className="input-vscode w-full max-w-sm"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="form-label mb-2">Items</label>
                            {reqItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                    <select
                                        required
                                        className="input-vscode flex-1"
                                        value={item.itemId}
                                        onChange={e => handleItemChange(idx, 'itemId', e.target.value)}
                                    >
                                        <option value="">Select Item</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        className="input-vscode w-24 text-right"
                                        value={item.quantity}
                                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveItem(idx)}
                                        className="p-1 hover:bg-vscode-hover rounded text-vscode-text-muted hover:text-red-400"
                                    >
                                        <Minus size={14} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddItem} className="text-vscode-accent text-xs hover:underline flex items-center gap-1 mt-2">
                                <Plus size={12} /> Add Item
                            </button>
                        </div>

                         <button
                            type="submit"
                            className="btn-primary flex items-center gap-2"
                        >
                            <Send size={14} />
                            Submit Request
                        </button>
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
                        {materialRequests.map(req => (
                            <tr key={req.id} className="hover:bg-vscode-list-hover">
                                <td className="font-mono text-xs font-semibold">{req.requestNo}</td>
                                <td>{req.department}</td>
                                <td className="text-vscode-text-muted text-xs">{req.date}</td>
                                <td>
                                    {req.items.map(i => {
                                        const item = items.find(it => it.id === i.itemId);
                                        return <div key={i.itemId} className="text-xs">{item?.code}: {i.quantity}</div>
                                    })}
                                </td>
                                <td>
                                    <span className={`badge ${req.status === 'Requested' ? 'badge-warning' : 'badge-success'}`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td>
                                    {req.status === 'Requested' && (
                                        <button
                                            onClick={() => handleIssue(req)}
                                            className="btn-secondary py-1 px-2 text-xs"
                                        >
                                            Issue
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{materialRequests.length} requests</span>
            </div>
        </div>
    );
};

export default MaterialIssue;
