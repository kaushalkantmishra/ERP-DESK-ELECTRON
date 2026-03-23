import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { masterService } from '../services/masterService';
import { Item, StockLevel, Warehouse } from '../types/models';

const StockManagement: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterItem, setFilterItem] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null);
    const [adjQty, setAdjQty] = useState(0);
    const [adjReason, setAdjReason] = useState('');

    useEffect(() => { void fetchData(); }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [itemData, whData, stockData] = await Promise.all([
                masterService.getItems(),
                masterService.getWarehouses(),
                inventoryService.getStockLevels(),
            ]);
            setItems(itemData);
            setWarehouses(whData);
            setStockLevels(stockData);
        } catch (error) {
            console.error('Error fetching stock data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAdjustment(e: React.FormEvent) {
        e.preventDefault();
        if (!adjustingStock || adjQty === 0 || !adjReason.trim()) return;

        try {
            await inventoryService.createStockTransaction({
                itemId: adjustingStock.itemId,
                warehouseId: adjustingStock.warehouseId,
                type: adjQty > 0 ? 'Adjustment+' : 'Adjustment-',
                quantity: Math.abs(adjQty),
                referenceType: 'Adjustment',
                referenceId: `MANUAL-${Date.now()}`,
                notes: adjReason,
                idempotencyKey: `stock-adjust-${adjustingStock.itemId}-${adjustingStock.warehouseId}-${Date.now()}`,
            });
            await fetchData();
            setAdjustingStock(null);
            setAdjQty(0);
            setAdjReason('');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to adjust stock');
        }
    }

    const getItemForLevel = (level: StockLevel) => level.item || items.find((entry) => String(entry.id) === String(level.itemId));
    const getWarehouseForLevel = (level: StockLevel) => level.warehouse || warehouses.find((entry) => String(entry.id) === String(level.warehouseId));

    const filteredLevels = stockLevels.filter((level) => {
        const item = getItemForLevel(level);
        const warehouse = getWarehouseForLevel(level);
        const itemNameMatch = item ? `${item.code} ${item.name}`.toLowerCase().includes(filterItem.toLowerCase()) : true;
        const warehouseMatch = filterWarehouse ? String(warehouse?.id || level.warehouseId) === filterWarehouse : true;
        return itemNameMatch && warehouseMatch;
    });

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="text-vscode-text-muted">Updating inventory...</div></div>}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span className="text-vscode-text">Stock Management</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input type="text" placeholder="Search item" className="input-vscode flex-1" value={filterItem} onChange={(e) => setFilterItem(e.target.value)} />
                </div>
                <select className="input-vscode pl-2 pr-8 min-w-[12rem]" value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
                    <option value="">All Warehouses</option>
                    {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Item Code</th>
                            <th>Item Name</th>
                            <th>Warehouse</th>
                            <th>Current Qty</th>
                            <th>Reorder</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLevels.map((level, index) => {
                            const item = getItemForLevel(level);
                            const warehouse = getWarehouseForLevel(level);
                            const low = Number(level.quantity) <= Number(level.minStockLevel || item?.reorderLevel || 0);
                            return (
                                <tr key={`${level.itemId}-${level.warehouseId}-${index}`}>
                                    <td className="font-mono text-xs font-semibold">{item?.code || '-'}</td>
                                    <td>{item?.name || '-'}</td>
                                    <td>{warehouse?.name || warehouse?.code || '-'}</td>
                                    <td className={`font-mono ${low ? 'text-status-error' : 'text-status-success'}`}>{Number(level.quantity).toFixed(2)} {item?.uom || ''}</td>
                                    <td>{Number(level.minStockLevel || item?.reorderLevel || 0).toFixed(2)}</td>
                                    <td><button className="text-vscode-accent hover:underline text-xs" onClick={() => setAdjustingStock(level)}>Adjust</button></td>
                                </tr>
                            );
                        })}
                        {!isLoading && filteredLevels.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-vscode-text-muted">No stock records found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {adjustingStock && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-vscode-bg border border-vscode-border p-6 rounded shadow-lg w-96">
                        <h2 className="text-lg font-bold text-vscode-text mb-4">Adjust Stock</h2>
                        <form onSubmit={handleAdjustment}>
                            <div className="mb-4 text-sm text-vscode-text-muted bg-vscode-sidebar p-2 rounded">
                                Current stock: {adjustingStock.quantity}
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Adjustment Quantity (+/-)</label>
                                <input type="number" className="input-vscode w-full" value={adjQty} onChange={(e) => setAdjQty(Number(e.target.value))} required />
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Reason</label>
                                <input type="text" className="input-vscode w-full" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} required />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className="btn-secondary" onClick={() => setAdjustingStock(null)}>Cancel</button>
                                <button type="submit" className="btn-primary">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
