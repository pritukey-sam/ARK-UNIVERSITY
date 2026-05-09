'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

function Guard({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 const router = useRouter();
 useEffect(() => {
 if (!loading && (!user || user.role !== 'super_admin')) router.push('/login');
 }, [user, loading, router]);
 if (loading || !user || user.role !== 'super_admin') {
 return <div className="min-h-screen bg-[#080810] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7C3AED]" /></div>;
 }
 return <>{children}</>;
}

export default function CompaniesPage() {
 return <Guard><SuperAdminDashboard page="companies" /></Guard>;
}
