'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Zap, Loader2, Clock, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';

interface Question {
 id: number;
 question_text: string;
 option_1: string;
 option_2: string;
 option_3: string;
 option_4: string;
}

interface QuizContainerProps {
 quiz: {
 id: number;
 title: string;
 questions: Question[];
 };
 onSubmit: (answers: Record<number, number>) => void;
 isSubmitting: boolean;
}

export const QuizContainer = ({ quiz, onSubmit, isSubmitting }: QuizContainerProps) => {
 const [currentIdx, setCurrentIdx] = useState(0);
 const [answers, setAnswers] = useState<Record<number, number>>({});
 const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

 // Auto-submit when time expires
 useEffect(() => {
 const timer = setInterval(() => {
 setTimeLeft(prev => {
 if (prev <= 1) {
 clearInterval(timer);
 onSubmit(answers);
 return 0;
 }
 return prev - 1;
 });
 }, 1000);
 return () => clearInterval(timer);
 }, [answers, onSubmit]);

 // Keyboard navigation
 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => {
 if (['1', '2', '3', '4'].includes(e.key)) {
 handleSelect(parseInt(e.key));
 } else if (e.key === 'Enter') {
 if (answers[quiz.questions[currentIdx].id]) {
 if (currentIdx < quiz.questions.length - 1) setCurrentIdx(p => p + 1);
 else onSubmit(answers);
 }
 }
 };
 window.addEventListener('keydown', handleKey);
 return () => window.removeEventListener('keydown', handleKey);
 }, [currentIdx, answers, quiz.questions]);

 const handleSelect = (val: number) => {
 setAnswers(prev => ({ ...prev, [quiz.questions[currentIdx].id]: val }));
 };

 const formatTime = (s: number) => {
 const m = Math.floor(s / 60);
 const sec = s % 60;
 return `${m}:${sec.toString().padStart(2, '0')}`;
 };

 const currentQ = quiz.questions[currentIdx];
 const isLast = currentIdx === quiz.questions.length - 1;
 const canGoNext = !!answers[currentQ.id];

 return (
 <div className="max-w-5xl mx-auto py-8 space-y-10 min-h-[85vh] flex flex-col justify-center animate-in fade-in duration-1000">
 
 {/* Quiz Header */}
 <div className="flex items-center justify-between px-2">
 <div className="flex items-center gap-4">
 <div className="w-11 h-11 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center shadow-lg">
 <GraduationCap className="w-5 h-5 text-[#7C3AED]" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-white tracking-tighter uppercase ">{quiz.title}</h2>
 <p className="text-xs font-bold text-zinc-600 uppercase">Digital Proficiency Exam</p>
 </div>
 </div>

 <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border transition-all ${timeLeft < 60 ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
 <Clock className="w-3.5 h-3.5" />
 <span className="font-bold text-xs font-mono">{formatTime(timeLeft)}</span>
 </div>
 </div>

 <ProgressBar current={currentIdx + 1} total={quiz.questions.length} />

 <div className="relative">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentIdx}
 initial={{ opacity: 0, x: 30 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -30 }}
 transition={{ duration: 0.4, ease: "backOut" }}
 >
 <QuestionCard 
 question={currentQ} 
 index={currentIdx} 
 selectedAnswer={answers[currentQ.id] || null} 
 onSelect={handleSelect} 
 />
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Navigation */}
 <div className="flex items-center justify-between px-4">
 <Button 
 variant="ghost" 
 disabled={currentIdx === 0}
 onClick={() => setCurrentIdx(p => p - 1)}
 className="text-zinc-600 hover:text-white font-bold uppercase text-xs gap-2 py-6 px-8 rounded-2xl disabled:opacity-0"
 >
 <ChevronLeft className="w-4 h-4" /> Previous Inquiry
 </Button>

 {isLast ? (
 <Button 
 onClick={() => onSubmit(answers)}
 disabled={isSubmitting || !canGoNext}
 className="bg-white text-black hover:bg-[#7C3AED] hover:text-white px-12 h-16 rounded-xl font-bold text-lg uppercase tracking-tighter shadow-sm transition-all active:scale-95 group"
 >
 {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="flex items-center gap-2">Final Submission <Zap className="w-5 h-5 fill-current" /></div>}
 </Button>
 ) : (
 <Button 
 onClick={() => setCurrentIdx(p => p + 1)}
 disabled={!canGoNext}
 className="bg-zinc-900 text-white hover:bg-zinc-800 px-12 h-16 rounded-xl font-bold text-lg uppercase tracking-tighter shadow-xl transition-all disabled:opacity-50"
 >
 Next Question <ChevronRight className="w-5 h-5 ml-1" />
 </Button>
 )}
 </div>

 <div className="flex justify-center pt-2">
 <div className="flex items-center gap-4 text-xs font-bold text-zinc-700 uppercase">
 <span>[1-4] Select</span>
 <div className="w-1 h-1 rounded-full bg-zinc-800" />
 <span>[Enter] Next</span>
 </div>
 </div>
 </div>
 );
};
