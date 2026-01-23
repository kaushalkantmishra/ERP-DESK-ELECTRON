import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { StockLevel } from '../types/models';

const StockManagement = () => {
    const { items, warehouses, stockLevels, createStockTransaction } = useMockData();
    const [filterItem, setFilterItem] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');

    // Adjustment Modal State
    const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null);
    const [adjQty, setAdjQty] = useState(0);
    const [adjReason, setAdjReason] = useState('');

    const handleAdjustment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustingStock) return;

        createStockTransaction({
            itemId: adjustingStock.itemId,
            type: 'Adjustment',
            quantity: adjQty, // Quantity to ADD (negative to subtract)
            sourceWarehouseId: adjustingStock.warehouseId, // Warehouse being adjusted
            notes: adjReason
        });

        setAdjustingStock(null);
        setAdjQty(0);
        setAdjReason('');
    };

    const filteredLevels = stockLevels.filter(sl => {
        const item = items.find(i => i.id === sl.itemId);
        const itemNameMatch = item?.name.toLowerCase().includes(filterItem.toLowerCase());
        const whMatch = filterWarehouse ? sl.warehouseId === filterWarehouse : true;
        return itemNameMatch && whMatch;
    });

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span className="text-vscode-text">Stock Management</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search Item..."
                        className="input-vscode flex-1"
                        value={filterItem}
                        onChange={e => setFilterItem(e.target.value)}
                    />
                </div>
                <select
                    className="input-vscode pl-2 pr-4 bg-transparent"
                    value={filterWarehouse}
                    onChange={e => setFilterWarehouse(e.target.value)}
                >
                    <option value="">All Warehouses</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            {/* Stock List */}
            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Item Code</th>
                            <th>Item Name</th>
                            <th>Warehouse</th>
                            <th>Current Qty</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLevels.map((sl, idx) => {
                            const item = items.find(i => i.id === sl.itemId);
                            const wh = warehouses.find(w => w.id === sl.warehouseId);
                            return (
                                <tr key={idx} className="hover:bg-vscode-list-hover">
                                    <td className="font-mono text-xs font-semibold">{item?.code}</td>
                                    <td>{item?.name}</td>
                                    <td className="text-vscode-text-muted">{wh?.name}</td>
                                    <td className={`font-mono text-right font-bold ${sl.quantity < sl.minStockLevel ? 'text-status-error' : 'text-status-success'}`}>
                                        {sl.quantity} <span className="text-[10px] text-vscode-text-muted font-normal">{item?.uom}</span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setAdjustingStock(sl)}
                                            className="text-vscode-accent hover:underline text-xs"
                                        >
                                            Adjust
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredLevels.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-vscode-text-muted">No stock records found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

             <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredLevels.length} records</span>
            </div>

            {/* Adjustment Modal */}
            {adjustingStock && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-vscode-bg border border-vscode-border p-6 rounded shadow-lg w-96">
                        <h2 className="text-lg font-bold text-vscode-text mb-4">Adjust Stock</h2>
                        <div className="mb-4 text-sm text-vscode-text-muted bg-vscode-sidebar p-2 rounded">
                            Item: <span className="text-vscode-text font-semibold">{items.find(i => i.id === adjustingStock.itemId)?.name}</span> <br/>
                            Warehouse: <span className="text-vscode-text font-semibold">{warehouses.find(w => w.id === adjustingStock.warehouseId)?.name}</span> <br/>
                            Current: <span className="text-vscode-text font-mono">{adjustingStock.quantity}</span>
                        </div>
                        
                        <form onSubmit={handleAdjustment}>
                            <div className="mb-4 form-group">
                                <label className="form-label">Adjustment Quantity (+/-)</label>
                                <input
                                    type="number"
                                    className="input-vscode w-full"
                                    value={adjQty}
                                    onChange={e => setAdjQty(Number(e.target.value))}
                                    required
                                />
                                <span className="text-xs text-vscode-text-muted">Negative to reduce, Positive to add.</span>
                            </div>
                            <div className="mb-4 form-group">
                                <label className="form-label">Reason</label>
                                <input
                                    type="text"
                                    className="input-vscode w-full"
                                    value={adjReason}
                                    onChange={e => setAdjReason(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAdjustingStock(null)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
