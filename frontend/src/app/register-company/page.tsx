'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, User, Mail, Lock, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { validateEmailField, validateName, validateCourseName } from '@/lib/validation';

export default function RegisterCompanyPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(false);
 const [plan, setPlan] = useState<'free' | 'paid'>('free');

 const [formData, setFormData] = useState({
 companyName: '',
 adminName: '',
 adminEmail: '',
 password: '',
 });
 
 const [companyNameError, setCompanyNameError] = useState<string | null>(null);
 const [adminNameError, setAdminNameError] = useState<string | null>(null);
 const [emailError, setEmailError] = useState<string | null>(null);
 const [passwordError, setPasswordError] = useState<string | null>(null);

 const handleCompanyNameChange = (val: string) => {
   setFormData(prev => ({ ...prev, companyName: val }));
   const check = validateCourseName(val);
   setCompanyNameError(check.isValid ? null : (check.error || "Invalid company name"));
 };

 const handleAdminNameChange = (val: string) => {
   setFormData(prev => ({ ...prev, adminName: val }));
   const check = validateName(val);
   setAdminNameError(check.isValid ? null : (check.error || "Invalid admin name"));
 };

 const handleAdminEmailChange = (val: string) => {
   setFormData(prev => ({ ...prev, adminEmail: val }));
   const check = validateEmailField(val);
   setEmailError(check.isValid ? null : (check.error || "Invalid email address"));
 };

 const handlePasswordChange = (val: string) => {
   setFormData(prev => ({ ...prev, password: val }));
   if (!val) {
     setPasswordError("Password is required");
   } else if (val.length < 8) {
     setPasswordError("Password must be at least 8 characters long");
   } else {
     setPasswordError(null);
   }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 const companyCheck = validateCourseName(formData.companyName);
 if (!companyCheck.isValid) {
   setCompanyNameError(companyCheck.error || "Invalid company name");
   return toast.error(companyCheck.error || "Invalid company name");
 }

 const adminCheck = validateName(formData.adminName);
 if (!adminCheck.isValid) {
   setAdminNameError(adminCheck.error || "Invalid admin name");
   return toast.error(adminCheck.error || "Invalid admin name");
 }

 const emailCheck = validateEmailField(formData.adminEmail);
 if (!emailCheck.isValid) {
   setEmailError(emailCheck.error || "Invalid email address");
   return toast.error(emailCheck.error || "Invalid email address");
 }

 if (formData.password.length < 8) {
   setPasswordError("Password must be at least 8 characters long");
   return toast.error("Password must be at least 8 characters long");
 }

 setLoading(true);

 try {
 const response = await fetch('http://localhost:8000/api/register-company', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: formData.companyName,
 admin_name: formData.adminName,
 admin_email: formData.adminEmail,
 admin_password: formData.password,
 plan_type: plan,
 plan_price: plan === 'paid' ? 99.0 : 0.0,
 }),
 });

 const data = await response.json();

 if (response.ok) {
 setSuccess(true);
 toast.success(data.message);
 if (plan === 'free') {
 setTimeout(() => router.push('/login'), 3000);
 }
 } else {
 toast.error(data.detail || 'Registration failed');
 }
 } catch (error) {
 toast.error('An error occurred during registration');
 } finally {
 setLoading(false);
 }
 };

 if (success) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-white">
 <div className="max-w-md w-full text-center space-y-6">
 <div className="flex justify-center">
 <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
 <CheckCircle2 className="w-10 h-10 text-green-600" />
 </div>
 </div>
 <h1 className="text-3xl font-bold text-[#111]">Registration Successful!</h1>
 <p className="text-[#6A6F73]">
 {plan === 'free' 
 ? "Your company has been registered. You can now log in to your account." 
 : "Your registration is pending approval from the Super Admin. We will notify you once it is active."}
 </p>
 <Button 
 className="mt-4 bg-[#F26522] hover:bg-[#D54D10] text-white"
 onClick={() => router.push('/login')}
 >
 Go to Login
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-white">
 <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
 <div className="space-y-6">
 <h1 className="text-5xl font-bold text-[#111] leading-tight">
 Empower your team with <span className="text-[#F26522]">ARK University LMS</span>
 </h1>
 <p className="text-[#6A6F73] text-lg">
 Create a dedicated learning space for your company. Assign courses, track progress, and foster growth.
 </p>
 <ul className="space-y-4">
 {['Dedicated company dashboard', 'Custom course assignments', 'Detailed analytics and reporting', 'Secure multi-tenant architecture'].map((item, i) => (
 <li key={i} className="flex items-center gap-3 text-[#111] font-medium">
 <CheckCircle2 className="w-5 h-5 text-green-500" /> {item}
 </li>
 ))}
 </ul>
 </div>

 <Card className="bg-white border-[#eee] shadow-xl rounded-2xl overflow-hidden">
 <CardHeader className="p-8 pb-4">
 <CardTitle>Register Company</CardTitle>
 <CardDescription>Get started with your company instance today.</CardDescription>
 </CardHeader>
 <CardContent className="p-8 pt-0">
 <div className="flex gap-4 mb-6">
 <button 
 onClick={() => setPlan('free')}
 className={cn(
 "flex-1 py-2 rounded-lg text-sm font-bold border transition-all",
 plan === 'free' ? "bg-[#F26522]/10 border-[#F26522] text-[#F26522]" : "bg-white border-[#eee] text-[#6A6F73]"
 )}
 >
 Free Plan
 </button>
 <button 
 onClick={() => setPlan('paid')}
 className={cn(
 "flex-1 py-2 rounded-lg text-sm font-bold border transition-all",
 plan === 'paid' ? "bg-[#F26522]/10 border-[#F26522] text-[#F26522]" : "bg-white border-[#eee] text-[#6A6F73]"
 )}
 >
 Paid Plan ($99/mo)
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="companyName">Company Name</Label>
 <div className="relative">
 <Building2 className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]", companyNameError && "text-red-500")} />
 <Input 
 id="companyName"
 placeholder="ARK University Corp" 
 value={formData.companyName}
 onChange={e => handleCompanyNameChange(e.target.value)}
 onBlur={e => handleCompanyNameChange(e.target.value)}
 required
 className={cn("pl-10 border-[#eee]", companyNameError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
 />
 </div>
 {companyNameError && (
   <p className="text-red-500 text-xs mt-1 font-bold">{companyNameError}</p>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="adminName">Admin Name</Label>
 <div className="relative">
 <User className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]", adminNameError && "text-red-500")} />
 <Input 
 id="adminName"
 placeholder="John Doe" 
 value={formData.adminName}
 onChange={e => handleAdminNameChange(e.target.value)}
 onBlur={e => handleAdminNameChange(e.target.value)}
 required
 className={cn("pl-10 border-[#eee]", adminNameError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
 />
 </div>
 {adminNameError && (
   <p className="text-red-500 text-xs mt-1 font-bold">{adminNameError}</p>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="adminEmail">Admin Email</Label>
 <div className="relative">
 <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]", emailError && "text-red-500")} />
 <Input 
 id="adminEmail"
 type="email"
 placeholder="admin@company.com" 
 value={formData.adminEmail}
 onChange={e => handleAdminEmailChange(e.target.value)}
 onBlur={e => handleAdminEmailChange(e.target.value)}
 required
 className={cn("pl-10 border-[#eee]", emailError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
 />
 </div>
 {emailError && (
   <p className="text-red-500 text-xs mt-1 font-bold">{emailError}</p>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="password">Password</Label>
 <div className="relative">
 <Lock className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6F73]", passwordError && "text-red-500")} />
 <Input 
 id="password"
 type="password"
 placeholder="••••••••" 
 value={formData.password}
 onChange={e => handlePasswordChange(e.target.value)}
 onBlur={e => handlePasswordChange(e.target.value)}
 required
 className={cn("pl-10 border-[#eee]", passwordError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 hover:border-red-500")}
 />
 </div>
 {passwordError && (
   <p className="text-red-500 text-xs mt-1 font-bold">{passwordError}</p>
 )}
 </div>

 <Button 
 type="submit" 
 disabled={loading || !!companyNameError || !!adminNameError || !!emailError || !!passwordError}
 className="w-full bg-[#111] hover:bg-[#333] text-white h-12 rounded-xl font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Register Company"}
 </Button>
 </form>
 </CardContent>
 <CardFooter className="bg-white p-4 flex justify-center">
 <p className="text-xs text-[#6A6F73]">
 Already have an account? <Link href="/login" className="text-[#F26522] font-bold hover:underline">Login</Link>
 </p>
 </CardFooter>
 </Card>
 </div>
 </div>
 );
}
