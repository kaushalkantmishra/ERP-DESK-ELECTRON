import React, { useState } from 'react';
import { Plus, Search, Warehouse as WarehouseIcon } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { Warehouse } from '../types/models';

const WarehouseMaster = () => {
    const { warehouses, addWarehouse } = useMockData();
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newWarehouse, setNewWarehouse] = useState<Omit<Warehouse, 'id'>>({
        code: '', name: '', location: '', managerId: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await addWarehouse(newWarehouse);
        setIsSubmitting(false);
        setIsAdding(false);
        setNewWarehouse({ code: '', name: '', location: '', managerId: '' });
    };

    const filteredWarehouses = warehouses.filter(wh => 
        wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        wh.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wh.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Inventory</span>
                <span>/</span>
                <span className="text-vscode-text">Warehouse Master</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search warehouses..."
                        className="input-vscode flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn-primary flex items-center gap-2 ml-auto"
                >
                    <Plus size={14} />
                    <span>{isAdding ? 'Cancel' : 'Add Warehouse'}</span>
                </button>
            </div>

            {isAdding && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border animate-fade-in-down">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">New Warehouse</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Warehouse Code</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newWarehouse.code}
                                onChange={e => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                                placeholder="e.g. WH-01"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Warehouse Name</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newWarehouse.name}
                                onChange={e => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location / Address</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newWarehouse.location}
                                onChange={e => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Manager ID (Optional)</label>
                            <input
                                type="text"
                                className="input-vscode w-full"
                                value={newWarehouse.managerId || ''}
                                onChange={e => setNewWarehouse({ ...newWarehouse, managerId: e.target.value })}
                            />
                        </div>
                        
                        <div className="col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary py-1 px-3">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary py-1 px-3">
                                {isSubmitting ? 'Saving...' : 'Save Warehouse'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg z-10">
                        <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Manager</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredWarehouses.map(wh => (
                            <tr key={wh.id} className="hover:bg-vscode-list-hover group">
                                <td className="font-mono text-xs font-semibold text-vscode-accent">{wh.code || '-'}</td>
                                <td className="font-semibold flex items-center gap-2">
                                    <WarehouseIcon size={14} className="text-vscode-text-muted" />
                                    {wh.name}
                                </td>
                                <td>{wh.location}</td>
                                <td>{wh.managerId || '-'}</td>
                            </tr>
                        ))}
                         {filteredWarehouses.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-vscode-text-muted">No warehouses found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredWarehouses.length} warehouses</span>
            </div>
        </div>
    );
};

export default WarehouseMaster;
