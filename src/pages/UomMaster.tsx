import React, { useState } from 'react';
import { Search, Plus, Scale } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { Uom } from '../types/models';

const UomMaster = () => {
    const { uoms, addUom } = useMockData();
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newUom, setNewUom] = useState<Omit<Uom, 'id'>>({
        code: '', name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await addUom(newUom);
        setIsSubmitting(false);
        setIsAdding(false);
        setNewUom({ code: '', name: '' });
    };

    const filteredUoms = uoms.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Master Data</span>
                <span>/</span>
                <span className="text-vscode-text">Unit of Measure</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <Scale size={16} className="text-vscode-accent" />
                    UoM Master
                </h2>
                <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search units..."
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
                    <span>{isAdding ? 'Cancel' : 'Add Unit'}</span>
                </button>
            </div>

            {isAdding && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border animate-fade-in-down w-full max-w-lg">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">New Unit of Measure</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Unit Code</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newUom.code}
                                onChange={e => setNewUom({ ...newUom, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. PCS"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Unit Name</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newUom.name}
                                onChange={e => setNewUom({ ...newUom, name: e.target.value })}
                                placeholder="e.g. Pieces"
                            />
                        </div>
                        
                        <div className="col-span-2 flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary py-1 px-3">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary py-1 px-3">
                                {isSubmitting ? 'Saving...' : 'Save Unit'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto p-4">
                <table className="table-vscode w-full max-w-2xl">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th className="w-32">Code</th>
                            <th>Name</th>
                            <th className="w-48">ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUoms.map(uom => (
                            <tr key={uom.id} className="hover:bg-vscode-list-hover">
                                <td className="font-mono text-xs font-semibold text-vscode-accent">{uom.code}</td>
                                <td>{uom.name}</td>
                                <td className="font-mono text-xs text-vscode-text-muted">{uom.id}</td>
                            </tr>
                        ))}
                        {filteredUoms.length === 0 && (
                             <tr><td colSpan={3} className="p-4 text-center text-vscode-text-muted">No units found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredUoms.length} units</span>
            </div>
        </div>
    );
};

export default UomMaster;
