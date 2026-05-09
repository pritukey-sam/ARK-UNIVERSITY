'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { OptionItem } from './OptionItem';
import { motion } from 'framer-motion';

interface QuestionCardProps {
 question: {
 id: number;
 question_text: string;
 option_1: string;
 option_2: string;
 option_3: string;
 option_4: string;
 };
 index: number;
 selectedAnswer: number | null;
 onSelect: (optionIdx: number) => void;
}

export const QuestionCard = ({ question, index, selectedAnswer, onSelect }: QuestionCardProps) => {
 return (
 <Card className="bg-white border-[#EAEAEA] rounded-xl shadow-xl shadow-black/[0.03] overflow-hidden relative border-b-8 border-b-[#F26522]/20">
 {/* Background glow */}
<CardContent className="p-10 md:p-16 space-y-12 relative z-10">
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <span className="px-5 py-2 bg-[#F26522]/10 text-[#F26522] rounded-xl text-xs font-bold uppercase border border-[#F26522]/10">
 Question {index + 1}
 </span>
 <div className="flex-1 h-px bg-[#EAEAEA]" />
 </div>
 <h3 className="text-3xl md:text-5xl font-bold text-[#111] tracking-tight leading-[1.1]">
 {question.question_text}
 </h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {[1, 2, 3, 4].map((opt, i) => (
 <OptionItem 
 key={opt}
 index={i}
 text={(question as any)[`option_${opt}`]}
 isSelected={selectedAnswer === opt}
 onClick={() => onSelect(opt)}
 />
 ))}
 </div>
 </CardContent>
 </Card>
 );
};
