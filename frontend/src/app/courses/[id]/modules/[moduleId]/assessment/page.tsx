'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, Trophy,
  Loader2, Maximize2, RotateCcw,
  Flag, Save, LayoutGrid, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AssessmentPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);
  const router = useRouter();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [startTime] = useState(Date.now());

  // Fetch Quiz Data
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const quizzes = await api.common.getModuleQuizzes(parseInt(moduleId));
        if (quizzes && quizzes.length > 0) {
          const quizDetails = await api.common.getQuiz(quizzes[0].id);
          setQuiz(quizDetails);
          setTimeLeft((quizDetails.time_limit || 20) * 60);
        } else {
          toast.error("No quiz found for this module");
          router.back();
        }
      } catch (err) {
        toast.error("Failed to load assessment");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [moduleId, router]);

  // Timer Logic
  useEffect(() => {
    if (loading || result || isSubmitting || !quiz) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, result, isSubmitting, quiz]);

  const autoSubmit = useCallback(() => {
    if (!isSubmitting && !result) {
      toast.info("Time is up! Submitting your assessment...");
      handleSubmit();
    }
  }, [isSubmitting, result]);

  const handleOptionSelect = (option: string) => {
    const qId = quiz.questions[currentIdx].id;
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const toggleMarkForReview = () => {
    const qId = quiz.questions[currentIdx].id;
    setMarkedForReview(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmit = async () => {
    if (!quiz || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const formattedAnswers = quiz.questions.map((q: any) => ({
        question_id: q.id,
        answer: answers[q.id] || ""
      }));

      console.log("[QUIZ SUBMISSION]", {
        quizId: quiz.id,
        answers: formattedAnswers
      });

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      
      const res = await api.employee.attemptQuiz(quiz.id, {
        answers: formattedAnswers,
        time_taken: timeTaken
      });

      setResult(res);
      toast.success("Assessment submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit assessment");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4 font-sans">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Maximize2 className="w-6 h-6 text-orange-500 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">Assessment Environment</p>
          <p className="text-xs text-slate-400 font-medium">Configuring secure session and assets...</p>
        </div>
      </div>
    );
  }

  if (result) {
    const timeTakenSeconds = result.time_taken || 0;
    const formatDuration = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return "0m 0s";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    };

    const attemptedCount = Object.keys(answers).length;
    const totalCount = quiz.questions.length;
    const correctCount = Object.values(result.results || {}).filter((r: any) => r.is_correct).length;
    const wrongCount = attemptedCount - correctCount;

    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans overflow-y-auto scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* ── SUMMARY SECTION ────────────────────────────────────────────── */}
          <Card className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-none relative">
            <div className={cn(
              "absolute top-0 left-0 w-full h-3",
              result.status === 'PASSED' ? "bg-emerald-500" : "bg-orange-500"
            )} />
            
            <div className="p-10 md:p-14 space-y-10">
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className={cn(
                  "w-28 h-28 rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-xl border-4 transform -rotate-3",
                  result.status === 'PASSED' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-orange-50 border-orange-100 text-orange-600"
                )}>
                  {result.status === 'PASSED' ? <Trophy className="w-14 h-14" /> : <AlertCircle className="w-14 h-14" />}
                </div>
                
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                    {result.status === 'PASSED' ? "Assessment Mastered!" : "Almost There!"}
                  </h1>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">
                    {quiz.title} • {result.status === 'PASSED' ? "Pass Statement" : "Improvement Required"}
                  </p>
                </div>

                <div className="text-center md:text-right">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
                   <p className={cn("text-6xl font-black tabular-nums", result.status === 'PASSED' ? "text-emerald-600" : "text-orange-600")}>
                     {Math.round(result.percentage)}%
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Questions", value: totalCount, icon: LayoutGrid },
                  { label: "Attempted", value: attemptedCount, icon: CheckCircle2 },
                  { label: "Correct", value: correctCount, icon: Check, color: "text-emerald-600" },
                  { label: "Duration", value: formatDuration(timeTakenSeconds), icon: Clock },
                ].map((stat, i) => (
                  <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    </div>
                    <p className={cn("text-xl font-black text-slate-900", stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-slate-50">
                <Button 
                  onClick={() => router.push(`/courses/${id}/modules/${moduleId}`)}
                  className="bg-slate-900 hover:bg-black text-white h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl"
                >
                  EXIT TO CURRICULUM
                </Button>
              </div>
            </div>
          </Card>

          {/* ── REVIEW SECTION ──────────────────────────────────────────────── */}
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Answer Review</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify your responses</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {quiz.questions.map((q: any, idx: number) => {
                const review = result.results?.[q.id];
                if (!review) return null;

                const isCorrect = review.is_correct;
                const userAns = review.answer || "No response";
                const rawCorrectAns = review.correct_answer;

                // Resolve index to text for display if it's an MCQ
                let displayCorrect = rawCorrectAns;
                if (q.type === 'mcq' && rawCorrectAns && /^\d+$/.test(rawCorrectAns)) {
                   try {
                      const opts = JSON.parse(q.options || '[]');
                      const idx = parseInt(rawCorrectAns) - 1; // Fix: Use 1-based indexing from Excel
                      if (idx >= 0 && idx < opts.length) {
                         displayCorrect = opts[idx];
                      }
                   } catch (e) {
                      console.error("Failed to parse options for resolution", e);
                   }
                }

                // Aggressive normalization for debug comparison
                const normalize = (v: any) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

                // Debug log as requested
                console.log("[REVIEW DEBUG]", {
                  questionId: q.id,
                  rawUserAnswer: userAns,
                  rawCorrectAnswer: rawCorrectAns,
                  resolvedCorrectAnswer: displayCorrect,
                  normalizedUser: normalize(userAns),
                  normalizedCorrect: normalize(displayCorrect),
                  isCorrect: isCorrect
                });

                return (
                  <Card key={q.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-8 flex items-start gap-6">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg",
                        isCorrect ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                           <Badge className={cn(
                             "border-none px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                             isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                           )}>
                             {isCorrect ? "Correct" : "Incorrect"}
                           </Badge>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points: {isCorrect ? q.marks : 0}/{q.marks}</span>
                        </div>

                        <h4 className="text-lg font-bold text-slate-900 leading-snug">{q.question_text}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your Answer</p>
                              <p className={cn("font-bold text-sm", isCorrect ? "text-emerald-600" : "text-red-600")}>{userAns}</p>
                           </div>
                           <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                              <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-2">Correct Answer</p>
                              <p className="font-bold text-sm text-emerald-700">{displayCorrect}</p>
                           </div>
                        </div>

                        {q.explanation && (
                           <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-4">
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                                 <AlertCircle className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Explanation</p>
                                 <p className="text-xs text-blue-700 leading-relaxed font-medium">{q.explanation}</p>
                              </div>
                           </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="py-12 text-center">
            <p className="text-slate-400 font-medium text-xs">End of Review • Comprehensive Performance Report</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIdx];
  const options = JSON.parse(currentQuestion.options || '[]');
  const isFillBlank = ['fill_blank', 'fill_in_blank', 'text', 'short_answer', 'fill', 'short'].includes(currentQuestion.type);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans select-none overflow-hidden text-slate-900">
      {/* ── TOP NAV ────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">CBT Examination System</span>
            <h1 className="text-sm font-black text-slate-900 tracking-tight truncate max-w-[300px]">{quiz.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="flex items-center gap-6 pr-6 border-r border-slate-100">
              <div className="flex flex-col items-end">
                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Timer Status</span>
                 <div className={cn(
                   "flex items-center gap-2 font-mono text-xl font-black tabular-nums transition-colors",
                   timeLeft < 180 ? "text-orange-600 animate-pulse" : "text-slate-900"
                 )}>
                    <Clock className="w-4 h-4" />
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                 </div>
              </div>
           </div>
           <Button 
             onClick={handleSubmit} 
             disabled={isSubmitting}
             className="bg-orange-600 hover:bg-orange-700 text-white h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
           >
             {isSubmitting ? "PROCESSING..." : "SUBMIT ASSESSMENT"}
           </Button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: COMPACT PALETTE */}
        <aside className="w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
           <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Item Navigator</h3>
              <Badge className="bg-slate-900 text-white border-none rounded-md text-[9px] px-2">{quiz.questions.length} Total</Badge>
           </div>
           
           <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
              <div className="grid grid-cols-5 gap-2">
                 {quiz.questions.map((q: any, idx: number) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
                    const isMarked = markedForReview[q.id];
                    const isCurrent = currentIdx === idx;
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={cn(
                          "aspect-square rounded-lg flex items-center justify-center text-[11px] font-black transition-all border-2",
                          isCurrent ? "border-orange-500 bg-white text-orange-600 shadow-sm scale-105 z-10" : 
                          isMarked ? "border-indigo-500 bg-indigo-500 text-white" :
                          isAnswered ? "border-emerald-500 bg-emerald-500 text-white shadow-sm" :
                          "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                 })}
              </div>
           </div>

           <div className="p-5 bg-slate-50 border-t border-slate-100">
              <div className="space-y-4">
                 <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                       <span>Completion</span>
                       <span>{Math.round((Object.keys(answers).length / quiz.questions.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-orange-500 transition-all duration-700" 
                         style={{ width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%` }}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                       <div className="w-2.5 h-2.5 rounded bg-emerald-500" /> Answered
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                       <div className="w-2.5 h-2.5 rounded bg-indigo-500" /> Review
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                       <div className="w-2.5 h-2.5 rounded border border-slate-300 bg-slate-50" /> Unvisited
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                       <div className="w-2.5 h-2.5 rounded border-2 border-orange-500" /> Current
                    </div>
                 </div>
              </div>
           </div>
        </aside>

        {/* RIGHT: QUESTION ENGINE */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
           <div className="flex-1 overflow-y-auto scroll-smooth">
              <div className="max-w-3xl mx-auto px-8 pt-12 pb-24 space-y-10">
                 
                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest">Item {currentIdx + 1}</span>
                       <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-md text-[9px] font-black uppercase tracking-widest">{currentQuestion.marks} Points</span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-900 leading-snug tracking-tight">
                       {currentQuestion.question_text}
                    </h2>
                 </div>

                 <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                          {isFillBlank ? "Answer Input" : "Select the correct option"}
                       </p>
                    </div>

                    {isFillBlank ? (
                       <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <Input 
                            autoFocus
                            value={answers[currentQuestion.id] || ""}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                            placeholder="Type your answer here..."
                            className="h-20 px-8 rounded-2xl border-2 border-slate-100 focus:border-orange-500 focus:ring-0 text-xl font-bold bg-white transition-all shadow-md placeholder:text-slate-200 placeholder:font-medium"
                          />
                          <p className="mt-4 text-[11px] text-slate-400 font-medium italic">Note: Ensure correct spelling and formatting for automatic scoring.</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 gap-3">
                          {options.map((opt: string, i: number) => {
                             const isSelected = answers[currentQuestion.id] === opt;
                             return (
                               <button
                                 key={i}
                                 onClick={() => handleOptionSelect(opt)}
                                 className={cn(
                                   "group flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all relative overflow-hidden",
                                   isSelected 
                                     ? "bg-slate-900 border-slate-900 text-white shadow-lg translate-x-1" 
                                     : "bg-white border-slate-100 hover:border-orange-200 text-slate-600 hover:bg-orange-50/30"
                                 )}
                               >
                                 <div className={cn(
                                   "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black transition-all",
                                   isSelected 
                                     ? "bg-orange-500 text-white" 
                                     : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-orange-500 border border-transparent group-hover:border-orange-100"
                                 )}>
                                   {String.fromCharCode(65 + i)}
                                 </div>
                                 <span className="text-sm font-bold flex-1">{opt}</span>
                                 {isSelected && (
                                   <div className="absolute right-4 animate-in zoom-in-50 duration-300">
                                      <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                         <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                      </div>
                                   </div>
                                 )}
                               </button>
                             );
                          })}
                       </div>
                    )}
                 </div>

                 {/* Subtle Hint/Info if needed */}
                 <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                       Read all options carefully before choosing. You can change your answer any time before the final submission.
                    </p>
                 </div>
              </div>
           </div>

           {/* ── STICKY FOOTER CONTROLS ────────────────────────────────────── */}
           <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-8 z-40 shrink-0">
              <div className="flex items-center gap-3">
                 <Button 
                   variant="outline" 
                   onClick={toggleMarkForReview}
                   className={cn(
                     "h-11 px-5 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 transition-all",
                     markedForReview[currentQuestion.id] 
                       ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700" 
                       : "border-slate-200 text-slate-500 hover:bg-slate-50"
                   )}
                 >
                   <Flag className={cn("w-3.5 h-3.5", markedForReview[currentQuestion.id] ? "fill-current" : "")} /> 
                   {markedForReview[currentQuestion.id] ? "REVIEWED" : "MARK FOR REVIEW"}
                 </Button>
                 
                 <Button 
                   variant="ghost"
                   onClick={() => setAnswers(prev => {
                     const newAnswers = { ...prev };
                     delete newAnswers[currentQuestion.id];
                     return newAnswers;
                   })}
                   className="h-11 px-5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                 >
                   CLEAR
                 </Button>
              </div>

              <div className="flex items-center gap-3">
                 <Button 
                   variant="outline" 
                   disabled={currentIdx === 0}
                   onClick={() => setCurrentIdx(prev => prev - 1)}
                   className="h-11 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-600 border-slate-200 hover:border-slate-300"
                 >
                   <ChevronLeft className="w-4 h-4 mr-2" /> PREVIOUS
                 </Button>
                 
                 <Button 
                   onClick={() => {
                     if (currentIdx < quiz.questions.length - 1) {
                       setCurrentIdx(prev => prev + 1);
                     } else {
                       handleSubmit();
                     }
                   }}
                   className="bg-slate-900 hover:bg-black text-white h-12 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                 >
                   {currentIdx === quiz.questions.length - 1 ? (
                     <>SUBMIT EXAM <CheckCircle2 className="w-4 h-4" /></>
                   ) : (
                     <>SAVE & NEXT <ChevronRight className="w-4 h-4" /></>
                   )}
                 </Button>
              </div>
           </footer>
        </main>
      </div>
    </div>
  );
}
