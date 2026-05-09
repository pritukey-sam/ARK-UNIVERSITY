'use client';

import React, { useState, useEffect, use, useRef, Suspense } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
 PlayCircle, CheckCircle2, Video, 
 ExternalLink, Loader2, Clock,
 ChevronRight, Bookmark, Trophy,
 FileText, Download, List,
 Play, Info, ArrowLeft,
 Lock, AlertCircle, FileArchive,
 ChevronLeft, Eye, ShieldCheck,
 MoreVertical, Share2, MessageSquare,
 Folder, Settings, Layout
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn, formatDuration } from '@/lib/utils';
import { QuizPreview } from '@/components/quiz/QuizPreview';

declare global {
 interface Window {
 onYouTubeIframeAPIReady: () => void;
 YT: any;
 }
}

// Separate component for the content to use useSearchParams safely with Suspense
function PreviewContent({ id, moduleId }: { id: string, moduleId: string }) {
 const router = useRouter();
 const searchParams = useSearchParams();
 const { user } = useAuth();
 
 const activeTab = searchParams.get('tab') || 'video';
 
 const [module, setModule] = useState<any>(null);
 const [course, setCourse] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [selectedVideo, setSelectedVideo] = useState<any>(null);
 const [quizzesData, setQuizzesData] = useState<Record<number, any>>({});
 const [apiReady, setApiReady] = useState(false);
 const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
 const [videoLoadingError, setVideoLoadingError] = useState<string | null>(null);

 const playerInstance = useRef<any>(null);
 const playerReady = useRef(false);

 useEffect(() => {
 fetchData();
 loadYoutubeAPI();
 window.onYouTubeIframeAPIReady = () => setApiReady(true);
 if (window.YT && window.YT.Player) setApiReady(true);

 return () => {
 if (playerInstance.current) try { playerInstance.current.destroy(); } catch (e) {}
 };
 }, [moduleId]);

 const fetchData = async () => {
 try {
 setLoading(true);
 const [moduleRes, courseRes] = await Promise.all([
 api.common.getModule(parseInt(moduleId)),
 api.common.getCourse(parseInt(id))
 ]);
 setModule(moduleRes);
 setCourse(courseRes);
 
 if (moduleRes.videos?.length > 0) {
 setSelectedVideo(moduleRes.videos[0]);
 }
 
 if (moduleRes.quizzes?.length > 0) {
 const quizPromises = moduleRes.quizzes.map((q: any) => api.common.getQuiz(q.id));
 const quizResults = await Promise.all(quizPromises);
 const quizMap: Record<number, any> = {};
 quizResults.forEach(q => quizMap[q.id] = q);
 setQuizzesData(quizMap);
 }
 } catch (error) {
 toast.error('Failed to load module data');
 } finally {
 setLoading(false);
 }
 };

 const loadYoutubeAPI = () => {
 if (!window.YT) {
 const tag = document.createElement('script');
 tag.src = "https://www.youtube.com/iframe_api";
 const firstScriptTag = document.getElementsByTagName('script')[0];
 firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
 } else if (window.YT && window.YT.Player) setApiReady(true);
 };

  const initPlayer = (video: any) => {
    if (!video || !window.YT || !window.YT.Player || !apiReady) return;
    const videoId = getYouTubeId(video.video_url);
    if (!videoId) return;

    if (playerInstance.current) {
      try {
        if (playerReady.current) {
          playerInstance.current.loadVideoById(videoId);
          return;
        }
        playerInstance.current.destroy();
      } catch (e) {
        console.error("Player cleanup error:", e);
      }
      playerInstance.current = null;
      playerReady.current = false;
    }

    try {
      playerInstance.current = new window.YT.Player('youtube-player-element', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 
          'playsinline': 1,
          'modestbranding': 1,
          'rel': 0, 
          'autoplay': 1,
          'enablejsapi': 1,
          'showinfo': 0,
          'controls': 1
        },
        events: {
          'onReady': () => {
            playerReady.current = true;
          }
        }
      });
    } catch (e) {
      console.error("YouTube Init Error:", e);
    }
  };

 useEffect(() => {
 if (selectedVideo && selectedVideo.video_url && activeTab === 'video') {
 setSecureVideoUrl(null);
 setVideoLoadingError(null);
 if (getYouTubeId(selectedVideo.video_url)) {
 setSecureVideoUrl(selectedVideo.video_url);
 } else {
 api.employee.getVideoUrl(selectedVideo.id)
 .then(res => setSecureVideoUrl(res.video_url))
 .catch((err) => setVideoLoadingError(err.message || "Access denied."));
 }
 }
 }, [selectedVideo, activeTab]);

  useEffect(() => {
    if (secureVideoUrl && apiReady && activeTab === 'video' && getYouTubeId(secureVideoUrl)) {
      const timer = setTimeout(() => initPlayer(selectedVideo), 100);
      return () => clearTimeout(timer);
    }
  }, [secureVideoUrl, apiReady, selectedVideo, activeTab]);

 const getYouTubeId = (url: string) => {
 if (!url) return null;
 const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
 return (match && match[2].length === 11) ? match[2] : null;
 };

 const handleTabChange = (tabId: string) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set('tab', tabId);
 router.push(`?${params.toString()}`, { scroll: false });
 };

 if (loading || !module) return (
 <div className="flex flex-col items-center justify-center min-h-[80vh] bg-white space-y-4">
 <Loader2 className="w-10 h-10 text-[#F26522] animate-spin" />
 <p className="text-xs font-bold text-[#6A6F73] uppercase">Entering Preview Mode...</p>
 </div>
 );

 return (
 <div className="min-h-screen bg-white font-sans text-[#111]">
 
 {/* 1. CLEAN REFINED HEADER */}
 <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6 sticky top-0 z-[100] shadow-sm">
 <div className="flex items-center gap-6 w-full max-w-7xl mx-auto">
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={() => router.push(`/courses/${id}/modules/${moduleId}/manage`)}
 className="text-gray-500 hover:text-[#111] hover:bg-gray-100 rounded-lg font-bold text-[11px] uppercase tracking-wider gap-2 px-3"
 >
 <ArrowLeft className="w-4 h-4" /> Exit Preview
 </Button>

 <div className="h-4 w-px bg-gray-200" />

 <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider overflow-hidden">
 <span className="truncate max-w-[200px]">{course?.title}</span>
 <ChevronRight className="w-3 h-3 opacity-30 shrink-0" />
 <span className="text-[#111] truncate">{module.title}</span>
 </div>

 <div className="flex-1" />

 <div className="flex items-center gap-4">
 <Badge variant="secondary" className="bg-orange-50 text-[#F26522] border-orange-100 px-3 py-1 rounded-full text-xs font-bold uppercase gap-2">
 <Eye className="w-3.5 h-3.5" /> Read-Only Preview
 </Badge>
 <Button 
 size="sm"
 onClick={() => router.push(`/courses/${id}/modules/${moduleId}/manage`)}
 className="bg-[#111] hover:bg-black text-white rounded-lg h-9 px-4 font-bold text-[11px] uppercase tracking-wider shadow-sm"
 >
 Manage
 </Button>
 </div>
 </div>
 </header>

 {/* 2. MAIN CONTENT WRAPPER - MATCHING MANAGE PAGE WIDTH */}
 <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
 <div className="flex flex-col lg:flex-row gap-8">
 
 {/* LEFT: MAIN PREVIEW AREA */}
 <div className="flex-1 min-w-0 space-y-6">
 
 {/* MODULE HEADER CARD - MATCHING MANAGE STYLE */}
 <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
 <div className="p-8 space-y-6">
 <div className="flex items-start justify-between gap-6">
 <div className="space-y-2">
 <h1 className="text-2xl font-bold text-[#111] tracking-tight">{module.title}</h1>
 </div>
 <div className="shrink-0 w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
 <Layout className="w-6 h-6 text-gray-400" />
 </div>
 </div>
 </div>

 {/* TABS AT TOP - MATCHING MANAGE INTERFACE */}
 <div className="flex overflow-x-auto hide-scrollbar gap-2 px-8 border-b border-gray-100">
 {[
 { id: 'video', label: 'Video', icon: Video },
 { id: 'notes', label: 'Notes', icon: FileText },
 { id: 'task', label: 'Task', icon: Folder },
 { id: 'quiz', label: 'Quiz', icon: Trophy }
 ].map(t => (
 <button
 key={t.id}
 onClick={() => handleTabChange(t.id)}
 className={cn(
 "flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase border-b-2 transition-all whitespace-nowrap",
 activeTab === t.id 
 ? "border-[#F26522] text-[#F26522]" 
 : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200"
 )}
 >
 <t.icon className="w-4 h-4" /> {t.label}
 </button>
 ))}
 </div>

 {/* PREVIEW CONTENT CARD */}
 <div className="p-8 min-h-[500px]">
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>}>
 
 {/* VIDEO TAB CONTENT */}
 {activeTab === 'video' && (
 <div className="space-y-8 animate-in fade-in duration-500">
 <div className="relative aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-lg border border-gray-200 mx-auto max-w-4xl">
 {!selectedVideo ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4">
 <Video className="w-12 h-12 opacity-20" />
 <p className="text-xs font-bold uppercase opacity-50">Select a video to preview</p>
 </div>
 ) : videoLoadingError ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 space-y-4">
 <AlertCircle className="w-12 h-12 opacity-30" />
 <p className="text-xs font-bold uppercase">{videoLoadingError}</p>
 </div>
 ) : !secureVideoUrl ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-6">
 <Loader2 className="w-10 h-10 animate-spin" />
 <p className="text-xs font-bold uppercase animate-pulse">Initializing Stream...</p>
 </div>
 ) : getYouTubeId(secureVideoUrl) ? (
 <div id="player-container" className="w-full h-full">
 <div id="youtube-player-element" className="w-full h-full" />
 </div>
 ) : (
 <video 
 key={secureVideoUrl}
 src={secureVideoUrl}
 className="w-full h-full object-contain"
 controls
 autoPlay
 playsInline
 controlsList="nodownload"
 >
 Your browser does not support the video tag.
 </video>
 )}
 </div>

 <div className="max-w-4xl mx-auto space-y-6 pt-4">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-bold text-[#111]">{selectedVideo?.title}</h2>
 <Badge variant="outline" className="text-xs font-bold uppercase border-gray-200 text-gray-500 px-3 py-1">
 {formatDuration(selectedVideo?.duration_seconds || 0)}
 </Badge>
 </div>
 <p className="text-sm text-gray-600 leading-loose opacity-80">
 {selectedVideo?.description || "In this lesson, we examine the technical implementations and conceptual frameworks required for this module."}
 </p>
 </div>
 </div>
 )}

 {/* NOTES TAB CONTENT */}
 {activeTab === 'notes' && (
 <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
 <div className="flex items-center justify-between pb-6 border-b border-gray-100">
 <h3 className="text-lg font-bold text-[#111]">Document Verification</h3>
 <span className="text-xs font-bold text-gray-400 uppercase">{module.notes?.length || 0} Assets</span>
 </div>
 <div className="grid grid-cols-1 gap-6">
 {module.notes?.length > 0 ? (
 module.notes.map((note: any, i: number) => (
 <div key={note.id} className="group p-6 border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all bg-white flex items-center justify-between">
 <div className="flex items-center gap-5">
 <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
 <FileArchive className="w-7 h-7" />
 </div>
 <div>
 <h4 className="text-base font-bold text-[#111]">Document {i + 1}</h4>
 <p className="text-xs text-gray-400 font-bold uppercase mt-1">Resource • {note.file_type?.toUpperCase() || 'PDF'}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <a href={note.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg font-bold text-xs uppercase text-gray-500 hover:text-blue-600")}>View</a>
 <a href={note.file_url} download className={cn(buttonVariants({ variant: "outline", size: "icon" }), "w-10 h-10 rounded-lg border-gray-100")}><Download className="w-4 h-4" /></a>
 </div>
 </div>
 ))
 ) : (
 <div className="py-20 text-center space-y-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
 <FileText className="w-12 h-12 mx-auto text-gray-200" />
 <p className="text-xs font-bold text-gray-400 uppercase">No documentation uploaded</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* TASK TAB CONTENT */}
 {activeTab === 'task' && (
 <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
 <div className="flex items-center justify-between pb-6 border-b border-gray-100">
 <h3 className="text-lg font-bold text-[#111]">Deliverable Preview</h3>
 <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-100 bg-emerald-50 px-3">Structure Check Only</Badge>
 </div>
 {module.assignments?.length > 0 ? (
 module.assignments.map((task: any) => (
 <Card key={task.id} className="border border-gray-100 rounded-2xl p-8 bg-white relative overflow-hidden group shadow-sm">
 <div className="space-y-8">
 <div className="flex items-center gap-5">
 <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
 <Bookmark className="w-7 h-7" />
 </div>
 <div>
 <h4 className="text-xl font-bold text-[#111]">{task.title}</h4>
 <p className="text-xs font-bold text-gray-400 uppercase mt-1">Assignment Guidelines</p>
 </div>
 </div>
 <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
 <p className="text-sm text-gray-600 leading-relaxed">
 This assignment requires students to submit a project file. Admins can verify the source materials below.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <a href={task.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost" }), "rounded-xl h-11 px-6 font-bold text-xs uppercase text-gray-500 hover:text-emerald-600 transition-colors flex items-center gap-2")}>
 <Eye className="w-4 h-4" /> View Instructions
 </a>
 <a href={task.file_url} download className={cn(buttonVariants({ variant: "outline" }), "border-gray-200 rounded-xl h-11 px-6 font-bold text-xs uppercase gap-2 flex items-center justify-center")}>
 <Download className="w-4 h-4" /> Download Resource Pack
 </a>
 </div>
 </div>
 </Card>
 ))
 ) : (
 <div className="py-20 text-center space-y-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
 <Bookmark className="w-12 h-12 mx-auto text-gray-200" />
 <p className="text-xs font-bold text-gray-400 uppercase">No tasks defined</p>
 </div>
 )}
 </div>
 )}

 {/* QUIZ TAB CONTENT */}
 {activeTab === 'quiz' && (
 <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
 {module.quizzes?.length > 0 ? (
 module.quizzes.map((quiz: any) => (
 <div key={quiz.id} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
 {quizzesData[quiz.id] ? (
 <QuizPreview quiz={quizzesData[quiz.id]} />
 ) : (
 <div className="flex flex-col items-center justify-center py-20 space-y-4">
 <Loader2 className="w-8 h-8 text-[#F26522] animate-spin" />
 <p className="text-xs font-bold text-gray-400 uppercase animate-pulse">Loading Assessment...</p>
 </div>
 )}
 </div>
 ))
 ) : (
 <div className="py-20 text-center space-y-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
 <Trophy className="w-12 h-12 mx-auto text-gray-200" />
 <p className="text-xs font-bold text-gray-400 uppercase">No quizzes created</p>
 </div>
 )}
 </div>
 )}
 </Suspense>
 </div>
 </Card>
 </div>

 {/* RIGHT SIDEBAR: CLEAN PLAYLIST (IF VIDEO TAB) */}
 {activeTab === 'video' && (
 <aside className="w-full lg:w-[350px] shrink-0 space-y-6">
 <div className="sticky top-24">
 <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
 <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
 <h3 className="text-[11px] font-bold text-[#111] uppercase">Curriculum</h3>
 <Badge className="bg-gray-200 text-gray-600 border-none rounded-lg font-bold text-xs px-2 py-0.5">
 {module.videos?.length || 0} Lessons
 </Badge>
 </div>
 <div className="p-3 max-h-[600px] overflow-y-auto custom-scrollbar space-y-1">
 {module.videos?.length > 0 ? (
 module.videos.map((video: any, vIdx: number) => {
 const isSelected = selectedVideo?.id === video.id;
 return (
 <button 
 key={video.id}
 onClick={() => setSelectedVideo(video)}
 className={cn(
 "w-full group p-3 rounded-xl transition-all flex gap-4 text-left border",
 isSelected 
 ? "bg-orange-50/50 border-orange-100" 
 : "bg-transparent border-transparent hover:bg-gray-50"
 )}
 >
 <div className="relative w-20 aspect-video rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-200/50">
 <div className="absolute inset-0 flex items-center justify-center">
 {isSelected ? (
 <div className="w-7 h-7 rounded-full bg-[#F26522] flex items-center justify-center text-white shadow-lg">
 <Play className="w-3 h-3 fill-current" />
 </div>
 ) : (
 <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
 )}
 </div>
 </div>

 <div className="flex-1 min-w-0 flex flex-col justify-center">
 <h4 className={cn(
 "text-[11px] font-bold leading-snug line-clamp-2 transition-colors uppercase tracking-tight",
 isSelected ? "text-[#F26522]" : "text-gray-600 group-hover:text-[#111]"
 )}>
 {video.title}
 </h4>
 <div className="flex items-center gap-1.5 mt-1.5">
 <Clock className="w-3 h-3 text-gray-300" />
 <span className="text-xs font-bold text-gray-400 uppercase">{formatDuration(video.duration_seconds || 0)}</span>
 </div>
 </div>
 </button>
 );
 })
 ) : (
 <div className="py-10 text-center">
 <Video className="w-8 h-8 mx-auto text-gray-200 mb-2" />
 <p className="text-xs font-bold text-gray-400 uppercase">No videos found</p>
 </div>
 )}
 </div>
 <div className="p-4 border-t border-gray-100 bg-gray-50/50">
 <Button 
 variant="ghost" 
 onClick={() => router.push(`/courses/${id}`)}
 className="w-full h-10 rounded-lg text-gray-400 hover:text-[#F26522] hover:bg-white font-bold text-xs uppercase gap-2"
 >
 <ArrowLeft className="w-3.5 h-3.5" /> Back to Course
 </Button>
 </div>
 </Card>
 </div>
 </aside>
 )}
 </div>
 </div>
 </div>
 );
}

export default function ModulePreviewPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
 const { id, moduleId } = use(params);
 
 return (
 <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-[#F26522]" /></div>}>
 <PreviewContent id={id} moduleId={moduleId} />
 </Suspense>
 );
}
