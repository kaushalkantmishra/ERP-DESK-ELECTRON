import React, { useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';
import { Vendor } from '../types/models';

const VendorMaster = () => {
    const { vendors, addVendor } = useMockData();
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [newVendor, setNewVendor] = useState<Omit<Vendor, 'id'>>({
        name: '', email: '', phone: '', rating: 3, address: '', taxId: '', contactPerson: '', paymentTerms: '', active: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await addVendor(newVendor);
        setIsSubmitting(false);
        setIsAdding(false);
        setNewVendor({ name: '', email: '', phone: '', rating: 3, address: '', taxId: '', contactPerson: '', paymentTerms: '', active: true });
    };

    const filteredVendors = vendors.filter(v => 
        (v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        v.rating >= minRating
    );

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Master Data</span>
                <span>/</span>
                <span className="text-vscode-text">Vendor Master</span>
            </div>

            {/* Toolbar */}
            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="input-vscode flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select 
                    className="form-select w-32"
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                >
                    <option value="0">All Ratings</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="5">5 Stars</option>
                </select>
                
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn-primary flex items-center gap-2 ml-auto"
                >
                    <Plus size={14} />
                    <span>{isAdding ? 'Cancel' : 'Add Vendor'}</span>
                </button>
            </div>

            {isAdding && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border animate-fade-in-down">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">New Vendor</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newVendor.name}
                                onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                required
                                type="email"
                                className="input-vscode w-full"
                                value={newVendor.email}
                                onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={newVendor.phone}
                                onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax ID / VAT</label>
                            <input
                                type="text"
                                className="input-vscode w-full"
                                value={newVendor.taxId || ''}
                                onChange={e => setNewVendor({ ...newVendor, taxId: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Person</label>
                            <input
                                type="text"
                                className="input-vscode w-full"
                                value={newVendor.contactPerson || ''}
                                onChange={e => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Payment Terms</label>
                            <input
                                type="text"
                                placeholder="e.g. Net 30"
                                className="input-vscode w-full"
                                value={newVendor.paymentTerms || ''}
                                onChange={e => setNewVendor({ ...newVendor, paymentTerms: e.target.value })}
                            />
                        </div>
                        <div className="form-group col-span-2">
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={newVendor.active}
                                    onChange={e => setNewVendor({...newVendor, active: e.target.checked})}
                                />
                                <span className="text-sm">Active Vendor</span>
                            </label>
                        </div>
                        <div className="col-span-2 form-group">
                            <label className="form-label">Address</label>
                            <textarea
                                className="form-textarea w-full"
                                rows={2}
                                value={newVendor.address}
                                onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary py-1 px-3">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary py-1 px-3">
                                {isSubmitting ? 'Saving...' : 'Save Vendor'}
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
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Tax ID</th>
                            <th>Rating</th>
                            <th>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVendors.map(vendor => (
                            <tr key={vendor.id} className="hover:bg-vscode-list-hover group">
                                <td className="w-10 text-center">
                                    <div className={`w-2 h-2 rounded-full mx-auto ${vendor.active ? 'bg-green-500' : 'bg-vscode-text-muted'}`} title={vendor.active ? 'Active' : 'Inactive'}></div>
                                </td>
                                <td className="font-semibold">{vendor.name}</td>
                                <td>
                                    <div>{vendor.contactPerson}</div>
                                    <div className="text-xs text-vscode-text-muted">{vendor.email}</div>
                                </td>
                                <td>{vendor.taxId || '-'}</td>
                                <td>
                                    <div className="flex items-center text-yellow-500 gap-0.5">
                                        <span className="text-sm">{vendor.rating}</span>
                                        <Star size={12} fill="currentColor" />
                                    </div>
                                </td>
                                <td className="text-sm">{vendor.address}</td>
                            </tr>
                        ))}
                         {filteredVendors.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-vscode-text-muted">
                                    No vendors found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredVendors.length} vendors</span>
            </div>
        </div>
    );
};

export default VendorMaster;
