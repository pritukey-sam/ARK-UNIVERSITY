'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Save, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
 id: number;
 type: 'mcq' | 'fill' | 'short' | 'code';
 question_text: string;
 options?: string; // JSON string
 marks: number;
 explanation?: string;
}

export default function QuizPage() {
 const { moduleId } = useParams();
 const router = useRouter();
 const [loading, setLoading] = useState(true);
 const [quiz, setQuiz] = useState<any>(null);
 const [questions, setQuestions] = useState<Question[]>([]);
 const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
 const [answers, setAnswers] = useState<Record<number, string>>({});
 const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes default
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isLocked, setIsLocked] = useState(false);
 const [showConfirmModal, setShowConfirmModal] = useState(false);

 useEffect(() => {
 if (showConfirmModal) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = 'unset';
 }
 return () => {
 document.body.style.overflow = 'unset';
 };
 }, [showConfirmModal]);

 const fetchQuiz = useCallback(async () => {
 try {
 setLoading(true);
 // 1. Check if quiz is unlocked (requires video progress)
 // We need courseId for this, but we only have moduleId. 
 // Let's get module details first.
 const moduleData = await api.common.getModule(Number(moduleId));
 const progress = await api.employee.getModuleProgressDetail(moduleData.course_id, Number(moduleId));
 
 if (!progress.quiz_unlocked) {
 setIsLocked(true);
 setLoading(false);
 return;
 }

 // 2. Fetch the quiz
 const quizzes = await api.common.getModuleQuizzes(Number(moduleId));
 if (quizzes.length === 0) {
 toast.error("No quiz found for this module");
 router.back();
 return;
 }

 const quizId = quizzes[0].id;
 const fullQuiz = await api.common.getQuiz(quizId);
 setQuiz(fullQuiz);
 setQuestions(fullQuiz.questions);
 
 // Initialize answers from localStorage if exists
 const savedAnswers = localStorage.getItem(`quiz_answers_${quizId}`);
 if (savedAnswers) {
 setAnswers(JSON.parse(savedAnswers));
 }

 setLoading(false);
 } catch (error: any) {
 toast.error(error.message || "Failed to load quiz");
 router.back();
 }
 }, [moduleId, router]);

 useEffect(() => {
 fetchQuiz();
 }, [fetchQuiz]);

 // Timer logic
 useEffect(() => {
 if (loading || isLocked || !quiz) return;

 const timer = setInterval(() => {
 setTimeLeft((prev) => {
 if (prev <= 1) {
 clearInterval(timer);
 executeSubmit();
 return 0;
 }
 return prev - 1;
 });
 }, 1000);

 return () => clearInterval(timer);
 }, [loading, isLocked, quiz]);

 // Auto-save answers
 useEffect(() => {
 if (quiz) {
 localStorage.setItem(`quiz_answers_${quiz.id}`, JSON.stringify(answers));
 }
 }, [answers, quiz]);

 const formatTime = (seconds: number) => {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins}:${secs.toString().padStart(2, '0')}`;
 };

 const handleAnswerChange = (questionId: number, value: string) => {
 setAnswers((prev) => ({ ...prev, [questionId]: value }));
 };

 const handleInitiateSubmit = () => {
 setShowConfirmModal(true);
 };

 const executeSubmit = async () => {
 if (isSubmitting) return;

 try {
 setIsSubmitting(true);
 const payload = {
 answers: Object.entries(answers).map(([id, val]) => ({
 question_id: Number(id),
 answer: val
 })),
 time_taken: 1800 - timeLeft
 };

 const result = await api.employee.attemptQuiz(quiz.id, payload);
 
 // Clear saved answers
 localStorage.removeItem(`quiz_answers_${quiz.id}`);
 
 toast.success("Assessment submitted successfully");
 
 // Redirect to result page
 localStorage.setItem(`last_quiz_result_${moduleId}`, JSON.stringify(result));
 router.push(`/quiz/${moduleId}/result`);
 } catch (error: any) {
 toast.error(error.message || "Submission failed");
 } finally {
 setIsSubmitting(false);
 setShowConfirmModal(false);
 }
 };

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-white">
 <Loader2 className="w-10 h-10 animate-spin text-zinc-900" />
 <p className="mt-4 text-zinc-500 font-medium">Preparing your assessment...</p>
 </div>
 );
 }

 if (isLocked) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
 <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
 <AlertCircle className="w-10 h-10 text-zinc-400" />
 </div>
 <h1 className="text-2xl font-bold text-zinc-900 mb-2 uppercase tracking-tight">Quiz Locked</h1>
 <p className="text-zinc-500 max-w-md mb-8">Complete all lectures in this module to unlock the final assessment.</p>
 <Button 
 onClick={() => router.back()}
 className="bg-zinc-900 hover:bg-zinc-800 text-white px-8 h-12 rounded-xl font-bold transition-all"
 >
 Back to Module
 </Button>
 </div>
 );
 }

 const currentQuestion = questions[currentQuestionIndex];

 return (
 <div className="min-h-screen saas-glow-bg text-[#111] font-sans">
 {/* Top Bar */}
 <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#EAEAEA] px-6 h-20 flex items-center justify-between shadow-sm">
 <div className="flex items-center gap-4">
 <h1 className="text-lg font-bold uppercase tracking-tight text-zinc-900">{quiz?.title}</h1>
 <div className="hidden md:flex h-6 w-px bg-zinc-200" />
 <span className="hidden md:inline text-zinc-400 text-sm font-medium">Module Assessment</span>
 </div>

 <div className="flex items-center gap-6">
 <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold border transition-colors ${timeLeft < 300 ? 'text-red-600 border-red-100 bg-red-50 animate-pulse' : 'text-zinc-600 border-zinc-100 bg-zinc-50'}`}>
 <Clock className="w-4 h-4" />
 {formatTime(timeLeft)}
 </div>
 <Button 
 onClick={handleInitiateSubmit} 
 disabled={isSubmitting}
 className="bg-[#F26522] hover:bg-[#D54D10] text-white rounded-full px-6 font-bold"
 >
 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Exam"}
 </Button>
 </div>
 </header>

 {/* Main Content */}
 <main className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
 
 {/* Left Panel: Question Navigator */}
 <aside className="lg:col-span-3 space-y-6">
 <div className="saas-card p-6">
 <h3 className="text-xs font-bold text-zinc-400 uppercase mb-6">Question Navigator</h3>
 <div className="grid grid-cols-5 gap-2">
 {questions.map((q, idx) => (
 <button
 key={q.id}
 onClick={() => setCurrentQuestionIndex(idx)}
 className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center border ${
 currentQuestionIndex === idx 
 ? 'bg-zinc-900 text-white border-zinc-900' 
 : answers[q.id] 
 ? 'bg-green-50 text-green-600 border-green-100' 
 : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300'
 }`}
 >
 {idx + 1}
 </button>
 ))}
 </div>

 <div className="mt-8 pt-8 border-t border-zinc-200 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-3 h-3 rounded-full bg-green-500" />
 <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Attempted ({Object.keys(answers).length})</span>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-3 h-3 rounded-full bg-zinc-200" />
 <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Unattempted ({questions.length - Object.keys(answers).length})</span>
 </div>
 </div>
 </div>

 <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
 <div className="flex items-center gap-3 text-blue-600 mb-2">
 <AlertCircle className="w-4 h-4" />
 <h4 className="text-sm font-bold uppercase tracking-tight">Quiz Rules</h4>
 </div>
 <p className="text-xs text-blue-900/60 leading-relaxed">Your answers are automatically saved as you navigate. Do not refresh the page during the exam.</p>
 </div>
 </aside>

 {/* Main Panel: Question content */}
 <section className="lg:col-span-9">
 <div className="saas-card saas-card-glow min-h-[500px] flex flex-col">
 <div className="p-10 flex-1">
 <div className="flex items-center justify-between mb-8">
 <span className="text-xs font-bold text-zinc-400 uppercase bg-zinc-50 px-4 py-1.5 rounded-full border border-zinc-100">Question {currentQuestionIndex + 1} of {questions.length}</span>
 <span className="text-xs font-bold text-blue-600 uppercase">{currentQuestion?.marks} Marks</span>
 </div>

 <h2 className="text-2xl font-bold text-zinc-900 leading-tight mb-10">
 {currentQuestion?.question_text}
 </h2>

 {/* MCQ Options */}
 {currentQuestion?.type === 'mcq' && currentQuestion.options && (
 <div className="space-y-4">
 {JSON.parse(currentQuestion.options).map((opt: string, idx: number) => (
 <button
 key={idx}
 onClick={() => handleAnswerChange(currentQuestion.id, String(idx + 1))}
 className={`w-full p-6 rounded-2xl border text-left transition-all flex items-center gap-4 group ${
 answers[currentQuestion.id] === String(idx + 1)
 ? 'bg-zinc-900 text-white border-zinc-900'
 : 'bg-white text-zinc-600 border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'
 }`}
 >
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
 answers[currentQuestion.id] === String(idx + 1) ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200'
 }`}>
 {String.fromCharCode(65 + idx)}
 </div>
 <span className="font-medium">{opt}</span>
 </button>
 ))}
 </div>
 )}

 {/* Fill in the blanks / Short Answer */}
 {(currentQuestion?.type === 'fill' || currentQuestion?.type === 'short') && (
 <div className="space-y-4">
 <textarea
 value={answers[currentQuestion.id] || ''}
 onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
 placeholder="Type your answer here..."
 className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl p-8 h-40 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all text-lg font-medium placeholder:text-zinc-300 resize-none"
 />
 </div>
 )}

 {/* Coding Question */}
 {currentQuestion?.type === 'code' && (
 <div className="space-y-4">
 <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5">
 <div className="bg-zinc-800 px-6 py-3 flex items-center justify-between">
 <span className="text-xs font-bold text-zinc-400 uppercase">Code Editor</span>
 <div className="flex gap-1.5">
 <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
 <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
 </div>
 </div>
 <textarea
 value={answers[currentQuestion.id] || ''}
 onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
 placeholder="// Write your code here..."
 className="w-full bg-transparent p-8 h-80 focus:outline-none font-mono text-white text-sm placeholder:text-zinc-700 resize-none"
 />
 </div>
 </div>
 )}
 </div>

 {/* Footer Navigation */}
 <div className="p-8 border-t border-zinc-100 flex items-center justify-between">
 <Button
 variant="ghost"
 disabled={currentQuestionIndex === 0}
 onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
 className="text-zinc-500 hover:text-zinc-900 h-12 px-6 rounded-xl font-bold flex items-center gap-2"
 >
 <ChevronLeft className="w-5 h-5" /> Previous
 </Button>

 <div className="flex items-center gap-3">
 <Button
 variant="outline"
 className="border-zinc-100 text-zinc-600 h-12 px-6 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-50"
 >
 <Save className="w-4 h-4" /> Save Mark
 </Button>
 <Button
 onClick={() => {
 if (currentQuestionIndex < questions.length - 1) {
 setCurrentQuestionIndex(prev => prev + 1);
 } else {
 handleInitiateSubmit();
 }
 }}
 className="bg-[#F26522] hover:bg-[#D54D10] text-white h-12 px-8 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
 >
 {currentQuestionIndex === questions.length - 1 ? "Finish" : "Next Question"} <ChevronRight className="w-5 h-5" />
 </Button>
 </div>
 </div>
 </div>
 </section>
 </main>

 {/* Custom Confirm Modal */}
 {showConfirmModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 {/* Backdrop */}
 <div 
 className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
 onClick={() => !isSubmitting && setShowConfirmModal(false)}
 />
 
 {/* Modal Content */}
 <div className="relative bg-white rounded-[20px] p-8 max-w-md w-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-200">
 <div className="mb-6">
 <h3 className="text-2xl font-bold text-zinc-900 mb-2">Submit Assessment?</h3>
 <p className="text-zinc-500 font-medium leading-relaxed">
 Are you sure you want to submit your answers? You won't be able to change them after submission.
 </p>
 </div>
 
 <div className="flex items-center justify-end gap-3">
 <Button
 variant="outline"
 onClick={() => setShowConfirmModal(false)}
 disabled={isSubmitting}
 className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl px-6 h-12 font-bold"
 >
 Cancel
 </Button>
 <Button
 onClick={executeSubmit}
 disabled={isSubmitting}
 className="bg-[#F26522] hover:bg-[#D54D10] text-white rounded-xl px-8 h-12 font-bold min-w-[120px]"
 >
 {isSubmitting ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 "Submit"
 )}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
