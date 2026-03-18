import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, DollarSign, FileText, Package, ShoppingCart, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { inventoryService } from '../services/inventoryService';
import { masterService } from '../services/masterService';
import { procurementService } from '../services/procurementService';
import { Invoice, Item, PurchaseOrder, PurchaseRequisition, StockLevel } from '../types/models';
import { useAppContext } from '../contexts/AppContext';

const Dashboard: React.FC = () => {
    const { currentUser } = useAppContext();
    const navigate = useNavigate();
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { void fetchData(); }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [prData, poData, itemData, stockData, invoiceData] = await Promise.all([
                procurementService.getPRs(),
                procurementService.getPOs(),
                masterService.getItems(),
                inventoryService.getStockLevels(),
                financeService.getInvoices(),
            ]);
            setPrs(prData);
            setPos(poData);
            setItems(itemData);
            setStockLevels(stockData);
            setInvoices(invoiceData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const pendingPRs = prs.filter((pr) => pr.status === 'Submitted').length;
    const issuedPOs = pos.filter((po) => ['Issued', 'Partially Received'].includes(po.status)).length;
    const pendingInvoices = invoices.filter((invoice) => ['Matched', 'Approved', 'Partially Paid'].includes(invoice.status)).length;
    const lowStockItems = stockLevels.filter((level) => Number(level.quantity) <= Number(level.minStockLevel || 0)).length;
    const totalOpenPayable = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceAmount || 0), 0);

    const recentActivity = [...prs.map((pr) => ({ id: pr.prNo, label: 'Purchase Request', date: pr.date, status: pr.status })), ...pos.map((po) => ({ id: po.poNo, label: 'Purchase Order', date: po.date, status: po.status }))]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);

    const topInventory = useMemo(() => items.slice(0, 5).map((item) => {
        const totalQty = stockLevels.filter((level) => level.itemId === item.id).reduce((sum, level) => sum + Number(level.quantity), 0);
        return { item, totalQty, value: totalQty * Number(item.price) };
    }).sort((a, b) => b.value - a.value), [items, stockLevels]);

    return (
        <div className="p-4 flex flex-col gap-4 relative">
            {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="text-vscode-text-muted">Loading dashboard...</div></div>}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-lg font-semibold text-vscode-text">Operations Dashboard</div>
                    <div className="text-xs text-vscode-text-muted mt-1">Welcome back, {currentUser?.name}. Keep approvals, receipts, and payments moving in order.</div>
                </div>
                <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => navigate('/procurement/purchase-requisition/new')}>New PR</button>
                    <button className="btn-secondary" onClick={() => navigate('/procurement/purchase-order')}>PO Workbench</button>
                    <button className="btn-secondary" onClick={() => navigate('/finance/payments')}>Payments</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                    { label: 'Pending PR Approval', value: pendingPRs, icon: <FileText size={18} />, color: 'text-status-info' },
                    { label: 'POs Awaiting Receipt', value: issuedPOs, icon: <ShoppingCart size={18} />, color: 'text-status-warning' },
                    { label: 'Invoices To Settle', value: pendingInvoices, icon: <DollarSign size={18} />, color: 'text-status-success' },
                    { label: 'Low Stock Alerts', value: lowStockItems, icon: <TrendingDown size={18} />, color: 'text-status-error' },
                ].map((card) => (
                    <div key={card.label} className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md">
                        <div className={`mb-2 ${card.color}`}>{card.icon}</div>
                        <div className="text-xs text-vscode-text-muted uppercase">{card.label}</div>
                        <div className="text-2xl font-bold font-mono mt-1">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1">
                <div className="xl:col-span-2 bg-vscode-sidebar border border-vscode-border rounded-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-vscode-border flex items-center gap-2 font-semibold"><Activity size={16} className="text-vscode-accent" />Recent Documents</div>
                    <table className="table-vscode">
                        <thead>
                            <tr>
                                <th>Document</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentActivity.map((entry) => (
                                <tr key={`${entry.label}-${entry.id}`}>
                                    <td className="font-mono text-xs font-semibold">{entry.id}</td>
                                    <td>{entry.label}</td>
                                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                                    <td><span className="badge badge-info">{entry.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-4">
                    <div className="bg-vscode-sidebar border border-vscode-border rounded-md p-4">
                        <h3 className="font-semibold flex items-center gap-2"><Package size={16} className="text-vscode-accent" />Top Inventory Value</h3>
                        <div className="mt-3 space-y-3">
                            {topInventory.map(({ item, totalQty, value }) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <div>{item.name}</div>
                                        <div className="text-xs text-vscode-text-muted">{totalQty.toFixed(2)} {item.uom}</div>
                                    </div>
                                    <div className="font-mono">${value.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-vscode-sidebar border border-vscode-border rounded-md p-4">
                        <h3 className="font-semibold flex items-center gap-2"><AlertTriangle size={16} className="text-status-warning" />Attention Needed</h3>
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="p-3 bg-vscode-bg border border-vscode-border rounded">Open payables: <span className="font-mono">${totalOpenPayable.toFixed(2)}</span></div>
                            <button className="w-full text-left p-3 bg-vscode-bg border border-vscode-border rounded hover:border-vscode-accent" onClick={() => navigate('/inventory/grn')}>Process pending goods receipts</button>
                            <button className="w-full text-left p-3 bg-vscode-bg border border-vscode-border rounded hover:border-vscode-accent" onClick={() => navigate('/finance/invoices')}>Approve matched invoices</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
