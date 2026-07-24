'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, Award, BookOpen, Smile, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { validateEmail } from '@/lib/validation';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams?.get('expired');

  useEffect(() => {
    if (expired) {
      toast.error('Session expired. Please log in again.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [expired]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError("Email address is required");
    } else if (!validateEmail(val)) {
      setEmailError("Invalid email address");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError("Invalid email address");
      return toast.error("Invalid email address");
    }

    setLoading(true);
    try {
      const data = await api.auth.login({ email, password });
      login(data.user);
      toast.success('Login successful');
      
      if (data.user.role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f5] bg-gradient-to-br from-[#fffdfb] via-[#fff5f0] to-[#ffebd9] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-4 left-4 lg:top-6 lg:left-6 z-20 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#F26522] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/80 shadow-sm transition-all hover:shadow hover:bg-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shadow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(0.85); opacity: 0.08; }
        }
        @keyframes tick {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes steam {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-12px) scale(1.2); opacity: 0; }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-shadow {
          animation: shadow-pulse 5s ease-in-out infinite;
        }
        .animate-tick {
          animation: tick 60s linear infinite;
          transform-origin: 300px 100px;
        }
        .animate-steam {
          animation: steam 3s ease-in-out infinite;
        }
        .animate-blink {
          animation: blink 4s infinite;
          transform-origin: 275px 233px;
        }
      `}</style>

      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F26522]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F26522]/15 rounded-full blur-3xl" />

      {/* Main Split-Layout Container */}
      <div className="w-full max-w-6xl min-h-[680px] lg:h-[760px] bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 shadow-2xl flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: 3D Workspace Scene */}
        <div className="hidden lg:flex w-1/2 bg-[#F0F2F8]/70 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-200/40">
          {/* Top Logo */}
          <div className="flex items-center gap-3 z-10">
            <img src="/ark-simplify-logo.png" className="h-[40px] w-auto object-contain" alt="ARK Simplify Logo" />
            <span className="font-extrabold text-xl text-[#111] tracking-tight">ARK University</span>
          </div>

          {/* Interactive Modern 3D Flat-Clay Illustration */}
          <div className="flex-1 flex items-center justify-center relative w-full h-full max-h-[450px]">
            <svg 
              viewBox="0 0 600 500" 
              className="w-full h-full drop-shadow-[0_20px_35px_rgba(242,101,34,0.06)]"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff8f5" />
                  <stop offset="100%" stopColor="#fff2eb" />
                </linearGradient>
                <linearGradient id="deskGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2c3e50" />
                  <stop offset="100%" stopColor="#1a252f" />
                </linearGradient>
                <linearGradient id="claySkin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffdbca" />
                  <stop offset="100%" stopColor="#f5b89d" />
                </linearGradient>
                <linearGradient id="claySweater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff854d" />
                  <stop offset="100%" stopColor="#e04e0b" />
                </linearGradient>
                <linearGradient id="plantGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ecc71" />
                  <stop offset="100%" stopColor="#27ae60" />
                </linearGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="shadowBlur" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>

              {/* 1. Floor & Shadow */}
              <ellipse cx="300" cy="435" rx="200" ry="24" fill="#f4ddd3" />
              <ellipse cx="280" cy="435" rx="140" ry="15" fill="#e5cbbd" className="animate-shadow" style={{ transformOrigin: '300px 435px' }} />

              {/* 2. Snake Plant */}
              <g transform="translate(460, 260)">
                {/* Pot */}
                <ellipse cx="30" cy="150" rx="22" ry="7" fill="#c3aba0" />
                <path d="M10,110 L50,110 L46,150 L14,150 Z" fill="#ffffff" stroke="#eed5ca" strokeWidth="2" />
                <ellipse cx="30" cy="110" rx="20" ry="6" fill="#e3d0c7" />
                <ellipse cx="30" cy="110" rx="17" ry="4" fill="#7d5848" />
                {/* Leaves */}
                <path d="M22,110 C10,60 15,10 25,2 C29,30 27,70 28,110 Z" fill="url(#plantGrad)" stroke="#27ae60" />
                <path d="M24,20 C18,40 21,70 24,105" stroke="#f1c40f" strokeWidth="2" strokeLinecap="round" />
                
                <path d="M38,110 C48,70 42,30 32,15 C34,40 33,80 34,110 Z" fill="#27ae60" />
                
                <path d="M30,110 C20,75 35,45 30,30 C35,50 32,80 32,110 Z" fill="url(#plantGrad)" />
                <path d="M29,40 C27,60 30,85 30,108" stroke="#f1c40f" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* 3. Desk Lamp (Floating/Elegance) */}
              <g transform="translate(130, 230)">
                <path d="M20,130 L20,60 C20,30 50,30 50,50" stroke="#7f8c8d" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="20" cy="130" rx="15" ry="5" fill="#bdc3c7" />
                {/* Lamp Shade */}
                <path d="M35,50 L65,35 L75,55 L45,70 Z" fill="#F26522" />
                <ellipse cx="60" cy="62" rx="16" ry="7" fill="#fff" transform="rotate(-20, 60, 62)" />
                {/* Light Beam */}
                <polygon points="52,65 140,160 90,175" fill="#f1c40f" opacity="0.15" filter="url(#softGlow)" />
              </g>

              {/* 4. Desk Accessories (Animated Mug) */}
              <g transform="translate(325, 298)">
                <rect x="0" y="5" width="16" height="20" rx="4" fill="#3498db" />
                <path d="M14,10 C18,10 18,20 14,20" stroke="#3498db" strokeWidth="3" fill="none" />
                {/* Steam */}
                <path d="M4,0 Q2,-4 4,-8 T4,-16" stroke="#bdc3c7" strokeWidth="1.5" fill="none" strokeLinecap="round" className="animate-steam" />
                <path d="M10,-2 Q8,-6 10,-10 T10,-18" stroke="#bdc3c7" strokeWidth="1.5" fill="none" strokeLinecap="round" className="animate-steam" style={{ animationDelay: '1.5s' }} />
              </g>

              {/* 5. Wall Clock (Interactive Ticking) */}
              <g transform="translate(0, 30)">
                <circle cx="300" cy="100" r="30" fill="#ffffff" stroke="#eed5ca" strokeWidth="3" />
                <circle cx="300" cy="100" r="26" fill="#fffefd" />
                {/* Hours Tick */}
                <line x1="300" y1="74" x2="300" y2="78" stroke="#7f8c8d" strokeWidth="2" />
                <line x1="300" y1="126" x2="300" y2="122" stroke="#7f8c8d" strokeWidth="2" />
                <line x1="274" y1="100" x2="278" y2="100" stroke="#7f8c8d" strokeWidth="2" />
                <line x1="326" y1="100" x2="322" y2="100" stroke="#7f8c8d" strokeWidth="2" />
                {/* Clock Hands */}
                <line x1="300" y1="100" x2="312" y2="92" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="300" y1="100" x2="295" y2="82" stroke="#7f8c8d" strokeWidth="1.5" strokeLinecap="round" />
                {/* Animated Seconds Hand */}
                <line x1="300" y1="100" x2="300" y2="75" stroke="#F26522" strokeWidth="1" strokeLinecap="round" className="animate-tick" />
                <circle cx="300" cy="100" r="2.5" fill="#F26522" />
              </g>

              {/* 6. Desk (Modern Minimalist Workspace) */}
              <g>
                {/* Desk Legs */}
                <line x1="160" y1="320" x2="160" y2="425" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
                <line x1="160" y1="425" x2="160" y2="428" stroke="#7d5848" strokeWidth="7" strokeLinecap="round" />
                <line x1="380" y1="320" x2="380" y2="425" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
                <line x1="380" y1="425" x2="380" y2="428" stroke="#7d5848" strokeWidth="7" strokeLinecap="round" />
                <line x1="180" y1="320" x2="195" y2="415" stroke="#e3d0c7" strokeWidth="5" strokeLinecap="round" />
                <line x1="360" y1="320" x2="345" y2="415" stroke="#e3d0c7" strokeWidth="5" strokeLinecap="round" />
                {/* Desk Top */}
                <rect x="130" y="300" width="280" height="20" rx="10" fill="url(#deskGrad)" />
                <rect x="130" y="312" width="280" height="8" rx="4" fill="#111827" />
                {/* Warm highlight */}
                <rect x="140" y="302" width="260" height="2" rx="1" fill="#5c768d" opacity="0.3" />
              </g>

              {/* 7. Animated Character (Sitting on Chair, typing) */}
              <g className="animate-float">
                {/* Chair Back */}
                <rect x="235" y="240" width="60" height="70" rx="15" fill="#bdc3c7" />
                <rect x="242" y="247" width="46" height="56" rx="10" fill="#a6b1b7" />
                {/* Chair Spine */}
                <rect x="260" y="305" width="10" height="70" fill="#7f8c8d" />

                {/* Character Body (Sweater) */}
                <path d="M215,350 C215,290 315,290 315,350 Z" fill="url(#claySweater)" />
                {/* Collar */}
                <path d="M245,290 C245,305 285,305 285,290 Z" fill="#b83b04" />
                <path d="M248,290 C248,300 282,300 282,290 Z" fill="url(#claySkin)" />

                {/* Face & Head */}
                <rect x="240" y="200" width="50" height="52" rx="22" fill="url(#claySkin)" />
                {/* Ears */}
                <circle cx="238" cy="226" r="6" fill="#f5b89d" />
                <circle cx="292" cy="226" r="6" fill="#f5b89d" />

                {/* Glasses (Trendy) */}
                <rect x="245" y="218" width="16" height="12" rx="3" stroke="#2c3e50" strokeWidth="2.5" fill="none" />
                <rect x="269" y="218" width="16" height="12" rx="3" stroke="#2c3e50" strokeWidth="2.5" fill="none" />
                <line x1="261" y1="224" x2="269" y2="224" stroke="#2c3e50" strokeWidth="2.5" />
                
                {/* Eyes (Blinking!) */}
                <circle cx="253" cy="224" r="2.5" fill="#2c3e50" className="animate-blink" />
                <circle cx="277" cy="224" r="2.5" fill="#2c3e50" className="animate-blink" />

                {/* Hair & Beard (Trendy modern look) */}
                <path d="M238,210 C242,190 288,190 292,210 C296,200 280,185 265,188 C250,185 236,198 238,210 Z" fill="#4a2e2b" />
                <path d="M246,244 C255,254 275,254 284,244 C288,240 280,246 265,246 C250,246 242,240 246,244 Z" fill="#4a2e2b" />

                {/* Nose */}
                <path d="M262,224 C262,228 268,228 268,224 Z" fill="#e8a384" />

                {/* Laptop & Screen Glow */}
                <g transform="translate(170, 240)">
                  {/* Base */}
                  <path d="M5,50 L85,50 L95,58 L0,58 Z" fill="#7f8c8d" />
                  <rect x="15" y="51" width="60" height="3" rx="1.5" fill="#bdc3c7" />
                  {/* Screen (Open) */}
                  <path d="M5,50 L20,3 C20,1 23,0 25,0 L85,0 C87,0 89,1 89,3 L75,50 Z" fill="#2c3e50" />
                  {/* Inner Screen */}
                  <path d="M8,47 L22,5 C22,4 24,3 26,3 L82,3 C83,3 84,4 84,5 L72,47 Z" fill="#34495e" />
                  {/* Glow */}
                  <polygon points="22,5 82,3 130,130 -30,130" fill="#F26522" opacity="0.08" filter="url(#softGlow)" />
                </g>

                {/* Arms & Hands (Typing Animation) */}
                <path d="M225,320 Q205,300 195,292" stroke="url(#claySweater)" strokeWidth="13" strokeLinecap="round" />
                <path d="M295,320 Q315,300 305,290" stroke="url(#claySweater)" strokeWidth="13" strokeLinecap="round" />
                
                {/* Hands */}
                <circle cx="192" cy="290" r="6" fill="#f5b89d" />
                <circle cx="307" cy="288" r="6" fill="#f5b89d" />
              </g>
            </svg>
          </div>

          {/* Bottom Features Carousel-like Text */}
          <div className="z-10 bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-slate-200/50 shadow-sm">
            <div className="flex items-center gap-2 text-[#2D3250] font-bold text-xs uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 animate-bounce" /> Enterprise Learning Portal
            </div>
            <h3 className="font-extrabold text-[#111] text-lg mb-1">Empower Your Team's Growth</h3>
            <p className="text-xs text-[#6A6F73] leading-relaxed">
              Access curated video tracks, dynamic tasks, interactive assessments, and real-time skill verification dashboards.
            </p>
          </div>
        </div>

        {/* Right Side: Existing ARK University Login Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-16 flex flex-col justify-between relative shadow-[-12px_0_40px_rgba(242,101,34,0.03)]">
          {/* Top Logo (Mobile View Only) */}
          <div className="flex lg:hidden items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <img src="/ark-simplify-logo.png" className="h-[32px] w-auto object-contain" alt="ARK Simplify Logo" />
              <span className="font-extrabold text-base text-[#111]">ARK University</span>
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sign In</span>
          </div>

          <div className="my-auto space-y-8">
            {/* Header Text */}
            <div className="space-y-3">
              <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-xs font-bold text-[#F26522] border border-orange-100">
                <Smile className="w-3.5 h-3.5" /> Welcome Back Learner
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111] tracking-tight">Log In Account</h2>
              <p className="text-[#6A6F73] text-sm font-medium leading-relaxed">
                Welcome back! Please enter your company credentials to resume your workspace and track your assigned curricula.
              </p>
            </div>

            {/* Login Form Wrapper */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                    <div className="relative group">
                      <Mail className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#F26522] transition-colors", emailError && "text-red-500")} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={(e) => handleEmailChange(e.target.value)}
                        required
                        className={cn(
                          "pl-12 h-12 border-gray-200 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl text-sm transition-all bg-gray-50/30 focus:bg-white",
                          emailError && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                      />
                    </div>
                    {emailError && <p className="text-red-500 text-xs font-bold mt-1">{emailError}</p>}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</Label>
                      <Link href="/forgot-password" className="text-xs font-semibold text-[#F26522] hover:underline hover:text-[#d54d10]">Forgot password?</Link>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#F26522] transition-colors z-10" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-12 pr-12 h-12 border-gray-200 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] rounded-xl text-sm transition-all bg-gray-50/30 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-[#F26522] transition-colors focus:outline-none"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-[#F26522] hover:bg-[#D54D10] text-white h-12 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl shadow-orange-500/15 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !!emailError}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>Sign In <ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Footer Text */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6A6F73]">
            <p>© 2026 ARK University LMS. All rights reserved.</p>
            <div className="flex items-center gap-3 font-medium">
              <a href="#" className="hover:underline">Terms of Service</a>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <a href="#" className="hover:underline">Privacy Policy</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
