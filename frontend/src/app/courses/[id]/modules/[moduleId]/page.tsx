// Force Rebuild - Triggered stability sync
'use client';

import React, { useState, useEffect, use, useRef, Suspense, useCallback } from 'react';
import { api } from '@/lib/api';
import BackNavigation from '@/components/common/BackNavigation';
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
  Folder, Settings, Layout, Check, RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { cn, formatDuration } from '@/lib/utils';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

function LearnContent({ id, moduleId }: { id: string, moduleId: string }) {
  const router = useRouter();
  const startModuleId = parseInt(moduleId);
  const { user } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('video');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [progressData, setProgressData] = useState<Record<number, any>>({});
  const [apiReady, setApiReady] = useState(false);
  const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
  const [videoLoadingError, setVideoLoadingError] = useState<string | null>(null);
  const accessChecked = useRef(false);

  const playerInstance = useRef<any>(null);
  const playerReady = useRef(false);
  const progressInterval = useRef<any>(null);

  const fetchCourseData = useCallback(async (refreshProgressOnly = false) => {
    try {
      if (!refreshProgressOnly) setLoading(true);

      // ── STEP 1: Enrollment guard (run once, skip for admins/hr) ──
      if (!refreshProgressOnly && !accessChecked.current) {
        accessChecked.current = true;
        try {
          await api.employee.checkAccess(parseInt(id));
        } catch (err: any) {
          // 403 = not enrolled, any other error = let it through
          if (err.message?.toLowerCase().includes('not enrolled') ||
              err.message?.toLowerCase().includes('access') ||
              err.message?.toLowerCase().includes('expired')) {
            setNotEnrolled(true);
            setAccessError(err.message);
            setLoading(false);
            return; // Stop here — don't fire any more API calls
          }
          // Non-403 errors: continue loading (admin/hr users hit this)
        }
      }
      
      const courseData = await api.common.getCourse(parseInt(id));
      if (!refreshProgressOnly) setCourse(courseData);
      
      const modulesData = await api.common.getModulesByCourse(parseInt(id)) || [];
      if (!refreshProgressOnly) setModules(modulesData);

      // Fetch progress for all modules (only if there are modules)
      if (modulesData.length > 0) {
        const progressPromises = modulesData.map((m: any) => 
          api.employee.getModuleProgressDetail(parseInt(id), m.id)
            .catch(() => ({ module_id: m.id })) // Gracefully handle per-module failures
        );
        const progressResults = await Promise.all(progressPromises);
        const progressMap: Record<number, any> = {};
        progressResults.forEach(p => { if (p?.module_id) progressMap[p.module_id] = p; });
        setProgressData(progressMap);

        if (!refreshProgressOnly) {
          let initialMod = modulesData[0];

          // If a specific module was requested via ?module= param, use that
          if (startModuleId) {
            const requested = modulesData.find((m: any) => m.id === startModuleId);
            if (requested) {
              initialMod = requested;
            }
          } else {
            // Otherwise resume at first uncompleted module
            for (const m of modulesData) {
              if (!progressMap[m.id]?.is_completed) { initialMod = m; break; }
            }
          }
          setActiveModule(initialMod);

          if (initialMod?.videos?.length > 0) {
            const modProg = progressMap[initialMod.id];
            let initialVid = initialMod.videos[0];
            if (modProg?.videos) {
              for (const v of initialMod.videos) {
                if (v && v.id) {
                  const vp = modProg.videos.find((p: any) => p.video_id === v.id);
                  if (!vp?.is_completed) { initialVid = v; break; }
                }
              }
            }
            setSelectedVideo(initialVid);
          }
        }
      }
    } catch (error: any) {
      if (!refreshProgressOnly) {
        toast.error('Failed to load course. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourseData();
    loadYoutubeAPI();
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
    if (window.YT && window.YT.Player) setApiReady(true);

    return () => {
      if (playerInstance.current) try { playerInstance.current.destroy(); } catch (e) {}
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [fetchCourseData]);

  const loadYoutubeAPI = () => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    } else if (window.YT && window.YT.Player) setApiReady(true);
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const initPlayer = (video: any) => {
    if (!video || !window.YT || !window.YT.Player || !apiReady) return;
    if (!document.getElementById('youtube-player-element')) return;
    const videoId = getYouTubeId(video.video_url);
    if (!videoId) return;

    if (playerInstance.current) {
      try {
        if (playerReady.current && playerInstance.current && typeof playerInstance.current.loadVideoById === 'function') {
          try {
            playerInstance.current.loadVideoById(videoId);
            return;
          } catch (loadErr) {
            console.warn("YouTube loadVideoById failed, forcing re-init:", loadErr);
          }
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
            startProgressTracking();
          },
          'onStateChange': (event: any) => {
             // 0 is ended
             if (event.data === 0) {
               handleVideoComplete(video.id);
             }
          }
        }
      });
    } catch (e) {
      console.error("YouTube Init Error:", e);
    }
  };

  const startProgressTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (playerReady.current && playerInstance.current && selectedVideo) {
        const currentTime = playerInstance.current.getCurrentTime();
        const duration = playerInstance.current.getDuration();
        if (duration > 0) {
          updateVideoProgress(selectedVideo.id, currentTime);
          if (currentTime >= (duration * 0.8)) {
            handleVideoComplete(selectedVideo.id);
          }
        }
      }
    }, 10000); // Sync every 10s to be polite
  };

   const updateVideoProgress = async (videoId: number, seconds: number, completed = false) => {
    if (!activeModule?.id || !videoId) return;
    try {
      await api.employee.updateVideoProgress({ 
        module_id: activeModule.id,
        video_id: videoId, 
        watched_seconds: seconds,
        completed: completed
      });
    } catch (e) {}
  };

  const handleVideoComplete = async (videoId: number) => {
    try {
      await updateVideoProgress(videoId, 999999, true); // Force complete with high timestamp
    } catch (e) {
      console.error("Failed to update video progress, but refreshing UI anyway:", e);
    } finally {
      // Always refresh to ensure UI reflects latest state
      await fetchCourseData(true);
    }
  };

  useEffect(() => {
    if (!selectedVideo?.video_url || activeTab !== 'video') return;
    setSecureVideoUrl(null);
    setVideoLoadingError(null);

    // YouTube URLs don't need a signed URL — use directly
    if (getYouTubeId(selectedVideo.video_url)) {
      setSecureVideoUrl(selectedVideo.video_url);
      return;
    }

    // Non-YouTube: fetch signed URL once — no retries
    let cancelled = false;
    api.employee.getVideoUrl(selectedVideo.id)
      .then(res => { if (!cancelled) setSecureVideoUrl(res.video_url); })
      .catch((err) => {
        if (!cancelled) setVideoLoadingError(err.message || 'Unable to load video.');
      });
    return () => { cancelled = true; };
  }, [selectedVideo?.id, activeTab]);

  // Precise Progress Calculations
  const currProg = progressData[activeModule?.id || 0] || {};

  // SAFE Progress Booleans
  const totalVideos = activeModule?.videos?.length || 0;
  const completedVideos = currProg?.videos?.filter((v: any) => v?.is_completed)?.length || 0;
  
  // A module's videos are done if there are no videos, or if all videos are completed
  const videosDone = totalVideos === 0 || (totalVideos > 0 && completedVideos >= totalVideos);
  
  // Notes are done if they don't exist or if marked completed
  const hasNotes = (activeModule?.notes?.length || 0) > 0;
  const notesDone = !hasNotes || currProg?.notes_completed === true;
  
  // Assignments are done if they don't exist or if submitted
  const hasAssignment = (activeModule?.assignments?.length || 0) > 0;
  const assignmentDone = !hasAssignment || currProg?.assignment_completed === true;

  const hasQuiz = (activeModule?.quizzes?.length || 0) > 0;

  // The Master Unlock Condition
  const canUnlockQuiz = videosDone && notesDone && assignmentDone;
  const assessmentLocked = !canUnlockQuiz;

  // DEBUG: Expose exactly which condition is failing
  console.log('[QUIZ UNLOCK DEBUG]', {
    moduleId: activeModule?.id,
    totalVideos,
    completedVideos,
    videosDone,
    notesDone,
    assignmentDone,
    hasQuiz,
    canUnlockQuiz,
    assessmentLocked,
    rawProgressForModule: currProg
  });

  // Weighted Overall Progress Calculation
  const calculateOverallProgress = () => {
    if (!activeModule) return 0;
    let completedItems = 0;
    let totalItems = 0;

    // Videos
    totalItems += totalVideos;
    completedItems += completedVideos;

    // Notes
    if (activeModule.notes?.length > 0) {
      totalItems += 1;
      if (notesDone) completedItems += 1;
    }

    // Assignments
    if (activeModule.assignments?.length > 0) {
      totalItems += 1;
      if (assignmentDone) completedItems += 1;
    }

    // Quizzes (Final Assessment)
    if (activeModule.quizzes?.length > 0) {
      totalItems += 1;
      if (currProg?.quiz_completed === true) completedItems += 1;
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const overallProgress = calculateOverallProgress();

  useEffect(() => {
    if (secureVideoUrl && apiReady && activeTab === 'video' && getYouTubeId(secureVideoUrl)) {
      const timer = setTimeout(() => initPlayer(selectedVideo), 100);
      return () => clearTimeout(timer);
    }
  }, [secureVideoUrl, apiReady, selectedVideo, activeTab]);

  const handleMarkNotesRead = async () => {
    if (!activeModule) return;
    try {
      await api.employee.markNotesComplete({ 
        module_id: activeModule.id, 
        completed: true 
      });
      toast.success("Notes marked as read!");
      await fetchCourseData(true);
    } catch (e: any) {
      toast.error("Failed to update notes progress");
    }
  };

  const handleModuleClick = async (mod: any) => {
    const modIdx = modules.indexOf(mod);
    if (modIdx > 0) {
      const prevMod = modules[modIdx - 1];
      if (prevMod && prevMod.id) {
        if (!progressData[prevMod.id]?.is_completed) {
          toast.error("Complete the previous module first");
          return;
        }
      }
    }
    
    window.history.pushState(null, '', `/courses/${id}/modules/${mod.id}`);
    
    setActiveModule(mod);
    if (mod.videos?.length > 0) {
      const modProg = progressData[mod.id];
      let initialVid = mod.videos[0];
      if (modProg?.videos) {
        for (const v of mod.videos) {
          if (v && v.id) {
            const vp = modProg.videos.find((p: any) => p.video_id === v.id);
            if (!vp?.is_completed) {
              initialVid = v;
              break;
            }
          }
        }
      }
      setSelectedVideo(initialVid);
    } else {
      setSelectedVideo(null);
    }
    setActiveTab('video');
  };

  const handleVideoSelect = (video: any) => {
    const vidIdx = activeModule.videos.indexOf(video);
    if (vidIdx > 0) {
      const prevVid = activeModule.videos[vidIdx - 1];
      if (prevVid && prevVid.id) {
        const prevProg = progressData[activeModule.id]?.videos?.find((v: any) => v.video_id === prevVid.id);
        if (!prevProg?.is_completed) {
          toast.error("Watch the previous video first");
          return;
        }
      }
    }
    setSelectedVideo(video);
  };

  const isModuleLocked = (mod: any) => {
    if (!modules || !mod) return true;
    const idx = modules.indexOf(mod);
    if (idx <= 0) return false;
    const prev = modules[idx - 1];
    if (!prev || !prev.id) return false;
    return !progressData[prev.id]?.is_completed;
  };

  const isVideoLocked = (vid: any) => {
    if (!activeModule || !activeModule.videos || !vid) return true;
    const idx = activeModule.videos.indexOf(vid);
    if (idx <= 0) return false;
    const prev = activeModule.videos[idx - 1];
    if (!prev || !prev.id) return false;
    const prevProg = progressData[activeModule.id]?.videos?.find((v: any) => v.video_id === prev.id);
    return !prevProg?.is_completed;
  };
  const isQuizLocked = () => assessmentLocked;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-4">
      <Loader2 className="w-10 h-10 text-[#F26522] animate-spin" />
      <p className="text-xs font-bold text-[#6A6F73] uppercase tracking-widest">Resuming Learning Session...</p>
    </div>
  );

  // ── Not Enrolled / Access Denied screen ──
  if (notEnrolled) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-[#F26522]" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#111] tracking-tight">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">
            {accessError || 'You are not enrolled in this course.'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Contact your administrator to get access.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard')}
          className="bg-[#F26522] hover:bg-[#D54D10] text-white w-full h-12 rounded-xl font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );

  if (!course) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-4">
      <AlertCircle className="w-10 h-10 text-gray-300" />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Course not found</p>
      <Button variant="ghost" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-[#111]">
      <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6 sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-6 w-full max-w-full mx-auto">
          <BackNavigation />
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
               <p className="text-[10px] font-bold text-gray-400 uppercase">Overall Progress</p>
               <div className="flex items-center gap-2">
                 <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                   <div className="h-full bg-green-500" style={{ width: `${overallProgress}%` }} />
                 </div>
                 <span className="text-xs font-bold text-green-600">{overallProgress}%</span>
               </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        <aside className="w-full lg:w-[380px] border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden shadow-sm z-10">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-[11px] font-bold text-[#111] uppercase tracking-wider">Course Curriculum</h3>
            <Badge className="bg-gray-100 text-gray-600 border-none rounded-lg text-xs font-bold">{modules.length} Modules</Badge>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-gray-50/20">
            {modules.map((mod, mIdx) => {
              const isLocked = isModuleLocked(mod);
              const isActive = activeModule?.id === mod.id;
              const prog = progressData[mod.id];
              return (
                <div key={mod.id} className="space-y-2">
                   <button 
                     onClick={() => !isLocked && handleModuleClick(mod)}
                     disabled={isLocked}
                     className={cn(
                       "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                       isActive ? "bg-white border-[#F26522] shadow-md ring-1 ring-[#F26522]/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm",
                       isLocked && "opacity-60 grayscale cursor-not-allowed bg-gray-50"
                     )}
                   >
                     <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                          isActive ? "bg-[#F26522] text-white" : "bg-gray-100 text-gray-500"
                        )}>
                          {isLocked ? <Lock className="w-4 h-4" /> : (mIdx + 1).toString().padStart(2, '0')}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#111] uppercase tracking-tight line-clamp-1">{mod.title}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                            {prog?.is_completed ? "Completed" : isLocked ? "Locked" : "In Progress"}
                          </p>
                        </div>
                     </div>
                     {prog?.is_completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                   </button>
                   
                   {isActive && (
                     <div className="pl-4 pr-1 py-1 space-y-1 animate-in slide-in-from-top-2 duration-300">
                        {mod.videos?.filter((v: any) => v && v.id).map((vid: any, vIdx: number) => {
                          const isVidLocked = isVideoLocked(vid);
                          const isVidActive = selectedVideo?.id === vid.id;
                          const vidProg = prog?.videos?.find((v: any) => v.video_id === vid.id);
                          return (
                            <button 
                              key={vid.id}
                              onClick={() => !isVidLocked && handleVideoSelect(vid)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors group relative",
                                isVidActive ? "bg-white shadow-sm border border-orange-100" : "hover:bg-gray-50",
                                isVidLocked && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {vidProg?.is_completed ? (
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : isVidLocked ? (
                                <Lock className="w-4 h-4 text-gray-300" />
                              ) : (
                                <PlayCircle className={cn("w-5 h-5", isVidActive ? "text-[#F26522]" : "text-gray-400")} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-[10px] font-bold uppercase truncate", isVidActive ? "text-[#111]" : "text-gray-500")}>
                                  {vid.title}
                                </p>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">{formatDuration(vid.duration_seconds || 0)}</span>
                              </div>
                            </button>
                          );
                        })}
                        
                        {/* Quiz Entry */}
                        <button 
                          onClick={() => !isQuizLocked() && setActiveTab('quiz')}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors group",
                            activeTab === 'quiz' ? "bg-white shadow-sm border border-orange-100" : "hover:bg-gray-50",
                            isQuizLocked() && "opacity-50 cursor-not-allowed"
                          )}
                        >
                           <div className={cn(
                             "w-6 h-6 rounded-full flex items-center justify-center",
                             prog?.quiz_completed ? "bg-green-100 text-green-600" : isQuizLocked() ? "text-gray-300" : "bg-orange-100 text-[#F26522]"
                           )}>
                              {prog?.quiz_completed ? <Check className="w-3.5 h-3.5" /> : isQuizLocked() ? <Lock className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className={cn("text-[10px] font-bold uppercase truncate", activeTab === 'quiz' ? "text-[#111]" : "text-gray-500")}>Final Assessment</p>
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Module Quiz</span>
                           </div>
                        </button>
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 bg-gray-50/50 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
             <Card className="border-gray-200 shadow-xl rounded-3xl overflow-hidden bg-white border-t-4 border-t-[#F26522]">
                <div className="flex border-b border-gray-100 bg-gray-50/20">
                   {[
                     { id: 'video', label: 'Lecture', icon: Video, locked: false },
                     { id: 'notes', label: 'Notes', icon: FileText, locked: false },
                     { id: 'task', label: 'Assignment', icon: Folder, locked: false },
                     { id: 'quiz', label: 'Assessment', icon: Trophy, locked: isQuizLocked() }
                   ].map(tab => (
                     <button
                       key={tab.id}
                       onClick={() => !tab.locked && setActiveTab(tab.id)}
                       className={cn(
                         "flex-1 flex flex-col items-center justify-center gap-2 py-5 text-[10px] font-bold uppercase border-b-2 transition-all relative",
                         activeTab === tab.id ? "border-[#F26522] text-[#F26522] bg-white" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/50",
                         tab.locked && "opacity-40 cursor-not-allowed"
                       )}
                     >
                       <tab.icon className="w-5 h-5" />
                       {tab.label}
                       {tab.locked && <Lock className="w-3 h-3 absolute top-3 right-3 opacity-50" />}
                     </button>
                   ))}
                </div>

                <div className="p-6 md:p-10">
                  <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#F26522]" /></div>}>
                    {activeTab === 'video' && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-100 group">
                          {!selectedVideo ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4">
                              <PlayCircle className="w-20 h-20 opacity-10" />
                              <p className="text-xs font-bold uppercase tracking-widest opacity-40">Select a lesson to begin</p>
                            </div>
                          ) : videoLoadingError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-12 text-center bg-gray-900">
                              <AlertCircle className="w-16 h-16 mb-4 opacity-50" />
                              <p className="text-base font-bold uppercase tracking-tight">{videoLoadingError}</p>
                              <Button variant="outline" onClick={() => window.location.reload()} className="mt-6 border-red-500/30 text-red-400 hover:bg-red-500/10">Retry Connection</Button>
                            </div>
                          ) : !secureVideoUrl ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-6 bg-gray-900">
                              <Loader2 className="w-12 h-12 animate-spin text-[#F26522]" />
                              <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Establishing secure link...</p>
                            </div>
                          ) : getYouTubeId(secureVideoUrl) ? (
                            <div id="youtube-player-element" className="w-full h-full" />
                          ) : (
                            <video 
                              key={secureVideoUrl}
                              src={secureVideoUrl}
                              className="w-full h-full object-contain"
                              controls
                              autoPlay
                              playsInline
                              controlsList="nodownload"
                              onEnded={() => handleVideoComplete(selectedVideo.id)}
                            />
                          )}
                        </div>
                        {selectedVideo && (
                          <div className="space-y-6">
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div className="space-y-1">
                                 <h2 className="text-3xl font-black text-[#111] tracking-tight">{selectedVideo.title}</h2>
                                 <div className="flex items-center gap-3">
                                    <Badge className="bg-orange-50 text-[#F26522] border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                                      Lesson {activeModule.videos.indexOf(selectedVideo) + 1}
                                    </Badge>
                                    <div className="h-4 w-px bg-gray-200" />
                                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                                       <Clock className="w-3.5 h-3.5" /> {formatDuration(selectedVideo.duration_seconds || 0)}
                                    </span>
                                 </div>
                               </div>
                               <Button variant="outline" className="rounded-xl border-gray-200 font-bold text-[10px] uppercase h-11 px-6 tracking-widest gap-2">
                                  <Bookmark className="w-4 h-4" /> Save for later
                               </Button>
                             </div>
                             <div className="p-8 bg-gray-50/50 rounded-2xl border border-gray-100">
                                <h4 className="text-xs font-black text-[#111] uppercase tracking-widest mb-4">Lesson Overview</h4>
                                <p className="text-base text-gray-600 leading-relaxed max-w-4xl opacity-80">
                                  {selectedVideo.description || "Take a deep dive into the core concepts of this lesson. We'll explore the theoretical foundations and practical applications necessary for mastering this module."}
                                </p>
                             </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'notes' && (
                       <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                         <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                            <div>
                               <h3 className="text-2xl font-black text-[#111] tracking-tight">Study Materials</h3>
                               <p className="text-sm text-gray-400 font-bold uppercase mt-1">Reference Documentation & Resources</p>
                            </div>
                            <div className="flex items-center gap-4">
                               {!notesDone && activeModule.notes?.length > 0 && (
                                 <Button 
                                   onClick={handleMarkNotesRead}
                                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-emerald-100"
                                 >
                                   <Check className="w-4 h-4 mr-2" /> Mark as Read
                                 </Button>
                               )}
                               {notesDone && (
                                 <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] uppercase px-4 py-2 rounded-xl flex items-center gap-2">
                                   <CheckCircle2 className="w-4 h-4" /> Completed
                                 </Badge>
                               )}
                               <Badge className="bg-blue-50 text-blue-600 border-none text-[10px] font-bold uppercase px-4 py-2 rounded-xl">
                                  {activeModule.notes?.length || 0} Assets
                               </Badge>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {activeModule.notes?.length > 0 ? (
                             activeModule.notes.map((note: any, i: number) => (
                               <div key={note.id} className="p-8 border border-gray-100 rounded-3xl hover:border-blue-300 hover:shadow-xl transition-all bg-white flex flex-col gap-6 group">
                                  <div className="flex items-start justify-between">
                                     <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileArchive className="w-8 h-8" />
                                     </div>
                                     <Badge variant="outline" className="border-gray-200 text-gray-400 font-bold text-[9px] uppercase tracking-widest">
                                        {note.file_type?.toUpperCase() || 'PDF'}
                                     </Badge>
                                  </div>
                                  <div>
                                     <h4 className="text-lg font-black text-[#111]">Document Resource {i + 1}</h4>
                                     <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-tight">Technical Reference • 2.4 MB</p>
                                  </div>
                                  <div className="flex items-center gap-3 pt-2">
                                     <a href={note.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 rounded-xl font-bold text-[10px] uppercase h-12 border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200")}>Preview</a>
                                     <a href={note.file_url} download className={cn(buttonVariants({ variant: "outline", size: "icon" }), "w-12 h-12 rounded-xl border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600")}>
                                        <Download className="w-4 h-4" />
                                     </a>
                                  </div>
                               </div>
                             ))
                           ) : (
                             <div className="col-span-full py-24 text-center space-y-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                                <FileText className="w-16 h-16 mx-auto text-gray-200" />
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No documentation found for this module</p>
                             </div>
                           )}
                         </div>
                       </div>
                    )}

                    {activeTab === 'task' && (
                       <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                             <div>
                                <h3 className="text-2xl font-black text-[#111] tracking-tight">Assignment Lab</h3>
                                <p className="text-sm text-gray-400 font-bold uppercase mt-1">Practical Exercises & Submissions</p>
                             </div>
                             {progressData[activeModule.id]?.assignment_completed ? (
                               <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-bold uppercase px-4 py-2 rounded-full flex items-center gap-2">
                                 <CheckCircle2 className="w-4 h-4" /> Submitted
                               </Badge>
                             ) : (
                               <Badge className="bg-orange-50 text-orange-600 border-none text-[10px] font-bold uppercase px-4 py-2 rounded-full">Action Required</Badge>
                             )}
                          </div>
                          {activeModule.assignments?.map((task: any) => (
                             <div key={task.id} className="space-y-8">
                                <Card className="p-10 border border-gray-100 shadow-xl rounded-3xl bg-white relative overflow-hidden group">
                                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                                   <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
                                      <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                                         <Bookmark className="w-10 h-10" />
                                      </div>
                                      <div className="flex-1 space-y-6">
                                         <div>
                                            <h4 className="text-2xl font-black text-[#111] tracking-tight">{task.title}</h4>
                                            <p className="text-xs font-bold text-gray-400 uppercase mt-2 tracking-widest">Instructions & Deliverables</p>
                                         </div>
                                         <div className="p-6 bg-gray-50/50 rounded-2xl text-base text-gray-600 leading-relaxed border border-gray-100">
                                            {task.description || "Submit your project files here. Please ensure all requirements listed in the guide are met before uploading your final work."}
                                         </div>
                                         <div className="flex flex-wrap gap-4">
                                            <a href={task.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl h-14 px-8 font-bold text-[11px] uppercase border-gray-200 text-gray-600 flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all")}>
                                              <Eye className="w-5 h-5" /> View Instructions
                                            </a>
                                            <a href={task.file_url} download className={cn(buttonVariants({ variant: "outline" }), "rounded-xl h-14 px-8 font-bold text-[11px] uppercase border-gray-200 text-gray-600 flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all")}>
                                              <Download className="w-5 h-5" /> Download Resources
                                            </a>
                                         </div>
                                      </div>
                                   </div>
                                </Card>
                                
                                <SubmissionZone moduleId={activeModule.id} onSubmitted={() => fetchCourseData(true)} />
                             </div>
                          ))}
                       </div>
                    )}

                    {activeTab === 'quiz' && (
                       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                          {isQuizLocked() ? (
                            <div className="py-24 text-center space-y-8 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-200">
                               <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mx-auto text-gray-200 border border-gray-100">
                                  <Lock className="w-10 h-10" />
                               </div>
                               <div className="space-y-3 px-6">
                                  <h3 className="text-2xl font-black text-[#111] tracking-tight">Assessment Locked</h3>
                                  <div className="max-w-sm mx-auto space-y-4">
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-tight opacity-70">
                                      To unlock this assessment, please complete:
                                    </p>
                                    <div className="flex flex-col gap-2">
                                      <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase", videosDone ? "text-emerald-600" : "text-gray-400")}>
                                        {videosDone ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                        All Video Lectures
                                      </div>
                                      <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase", notesDone ? "text-emerald-600" : "text-gray-400")}>
                                        {notesDone ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                        Study Materials
                                      </div>
                                      {activeModule.assignments?.length > 0 && (
                                        <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase", assignmentDone ? "text-emerald-600" : "text-gray-400")}>
                                          {assignmentDone ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                          Practical Assignment
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Button onClick={() => setActiveTab('video')} variant="outline" className="rounded-full border-gray-200 font-bold text-[10px] uppercase tracking-widest px-8">Return to Lectures</Button>
                                </div>
                            </div>
                          ) : activeModule.quizzes?.length > 0 ? (
                            <div className="space-y-8">
                               {activeModule.quizzes.map((quiz: any) => (
                                 <div key={quiz.id} className="text-center py-24 space-y-10 bg-white rounded-[3rem] border border-gray-100 shadow-2xl">
                                    <div className="w-24 h-24 rounded-3xl bg-orange-50 text-[#F26522] flex items-center justify-center mx-auto shadow-sm border border-orange-100">
                                       <Trophy className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-2">
                                       <h3 className="text-4xl font-black text-[#111] tracking-tight">{quiz.title}</h3>
                                       <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Final Module Assessment</p>
                                    </div>
                                    <Button 
                                       onClick={() => router.push(`/courses/${id}/modules/${moduleId}/assessment`)} 
                                       className="w-full max-w-md bg-[#111] hover:bg-black text-white h-20 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] transition-all"
                                    >
                                       BEGIN ASSESSMENT
                                    </Button>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="py-24 text-center space-y-4">
                               <Trophy className="w-16 h-16 mx-auto text-gray-200" />
                               <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No assessment configured for this module</p>
                            </div>
                          )}
                       </div>
                    )}
                  </Suspense>
                </div>
             </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function SubmissionZone({ moduleId, onSubmitted }: { moduleId: number, onSubmitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.employee.submitAssignment(moduleId, formData);
      toast.success("Assignment submitted successfully!");
      setFile(null);
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit work");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-12 border-2 border-dashed border-gray-200 bg-gray-50/30 rounded-[2.5rem] text-center space-y-8 hover:bg-emerald-50/20 hover:border-emerald-200 transition-all duration-500">
       <div className="space-y-3">
          <h4 className="text-xl font-black text-[#111] tracking-tight">Submit Your Project</h4>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Accepted: PDF, Office, Images, ZIP (Max 50MB)</p>
       </div>
       <input type="file" ref={fileRef} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
       {file ? (
         <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-5 bg-white rounded-2xl border border-emerald-100 flex items-center gap-4 shadow-sm">
               <FileArchive className="w-6 h-6 text-emerald-600" />
               <div className="text-left">
                  <p className="text-sm font-black text-[#111] truncate max-w-[250px]">{file.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ready for upload</p>
               </div>
               <button onClick={() => setFile(null)} className="ml-4 text-gray-300 hover:text-red-500 transition-colors">
                  <AlertCircle className="w-5 h-5" />
               </button>
            </div>
            <Button onClick={handleUpload} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-16 px-12 rounded-2xl shadow-xl hover:shadow-emerald-200/50 transition-all text-xs tracking-widest">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : null}
              {loading ? "UPLOADING..." : "CONFIRM SUBMISSION"}
            </Button>
         </div>
       ) : (
         <Button onClick={() => fileRef.current?.click()} variant="outline" className="h-20 px-12 border-2 border-gray-200 rounded-3xl bg-white shadow-sm hover:shadow-2xl hover:border-[#F26522]/30 hover:text-[#F26522] transition-all font-black uppercase text-[11px] tracking-[0.2em] gap-3">
            <Folder className="w-6 h-6" /> SELECT PROJECT FILE
         </Button>
       )}
    </Card>
  );
}

function QuizTaker({ quizId, onComplete }: { quizId: number, onComplete: () => void }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'result'>('idle');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(1200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.common.getQuiz(quizId).then(res => {
      setQuiz(res);
      setLoading(false);
    });
  }, [quizId]);

  useEffect(() => {
    if (quizState !== 'active' || isSubmitting) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
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
    setTimeLeft(quiz?.time_limit ? quiz.time_limit * 60 : 1200);
  };

  const handleOptionSelect = (qId: number, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setIsSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        question_id: parseInt(qId),
        answer: ans  // backend AttemptQuizRequest expects "answer" not "answer_text"
      }));
      const res = await api.employee.attemptQuiz(quiz.id, { 
        answers: formattedAnswers, 
        time_taken: (quiz?.time_limit ? quiz.time_limit * 60 : 1200) - timeLeft 
      });
      setResult(res);
      setQuizState('result');
      onComplete();
      toast.success("Assessment completed!");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#F26522]" /></div>;

  return (
    <Card className="border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white p-8 md:p-12 relative">
       {quizState === 'idle' && (
         <div className="space-y-10 py-6 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-orange-50 text-[#F26522] flex items-center justify-center mx-auto shadow-sm border border-orange-100 animate-bounce-slow">
               <Trophy className="w-12 h-12" />
            </div>
            <div className="space-y-2">
               <h3 className="text-4xl font-black text-[#111] tracking-tight">{quiz.title}</h3>
               <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Final Module Assessment</p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
               <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Questions</p>
                  <p className="text-2xl font-black text-[#111]">{quiz.questions?.length || 0}</p>
               </div>
               <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Duration</p>
                  <p className="text-2xl font-black text-[#111]">{quiz.time_limit || 20}m</p>
               </div>
               <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Passing</p>
                  <p className="text-2xl font-black text-emerald-600">{quiz.passing_score || 70}%</p>
               </div>
            </div>

            <Button 
               onClick={() => router.push(`/courses/${id}/modules/${moduleId}/assessment`)} 
               className="w-full max-w-md bg-[#111] hover:bg-black text-white h-20 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] transition-all"
            >
               BEGIN ASSESSMENT
            </Button>
         </div>
       )}

       {quizState === 'active' && quiz.questions?.length > 0 && (
         <div className="space-y-10">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <Badge className="bg-[#111] text-white rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest">
                    Question {currentQuestionIndex + 1} / {quiz.questions.length}
                  </Badge>
                  <div className="h-4 w-px bg-gray-200" />
                  <span className="text-xs font-black text-[#F26522] uppercase tracking-widest">
                    {quiz.questions[currentQuestionIndex].marks} Marks
                  </span>
               </div>
               <div className={cn(
                 "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-mono font-black text-lg shadow-sm transition-colors",
                 timeLeft < 60 ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-gray-50 border-gray-100 text-[#111]"
               )}>
                  <Clock className="w-6 h-6" />
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
               </div>
            </div>

            <div className="space-y-12">
               <h3 className="text-3xl font-black text-[#111] leading-tight tracking-tight">
                  {quiz.questions[currentQuestionIndex].question_text}
               </h3>
               
               <div className="grid gap-4">
                  {JSON.parse(quiz.questions[currentQuestionIndex].options || '[]').map((opt: string, i: number) => {
                    const isSelected = answers[quiz.questions[currentQuestionIndex].id] === opt;
                    return (
                      <button
                        key={i}
                        onClick={() => handleOptionSelect(quiz.questions[currentQuestionIndex].id, opt)}
                        className={cn(
                          "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center gap-6 group relative overflow-hidden",
                          isSelected 
                            ? "bg-orange-50 border-[#F26522] text-[#111] shadow-md ring-1 ring-[#F26522]/20" 
                            : "bg-white border-gray-100 hover:border-[#F26522]/30 text-[#111] hover:bg-gray-50"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 font-black text-sm transition-all",
                          isSelected ? "bg-[#F26522] border-[#F26522] text-white rotate-[360deg]" : "bg-white border-gray-200 text-gray-400 group-hover:border-[#F26522]/50 group-hover:text-[#F26522]"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="text-lg font-bold">{opt}</span>
                      </button>
                    );
                  })}
               </div>
            </div>

            <div className="flex items-center justify-between pt-10 border-t border-gray-100">
               <Button 
                 variant="ghost" 
                 disabled={currentQuestionIndex === 0}
                 onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-[#111] px-8 h-14"
               >
                 <ChevronLeft className="w-5 h-5 mr-3" /> Back
               </Button>
               <Button 
                 onClick={() => {
                   if (currentQuestionIndex < quiz.questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
                   else handleSubmit();
                 }}
                 disabled={isSubmitting}
                 className="bg-[#111] hover:bg-black text-white px-12 h-16 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-105"
               >
                 {isSubmitting ? "PROCESSING..." : currentQuestionIndex === quiz.questions.length - 1 ? 'SUBMIT ASSESSMENT' : 'NEXT QUESTION'}
                 {!isSubmitting && <ChevronRight className="w-5 h-5 ml-3" />}
               </Button>
            </div>
         </div>
       )}

       {quizState === 'result' && result && (
         <div className="text-center py-10 space-y-10 animate-in zoom-in-95 duration-500">
            <div className={cn(
              "w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border-4 rotate-12 transition-transform hover:rotate-0 duration-500",
              result.status === 'PASSED' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
            )}>
               {result.status === 'PASSED' ? <Trophy className="w-14 h-14" /> : <AlertCircle className="w-14 h-14" />}
            </div>
            
            <div className="space-y-2">
               <h2 className="text-4xl font-black text-[#111] tracking-tight">
                 {result.status === 'PASSED' ? "CONGRATULATIONS!" : "KEEP PRACTICING!"}
               </h2>
               <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.3em]">
                 {result.status === 'PASSED' ? "You have mastered this module" : "Review the lectures and try again"}
               </p>
            </div>

            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
               <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Final Score</p>
                  <p className={cn("text-5xl font-black", result.status === 'PASSED' ? "text-emerald-600" : "text-red-600")}>
                    {Math.round(result.percentage)}%
                  </p>
               </div>
               <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Status</p>
                  <p className={cn("text-3xl font-black", result.status === 'PASSED' ? "text-emerald-600" : "text-red-600")}>
                    {result.status}
                  </p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
               <Button 
                 onClick={() => router.push('/dashboard')}
                 className="bg-[#111] hover:bg-black text-white h-16 px-12 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl"
               >
                 RETURN TO DASHBOARD
               </Button>
               {result.status !== 'PASSED' && (
                 <Button 
                   variant="outline" 
                   onClick={() => window.location.reload()}
                   className="border-gray-200 text-gray-500 h-16 px-12 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                 >
                   <RotateCcw className="w-5 h-5 mr-3" /> RETRY ASSESSMENT
                 </Button>
               )}
            </div>
         </div>
       )}
    </Card>
  );
}

export default function LearnPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="w-12 h-12 animate-spin text-[#F26522]" /></div>}>
      <LearnContent id={id} moduleId={moduleId} />
    </Suspense>
  );
}
