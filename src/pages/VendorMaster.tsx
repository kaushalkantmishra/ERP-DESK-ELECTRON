import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Star } from 'lucide-react';
import { masterService } from '../services/masterService';
import { Vendor } from '../types/models';

const createEmptyVendor = (): Omit<Vendor, 'id'> => ({
    name: '',
    email: '',
    phone: '',
    rating: 3,
    address: '',
    taxId: '',
    contactPerson: '',
    paymentTerms: '',
    active: true,
});

const VendorMaster = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [panelMode, setPanelMode] = useState<'add' | 'view' | 'edit' | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [formVendor, setFormVendor] = useState<Omit<Vendor, 'id'>>(createEmptyVendor());

    useEffect(() => {
        fetchVendors();
    }, []);

    const isViewMode = panelMode === 'view';
    const isEditMode = panelMode === 'edit';
    const isAddMode = panelMode === 'add';
    const isPanelOpen = panelMode !== null;
    const panelTitle = useMemo(() => {
        if (isAddMode) return 'New Vendor';
        if (isEditMode) return 'Edit Vendor';
        if (isViewMode) return 'Vendor Details';
        return 'Vendor';
    }, [isAddMode, isEditMode, isViewMode]);

    const fetchVendors = async () => {
        try {
            setIsLoading(true);
            const data = await masterService.getVendors();
            setVendors(data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openAddPanel = () => {
        setSelectedVendor(null);
        setFormVendor(createEmptyVendor());
        setPanelMode('add');
    };

    const openViewPanel = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setFormVendor({
            name: vendor.name ?? '',
            email: vendor.email ?? '',
            phone: vendor.phone ?? '',
            rating: vendor.rating ?? 0,
            address: vendor.address ?? '',
            taxId: vendor.taxId ?? '',
            contactPerson: vendor.contactPerson ?? '',
            paymentTerms: vendor.paymentTerms ?? '',
            active: vendor.active,
        });
        setPanelMode('view');
    };

    const openEditPanel = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setFormVendor({
            name: vendor.name ?? '',
            email: vendor.email ?? '',
            phone: vendor.phone ?? '',
            rating: vendor.rating ?? 0,
            address: vendor.address ?? '',
            taxId: vendor.taxId ?? '',
            contactPerson: vendor.contactPerson ?? '',
            paymentTerms: vendor.paymentTerms ?? '',
            active: vendor.active,
        });
        setPanelMode('edit');
    };

    const closePanel = () => {
        setPanelMode(null);
        setSelectedVendor(null);
        setFormVendor(createEmptyVendor());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAddMode && !isEditMode) return;

        setIsSubmitting(true);
        try {
            if (isEditMode && selectedVendor) {
                await masterService.updateVendor(selectedVendor.id, formVendor);
            } else {
                await masterService.addVendor(formVendor);
            }
            await fetchVendors();
            closePanel();
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} vendor:`, error);
        } finally {
            setIsSubmitting(false);
        }
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
                    onClick={() => (isPanelOpen ? closePanel() : openAddPanel())}
                    className="btn-primary flex items-center gap-2 ml-auto"
                >
                    <Plus size={14} />
                    <span>{isPanelOpen ? 'Close Panel' : 'Add Vendor'}</span>
                </button>
            </div>

            {isPanelOpen && (
                <div className="m-4 p-4 bg-vscode-sidebar rounded border border-vscode-border animate-fade-in-down">
                    <h2 className="text-sm font-bold mb-3 text-vscode-text">{panelTitle}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={formVendor.name}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                required
                                type="email"
                                className="input-vscode w-full"
                                value={formVendor.email}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input
                                required
                                type="text"
                                className="input-vscode w-full"
                                value={formVendor.phone}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax ID / VAT</label>
                            <input
                                type="text"
                                className="input-vscode w-full"
                                value={formVendor.taxId || ''}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, taxId: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Person</label>
                            <input
                                type="text"
                                className="input-vscode w-full"
                                value={formVendor.contactPerson || ''}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, contactPerson: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Payment Terms</label>
                            <input
                                type="text"
                                placeholder="e.g. Net 30"
                                className="input-vscode w-full"
                                value={formVendor.paymentTerms || ''}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, paymentTerms: e.target.value })}
                            />
                        </div>
                        <div className="form-group col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formVendor.active}
                                    disabled={isViewMode}
                                    onChange={e => setFormVendor({ ...formVendor, active: e.target.checked })}
                                />
                                <span className="text-sm">Active Vendor</span>
                            </label>
                        </div>
                        <div className="col-span-2 form-group">
                            <label className="form-label">Address</label>
                            <textarea
                                className="form-textarea w-full"
                                rows={2}
                                value={formVendor.address}
                                readOnly={isViewMode}
                                onChange={e => setFormVendor({ ...formVendor, address: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                            {isViewMode ? (
                                <button type="button" onClick={closePanel} className="btn-secondary py-1 px-3">Close</button>
                            ) : (
                                <>
                                    <button type="button" onClick={closePanel} className="btn-secondary py-1 px-3">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="btn-primary py-1 px-3">
                                        {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Vendor' : 'Save Vendor')}
                                    </button>
                                </>
                            )}
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
                            <th>Email</th>
                            <th>Tax ID</th>
                            <th>Rating</th>
                            <th>Location</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={8} className="p-4 text-center text-vscode-text-muted">Loading vendors...</td></tr>
                        ) : filteredVendors.map(vendor => (
                            <tr key={vendor.id} className="hover:bg-vscode-list-hover group">
                                <td className="w-10 text-center">
                                    <div className={`w-2 h-2 rounded-full mx-auto ${vendor.active ? 'bg-green-500' : 'bg-vscode-text-muted'}`} title={vendor.active ? 'Active' : 'Inactive'}></div>
                                </td>
                                <td className="font-semibold">{vendor.name}</td>
                                <td>
                                    <div>{vendor.contactPerson || '-'}</div>
                                    <div className="text-xs text-vscode-text-muted">{vendor.phone || '-'}</div>
                                </td>
                                <td>{vendor.email || '-'}</td>
                                <td>{vendor.taxId || '-'}</td>
                                <td>
                                    <div className="flex items-center text-yellow-500 gap-0.5">
                                        <span className="text-sm">{vendor.rating}</span>
                                        <Star size={12} fill="currentColor" />
                                    </div>
                                </td>
                                <td className="text-sm">{vendor.address || '-'}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openViewPanel(vendor)}
                                            className="p-1 rounded hover:bg-vscode-button-secondary text-vscode-text-muted hover:text-vscode-text"
                                            title="View vendor"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditPanel(vendor)}
                                            className="p-1 rounded hover:bg-vscode-button-secondary text-vscode-text-muted hover:text-vscode-text"
                                            title="Edit vendor"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && filteredVendors.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-vscode-text-muted">
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
