import React from 'react';
import { FileText, ShoppingCart, AlertTriangle, TrendingDown } from 'lucide-react';

const Dashboard: React.FC = () => {
    const kpis = [
        { label: 'Pending PRs', value: 12, icon: <FileText size={20} />, color: 'text-status-info' },
        { label: 'Open POs', value: 8, icon: <ShoppingCart size={20} />, color: 'text-status-warning' },
        { label: 'Low Stock Items', value: 23, icon: <TrendingDown size={20} />, color: 'text-status-error' },
        { label: 'Overdue PRs', value: 5, icon: <AlertTriangle size={20} />, color: 'text-priority-urgent' },
    ];

    const recentActivity = [
        { id: 'PR-2024-001', type: 'PR Created', department: 'IT', user: 'John Doe', date: '2024-01-12 14:30', status: 'Pending' },
        { id: 'PO-2024-045', type: 'PO Approved', department: 'Operations', user: 'Jane Smith', date: '2024-01-12 13:15', status: 'Approved' },
        { id: 'GRN-2024-089', type: 'Goods Received', department: 'Warehouse', user: 'Mike Johnson', date: '2024-01-12 11:45', status: 'Completed' },
        { id: 'PR-2024-002', type: 'PR Rejected', department: 'HR', user: 'Sarah Williams', date: '2024-01-12 10:20', status: 'Rejected' },
        { id: 'SA-2024-012', type: 'Stock Adjusted', department: 'Warehouse', user: 'Tom Brown', date: '2024-01-12 09:00', status: 'Completed' },
    ];

    const alerts = [
        { id: 1, type: 'Low Stock', item: 'Laptop - Dell Latitude 5420', currentStock: 2, reorderLevel: 5, severity: 'high' },
        { id: 2, type: 'Overdue PR', prNo: 'PR-2023-456', department: 'Marketing', daysOverdue: 7, severity: 'urgent' },
        { id: 3, type: 'Low Stock', item: 'Mouse - Logitech M185', currentStock: 8, reorderLevel: 10, severity: 'medium' },
        { id: 4, type: 'Pending Approval', prNo: 'PR-2024-003', department: 'Finance', pendingDays: 3, severity: 'medium' },
    ];

    return (
        <div className="p-4">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted mb-4 flex items-center gap-2">
                <span>Home</span>
                <span>/</span>
                <span className="text-vscode-text">Dashboard</span>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                {kpis.map((kpi, index) => (
                    <div
                        key={index}
                        className="bg-vscode-sidebar border border-vscode-border p-3 hover:border-vscode-accent transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-vscode-text-muted uppercase">{kpi.label}</span>
                            <span className={kpi.color}>{kpi.icon}</span>
                        </div>
                        <div className="text-2xl font-bold font-mono">{kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Recent Activity */}
                <div className="col-span-2 bg-vscode-sidebar border border-vscode-border">
                    <div className="border-b border-vscode-border px-3 py-2">
                        <h2 className="text-sm font-semibold">Recent Activity</h2>
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                        <table className="table-vscode">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Type</th>
                                    <th>Department</th>
                                    <th>User</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.map((activity) => (
                                    <tr key={activity.id}>
                                        <td className="font-mono text-xs">{activity.id}</td>
                                        <td>{activity.type}</td>
                                        <td>{activity.department}</td>
                                        <td>{activity.user}</td>
                                        <td className="font-mono text-xs">{activity.date}</td>
                                        <td>
                                            <span className={`badge ${activity.status === 'Completed' ? 'badge-success' :
                                                    activity.status === 'Approved' ? 'badge-info' :
                                                        activity.status === 'Rejected' ? 'badge-error' :
                                                            'badge-warning'
                                                }`}>
                                                {activity.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-vscode-sidebar border border-vscode-border">
                    <div className="border-b border-vscode-border px-3 py-2">
                        <h2 className="text-sm font-semibold">Alerts</h2>
                    </div>
                    <div className="p-2 space-y-2 overflow-auto" style={{ maxHeight: '400px' }}>
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`p-2 border-l-2 bg-vscode-bg hover:bg-vscode-hover cursor-pointer transition-colors ${alert.severity === 'urgent' ? 'border-priority-urgent' :
                                        alert.severity === 'high' ? 'border-priority-high' :
                                            'border-priority-medium'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={14} className={
                                        alert.severity === 'urgent' ? 'text-priority-urgent' :
                                            alert.severity === 'high' ? 'text-priority-high' :
                                                'text-priority-medium'
                                    } />
                                    <div className="flex-1">
                                        <div className="text-xs font-semibold mb-1">{alert.type}</div>
                                        {alert.type === 'Low Stock' ? (
                                            <div className="text-xs text-vscode-text-muted">
                                                <div>{alert.item}</div>
                                                <div className="mt-1">Stock: {alert.currentStock} / Reorder: {alert.reorderLevel}</div>
                                            </div>
                                        ) : alert.type === 'Overdue PR' ? (
                                            <div className="text-xs text-vscode-text-muted">
                                                <div>{alert.prNo} - {alert.department}</div>
                                                <div className="mt-1">{alert.daysOverdue} days overdue</div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-vscode-text-muted">
                                                <div>{alert.prNo} - {alert.department}</div>
                                                <div className="mt-1">Pending for {alert.pendingDays} days</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
