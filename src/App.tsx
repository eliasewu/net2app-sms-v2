import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ClientsList } from './pages/Clients/ClientsList';
import { AddClient } from './pages/Clients/AddClient';
import { SuppliersList } from './pages/Suppliers/SuppliersList';
import { SupplierForm } from './pages/Suppliers/SupplierForm';
import { TrunksList } from './pages/Routing/TrunksList';
import { RoutesList } from './pages/Routing/RoutesList';
import { RatesList } from './pages/Rates/RatesList';
import { BillingOverview } from './pages/Billing/BillingOverview';
import { SmsLogs } from './pages/Logs/SmsLogs';
import { BindStatus } from './pages/BindStatus';
import { NotificationsList } from './pages/Notifications/NotificationsList';
import { MccMncPage } from './pages/Rates/MccMncPage';
import { CampaignsPage } from './pages/Campaigns/CampaignsPage';
import { UsersPage } from './pages/Users/UsersPage';
import { TranslationsPage } from './pages/Translations/TranslationsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { NotificationSettingsPage } from './pages/Notifications/NotificationSettingsPage';
import { EmailTemplatesPage } from './pages/Notifications/EmailTemplatesPage';
import { SystemSettingsPage } from './pages/System/SystemSettingsPage';
import { InvoicesPage } from './pages/Billing/InvoicesPage';
import { PaymentsPage } from './pages/Billing/PaymentsPage';
import { ApiConnectorsPage } from './pages/Suppliers/ApiConnectorsPage';
import { OttPairingPage } from './pages/Suppliers/OttPairingPage';
import { TestingToolsPage } from './pages/Testing/TestingToolsPage';
import { BulkUploadPage } from './pages/Rates/BulkUploadPage';

function App() {
  const loadAll = useStore(s => s.loadAll);
  void useStore(s => s.initialized); // subscribe to trigger re-render when data loads

  useEffect(() => {
    // On mount, try to sync with backend
    loadAll();
  }, [loadAll]);

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          
          {/* Clients */}
          <Route path="clients" element={<ClientsList />} />
          <Route path="clients/add" element={<AddClient />} />
          <Route path="clients/:id" element={<ClientsList />} />
          <Route path="clients/:id/edit" element={<AddClient />} />
          <Route path="clients/routes" element={<ClientsList />} />
          <Route path="clients/rates" element={<RatesList />} />
          
          {/* Suppliers */}
          <Route path="suppliers" element={<SuppliersList />} />
          <Route path="suppliers/add" element={<SupplierForm />} />
          <Route path="suppliers/:id" element={<SuppliersList />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />
          <Route path="suppliers/rates" element={<RatesList />} />
          <Route path="suppliers/api" element={<ApiConnectorsPage />} />
          <Route path="suppliers/ott" element={<OttPairingPage />} />
          
          {/* Routing */}
          <Route path="routing/trunks" element={<TrunksList />} />
          <Route path="routing/routes" element={<RoutesList />} />
          <Route path="routing/plans" element={<RoutesList />} />
          <Route path="routing/test" element={<RoutesList />} />
          
          {/* Rates */}
          <Route path="rates" element={<RatesList />} />
          <Route path="rates/bulk" element={<BulkUploadPage />} />
          <Route path="rates/mccmnc" element={<MccMncPage />} />
          
          {/* Billing */}
          <Route path="billing" element={<BillingOverview />} />
          <Route path="billing/invoices" element={<InvoicesPage />} />
          <Route path="billing/payments" element={<PaymentsPage />} />
          <Route path="billing/credit" element={<BillingOverview />} />
          
          {/* Logs & Reports */}
          <Route path="logs" element={<SmsLogs />} />
          <Route path="reports/realtime" element={<ReportsPage />} />
          <Route path="reports/hourly" element={<ReportsPage />} />
          <Route path="reports/daily" element={<ReportsPage />} />
          <Route path="reports/monthly" element={<ReportsPage />} />
          
          {/* Campaigns */}
          <Route path="campaigns" element={<CampaignsPage />} />
          
          {/* Bind Status */}
          <Route path="bind-status" element={<BindStatus />} />
          
          {/* Testing */}
          <Route path="testing/sms" element={<TestingToolsPage />} />
          <Route path="testing/smpp" element={<TestingToolsPage />} />
          <Route path="testing/http" element={<TestingToolsPage />} />
          <Route path="testing/tools" element={<TestingToolsPage />} />
          
          {/* Translations */}
          <Route path="translations" element={<TranslationsPage />} />
          
          {/* Notifications */}
          <Route path="notifications" element={<NotificationsList />} />
          <Route path="notifications/settings" element={<NotificationSettingsPage />} />
          <Route path="notifications/templates" element={<EmailTemplatesPage />} />
          
          {/* Users */}
          <Route path="users" element={<UsersPage />} />
          <Route path="users/roles" element={<UsersPage />} />
          
          {/* System */}
          <Route path="system/license" element={<SystemSettingsPage />} />
          <Route path="system/kannel" element={<SystemSettingsPage />} />
          <Route path="system/database" element={<SystemSettingsPage />} />
          <Route path="system/api" element={<SystemSettingsPage />} />
          <Route path="system/backup" element={<SystemSettingsPage />} />
          <Route path="system/settings" element={<SystemSettingsPage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
