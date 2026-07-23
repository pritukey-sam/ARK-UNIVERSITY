'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
 id: number;
 question_text: string;
 type: string;
 options?: string; // JSON string or array
 correct_answer: string;
 explanation?: string;
 marks: number;
}

interface QuizPreviewProps {
 quiz: {
 id: number;
 title: string;
 questions: Question[];
 };
}

export const QuizPreview = ({ quiz }: QuizPreviewProps) => {
 return (
 <div className="space-y-8 animate-in fade-in duration-500">
 <div className="flex items-center justify-between border-b border-gray-100 pb-4">
 <div>
 <h2 className="text-xl font-bold text-gray-900 tracking-tight">{quiz.title}</h2>
 <p className="text-sm text-gray-500 mt-1">Admin Preview Mode • {quiz.questions.length} Questions</p>
 </div>
 <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 px-4 py-1.5 rounded-full font-bold uppercase text-xs">
 Verification View
 </Badge>
 </div>

 <div className="space-y-6">
 {quiz.questions.map((q, idx) => {
 let optionsList: string[] = [];
 try {
 if (q.options) {
 optionsList = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
 }
 } catch (e) {
 console.error('Failed to parse options for question', q.id);
 }

 let resolvedAnswer = q.correct_answer;
 if (optionsList.length > 0) {
 if (/^[1-4]$/.test(q.correct_answer)) {
 const idx = parseInt(q.correct_answer) - 1;
 if (idx >= 0 && idx < optionsList.length) {
 resolvedAnswer = optionsList[idx];
 }
 } else if (/^[A-Da-d]$/.test(q.correct_answer)) {
 const idx = q.correct_answer.toUpperCase().charCodeAt(0) - 65;
 if (idx >= 0 && idx < optionsList.length) {
 resolvedAnswer = optionsList[idx];
 }
 }
 }

 return (
 <Card key={q.id} className="border border-gray-100 shadow-sm overflow-hidden rounded-2xl">
 <CardContent className="p-0">
 <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-start gap-4">
 <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
 {idx + 1}
 </div>
 <div className="flex-1">
 <h3 className="text-base font-semibold text-gray-900 leading-relaxed">
 {q.question_text}
 </h3>
 <div className="flex items-center gap-3 mt-2">
 <Badge variant="ghost" className="text-xs font-bold uppercase bg-white border border-gray-200 text-gray-500">
 Type: {q.type}
 </Badge>
 <Badge variant="ghost" className="text-xs font-bold uppercase bg-white border border-gray-200 text-gray-500">
 {q.marks} Marks
 </Badge>
 </div>
 </div>
 </div>

 <div className="p-6 space-y-3">
 {q.type === 'mcq' && optionsList.length > 0 && (
 <div className="grid gap-2">
 {optionsList.map((opt, oIdx) => {
 const isCorrect = (oIdx + 1).toString() === q.correct_answer || String.fromCharCode(65 + oIdx) === q.correct_answer.toUpperCase();
 return (
 <div 
 key={oIdx} 
 className={cn(
 "p-4 rounded-xl border flex items-center justify-between transition-all",
 isCorrect 
 ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium" 
 : "bg-white border-gray-100 text-gray-600"
 )}
 >
 <span className="text-sm">{(oIdx + 10).toString(36).toUpperCase()}. {opt}</span>
 {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
 </div>
 );
 })}
 </div>
 )}

 <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200">
 <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Correct Answer</p>
 <p className="text-sm text-emerald-900 font-medium">{resolvedAnswer}</p>
 </div>

 {q.explanation && (
 <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-3">
 <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
 <div>
 <p className="text-xs font-bold text-orange-700 uppercase mb-1">Explanation</p>
 <p className="text-sm text-orange-900 leading-relaxed">{q.explanation}</p>
 </div>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </div>
 );
};
