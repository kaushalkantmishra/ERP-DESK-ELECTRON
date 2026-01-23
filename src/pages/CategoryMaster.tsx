import React, { useState } from 'react';
import { Search, Plus, Tag } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';

const CategoryMaster = () => {
    const { categories, addCategory } = useMockData();
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [uom, setUom] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addCategory({ name, description, uom });
        setIsAdding(false);
        setName('');
        setDescription('');
        setUom('');
    };

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Master Data</span>
                <span>/</span>
                <span className="text-vscode-text">Categories</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <Tag size={16} className="text-vscode-accent" />
                    Category Master
                </h2>
                <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search categories..."
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
                    <span>{isAdding ? 'Cancel' : 'Add Category'}</span>
                </button>
            </div>

            {isAdding && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">Add New Category</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Category Name</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                className="input-vscode w-full"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Default UOM</label>
                            <input
                                type="text"
                                placeholder="e.g. PCS, KG"
                                className="input-vscode w-full"
                                value={uom}
                                onChange={e => setUom(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <button type="submit" className="btn-primary">Save Category</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Category Name</th>
                            <th>Description</th>
                            <th>UOM</th>
                            <th>ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.map(cat => (
                            <tr key={cat.id} className="hover:bg-vscode-list-hover">
                                <td className="font-semibold text-vscode-text">{cat.name}</td>
                                <td className="text-vscode-text-muted">{cat.description}</td>
                                <td className="text-vscode-text-muted">{cat.uom || '-'}</td>
                                <td className="font-mono text-xs text-vscode-text-muted">{cat.id}</td>
                            </tr>
                        ))}
                        {filteredCategories.length === 0 && (
                            <tr><td colSpan={3} className="p-4 text-center text-vscode-text-muted">No categories found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredCategories.length} categories</span>
            </div>
        </div>
    );
};

export default CategoryMaster;
