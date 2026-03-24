import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Tab } from '../../App';

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onCloseAllTabs: () => void;
}

interface ContextMenuState {
    x: number;
    y: number;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabClick, onTabClose, onCloseAllTabs }) => {
    const navigate = useNavigate();
    const tabBarRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    useEffect(() => {
        if (!contextMenu) return;

        const handleCloseMenu = () => setContextMenu(null);
        const handlePointerDownOutside = (event: MouseEvent) => {
            if (contextMenuRef.current?.contains(event.target as Node)) return;
            handleCloseMenu();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleCloseMenu();
            }
        };

        window.addEventListener('mousedown', handlePointerDownOutside);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleCloseMenu);
        window.addEventListener('blur', handleCloseMenu);

        return () => {
            window.removeEventListener('mousedown', handlePointerDownOutside);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleCloseMenu);
            window.removeEventListener('blur', handleCloseMenu);
        };
    }, [contextMenu]);

    const handleTabClick = (tab: Tab) => {
        setContextMenu(null);
        onTabClick(tab.id);
        navigate(tab.path);
    };

    const handleTabClose = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        setContextMenu(null);
        onTabClose(tabId);
    };

    const handleTabContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
        });
    };

    const handleCloseAllTabs = () => {
        setContextMenu(null);
        onCloseAllTabs();
        navigate('/dashboard');
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const container = tabBarRef.current;

        if (!container || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
            return;
        }

        setContextMenu(null);
        e.preventDefault();
        container.scrollLeft += e.deltaY;
    };

    const hasClosableTabs = tabs.some((tab) => tab.closable);

    return (
        <div className="relative">
            <div
                ref={tabBarRef}
                className="tab-bar"
                onWheel={handleWheel}
            >
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab)}
                        onContextMenu={handleTabContextMenu}
                    >
                        <span className="text-sm">{tab.title}</span>
                        {tab.closable && (
                            <button
                                onClick={(e) => handleTabClose(e, tab.id)}
                                className="hover:bg-vscode-active p-0.5 rounded transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="tab-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y, position: 'fixed' }}
                >
                    <button
                        type="button"
                        className="tab-context-menu-item"
                        onClick={handleCloseAllTabs}
                        disabled={!hasClosableTabs}
                    >
                        Close All Tabs
                    </button>
                </div>
            )}
        </div>
    );
};

export default TabBar;
