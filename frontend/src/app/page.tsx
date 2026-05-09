'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, ShieldCheck, BarChart3, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
 const router = useRouter();

 return (
 <div className="min-h-screen bg-white">
 {/* Navbar */}
 <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 rounded-lg bg-[#F26522] flex items-center justify-center">
 <span className="text-white font-bold text-xl">L</span>
 </div>
 <span className="text-2xl font-bold text-[#111]">Lumina LMS</span>
 </div>
 <div className="flex items-center gap-6">
 <Link href="/login" className="text-sm font-medium text-[#6A6F73] hover:text-[#111]">Login</Link>
 <Button 
 className="bg-[#F26522] hover:bg-[#D54D10] text-white px-6 rounded-lg font-bold"
 onClick={() => router.push('/register-company')}
 >
 Get Started
 </Button>
 </div>
 </nav>

 {/* Hero */}
 <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
 <div className="grid lg:grid-cols-2 gap-12 items-center">
 <div className="space-y-8">
 <h1 className="text-6xl font-bold text-[#111] leading-tight">
 Empower your workforce with <span className="text-[#F26522]">smart learning.</span>
 </h1>
 <p className="text-xl text-[#6A6F73] max-w-lg">
 The all-in-one platform for corporate training, module management, and employee performance tracking.
 </p>
 <div className="flex gap-4">
 <Button 
 size="lg" 
 className="bg-[#F26522] hover:bg-[#D54D10] text-white px-8 h-14 rounded-xl font-bold shadow-lg"
 onClick={() => router.push('/register-company')}
 >
 Register your Company
 </Button>
 <Button 
 size="lg" 
 variant="outline" 
 className="border-[#eee] px-8 h-14 rounded-xl font-bold hover:bg-white"
 onClick={() => router.push('/login')}
 >
 Sign In
 </Button>
 </div>
 <div className="flex items-center gap-6 pt-8">
 <div className="flex -space-x-2">
 {[1,2,3,4].map(i => (
 <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-white" />
 ))}
 </div>
 <p className="text-sm text-[#6A6F73] font-medium">Joined by 500+ companies worldwide</p>
 </div>
 </div>
 <div className="relative">
 <div className="aspect-square bg-orange-50 rounded-[40px] flex items-center justify-center p-12">
 <div className="w-full h-full bg-white rounded-3xl shadow-sm border border-[#eee] p-8 space-y-6">
 <div className="flex justify-between items-center">
 <div className="h-4 w-32 bg-white rounded-full" />
 <div className="h-8 w-8 bg-orange-100 rounded-lg" />
 </div>
 <div className="space-y-3">
 <div className="h-4 w-full bg-white rounded-full" />
 <div className="h-4 w-5/6 bg-white rounded-full" />
 </div>
 <div className="grid grid-cols-2 gap-4 pt-4">
 <div className="h-24 bg-blue-50 rounded-2xl p-4 space-y-2">
 <div className="h-3 w-12 bg-blue-100 rounded-full" />
 <div className="h-6 w-8 bg-blue-200 rounded-md" />
 </div>
 <div className="h-24 bg-green-50 rounded-2xl p-4 space-y-2">
 <div className="h-3 w-12 bg-green-100 rounded-full" />
 <div className="h-6 w-8 bg-green-200 rounded-md" />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </main>

 {/* Features */}
 <section className="bg-white py-24 px-8">
 <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 text-center">
 <div className="space-y-4">
 <div className="w-12 h-12 bg-orange-100 text-[#F26522] rounded-xl flex items-center justify-center mx-auto">
 <BookOpen className="w-6 h-6" />
 </div>
 <h3 className="text-xl font-bold">Course Management</h3>
 <p className="text-[#6A6F73]">Easily create and organize learning modules for your team.</p>
 </div>
 <div className="space-y-4">
 <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
 <BarChart3 className="w-6 h-6" />
 </div>
 <h3 className="text-xl font-bold">Progress Tracking</h3>
 <p className="text-[#6A6F73]">Monitor employee completion rates and performance in real-time.</p>
 </div>
 <div className="space-y-4">
 <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mx-auto">
 <Users className="w-6 h-6" />
 </div>
 <h3 className="text-xl font-bold">Team Management</h3>
 <p className="text-[#6A6F73]">Seamlessly onboard and manage users across your organization.</p>
 </div>
 </div>
 </section>

 {/* Footer */}
 <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-[#eee] flex justify-between items-center text-sm text-[#6A6F73]">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded bg-[#F26522] flex items-center justify-center">
 <span className="text-white font-bold text-xs">L</span>
 </div>
 <span className="font-bold text-[#111]">Lumina LMS</span>
 </div>
 <p>© 2026 Lumina LMS. All rights reserved.</p>
 <div className="flex gap-6">
 <Link href="#" className="hover:text-[#111]">Privacy Policy</Link>
 <Link href="#" className="hover:text-[#111]">Terms of Service</Link>
 </div>
 </footer>
 </div>
 );
}
