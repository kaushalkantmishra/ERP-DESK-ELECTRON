import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, FileText, Scale, Upload, X } from 'lucide-react';
import { masterService } from '../services/masterService';
import { procurementService } from '../services/procurementService';
import { Item, Quotation, RFQ, Vendor } from '../types/models';

const Quotations: React.FC = () => {
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [masterItems, setMasterItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);
    const [compareQuoteIds, setCompareQuoteIds] = useState<string[]>([]);
    const [viewQuote, setViewQuote] = useState<Quotation | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => { void fetchData(); }, []);

    async function fetchData() {
        try {
            setIsLoading(true);
            const [rfqData, vendorData, quoteData, itemData] = await Promise.all([
                procurementService.getRFQs(),
                masterService.getVendors(),
                procurementService.getQuotes(),
                masterService.getItems(),
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
    }

    const itemMap = useMemo(() => new Map(masterItems.map((item) => [String(item.id), item])), [masterItems]);
    const selectedRFQ = rfqs.find((rfq) => String(rfq.id) === selectedRFQId);
    const rfqQuotes = quotes.filter((quote) => String(quote.rfqId) === selectedRFQId);
    const comparisonQuotes = useMemo(
        () => rfqQuotes.filter((quote) => compareQuoteIds.includes(String(quote.id))),
        [compareQuoteIds, rfqQuotes],
    );
    const compareRows = useMemo(() => {
        const rowMap = new Map<string, {
            itemId: string;
            itemCode: string;
            itemName: string;
            requestedQty: number;
            uom: string;
            prices: Record<string, number | null>;
        }>();

        comparisonQuotes.forEach((quote) => {
            (quote.quotationItems || []).forEach((line) => {
                const item = itemMap.get(String(line.itemId));
                const key = String(line.itemId);
                const current = rowMap.get(key) || {
                    itemId: key,
                    itemCode: item?.code || key,
                    itemName: item?.name || `Item ${key}`,
                    requestedQty: Number(line.qty || 0),
                    uom: item?.uom || '',
                    prices: {},
                };

                current.requestedQty = Math.max(current.requestedQty, Number(line.qty || 0));
                current.prices[String(quote.id)] = Number(line.unitPrice);
                rowMap.set(key, current);
            });
        });

        return Array.from(rowMap.values());
    }, [comparisonQuotes, itemMap]);

    useEffect(() => {
        setCompareQuoteIds([]);
        setViewQuote(null);
    }, [selectedRFQId]);

    function toggleCompareQuote(quoteId: string) {
        setCompareQuoteIds((current) => current.includes(quoteId)
            ? current.filter((id) => id !== quoteId)
            : [...current, quoteId].slice(-2));
    }

    async function handleCreatePO(quote: Quotation) {
        try {
            setIsLoading(true);
            await procurementService.createPO({
                quotationId: quote.id,
                prId: quote.rfq?.purchaseRequisition?.id || quote.rfq?.prId,
                vendorId: quote.vendorId,
                rfqId: quote.rfqId,
                deliveryDate: quote.deliveryDate,
                items: (quote.quotationItems || []).map((line) => ({
                    itemId: line.itemId,
                    orderedQty: line.qty,
                    unitPrice: line.unitPrice,
                })),
            });
            await fetchData();
            alert('Purchase order created from quotation.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to create PO');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleImportQuote(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsLoading(true);
            const importedQuote = await procurementService.importQuote(file);
            await fetchData();
            setSelectedRFQId(String(importedQuote.rfqId));
            alert('Quotation imported successfully.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to import quotation file');
        } finally {
            event.target.value = '';
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2"><span>Procurement</span><span>/</span><span className="text-vscode-text">Quotations</span></div>
            <div className="flex-1 overflow-hidden flex">
                <div className="w-64 border-r border-vscode-border bg-vscode-sidebar flex flex-col">
                    <div className="p-3 border-b border-vscode-border font-semibold text-xs uppercase text-vscode-text-muted">Open RFQs</div>
                    <div className="flex-1 overflow-auto">
                        {rfqs.map((rfq) => (
                            <div key={rfq.id} className={`p-3 border-b border-vscode-border cursor-pointer hover:bg-vscode-hover ${selectedRFQId === String(rfq.id) ? 'bg-vscode-active border-l-2 border-l-vscode-accent' : ''}`} onClick={() => setSelectedRFQId(String(rfq.id))}>
                                <div className="font-semibold text-sm mb-1">{rfq.rfqNo}</div>
                                <div className="text-xs text-vscode-text-muted">Due: {rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : '-'}</div>
                                <div className="text-xs text-vscode-text-muted mt-1">{rfq.vendorIds?.length || 0} vendors invited</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 relative">
                    {isLoading && <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="text-vscode-text-muted">Loading...</div></div>}
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="text-sm text-vscode-text-muted">
                            {selectedRFQ ? `Import filled vendor quotation files for ${selectedRFQ.rfqNo}.` : 'Select an RFQ to compare or import quotations.'}
                        </div>
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                onChange={(event) => void handleImportQuote(event)}
                            />
                            <button
                                type="button"
                                disabled={!selectedRFQ || isLoading}
                                onClick={() => fileInputRef.current?.click()}
                                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload size={14} />
                                <span>Import Quote</span>
                            </button>
                        </div>
                    </div>
                    {selectedRFQ ? (
                        rfqQuotes.length > 0 ? (
                            <div className="space-y-4">
                                <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Scale size={15} className="text-vscode-accent" />
                                        <div className="font-semibold">Quotation Comparison</div>
                                    </div>
                                    <div className="text-xs text-vscode-text-muted mb-3">
                                        Select any 2 vendor quotations below to compare line prices side by side.
                                    </div>
                                    {comparisonQuotes.length >= 2 ? (
                                        <div className="overflow-auto">
                                            <table className="table-vscode text-xs">
                                                <thead>
                                                    <tr>
                                                        <th>Item</th>
                                                        <th>Qty</th>
                                                        {comparisonQuotes.map((quote) => (
                                                            <th key={quote.id}>
                                                                <div>{quote.vendor?.name || vendors.find((entry) => String(entry.id) === String(quote.vendorId))?.name || quote.vendorId}</div>
                                                                <div className="text-[11px] text-vscode-text-muted font-normal">
                                                                    {quote.status} | ${Number(quote.totalAmount).toFixed(2)}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {compareRows.map((row) => {
                                                        const availablePrices = comparisonQuotes
                                                            .map((quote) => row.prices[String(quote.id)])
                                                            .filter((price): price is number => price !== null && price !== undefined);
                                                        const lowestPrice = availablePrices.length ? Math.min(...availablePrices) : null;

                                                        return (
                                                            <tr key={row.itemId}>
                                                                <td>{row.itemCode} - {row.itemName}{row.uom ? ` (${row.uom})` : ''}</td>
                                                                <td className="font-mono">{row.requestedQty.toFixed(2)}</td>
                                                                {comparisonQuotes.map((quote) => {
                                                                    const price = row.prices[String(quote.id)];
                                                                    const isLowest = lowestPrice !== null && price === lowestPrice;
                                                                    return (
                                                                        <td key={`${row.itemId}-${quote.id}`} className={isLowest ? 'text-status-success font-semibold' : ''}>
                                                                            {price === null || price === undefined ? '-' : `$${price.toFixed(2)}`}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="rounded border border-dashed border-vscode-border p-4 text-sm text-vscode-text-muted">
                                            Choose at least 2 quotations to see comparison values.
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {rfqQuotes.map((quote) => {
                                        const vendor = vendors.find((entry) => String(entry.id) === String(quote.vendorId));
                                        return (
                                            <div key={quote.id} className="bg-vscode-sidebar border border-vscode-border p-4 hover:border-vscode-accent transition-colors rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="font-semibold">{vendor?.name}</div>
                                                    {quote.status === 'Accepted' && <Check size={16} className="text-status-success" />}
                                                </div>
                                                <div className="space-y-2 text-sm mb-4">
                                                    <div className="flex justify-between"><span className="text-vscode-text-muted">Total Amount:</span><span className="font-mono font-bold">${Number(quote.totalAmount).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="text-vscode-text-muted">Delivery:</span><span>{quote.deliveryDate ? new Date(quote.deliveryDate).toLocaleDateString() : '-'}</span></div>
                                                    <div className="flex justify-between"><span className="text-vscode-text-muted">Rating:</span><span>{vendor?.rating || 0}</span></div>
                                                </div>
                                                <div className="border-t border-vscode-border pt-3">
                                                    <table className="w-full text-xs text-left mb-3">
                                                        <thead>
                                                            <tr className="text-vscode-text-muted"><th>Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Variance</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {(quote.quotationItems || []).map((line, index) => (
                                                                <tr key={index}>
                                                                    <td>{itemMap.get(String(line.itemId))?.name || line.itemId}</td>
                                                                    <td className="text-right">{Number(line.qty).toFixed(2)}</td>
                                                                    <td className="text-right">${Number(line.unitPrice).toFixed(2)}</td>
                                                                    <td className={`text-right ${Math.abs(Number(line.priceVariancePct || 0)) > 5 ? 'text-status-warning font-semibold' : 'text-vscode-text-muted'}`}>{Number(line.priceVariancePct || 0).toFixed(2)}%</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <button
                                                            className={`flex-1 flex items-center justify-center gap-2 ${compareQuoteIds.includes(String(quote.id)) ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => toggleCompareQuote(String(quote.id))}
                                                        >
                                                            <Scale size={14} />
                                                            <span>{compareQuoteIds.includes(String(quote.id)) ? 'Selected' : 'Compare'}</span>
                                                        </button>
                                                        <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={() => setViewQuote(quote)}>
                                                            <Eye size={14} />
                                                            <span>View</span>
                                                        </button>
                                                        {quote.status === 'Pending' && <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={() => void handleCreatePO(quote)}><Check size={14} /><span>Create PO</span></button>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-vscode-text-muted mt-10"><FileText size={48} className="mx-auto mb-2 opacity-20" /><p>No quotations received yet.</p></div>
                        )
                    ) : (
                        <div className="flex items-center justify-center h-full text-vscode-text-muted">Select an RFQ to compare quotes</div>
                    )}
                </div>
            </div>
            {viewQuote && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl bg-vscode-sidebar border border-vscode-border rounded-lg shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-vscode-border">
                            <div>
                                <div className="font-semibold text-vscode-text">{viewQuote.vendor?.name || vendors.find((entry) => String(entry.id) === String(viewQuote.vendorId))?.name || viewQuote.vendorId}</div>
                                <div className="text-xs text-vscode-text-muted">Quotation #{viewQuote.id} for {selectedRFQ?.rfqNo}</div>
                            </div>
                            <button className="btn-secondary p-2" onClick={() => setViewQuote(null)} title="Close quotation view">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[80vh] overflow-auto">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs">Status</div>
                                    <div className="font-semibold">{viewQuote.status}</div>
                                </div>
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs">Total</div>
                                    <div className="font-semibold font-mono">${Number(viewQuote.totalAmount).toFixed(2)}</div>
                                </div>
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs">Delivery</div>
                                    <div className="font-semibold">{viewQuote.deliveryDate ? new Date(viewQuote.deliveryDate).toLocaleDateString() : '-'}</div>
                                </div>
                                <div className="bg-vscode-bg border border-vscode-border rounded p-3">
                                    <div className="text-vscode-text-muted text-xs">Submitted</div>
                                    <div className="font-semibold">{viewQuote.submittedDate ? new Date(viewQuote.submittedDate).toLocaleDateString() : '-'}</div>
                                </div>
                            </div>
                            <div className="overflow-auto">
                                <table className="table-vscode">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>UOM</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                            <th>Tax %</th>
                                            <th>Total</th>
                                            <th>Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(viewQuote.quotationItems || []).map((line, index) => {
                                            const item = itemMap.get(String(line.itemId));
                                            return (
                                                <tr key={index}>
                                                    <td>{item?.code || line.itemId} - {item?.name || 'Item'}</td>
                                                    <td>{item?.uom || '-'}</td>
                                                    <td>{Number(line.qty).toFixed(2)}</td>
                                                    <td>${Number(line.unitPrice).toFixed(2)}</td>
                                                    <td>{Number(line.taxRate || 0).toFixed(2)}%</td>
                                                    <td>${Number(line.totalAmount || 0).toFixed(2)}</td>
                                                    <td>{Number(line.priceVariancePct || 0).toFixed(2)}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quotations;

