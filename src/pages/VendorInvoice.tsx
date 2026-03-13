import React, { useState, useEffect } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { financeService } from '../services/financeService';
import { masterService } from '../services/masterService';
import { Invoice, Vendor, PurchaseOrder } from '../types/models';

const VendorInvoice = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Create Form State
    const [vendorId, setVendorId] = useState('');
    const [poId, setPoId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [amount, setAmount] = useState(0);
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [vendorData, poData, invData] = await Promise.all([
                masterService.getVendors(),
                procurementService.getPOs(),
                financeService.getInvoices()
            ]);
            setVendors(vendorData);
            setPos(poData);
            setInvoices(invData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openPOs = pos.filter(p => !['Closed', 'Completed'].includes(p.status as string));

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await financeService.createInvoice({
                poId,
                vendorId,
                invoiceNo,
                amount,
                dueDate: new Date(dueDate).toISOString(),
                date: new Date().toISOString(),
                status: 'Received'
            });
            await fetchData();
            setIsCreating(false);
            setVendorId(''); setPoId(''); setInvoiceNo(''); setAmount(0); setDueDate('');
        } catch (error) {
            console.error('Error saving invoice:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: Invoice['status']) => {
        try {
            setIsLoading(true);
            await financeService.updateInvoiceStatus(id, status);
            await fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsLoading(false);
        }
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

            <div className="flex-1 overflow-auto relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="text-vscode-text-muted">Loading...</div>
                    </div>
                )}
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
                        {invoices.map((inv: any) => {
                            const vendor = vendors.find((v: Vendor) => v.id === inv.vendorId);
                            const po = pos.find((p: PurchaseOrder) => p.id === inv.poId);
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
                                                onClick={() => handleUpdateStatus(inv.id, 'Verified')}
                                                className="text-vscode-accent hover:underline text-xs mr-2"
                                            >
                                                Verify
                                            </button>
                                        )}
                                        {inv.status === 'Verified' && (
                                            <button
                                                onClick={() => handleUpdateStatus(inv.id, 'Paid')}
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
