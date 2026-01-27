import React from 'react';
import { FileText, ShoppingCart, AlertTriangle, TrendingDown, Plus, Package, DollarSign, Activity } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { prs, pos, items, currentUser, stockLevels } = useMockData();
    const navigate = useNavigate();

    // Calculate Stock Stats using StockLevels
    // Group stock by item
    const itemStockMap = new Map<string, { current: number, min: number }>();
    stockLevels.forEach(sl => {
        const current = itemStockMap.get(sl.itemId) || { current: 0, min: 0 };
        current.current += sl.quantity;
        current.min += sl.minStockLevel;
        itemStockMap.set(sl.itemId, current);
    });

    const pendingPRs = prs.filter(pr => pr.status === 'Submitted').length;
    const openPOs = pos.filter(po => po.status === 'Sent' || po.status === 'Partially Received').length;
    
    // Low stock items (where total stock < total min level)
    const lowStockItems = items.filter(i => {
        const stock = itemStockMap.get(i.id);
        if (!stock) return false;
        return stock.current <= stock.min;
    }).length;

    const urgentPRs = prs.filter(pr => pr.priority === 'Urgent' && pr.status !== 'Completed').length;

    // Derived Activity (Mock)
    const recentActivity = [
        ...prs.slice(0, 3).map(pr => ({ id: pr.prNo, type: 'PR Created', dept: pr.department, date: pr.date, status: pr.status })),
        ...pos.slice(0, 3).map(po => ({ id: po.poNo, type: 'PO Sent', dept: 'Procurement', date: po.date, status: po.status }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    const kpis = [
        { label: 'Pending PRs', value: pendingPRs, icon: <FileText size={20} />, color: 'text-status-info' },
        { label: 'Open POs', value: openPOs, icon: <ShoppingCart size={20} />, color: 'text-status-warning' },
        { label: 'Low Stock Items', value: lowStockItems, icon: <TrendingDown size={20} />, color: 'text-status-error' },
        { label: 'Urgent Requests', value: urgentPRs, icon: <AlertTriangle size={20} />, color: 'text-priority-urgent' },
    ];

    // Dummy Spending Data for Chart
    const monthlySpend = [4500, 5200, 4800, 6100, 5500, 7200];
    const maxSpend = Math.max(...monthlySpend);

    // Inventory Distribution
    const inventoryByCategory = items.reduce((acc, item) => {
        const stock = itemStockMap.get(item.id)?.current || 0;
        acc[item.category] = (acc[item.category] || 0) + (stock * item.price);
        return acc;
    }, {} as Record<string, number>);
    const totalInventoryValue = Object.values(inventoryByCategory).reduce((a, b) => a + b, 0);

    // Upcoming Deliveries
    const upcomingDeliveries = pos
        .filter(po => ['Sent', 'Partially Received', 'Acknowledged'].includes(po.status))
        .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
        .slice(0, 3);

    return (
        <div className="p-4 flex flex-col gap-4">
            {/* Header & Quick Actions */}
            <div className="flex items-center justify-between">
                <div className="text-xs text-vscode-text-muted">
                    <span className="text-vscode-text text-lg font-semibold">Dashboard</span>
                    <div className="mt-1">Welcome back, {currentUser?.name} ({currentUser?.role})</div>
                </div>

                <div className="flex gap-2">
                    <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/procurement/purchase-requisition/new')}>
                        <Plus size={14} /> <span>New PR</span>
                    </button>
                    <button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/inventory/grn')}>
                        <Package size={14} /> <span>Goods Receipt</span>
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
                {kpis.map((kpi, index) => (
                    <div
                        key={index}
                        className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md hover:border-vscode-accent transition-colors relative"
                    >
                        <div className={`absolute top-4 right-4 p-2 rounded-full bg-opacity-10 ${kpi.color.replace('text-', 'bg-')} ${kpi.color}`}>
                            {kpi.icon}
                        </div>
                        <div className="text-xs text-vscode-text-muted uppercase font-semibold mb-2">{kpi.label}</div>
                        <div className="text-2xl font-bold font-mono">{kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 h-full">
                {/* Main Content Area - Activity & Tables */}
                <div className="col-span-2 flex flex-col gap-4">
                    {/* Spending Chart (CSS/SVG) */}
                    <div className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold flex items-center gap-2">
                                <DollarSign size={16} className="text-vscode-accent" />
                                Monthly Spending Trend (6 Months)
                            </h3>
                            <span className="text-xs text-vscode-text-muted">Total: $33,300</span>
                        </div>
                        <div className="h-40 flex justify-between gap-2 px-2">
                            {monthlySpend.map((value, i) => (
                                <div key={i} className="flex flex-col items-center justify-end gap-2 flex-1 group cursor-pointer h-full">
                                    <div className="relative w-full bg-vscode-accent opacity-60 hover:opacity-100 rounded-t-sm transition-all duration-300"
                                        style={{ height: `${(value / maxSpend) * 80}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-vscode-bg border border-vscode-border px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            ${value}
                                        </div>
                                    </div>
                                    <span className="text-xs text-vscode-text-muted">M{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inventory Distribution Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md">
                            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                <Package size={16} className="text-vscode-accent" />
                                Inventory Value by Category
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(inventoryByCategory).map(([cat, val], i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>{cat}</span>
                                            <span className="font-mono">${val.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 bg-vscode-bg rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-vscode-accent opacity-80"
                                                style={{ width: `${(val / totalInventoryValue) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Vendors (New Small Widget) */}
                        <div className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md flex flex-col justify-center items-center text-center">
                            <div className="text-4xl font-bold text-vscode-accent mb-2">
                                ${totalInventoryValue.toLocaleString()}
                            </div>
                            <div className="text-sm text-vscode-text-muted">Total Inventory Value</div>
                            <div className="mt-4 text-xs text-status-success bg-status-success bg-opacity-10 px-2 py-1 rounded">
                                +12% vs Last Month
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Table */}
                    <div className="bg-vscode-sidebar border border-vscode-border rounded-md flex-1">
                        <div className="border-b border-vscode-border px-4 py-3 flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Activity size={16} className="text-vscode-accent" />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-0">
                            <table className="table-vscode w-full">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Type</th>
                                        <th>Details</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentActivity.map((act, i) => (
                                        <tr key={i} className="hover:bg-vscode-hover">
                                            <td className="font-mono text-xs text-vscode-accent">{act.id}</td>
                                            <td className="text-xs">{act.type}</td>
                                            <td className="text-xs text-vscode-text-muted">
                                                {act.dept} • {act.date}
                                            </td>
                                            <td>
                                                <span className={`badge text-[10px] px-1.5 py-0.5 ${['Completed', 'RFQ Created'].includes(act.status) ? 'badge-success' :
                                                    ['Approved', 'Sent', 'Acknowledged', 'Draft', 'Closed'].includes(act.status) ? 'badge-info' :
                                                        ['Submitted', 'Partially Received'].includes(act.status) ? 'badge-warning' :
                                                            'badge-error'
                                                    }`}>
                                                    {act.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentActivity.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-4 text-vscode-text-muted">No recent activity</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Alerts & Summary */}
                <div className="flex flex-col gap-4">
                    {/* Budget / Department Distribution */}
                    <div className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md">
                        <h3 className="font-semibold mb-4 text-sm">Budget Utilization</h3>
                        <div className="space-y-4">
                            {[
                                { dept: 'IT Department', used: 85, color: 'bg-status-error' },
                                { dept: 'Marketing', used: 45, color: 'bg-status-info' },
                                { dept: 'Operations', used: 60, color: 'bg-status-warning' },
                                { dept: 'HR', used: 30, color: 'bg-status-success' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>{item.dept}</span>
                                        <span>{item.used}%</span>
                                    </div>
                                    <div className="h-2 bg-vscode-bg rounded-full overflow-hidden border border-vscode-border">
                                        <div className={`h-full ${item.color}`} style={{ width: `${item.used}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Deliveries */}
                    <div className="bg-vscode-sidebar border border-vscode-border p-4 rounded-md">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-sm">Upcoming Deliveries</h3>
                            <span className="text-xs text-vscode-text-muted">Next 7 Days</span>
                        </div>
                        <div className="space-y-3">
                            {upcomingDeliveries.length > 0 ? (
                                upcomingDeliveries.map((po, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-vscode-bg rounded border border-vscode-border hover:border-vscode-accent transition-colors cursor-pointer">
                                        <div>
                                            <div className="text-xs font-semibold text-vscode-accent">{po.poNo}</div>
                                            <div className="text-[10px] text-vscode-text-muted">Vendor: {po.vendorId}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-mono">{po.deliveryDate}</div>
                                            <div className="text-[10px] text-status-info">{po.status}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-vscode-text-muted text-center py-2">No upcoming deliveries</div>
                            )}
                        </div>
                    </div>

                    {/* Alerts List */}
                    <div className="bg-vscode-sidebar border border-vscode-border rounded-md flex-1 overflow-hidden flex flex-col">
                        <div className="border-b border-vscode-border px-4 py-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <AlertTriangle size={16} className="text-status-warning" />
                                Action Required
                            </h3>
                        </div>
                        <div className="overflow-auto flex-1 p-2 space-y-2">
                            {lowStockItems > 0 && (
                                <div className="p-3 bg-vscode-bg border-l-2 border-status-error rounded-r text-xs cursor-pointer hover:bg-vscode-hover">
                                    <div className="font-semibold mb-1 text-status-error">Low Stock Alert</div>
                                    <div className="text-vscode-text-muted">{lowStockItems} items are below reorder level.</div>
                                </div>
                            )}
                            {urgentPRs > 0 && (
                                <div className="p-3 bg-vscode-bg border-l-2 border-priority-urgent rounded-r text-xs cursor-pointer hover:bg-vscode-hover">
                                    <div className="font-semibold mb-1 text-priority-urgent">Urgent PRs</div>
                                    <div className="text-vscode-text-muted">{urgentPRs} urgent requisitions pending.</div>
                                </div>
                            )}
                            <div className="p-3 bg-vscode-bg border-l-2 border-status-info rounded-r text-xs cursor-pointer hover:bg-vscode-hover">
                                <div className="font-semibold mb-1 text-status-info">System Update</div>
                                <div className="text-vscode-text-muted">Maintenance scheduled for Saturday 10 PM.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
