import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { masterService } from '../services/masterService';
import { inventoryService } from '../services/inventoryService';
import { Item, Category, Uom, StockLevel } from '../types/models';

const ItemMaster: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [uoms, setUoms] = useState<Uom[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Item State (Frontend-friendly)
    const [newItem, setNewItem] = useState<{
        code: string;
        name: string;
        categoryId: string;
        uomId: string;
        price: number;
        active: boolean;
        taxRate: number;
        reorderLevel: number;
    }>({
        code: '', name: '', categoryId: '', uomId: '', price: 0,
        active: true, taxRate: 0, reorderLevel: 10
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [itemData, catData, uomData, stockData] = await Promise.all([
                masterService.getItems(),
                masterService.getCategories(),
                masterService.getUoms(),
                inventoryService.getStockLevels()
            ]);
            setItems(itemData);
            setCategories(catData);
            setUoms(uomData);
            setStockLevels(stockData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await masterService.addItem(newItem as any); // Backend expects IDs
            await fetchData();
            setIsAdding(false);
            setNewItem({ code: '', name: '', categoryId: '', uomId: '', price: 0, active: true, taxRate: 0, reorderLevel: 10 });
        } catch (error) {
            console.error('Error adding item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTotalStock = (itemId: string) => {
        return stockLevels
            .filter(sl => sl.itemId === itemId)
            .reduce((sum, sl) => sum + sl.quantity, 0);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>Inventory</span>
                    <span>/</span>
                    <span className="text-vscode-text">Item Master</span>
                </div>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="input-vscode flex-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn-primary flex items-center gap-2 ml-auto"
                >
                    <Plus size={14} />
                    <span>{isAdding ? 'Cancel' : 'Add Item'}</span>
                </button>
            </div>

            {isAdding && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border animate-fade-in-down">
                    <h2 className="text-sm font-bold mb-3">Add New Item</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="label-vscode">Item Code</label>
                            <input
                                required
                                className="input-vscode w-full"
                                value={newItem.code}
                                onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                                placeholder="e.g. LAP-001"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="label-vscode">Item Name</label>
                            <input
                                required
                                className="input-vscode w-full"
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                placeholder="Product Name"
                            />
                        </div>
                        <div>
                            <label className="label-vscode">Category</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={newItem.categoryId}
                                onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-vscode">UOM</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={newItem.uomId}
                                onChange={e => setNewItem({ ...newItem, uomId: e.target.value })}
                            >
                                <option value="">Select UOM</option>
                                {uoms.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-vscode">Standard Price ($)</label>
                            <input
                                type="number"
                                required
                                className="input-vscode w-full"
                                value={newItem.price}
                                onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label-vscode">Tax Rate (%)</label>
                            <input
                                type="number"
                                className="input-vscode w-full"
                                value={newItem.taxRate}
                                onChange={e => setNewItem({ ...newItem, taxRate: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="label-vscode">Reorder Level</label>
                            <input
                                type="number"
                                className="input-vscode w-full"
                                value={newItem.reorderLevel}
                                onChange={e => setNewItem({ ...newItem, reorderLevel: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={newItem.active}
                                    onChange={e => setNewItem({ ...newItem, active: e.target.checked })}
                                />
                                <span className="text-sm">Active Configuration</span>
                            </label>
                        </div>

                        <div className="col-span-2 lg:col-span-4 flex justify-end gap-2 mt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary py-1 px-3">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary py-1 px-3">
                                {isSubmitting ? 'Saving...' : 'Save Item'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg z-10">
                        <tr>
                            <th>Status</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>UOM</th>
                            <th>Stock</th>
                            <th>Price</th>
                            <th>Reorder Lvl</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={8} className="p-4 text-center text-vscode-text-muted">Loading items...</td></tr>
                        ) : filteredItems.map((item) => (
                            <tr key={item.id} className="hover:bg-vscode-list-hover group">
                                <td className="w-10 text-center">
                                    <div className={`w-2 h-2 rounded-full mx-auto ${item.active ? 'bg-green-500' : 'bg-vscode-text-muted'}`} title={item.active ? 'Active' : 'Inactive'}></div>
                                </td>
                                <td className="font-mono text-xs font-semibold text-vscode-accent">{item.code}</td>
                                <td className="font-medium">{item.name}</td>
                                <td>{item.category}</td>
                                <td className="font-mono text-xs">{item.uom}</td>
                                <td className="font-mono font-bold">{getTotalStock(item.id)}</td>
                                <td className="font-mono text-xs">${item.price?.toFixed(2)}</td>
                                <td className="font-mono text-xs text-vscode-text-muted">{item.reorderLevel || '-'}</td>
                            </tr>
                        ))}
                        {!isLoading && filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-vscode-text-muted">
                                    No items found. Add a new item to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredItems.length} items found</span>
            </div>
        </div>
    );
};

export default ItemMaster;
