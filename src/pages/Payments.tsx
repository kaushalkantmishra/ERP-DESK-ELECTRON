import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { financeService } from '../services/financeService';
import { Invoice, Payment } from '../types/models';

interface AllocationDraft {
    invoiceId: string;
    allocatedAmount: number;
}

const Payments: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('Bank Transfer');
    const [referenceNo, setReferenceNo] = useState('');
    const [remarks, setRemarks] = useState('');
    const [allocations, setAllocations] = useState<AllocationDraft[]>([]);

    useEffect(() => {
        void fetchData();
    }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [invoiceData, paymentData] = await Promise.all([
                financeService.getInvoices(),
                financeService.getPayments(),
            ]);
            setInvoices(invoiceData);
            setPayments(paymentData);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const payableInvoices = useMemo(() => invoices.filter((invoice) => ['Approved', 'Partially Paid'].includes(invoice.status)), [invoices]);
    const vendorOptions = useMemo(() => {
        const unique = new Map<string, string>();
        payableInvoices.forEach((invoice) => unique.set(invoice.vendorId, invoice.vendor?.name || invoice.vendorId));
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }, [payableInvoices]);
    const vendorInvoices = payableInvoices.filter((invoice) => invoice.vendorId === selectedVendorId);

    useEffect(() => {
        setAllocations(vendorInvoices.map((invoice) => ({
            invoiceId: invoice.id,
            allocatedAmount: Number(invoice.balanceAmount),
        })));
    }, [selectedVendorId]);

    const totalAmount = allocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);

    function updateAllocation(invoiceId: string, allocatedAmount: number) {
        setAllocations((current) => current.map((allocation) => allocation.invoiceId === invoiceId ? { ...allocation, allocatedAmount } : allocation));
    }

    async function createPayment(e: React.FormEvent) {
        e.preventDefault();
        const payloadAllocations = allocations.filter((allocation) => allocation.allocatedAmount > 0);
        if (!selectedVendorId || payloadAllocations.length === 0) {
            alert('Select vendor and allocate at least one invoice');
            return;
        }

        try {
            setIsLoading(true);
            await financeService.createPayment({
                vendorId: selectedVendorId,
                paymentDate: new Date(paymentDate).toISOString(),
                amount: totalAmount,
                method,
                referenceNo,
                remarks,
                allocations: payloadAllocations,
            });
            setIsCreating(false);
            setSelectedVendorId('');
            setReferenceNo('');
            setRemarks('');
            await fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to post payment');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Finance</span>
                <span>/</span>
                <span className="text-vscode-text">Payments</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <CreditCard size={16} className="text-vscode-accent" />
                    Vendor Payments
                </h2>
                <button className="btn-primary flex items-center gap-2 ml-auto" onClick={() => setIsCreating((current) => !current)}>
                    <Plus size={14} />
                    <span>{isCreating ? 'Close Form' : 'Post Payment'}</span>
                </button>
            </div>

            {isCreating && (
                <form onSubmit={createPayment} className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="form-label">Vendor</label>
                            <select className="input-vscode w-full" value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} required>
                                <option value="">Select vendor</option>
                                {vendorOptions.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Payment Date</label>
                            <input type="date" className="input-vscode w-full" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Method</label>
                            <select className="input-vscode w-full" value={method} onChange={(e) => setMethod(e.target.value)}>
                                <option>Bank Transfer</option>
                                <option>Cash</option>
                                <option>Cheque</option>
                                <option>UPI</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Reference No</label>
                            <input className="input-vscode w-full" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                        </div>
                    </div>

                    <div className="overflow-auto">
                        <table className="table-vscode">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>PO</th>
                                    <th>Balance</th>
                                    <th>Allocate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendorInvoices.map((invoice) => {
                                    const allocation = allocations.find((entry) => entry.invoiceId === invoice.id);
                                    return (
                                        <tr key={invoice.id}>
                                            <td>{invoice.vendorInvoiceNo} / {invoice.invoiceNo}</td>
                                            <td>{invoice.po?.poNo || invoice.poId}</td>
                                            <td className="font-mono">${Number(invoice.balanceAmount).toFixed(2)}</td>
                                            <td>
                                                <input type="number" min="0" max={Number(invoice.balanceAmount)} step="0.01" className="input-vscode w-full" value={allocation?.allocatedAmount || 0} onChange={(e) => updateAllocation(invoice.id, Number(e.target.value) || 0)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {selectedVendorId && vendorInvoices.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-vscode-text-muted">No approved invoices for this vendor.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <label className="form-label">Remarks</label>
                        <textarea className="form-textarea w-full" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="text-sm text-vscode-text-muted">Payment Total: <span className="font-mono text-vscode-text">${totalAmount.toFixed(2)}</span></div>
                        <button className="btn-primary" type="submit">Post Payment</button>
                    </div>
                </form>
            )}

            <div className="flex-1 overflow-auto relative">
                {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">Loading payments...</div>}
                <table className="table-vscode">
                    <thead className="sticky top-0">
                        <tr>
                            <th>Payment No</th>
                            <th>Vendor</th>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((payment) => (
                            <tr key={payment.id}>
                                <td className="font-mono text-xs font-semibold">{payment.paymentNo}</td>
                                <td>{payment.vendor?.name || payment.vendorId}</td>
                                <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                <td>{payment.method}</td>
                                <td className="font-mono">${Number(payment.amount).toFixed(2)}</td>
                                <td><span className="badge badge-success">{payment.status}</span></td>
                            </tr>
                        ))}
                        {!isLoading && payments.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-vscode-text-muted">No payments posted yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Payments;
