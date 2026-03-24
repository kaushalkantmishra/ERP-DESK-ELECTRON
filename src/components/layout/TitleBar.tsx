import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Command, Package, RotateCcw, Search, Send, ShoppingBag, User, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { procurementService } from '../../services/procurementService';
import { PurchaseOrder, PurchaseRequisition, RFQ, Role } from '../../types/models';

type CommandResult = {
    id: string;
    title: string;
    subtitle: string;
    group: 'Pages' | 'Items' | 'Vendors' | 'Warehouses' | 'Purchase Requisitions' | 'RFQs' | 'Purchase Orders';
    icon: React.ReactNode;
    path: string;
};

const shortcuts = [
    { label: 'Reload', keys: 'Ctrl+R / F5', icon: <RotateCcw size={12} /> },
];

const pageCommands: Array<{
    id: string;
    title: string;
    subtitle: string;
    path: string;
    icon: React.ReactNode;
    roles?: Role[];
}> = [
    { id: 'page-dashboard', title: 'Dashboard', subtitle: 'Open home dashboard', path: '/dashboard', icon: <Building2 size={14} /> },
    { id: 'page-pr', title: 'Purchase Requisition', subtitle: 'Open requisition list', path: '/procurement/purchase-requisition', icon: <ShoppingBag size={14} /> },
    { id: 'page-pr-new', title: 'New Purchase Requisition', subtitle: 'Create a new PR', path: '/procurement/purchase-requisition/new', icon: <ShoppingBag size={14} /> },
    { id: 'page-rfq', title: 'RFQ', subtitle: 'Open RFQ management', path: '/procurement/rfq', icon: <Send size={14} />, roles: ['Admin', 'Procurement'] },
    { id: 'page-quotes', title: 'Quotations', subtitle: 'Compare vendor quotations', path: '/procurement/quotations', icon: <Send size={14} />, roles: ['Admin', 'Procurement'] },
    { id: 'page-po', title: 'PO Workbench', subtitle: 'Open purchase orders', path: '/procurement/purchase-order', icon: <Package size={14} />, roles: ['Admin', 'Procurement'] },
    { id: 'page-stock', title: 'Stock Management', subtitle: 'View stock levels', path: '/inventory/stock-management', icon: <Warehouse size={14} />, roles: ['Admin', 'Store'] },
    { id: 'page-grn', title: 'Goods Receipt', subtitle: 'Post GRN against PO', path: '/inventory/grn', icon: <Warehouse size={14} />, roles: ['Admin', 'Store'] },
    { id: 'page-items', title: 'Item Master', subtitle: 'Open item master', path: '/master/items', icon: <Package size={14} />, roles: ['Admin', 'Store', 'Procurement'] },
    { id: 'page-vendors', title: 'Vendor Master', subtitle: 'Open vendor master', path: '/master/vendors', icon: <User size={14} />, roles: ['Admin', 'Procurement'] },
];

const TitleBar: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, items, vendors, warehouses } = useAppContext();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (event.ctrlKey && event.shiftKey && key === 'p') {
                event.preventDefault();
                setCommandPaletteOpen(true);
            }

            if (key === 'f5' || (event.ctrlKey && key === 'r')) {
                event.preventDefault();
                window.location.reload();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!commandPaletteOpen) {
            setSearchTerm('');
            return;
        }

        let cancelled = false;

        async function loadSearchData() {
            try {
                setIsSearchLoading(true);
                const [prData, rfqData, poData] = await Promise.all([
                    procurementService.getPRs(),
                    procurementService.getRFQs(),
                    procurementService.getPOs(),
                ]);

                if (cancelled) return;
                setPrs(prData);
                setRfqs(rfqData);
                setPos(poData);
            } catch (error) {
                console.error('Error loading command palette data:', error);
            } finally {
                if (!cancelled) setIsSearchLoading(false);
            }
        }

        void loadSearchData();
        return () => { cancelled = true; };
    }, [commandPaletteOpen]);

    const visiblePageCommands = useMemo(
        () => pageCommands.filter((command) => !command.roles || (currentUser && command.roles.includes(currentUser.role))),
        [currentUser],
    );

    const results = useMemo<CommandResult[]>(() => {
        const query = searchTerm.trim().toLowerCase();

        const pageResults = visiblePageCommands.map((command) => ({
            id: command.id,
            title: command.title,
            subtitle: command.subtitle,
            group: 'Pages' as const,
            icon: command.icon,
            path: command.path,
        }));

        const itemResults = items.map((item) => ({
            id: `item-${item.id}`,
            title: `${item.code} - ${item.name}`,
            subtitle: `Item | ${item.category} | ${item.uom}`,
            group: 'Items' as const,
            icon: <Package size={14} />,
            path: '/master/items',
        }));

        const vendorResults = vendors.map((vendor) => ({
            id: `vendor-${vendor.id}`,
            title: vendor.name,
            subtitle: `Vendor | ${vendor.email}`,
            group: 'Vendors' as const,
            icon: <User size={14} />,
            path: '/master/vendors',
        }));

        const warehouseResults = warehouses.map((warehouse) => ({
            id: `warehouse-${warehouse.id}`,
            title: warehouse.name,
            subtitle: `Warehouse | ${warehouse.location}`,
            group: 'Warehouses' as const,
            icon: <Warehouse size={14} />,
            path: '/master/warehouses',
        }));

        const prResults = prs.map((pr) => ({
            id: `pr-${pr.id}`,
            title: pr.prNo,
            subtitle: `PR | ${pr.department} | ${pr.status}`,
            group: 'Purchase Requisitions' as const,
            icon: <ShoppingBag size={14} />,
            path: `/procurement/purchase-requisition/${pr.id}/view`,
        }));

        const rfqResults = rfqs.map((rfq) => ({
            id: `rfq-${rfq.id}`,
            title: rfq.rfqNo,
            subtitle: `RFQ | ${rfq.status} | PR ${rfq.purchaseRequisition?.prNo || rfq.prId}`,
            group: 'RFQs' as const,
            icon: <Send size={14} />,
            path: `/procurement/rfq/${rfq.id}`,
        }));

        const poResults = pos.map((po) => ({
            id: `po-${po.id}`,
            title: po.poNo,
            subtitle: `PO | ${po.status} | ${po.vendor?.name || po.vendorId}`,
            group: 'Purchase Orders' as const,
            icon: <Package size={14} />,
            path: `/procurement/purchase-order/${po.id}`,
        }));

        const combined = [...pageResults, ...itemResults, ...vendorResults, ...warehouseResults, ...prResults, ...rfqResults, ...poResults];
        if (!query) return combined.slice(0, 16);

        return combined
            .filter((result) => `${result.title} ${result.subtitle} ${result.group}`.toLowerCase().includes(query))
            .slice(0, 24);
    }, [items, pos, prs, rfqs, searchTerm, vendors, visiblePageCommands, warehouses]);

    const groupedResults = useMemo(() => {
        const groups = new Map<CommandResult['group'], CommandResult[]>();
        results.forEach((result) => {
            const current = groups.get(result.group) || [];
            current.push(result);
            groups.set(result.group, current);
        });
        return Array.from(groups.entries());
    }, [results]);

    function openResult(path: string) {
        setCommandPaletteOpen(false);
        navigate(path);
    }

    return (
        <div className="h-titlebar bg-vscode-titlebar border-b border-vscode-border flex items-center px-3 gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Building2 size={16} className="text-vscode-accent" />
                <span>ERP Procurement & Inventory</span>
            </div>

            <div className="flex-1 max-w-md">
                <div
                    className="flex items-center gap-2 bg-vscode-input-bg border border-vscode-input-border px-2 py-1 cursor-pointer hover:border-vscode-accent transition-colors"
                    onClick={() => setCommandPaletteOpen(true)}
                >
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search pages, PR, PO, RFQ, item, vendor..."
                        className="bg-transparent border-none outline-none text-xs flex-1 text-vscode-text placeholder-vscode-text-muted"
                        readOnly
                    />
                    <div className="flex items-center gap-1 text-xs text-vscode-text-muted">
                        <Command size={12} />
                        <span>Ctrl+Shift+P</span>
                    </div>
                </div>
            </div>

            <div className="hidden xl:flex items-center gap-2 text-[11px] text-vscode-text-muted">
                <span className="uppercase tracking-wide">Shortcuts</span>
                {shortcuts.map((shortcut) => (
                    <div key={shortcut.keys} className="flex items-center gap-2 border border-vscode-border bg-vscode-sidebar px-2 py-1 rounded-sm">
                        <span className="text-vscode-accent">{shortcut.icon}</span>
                        <span>{shortcut.label}</span>
                        <span className="font-mono text-vscode-text">{shortcut.keys}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-2 text-xs cursor-pointer hover:bg-vscode-hover px-2 py-1 transition-colors">
                    <Building2 size={14} className="text-vscode-text-muted" />
                    <span>Main Warehouse</span>
                </div>

                <div className="flex items-center gap-2 text-xs cursor-pointer hover:bg-vscode-hover px-2 py-1 transition-colors border border-transparent hover:border-vscode-border">
                    <User size={14} className="text-vscode-text-muted" />
                    <span className="font-semibold">{currentUser?.name}</span>
                    <span className="text-vscode-text-muted">({currentUser?.role})</span>
                </div>
            </div>

            {commandPaletteOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
                    onClick={() => setCommandPaletteOpen(false)}
                >
                    <div
                        className="bg-vscode-sidebar border border-vscode-border w-full max-w-3xl rounded-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 border-b border-vscode-border">
                            <input
                                type="text"
                                placeholder="Search pages, PR number, PO number, RFQ, item code, vendor..."
                                className="input-vscode w-full"
                                autoFocus
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[65vh] overflow-auto p-2">
                            {isSearchLoading && (
                                <div className="p-3 text-sm text-vscode-text-muted">Loading searchable data...</div>
                            )}
                            {!isSearchLoading && groupedResults.length === 0 && (
                                <div className="p-3 text-sm text-vscode-text-muted">No results found.</div>
                            )}
                            {!isSearchLoading && groupedResults.map(([group, entries]) => (
                                <div key={group} className="mb-3 last:mb-0">
                                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-vscode-text-muted">{group}</div>
                                    {entries.map((entry) => (
                                        <button
                                            key={entry.id}
                                            className="w-full text-left py-2 px-2 rounded hover:bg-vscode-hover transition-colors flex items-start gap-3"
                                            onClick={() => openResult(entry.path)}
                                        >
                                            <span className="text-vscode-accent mt-0.5">{entry.icon}</span>
                                            <span>
                                                <div className="text-sm text-vscode-text">{entry.title}</div>
                                                <div className="text-xs text-vscode-text-muted">{entry.subtitle}</div>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TitleBar;
