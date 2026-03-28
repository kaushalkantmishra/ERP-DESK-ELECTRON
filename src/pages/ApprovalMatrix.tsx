import React, { useEffect, useState } from 'react';
import { Plus, Save, Shield, Trash2 } from 'lucide-react';
import { systemService } from '../services/systemService';
import { ApprovalMatrixConfig, ApprovalMatrixRule } from '../types/models';

const createEmptyRule = (): ApprovalMatrixRule => ({
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: '',
    document: 'Purchase Order',
    minAmount: 0,
    maxAmount: 0,
    approvers: 1,
    active: true,
});

const ApprovalMatrix: React.FC = () => {
    const [config, setConfig] = useState<ApprovalMatrixConfig>({ simulationMode: false, adminBypass: true, rules: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        void loadApprovalMatrix();
    }, []);

    async function loadApprovalMatrix() {
        try {
            setIsLoading(true);
            const data = await systemService.getApprovalMatrix();
            setConfig(data);
        } catch (error) {
            console.error('Error fetching approval matrix:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function updateRule(id: string, field: keyof ApprovalMatrixRule, value: string | number | boolean) {
        setConfig((current) => ({
            ...current,
            rules: current.rules.map((rule) => rule.id === id ? { ...rule, [field]: value } : rule),
        }));
    }

    function addRule() {
        setConfig((current) => ({
            ...current,
            rules: [...current.rules, createEmptyRule()],
        }));
    }

    function removeRule(id: string) {
        setConfig((current) => ({
            ...current,
            rules: current.rules.filter((rule) => rule.id !== id),
        }));
    }

    async function saveApprovalMatrix() {
        try {
            setIsSaving(true);
            const saved = await systemService.updateApprovalMatrix(config);
            setConfig(saved);
            alert('Approval matrix saved successfully.');
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.message || 'Unable to save approval matrix');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col h-full relative">
            {isLoading && (
                <div className="absolute inset-0 bg-vscode-bg/50 backdrop-blur-sm z-10 flex items-center justify-center text-vscode-text-muted">
                    Loading approval matrix...
                </div>
            )}

            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>Master Data</span>
                <span>/</span>
                <span className="text-vscode-text">Approval Matrix</span>
            </div>

            <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2"><Shield size={16} className="text-vscode-accent" />Approval Workflow Rules</h2>
                <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={addRule}>
                    <Plus size={14} />
                    <span>Add Rule</span>
                </button>
                <button className="btn-primary flex items-center gap-2" onClick={() => void saveApprovalMatrix()} disabled={isSaving}>
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save Matrix'}</span>
                </button>
            </div>

            <div className="p-4 overflow-auto">
                <div className="bg-vscode-sidebar/50 border border-vscode-border rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold mb-3 text-vscode-text-muted">System Policy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={config.simulationMode}
                                onChange={(e) => setConfig((current) => ({ ...current, simulationMode: e.target.checked }))}
                            />
                            <span>Simulation mode</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={config.adminBypass}
                                onChange={(e) => setConfig((current) => ({ ...current, adminBypass: e.target.checked }))}
                            />
                            <span>Allow Admin bypass</span>
                        </label>
                    </div>
                </div>

                <div className="overflow-auto border border-vscode-border rounded-lg">
                    <table className="table-vscode w-full">
                        <thead className="bg-vscode-bg">
                            <tr>
                                <th>Role</th>
                                <th>Document Type</th>
                                <th>Min Amount</th>
                                <th>Max Amount</th>
                                <th>Approvers</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {config.rules.map((rule) => (
                                <tr key={rule.id} className="hover:bg-vscode-list-hover">
                                    <td><input className="input-vscode w-full" value={rule.role} onChange={(e) => updateRule(rule.id, 'role', e.target.value)} /></td>
                                    <td>
                                        <select className="input-vscode w-full" value={rule.document} onChange={(e) => updateRule(rule.id, 'document', e.target.value)}>
                                            <option>Purchase Requisition</option>
                                            <option>Purchase Order</option>
                                            <option>Material Request</option>
                                            <option>Vendor Invoice</option>
                                            <option>Payment</option>
                                        </select>
                                    </td>
                                    <td><input type="number" min="0" className="input-vscode w-28" value={rule.minAmount} onChange={(e) => updateRule(rule.id, 'minAmount', Number(e.target.value) || 0)} /></td>
                                    <td><input type="number" min="0" className="input-vscode w-28" value={rule.maxAmount} onChange={(e) => updateRule(rule.id, 'maxAmount', Number(e.target.value) || 0)} /></td>
                                    <td><input type="number" min="1" className="input-vscode w-24" value={rule.approvers} onChange={(e) => updateRule(rule.id, 'approvers', Number(e.target.value) || 1)} /></td>
                                    <td>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={rule.active} onChange={(e) => updateRule(rule.id, 'active', e.target.checked)} />
                                            <span>{rule.active ? 'Active' : 'Inactive'}</span>
                                        </label>
                                    </td>
                                    <td>
                                        <button className="p-1 rounded hover:bg-vscode-button-secondary text-vscode-text-muted hover:text-red-400" onClick={() => removeRule(rule.id)} title="Delete rule">
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {config.rules.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center p-4 text-vscode-text-muted">No approval rules configured.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ApprovalMatrix;
