'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
 CreditCard, CheckCircle2, ShieldCheck, 
 ArrowRight, Loader2, Lock, Sparkles,
 Zap, Building2, Wallet
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function PaymentPage() {
 const { user, login, updateUser } = useAuth();
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 useEffect(() => {
 // If user is already paid or not on a paid plan, redirect
 if (user && (user.plan_type === 'free' || user.payment_status === 'completed')) {
 router.push('/dashboard');
 }
 }, [user, router]);

 const handlePayment = async () => {
 try {
 setLoading(true);
 // Simulate real gateway delay
 await new Promise(r => setTimeout(r, 2500));
 
 const response = await api.payment.fake();
 
 setSuccess(true);
 toast.success('Payment successful!');
 
 if (user) {
 updateUser({ ...user, payment_status: 'completed' });
 }

 setTimeout(() => {
 router.push('/dashboard');
 }, 3000);
 } catch (error: any) {
 toast.error(error.message || 'Payment failed');
 } finally {
 setLoading(false);
 }
 };

 if (!user) return null;

 return (
 <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
 {/* Background Orbs */}
 <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">

</div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="w-full max-w-xl relative z-10"
 >
 <AnimatePresence mode="wait">
 {!success ? (
 <motion.div
 key="payment-card"
 exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
 transition={{ duration: 0.5 }}
 >
 <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden relative">
 <div className="h-2 bg-[#F26522]" />
 
 <CardHeader className="pt-12 pb-8 px-12 text-center">
 <div className="w-24 h-24 bg-[#F26522]/10 rounded-xl flex items-center justify-center mx-auto mb-8 border border-[#F26522]/20 shadow-xl transition-transform hover:rotate-6">
 <Wallet className="w-12 h-12 text-[#F26522]" />
 </div>
 <CardTitle className="text-4xl font-bold tracking-tight text-foreground"> Complete Payment </CardTitle>
 <CardDescription className="text-muted-foreground mt-4 text-lg font-medium leading-relaxed">
 Activate premium curriculum infrastructure for <span className="text-foreground font-bold">{user.company_name}</span>
 </CardDescription>
 </CardHeader>

 <CardContent className="px-12 pb-10 space-y-10">
 {/* Summary Card */}
 <div className="bg-muted p-8 rounded-xl border border-border shadow-inner relative group overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26522]/5 rounded-full -mr-16 -mt-16 transition-transform duration-700" />
 <div className="flex justify-between items-center relative z-10">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-xl bg-[#F26522]/10 flex items-center justify-center border border-[#F26522]/20 shadow-sm">
 <Zap className="w-5 h-5 text-[#F26522]" />
 </div>
 <span className="text-muted-foreground font-bold uppercase text-xs">Plan</span>
 </div>
 <span className="bg-[#F26522] text-white text-xs font-bold px-4 py-1.5 rounded-xl border-none uppercase shadow-lg">Premium Enterprise</span>
 </div>
 
 <div className="flex justify-between items-end pt-8 relative z-10">
 <div>
 <p className="text-xs text-muted-foreground font-bold uppercase">Pricing</p>
 <div className="flex items-baseline gap-2 mt-2">
 <p className="text-5xl font-bold text-foreground tabular-nums">₹{user.plan_price || '0'}</p>
 <p className="text-xs text-muted-foreground font-bold uppercase">/ Month</p>
 </div>
 </div>
 <Sparkles className="w-8 h-8 text-[#F26522]/20" />
 </div>
 </div>

 {/* Security Badge */}
 <div className="flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 w-fit mx-auto shadow-sm">
 <ShieldCheck className="w-5 h-5 text-emerald-500" />
 <span className="text-xs font-bold uppercase text-emerald-500">Encrypted Joined Active</span>
 </div>
 </CardContent>

 <CardFooter className="px-12 pb-12 flex flex-col gap-6">
 <Button 
 onClick={handlePayment}
 disabled={loading}
 className="w-full h-16 bg-[#F26522] hover:bg-[#D54D10] text-white rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.95] border-none uppercase group"
 >
 {loading ? (
 <div className="flex items-center gap-4">
 <Loader2 className="w-7 h-7 animate-spin" />
 <span>Processing...</span>
 </div>
 ) : (
 <div className="flex items-center gap-4">
 <span>Subscribe</span>
 <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
 </div>
 )}
 </Button>
 <p className="text-xs text-muted-foreground text-center font-bold uppercase leading-relaxed opacity-60">
 This is a demo payment page.<br /> No real charges will be made.
 </p>
 </CardFooter>
 </Card>
 </motion.div>
 ) : (
 <motion.div
 key="success-card"
 initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
 animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
 className="text-center space-y-10 py-16"
 >
 <div className="relative mx-auto w-40 h-40">
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
 className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm shadow-emerald-500/40 z-10"
 >
 <CheckCircle2 className="w-20 h-20 text-white" />
 </motion.div>
 <motion.div
 animate={{ 
 scale: [1, 1.4, 1],
 opacity: [0.4, 0.1, 0.4]
 }}
 transition={{ repeat: Infinity, duration: 3 }}
 className="absolute inset-[-40px] bg-emerald-500/20 rounded-full blur-3xl -z-10"
 />
 </div>

 <div className="space-y-4">
 <h2 className="text-5xl font-bold tracking-tight text-foreground">Payment Successful!</h2>
 <p className="text-muted-foreground font-medium text-xl leading-relaxed">Your premium plan has been activated.</p>
 </div>

 <div className="flex flex-col items-center gap-6 pt-10">
 <div className="h-2 w-64 bg-muted rounded-full overflow-hidden border border-border shadow-inner">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: '100%' }}
 transition={{ duration: 2.5, ease: "easeInOut" }}
 className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
 />
 </div>
 <p className="text-xs font-bold uppercase text-muted-foreground animate-pulse">Redirecting to Terminal Portal...</p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 </div>
 );
}
