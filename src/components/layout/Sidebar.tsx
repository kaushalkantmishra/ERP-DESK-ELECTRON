import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    FileText,
    Package,
    Users,
    Warehouse,
    BookOpen,
    ClipboardList,
    TrendingUp,
    Settings,
    ChevronRight,
    ChevronDown,
    PanelLeftClose,
    PanelLeft,
    Send,
    FileCheck,
    MinusCircle,
    CreditCard
} from 'lucide-react';
import { Tab } from '../../App';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onNavigate: (tab: Tab) => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    children?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onNavigate }) => {
    const navigate = useNavigate();
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['procurement', 'inventory']);
    const [activeItem, setActiveItem] = useState('dashboard');

    const mainMenuItems: MenuItem[] = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <LayoutDashboard size={16} />,
            path: '/dashboard'
        },
        {
            id: 'procurement',
            label: 'Procurement',
            icon: <ShoppingCart size={16} />,
            children: [
                { id: 'purchase-requisition', label: 'Purchase Requisition', icon: <FileText size={16} />, path: '/procurement/purchase-requisition' },
                { id: 'rfq', label: 'RFQ', icon: <Send size={16} />, path: '/procurement/rfq' },
                { id: 'quotations', label: 'Quotations', icon: <FileCheck size={16} />, path: '/procurement/quotations' },
                { id: 'purchase-order', label: 'Purchase Order', icon: <ClipboardList size={16} />, path: '/procurement/purchase-order' },
                { id: 'vendor-management', label: 'Vendor Management', icon: <Users size={16} />, path: '/procurement/vendor-management' },
            ]
        },
        {
            id: 'inventory',
            label: 'Inventory',
            icon: <Warehouse size={16} />,
            children: [
                { id: 'dashboard-inventory', label: 'Overview', icon: <LayoutDashboard size={16} />, path: '/inventory/dashboard' },
                { id: 'item-master', label: 'Item Master', icon: <BookOpen size={16} />, path: '/inventory/item-master' },
                { id: 'grn', label: 'Goods Receipt (GRN)', icon: <Package size={16} />, path: '/inventory/grn' },
                { id: 'stock-ledger', label: 'Stock Ledger', icon: <TrendingUp size={16} />, path: '/inventory/stock-ledger' },
                { id: 'material-issue', label: 'Material Issue', icon: <MinusCircle size={16} />, path: '/inventory/material-issue' },
                { id: 'stock-adjustment', label: 'Stock Adjustment', icon: <ClipboardList size={16} />, path: '/inventory/stock-adjustment' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            icon: <CreditCard size={16} />,
            children: [
                { id: 'invoices', label: 'Vendor Invoices', icon: <FileText size={16} />, path: '/finance/invoices' },
                { id: 'payments', label: 'Payments', icon: <CreditCard size={16} />, path: '/finance/payments' },
            ]
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: <TrendingUp size={16} />,
            path: '/reports'
        }
    ];

    const bottomMenuItems: MenuItem[] = [
        {
            id: 'settings',
            label: 'Settings',
            icon: <Settings size={16} />,
            path: '/settings'
        }
    ];

    const toggleGroup = (groupId: string) => {
        if (expandedGroups.includes(groupId)) {
            setExpandedGroups(expandedGroups.filter(id => id !== groupId));
        } else {
            setExpandedGroups([...expandedGroups, groupId]);
        }
    };

    const handleItemClick = (item: MenuItem) => {
        if (item.path) {
            setActiveItem(item.id);
            navigate(item.path);
            onNavigate({
                id: item.id,
                title: item.label,
                path: item.path,
                closable: item.id !== 'dashboard'
            });
        } else if (item.children) {
            toggleGroup(item.id);
        }
    };

    const renderMenuItem = (item: MenuItem, level: number = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.includes(item.id);
        const isActive = activeItem === item.id;

        return (
            <div key={item.id}>
                <div
                    className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
                    style={{ paddingLeft: collapsed ? undefined : `${12 + level * 12}px` }}
                    onClick={() => handleItemClick(item)}
                    title={collapsed ? item.label : undefined}
                >
                    {hasChildren && !collapsed && (
                        <span className="text-vscode-text-muted">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    )}
                    <span className={hasChildren && !collapsed ? '' : collapsed ? '' : 'ml-5'}>
                        {item.icon}
                    </span>
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                </div>
                {hasChildren && isExpanded && !collapsed && (
                    <div>
                        {item.children!.map(child => renderMenuItem(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className={`bg-vscode-sidebar border-r border-vscode-border flex flex-col transition-all duration-200 ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
                }`}
        >
            {/* Sidebar Header */}
            <div className="h-10 border-b border-vscode-border flex items-center justify-between px-3">
                {!collapsed && <span className="text-xs uppercase text-vscode-text-muted font-semibold">Modules</span>}
                <button
                    onClick={onToggle}
                    className="text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-hover p-1 transition-colors"
                    title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                </button>
            </div>

            {/* Main Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
                {mainMenuItems.map(item => renderMenuItem(item))}
            </div>

            {/* Bottom Menu Items */}
            <div className="border-t border-vscode-border py-2 mt-auto">
                {bottomMenuItems.map(item => renderMenuItem(item))}
            </div>
        </div>
    );
};

export default Sidebar;
