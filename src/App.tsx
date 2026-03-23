import { useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import TabBar from './components/layout/TabBar';
import Dashboard from './pages/Dashboard';
import PurchaseRequisitionList from './pages/PurchaseRequisitionList';
import PurchaseRequisitionForm from './pages/PurchaseRequisitionForm';
import ItemMaster from './pages/ItemMaster';
import RFQManager from './pages/RFQManager';
import Quotations from './pages/Quotations';
import PurchaseOrderList from './pages/PurchaseOrderList';
import GoodsReceipt from './pages/GoodsReceipt';
import Settings from './pages/Settings';
import CategoryMaster from './pages/CategoryMaster';
import WarehouseMaster from './pages/WarehouseMaster';
import StockManagement from './pages/StockManagement';
import StockTransfer from './pages/StockTransfer';
import MaterialIssue from './pages/MaterialIssue';
import VendorInvoice from './pages/VendorInvoice';
import VendorInvoiceView from './pages/VendorInvoiceView';
import VendorMaster from './pages/VendorMaster';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import UomMaster from './pages/UomMaster';
import ApprovalMatrix from './pages/ApprovalMatrix';
import Payments from './pages/Payments';

export interface Tab {
  id: string;
  title: string;
  path: string;
  closable: boolean;
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'dashboard', title: 'Dashboard', path: '/dashboard', closable: false }]);
  const [activeTabId, setActiveTabId] = useState('dashboard');

  const addTab = (tab: Tab) => {
    const existingTab = tabs.find((entry) => entry.id === tab.id);
    if (existingTab) {
      setActiveTabId(tab.id);
      return;
    }
    setTabs([...tabs, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex((entry) => entry.id === tabId);
    const newTabs = tabs.filter((entry) => entry.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.max(0, tabIndex - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

  return (
    <AppProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="h-screen flex flex-col overflow-hidden">
                    <TitleBar />
                    <div className="flex flex-1 overflow-hidden">
                      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onNavigate={addTab} />
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <TabBar tabs={tabs} activeTabId={activeTabId} onTabClick={setActiveTabId} onTabClose={closeTab} />
                        <div className="flex-1 overflow-auto bg-vscode-bg">
                          <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/procurement/purchase-requisition" element={<PurchaseRequisitionList onNewPR={() => addTab({ id: 'new-pr', title: 'New Purchase Requisition', path: '/procurement/purchase-requisition/new', closable: true })} />} />
                            <Route path="/procurement/purchase-requisition/new" element={<PurchaseRequisitionForm />} />
                            <Route path="/procurement/purchase-requisition/:id" element={<PurchaseRequisitionForm />} />
                            <Route path="/procurement/rfq" element={<RFQManager />} />
                            <Route path="/procurement/quotations" element={<Quotations />} />
                            <Route path="/procurement/purchase-order" element={<PurchaseOrderList />} />
                            <Route path="/procurement/grn" element={<GoodsReceipt />} />
                            <Route path="/procurement/vendors" element={<VendorMaster />} />
                            <Route path="/inventory/item-master" element={<ItemMaster />} />
                            <Route path="/master/items" element={<ItemMaster />} />
                            <Route path="/master/categories" element={<CategoryMaster />} />
                            <Route path="/master/uom" element={<UomMaster />} />
                            <Route path="/master/warehouses" element={<WarehouseMaster />} />
                            <Route path="/master/vendors" element={<VendorMaster />} />
                            <Route path="/master/approvals" element={<ApprovalMatrix />} />
                            <Route path="/inventory/warehouses" element={<WarehouseMaster />} />
                            <Route path="/inventory/stock-management" element={<StockManagement />} />
                            <Route path="/inventory/transfer" element={<StockTransfer />} />
                            <Route path="/inventory/issue" element={<MaterialIssue />} />
                            <Route path="/inventory/grn" element={<GoodsReceipt />} />
                            <Route path="/finance/invoices" element={<VendorInvoice />} />
                            <Route path="/finance/invoices/:id" element={<VendorInvoiceView />} />
                            <Route path="/finance/payments" element={<Payments />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/audit-log" element={<AuditLog />} />
                            <Route path="/settings" element={<Settings />} />
                          </Routes>
                        </div>
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </AppProvider>
  );
}

export default App;
