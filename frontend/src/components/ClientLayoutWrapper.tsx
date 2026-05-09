'use client';

import { usePathname } from 'next/navigation';
import Layout from './Layout';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 
 // Pages that should NOT have the global sidebar/header
 const noLayoutPrefixes = ['/login', '/register', '/payment'];
 const isLanding = pathname === '/';
 const isNoLayout = isLanding || noLayoutPrefixes.some(p => pathname.startsWith(p));

 if (isNoLayout) {
 return <>{children}</>;
 }

 return <Layout>{children}</Layout>;
}
