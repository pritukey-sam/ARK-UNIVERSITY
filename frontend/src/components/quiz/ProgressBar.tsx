'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
 current: number;
 total: number;
}

export const ProgressBar = ({ current, total }: ProgressBarProps) => {
 const percent = (current / total) * 100;
 return (
 <div className="w-full space-y-3">
 <div className="flex items-center justify-between px-1 text-xs font-bold uppercase text-zinc-500">
 <div className="flex items-center gap-2">
 <div className="w-1 h-1 rounded-full bg-[#7C3AED]" />
 Level Progress: {Math.round(percent)}%
 </div>
 <div>Inquiry {current} of {total}</div>
 </div>
 <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
 <motion.div 
 className="h-full bg-gradient-to-r from-[#7C3AED] to-blue-600 shadow-[0_0_15px_rgba(124,58,237,0.5)]"
 initial={{ width: 0 }}
 animate={{ width: `${percent}%` }}
 transition={{ duration: 0.6, ease: "circOut" }}
 />
 </div>
 </div>
 );
};
