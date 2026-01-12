import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import TabBar from './components/layout/TabBar';
import Dashboard from './pages/Dashboard';
import PurchaseRequisitionList from './pages/PurchaseRequisitionList';
import PurchaseRequisitionForm from './pages/PurchaseRequisitionForm';
import ItemMaster from './pages/ItemMaster';

export interface Tab {
    id: string;
    title: string;
    path: string;
    closable: boolean;
}

function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 'dashboard', title: 'Dashboard', path: '/dashboard', closable: false }
    ]);
    const [activeTabId, setActiveTabId] = useState('dashboard');

    const addTab = (tab: Tab) => {
        const existingTab = tabs.find(t => t.id === tab.id);
        if (existingTab) {
            setActiveTabId(tab.id);
        } else {
            setTabs([...tabs, tab]);
            setActiveTabId(tab.id);
        }
    };

    const closeTab = (tabId: string) => {
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);

        if (activeTabId === tabId && newTabs.length > 0) {
            const newActiveIndex = Math.max(0, tabIndex - 1);
            setActiveTabId(newTabs[newActiveIndex].id);
        }
    };

    return (
        <Router>
            <div className="h-screen flex flex-col overflow-hidden">
                {/* Title Bar */}
                <TitleBar />

                {/* Main Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onNavigate={addTab}
                    />

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Tab Bar */}
                        <TabBar
                            tabs={tabs}
                            activeTabId={activeTabId}
                            onTabClick={setActiveTabId}
                            onTabClose={closeTab}
                        />

                        {/* Main Content */}
                        <div className="flex-1 overflow-auto bg-vscode-bg">
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/procurement/purchase-requisition" element={<PurchaseRequisitionList onNewPR={() => addTab({ id: 'new-pr', title: 'New Purchase Requisition', path: '/procurement/purchase-requisition/new', closable: true })} />} />
                                <Route path="/procurement/purchase-requisition/new" element={<PurchaseRequisitionForm />} />
                                <Route path="/procurement/purchase-requisition/:id" element={<PurchaseRequisitionForm />} />
                                <Route path="/inventory/item-master" element={<ItemMaster />} />
                            </Routes>
                        </div>
                    </div>
                </div>
            </div>
        </Router>
    );
}

export default App;
