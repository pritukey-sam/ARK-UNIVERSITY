'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { 
 ChevronRight, PlayCircle, FileText, Trophy, 
 Bookmark, CheckCircle2, Circle, ArrowLeft,
 Home, Book, Sparkles, Bot, Zap, Clock, Info,
 User, X, Send, GraduationCap, Lock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, formatDuration } from '@/lib/utils';

export default function ModuleLayout({ 
 children, 
 params 
}: { 
 children: React.ReactNode, 
 params: Promise<{ id: string, moduleId: string }> 
}) {
 const { id, moduleId } = use(params);
 const pathname = usePathname();
 const router = useRouter();
 const { user: currentUser } = useAuth();
 const [allModules, setAllModules] = useState<any[]>([]);
 const [module, setModule] = useState<any>(null);
 const [course, setCourse] = useState<any>(null);
 const [progress, setProgress] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => { fetchData(); }, [moduleId, pathname]);

 const fetchData = async () => {
 const courseIdNum = parseInt(id);
 const moduleIdNum = parseInt(moduleId);
 
 if (isNaN(courseIdNum) || isNaN(moduleIdNum)) {
 setLoading(false);
 return;
 }

 try {
 setLoading(true);
 const [moduleData, courseData, progressData] = await Promise.all([
 api.common.getModule(moduleIdNum),
 api.common.getCourse(courseIdNum),
 api.employee.getModuleProgressDetail(courseIdNum, moduleIdNum)
 ]);
 setModule(moduleData);
 setCourse(courseData);
 setProgress(progressData);
 setAllModules(courseData.modules || []);
 } catch (error) { console.error(error); }
 finally { setLoading(false); }
 };

 const isAdmin = currentUser?.role === 'admin';
 const isManagePage = pathname.includes('/manage');
 const isPreviewPage = pathname.includes('/preview');

 useEffect(() => {
 const isActuallyAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
 if (isActuallyAdmin && !isManagePage && !isPreviewPage && !loading) {
 router.replace(`/courses/${id}/modules/${moduleId}/manage`);
 }
 }, [currentUser, isManagePage, isPreviewPage, loading, id, moduleId, router]);

 if (loading && !module) return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-6">
 <div className="w-16 h-16 border-4 border-t-[#F26522] border-muted rounded-full animate-spin" />
 <p className="text-muted-foreground font-bold uppercase text-xs">Syncing Unit</p>
 </div>
 );

 const navItems = [
 { label: 'Video', icon: PlayCircle, path: `/courses/${id}/modules/${moduleId}/video`, completed: progress?.video_completed },
 { label: 'Notes', icon: FileText, path: `/courses/${id}/modules/${moduleId}/materials`, completed: progress?.notes_completed },
 { label: 'Deliverable', icon: Bookmark, path: `/courses/${id}/modules/${moduleId}/assignment`, completed: progress?.assignment_submitted },
 { label: 'Quiz', icon: Trophy, path: `/courses/${id}/modules/${moduleId}/quiz`, completed: progress?.quiz_completed },
 ];

 if (isManagePage || isPreviewPage) return <>{children}</>;

 const isQuizPage = pathname.endsWith('/quiz');

 return (
 <>
 <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
 {!isQuizPage && (
 <nav className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
 <Link href="/courses" className="hover:text-[#F26522] transition-colors">Courses</Link>
 <ChevronRight className="w-4 h-4" />
 <Link href={`/courses/${id}`} className="hover:text-[#F26522] transition-colors">{course?.title}</Link>
 <ChevronRight className="w-4 h-4" />
 <span className="text-foreground">{module?.title}</span>
 </nav>
 )}

 <div className="flex flex-col lg:flex-row gap-8">
 
 {/* LEFT: MAIN CONTENT (70%) */}
 <div className="flex-1 lg:max-w-[70%] min-w-0 space-y-4">
 {/* Tabs */}
 {!isQuizPage && (
 <div className="flex items-center gap-6 border-b border-border">
 {navItems.map((item) => {
 const isActive = pathname === item.path;
 return (
 <Link key={item.path} href={item.path}>
 <div className={cn(
 "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
 isActive 
 ? "border-[#F26522] text-[#F26522]" 
 : "border-transparent text-muted-foreground hover:text-foreground"
 )}>
 <item.icon className="w-4 h-4" />
 {item.label === 'Deliverable' ? 'Task' : item.label}
 {item.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
 </div>
 </Link>
 )
 })}
 </div>
 )}
 
 {/* Page Content */}
 <div className="pt-2">
 {children}
 </div>
 </div>

 {/* RIGHT: SIDEBAR (30%) */}
 {!isQuizPage && (
 <div className="w-full lg:w-[30%] flex-shrink-0 space-y-6">
 <div className="bg-card border border-border rounded-lg overflow-hidden">
 <div className="p-4 border-b border-border bg-muted/50">
 <h3 className="font-semibold text-foreground">Course Content</h3>
 </div>
 <div className="divide-y divide-border">
 {allModules.map((m, idx) => {
 const isCurrent = parseInt(moduleId) === m.id;
 const isLocked = idx > 0 && !(allModules[idx-1].progress?.is_completed);
 
 return (
 <div key={m.id}>
 <Link href={isLocked ? '#' : `/courses/${id}/modules/${m.id}/video`} className="block">
 <div className={cn(
 "p-4 transition-colors flex gap-3",
 isCurrent 
 ? "bg-muted" 
 : isLocked 
 ? "opacity-50 cursor-not-allowed bg-card"
 : "hover:bg-muted bg-card"
 )}>
 <div className="mt-0.5">
 {isLocked ? (
 <Lock className="w-4 h-4 text-muted-foreground/50" />
 ) : m.progress?.is_completed ? (
 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
 ) : (
 <Circle className="w-4 h-4 text-muted-foreground/30" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className={cn("text-sm font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
 {idx + 1}. {m.title}
 </h4>
 <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
 <span className="flex items-center gap-1">
 <PlayCircle className="w-3 h-3" /> {m.video_count || 0}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" /> {formatDuration(m.duration_seconds || 0)}
 </span>
 </div>
 </div>
 </div>
 </Link>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 {!isQuizPage && <AIAssistant moduleId={parseInt(moduleId)} />}
 </>
 );
}

function AIAssistant({ moduleId }: { moduleId: number }) {
 const [open, setOpen] = useState(false);
 const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
 { role: 'ai', content: "Hi! I'm Lumina AI. I have the full context of this unit. How can I assist your learning today?" }
 ]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);

 const handleSend = async () => {
 if (!input.trim() || isLoading) return;
 const userMsg = input.trim();
 setInput('');
 setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
 setIsLoading(true);
 try {
 const data = await api.ai.ask(moduleId, userMsg);
 setMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
 } catch (e: any) {
 toast.error('AI failed to respond');
 setMessages(prev => [...prev, { role: 'ai', content: 'Connection error. Please try again.' }]);
 } finally { setIsLoading(false); }
 };

 return (
 <>
 <button 
 onClick={() => setOpen(true)}
 className={cn(
 "fixed bottom-10 right-10 w-20 h-20 bg-gradient-to-tr from-[#F26522] to-[#FF8C00] rounded-xl flex items-center justify-center text-white shadow-sm active:scale-95 transition-all z-40",
 open ? 'scale-0' : 'scale-100'
 )}
 >
 <Bot className="w-10 h-10" />
 </button>

 <div className={cn(
 "fixed bottom-4 right-4 md:bottom-10 md:right-10 w-[calc(100%-2rem)] md:w-[450px] h-[700px] max-h-[85vh] bg-card border border-border rounded-xl shadow-sm flex flex-col z-50 transform transition-all duration-500 origin-bottom-right",
 open ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'
 )}>
 <div className="flex items-center justify-between p-8 border-b border-border bg-muted/30 rounded-t-[3rem]">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-[#F26522]/10 rounded-2xl flex items-center justify-center text-[#F26522] shadow-inner">
 <Bot className="w-7 h-7 fill-current" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-foreground tracking-tight">Lumina AI</h3>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-xs text-emerald-600 font-bold uppercase">Active Analysis</span>
 </div>
 </div>
 </div>
 <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-card">
 {messages.map((msg, i) => (
 <div key={i} className={cn("flex gap-4 max-w-[90%]", msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
 <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all", msg.role === 'user' ? 'bg-foreground text-background' : 'bg-[#F26522] text-white')}>
 {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5 fill-current" />}
 </div>
 <div className={cn(
 "p-5 rounded-xl text-sm leading-relaxed font-medium shadow-sm",
 msg.role === 'user' ? 'bg-muted text-foreground rounded-tr-sm' : 'bg-card border border-border text-foreground rounded-tl-sm'
 )}>
 {msg.content}
 </div>
 </div>
 ))}
 {isLoading && (
 <div className="flex gap-4 max-w-[90%] animate-pulse">
 <div className="w-10 h-10 rounded-2xl bg-[#F26522]/50 flex items-center justify-center shrink-0 shadow-sm text-white">
 <Bot className="w-5 h-5" />
 </div>
 <div className="bg-muted p-5 rounded-xl rounded-tl-sm w-20 h-14 flex items-center justify-center gap-1.5 border border-border">
 <div className="w-2 h-2 bg-[#F26522] rounded-full animate-bounce" />
 <div className="w-2 h-2 bg-[#F26522] rounded-full animate-bounce [animation-delay:0.2s]" />
 <div className="w-2 h-2 bg-[#F26522] rounded-full animate-bounce [animation-delay:0.4s]" />
 </div>
 </div>
 )}
 </div>

 <div className="p-6 border-t border-border bg-muted/20 rounded-b-[3rem]">
 <div className="relative flex items-center group">
 <input 
 type="text" 
 value={input} 
 onChange={e => setInput(e.target.value)} 
 onKeyDown={e => e.key === 'Enter' && handleSend()} 
 placeholder="Synthesize knowledge..." 
 className="w-full h-16 bg-card border-2 border-border rounded-xl pl-6 pr-16 text-foreground font-bold focus:outline-none focus:border-[#F26522] focus:ring-4 focus:ring-[#F26522]/5 transition-all shadow-sm group-hover:border-[#F26522]/30" 
 />
 <button 
 onClick={handleSend} 
 disabled={!input.trim() || isLoading} 
 className="absolute right-2.5 w-11 h-11 bg-[#F26522] hover:bg-[#D54D10] rounded-xl flex items-center justify-center text-white transition-all shadow-lg disabled:opacity-50"
 >
 <Send className="w-5 h-5" />
 </button>
 </div>
 </div>
 </div>
 </>
 );
}
