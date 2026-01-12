import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Tab } from '../../App';

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabClick, onTabClose }) => {
    const navigate = useNavigate();

    const handleTabClick = (tab: Tab) => {
        onTabClick(tab.id);
        navigate(tab.path);
    };

    const handleTabClose = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        onTabClose(tabId);
    };

    return (
        <div className="tab-bar">
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab)}
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
    );
};

export default TabBar;
