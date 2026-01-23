import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { Item } from '../types/models';

const ItemMaster: React.FC = () => {
    const { items, addItem, stockLevels } = useMockData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    // New Item State
    const [newItem, setNewItem] = useState<Omit<Item, 'id'>>({
        code: '', name: '', category: '', uom: '', price: 0
    });

    const filteredItems = items.filter(item =>
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addItem(newItem);
        setIsAdding(false);
        setNewItem({ code: '', name: '', category: '', uom: '', price: 0 });
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
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border">
                    <h2 className="text-sm font-bold mb-3">Add New Item</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-vscode">Item Code</label>
                            <input 
                                required
                                className="input-vscode w-full" 
                                value={newItem.code}
                                onChange={e => setNewItem({...newItem, code: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="label-vscode">Item Name</label>
                            <input 
                                required
                                className="input-vscode w-full" 
                                value={newItem.name}
                                onChange={e => setNewItem({...newItem, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="label-vscode">Category</label>
                            <input 
                                required
                                className="input-vscode w-full" 
                                value={newItem.category}
                                onChange={e => setNewItem({...newItem, category: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="label-vscode">UOM</label>
                            <input 
                                required
                                className="input-vscode w-full" 
                                value={newItem.uom}
                                onChange={e => setNewItem({...newItem, uom: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="label-vscode">Standard Price</label>
                            <input 
                                type="number"
                                required
                                className="input-vscode w-full" 
                                value={newItem.price}
                                onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                            />
                        </div>
                        <div className="col-span-2">
                            <button type="submit" className="btn-primary py-1 px-3">Save Item</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Item Code</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>UOM</th>
                            <th>Current Stock (All Warehouses)</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((item) => (
                            <tr key={item.id} className="hover:bg-vscode-list-hover">
                                <td className="font-mono text-xs font-semibold text-vscode-accent">{item.code}</td>
                                <td>{item.name}</td>
                                <td>{item.category}</td>
                                <td className="font-mono text-xs">{item.uom}</td>
                                <td className="font-mono font-bold">{getTotalStock(item.id)}</td>
                                <td className="font-mono text-xs">${item.price}</td>
                            </tr>
                        ))}
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
