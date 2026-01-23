import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useMockData } from '../contexts/MockContext';

const AuditLog = () => {
    const { logs } = useMockData();
    const [filterModule, setFilterModule] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log => {
        const matchesModule = filterModule ? log.module === filterModule : true;
        const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              log.userName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesModule && matchesSearch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="text-xs text-vscode-text-muted px-4 pt-3 pb-2 flex items-center gap-2">
                <span>System</span>
                <span>/</span>
                <span className="text-vscode-text">Audit Logs</span>
            </div>

            {/* Toolbar */}
             <div className="px-4 pb-3 flex items-center gap-3 border-b border-vscode-border">
                <h2 className="font-semibold text-vscode-text flex items-center gap-2">
                    <ShieldCheck size={16} className="text-vscode-accent" />
                    Security Audit
                </h2>
                <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="input-vscode flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="input-vscode bg-vscode-input-bg"
                    value={filterModule}
                    onChange={e => setFilterModule(e.target.value)}
                >
                    <option value="">All Modules</option>
                    <option value="Auth">Auth & Roles</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Finance">Finance</option>
                    <option value="System">System</option>
                </select>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="table-vscode">
                    <thead className="sticky top-0 bg-vscode-bg">
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Module</th>
                            <th>Action</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-vscode-list-hover font-mono text-xs">
                                <td className="text-vscode-text-muted whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="text-vscode-text">{log.userName}</td>
                                <td>
                                    <span className={`badge 
                                        ${log.module === 'Auth' ? 'bg-purple-900 bg-opacity-30 text-purple-300' :
                                          log.module === 'Procurement' ? 'bg-blue-900 bg-opacity-30 text-blue-300' :
                                          log.module === 'Inventory' ? 'bg-orange-900 bg-opacity-30 text-orange-300' :
                                          log.module === 'Finance' ? 'bg-green-900 bg-opacity-30 text-green-300' : 'bg-gray-700 bg-opacity-30 text-gray-300'}`}>
                                        {log.module}
                                    </span>
                                </td>
                                <td className="font-semibold text-vscode-text">{log.action}</td>
                                <td className="text-vscode-text-muted">{log.description}</td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-vscode-text-muted">No logs found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="px-4 py-1.5 border-t border-vscode-border bg-vscode-sidebar text-xs text-vscode-text-muted">
                <span>{filteredLogs.length} events logged</span>
            </div>
        </div>
    );
};

export default AuditLog;
