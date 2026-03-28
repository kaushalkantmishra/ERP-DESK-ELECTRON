import { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { financeService } from '../services/financeService';
import { inventoryService } from '../services/inventoryService';
import { masterService } from '../services/masterService';
import { procurementService } from '../services/procurementService';
import { Invoice, Item, PurchaseOrder, PurchaseRequisition, StockLevel, StockTransaction, Vendor } from '../types/models';

const Reports = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { void fetchData(); }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [itemData, vendorData, stockData, poData, invData, prData, txData] = await Promise.all([
                masterService.getItems(),
                masterService.getVendors(),
                inventoryService.getStockLevels(),
                procurementService.getPOs(),
                financeService.getInvoices(),
                procurementService.getPRs(),
                inventoryService.getTransactions(),
            ]);
            setItems(itemData);
            setVendors(vendorData);
            setStockLevels(stockData);
            setPos(poData);
            setInvoices(invData);
            setPrs(prData);
            setStockTransactions(txData);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const totalInventoryValue = stockLevels.reduce((sum, level) => {
        const item = items.find((entry) => String(entry.id) === String(level.itemId));
        return sum + (Number(level.quantity) * Number(item?.price || 0));
    }, 0);
    const totalSpend = invoices.filter((invoice) => invoice.status === 'Paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const pendingPRs = prs.filter((pr) => ['Draft', 'Submitted'].includes(pr.status)).length;
    const pendingPOs = pos.filter((po) => ['Draft', 'Issued', 'Partially Received'].includes(po.status)).length;

    const vendorStats = vendors.map((vendor) => {
        const vendorPOs = pos.filter((po) => String(po.vendorId) === String(vendor.id));
        const totalAmount = vendorPOs.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
        const completedPOs = vendorPOs.filter((po) => ['Fully Received', 'Closed'].includes(po.status)).length;
        return { ...vendor, totalAmount, completedPOs, totalPOs: vendorPOs.length };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    const lowStockItems = stockLevels.map((level) => {
        const item = items.find((entry) => String(entry.id) === String(level.itemId));
        return { ...level, item, deficit: Number(level.minStockLevel || 0) - Number(level.quantity) };
    }).filter((level) => Number(level.quantity) <= Number(level.item?.reorderLevel || level.minStockLevel || 0)).sort((a, b) => b.deficit - a.deficit);

    const prStatusCounts = prs.reduce((acc, pr) => {
        acc[pr.status] = (acc[pr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="text-vscode-text-muted">Generating report...</div></div>}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2"><span>System</span><span>/</span><span className="text-vscode-text">Reports & Analytics</span></div>
            <div className="flex-1 overflow-auto p-4">
                <h1 className="text-2xl font-bold text-vscode-text mb-6 flex items-center gap-2"><BarChart3 className="text-vscode-accent" />Executive Summary</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border"><div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2"><TrendingUp size={14} />Inventory Value</div><div className="text-2xl font-bold text-vscode-text font-mono">${totalInventoryValue.toLocaleString()}</div></div>
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border"><div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-green-500" />Total Spend (Paid)</div><div className="text-2xl font-bold text-green-500 font-mono">${totalSpend.toLocaleString()}</div></div>
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border"><div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2"><AlertCircle size={14} className="text-yellow-500" />Pending PRs</div><div className="text-2xl font-bold text-yellow-500 font-mono">{pendingPRs}</div></div>
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border"><div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2"><RefreshCw size={14} className="text-blue-500" />Open POs</div><div className="text-2xl font-bold text-blue-500 font-mono">{pendingPOs}</div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-vscode-bg border border-vscode-border rounded">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">Vendor Spending & Performance</div>
                        <table className="table-vscode"><thead><tr><th>Vendor</th><th>Rating</th><th className="text-right">Total PO Value</th><th className="text-center">Completed</th></tr></thead><tbody>{vendorStats.slice(0, 5).map((vendor) => <tr key={vendor.id}><td>{vendor.name}</td><td>{vendor.rating}</td><td className="text-right font-mono">${vendor.totalAmount.toLocaleString()}</td><td className="text-center text-xs">{vendor.completedPOs} / {vendor.totalPOs}</td></tr>)}</tbody></table>
                    </div>
                    <div className="bg-vscode-bg border border-vscode-border rounded">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">Inventory Valuation (Top Items)</div>
                        <table className="table-vscode"><thead><tr><th>Item</th><th>Price</th><th className="text-right">Total Qty</th><th className="text-right">Total Value</th></tr></thead><tbody>{items.map((item) => { const totalQty = stockLevels.filter((level) => String(level.itemId) === String(item.id)).reduce((sum, level) => sum + Number(level.quantity), 0); const totalVal = totalQty * Number(item.price); return { ...item, totalQty, totalVal }; }).sort((a, b) => b.totalVal - a.totalVal).slice(0, 5).map((item) => <tr key={item.id}><td>{item.name}</td><td>${item.price}</td><td className="text-right font-mono">{item.totalQty.toFixed(2)}</td><td className="text-right font-mono font-bold">${item.totalVal.toLocaleString()}</td></tr>)}</tbody></table>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-vscode-bg border border-vscode-border rounded col-span-1 lg:col-span-2">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text flex items-center gap-2"><AlertCircle size={14} className="text-red-500" />Critical Low Stock Items</div>
                        <div className="overflow-auto max-h-60">
                            <table className="table-vscode"><thead><tr><th>Item Code</th><th>Name</th><th className="text-right">Current</th><th className="text-right">Min Level</th><th className="text-right">Deficit</th></tr></thead><tbody>{lowStockItems.length > 0 ? lowStockItems.map((level) => <tr key={`${level.itemId}-${level.warehouseId}`}><td className="font-mono text-xs">{level.item?.code}</td><td>{level.item?.name}</td><td className="text-right font-bold text-red-500">{Number(level.quantity).toFixed(2)}</td><td className="text-right text-vscode-text-muted">{Number(level.minStockLevel).toFixed(2)}</td><td className="text-right text-red-400">-{level.deficit.toFixed(2)}</td></tr>) : <tr><td colSpan={5} className="text-center p-4 text-vscode-text-muted">No items below minimum stock.</td></tr>}</tbody></table>
                        </div>
                    </div>
                    <div className="bg-vscode-bg border border-vscode-border rounded">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">PR Status Distribution</div>
                        <div className="p-4">{Object.entries(prStatusCounts).map(([status, count]) => <div key={status} className="mb-3 last:mb-0"><div className="flex justify-between text-xs mb-1"><span>{status}</span><span>{count}</span></div><div className="h-2 bg-vscode-sidebar rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${prs.length ? (count / prs.length) * 100 : 0}%` }} /></div></div>)}{prs.length === 0 && <div className="text-vscode-text-muted text-xs text-center">No Purchase Requisitions.</div>}</div>
                    </div>
                </div>

                <div className="mt-6 bg-vscode-bg border border-vscode-border rounded">
                    <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">Recent Stock Movement</div>
                    <div className="overflow-auto max-h-60">
                        <table className="table-vscode"><thead><tr><th>Timestamp</th><th>Item</th><th>Type</th><th className="text-right">Qty</th><th>Warehouse</th><th>Notes</th></tr></thead><tbody>{[...stockTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8).map((transaction) => { const item = items.find((entry) => String(entry.id) === String(transaction.itemId)); return <tr key={transaction.id}><td className="text-vscode-text-muted">{new Date(transaction.date).toLocaleString()}</td><td>{item?.code}</td><td><span className="badge badge-info">{transaction.type}</span></td><td className="text-right">{transaction.quantity}</td><td>{transaction.warehouse?.name || transaction.warehouseId}</td><td className="text-vscode-text-muted truncate max-w-xs">{transaction.notes}</td></tr>; })}{stockTransactions.length === 0 && <tr><td colSpan={6} className="text-center p-4 text-vscode-text-muted">No stock transactions recorded.</td></tr>}</tbody></table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
