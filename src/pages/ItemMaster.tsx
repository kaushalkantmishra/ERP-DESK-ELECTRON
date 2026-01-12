import React, { useState } from 'react';
import { Search, Download } from 'lucide-react';

const ItemMaster: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRow, setSelectedRow] = useState<number | null>(null);

    const items = [
        { itemCode: 'ITM-001', itemName: 'Laptop - Dell Latitude 5420', category: 'Electronics', uom: 'PCS', currentStock: 15, reorderLevel: 5 },
        { itemCode: 'ITM-002', itemName: 'Mouse - Logitech M185', category: 'Accessories', uom: 'PCS', currentStock: 45, reorderLevel: 10 },
        { itemCode: 'ITM-003', itemName: 'Keyboard - Logitech K380', category: 'Accessories', uom: 'PCS', currentStock: 32, reorderLevel: 10 },
        { itemCode: 'ITM-004', itemName: 'Monitor - Dell 24" LED', category: 'Electronics', uom: 'PCS', currentStock: 8, reorderLevel: 5 },
        { itemCode: 'ITM-005', itemName: 'USB Cable - Type C', category: 'Cables', uom: 'PCS', currentStock: 120, reorderLevel: 50 },
        { itemCode: 'ITM-006', itemName: 'Printer - HP LaserJet Pro', category: 'Electronics', uom: 'PCS', currentStock: 3, reorderLevel: 2 },
        { itemCode: 'ITM-007', itemName: 'Paper - A4 Ream', category: 'Stationery', uom: 'REAM', currentStock: 85, reorderLevel: 20 },
    ];

    const filteredItems = items.filter(item =>
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span className="text-vscode-text">Item Master</span>
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

                <button className="btn-secondary flex items-center gap-2 ml-auto">
                    <Download size={14} />
                    <span>Export</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0">
                        <tr>
                            <th>Item Code</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>UOM</th>
                            <th>Current Stock</th>
                            <th>Reorder Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((item, index) => (
                            <tr
                                key={item.itemCode}
                                className={selectedRow === index ? 'active' : ''}
                                onClick={() => setSelectedRow(index)}
                            >
                                <td className="font-mono text-xs font-semibold">{item.itemCode}</td>
                                <td>{item.itemName}</td>
                                <td>{item.category}</td>
                                <td className="font-mono text-xs">{item.uom}</td>
                                <td className={`font-mono ${item.currentStock <= item.reorderLevel ? 'text-status-error font-semibold' : ''}`}>
                                    {item.currentStock}
                                </td>
                                <td className="font-mono text-xs">{item.reorderLevel}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted flex items-center gap-4">
                <span>{filteredItems.length} items</span>
                {selectedRow !== null && <span>Row {selectedRow + 1} selected</span>}
            </div>
        </div>
    );
};

export default ItemMaster;
