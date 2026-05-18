'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);
 const { login } = useAuth();
 const router = useRouter();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 const data = await api.auth.login({ email, password });
 login(data.token, data.user);
 toast.success('Login successful');
 
 if (data.user.role === 'super_admin') {
 router.push('/super-admin');
 } else {
 router.push('/dashboard');
 }
 } catch (error: any) {
 toast.error(error.message || 'Login failed');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-white">
 <div className="w-full max-w-md">
 <div className="text-center mb-8">
 <div className="flex justify-center mb-4">
 <div className="w-16 h-16 rounded-xl bg-[#F26522] flex items-center justify-center shadow-lg">
 <span className="text-white font-bold text-3xl">L</span>
 </div>
 </div>
 <h1 className="text-3xl font-bold text-[#111]">Welcome Back</h1>
 <p className="text-[#6A6F73] mt-2">Log in to your Lumina LMS account</p>
 </div>

 <Card className="bg-white border-[#eee] shadow-xl rounded-2xl overflow-hidden">
 <CardContent className="p-8">
 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="email">Email Address</Label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
 <Input
 id="email"
 type="email"
 placeholder="name@company.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="pl-10 border-[#eee] focus:border-[#F26522]"
 />
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <Label htmlFor="password">Password</Label>
 <Link href="#" className="text-xs text-[#F26522] hover:underline">Forgot password?</Link>
 </div>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]" />
 <Input
 id="password"
 type="password"
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 className="pl-10 border-[#eee] focus:border-[#F26522]"
 />
 </div>
 </div>
 
 <Button 
 type="submit" 
 className="w-full bg-[#111] hover:bg-[#333] text-white h-12 rounded-xl font-bold transition-all"
 disabled={loading}
 >
 {loading ? (
 <Loader2 className="w-5 h-5 animate-spin mx-auto" />
 ) : (
 <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
 )}
 </Button>

 </form>
 </CardContent>
 </Card>
 
 <p className="mt-8 text-center text-xs text-[#6A6F73]">
 © 2026 Lumina LMS. All rights reserved.
 </p>
 </div>
 </div>
 );
}
