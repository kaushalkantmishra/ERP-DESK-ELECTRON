import React, { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { masterService } from '../services/masterService';
import { PurchaseOrder, Vendor } from '../types/models';

const PurchaseOrderList: React.FC = () => {
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [poData, vendorData] = await Promise.all([
                procurementService.getPOs(),
                masterService.getVendors()
            ]);
            setPos(poData);
            setVendors(vendorData);
        } catch (error) {
            console.error('Error fetching POs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">Purchase Order</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <div className="text-sm font-semibold">All Purchase Orders</div>
                <div className="ml-auto">
                    <button className="btn-secondary flex items-center gap-2">
                        <Download size={14} />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="text-vscode-text-muted">Loading...</div>
                    </div>
                )}
                <table className="table-vscode">
                    <thead className="sticky top-0">
                        <tr>
                            <th>PO No</th>
                            <th>Date</th>
                            <th>Vendor</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pos.map((po: any) => {
                            const vendor = vendors.find((v: Vendor) => v.id === po.vendorId);
                            return (
                                <tr key={po.id} className="hover:bg-vscode-hover">
                                    <td className="font-mono text-xs font-semibold">{po.poNo}</td>
                                    <td className="font-mono text-xs">{po.date}</td>
                                    <td>{vendor?.name}</td>
                                    <td className="font-mono">${po.totalAmount.toFixed(2)}</td>
                                    <td><span className="badge badge-info">{po.status}</span></td>
                                    <td>
                                        <button
                                            className="text-vscode-accent hover:text-vscode-accent-hover p-1"
                                            onClick={() => alert(`View PO Details: ${po.poNo}`)}
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {pos.length === 0 && (
                    <div className="text-center p-8 text-vscode-text-muted">
                        No Purchase Orders generated yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderList;
