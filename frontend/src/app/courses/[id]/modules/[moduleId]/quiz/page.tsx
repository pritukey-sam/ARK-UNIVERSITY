'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
  Loader2, ChevronLeft, ChevronRight, Clock, 
  CheckCircle2, Trophy, RotateCcw,
  Target, Lock, ArrowLeft, List, GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Question {
  id: number;
  type: 'mcq' | 'fill' | 'short' | 'code';
  question_text: string;
  options?: string; // JSON string
  marks: number;
  explanation?: string;
  correct_answer?: string;
}

export default function ModuleQuizPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id: courseId, moduleId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'result'>('idle');
  
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [progress] = await Promise.all([
        api.employee.getModuleProgressDetail(Number(courseId), Number(moduleId))
      ]);
      
      if (!progress.quiz_unlocked) {
        setIsLocked(true);
        setLoading(false);
        return;
      }

      const quizzes = await api.common.getModuleQuizzes(Number(moduleId));
      if (quizzes.length === 0) {
        toast.error("No quiz found for this module");
        setLoading(false);
        return;
      }

      const fullQuiz = await api.common.getQuiz(quizzes[0].id);
      setQuiz(fullQuiz);
      setQuestions(fullQuiz.questions);
      
      const saved = localStorage.getItem(`quiz_session_${moduleId}`);
      if (saved) {
        const data = JSON.parse(saved);
        setAnswers(data.answers);
        setTimeLeft(data.timeLeft);
        setQuizState('active');
      }

      setLoading(false);
    } catch (e: any) {
      toast.error("Failed to load quiz data");
      setLoading(false);
    }
  }, [moduleId, courseId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (quizState !== 'active' || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, isSubmitting]);

  const startQuiz = () => {
    setQuizState('active');
    setTimeLeft(1200);
  };

  const handleOptionSelect = (qId: number, option: string) => {
    const newAnswers = { ...answers, [qId]: option };
    setAnswers(newAnswers);
    localStorage.setItem(`quiz_session_${moduleId}`, JSON.stringify({ answers: newAnswers, timeLeft }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const formatted = Object.entries(answers).map(([qId, ans]) => ({
        question_id: Number(qId),
        answer_text: ans
      }));
      const res = await api.employee.submitQuiz(quiz.id, formatted);
      setResult(res);
      setQuizState('result');
      localStorage.removeItem(`quiz_session_${moduleId}`);
      toast.success("Quiz submitted successfully");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#F26522]" />
      <p className="text-[#6A6F73] text-sm">Loading quiz...</p>
    </div>
  );

  if (isLocked) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-white border-[#eee] rounded-xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-[#6A6F73]" />
        </div>
        <h2 className="text-2xl font-bold text-[#111] mb-2">Quiz Locked</h2>
        <p className="text-[#6A6F73] mb-8">
          You must complete all video lessons in this module before you can take the quiz.
        </p>
        <Button onClick={() => router.back()} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white">
          Back to Module
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-[#eee] sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#6A6F73]" />
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#F26522] uppercase tracking-wider">Module Quiz</p>
              <h1 className="text-lg font-bold text-[#111] line-clamp-1">{quiz?.title || 'Quiz'}</h1>
            </div>
          </div>
          
          {quizState === 'active' && (
            <div className="flex items-center gap-6">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm",
                timeLeft < 120 ? "bg-red-50 text-red-600 border-red-100 animate-pulse" : "bg-white text-[#111] border-[#eee]"
              )}>
                <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
              </div>
              <Button onClick={() => setShowConfirmModal(true)} size="sm" className="bg-[#F26522] hover:bg-[#D54D10] text-white">
                Submit Quiz
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6 md:py-12">
        {/* State 1: Start */}
        {quizState === 'idle' && (
          <Card className="bg-white border-[#eee] rounded-xl p-10 text-center shadow-sm">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-[#F26522]" />
            </div>
            <h2 className="text-3xl font-bold text-[#111] mb-2">Ready to Start?</h2>
            <p className="text-[#6A6F73] mb-10 max-w-lg mx-auto">
              This quiz will test your knowledge of the topics covered in this module. 
              You'll need a score of 70% or higher to pass.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-10 text-center">
              <div className="p-4 bg-white rounded-lg border border-[#eee]">
                <p className="text-xs text-[#6A6F73] uppercase mb-1">Questions</p>
                <p className="text-xl font-bold text-[#111]">{questions.length}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-[#eee]">
                <p className="text-xs text-[#6A6F73] uppercase mb-1">Time</p>
                <p className="text-xl font-bold text-[#111]">20m</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-[#eee]">
                <p className="text-xs text-[#6A6F73] uppercase mb-1">Pass Mark</p>
                <p className="text-xl font-bold text-[#111]">70%</p>
              </div>
            </div>

            <Button onClick={startQuiz} size="lg" className="px-12 bg-[#F26522] hover:bg-[#D54D10] text-white h-14 text-lg">
              Start Quiz
            </Button>
          </Card>
        )}

        {/* State 2: Active */}
        {quizState === 'active' && questions.length > 0 && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </Badge>
                <span className="text-xs font-bold text-[#6A6F73]">{questions[currentQuestionIndex].marks} Marks</span>
              </div>
              <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
            </div>

            <Card className="bg-white border-[#eee] rounded-xl overflow-hidden shadow-sm">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-[#111] mb-8 leading-relaxed">
                  {questions[currentQuestionIndex].question_text}
                </h3>
                
                <div className="space-y-3">
                  {JSON.parse(questions[currentQuestionIndex].options || '[]').map((opt: string, i: number) => {
                    const isSelected = answers[questions[currentQuestionIndex].id] === opt;
                    return (
                      <button
                        key={i}
                        onClick={() => handleOptionSelect(questions[currentQuestionIndex].id, opt)}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-4",
                          isSelected 
                            ? "bg-orange-50 border-[#F26522] text-[#111]" 
                            : "bg-white border-[#eee] hover:border-[#F26522]/30 text-[#111] hover:bg-white"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 font-bold text-sm",
                          isSelected ? "bg-[#F26522] border-[#F26522] text-white" : "bg-white border-[#eee] text-[#6A6F73]"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="font-medium">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button 
                variant="ghost" 
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="text-[#6A6F73] hover:text-[#111]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button 
                onClick={() => {
                  if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
                  else setShowConfirmModal(true);
                }}
                className="bg-[#111] hover:bg-black text-white px-8"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Submit Quiz' : 'Next'} <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* State 3: Results */}
        {quizState === 'result' && result && (
          <Card className="bg-white border-[#eee] rounded-xl overflow-hidden shadow-sm text-center">
            <div className="h-2 bg-green-500 w-full" />
            <CardContent className="p-12 space-y-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[#111] mb-2">Quiz Complete!</h2>
                <p className="text-[#6A6F73]">Your results have been recorded successfully.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="p-6 bg-white rounded-xl border border-[#eee]">
                  <p className="text-xs text-[#6A6F73] uppercase mb-1">Score</p>
                  <p className="text-3xl font-bold text-[#111]">{result.score}%</p>
                </div>
                <div className="p-6 bg-white rounded-xl border border-[#eee]">
                  <p className="text-xs text-[#6A6F73] uppercase mb-1">Grade</p>
                  <p className="text-3xl font-bold text-green-600">{result.score >= 70 ? 'Pass' : 'Fail'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                <Button 
                  onClick={() => router.push(`/courses/${courseId}`)}
                  className="bg-[#F26522] hover:bg-[#D54D10] text-white px-8"
                >
                  Back to Course
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="border-[#eee] text-[#6A6F73]"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Retry Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Submission Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50">
          <Card className="max-w-md w-full bg-white border-[#eee] rounded-xl p-8 text-center shadow-lg animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#111] mb-2">Submit Quiz?</h3>
            <p className="text-[#6A6F73] mb-8">
              Are you sure you want to submit your answers? You won't be able to change them after this.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Yes, Submit
              </Button>
              <Button variant="ghost" onClick={() => setShowConfirmModal(false)} className="w-full text-[#6A6F73]">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
