import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Box, PackageSearch, Warehouse as WarehouseIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { masterService } from '../services/masterService';
import { inventoryService } from '../services/inventoryService';
import { Item, StockLevel, Warehouse } from '../types/models';

const ItemView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [item, setItem] = useState<Item | null>(null);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        void loadItemData(id);
    }, [id]);

    async function loadItemData(itemId: string) {
        try {
            setIsLoading(true);
            const [items, warehouseData, stockData] = await Promise.all([
                masterService.getItems(),
                masterService.getWarehouses(),
                inventoryService.getStockLevels(),
            ]);

            setItem(items.find((entry) => String(entry.id) === String(itemId)) || null);
            setWarehouses(warehouseData);
            setStockLevels(stockData.filter((level) => String(level.itemId) === String(itemId)));
        } catch (error) {
            console.error('Error loading item view:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const stockByWarehouse = useMemo(() => {
        return stockLevels.map((level) => {
            const warehouse = level.warehouse || warehouses.find((entry) => String(entry.id) === String(level.warehouseId));
            const quantity = Number(level.quantity || 0);
            const reservedQty = Number(level.reservedQty || 0);
            const availableQty = Number(level.availableQty ?? (quantity - reservedQty));

            return {
                key: `${level.itemId}-${level.warehouseId}`,
                warehouseName: warehouse?.name || `Warehouse ${level.warehouseId}`,
                warehouseCode: warehouse?.code || '-',
                location: warehouse?.location || '-',
                quantity,
                reservedQty,
                availableQty,
            };
        });
    }, [stockLevels, warehouses]);

    const totals = useMemo(() => {
        return stockByWarehouse.reduce((summary, row) => ({
            quantity: summary.quantity + row.quantity,
            reservedQty: summary.reservedQty + row.reservedQty,
            availableQty: summary.availableQty + row.availableQty,
        }), { quantity: 0, reservedQty: 0, availableQty: 0 });
    }, [stockByWarehouse]);

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading item details...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span>Item Master</span>
                <span>/</span>
                <span className="text-vscode-text">{item?.code || 'View'}</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <PackageSearch size={16} className="text-vscode-accent" />
                    Item View
                </h2>
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={() => navigate('/inventory/item-master')}>
                    <ArrowLeft size={14} />
                    <span>Back</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {item && (
                    <>
                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-vscode-text">{item.code} - {item.name}</h3>
                                    <div className="text-sm text-vscode-text-muted">Category: {item.category || '-'}</div>
                                    <div className="text-sm text-vscode-text-muted">UOM: {item.uom || '-'}</div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div><span className={`badge ${item.active ? 'badge-success' : 'badge-error'}`}>{item.active ? 'Active' : 'Inactive'}</span></div>
                                    <div className="font-mono text-vscode-text">Price: ${Number(item.price || 0).toFixed(2)}</div>
                                    <div className="text-sm text-vscode-text-muted">Tax: {Number(item.taxRate || 0).toFixed(2)}%</div>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-3 text-vscode-text">
                                    <Box size={16} className="text-vscode-accent" />
                                    <span className="text-sm font-semibold">Total Stock</span>
                                </div>
                                <div className="font-mono text-2xl text-vscode-text">{totals.quantity.toFixed(2)}</div>
                            </div>
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-3 text-vscode-text">
                                    <WarehouseIcon size={16} className="text-vscode-accent" />
                                    <span className="text-sm font-semibold">Available Stock</span>
                                </div>
                                <div className="font-mono text-2xl text-vscode-text">{totals.availableQty.toFixed(2)}</div>
                            </div>
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="text-sm font-semibold text-vscode-text mb-3">Reserved</div>
                                <div className="font-mono text-2xl text-vscode-text">{totals.reservedQty.toFixed(2)}</div>
                            </div>
                            <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                                <div className="text-sm font-semibold text-vscode-text mb-3">Reorder Level</div>
                                <div className="font-mono text-2xl text-vscode-text">{Number(item.reorderLevel || 0).toFixed(2)}</div>
                            </div>
                        </section>

                        <section className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-vscode-text">Warehouse Availability</h3>
                                <p className="text-xs text-vscode-text-muted">Warehouse-wise stock position for this item.</p>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Warehouse</th>
                                            <th>Code</th>
                                            <th>Location</th>
                                            <th>Total Qty</th>
                                            <th>Reserved Qty</th>
                                            <th>Available Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockByWarehouse.map((row) => (
                                            <tr key={row.key}>
                                                <td>{row.warehouseName}</td>
                                                <td className="font-mono text-xs">{row.warehouseCode}</td>
                                                <td>{row.location}</td>
                                                <td className="font-mono">{row.quantity.toFixed(2)}</td>
                                                <td className="font-mono">{row.reservedQty.toFixed(2)}</td>
                                                <td className="font-mono">{row.availableQty.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {stockByWarehouse.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-4 text-center text-vscode-text-muted">No warehouse stock found for this item.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                {!isLoading && !item && (
                    <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-6 text-vscode-text-muted">
                        Item not found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemView;
