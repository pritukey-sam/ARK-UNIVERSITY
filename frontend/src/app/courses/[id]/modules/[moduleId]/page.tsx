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
import { useRouter, useParams } from 'next/navigation';
import { cn, formatDuration } from '@/lib/utils';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const thumbnailCache: Record<string, string> = {};

function VideoThumbnail({ video }: { video: any }) {
  const thumbnailPlaceholder = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60`;
  const [realUrl, setRealUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!video || !video.video_url) return;

    // Check if YouTube
    const isYt = video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be') || video.video_url.includes('youtube-nocookie.com');
    if (isYt) {
      setRealUrl(video.video_url);
      return;
    }

    // Check if relative private storage key
    const isRelative = !video.video_url.startsWith('http://') && !video.video_url.startsWith('https://');
    if (isRelative) {
      api.employee.getVideoUrl(video.id)
        .then(res => {
          if (res && res.video_url) {
            setRealUrl(res.video_url);
          }
        })
        .catch(err => {
          console.error("Failed to load signed URL for thumbnail:", err);
          setVideoError(true);
        });
    } else {
      setRealUrl(video.video_url);
    }
  }, [video]);

  useEffect(() => {
    if (!realUrl) return;

    // Check if YouTube or Cloudflare
    const isYt = video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be') || video.video_url.includes('youtube-nocookie.com');
    const isCf = video.video_url.includes('cloudflarestream.com') || video.video_url.includes('videodelivery.net');
    if (isYt || isCf) return;

    if (thumbnailCache[realUrl]) {
      setCapturedThumbnail(thumbnailCache[realUrl]);
      return;
    }

    let isCancelled = false;

    const videoEl = document.createElement('video');
    videoEl.src = realUrl;
    videoEl.crossOrigin = 'anonymous'; // Important for CORS
    videoEl.preload = 'auto';
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.currentTime = 0; // Seek to 0 seconds

    const handleCapture = () => {
      if (isCancelled) return;
      if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          thumbnailCache[realUrl] = dataUrl;
          setCapturedThumbnail(dataUrl);
        }
      } catch (err) {
        console.error("Failed to capture video frame via canvas:", err);
      }
    };

    videoEl.addEventListener('loadeddata', handleCapture);
    videoEl.addEventListener('seeked', handleCapture);
    videoEl.addEventListener('error', (err) => {
      console.warn("Video element failed to load for thumbnail capture:", err);
    });

    videoEl.load();

    return () => {
      isCancelled = true;
      videoEl.removeEventListener('loadeddata', handleCapture);
      videoEl.removeEventListener('seeked', handleCapture);
      videoEl.src = '';
      try {
        videoEl.load();
      } catch (e) {}
    };
  }, [realUrl, video]);

  if (!video) {
    return <img src={thumbnailPlaceholder} alt="Placeholder" className="w-full h-full object-cover" />;
  }

  // 1. YouTube Detection (maxresdefault with fallback to hqdefault)
  const ytMatch = video.video_url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtu\.be\/|v\/|u\/\w\/)([^& \n<?#]+)/i);
  if (ytMatch && ytMatch[1] && ytMatch[1].trim().length === 11) {
    const ytId = ytMatch[1].trim();
    return (
      <img
        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
        alt={video.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }}
      />
    );
  }

  // 2. Cloudflare Stream Detection
  const cfMatch = video.video_url.match(/(?:cloudflarestream\.com|videodelivery\.net)\/([a-f0-9]{32})/i);
  if (cfMatch && cfMatch[1]) {
    const cfId = cfMatch[1];
    return (
      <img
        src={`https://videodelivery.net/${cfId}/thumbnails/thumbnail.jpg?time=2s&height=360`}
        alt={video.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = thumbnailPlaceholder;
        }}
      />
    );
  }

  // Render captured static thumbnail image if available
  if (capturedThumbnail) {
    return <img src={capturedThumbnail} alt={video.title} className="w-full h-full object-cover" />;
  }

  // Fallback to video element at t=0.001 seconds during loading or if canvas capture fails
  if (realUrl && !videoError) {
    return (
      <video
        src={`${realUrl}#t=0.001`}
        preload="metadata"
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
      />
    );
  }

  return <img src={thumbnailPlaceholder} alt={video.title} className="w-full h-full object-cover" />;
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
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [apiReady, setApiReady] = useState(false);
  const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
  const [videoLoadingError, setVideoLoadingError] = useState<string | null>(null);
  const [videoFinished, setVideoFinished] = useState(false);
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

        // Fetch employee submissions
        if (user?.role === 'employee') {
          try {
            const subs = await api.employee.getMySubmissions();
            setSubmissions(subs);
          } catch (e) {
            console.error("Failed to load employee submissions:", e);
          }
        }

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
            setSelectedVideo(null);
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
      if (playerInstance.current) try { playerInstance.current.destroy(); } catch (e) { }
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
            setVideoFinished(false);
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
              setVideoFinished(true);
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
    } catch (e) { }
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

  // Employee Submission Handlers
  const editFileRef = useRef<HTMLInputElement>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null);

  const handleDeleteSubmission = async (submissionId: number) => {
    if (!confirm("Are you sure you want to delete your submission? This will reset your progress for this module.")) return;
    try {
      setLoading(true);
      await api.request(`/submissions/${submissionId}`, { method: 'DELETE' });
      toast.success("Submission deleted successfully");
      await fetchCourseData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete submission");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmission = (submissionId: number) => {
    setEditingSubmissionId(submissionId);
    editFileRef.current?.click();
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSubmissionId) return;

    setLoading(true);
    try {
      // 1. Delete old submission
      await api.request(`/submissions/${editingSubmissionId}`, { method: 'DELETE' });

      // 2. Submit new file
      const formData = new FormData();
      formData.append('file', file);
      await api.employee.submitAssignment(activeModule.id, formData);

      toast.success("Submission updated successfully!");
      await fetchCourseData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to update submission");
    } finally {
      setLoading(false);
      setEditingSubmissionId(null);
      if (editFileRef.current) editFileRef.current.value = '';
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
    setSelectedVideo(null);
    setActiveTab('video');
  };

  const handleVideoSelect = (video: any) => {
    setVideoFinished(false);
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

  const handleFileDownload = (url: string, filename: string) => {
    // Resolve same-origin proxy relative route if possible to avoid any local address blockages
    let targetUrl = url;
    if (url && url.includes('/uploads/')) {
      const idx = url.indexOf('/uploads/');
      targetUrl = url.substring(idx);
    }

    // Append the download parameter so the backend knows to attach instead of preview
    const downloadUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'download=true';

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || '';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      {/* 1. CLEAN REFINED HEADER */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6 sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-6 w-full max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              if (selectedVideo !== null) {
                setSelectedVideo(null);
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-2 h-auto px-0 py-1 text-sm font-medium text-[#6A6F73] hover:text-[#111] hover:bg-transparent transition-colors group"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-50 border border-gray-100 group-hover:border-gray-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span>Back</span>
          </Button>

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

      {/* 2. MAIN FULL WIDTH WORKSPACE LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* Module Title Header */}
        <div className="space-y-1">
          {(() => {
            const idx = modules.findIndex(m => m.id === activeModule?.id);
            const moduleNumberLabel = idx !== -1 ? `Module ${idx + 1}` : "Module";
            return (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {moduleNumberLabel}
              </span>
            );
          })()}
          <h1 className="text-2xl font-bold text-[#111] tracking-tight">{activeModule?.title || course?.title}</h1>
        </div>

        {/* 3. YOUTUBE-STYLE TABS */}
        <div className="flex flex-wrap gap-2.5 pb-4 border-b border-gray-100">
          {[
            { id: 'video', label: 'Videos', icon: Video, locked: false },
            { id: 'notes', label: 'Notes', icon: FileText, locked: false },
            { id: 'task', label: 'Task', icon: Folder, locked: false },
            { id: 'quiz', label: 'Quiz', icon: Trophy, locked: isQuizLocked() }
          ].map(pill => {
            const isActive = activeTab === pill.id;
            return (
              <button
                key={pill.id}
                id={`tour-module-tab-${pill.id}`}
                onClick={() => {
                  if (!pill.locked) {
                    setActiveTab(pill.id);
                    setSelectedVideo(null);
                  } else {
                    toast.error("Complete previous lessons to unlock quiz");
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-full transition-all duration-200 border",
                  isActive
                    ? "bg-[#F26522] border-[#F26522] text-white shadow-md shadow-orange-100"
                    : "bg-gray-100 border-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900",
                  pill.locked && "opacity-50 cursor-not-allowed"
                )}
              >
                <pill.icon className="w-3.5 h-3.5" />
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* 4. MAIN CONTENT WORKSPACE */}
        <div className="min-h-[500px] pt-4">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#F26522]" /></div>}>

            {/* ── VIDEO TAB CONTENT ── */}
            {activeTab === 'video' && (
              <>
                {/* IF VIDEO SELECT PLAYER OPEN */}
                {selectedVideo !== null ? (
                  <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
                    <div 
                      key={selectedVideo?.id}
                      className="relative aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-lg border border-gray-250"
                    >
                      {videoLoadingError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 space-y-4">
                          <AlertCircle className="w-12 h-12 opacity-30" />
                          <p className="text-xs font-bold uppercase">{videoLoadingError}</p>
                        </div>
                      ) : !secureVideoUrl ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-6">
                          <Loader2 className="w-10 h-10 animate-spin text-[#F26522]" />
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
                          disablePictureInPicture
                          onEnded={() => {
                            handleVideoComplete(selectedVideo.id);
                            setVideoFinished(true);
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>

                    {/* Navigation Buttons Row */}
                    {(() => {
                      const videosList = activeModule?.videos || [];
                      const currentVideoIndex = videosList.findIndex((v: any) => v.id === selectedVideo?.id);
                      const hasPrevVideo = currentVideoIndex > 0;
                      const hasNextVideo = currentVideoIndex !== -1 && currentVideoIndex < videosList.length - 1;

                      return (
                        <div className="flex items-center justify-between gap-4 pt-1">
                          {hasPrevVideo ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const prevVideo = videosList[currentVideoIndex - 1];
                                setSelectedVideo(prevVideo);
                                setVideoFinished(false);
                              }}
                              className="flex items-center gap-1.5 h-9 rounded-xl border-gray-250 text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-semibold text-xs"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Previous Video</span>
                            </Button>
                          ) : (
                            <div />
                          )}

                          {hasNextVideo && (
                            <Button
                              variant={videoFinished ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const nextVideo = videosList[currentVideoIndex + 1];
                                handleVideoSelect(nextVideo);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 h-9 rounded-xl font-semibold text-xs transition-all duration-300",
                                videoFinished
                                  ? "bg-[#F26522] hover:bg-[#D54D10] border-[#F26522] text-white shadow-md shadow-orange-100"
                                  : "border-gray-250 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                              )}
                            >
                              <span>Next Video</span>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-[#111]">{selectedVideo?.title}</h2>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs font-bold uppercase border-gray-200 text-gray-500 px-3 py-1">
                            {formatDuration(selectedVideo?.duration_seconds || 0)}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-150">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Lesson Overview</h4>
                        <p className="text-sm text-gray-600 leading-relaxed max-w-4xl">
                          {selectedVideo?.description || "In this lesson, we examine the technical implementations and conceptual frameworks required for this module."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* IF NO VIDEO IS SELECTED → SHOW YOUTUBE STYLE CARD GRID */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-150">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Videos</h3>
                      <Badge className="bg-gray-100 text-gray-600 border-none font-bold text-xs px-2.5 py-1 rounded-lg">
                        {activeModule?.videos?.length || 0} Lessons
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                      {activeModule?.videos && activeModule.videos.length > 0 ? (
                        activeModule.videos.map((video: any, vIdx: number) => {
                          const isLocked = isVideoLocked(video);
                          const isCompleted = progressData[activeModule.id]?.videos?.find((v: any) => v.video_id === video.id)?.is_completed;

                          return (
                            <div
                              key={video.id}
                              onClick={() => {
                                if (isLocked) {
                                  toast.error("Watch the previous video first");
                                } else {
                                  setSelectedVideo(video);
                                }
                              }}
                              className={cn(
                                "group cursor-pointer space-y-3",
                                isLocked && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {/* Thumbnail Wrapper */}
                              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-150 shadow-sm transition-transform duration-300 group-hover:scale-[1.02] group-hover:shadow-md">
                                <VideoThumbnail video={video} />
                                {/* Play / Lock Overlay */}
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                  {isLocked ? (
                                    <div className="w-11 h-11 rounded-full bg-black/60 shadow-md flex items-center justify-center">
                                      <Lock className="w-4 h-4 text-white" />
                                    </div>
                                  ) : (
                                    <div className="w-11 h-11 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100 duration-300">
                                      <Play className="w-3.5 h-3.5 fill-current text-[#F26522] ml-0.5" />
                                    </div>
                                  )}
                                </div>
                                {/* Duration Badge */}
                                <div className="absolute bottom-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                                  {formatDuration(video.duration_seconds || 0)}
                                </div>
                                {/* Completed Status Indicator */}
                                {isCompleted && (
                                  <div className="absolute top-2.5 right-2.5 bg-green-500/90 text-white p-1 rounded-full shadow-sm">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>

                              {/* Metadata */}
                              <div className="flex gap-3 px-1 justify-between">
                                <div className="flex gap-3 min-w-0">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 uppercase",
                                    isCompleted ? "bg-green-50 text-green-600" : "bg-[#F26522]/10 text-[#F26522]"
                                  )}>
                                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : (vIdx + 1).toString().padStart(2, '0')}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-sm text-[#111] line-clamp-2 leading-snug group-hover:text-[#F26522] transition-colors uppercase tracking-tight">
                                      {video.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 line-clamp-1 mt-1 font-semibold uppercase tracking-wider">
                                      Lesson {vIdx + 1}
                                    </p>
                                    <p className="text-xs text-[#6A6F73] line-clamp-2 mt-1 leading-relaxed">
                                      {video.description || "In this lesson, we examine the technical implementations and conceptual frameworks required for this module."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-24 text-center space-y-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                          <Video className="w-16 h-16 mx-auto text-gray-200" />
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No video lectures found for this module</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── NOTES TAB CONTENT ── */}
            {activeTab === 'notes' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex items-center justify-between pb-4 border-b border-gray-150">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Notes & Resources</h3>
                    <p className="text-xs text-gray-500">Study materials provided for this module</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!notesDone && activeModule?.notes?.length > 0 && (
                      <Button
                        onClick={handleMarkNotesRead}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider h-10 px-5 rounded-xl shadow-sm"
                      >
                        <Check className="w-4 h-4 mr-1.5" /> Mark as Read
                      </Button>
                    )}
                    {notesDone && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Notes Read
                      </Badge>
                    )}
                    <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-xs px-3 py-1.5 rounded-xl">
                      {activeModule?.notes?.length || 0} Files
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeModule?.notes && activeModule.notes.length > 0 ? (
                    activeModule.notes.map((note: any, i: number) => (
                      <div key={note.id} className="p-6 border border-gray-150 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all bg-white flex flex-col justify-between gap-6 group">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileArchive className="w-6 h-6" />
                          </div>
                          <Badge variant="outline" className="border-gray-200 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                            {note.file_type?.toUpperCase() || 'PDF'}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#111] line-clamp-1">{note.file_name || `Study Material ${i + 1}`}</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase mt-1">Resource Guide</p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <a href={note.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 rounded-xl font-bold text-xs uppercase h-10 border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 bg-white")}>Preview</a>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleFileDownload(note.file_url, note.file_name || `Study_Material_${i + 1}.pdf`)}
                            className="w-10 h-10 rounded-xl border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 bg-white"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
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

            {/* ── TASK TAB CONTENT ── */}
            {activeTab === 'task' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between pb-4 border-b border-gray-150">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Assignments</h3>
                    <p className="text-xs text-gray-500">Submit deliverables required for course completion</p>
                  </div>
                  {progressData[activeModule?.id || 0]?.assignment_completed ? (
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Submitted
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-50 text-orange-600 border-none font-bold text-xs px-3.5 py-1.5 rounded-full">Pending Submission</Badge>
                  )}
                </div>

                {activeModule?.assignments && activeModule.assignments.length > 0 ? (
                  activeModule.assignments.map((task: any) => (
                    <div key={task.id} className="space-y-6">
                      <Card className="p-8 border border-gray-150 shadow-sm rounded-2xl bg-white relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-start gap-6">
                          <div className="w-16 h-16 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                            <Bookmark className="w-8 h-8" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <h4 className="text-xl font-bold text-[#111]">{task.title}</h4>
                              <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-wider">Instructions & Deliverables</p>
                            </div>
                            <div className="p-5 bg-gray-50/50 rounded-xl text-sm text-gray-600 leading-relaxed border border-gray-150">
                              {task.description || "Submit your completed project files here. Ensure that all standard deliverables have been formatted before uploading."}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <a href={task.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl h-11 px-5 font-bold text-xs uppercase border-gray-200 text-gray-600 flex items-center gap-1.5 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all bg-white")}>
                                <Eye className="w-4 h-4" /> View Guide
                              </a>
                              <Button
                                variant="outline"
                                onClick={() => handleFileDownload(task.file_url, task.title + ".pdf")}
                                className="rounded-xl h-11 px-5 font-bold text-xs uppercase border-gray-200 text-gray-600 flex items-center gap-1.5 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all bg-white"
                              >
                                <Download className="w-4 h-4" /> Download Resources
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {progressData[activeModule?.id || 0]?.assignment_completed ? (() => {
                        const userSubmission = submissions.find((s: any) => s.module_id === activeModule?.id);
                        return (
                          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <Card className="p-6 border border-emerald-100 bg-emerald-50/10 rounded-2xl space-y-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100 shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Your Submission</p>
                                    <h4 className="text-sm font-bold text-gray-900 leading-snug">{task.title}</h4>
                                  </div>
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-55 border border-emerald-100 font-bold text-xs rounded-full">
                                  Submitted
                                </Badge>
                              </div>
                              
                              <div className="p-4 bg-white rounded-xl border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                  <a 
                                    href={userSubmission ? userSubmission.file_url : '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="font-bold text-[#F26522] hover:underline hover:text-[#D54D10] truncate max-w-[200px] sm:max-w-xs transition-colors"
                                  >
                                    {userSubmission ? userSubmission.file_url.split('/').pop() : 'View Submitted File'}
                                  </a>
                                </div>
                                <span className="text-xs font-semibold text-gray-400">
                                  Submitted on {userSubmission?.submitted_at ? new Date(userSubmission.submitted_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="flex gap-2 justify-end pt-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => userSubmission && handleEditSubmission(userSubmission.id)}
                                  className="h-10 rounded-xl font-bold text-xs uppercase border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                                >
                                  Edit File
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => userSubmission && handleDeleteSubmission(userSubmission.id)}
                                  className="h-10 rounded-xl font-bold text-xs uppercase active:scale-95 transition-all shadow-sm shadow-red-100"
                                >
                                  Delete
                                </Button>
                              </div>
                            </Card>
                            <input type="file" ref={editFileRef} className="hidden" onChange={handleEditFileChange} />
                          </div>
                        );
                      })() : (
                        <SubmissionZone moduleId={activeModule.id} onSubmitted={() => fetchCourseData(true)} />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center space-y-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Folder className="w-16 h-16 mx-auto text-gray-200" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No assignments requested for this module</p>
                  </div>
                )}
              </div>
            )}

            {/* ── QUIZ TAB CONTENT ── */}
            {activeTab === 'quiz' && (
              <div className="animate-in fade-in duration-500">
                {isQuizLocked() ? (
                  <div className="py-20 text-center space-y-6 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 max-w-xl mx-auto">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-gray-300 border border-gray-150">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-2 px-6">
                      <h3 className="text-lg font-bold text-[#111]">Assessment Locked</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        Complete all previous lectures, notes, and assignments to unlock the final quiz.
                      </p>
                      <div className="flex flex-col gap-1.5 max-w-xs mx-auto pt-4 text-left">
                        <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase", videosDone ? "text-green-600" : "text-gray-400")}>
                          {videosDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          Videos watched ({completedVideos}/{totalVideos})
                        </div>
                        <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase", notesDone ? "text-green-600" : "text-gray-400")}>
                          {notesDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          Study notes read
                        </div>
                        {activeModule?.assignments?.length > 0 && (
                          <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase", assignmentDone ? "text-green-600" : "text-gray-400")}>
                            {assignmentDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            Practical assignment submitted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeModule?.quizzes && activeModule.quizzes.length > 0 ? (
                  <QuizTaker quizId={activeModule.quizzes[0].id} onComplete={() => fetchCourseData(true)} />
                ) : (
                  <div className="py-20 text-center space-y-4 max-w-xl mx-auto">
                    <Trophy className="w-16 h-16 mx-auto text-gray-200" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No assessment configured for this module</p>
                  </div>
                )}
              </div>
            )}

          </Suspense>
        </div>

        {/* BOTTOM MODULE NAVIGATION */}
        {modules.length > 0 && (
          (() => {
            const currentModuleIndex = modules.findIndex(m => m.id === activeModule?.id);
            if (currentModuleIndex === -1) return null;
            const prevMod = currentModuleIndex > 0 ? modules[currentModuleIndex - 1] : null;
            const nextMod = currentModuleIndex < modules.length - 1 ? modules[currentModuleIndex + 1] : null;
            const isNextLocked = nextMod ? isModuleLocked(nextMod) : false;

            return (
              <div className="flex items-center justify-between pt-8 mt-12 border-t border-gray-200">
                {prevMod ? (
                  <Button
                    variant="outline"
                    onClick={() => handleModuleClick(prevMod)}
                    className="flex items-center gap-2 rounded-xl h-11 px-5 font-bold text-xs uppercase border-gray-200 text-[#6A6F73] hover:text-[#111] transition-all bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Module
                  </Button>
                ) : (
                  <div />
                )}

                {nextMod && (
                  <Button
                    onClick={() => {
                      if (isNextLocked) {
                        toast.error("Complete the current module first");
                      } else {
                        handleModuleClick(nextMod);
                      }
                    }}
                    disabled={isNextLocked}
                    className={cn(
                      "flex items-center gap-2 rounded-xl h-11 px-5 font-bold text-xs uppercase transition-all",
                      isNextLocked
                        ? "bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                        : "bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm hover:shadow-md"
                    )}
                  >
                    Next Module {isNextLocked ? <Lock className="w-3.5 h-3.5" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            );
          })()
        )}

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
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const moduleId = params?.moduleId as string;
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'result'>('idle');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(1200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);

  const passingScoreThreshold = quiz?.passing_score || 70;
  const passingAttempts = attempts.filter((attempt) => 
    attempt.status === 'PASSED' || attempt.percentage >= passingScoreThreshold
  );
  const hasPassed = passingAttempts.length > 0;
  const bestPassingAttempt = hasPassed 
    ? [...passingAttempts].sort((a, b) => b.percentage - a.percentage || b.attempt_number - a.attempt_number)[0]
    : null;

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    Promise.all([
      api.common.getQuiz(quizId),
      api.employee.getQuizAttempts(quizId, user?.id).catch(err => {
        console.error("Failed to load attempts", err);
        return [];
      })
    ]).then(([quizRes, attemptsRes]) => {
      setQuiz(quizRes);
      setAttempts(attemptsRes || []);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load quiz data", err);
      setLoading(false);
    });
  }, [quizId, user?.id]);

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
    <Card className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl bg-white p-8 md:p-10 relative max-w-2xl mx-auto">
      {quizState === 'idle' && (
        <div className="space-y-8 py-6 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#F26522] flex items-center justify-center mx-auto shadow-sm border border-orange-100">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{quiz.title}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Final Module Assessment</p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { label: "Questions", value: `${quiz.questions?.length || 0} Items`, icon: List },
              { label: "Duration", value: `${quiz.time_limit || 20} Min`, icon: Clock },
              { label: "Passing Criteria", value: `${quiz.passing_score || 70}% Score`, icon: Trophy, color: "text-emerald-600" }
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                  <stat.icon className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-[8px] font-black uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className={cn("text-xs font-black text-slate-900", stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            {hasPassed && bestPassingAttempt ? (
              <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl max-w-sm mx-auto text-emerald-800 text-sm font-medium space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-2 font-black text-emerald-900 uppercase text-[10px] tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Assessment Passed</span>
                </div>
                <p className="text-xs text-center leading-relaxed font-sans">
                  You have already passed this quiz with {Math.round(bestPassingAttempt.percentage)}%. No retake allowed.
                </p>
                <div className="pt-2 text-[9px] font-black text-emerald-600/80 uppercase tracking-widest text-center border-t border-emerald-100/50 font-sans">
                  Best Score: {bestPassingAttempt.score}/{bestPassingAttempt.total_marks} ({Math.round(bestPassingAttempt.percentage)}%) on {new Date(bestPassingAttempt.attempted_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </div>
              </div>
            ) : (
              <Button
                onClick={() => router.push(`/courses/${id}/modules/${moduleId}/assessment`)}
                className="w-full max-w-sm bg-slate-900 hover:bg-black text-white h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
              >
                BEGIN ASSESSMENT
              </Button>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 text-left max-w-lg mx-auto w-full">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 text-center font-sans">Previous Attempts</h4>
            {attempts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center font-bold font-sans">No previous attempts yet</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 font-sans">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800">Attempt {attempt.attempt_number}</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {new Date(attempt.attempted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">{attempt.score}/{attempt.total_marks}</p>
                        <p className="text-[9px] text-slate-400 font-bold">({Math.round(attempt.percentage)}%)</p>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border",
                        attempt.status === 'PASSED' 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                          : "bg-red-50 border-red-100 text-red-700"
                      )}>
                        {attempt.status === 'PASSED' ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
