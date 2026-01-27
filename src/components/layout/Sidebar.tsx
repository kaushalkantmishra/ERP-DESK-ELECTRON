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
    CreditCard,
    LogOut,
    Scale,
    ShieldCheck
} from 'lucide-react';
import { Tab } from '../../App';
import { useMockData } from '../../contexts/MockContext';
import { Role } from '../../types/models';

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
    allowedRoles?: Role[];
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onNavigate }) => {
    const navigate = useNavigate();
    const { logout, currentUser } = useMockData();
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
            id: 'master-data',
            label: 'Master Data',
            icon: <BookOpen size={16} />,
            allowedRoles: ['Admin', 'Store', 'Procurement'],
            children: [
                { id: 'item-master', label: 'Item Master', icon: <Package size={16} />, path: '/master/items', allowedRoles: ['Admin', 'Store', 'Procurement'] },
                { id: 'category-master', label: 'Category Master', icon: <BookOpen size={16} />, path: '/master/categories', allowedRoles: ['Admin', 'Store'] },
                { id: 'uom-master', label: 'UoM Master', icon: <Scale size={16} />, path: '/master/uom', allowedRoles: ['Admin', 'Store'] },
                { id: 'vendor-master', label: 'Vendor Master', icon: <Users size={16} />, path: '/master/vendors', allowedRoles: ['Admin', 'Procurement'] },
                { id: 'warehouse-master', label: 'Warehouse Master', icon: <Warehouse size={16} />, path: '/master/warehouses', allowedRoles: ['Admin', 'Store'] },
                { id: 'approval-matrix', label: 'Approval Matrix', icon: <ShieldCheck size={16} />, path: '/master/approvals', allowedRoles: ['Admin'] },
            ]
        },
        {
            id: 'procurement',
            label: 'Procurement',
            icon: <ShoppingCart size={16} />,
            allowedRoles: ['Admin', 'Procurement', 'Dept', 'Vendor', 'Store'],
            children: [
                { id: 'purchase-requisition', label: 'Purchase Requisition', icon: <FileText size={16} />, path: '/procurement/purchase-requisition', allowedRoles: ['Admin', 'Procurement', 'Dept', 'Store'] },
                { id: 'rfq', label: 'RFQ', icon: <Send size={16} />, path: '/procurement/rfq', allowedRoles: ['Admin', 'Procurement', 'Vendor'] },
                { id: 'quotations', label: 'Quotations', icon: <FileCheck size={16} />, path: '/procurement/quotations', allowedRoles: ['Admin', 'Procurement', 'Vendor'] },
                { id: 'purchase-order', label: 'Purchase Order', icon: <ClipboardList size={16} />, path: '/procurement/purchase-order', allowedRoles: ['Admin', 'Procurement'] },
            ]
        },
        {
            id: 'inventory',
            label: 'Inventory',
            icon: <Warehouse size={16} />,
            allowedRoles: ['Admin', 'Store', 'Dept'],
            children: [
                { id: 'stock-management', label: 'Stock Management', icon: <TrendingUp size={16} />, path: '/inventory/stock-management', allowedRoles: ['Admin', 'Store'] },
                { id: 'stock-transfer', label: 'Stock Transfer', icon: <ClipboardList size={16} />, path: '/inventory/transfer', allowedRoles: ['Admin', 'Store'] },
                { id: 'material-issue', label: 'Material Issue', icon: <MinusCircle size={16} />, path: '/inventory/issue', allowedRoles: ['Admin', 'Store', 'Dept'] },
                { id: 'grn', label: 'Goods Receipt', icon: <Package size={16} />, path: '/inventory/grn', allowedRoles: ['Admin', 'Store'] },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            icon: <CreditCard size={16} />,
            allowedRoles: ['Admin', 'Finance'],
            children: [
                { id: 'invoices', label: 'Vendor Invoices', icon: <FileText size={16} />, path: '/finance/invoices', allowedRoles: ['Admin', 'Finance'] },
            ]
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: <TrendingUp size={16} />,
            path: '/reports',
            allowedRoles: ['Admin', 'Procurement', 'Store', 'Finance']
        },
        {
            id: 'audit',
            label: 'Audit Logs',
            icon: <ClipboardList size={16} />,
            path: '/audit-log',
            allowedRoles: ['Admin']
        }
    ];

    const bottomMenuItems: MenuItem[] = [
        {
            id: 'settings',
            label: 'Settings',
            icon: <Settings size={16} />,
            path: '/settings'
        },
        {
            id: 'logout',
            label: 'Logout',
            icon: <LogOut size={16} />,
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
        if (item.id === 'logout') {
            logout();
            return;
        }

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

    // Filter items based on role
    const filterItems = (items: MenuItem[]): MenuItem[] => {
        if (!currentUser) return [];
        
        return items.filter(item => {
            // Check if user has required role
            if (item.allowedRoles && !item.allowedRoles.includes(currentUser.role)) {
                return false;
            }
            return true;
        }).map(item => ({
            ...item,
            children: item.children ? filterItems(item.children) : undefined
        })).filter(item => {
            // If it's a group (has children) but no children are visible after filtering, hide the group
            // Exception: if it has a path (is a link itself) or if it had no children to begin with
            if (item.children && item.children.length === 0 && !item.path) {
                return false;
            }
            return true;
        });
    };

    const filteredMenuItems = filterItems(mainMenuItems);

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
                {filteredMenuItems.map(item => renderMenuItem(item))}
            </div>

            {/* Bottom Menu Items */}
            <div className="border-t border-vscode-border py-2 mt-auto">
                {bottomMenuItems.map(item => renderMenuItem(item))}
            </div>
        </div>
    );
};

export default Sidebar;
