import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle, AlertOctagon } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';

const StockTransfer = () => {
    const { items, warehouses, stockLevels, createStockTransaction } = useMockData();
    const [sourceWh, setSourceWh] = useState('');
    const [targetWh, setTargetWh] = useState('');
    const [item, setItem] = useState('');
    const [qty, setQty] = useState(0);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (sourceWh === targetWh) {
            setMessage({ type: 'error', text: 'Source and Target warehouses must be different.' });
            return;
        }

        const sourceStock = stockLevels.find(sl => sl.itemId === item && sl.warehouseId === sourceWh);
        if (!sourceStock || sourceStock.quantity < qty) {
            setMessage({ type: 'error', text: 'Insufficient stock in source warehouse.' });
            return;
        }

        createStockTransaction({
            itemId: item,
            type: 'Transfer',
            quantity: qty,
            sourceWarehouseId: sourceWh,
            targetWarehouseId: targetWh,
            notes
        });

        setMessage({ type: 'success', text: 'Stock transfer successful.' });
        setQty(0);
        setNotes('');
    };

    return (
        <div className="flex flex-col h-full p-6">
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
