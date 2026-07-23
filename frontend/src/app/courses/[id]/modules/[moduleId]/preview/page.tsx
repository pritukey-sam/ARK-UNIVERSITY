'use client';

import React, { useState, useEffect, use, useRef, Suspense } from 'react';
import { api } from '@/lib/api';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import BackNavigation from '@/components/common/BackNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PlayCircle, CheckCircle2, Video,
  ExternalLink, Loader2, Clock,
  ChevronRight, Bookmark, Trophy,
  FileText, Download, List,
  Play, Info, ArrowLeft,
  Lock, AlertCircle, FileArchive,
  ChevronLeft, Eye, ShieldCheck,
  MoreVertical, Share2, MessageSquare,
  Folder, Settings, Layout, Plus, Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn, formatDuration, parseDuration } from '@/lib/utils';
import { QuizPreview } from '@/components/quiz/QuizPreview';

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

// Separate component for the content to use useSearchParams safely with Suspense
function PreviewContent({ id, moduleId }: { id: string, moduleId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const activeTab = searchParams.get('tab') || 'video';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [module, setModule] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [quizzesData, setQuizzesData] = useState<Record<number, any>>({});
  const [apiReady, setApiReady] = useState(false);
  const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
  const [videoLoadingError, setVideoLoadingError] = useState<string | null>(null);
  const [videoFinished, setVideoFinished] = useState(false);

  // Manage UI flows
  const [activeUploadType, setActiveUploadType] = useState<'video' | 'notes' | 'task' | 'quiz' | null>(null);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

  // Upload Form states
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoMode, setVideoMode] = useState<'upload' | 'link'>('upload');
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isFetchingDuration, setIsFetchingDuration] = useState(false);

  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [uploadingNotes, setUploadingNotes] = useState(false);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [uploadingTask, setUploadingTask] = useState(false);

  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [uploadingQuiz, setUploadingQuiz] = useState(false);
  const [quizDuration, setQuizDuration] = useState<number>(20);

  const playerInstance = useRef<any>(null);
  const playerReady = useRef(false);

  useEffect(() => {
    fetchData();
    loadYoutubeAPI();
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
    if (window.YT && window.YT.Player) setApiReady(true);

    return () => {
      if (playerInstance.current) try { playerInstance.current.destroy(); } catch (e) { }
    };
  }, [moduleId]);

  // Handle Video auto duration calculation
  useEffect(() => {
    if (videoMode === 'upload' && videoFile) {
      extractFileDuration(videoFile);
    }
  }, [videoFile, videoMode]);

  useEffect(() => {
    if (videoMode === 'link' && externalVideoUrl) {
      const timer = setTimeout(() => {
        extractLinkDuration(externalVideoUrl);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [externalVideoUrl, videoMode]);

  const extractFileDuration = (file: File) => {
    setIsFetchingDuration(true);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      setVideoDuration(formatDuration(Math.round(video.duration)));
      setIsFetchingDuration(false);
    };
    video.onerror = () => {
      toast.error("Unable to fetch file duration");
      setIsFetchingDuration(false);
    };
    video.src = URL.createObjectURL(file);
  };

  const extractLinkDuration = async (url: string) => {
    if (!url.match(/^(http|https):\/\//)) return;
    setIsFetchingDuration(true);
    try {
      const ytId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1];
      if (ytId) {
        await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
      } else if (url.toLowerCase().endsWith('.mp4')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setVideoDuration(formatDuration(Math.round(video.duration)));
          setIsFetchingDuration(false);
        };
        video.src = url;
        return;
      }
    } catch (e) {
      console.error("Link duration fetch failed", e);
    } finally {
      setIsFetchingDuration(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [moduleRes, courseRes, modulesRes] = await Promise.all([
        api.common.getModule(parseInt(moduleId)),
        api.common.getCourse(parseInt(id)),
        api.common.getModulesByCourse(parseInt(id))
      ]);
      setModule(moduleRes);
      setCourse(courseRes);
      setModules(modulesRes || []);

      // Do not automatically open a video lesson — show grid first
      setSelectedVideo(null);

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
          setVideoFinished(false);
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
          },
          'onStateChange': (event: any) => {
            if (event.data === 0) {
              setVideoFinished(true);
            }
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
      setVideoFinished(false);
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
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Upload actions
  const handleUploadVideo = async () => {
    if (!videoTitle) return;
    try {
      setUploadingVideo(true);
      let finalUrl = '';

      if (videoMode === 'upload') {
        if (videoFile) {
          const formData = new FormData();
          formData.append('video', videoFile);
          const uploadRes = await api.admin.uploadVideo(formData);
          finalUrl = uploadRes.video_url;
        } else if (editingVideo) {
          finalUrl = editingVideo.video_url;
        } else {
          toast.error("Please select a video file");
          setUploadingVideo(false);
          return;
        }
      } else {
        if (!externalVideoUrl) {
          toast.error("Please enter a valid URL");
          setUploadingVideo(false);
          return;
        }
        finalUrl = externalVideoUrl;
      }

      if (editingVideo) {
        await api.admin.updateVideo(editingVideo.id, {
          title: videoTitle,
          video_url: finalUrl,
          duration_seconds: parseDuration(videoDuration),
          description: videoDescription
        });
        toast.success('Video updated successfully');
      } else {
        await api.admin.addVideo(parseInt(moduleId), {
          title: videoTitle,
          video_url: finalUrl,
          duration_seconds: parseDuration(videoDuration),
          description: videoDescription
        });
        toast.success('Video added successfully');
      }

      setVideoFile(null);
      setExternalVideoUrl('');
      setVideoTitle('');
      setVideoDuration('');
      setVideoDescription('');
      setEditingVideo(null);
      fetchData();
      setActiveUploadType(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to process video");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUploadNotes = async () => {
    if (!notesFile) return;
    try {
      setUploadingNotes(true);
      const formData = new FormData();
      formData.append('file', notesFile);
      await api.admin.addNotes(parseInt(moduleId), formData);
      toast.success('Notes uploaded successfully');
      setNotesFile(null);
      fetchData();
      setActiveUploadType(null);
    } catch (e: any) {
      toast.error(e.message || "Notes upload failed");
    } finally {
      setUploadingNotes(false);
    }
  };

  const handleUploadTask = async () => {
    if (!taskFile || !taskTitle) return;
    try {
      setUploadingTask(true);
      const formData = new FormData();
      formData.append('file', taskFile);
      formData.append('title', taskTitle);
      await api.admin.addAssignment(parseInt(moduleId), formData);
      toast.success('Assignment task created');
      setTaskFile(null);
      setTaskTitle('');
      fetchData();
      setActiveUploadType(null);
    } catch (e: any) {
      toast.error(e.message || "Task creation failed");
    } finally {
      setUploadingTask(false);
    }
  };

  const handleUploadQuizBulk = async () => {
    if (!quizFile) return;
    try {
      setUploadingQuiz(true);
      const formData = new FormData();
      formData.append('file', quizFile);
      const res = await api.admin.bulkQuizPreview(parseInt(moduleId), formData);
      const validQuestions = res.questions.filter((q: any) => !q.error);
      if (validQuestions.length === 0) {
        toast.error('No valid questions found in Excel file.');
        setUploadingQuiz(false);
        return;
      }
      await api.admin.bulkQuizConfirm(parseInt(moduleId), { 
        questions: validQuestions,
        time_limit: Math.max(1, Math.min(180, quizDuration || 20))
      });
      toast.success('Quiz imported successfully');
      setQuizFile(null);
      fetchData();
      setActiveUploadType(null);
    } catch (e: any) {
      toast.error(e.message || "Quiz import failed");
    } finally {
      setUploadingQuiz(false);
    }
  };

  const handleDeleteItem = async (type: string, itemId: number) => {
    try {
      if (type === 'video') await api.admin.deleteVideo(itemId);
      if (type === 'notes') await api.admin.deleteNotes(itemId);
      if (type === 'assignment') await api.admin.deleteAssignment(itemId);
      if (type === 'quiz') await api.admin.deleteQuiz(itemId);
      toast.success('Resource deleted successfully');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Deletion failed');
    }
  };

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
            onClick={() => {
              if (activeUploadType !== null) {
                setActiveUploadType(null);
                setEditingVideo(null);
                setVideoFile(null);
                setExternalVideoUrl('');
                setVideoTitle('');
                setVideoDuration('');
                setVideoDescription('');
              } else if (selectedVideo !== null) {
                setSelectedVideo(null);
              } else {
                router.push(`/courses/${id}`);
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
            {/* YouTube-style Create button with dropdown */}
            {isAdmin && (
              <div className="relative">
                <Button
                  onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
                  className="bg-[#F26522] hover:bg-[#D54D10] text-white rounded-full h-9 px-5 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create
                </Button>
                {createDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[140]" onClick={() => setCreateDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#eee] rounded-xl shadow-lg z-[150] overflow-hidden py-1">
                      {[
                        { label: 'Upload Video', type: 'video' },
                        { label: 'Upload Notes', type: 'notes' },
                        { label: 'Upload Task', type: 'task' },
                        { label: 'Upload Quiz', type: 'quiz' }
                      ].map(item => (
                        <button
                          key={item.type}
                          onClick={() => {
                            setCreateDropdownOpen(false);
                            setActiveUploadType(item.type as any);
                            handleTabChange(item.type);
                            setSelectedVideo(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-[#F26522]/5 hover:text-[#F26522] transition-colors"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN FULL WIDTH PREVIEW LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* Module Title Header */}
        <div className="space-y-1">
          {(() => {
            const idx = modules.findIndex(m => m.id === module?.id);
            const moduleNumberLabel = idx !== -1 ? `Module ${idx + 1}` : "Module";
            return (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {moduleNumberLabel}
              </span>
            );
          })()}
          <h1 className="text-2xl font-bold text-[#111] tracking-tight">{module.title}</h1>
        </div>

        {/* 3. YOUTUBE-STYLE TABS */}
        <div className="flex flex-wrap gap-2.5 pb-4 border-b border-gray-100">
          {[
            { id: 'video', label: 'Videos', icon: Video },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'task', label: 'Task', icon: Folder },
            { id: 'quiz', label: 'Quiz', icon: Trophy }
          ].map(pill => {
            const isActive = activeTab === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => {
                  handleTabChange(pill.id);
                  setSelectedVideo(null);
                  setActiveUploadType(null);
                  setEditingVideo(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-full transition-all duration-200 border",
                  isActive
                    ? "bg-[#F26522] border-[#F26522] text-white shadow-md shadow-orange-100"
                    : "bg-gray-100 border-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
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

            {/* IF INLINE UPLOAD MODE ACTIVE */}
            {activeUploadType !== null ? (
              <div className="bg-white border border-[#eee] rounded-2xl p-8 max-w-2xl mx-auto space-y-6 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 capitalize">
                    {activeUploadType === 'video' ? (editingVideo ? 'Edit Video Lecture' : 'Add Video Lecture') :
                      activeUploadType === 'notes' ? 'Upload PDF Notes' :
                        activeUploadType === 'task' ? 'Create Deliverable Task' :
                          'Import Bulk Quiz'}
                  </h3>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveUploadType(null);
                      setEditingVideo(null);
                      setVideoFile(null);
                      setExternalVideoUrl('');
                      setVideoTitle('');
                      setVideoDuration('');
                      setVideoDescription('');
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-gray-900 rounded-lg h-8 px-3"
                  >
                    Cancel
                  </Button>
                </div>

                {/* Inline Video Upload */}
                {activeUploadType === 'video' && (
                  <div className="space-y-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg w-max">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-3 text-xs font-bold rounded-md", videoMode === 'upload' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
                        onClick={() => setVideoMode('upload')}
                      >
                        Upload File
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-3 text-xs font-bold rounded-md", videoMode === 'link' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
                        onClick={() => setVideoMode('link')}
                      >
                        Add Video Link
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Video Title</Label>
                        <Input value={videoTitle || ""} onChange={e => setVideoTitle(e.target.value)} className="h-10 text-sm border-[#eee] rounded-lg" placeholder="e.g. Introduction to 3D Space" />
                      </div>
                      {videoMode === 'link' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Duration (e.g. 15, 1:30, 1:20:30)</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={videoDuration || ""}
                            onChange={e => setVideoDuration(e.target.value)}
                            className="h-10 text-sm border-[#eee] rounded-lg pr-20"
                            placeholder="e.g. 15 or 1:30"
                          />
                          {isFetchingDuration && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-orange-500 font-bold bg-white px-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="animate-pulse">FETCHING...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Video Description</Label>
                        <Textarea
                          value={videoDescription || ""}
                          onChange={e => setVideoDescription(e.target.value)}
                          className="min-h-[100px] text-sm border-[#eee] rounded-lg"
                          placeholder="Explain what is covered in this lesson..."
                        />
                      </div>

                      <div className="mt-2">
                        {videoMode === 'upload' ? (
                          <div className="flex gap-3 items-center">
                            <input type="file" accept="video/mp4" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="h-10 text-sm border border-[#eee] bg-transparent px-2.5 py-1 rounded-lg flex-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none" />
                            <Button
                              onClick={handleUploadVideo}
                              disabled={(!videoFile && !editingVideo) || !videoTitle || uploadingVideo}
                              className="h-10 bg-[#F26522] hover:bg-[#D54D10] text-white px-6 rounded-lg font-bold text-xs uppercase"
                            >
                              {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingVideo ? "Save Changes" : "Upload")}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-start">
                            <Input
                              type="url"
                              value={externalVideoUrl || ""}
                              onChange={e => setExternalVideoUrl(e.target.value)}
                              className="h-10 text-sm border-[#eee] rounded-lg flex-1"
                              placeholder="Paste YouTube or direct video URL"
                            />
                            <Button
                              onClick={handleUploadVideo}
                              disabled={!externalVideoUrl || !videoTitle || uploadingVideo}
                              className="h-10 bg-[#F26522] hover:bg-[#D54D10] text-white px-6 rounded-lg font-bold text-xs uppercase"
                            >
                              {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingVideo ? "Save Changes" : "Save Link")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Notes Upload */}
                {activeUploadType === 'notes' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Select PDF Document</Label>
                      <div className="flex gap-3 items-center">
                        <input type="file" accept=".pdf" onChange={e => setNotesFile(e.target.files?.[0] || null)} className="h-10 text-sm border border-[#eee] bg-transparent px-2.5 py-1 rounded-lg flex-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none" />
                        <Button onClick={handleUploadNotes} disabled={!notesFile || uploadingNotes} className="h-10 bg-[#F26522] hover:bg-[#D54D10] text-white px-6 rounded-lg font-bold text-xs uppercase">
                          {uploadingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Task Upload */}
                {activeUploadType === 'task' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Assignment Title</Label>
                      <Input value={taskTitle || ""} onChange={e => setTaskTitle(e.target.value)} className="h-10 text-sm border-[#eee] rounded-lg" placeholder="e.g. Final Portfolio Submission" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Instructions Document</Label>
                      <div className="flex gap-3 items-center">
                        <input type="file" onChange={e => setTaskFile(e.target.files?.[0] || null)} className="h-10 text-sm border border-[#eee] bg-transparent px-2.5 py-1 rounded-lg flex-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none" />
                        <Button onClick={handleUploadTask} disabled={!taskFile || !taskTitle || uploadingTask} className="h-10 bg-[#F26522] hover:bg-[#D54D10] text-white px-6 rounded-lg font-bold text-xs uppercase">
                          {uploadingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Quiz Upload */}
                {activeUploadType === 'quiz' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Import Excel Template</Label>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold text-[#F26522]" onClick={async () => {
                        try {
                          const response = await fetch('/api/quizzes/sample-template', { credentials: 'include' });
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = 'quiz_template.xlsx';
                          document.body.appendChild(a); a.click();
                          window.URL.revokeObjectURL(url);
                        } catch (e) {
                          toast.error("Failed to download template");
                        }
                      }}>
                        Download Excel Template
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5 max-w-xs">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Quiz Duration (Minutes)</Label>
                        <Input 
                          type="number"
                          min={1}
                          max={180}
                          value={quizDuration}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setQuizDuration(isNaN(val) ? 20 : val);
                          }}
                          className="h-10 text-sm border border-[#eee] bg-transparent rounded-lg"
                          placeholder="e.g. 20"
                        />
                      </div>
                      <div className="flex gap-3 items-center">
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setQuizFile(e.target.files?.[0] || null)} className="h-10 text-sm border border-[#eee] bg-transparent px-2.5 py-1 rounded-lg flex-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none" />
                        <Button onClick={handleUploadQuizBulk} disabled={!quizFile || uploadingQuiz} className="h-10 bg-[#F26522] hover:bg-[#D54D10] text-white px-6 rounded-lg font-bold text-xs uppercase">
                          {uploadingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Quiz"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                              onEnded={() => setVideoFinished(true)}
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>

                        {/* Navigation Buttons Row */}
                        {(() => {
                          const videosList = module?.videos || [];
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
                                    setSelectedVideo(nextVideo);
                                    setVideoFinished(false);
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
                              {isAdmin && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      const video = selectedVideo;
                                      setEditingVideo(video);
                                      setVideoTitle(video.title);
                                      setVideoDescription(video.description || '');
                                      setVideoDuration(formatDuration(video.duration_seconds || 0));
                                      setVideoMode(video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be') ? 'link' : 'upload');
                                      setExternalVideoUrl(video.video_url);
                                      setVideoFile(null);
                                      setActiveUploadType('video');
                                      handleTabChange('video');
                                      setSelectedVideo(null);
                                    }}
                                    className="h-8 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs uppercase px-3 flex items-center gap-1.5"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                    Edit Video
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setDeleteTarget({ type: 'video', id: selectedVideo.id });
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs uppercase px-3 flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Video
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-loose opacity-80">
                            {selectedVideo?.description || "In this lesson, we examine the technical implementations and conceptual frameworks required for this module."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* IF NO VIDEO IS SELECTED → SHOW YOUTUBE STYLE CARD GRID */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-150">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Videos</h3>
                          <Badge className="bg-gray-100 text-gray-600 border-none font-bold text-xs px-2.5 py-1 rounded-lg">
                            {module.videos?.length || 0} Lessons
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                          {module.videos && module.videos.length > 0 ? (
                            module.videos.map((video: any, vIdx: number) => {
                              const thumbnail = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60`;
                              return (
                                <div
                                  key={video.id}
                                  onClick={() => setSelectedVideo(video)}
                                  className="group cursor-pointer space-y-3"
                                >
                                  {/* Thumbnail Wrapper */}
                                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-150 shadow-sm transition-transform duration-300 group-hover:scale-[1.02] group-hover:shadow-md">
                                    <VideoThumbnail video={video} />
                                    {/* Play Overlay */}
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                      <div className="w-11 h-11 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100 duration-300">
                                        <Play className="w-3.5 h-3.5 fill-current text-[#F26522] ml-0.5" />
                                      </div>
                                    </div>
                                    {/* Duration Badge */}
                                    <div className="absolute bottom-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                                      {formatDuration(video.duration_seconds || 0)}
                                    </div>
                                  </div>

                                  {/* Metadata */}
                                  <div className="flex gap-3 px-1 justify-between">
                                    <div className="flex gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-[#F26522]/10 text-[#F26522] flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                                        {(vIdx + 1).toString().padStart(2, '0')}
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
                                    {isAdmin && (
                                      <div className="flex items-center gap-1 shrink-0 self-start mt-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingVideo(video);
                                            setVideoTitle(video.title);
                                            setVideoDescription(video.description || '');
                                            setVideoDuration(formatDuration(video.duration_seconds || 0));
                                            setVideoMode(video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be') ? 'link' : 'upload');
                                            setExternalVideoUrl(video.video_url);
                                            setVideoFile(null);
                                            setActiveUploadType('video');
                                            handleTabChange('video');
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-[#F26522] hover:bg-orange-50 rounded-full transition-colors"
                                          title="Edit Video"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTarget({ type: 'video', id: video.id });
                                            setDeleteConfirmOpen(true);
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                          title="Delete Video"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-full py-24 text-center space-y-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                              <Video className="w-12 h-12 mx-auto text-gray-200" />
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No video lectures uploaded yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── NOTES TAB CONTENT ── */}
                {activeTab === 'notes' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-[#111]">Document Verification</h3>
                      <span className="text-xs font-bold text-gray-400 uppercase">{module.notes?.length || 0} Assets</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {module.notes?.length > 0 ? (
                        module.notes.map((note: any, i: number) => (
                          <div key={note.id} className="group p-6 border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all bg-white flex items-center justify-between shadow-sm">
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
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleFileDownload(note.file_url, note.file_name || `Study_Material_${i + 1}.pdf`)}
                                className="w-10 h-10 rounded-lg border-gray-100 bg-white"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({ type: 'notes', id: note.id });
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="text-gray-400 hover:text-red-600 h-10 w-10 p-0 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
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

                {/* ── TASK TAB CONTENT ── */}
                {activeTab === 'task' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-[#111]">Deliverable Tasks</h3>
                      <span className="text-xs font-bold text-gray-400 uppercase">{module.assignments?.length || 0} Tasks</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                    {module.assignments?.length > 0 ? (
                      module.assignments.map((task: any, i: number) => (
                        <div key={task.id} className="group p-6 border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all bg-white flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                              <Bookmark className="w-7 h-7" />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-[#111]">{task.title}</h4>
                              <p className="text-xs text-gray-400 font-bold uppercase mt-1">Assignment • Task {i + 1}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={task.file_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg font-bold text-xs uppercase text-gray-500 hover:text-emerald-600")}>View</a>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleFileDownload(task.file_url, task.title + ".pdf")}
                              className="w-10 h-10 rounded-lg border-gray-100 bg-white"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: 'assignment', id: task.id });
                                  setDeleteConfirmOpen(true);
                                }}
                                className="text-gray-400 hover:text-red-600 h-10 w-10 p-0 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center space-y-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Bookmark className="w-12 h-12 mx-auto text-gray-200" />
                        <p className="text-xs font-bold text-gray-400 uppercase">No tasks defined</p>
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {/* ── QUIZ TAB CONTENT ── */}
                {activeTab === 'quiz' && (
                  <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                    {module.quizzes?.length > 0 ? (
                      module.quizzes.map((quiz: any) => (
                        <div key={quiz.id} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: 'quiz', id: quiz.id });
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-gray-400 hover:text-red-600 h-10 w-10 p-0 rounded-lg absolute top-4 right-4 z-10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
              </>
            )}
          </Suspense>
        </div>

        {/* BOTTOM MODULE NAVIGATION */}
        {modules.length > 0 && (
          (() => {
            const currentModuleIndex = modules.findIndex(m => m.id === module?.id);
            if (currentModuleIndex === -1) return null;
            const prevMod = currentModuleIndex > 0 ? modules[currentModuleIndex - 1] : null;
            const nextMod = currentModuleIndex < modules.length - 1 ? modules[currentModuleIndex + 1] : null;

            return (
              <div className="flex items-center justify-between pt-8 mt-12 border-t border-gray-200">
                {prevMod ? (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/courses/${id}/modules/${prevMod.id}/preview`)}
                    className="flex items-center gap-2 rounded-xl h-11 px-5 font-bold text-xs uppercase border-gray-200 text-[#6A6F73] hover:text-[#111] transition-all bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Module
                  </Button>
                ) : (
                  <div />
                )}

                {nextMod && (
                  <Button
                    onClick={() => router.push(`/courses/${id}/modules/${nextMod.id}/preview`)}
                    className="flex items-center gap-2 rounded-xl h-11 px-5 font-bold text-xs uppercase transition-all bg-[#F26522] hover:bg-[#D54D10] text-white shadow-sm hover:shadow-md"
                  >
                    Next Module <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })()
        )}

      </div>
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${
          deleteTarget?.type === 'assignment' 
            ? 'Task' 
            : deleteTarget?.type === 'notes' 
            ? 'Document' 
            : deleteTarget?.type === 'video'
            ? 'Video'
            : deleteTarget?.type === 'quiz'
            ? 'Quiz'
            : 'Resource'
        }`}
        description="Are you sure you want to delete this resource? This action cannot be undone."
        trigger={null}
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDeleteItem(deleteTarget.type, deleteTarget.id);
            if (deleteTarget.type === 'video' && selectedVideo?.id === deleteTarget.id) {
              setSelectedVideo(null);
            }
            setDeleteTarget(null);
          }
        }}
      />
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
