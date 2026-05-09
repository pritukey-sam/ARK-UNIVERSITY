'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
 PlayCircle, CheckCircle2, Video, 
 ExternalLink, Loader2, Zap, ArrowRight, Lock, Clock,
 ChevronRight, Bookmark, ShieldCheck, Play, Trophy,
 List, GraduationCap, ChevronLeft, Volume2, Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn, formatDuration } from '@/lib/utils';

declare global {
 interface Window {
 onYouTubeIframeAPIReady: () => void;
 YT: any;
 }
}

export default function ModuleVideoPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
 const { id, moduleId } = use(params);
 const router = useRouter();
 const [module, setModule] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [selectedVideo, setSelectedVideo] = useState<any>(null);
 const [videoProgress, setVideoProgress] = useState<any[]>([]);
 const [quizUnlocked, setQuizUnlocked] = useState(false);
 const [apiReady, setApiReady] = useState(false);
 const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
 const [videoLoadingError, setVideoLoadingError] = useState<string | null>(null);
 
 const saveInterval = useRef<NodeJS.Timeout | null>(null);
 const playerInstance = useRef<any>(null);
 const playerReady = useRef(false);

 useEffect(() => {
 fetchData(true);
 loadYoutubeAPI();
 window.onYouTubeIframeAPIReady = () => setApiReady(true);
 if (window.YT && window.YT.Player) setApiReady(true);

 return () => {
 if (saveInterval.current) clearInterval(saveInterval.current);
 if (playerInstance.current) try { playerInstance.current.destroy(); } catch (e) {}
 };
 }, [moduleId]);

 const fetchData = async (isInitial = false) => {
 const courseIdNum = parseInt(id);
 const moduleIdNum = parseInt(moduleId);
 
 if (isNaN(courseIdNum) || isNaN(moduleIdNum)) {
 if (isInitial) setLoading(false);
 return;
 }

 try {
 if (isInitial) setLoading(true);
 const [moduleData, progressData] = await Promise.all([
 api.common.getModule(moduleIdNum),
 api.employee.getModuleProgressDetail(courseIdNum, moduleIdNum)
 ]);
 setModule(moduleData);
 setVideoProgress(progressData.videos || []);
 setQuizUnlocked(progressData.quiz_unlocked);
 
 if (isInitial && moduleData.videos?.length > 0) {
 const firstIncomplete = moduleData.videos.find((v: any) => 
 !(progressData.videos || []).find((vp: any) => vp.video_id === v.id)?.is_completed
 );
 setSelectedVideo(firstIncomplete || moduleData.videos[0]);
 }
 } catch (error) { console.error(error); }
 finally { if (isInitial) setLoading(false); }
 };

 const handleVideoEnd = async (video: any) => {
 await api.employee.updateVideoProgress({ 
 video_id: video.id, 
 watched_seconds: video.duration_seconds || 10000 
 });
 const newProgress = await api.employee.getModuleProgressDetail(parseInt(id), parseInt(moduleId));
 setVideoProgress(newProgress.videos || []);
 setQuizUnlocked(newProgress.quiz_unlocked);

 const currentIndex = module.videos.findIndex((v: any) => v.id === video.id);
 if (currentIndex < module.videos.length - 1) {
 const nextVideo = module.videos[currentIndex + 1];
 toast.success(`Up Next: ${nextVideo.title}`, { position: 'bottom-center' });
 setSelectedVideo(nextVideo);
 } else {
 toast.success("All lectures completed!", { position: 'bottom-center' });
 }
 };

 const loadYoutubeAPI = () => {
 if (window.YT && window.YT.Player) return;
 const tag = document.createElement('script');
 tag.src = "https://www.youtube.com/iframe_api";
 const firstScriptTag = document.getElementsByTagName('script')[0];
 firstScriptTag.parent?.insertBefore(tag, firstScriptTag);
 };

 // YouTube logic...
 useEffect(() => {
 if (apiReady && selectedVideo?.is_youtube && selectedVideo.video_url) {
 const vidId = getYTId(selectedVideo.video_url);
 if (vidId) {
 if (playerInstance.current && playerReady.current) {
 playerInstance.current.loadVideoById(vidId);
 } else {
 playerInstance.current = new window.YT.Player('yt-player', {
 videoId: vidId,
 playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0 },
 events: {
 'onReady': () => { playerReady.current = true; },
 'onStateChange': (e: any) => {
 if (e.data === window.YT.PlayerState.ENDED) handleVideoEnd(selectedVideo);
 }
 }
 });
 }
 }
 }
 }, [apiReady, selectedVideo]);

 const getYTId = (url: string) => {
 const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
 const match = url.match(regExp);
 return (match && match[2].length === 11) ? match[2] : null;
 };

 const getProgress = (vidId: number) => videoProgress.find(p => p.video_id === vidId);

 if (loading) return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-8">
 <div className="relative">
 <div className="w-24 h-24 border-4 border-muted border-t-[#F26522] rounded-full animate-spin" />
 <div className="absolute inset-0 flex items-center justify-center">
 <Video className="w-10 h-10 text-[#F26522] animate-pulse" />
 </div>
 </div>
 <p className="text-muted-foreground font-bold uppercase text-xs">Initializing Media Session</p>
 </div>
 );

 if (!module) return null;

 return (
 <div className="animate-in fade-in duration-700 pb-20">
 {/* 1. TOP NAVIGATION / BREADCRUMBS */}
 <nav className="bg-card border-b border-border py-6 px-6 md:px-12 sticky top-0 z-50 backdrop-blur-3xl bg-card/80">
 <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-6">
 <Link href={`/courses/${id}`}>
 <Button variant="ghost" className="p-3 rounded-2xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
 <ChevronLeft className="w-6 h-6" />
 </Button>
 </Link>
 <div className="h-10 w-px bg-border hidden md:block" />
 <div className="space-y-1">
 <p className="text-xs font-bold uppercase text-[#F26522]">Course Matrix: Unit Viewer</p>
 <h1 className="text-xl font-bold text-foreground tracking-tight line-clamp-1">{module.title}</h1>
 </div>
 </div>
 
 <div className="flex items-center gap-6">
 <div className="flex flex-col items-end gap-1.5 hidden sm:flex">
 <div className="flex items-center gap-2">
 <p className="text-xs font-bold uppercase text-muted-foreground">Progress</p>
 <span className="text-xs font-bold text-[#F26522] tabular-nums">{Math.round((videoProgress.filter(p => p.is_completed).length / module.videos.length) * 100 || 0)}%</span>
 </div>
 <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden border border-border shadow-inner">
 <div 
 className="h-full bg-[#F26522] transition-all duration-1000" 
 style={{ width: `${(videoProgress.filter(p => p.is_completed).length / module.videos.length) * 100 || 0}%` }} 
 />
 </div>
 </div>
 {quizUnlocked && (
 <Link href={`/courses/${id}/modules/${moduleId}/quiz`}>
 <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-6 rounded-xl font-bold uppercase text-xs gap-3 shadow-xl shadow-emerald-500/20 border-none transition-all active:scale-95 animate-pulse">
 Initiate Assessment <Trophy className="w-4 h-4" />
 </Button>
 </Link>
 )}
 </div>
 </div>
 </nav>

 <div className="max-w-[1600px] mx-auto p-6 md:p-12">
 <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
 
 {/* 2. VIDEO PLAYER AREA */}
 <div className="xl:col-span-8 space-y-10">
 <Card className="bg-black rounded-xl overflow-hidden shadow-sm border border-white/5 relative group">
 <div className="aspect-video w-full bg-[#080810] flex items-center justify-center relative">
 {selectedVideo?.is_youtube ? (
 <div id="yt-player" className="w-full h-full" />
 ) : selectedVideo?.video_url ? (
 <video 
 src={selectedVideo.video_url} 
 className="w-full h-full" 
 controls 
 autoPlay
 onEnded={() => handleVideoEnd(selectedVideo)}
 />
 ) : (
 <div className="flex flex-col items-center gap-6 text-muted-foreground p-20 text-center">
 <div className="w-24 h-24 rounded-xl bg-white/5 flex items-center justify-center">
 <Play className="w-12 h-12 opacity-20" />
 </div>
 <div>
 <p className="text-xl font-bold text-white/50 tracking-tight">Select Asset from Queue</p>
 <p className="text-xs uppercase mt-2 opacity-30 font-bold">Video assets will appear here</p>
 </div>
 </div>
 )}
 </div>
 
 {/* Player Overlay Controls (Aesthetic) */}
 <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-10 pointer-events-none">
 <div className="flex items-center gap-4">
 <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10"><Volume2 className="w-5 h-5 text-white" /></div>
 <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10"><Settings className="w-5 h-5 text-white" /></div>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-white uppercase">Encrypted Stream</span>
 <ShieldCheck className="w-4 h-4 text-emerald-500" />
 </div>
 </div>
 </Card>

 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-3xl font-bold text-foreground tracking-tight">{selectedVideo?.title || 'System Terminal'}</h2>
 <p className="text-muted-foreground mt-3 font-medium text-lg leading-relaxed max-w-2xl">{selectedVideo?.description || module.description}</p>
 </div>
 <Button variant="outline" className="p-4 h-14 w-14 rounded-2xl border-border bg-card shadow-sm hover:bg-muted text-[#F26522]">
 <Bookmark className="w-6 h-6" />
 </Button>
 </div>
 
 <div className="flex flex-wrap gap-4 pt-4">
 <Badge className="bg-blue-500/10 text-blue-500 border-none px-4 py-1.5 rounded-xl text-xs font-bold uppercase">Lecture: {selectedVideo?.id || '00'}</Badge>
 <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-4 py-1.5 rounded-xl text-xs font-bold uppercase">{selectedVideo?.is_youtube ? 'YT Stream' : 'System Native'}</Badge>
 </div>
 </div>
 </div>

 {/* 3. PLAYLIST / LECTURE QUEUE */}
 <div className="xl:col-span-4">
 <Card className="bg-card border-border rounded-xl shadow-sm overflow-hidden sticky top-32">
 <CardContent className="p-0">
 <div className="p-10 border-b border-border bg-muted/30 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/10 shadow-sm"><List className="w-6 h-6" /></div>
 <CardTitle className="text-foreground font-bold text-xl tracking-tight">Curriculum Queue</CardTitle>
 </div>
 <Badge className="bg-muted text-muted-foreground border border-border px-3 py-1 rounded-lg text-xs font-bold uppercase tabular-nums">{module.videos?.length || 0} Tracks</Badge>
 </div>
 
 <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto saas-scrollbar">
 {module.videos?.length === 0 ? (
 <div className="py-20 text-center text-muted-foreground font-bold uppercase opacity-30 text-xs">No assets createed</div>
 ) : module.videos.map((vid: any, i: number) => {
 const prog = getProgress(vid.id);
 const isSelected = selectedVideo?.id === vid.id;
 return (
 <button 
 key={vid.id}
 onClick={() => setSelectedVideo(vid)}
 className={cn(
 "w-full text-left p-6 rounded-xl transition-all duration-500 relative group flex items-start gap-6",
 isSelected ? "bg-[#F26522] text-white shadow-sm scale-[1.02]" : "hover:bg-muted text-foreground"
 )}
 >
 {isSelected && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />}
 <div className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-inner border",
 isSelected ? "bg-white/20 border-white/20 rotate-12" : "bg-muted border-border group-hover:bg-card"
 )}>
 {prog?.is_completed ? <CheckCircle2 className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-bold line-clamp-1 group-hover:tracking-tight transition-all">{vid.title}</h4>
 <div className="flex items-center gap-3 mt-2">
 <p className={cn(
 "text-xs font-bold uppercase opacity-60",
 isSelected ? "text-white" : "text-muted-foreground"
 )}>{formatDuration(vid.duration_seconds || 0)}</p>
 {prog?.is_completed && <Badge className="bg-emerald-500/20 text-emerald-100 border-none text-[8px] font-bold uppercase px-2 py-0.5 rounded-md">Synced</Badge>}
 </div>
 </div>
 </button>
 );
 })}
 </div>
 
 <div className="p-8 border-t border-border bg-muted/30">
 <Link href={`/courses/${id}/modules/${moduleId}/quiz`}>
 <Button 
 disabled={!quizUnlocked}
 className={cn(
 "w-full h-14 rounded-2xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-3 border-none",
 quizUnlocked ? "bg-[#F26522] text-white shadow-xl active:scale-95" : "bg-muted text-muted-foreground cursor-not-allowed"
 )}
 >
 {quizUnlocked ? (
 <>Commence Assessment <ChevronRight className="w-5 h-5" /></>
 ) : (
 <><Lock className="w-4 h-4" /> Assessment Locked</>
 )}
 </Button>
 </Link>
 {!quizUnlocked && (
 <p className="text-xs text-muted-foreground text-center mt-4 font-bold uppercase opacity-40">Complete all sessions to unlock assessment</p>
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 </div>
 );
}
