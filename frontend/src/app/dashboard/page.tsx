'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import HRDashboard from '@/components/dashboard/HRDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

export default function DashboardPage() {
 const { user, loading } = useAuth();
 const router = useRouter();

 useEffect(() => {
 if (!loading && !user) {
 router.replace('/login');
 }
 }, [user, loading, router]);

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="w-8 h-8 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 if (!user) return null;

 const renderDashboard = () => {
 switch (user.role) {
 case 'admin':
 return <AdminDashboard />;
 case 'hr':
 return <HRDashboard />;
 case 'employee':
 return <EmployeeDashboard />;
 default:
 return <div>Unauthorized</div>;
 }
 };

 return <>{renderDashboard()}</>;
}
