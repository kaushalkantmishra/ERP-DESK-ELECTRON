import React, { useState } from 'react';
import { Save, Send, X, Plus, Trash2, Upload, File } from 'lucide-react';

import { useMockData } from '../contexts/MockContext';
import { Priority } from '../types/models';

const PurchaseRequisitionForm: React.FC = () => {
    const { currentUser, addPR } = useMockData();
    const [activeTab, setActiveTab] = useState<'details' | 'items' | 'attachments'>('details');

    // Form State
    const [department, setDepartment] = useState(currentUser.department || '');
    const [reqDate, setReqDate] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [justification, setJustification] = useState('');

    const [items, setItems] = useState([
        { id: 1, itemId: '', uom: '', qty: 1, estimatedPrice: 0, remarks: '' }
    ]);
    const [attachments, setAttachments] = useState<{ id: number; name: string; size: string }[]>([]);

    const handleSubmit = () => {
        addPR({
            requestorId: currentUser.id,
            department,
            date: new Date().toISOString().split('T')[0],
            priority,
            status: 'Submitted', // Auto submit for now
            justification,
            items: items.filter(i => i.itemId).map(i => ({
                itemId: i.itemId,
                quantity: i.qty,
                requiredDate: reqDate
            }))
        });
        alert('PR Submitted successfully!');
        // close form or navigate back
    };

    const addItem = () => {
        setItems([...items, { id: items.length + 1, itemId: '', uom: '', qty: 1, estimatedPrice: 0, remarks: '' }]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map((file, index) => ({
                id: attachments.length + index + 1,
                name: file.name,
                size: `${(file.size / 1024).toFixed(2)} KB`
            }));
            setAttachments([...attachments, ...newFiles]);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span>Purchase Requisition</span>
                <span>/</span>
                <span className="text-vscode-text">New</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <button className="btn-primary flex items-center gap-2">
                    <Save size={14} />
                    <span>Save Draft</span>
                </button>
                <button className="btn-primary flex items-center gap-2" onClick={handleSubmit}>
                    <Send size={14} />
                    <span>Submit</span>
                </button>
                <button className="btn-secondary flex items-center gap-2 ml-auto">
                    <X size={14} />
                    <span>Cancel</span>
                </button>
            </div>

            <div className="flex border-b border-vscode-border bg-vscode-sidebar">
                <button
                    className={`px-4 py-2 text-sm border-r border-vscode-border ${activeTab === 'details' ? 'bg-vscode-bg text-vscode-text' : 'text-vscode-text-muted hover:bg-vscode-hover'
                        }`}
                    onClick={() => setActiveTab('details')}
                >
                    Details
                </button>
                <button
                    className={`px-4 py-2 text-sm border-r border-vscode-border ${activeTab === 'items' ? 'bg-vscode-bg text-vscode-text' : 'text-vscode-text-muted hover:bg-vscode-hover'
                        }`}
                    onClick={() => setActiveTab('items')}
                >
                    Items
                </button>
                <button
                    className={`px-4 py-2 text-sm ${activeTab === 'attachments' ? 'bg-vscode-bg text-vscode-text' : 'text-vscode-text-muted hover:bg-vscode-hover'
                        }`}
                    onClick={() => setActiveTab('attachments')}
                >
                    Attachments
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {activeTab === 'details' && (
                    <div className="max-w-3xl">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Department *</label>
                                <select
                                    className="form-select"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    <option value="IT">IT</option>
                                    <option value="HR">HR</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Warehouse">Warehouse</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Requested By</label>
                                <input type="text" className="input-vscode w-full" value={currentUser.name} disabled />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Required Date *</label>
                                <input
                                    type="date"
                                    className="input-vscode w-full"
                                    value={reqDate}
                                    onChange={(e) => setReqDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Priority *</label>
                                <select
                                    className="form-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>

                            <div className="form-group col-span-2">
                                <label className="form-label">Justification *</label>
                                <textarea
                                    className="form-textarea"
                                    rows={4}
                                    placeholder="Provide justification..."
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Requisition Items</h3>
                            <button className="btn-primary flex items-center gap-2" onClick={addItem}>
                                <Plus size={14} />
                                <span>Add Item</span>
                            </button>
                        </div>

                        <div className="overflow-auto">
                            <table className="table-vscode">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30%' }}>Item *</th>
                                        <th style={{ width: '15%' }}>UOM</th>
                                        <th style={{ width: '10%' }}>Qty *</th>
                                        <th style={{ width: '15%' }}>Est. Price</th>
                                        <th style={{ width: '25%' }}>Remarks</th>
                                        <th style={{ width: '5%' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input-vscode w-full"
                                                    placeholder="Search item..."
                                                    value={item.itemId}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(item)].itemId = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input-vscode w-full"
                                                    placeholder="UOM"
                                                    value={item.uom}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(item)].uom = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input-vscode w-full"
                                                    placeholder="0"
                                                    value={item.qty}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(item)].qty = parseInt(e.target.value) || 0;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input-vscode w-full"
                                                    placeholder="0.00"
                                                    value={item.estimatedPrice}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(item)].estimatedPrice = parseFloat(e.target.value) || 0;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input-vscode w-full"
                                                    placeholder="Remarks"
                                                    value={item.remarks}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(item)].remarks = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <button className="text-status-error hover:bg-vscode-hover p-1" onClick={() => removeItem(item.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attachments' && (
                    <div>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm">Upload Files</label>
                            <div className="border-2 border-dashed border-vscode-border bg-vscode-sidebar p-8 text-center hover:border-vscode-accent transition-colors cursor-pointer">
                                <input type="file" multiple className="hidden" id="file-upload" onChange={handleFileUpload} />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <Upload size={32} className="mx-auto mb-2 text-vscode-text-muted" />
                                    <p className="text-sm text-vscode-text-muted">Drag & drop files here or click to browse</p>
                                </label>
                            </div>
                        </div>

                        {attachments.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Attached Files</h3>
                                <div className="space-y-2">
                                    {attachments.map((file) => (
                                        <div key={file.id} className="flex items-center gap-3 p-2 bg-vscode-sidebar border border-vscode-border hover:bg-vscode-hover">
                                            <File size={16} className="text-vscode-accent" />
                                            <div className="flex-1">
                                                <div className="text-sm">{file.name}</div>
                                                <div className="text-xs text-vscode-text-muted">{file.size}</div>
                                            </div>
                                            <button className="text-status-error hover:bg-vscode-active p-1" onClick={() => setAttachments(attachments.filter(f => f.id !== file.id))}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseRequisitionForm;
