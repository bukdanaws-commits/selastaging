'use client';

import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { DashboardOverview } from './DashboardOverview';
import { EventsPage } from './EventsPage';
import { UsersPage } from './UsersPage';
import { OrdersPage } from './OrdersPage';
import { VerificationsPage } from './VerificationsPage';
import { TicketsPage } from './TicketsPage';
import { CrewGatesPage } from './CrewGatesPage';
import { GateMonitoringPage } from './GateMonitoringPage';
import { AnalyticsPage } from './AnalyticsPage';
import { SettingsPage } from './SettingsPage';

type AdminPage = 
  | 'overview'
  | 'events'
  | 'users'
  | 'orders'
  | 'verifications'
  | 'tickets'
  | 'crew-gates'
  | 'gate-monitoring'
  | 'analytics'
  | 'settings';

interface AdminDashboardProps {
  onExit: () => void;
}

export function AdminDashboard({ onExit }: AdminDashboardProps) {
  const [activePage, setActivePage] = useState<AdminPage>('overview');

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <DashboardOverview />;
      case 'events':
        return <EventsPage />;
      case 'users':
        return <UsersPage />;
      case 'orders':
        return <OrdersPage />;
      case 'verifications':
        return <VerificationsPage />;
      case 'tickets':
        return <TicketsPage />;
      case 'crew-gates':
        return <CrewGatesPage />;
      case 'gate-monitoring':
        return <GateMonitoringPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <AdminLayout onExit={onExit}>
      {renderPage()}
    </AdminLayout>
  );
}
