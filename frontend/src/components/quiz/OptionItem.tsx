'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionItemProps {
 index: number;
 text: string;
 isSelected: boolean;
 onClick: () => void;
}

export const OptionItem = ({ index, text, isSelected, onClick }: OptionItemProps) => {
 return (
 <motion.button
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.98 }}
 onClick={onClick}
 className={cn(
 "p-6 rounded-2xl text-left transition-all border-2 font-bold text-lg flex items-center justify-between group",
 isSelected 
 ? 'bg-[#F26522] border-[#F26522] text-white shadow-xl' 
 : 'bg-white border-[#EAEAEA] text-[#6A6F73] hover:border-[#F26522]/30 hover:bg-[#F26522]/5 hover:text-[#111] shadow-sm'
 )}
 >
 <div className="flex items-center gap-5">
 <span className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-all",
 isSelected 
 ? 'bg-white text-[#F26522] border-white shadow-inner' 
 : 'bg-white border-[#EAEAEA] group-hover:border-[#F26522]/20'
 )}>
 {String.fromCharCode(65 + index)}
 </span>
 <span className="leading-snug">{text}</span>
 </div>
 {isSelected && (
 <CheckCircle2 className="w-6 h-6 text-white" />
 )}
 </motion.button>
 );
};
