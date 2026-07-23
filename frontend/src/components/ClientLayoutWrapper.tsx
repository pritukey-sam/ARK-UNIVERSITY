'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import Layout from './Layout';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const router = useRouter();
 const { user, loading } = useAuth();

 // Pages that do NOT require authentication
 const publicPrefixes = ['/login', '/register', '/payment', '/forgot-password', '/reset-password'];
 const isLanding = pathname === '/';
 const isPublicPage = isLanding || publicPrefixes.some(p => pathname.startsWith(p));
 
 // Pages that should NOT have the global sidebar/header
 const noLayoutPrefixes = ['/login', '/register', '/payment', '/first-login-setup', '/forgot-password', '/reset-password'];
 const isNoLayout = isLanding || noLayoutPrefixes.some(p => pathname.startsWith(p));
 
 useEffect(() => {
   if (loading) return;

   if (user) {
     // First login setup redirect
     if (user.is_first_login && pathname !== '/first-login-setup') {
       router.replace('/first-login-setup');
       return;
     }
   } else {
     // Unauthenticated user on a protected page → redirect to login
     if (!isPublicPage) {
       router.replace('/login');
       return;
     }
   }
 }, [user, loading, pathname, router, isPublicPage]);

 if (loading) {
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="w-8 h-8 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin" />
     </div>
   );
 }

 // While redirecting, don't render protected content
 if (!user && !isPublicPage) {
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="w-8 h-8 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin" />
     </div>
   );
 }

 if (isNoLayout) {
   return <>{children}</>;
 }

 return <Layout>{children}</Layout>;
}
