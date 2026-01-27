import React, { useState, useEffect } from 'react';
import { Save, Send, X, Plus, Trash2, Upload, File, CheckCircle, XCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import { useMockData } from '../contexts/MockContext';
import { Priority, PRStatus } from '../types/models';

const PurchaseRequisitionForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, addPR, updatePRStatus, prs, items: masterItems, uoms } = useMockData();
    const [activeTab, setActiveTab] = useState<'details' | 'items' | 'attachments'>('details');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [prNo, setPrNo] = useState('');
    const [status, setStatus] = useState<PRStatus>('Draft');
    const [department, setDepartment] = useState(currentUser?.department || '');
    const [reqDate, setReqDate] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [justification, setJustification] = useState('');

    const [items, setItems] = useState([
        { id: 1, itemId: '', uom: '', qty: 1, estimatedPrice: 0, remarks: '' }
    ]);
    const [attachments, setAttachments] = useState<{ id: number; name: string; size: string }[]>([]);

    useEffect(() => {
        if (id && prs.length > 0) {
            const pr = prs.find(p => p.id === id || p.prNo === id);
            if (pr) {
                setPrNo(pr.prNo);
                setStatus(pr.status);
                setDepartment(pr.department);
                setReqDate(pr.items[0]?.requiredDate || ''); // Simplification
                setPriority(pr.priority);
                setJustification(pr.justification);
                setItems(pr.items.map((i, index) => ({
                    id: index + 1,
                    itemId: i.itemId,
                    uom: masterItems.find(m => m.id === i.itemId)?.uom || '',
                    qty: i.quantity,
                    estimatedPrice: 0, // Not in PR model, would come from item master or user input?
                    remarks: ''
                })));
            }
        }
    }, [id, prs, masterItems]);

    const handleSubmit = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);
        // If ID exists, we should probably update, but for now we only have addPR. 
        // Assuming this form is CREATE only for now unless we add updatePR.
        // If viewing existing, maybe just "Save" updates if Draft?
        
        if (!id) {
            await addPR({
                requestorId: currentUser.id,
                department,
                date: new Date().toISOString().split('T')[0],
                priority,
                status: 'Submitted',
                justification,
                items: items.filter(i => i.itemId).map(i => ({
                    itemId: i.itemId,
                    quantity: i.qty,
                    requiredDate: reqDate
                }))
            });
            console.log('PR Created');
            navigate('/procurement/purchase-requisition');
        }
        setIsSubmitting(false);
    };

    const handleStatusChange = async (newStatus: PRStatus) => {
        if (!id) return;
        setIsSubmitting(true);
        // finding the PR object first to get the internal ID if 'id' param is prNo
        const pr = prs.find(p => p.id === id || p.prNo === id);
        if (pr) {
             await updatePRStatus(pr.id, newStatus);
             setStatus(newStatus);
        }
        setIsSubmitting(false);
        navigate('/procurement/purchase-requisition');
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

    const isReadOnly = !!id && status !== 'Draft';

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span>Purchase Requisition</span>
                <span>/</span>
                <span className="text-vscode-text">{id ? prNo : 'New'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                {id && status === 'Submitted' && (
                    <>
                        <button 
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm"
                            onClick={() => handleStatusChange('Approved')}
                            disabled={isSubmitting}
                        >
                            <CheckCircle size={14} />
                            <span>Approve</span>
                        </button>
                        <button 
                             className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm"
                             onClick={() => handleStatusChange('Rejected')}
                             disabled={isSubmitting}
                        >
                            <XCircle size={14} />
                            <span>Reject</span>
                        </button>
                        <div className="w-px h-6 bg-vscode-border mx-2"></div>
                    </>
                )}

                {!isReadOnly && (
                    <>
                         <button className="btn-primary flex items-center gap-2">
                            <Save size={14} />
                            <span>Save Draft</span>
                        </button>
                        <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={isSubmitting}>
                            <Send size={14} />
                            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                        </button>
                    </>
                )}
               
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={() => navigate('/procurement/purchase-requisition')}>
                    <X size={14} />
                    <span>Close</span>
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
                    <div className="w-full p-6 bg-vscode-sidebar rounded-xl border border-vscode-border shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <div className="form-group">
                                <label className="form-label">Department *</label>
                                <select
                                    className="form-select"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    disabled={isReadOnly}
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
                                <input type="text" className="input-vscode w-full" value={currentUser?.name || ''} disabled />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Required Date *</label>
                                <input
                                    type="date"
                                    className="input-vscode w-full"
                                    value={reqDate}
                                    onChange={(e) => setReqDate(e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Priority *</label>
                                <select
                                    className="form-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                    disabled={isReadOnly}
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
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div>
                        {!isReadOnly && (
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Requisition Items</h3>
                                <button className="btn-primary flex items-center gap-2" onClick={addItem}>
                                    <Plus size={14} />
                                    <span>Add Item</span>
                                </button>
                            </div>
                        )}

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
                                    {items.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <select
                                                    className="input-vscode w-full"
                                                    value={row.itemId}
                                                    disabled={isReadOnly}
                                                    onChange={(e) => {
                                                        const selectedItem = masterItems.find(i => i.id === e.target.value);
                                                        const newItems = [...items];
                                                        const index = items.indexOf(row);
                                                        newItems[index].itemId = e.target.value;
                                                        if (selectedItem) {
                                                            newItems[index].uom = selectedItem.uom;
                                                            newItems[index].estimatedPrice = selectedItem.price;
                                                        }
                                                        setItems(newItems);
                                                    }}
                                                >
                                                    <option value="">Select Item</option>
                                                    {masterItems.map(item => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.name} ({item.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <select
                                                    className="input-vscode w-full"
                                                    value={row.uom}
                                                    disabled={isReadOnly}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(row)].uom = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                >
                                                    <option value="">Select UOM</option>
                                                    {uoms.map(u => (
                                                        <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input-vscode w-full"
                                                    placeholder="0"
                                                    min="1"
                                                    value={row.qty}
                                                    disabled={isReadOnly}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(row)].qty = parseInt(e.target.value) || 0;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input-vscode w-full"
                                                    placeholder="0.00"
                                                    value={row.estimatedPrice}
                                                    disabled={isReadOnly}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(row)].estimatedPrice = parseFloat(e.target.value) || 0;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input-vscode w-full"
                                                    placeholder="Remarks"
                                                    value={row.remarks}
                                                    disabled={isReadOnly}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[items.indexOf(row)].remarks = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                {!isReadOnly && (
                                                    <button className="text-status-error hover:bg-vscode-hover p-1" onClick={() => removeItem(row.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
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
