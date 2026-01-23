import React, { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';

const VendorInvoice = () => {
    const { vendors, pos, invoices, createInvoice, updateInvoiceStatus } = useMockData();
    const [isCreating, setIsCreating] = useState(false);
    
    // Create Form State
    const [vendorId, setVendorId] = useState('');
    const [poId, setPoId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [amount, setAmount] = useState(0);
    const [dueDate, setDueDate] = useState('');

    const openPOs = pos.filter(p => !['Closed'].includes(p.status)); // Simplified logic

    const handleVendorChange = (id: string) => {
        setVendorId(id);
        const firstPO = openPOs.find(p => p.vendorId === id);
        if (firstPO) {
             setPoId(firstPO.id);
             setAmount(firstPO.totalAmount);
        } else {
             setPoId('');
             setAmount(0);
        }
    };

    const handlePOChange = (id: string) => {
        setPoId(id);
        const po = pos.find(p => p.id === id);
        if (po) setAmount(po.totalAmount);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createInvoice(poId, vendorId, amount, dueDate, invoiceNo);
        setIsCreating(false);
        setVendorId(''); setPoId(''); setInvoiceNo(''); setAmount(0); setDueDate('');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Finance</span>
                <span>/</span>
                <span className="text-vscode-text">Vendor Invoices</span>
            </div>

            {/* Toolbar */}
             <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <Receipt size={16} className="text-vscode-accent" />
                    Invoices
                </h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="btn-primary flex items-center gap-2 ml-auto"
                >
                    <Plus size={14} />
                    <span>{isCreating ? 'Cancel' : 'Register Invoice'}</span>
                </button>
            </div>

            {isCreating && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">Register New Invoice</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Vendor</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={vendorId}
                                onChange={e => handleVendorChange(e.target.value)}
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Purchase Order</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={poId}
                                onChange={e => handlePOChange(e.target.value)}
                                disabled={!vendorId}
                            >
                                <option value="">Select PO</option>
                                {openPOs.filter(p => p.vendorId === vendorId).map(p => (
                                    <option key={p.id} value={p.id}>{p.poNo} (Total: ${p.totalAmount})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Invoice No</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={invoiceNo}
                                onChange={e => setInvoiceNo(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input
                                required
                                type="date"
                                className="input-vscode w-full"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Amount</label>
                            <input
                                required
                                type="number"
                                className="input-vscode w-full"
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                            />
                        </div>

                        <div className="col-span-2 pt-2">
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                Save Invoice
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Invoice No</th>
                            <th>Vendor</th>
                            <th>PO No</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(inv => {
                            const vendor = vendors.find(v => v.id === inv.vendorId);
                            const po = pos.find(p => p.id === inv.poId);
                            return (
                                <tr key={inv.id} className="hover:bg-vscode-list-hover">
                                    <td className="font-mono text-xs font-semibold">{inv.invoiceNo}</td>
                                    <td>{vendor?.name}</td>
                                    <td className="text-vscode-text-muted">{po?.poNo}</td>
                                    <td className="text-vscode-text-muted text-xs">{inv.date}</td>
                                    <td className="font-mono font-bold">${inv.amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`badge 
                                            ${inv.status === 'Paid' ? 'badge-success' : 
                                              inv.status === 'Verified' ? 'badge-info' :
                                              inv.status === 'Received' ? 'badge-warning' : 'badge-error'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td>
                                        {inv.status === 'Received' && (
                                            <button 
                                                onClick={() => updateInvoiceStatus(inv.id, 'Verified')}
                                                className="text-vscode-accent hover:underline text-xs mr-2"
                                            >
                                                Verify
                                            </button>
                                        )}
                                        {inv.status === 'Verified' && (
                                            <button 
                                                onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                                                className="text-status-success hover:underline text-xs"
                                            >
                                                Pay
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {invoices.length === 0 && (
                             <tr><td colSpan={7} className="p-4 text-center text-vscode-text-muted">No Invoices found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{invoices.length} invoices</span>
            </div>
        </div>
    );
};

export default VendorInvoice;
