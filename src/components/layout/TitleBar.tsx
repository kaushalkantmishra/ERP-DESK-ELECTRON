import React, { useState } from 'react';
import { Search, Command, User, Building2 } from 'lucide-react';

const TitleBar: React.FC = () => {
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            setCommandPaletteOpen(true);
        }
    };

    return (
        <div
            className="h-titlebar bg-vscode-titlebar border-b border-vscode-border flex items-center px-3 gap-4"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* App Name */}
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Building2 size={16} className="text-vscode-accent" />
                <span>ERP Procurement & Inventory</span>
            </div>

            {/* Global Search / Command Palette */}
            <div className="flex-1 max-w-md">
                <div
                    className="flex items-center gap-2 bg-vscode-input-bg border border-vscode-input-border px-2 py-1 cursor-pointer hover:border-vscode-accent transition-colors"
                    onClick={() => setCommandPaletteOpen(true)}
                >
                    <Search size={14} className="text-vscode-text-muted" />
                    <input
                        type="text"
                        placeholder="Search or run command (Ctrl+Shift+P)"
                        className="bg-transparent border-none outline-none text-xs flex-1 text-vscode-text placeholder-vscode-text-muted"
                        readOnly
                    />
                    <div className="flex items-center gap-1 text-xs text-vscode-text-muted">
                        <Command size={12} />
                        <span>⇧P</span>
                    </div>
                </div>
            </div>

            {/* Right Section - User & Workspace */}
            <div className="flex items-center gap-3 ml-auto">
                {/* Workspace Selector */}
                <div className="flex items-center gap-2 text-xs cursor-pointer hover:bg-vscode-hover px-2 py-1 transition-colors">
                    <Building2 size={14} className="text-vscode-text-muted" />
                    <span>Main Warehouse</span>
                </div>

                {/* User */}
                <div className="flex items-center gap-2 text-xs cursor-pointer hover:bg-vscode-hover px-2 py-1 transition-colors">
                    <User size={14} className="text-vscode-text-muted" />
                    <span>Admin User</span>
                </div>
            </div>

            {/* Command Palette Modal (placeholder) */}
            {commandPaletteOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
                    onClick={() => setCommandPaletteOpen(false)}
                >
                    <div
                        className="bg-vscode-sidebar border border-vscode-border w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-2 border-b border-vscode-border">
                            <input
                                type="text"
                                placeholder="Type a command or search..."
                                className="input-vscode w-full"
                                autoFocus
                            />
                        </div>
                        <div className="p-2 text-sm text-vscode-text-muted">
                            <div className="py-2 px-2 hover:bg-vscode-hover cursor-pointer">New Purchase Requisition</div>
                            <div className="py-2 px-2 hover:bg-vscode-hover cursor-pointer">View Item Master</div>
                            <div className="py-2 px-2 hover:bg-vscode-hover cursor-pointer">Stock Ledger</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TitleBar;
