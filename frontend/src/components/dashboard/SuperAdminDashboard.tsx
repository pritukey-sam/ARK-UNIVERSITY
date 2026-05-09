'use client';
import React from 'react';
import SADashboardPage from './sa/SADashboard';
import SACompaniesPage from './sa/SACompanies';
import SAAnalyticsPage from './sa/SAAnalytics';
import SALogsPage from './sa/SALogs';

interface Props {
 page: 'dashboard' | 'companies' | 'analytics' | 'logs';
}

export default function SuperAdminDashboard({ page }: Props) {
 if (page === 'companies') return <SACompaniesPage />;
 if (page === 'analytics') return <SAAnalyticsPage />;
 if (page === 'logs') return <SALogsPage />;
 return <SADashboardPage />;
}
