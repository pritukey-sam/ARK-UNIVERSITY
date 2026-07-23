'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, ChevronLeft, Send, Award, Clock, RefreshCcw, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function QuizPage({ params }: { params: Promise<{ id: string, quizId: string }> }) {
 const { id, quizId } = use(params);
 const [quiz, setQuiz] = useState<any>(null);
 const [answers, setAnswers] = useState<any[]>([]);
 const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [result, setResult] = useState<any>(null);

 useEffect(() => {
 fetchQuiz();
 }, [quizId]);

 const fetchQuiz = async () => {
 try {
 setLoading(true);
 const data = await api.common.getQuiz(parseInt(quizId));
 setQuiz(data);
 // Initialize handles
 setAnswers(data.questions.map((q: any) => ({ question_id: q.id, answer: 0 })));
 } catch (error) {
 console.error(error);
 toast.error('Failed to load quiz');
 } finally {
 setLoading(false);
 }
 };

 const handleOptionSelect = (optionIndex: number) => {
 const newAnswers = [...answers];
 newAnswers[currentQuestionIndex].answer = optionIndex;
 setAnswers(newAnswers);
 };

 const handleSubmit = async () => {
 // Validation
 const unanswered = answers.some(a => a.answer === 0);
 if (unanswered) {
 toast.warning('Please answer all questions before submitting');
 return;
 }

 try {
 setSubmitting(true);
 const res = await api.employee.attemptQuiz(parseInt(quizId), { answers, time_taken: 0 });
 setResult(res);
 toast.success('Quiz submitted successfully!');
 } catch (error) {
 console.error(error);
 toast.error('Failed to submit quiz');
 } finally {
 setSubmitting(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-[60vh]">
 <div className="text-gray-400 animate-pulse text-center">
 <Award className="w-12 h-12 mx-auto mb-4" />
 <p className="text-xl">Preparing your assessment...</p>
 </div>
 </div>
 );
 }

 if (result) {
 return (
 <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
 <Card className="bg-white/5 border-white/10 text-center py-12">
 <CardHeader>
 <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 ${
 result.status === "PASSED" ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
 }`}>
 <Award className="w-12 h-12" />
 </div>
 <CardTitle className="text-4xl font-extrabold mb-2">Quiz Completed!</CardTitle>
 <CardDescription className="text-xl text-gray-400">
 You scored <span className="text-white font-bold">{result.score} / {result.total_questions}</span>
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-8">
 <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
 <p className="text-2xl font-bold">{result.correct_answers}</p>
 <p className="text-xs text-gray-500 uppercase tracking-wider">Correct Answers</p>
 </div>
 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
 <p className="text-2xl font-bold">{result.total_questions}</p>
 <p className="text-xs text-gray-500 uppercase tracking-wider">Total Questions</p>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
 <Button 
 onClick={() => window.location.reload()}
 className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl px-8"
 >
 <RefreshCcw className="w-4 h-4 mr-2" /> Retake Quiz
 </Button>
 <Button 
 onClick={() => window.location.href = `/courses/${id}`}
 className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl px-8 shadow-lg shadow-[#7C3AED]/20"
 >
 <Home className="w-4 h-4 mr-2" /> Back to Course
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 );
 }

 const currentQuestion = quiz.questions[currentQuestionIndex];
 const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

 return (
 <div className="max-w-4xl mx-auto space-y-8">
 {/* Quiz Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">{quiz.title}</h1>
 <p className="text-gray-400">Section: Final Assessment</p>
 </div>
 <div className="flex items-center gap-3">
 <Badge variant="outline" className="border-white/10 text-gray-400 py-2 px-4 rounded-xl">
 Question {currentQuestionIndex + 1} of {quiz.questions.length}
 </Badge>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="space-y-2">
 <Progress value={progress} className="h-2 bg-white/5" />
 <div className="flex justify-between text-xs text-gray-500 font-bold uppercase">
 <span>Progress {Math.round(progress)}%</span>
 <span>ARK University Pro LMS</span>
 </div>
 </div>

 {/* Question Card */}
 <Card className="bg-white/5 border-white/10 overflow-hidden shadow-sm">
 <CardHeader className="bg-[#7C3AED]/5 border-b border-white/5 p-8">
 <h2 className="text-2xl font-medium leading-relaxed">
 {currentQuestion.question_text}
 </h2>
 </CardHeader>
 <CardContent className="p-8 space-y-4">
 {[1, 2, 3, 4].map((num) => {
 const optionText = currentQuestion[`option_${num}`];
 if (!optionText) return null;
 
 const isSelected = answers[currentQuestionIndex]?.answer === num;
 
 return (
 <button
 key={num}
 onClick={() => handleOptionSelect(num)}
 className={`w-full p-5 flex items-center justify-between rounded-2xl border-2 transition-all group text-left ${
 isSelected 
 ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white' 
 : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
 }`}
 >
 <div className="flex items-center gap-4">
 <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
 isSelected ? 'bg-[#7C3AED] text-white' : 'bg-black/20 text-gray-500 group-hover:bg-black/30'
 }`}>
 {String.fromCharCode(64 + num)}
 </span>
 <span className="font-medium text-lg">{optionText}</span>
 </div>
 {isSelected && <CheckCircle2 className="w-6 h-6 text-[#7C3AED]" />}
 </button>
 );
 })}
 </CardContent>
 </Card>

 {/* Navigation */}
 <div className="flex items-center justify-between pt-4">
 <Button
 variant="ghost"
 onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
 disabled={currentQuestionIndex === 0}
 className="text-gray-400 hover:text-white"
 >
 <ChevronLeft className="w-4 h-4 mr-2" /> Previous
 </Button>

 {currentQuestionIndex === quiz.questions.length - 1 ? (
 <Button
 onClick={handleSubmit}
 disabled={submitting}
 className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-10 py-6 rounded-2xl shadow-xl shadow-[#7C3AED]/30 text-lg font-bold"
 >
 {submitting ? 'Submitting...' : 'Finish Quiz'} <Send className="w-5 h-5 ml-2" />
 </Button>
 ) : (
 <Button
 onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
 className="bg-white/10 hover:bg-white/20 text-white px-10 py-6 rounded-2xl border border-white/10 text-lg font-bold"
 >
 Next Question <ChevronRight className="w-5 h-5 ml-2" />
 </Button>
 )}
 </div>
 </div>
 );
}
