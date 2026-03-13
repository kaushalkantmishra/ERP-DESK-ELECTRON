import React, { useState, useEffect } from 'react';
import { Check, FileText } from 'lucide-react';
import { procurementService } from '../services/procurementService';
import { masterService } from '../services/masterService';
import { RFQ, Vendor, Quotation, Item } from '../types/models';

const Quotations: React.FC = () => {
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [masterItems, setMasterItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [rfqData, vendorData, quoteData, itemData] = await Promise.all([
                procurementService.getRFQs(),
                masterService.getVendors(),
                procurementService.getQuotes(),
                masterService.getItems()
            ]);
            setRfqs(rfqData);
            setVendors(vendorData);
            setQuotes(quoteData);
            setMasterItems(itemData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedRFQ = rfqs.find(r => r.id === selectedRFQId);

    // Get quotes for selected RFQ
    const rfqQuotes = quotes.filter(q => q.rfqId === selectedRFQId);

    const handleCreatePO = async (quote: Quotation) => {
        try {
            setIsLoading(true);
            await procurementService.createPO({
                vendorId: quote.vendorId,
                rfqId: quote.rfqId,
                quotationId: quote.id,
                date: new Date().toISOString(),
                totalAmount: quote.totalAmount,
                status: 'Open',
                items: quote.quotationItems.map(qi => ({
                    itemId: qi.itemId,
                    quantity: qi.quantity,
                    unitPrice: qi.unitPrice
                }))
            });
            await procurementService.updateQuoteStatus(quote.id, 'Accepted');
            await fetchData();
            alert('Purchase Order Created Successfully!');
        } catch (error) {
            console.error('Error creating PO:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Procurement</span>
                <span>/</span>
                <span className="text-vscode-text">Quotations</span>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* List of Open RFQs */}
                <div className="w-64 border-r border-vscode-border bg-vscode-sidebar flex flex-col">
                    <div className="p-3 border-b border-vscode-border font-semibold text-xs uppercase text-vscode-text-muted">
                        Open RFQs
                    </div>
                    <div className="flex-1 overflow-auto">
                        {rfqs.length === 0 ? (
                            <div className="p-4 text-xs text-vscode-text-muted">No Open RFQs. Create one from Purchase Requisitions.</div>
                        ) : (
                            rfqs.map(rfq => (
                                <div
                                    key={rfq.id}
                                    className={`p-3 border-b border-vscode-border cursor-pointer hover:bg-vscode-hover ${selectedRFQId === rfq.id ? 'bg-vscode-active border-l-2 border-l-vscode-accent' : ''}`}
                                    onClick={() => setSelectedRFQId(rfq.id)}
                                >
                                    <div className="font-semibold text-sm mb-1">{rfq.rfqNo}</div>
                                    <div className="text-xs text-vscode-text-muted">Due: {rfq.dueDate}</div>
                                    <div className="text-xs text-vscode-text-muted mt-1">{rfq.vendorIds.length} Vendors Invited</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Comparison View */}
                <div className="flex-1 overflow-auto p-4 relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="text-vscode-text-muted">Loading...</div>
                        </div>
                    )}
                    {selectedRFQ ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Quote Comparison - {selectedRFQ.rfqNo}</h2>
                            </div>

                            {rfqQuotes.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {rfqQuotes.map(quote => {
                                        const vendor = vendors.find(v => v.id === quote.vendorId);
                                        return (
                                            <div key={quote.id} className="bg-vscode-sidebar border border-vscode-border p-4 hover:border-vscode-accent transition-colors">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="font-semibold">{vendor?.name}</div>
                                                    {quote.status === 'Accepted' && <Check size={16} className="text-status-success" />}
                                                </div>

                                                <div className="space-y-2 text-sm mb-4">
                                                    <div className="flex justify-between">
                                                        <span className="text-vscode-text-muted">Total Amount:</span>
                                                        <span className="font-mono font-bold">${quote.totalAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-vscode-text-muted">Delivery:</span>
                                                        <span>{quote.deliveryDate}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-vscode-text-muted">Rating:</span>
                                                        <span>★ {vendor?.rating}</span>
                                                    </div>
                                                </div>

                                                <div className="border-t border-vscode-border pt-3">
                                                    <table className="w-full text-xs text-left mb-3">
                                                        <thead>
                                                            <tr className="text-vscode-text-muted">
                                                                <th>Item</th>
                                                                <th className="text-right">Qty</th>
                                                                <th className="text-right">Price</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {quote.quotationItems?.map((item: any, i: number) => (
                                                                <tr key={i}>
                                                                    <td>
                                                                        {masterItems.find((m: any) => m.id === item.itemId)?.name || item.itemId}
                                                                        <span className="text-vscode-text-muted ml-1">({masterItems.find((m: any) => m.id === item.itemId)?.code})</span>
                                                                    </td>
                                                                    <td className="text-right">{item.quantity}</td>
                                                                    <td className="text-right">${item.unitPrice}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {quote.status === 'Pending' && (
                                                        <button
                                                            className="btn-primary w-full flex items-center justify-center gap-2"
                                                            onClick={() => handleCreatePO(quote)}
                                                        >
                                                            <Check size={14} />
                                                            <span>Approve & Create PO</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-vscode-text-muted mt-10">
                                    <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                    <p>No quotations received yet.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-vscode-text-muted">
                            Select an RFQ to compare quotes
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Quotations;
