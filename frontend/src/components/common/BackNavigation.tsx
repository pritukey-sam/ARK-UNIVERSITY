'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackNavigationProps {
  className?: string;
}

export default function BackNavigation({ className }: BackNavigationProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className={cn(
        "flex items-center gap-2 h-auto px-0 py-1 text-sm font-medium text-[#6A6F73] hover:text-[#111] hover:bg-transparent transition-colors group",
        className
      )}
    >
      <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-50 border border-gray-100 group-hover:border-gray-200 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
      </div>
      <span>Back</span>
    </Button>
  );
}
