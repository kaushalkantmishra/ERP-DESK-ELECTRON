import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';

const Reports = () => {
    const { items, vendors, stockLevels, pos, invoices, prs, stockTransactions } = useMockData();

    // Calculations
    const totalInventoryValue = stockLevels.reduce((sum, sl) => {
        const item = items.find(i => i.id === sl.itemId);
        return sum + (sl.quantity * (item?.price || 0));
    }, 0);

    const totalSpend = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
    const pendingPRs = prs.filter(pr => pr.status === 'Submitted' || pr.status === 'Draft').length;
    const pendingPOs = pos.filter(po => ['Sent', 'Acknowledged'].includes(po.status)).length;

    // Vendor Performance (Simple: Total PO amount per vendor)
    const vendorStats = vendors.map(v => {
        const vendorPOs = pos.filter(p => p.vendorId === v.id);
        const totalAmount = vendorPOs.reduce((sum, p) => sum + p.totalAmount, 0);
        const completedPOs = vendorPOs.filter(p => p.status === 'Completed').length;
        return {
            ...v,
            totalAmount,
            completedPOs,
            totalPOs: vendorPOs.length
        };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    // Low Stock Report
    const lowStockItems = stockLevels.map(sl => {
        const item = items.find(i => i.id === sl.itemId);
        return {
            ...sl,
            item,
            deficit: sl.minStockLevel - sl.quantity
        };
    }).filter(sl => sl.quantity <= sl.minStockLevel).sort((a, b) => b.deficit - a.deficit);

    // PR Status Breakdown
    const prStatusCounts = prs.reduce((acc, pr) => {
        acc[pr.status] = (acc[pr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex flex-col h-full overflow-hidden">
             {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>System</span>
                <span>/</span>
                <span className="text-vscode-text">Reports & Analytics</span>
            </div>

            <div className="flex-1 overflow-auto p-4">
                 <h1 className="text-2xl font-bold text-vscode-text mb-6 flex items-center gap-2">
                    <BarChart3 className="text-vscode-accent" />
                    Executive Summary
                 </h1>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                        <div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2">
                            <TrendingUp size={14} /> Inventory Value
                        </div>
                        <div className="text-2xl font-bold text-vscode-text font-mono">${totalInventoryValue.toLocaleString()}</div>
                    </div>
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                        <div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2">
                            <TrendingUp size={14} className="text-green-500" /> Total Spend (Paid)
                        </div>
                        <div className="text-2xl font-bold text-green-500 font-mono">${totalSpend.toLocaleString()}</div>
                    </div>
                    <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                        <div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2">
                            <AlertCircle size={14} className="text-yellow-500" /> Pending PRs
                        </div>
                        <div className="text-2xl font-bold text-yellow-500 font-mono">{pendingPRs}</div>
                    </div>
                     <div className="bg-vscode-sidebar p-4 rounded border border-vscode-border">
                        <div className="text-vscode-text-muted text-xs uppercase font-semibold flex items-center gap-2 mb-2">
                            <RefreshCw size={14} className="text-blue-500" /> Open POs
                        </div>
                        <div className="text-2xl font-bold text-blue-500 font-mono">{pendingPOs}</div>
                    </div>
                </div>

                {/* Main Tables Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    
                    {/* Vendor Performance */}
                    <div className="bg-vscode-bg border border-vscode-border rounded">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">
                            Vendor Spending & Performance
                        </div>
                        <table className="table-vscode">
                            <thead>
                                <tr>
                                    <th>Vendor</th>
                                    <th>Rating</th>
                                    <th className="text-right">Total PO Value</th>
                                    <th className="text-center">Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendorStats.slice(0, 5).map(v => (
                                    <tr key={v.id} className="hover:bg-vscode-list-hover">
                                        <td>{v.name}</td>
                                        <td className="text-yellow-500 text-xs">{'★'.repeat(Math.round(v.rating))}</td>
                                        <td className="text-right font-mono">${v.totalAmount.toLocaleString()}</td>
                                        <td className="text-center text-xs">{v.completedPOs} / {v.totalPOs}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Top Inventory Items by Value */}
                    <div className="bg-vscode-bg border border-vscode-border rounded">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">
                            Inventory Valuation (Top Items)
                        </div>
                         <table className="table-vscode">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th className="text-right">Total Qty</th>
                                    <th className="text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const totalQty = stockLevels.filter(sl => sl.itemId === item.id).reduce((s, sl) => s + sl.quantity, 0);
                                    const totalVal = totalQty * item.price;
                                    return { ...item, totalQty, totalVal };
                                })
                                .sort((a, b) => b.totalVal - a.totalVal)
                                .slice(0, 5) // Top 5
                                .map(item => (
                                    <tr key={item.id} className="hover:bg-vscode-list-hover">
                                        <td>{item.name}</td>
                                        <td className="text-vscode-text-muted text-xs">${item.price}</td>
                                        <td className="text-right font-mono">{item.totalQty}</td>
                                        <td className="text-right font-mono font-bold">${item.totalVal.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Additional Reports Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Critical Low Stock */}
                    <div className="bg-vscode-bg border border-vscode-border rounded col-span-1 lg:col-span-2">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text flex items-center gap-2">
                             <AlertCircle size={14} className="text-red-500" />
                             Critical Low Stock Items
                        </div>
                        <div className="overflow-auto max-h-60">
                            <table className="table-vscode">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Name</th>
                                        <th className="text-right">Current</th>
                                        <th className="text-right">Min Level</th>
                                        <th className="text-right">Deficit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockItems.length > 0 ? lowStockItems.map(sl => (
                                        <tr key={`${sl.itemId}-${sl.warehouseId}`} className="hover:bg-vscode-list-hover">
                                            <td className="font-mono text-xs">{sl.item?.code}</td>
                                            <td>{sl.item?.name}</td>
                                            <td className="text-right font-bold text-red-500">{sl.quantity}</td>
                                            <td className="text-right text-vscode-text-muted">{sl.minStockLevel}</td>
                                            <td className="text-right text-red-400">-{sl.deficit}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="text-center p-4 text-vscode-text-muted">No items below minimum stock.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PR Status Breakdown */}
                     <div className="bg-vscode-bg border border-vscode-border rounded">
                        <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">
                            PR Status Distribution
                        </div>
                        <div className="p-4">
                            {Object.entries(prStatusCounts).map(([status, count]) => (
                                <div key={status} className="mb-3 last:mb-0">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>{status}</span>
                                        <span>{count}</span>
                                    </div>
                                    <div className="h-2 bg-vscode-sidebar rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${status === 'Approved' ? 'bg-green-500' : status === 'Pending' ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${(count / prs.length) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {prs.length === 0 && <div className="text-vscode-text-muted text-xs text-center">No Purchase Requisitions.</div>}
                        </div>
                    </div>
                </div>

                {/* Recent Stock Movements */}
                <div className="mt-6 bg-vscode-bg border border-vscode-border rounded">
                     <div className="p-3 border-b border-vscode-border font-semibold text-vscode-text">
                        Recent Stock Movement
                    </div>
                    <div className="overflow-auto max-h-60">
                         <table className="table-vscode">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Item</th>
                                    <th>Type</th>
                                    <th className="text-right">Qty</th>
                                    <th>Performed By</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...stockTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8).map(tx => {
                                    const item = items.find(i => i.id === tx.itemId);
                                    return (
                                        <tr key={tx.id} className="hover:bg-vscode-list-hover font-mono text-xs">
                                            <td className="text-vscode-text-muted">{new Date(tx.date).toLocaleString()}</td>
                                            <td>{item?.code}</td>
                                            <td>
                                                 <span className={`badge ${tx.type === 'Receipt' ? 'badge-success' : tx.type === 'Issue' ? 'badge-warning' : 'badge-info'}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="text-right">{tx.quantity}</td>
                                            <td>{tx.performedBy}</td>
                                            <td className="text-vscode-text-muted truncate max-w-xs">{tx.notes}</td>
                                        </tr>
                                    );
                                })}
                                {stockTransactions.length === 0 && (
                                     <tr><td colSpan={6} className="text-center p-4 text-vscode-text-muted">No stock transactions recorded.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
