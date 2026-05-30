import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Plus, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { procurementService } from '../services/procurementService';
import { Invoice, PurchaseOrder } from '../types/models';

interface DraftInvoiceLine {
    poItemId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
}

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

const VendorInvoice: React.FC = () => {
    const navigate = useNavigate();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [poId, setPoId] = useState('');
    const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [lines, setLines] = useState<DraftInvoiceLine[]>([]);

    useEffect(() => {
        void fetchData();
    }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [poData, invoiceData] = await Promise.all([
                procurementService.getPOs(),
                financeService.getInvoices(),
            ]);
            setPurchaseOrders(poData);
            setInvoices(invoiceData);
        } catch (error) {
            console.error('Error fetching invoice data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const invoiceEligiblePOs = useMemo(() => purchaseOrders.filter((po) => ['Partially Received', 'Fully Received', 'Closed'].includes(po.status)), [purchaseOrders]);
    const selectedPO = invoiceEligiblePOs.find((po) => String(po.id) === poId);

    useEffect(() => {
        if (!selectedPO) {
            setLines([]);
            return;
        }
        setLines((selectedPO.poItems || [])
            .map((line) => ({
                poItemId: line.id,
                itemId: line.itemId,
                quantity: Math.max(0, Number(line.acceptedQty) - Number(line.invoicedQty)),
                unitPrice: Number(line.unitPrice),
                taxRate: Number(line.taxRate || 0),
            }))
            .filter((line) => line.quantity > 0));
    }, [selectedPO]);

    const totals = useMemo(() => {
        return lines.reduce((summary, line) => {
            const baseAmount = roundMoney(line.quantity * line.unitPrice);
            const taxAmount = roundMoney(baseAmount * (line.taxRate / 100));
            return {
                baseAmount: roundMoney(summary.baseAmount + baseAmount),
                taxAmount: roundMoney(summary.taxAmount + taxAmount),
                totalAmount: roundMoney(summary.totalAmount + baseAmount + taxAmount),
            };
        }, { baseAmount: 0, taxAmount: 0, totalAmount: 0 });
    }, [lines]);

    function updateLine(index: number, patch: Partial<DraftInvoiceLine>) {
        setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
    }

    function getLineAmounts(line: DraftInvoiceLine) {
        const baseAmount = roundMoney(line.quantity * line.unitPrice);
        const taxAmount = roundMoney(baseAmount * (line.taxRate / 100));
        const totalAmount = roundMoney(baseAmount + taxAmount);
        return { baseAmount, taxAmount, totalAmount };
    }

    async function handleCreateInvoice(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedPO) {
            alert('Select a PO');
            return;
        }
        const payloadLines = lines
            .filter((line) => line.quantity > 0)
            .map((line) => ({
                poItemId: line.poItemId,
                itemId: line.itemId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
            }));
        if (payloadLines.length === 0) {
            alert('Invoice needs at least one line with quantity');
            return;
        }

        try {
            setIsLoading(true);
            await financeService.createInvoice({
                poId: selectedPO.id,
                vendorId: selectedPO.vendorId,
                vendorInvoiceNo,
                date: new Date(invoiceDate).toISOString(),
                dueDate: new Date(dueDate).toISOString(),
                amount: totals.totalAmount,
                remarks,
                lines: payloadLines,
            });
            setIsCreating(false);
            setPoId('');
            setVendorInvoiceNo('');
            setRemarks('');
            await fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to create invoice');
        } finally {
            setIsLoading(false);
        }
    }

    async function approveInvoice(invoiceId: string) {
        try {
            setIsLoading(true);
            const result = await financeService.updateInvoiceStatus(invoiceId, 'Approved');
            if (result?.message) {
                alert(result.message);
            }
            await fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to approve invoice');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Finance</span>
                <span>/</span>
                <span className="text-vscode-text">Vendor Invoices</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <Receipt size={16} className="text-vscode-accent" />
                    Invoice Matching
                </h2>
                <button onClick={() => setIsCreating((current) => !current)} className="btn-primary flex items-center gap-2 ml-auto">
                    <Plus size={14} />
                    <span>{isCreating ? 'Close Form' : 'Enter Invoice'}</span>
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateInvoice} className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="form-label">Purchase Order</label>
                            <select required className="input-vscode w-full" value={poId} onChange={(e) => setPoId(e.target.value)}>
                                <option value="">Select PO</option>
                                {invoiceEligiblePOs.map((po) => (
                                    <option key={po.id} value={String(po.id)}>{po.poNo} - {po.vendor?.name || po.vendorId}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Vendor Invoice No</label>
                            <input required className="input-vscode w-full" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Invoice Date</label>
                            <input type="date" required className="input-vscode w-full" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Due Date</label>
                            <input type="date" required className="input-vscode w-full" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    {selectedPO && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs uppercase">Selected PO</div>
                                    <div className="font-semibold text-vscode-text">{selectedPO.poNo}</div>
                                </div>
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs uppercase">Vendor</div>
                                    <div className="font-semibold text-vscode-text">{selectedPO.vendor?.name || selectedPO.vendorId}</div>
                                </div>
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs uppercase">PO Status</div>
                                    <div className="font-semibold text-vscode-text">{selectedPO.status}</div>
                                </div>
                            </div>

                            {lines.length === 0 && (
                                <div className="rounded border border-vscode-border bg-vscode-bg p-3 text-sm text-vscode-text-muted">
                                    No invoice lines are available for this PO. This happens when no GRN accepted quantity exists yet, or when all accepted quantity has already been invoiced.
                                </div>
                            )}

                        <div className="overflow-auto">
                            <table className="table-vscode">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Accepted Qty</th>
                                        <th>Already Invoiced</th>
                                        <th>Open Qty</th>
                                        <th>Invoice Qty</th>
                                        <th>Unit Price</th>
                                        <th>VAT/GST %</th>
                                        <th>VAT/GST Amt</th>
                                        <th>Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, index) => {
                                        const poLine = selectedPO.poItems.find((entry) => entry.id === line.poItemId);
                                        const amounts = getLineAmounts(line);
                                        return (
                                            <tr key={line.poItemId}>
                                                <td>{poLine?.item?.code || line.itemId} - {poLine?.item?.name || 'Item'}</td>
                                                <td>{poLine?.acceptedQty || 0}</td>
                                                <td>{poLine?.invoicedQty || 0}</td>
                                                <td className="font-mono">{Math.max(0, Number(poLine?.acceptedQty || 0) - Number(poLine?.invoicedQty || 0))}</td>
                                                <td>
                                                    <input type="number" min="0" className="input-vscode w-full" value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 0 })} />
                                                </td>
                                                <td>
                                                    <input type="number" min="0" step="0.01" className="input-vscode w-full" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) || 0 })} />
                                                </td>
                                                <td className="font-mono">{line.taxRate.toFixed(2)}%</td>
                                                <td className="font-mono">${amounts.taxAmount.toFixed(2)}</td>
                                                <td className="font-mono">${amounts.totalAmount.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        </div>
                    )}

                    <div>
                        <label className="form-label">Remarks</label>
                        <textarea className="form-textarea w-full" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="text-sm text-vscode-text-muted">
                            Invoice Total:
                            <span className="font-mono text-vscode-text"> ${totals.totalAmount.toFixed(2)}</span>
                            <span className="ml-3">Tax: <span className="font-mono text-vscode-text">${totals.taxAmount.toFixed(2)}</span></span>
                        </div>
                        <button className="btn-primary" type="submit">Save Matched Invoice</button>
                    </div>
                </form>
            )}

            <div className="flex-1 overflow-auto relative">
                {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">Loading invoices...</div>}
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Invoice No</th>
                            <th>Vendor Invoice No</th>
                            <th>Vendor</th>
                            <th>PO</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr key={invoice.id}>
                                <td className="font-mono text-xs font-semibold">{invoice.invoiceNo}</td>
                                <td>{invoice.vendorInvoiceNo}</td>
                                <td>{invoice.vendor?.name || invoice.vendorId}</td>
                                <td>{invoice.po?.poNo || invoice.poId}</td>
                                <td className="font-mono">${Number(invoice.amount).toFixed(2)}</td>
                                <td className="font-mono">${Number(invoice.balanceAmount).toFixed(2)}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <span className="badge badge-info">{invoice.status}</span>
                                        {invoice.matchWarnings && invoice.matchWarnings.length > 0 && <span className="badge badge-warning">Mismatch</span>}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        {invoice.status === 'Matched' && (
                                        <button className="btn-secondary py-1 px-2 text-xs flex items-center gap-1" onClick={() => void approveInvoice(invoice.id)}>
                                            <CheckCircle size={12} />
                                            Approve
                                        </button>
                                        )}
                                        <button className="text-xs text-vscode-accent hover:underline" onClick={() => navigate(`/finance/invoices/${invoice.id}`)}>
                                            View
                                        </button>
                                        {invoice.matchWarnings && invoice.matchWarnings.length > 0 && (
                                            <button className="text-xs text-status-warning hover:underline" onClick={() => alert(invoice.matchWarnings?.join('\n'))}>View Warnings</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && invoices.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-vscode-text-muted">No invoices yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VendorInvoice;
