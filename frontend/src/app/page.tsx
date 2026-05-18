'use client';

import React from 'react';
import { BookOpen, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LandingPage() {

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
 </div>
 <div className="relative">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.8, ease: "easeOut" }}
 className="aspect-square bg-orange-50 rounded-[40px] flex items-center justify-center p-8"
 >
 <motion.div 
 animate={{ y: [0, -15, 0] }}
 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
 className="relative w-full h-full bg-white rounded-3xl shadow-2xl border border-[#eee] overflow-hidden"
 >
 <Image 
 src="/hero-illustration.png"
 alt="Lumina LMS Learning Experience"
 fill
 className="object-cover"
 priority
 />
 </motion.div>
 </motion.div>
 
 {/* Decorative elements */}
 <motion.div 
 animate={{ y: [0, 10, 0] }}
 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
 className="absolute -bottom-6 -right-6 w-32 h-32 bg-orange-100 rounded-full blur-3xl -z-10 opacity-50" 
 />
 <motion.div 
 animate={{ y: [0, -10, 0] }}
 transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
 className="absolute -top-6 -left-6 w-32 h-32 bg-blue-100 rounded-full blur-3xl -z-10 opacity-50" 
 />
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
