'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
 className?: string;
}

export default function BackButton({ className }: BackButtonProps) {
 const router = useRouter();
 const pathname = usePathname();

 // Root/Dashboard pages where we should hide the back button
 const isRootPage = pathname === '/' || 
 pathname === '/dashboard' || 
 pathname === '/super-admin' ||
 pathname === '/login' ||
 pathname === '/register';

 if (isRootPage) return null;

 return (
 <Button
 variant="ghost"
 onClick={() => router.back()}
 className={cn(
 "group flex items-center gap-2 px-3 py-1.5 h-auto text-sm font-bold text-[#6A6F73] hover:text-[#111] hover:bg-white rounded-xl transition-all active:scale-95",
 className
 )}
 >
 <div className="w-7 h-7 rounded-lg bg-white border border-[#eee] flex items-center justify-center shadow-sm group-hover:border-[#F26522]/30 group-hover:text-[#F26522] transition-colors">
 <ArrowLeft className="w-4 h-4" />
 </div>
 <span className="hidden sm:inline">Back</span>
 </Button>
 );
}
