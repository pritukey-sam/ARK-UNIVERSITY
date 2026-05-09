'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ChevronLeft, Trophy, ArrowRight, BookOpen, Target, Sparkles, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function QuizResultPage() {
 const { moduleId } = useParams();
 const router = useRouter();
 const [result, setResult] = useState<any>(null);

 useEffect(() => {
 const savedResult = localStorage.getItem(`last_quiz_result_${moduleId}`);
 if (savedResult) {
 setResult(JSON.parse(savedResult));
 } else {
 router.push(`/courses`); // fallback
 }
 }, [moduleId, router]);

 if (!result) return null;

 const getPerformanceMessage = (score: number) => {
 if (score >= 90) return { title: "Outstanding!", msg: "You've mastered this module with exceptional precision.", color: "text-green-600", bg: "bg-green-50" };
 if (score >= 70) return { title: "Great Job!", msg: "You have a solid understanding of the core concepts.", color: "text-blue-600", bg: "bg-blue-50" };
 if (score >= 50) return { title: "Good Effort", msg: "You've passed, but there's room for improvement in some areas.", color: "text-orange-600", bg: "bg-orange-50" };
 return { title: "Keep Practicing", msg: "We recommend reviewing the module materials and trying again.", color: "text-red-600", bg: "bg-red-50" };
 };

 const perf = getPerformanceMessage(result.score);
 const correctCount = Object.values(result.results || {}).filter((r: any) => r.is_correct).length;
 const totalCount = Object.keys(result.results || {}).length;

 return (
 <div className="min-h-screen bg-white text-zinc-900 font-sans p-6 md:p-12">
 <div className="max-w-[800px] mx-auto">
 
 {/* Header */}
 <header className="flex items-center justify-between mb-12">
 <Button 
 variant="ghost" 
 onClick={() => router.push(`/courses`)}
 className="text-zinc-400 hover:text-zinc-900 font-bold flex items-center gap-2 p-0 h-auto"
 >
 <ChevronLeft className="w-4 h-4" /> Back to Dashboard
 </Button>
 <span className="text-xs font-bold uppercase text-zinc-300">Assessment Report</span>
 </header>

 {/* Main Score Card */}
 <section className={`${perf.bg} rounded-xl p-10 md:p-16 text-center border border-zinc-100 shadow-sm shadow-zinc-200/50 relative overflow-hidden`}>
 <div className="absolute top-0 right-0 p-8 opacity-10">
 <Sparkles className="w-40 h-40" />
 </div>
 
 <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-zinc-900/5 border border-zinc-50">
 <Trophy className={`w-10 h-10 ${perf.color}`} />
 </div>

 <h1 className={`text-4xl font-bold uppercase tracking-tight mb-4 ${perf.color}`}>{perf.title}</h1>
 <p className="text-zinc-500 font-medium max-w-md mx-auto leading-relaxed mb-10">{perf.msg}</p>

 <div className="relative inline-block mb-10">
 <div className="text-8xl font-bold tracking-tighter text-zinc-900 ">
 {Math.round(result.score)}<span className="text-3xl not- text-zinc-400 ml-1">%</span>
 </div>
 </div>

 <div className="max-w-xs mx-auto">
 <Progress value={result.score} className="h-3 bg-white border border-zinc-100" />
 </div>
 </section>

 {/* Breakdown Stats */}
 <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
 <div className="bg-zinc-50 rounded-3xl p-8 border border-zinc-100 flex flex-col items-center text-center">
 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 border border-zinc-100 shadow-sm">
 <Target className="w-6 h-6 text-zinc-400" />
 </div>
 <h4 className="text-xs font-bold text-zinc-400 uppercase mb-1">Accuracy</h4>
 <p className="text-2xl font-bold text-zinc-900 ">{correctCount}/{totalCount}</p>
 </div>

 <div className="bg-zinc-50 rounded-3xl p-8 border border-zinc-100 flex flex-col items-center text-center">
 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 border border-zinc-100 shadow-sm">
 <Clock className="w-6 h-6 text-zinc-400" />
 </div>
 <h4 className="text-xs font-bold text-zinc-400 uppercase mb-1">Time Taken</h4>
 <p className="text-2xl font-bold text-zinc-900 ">{Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s</p>
 </div>

 <div className="bg-zinc-50 rounded-3xl p-8 border border-zinc-100 flex flex-col items-center text-center">
 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 border border-zinc-100 shadow-sm">
 <CheckCircle2 className="w-6 h-6 text-green-500" />
 </div>
 <h4 className="text-xs font-bold text-zinc-400 uppercase mb-1">Status</h4>
 <p className="text-2xl font-bold text-zinc-900">Passed</p>
 </div>
 </section>

 {/* Revision Suggestions */}
 <section className="mt-12 bg-zinc-900 rounded-xl p-10 md:p-12 text-white relative overflow-hidden">
 <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
 <div className="space-y-4 max-w-md">
 <div className="flex items-center gap-3 text-orange-400">
 <BookOpen className="w-5 h-5" />
 <h3 className="text-sm font-bold uppercase">Recommended Revision</h3>
 </div>
 <h2 className="text-2xl font-semibold tracking-tight">Review core concepts to achieve 100% mastery.</h2>
 <p className="text-zinc-400 text-sm leading-relaxed">Our AI suggests you re-watch the videos on <span className="text-white font-bold">"Data Structures"</span> and <span className="text-white font-bold">"Time Complexity"</span> to improve your score.</p>
 </div>
 <Button 
 onClick={() => router.push(`/courses`)}
 className="bg-white hover:bg-zinc-200 text-black h-16 px-10 rounded-2xl font-bold uppercase text-xs transition-all active:scale-95 shrink-0"
 >
 Go to Modules <ArrowRight className="w-5 h-5 ml-2" />
 </Button>
 </div>
 </section>

 <footer className="mt-12 text-center text-zinc-300 text-xs font-bold uppercase pb-10">
 &copy; 2024 Lumina LMS • Assessment Engine v3.0
 </footer>

 </div>
 </div>
 );
}
