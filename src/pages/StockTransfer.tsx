import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle, AlertOctagon } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { masterService } from '../services/masterService';
import { Item, Warehouse, StockLevel } from '../types/models';

const StockTransfer = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sourceWh, setSourceWh] = useState('');
    const [targetWh, setTargetWh] = useState('');
    const [item, setItem] = useState('');
    const [qty, setQty] = useState(0);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const selectedSourceStock = stockLevels.find(
        (level) => String(level.itemId) === item && String(level.warehouseId) === sourceWh,
    );
    const availableSourceQty = Number(selectedSourceStock?.availableQty ?? selectedSourceStock?.quantity ?? 0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [itemData, whData, stockData] = await Promise.all([
                masterService.getItems(),
                masterService.getWarehouses(),
                inventoryService.getStockLevels()
            ]);
            setItems(itemData);
            setWarehouses(whData);
            setStockLevels(stockData);
        } catch (error) {
            console.error('Error fetching transfer data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (sourceWh === targetWh) {
            setMessage({ type: 'error', text: 'Source and Target warehouses must be different.' });
            return;
        }

        if (!item || !sourceWh || !targetWh || qty <= 0) {
            setMessage({ type: 'error', text: 'Select both warehouses, an item, and a valid quantity.' });
            return;
        }

        if (!selectedSourceStock) {
            setMessage({ type: 'error', text: 'Selected item has no stock record in the source warehouse.' });
            return;
        }

        if (availableSourceQty < qty) {
            setMessage({ type: 'error', text: `Insufficient stock in source warehouse. Available: ${availableSourceQty.toFixed(2)}.` });
            return;
        }

        try {
            setIsLoading(true);
            await inventoryService.createStockTransaction({
                itemId: item,
                type: 'Transfer',
                quantity: qty,
                sourceWarehouseId: sourceWh,
                targetWarehouseId: targetWh,
                referenceType: 'Stock Transfer',
                referenceId: `TRF-${Date.now()}`,
                notes,
                idempotencyKey: `stock-transfer-${item}-${sourceWh}-${targetWh}-${Date.now()}`,
            });

            await fetchData();
            setMessage({ type: 'success', text: 'Stock transfer successful.' });
            setItem('');
            setQty(0);
            setNotes('');
        } catch (error) {
            console.error('Error executing transfer:', error);
            const apiMessage = (error as any)?.response?.data?.message;
            setMessage({ type: 'error', text: apiMessage || 'Failed to execute transfer.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full p-6 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="text-vscode-text-muted">Transferring Stock...</div>
                </div>
            )}
            {/* Breadcrumb - absolute to top left of area or just general header */}
            <div className="w-full mb-8">
                <div className="text-xs text-vscode-text-muted mb-2 flex items-center gap-2">
                    <span>Inventory</span>
                    <span>/</span>
                    <span className="text-vscode-text">Stock Transfer</span>
                </div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <ArrowLeftRight className="text-vscode-accent" />
                    Inter-Warehouse Transfer
                </h1>
                <p className="text-vscode-text-muted text-sm mt-1">Move inventory between warehouse locations.</p>
            </div>

            <div className="w-full bg-vscode-sidebar p-8 rounded-lg border border-vscode-border shadow-sm">
                {message && (
                    <div className={`p-4 mb-6 rounded flex items-center gap-3 ${message.type === 'error' ? 'bg-status-error bg-opacity-10 text-status-error border border-status-error' : 'bg-status-success bg-opacity-10 text-status-success border border-status-success'}`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
                        <span>{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="form-group">
                            <label className="form-label">Source Warehouse</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={sourceWh}
                                onChange={e => setSourceWh(e.target.value)}
                            >
                                <option value="">Select Source</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Target Warehouse</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={targetWh}
                                onChange={e => setTargetWh(e.target.value)}
                            >
                                <option value="">Select Target</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="col-span-2 form-group">
                            <label className="form-label">Item</label>
                            <select
                                required
                                className="input-vscode w-full"
                                value={item}
                                onChange={e => setItem(e.target.value)}
                            >
                                <option value="">Select Item</option>
                                {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input
                                required
                                type="number"
                                min="1"
                                className="input-vscode w-full"
                                value={qty}
                                onChange={e => setQty(Number(e.target.value))}
                            />
                            <div className="mt-2 text-xs text-vscode-text-muted">
                                Available in source: {availableSourceQty.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-textarea w-full"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Optional transfer remarks..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-base"
                    >
                        <ArrowLeftRight size={18} />
                        Execute Transfer
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StockTransfer;
