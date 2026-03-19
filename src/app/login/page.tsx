'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { login, signup } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import {
    Rocket,
    ShieldCheck,
    Lock,
    Mail,
    ArrowRight,
    Zap,
    Cpu,
    Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { SubmitButton } from './submit-button';

function LoginContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
        if (message) {
            toast.success(message);
        }
    }, [error, message]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-transparent">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10 text-center text-white">
                    <motion.div
                        initial={{ scale: 0.8, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="w-20 h-20 bg-blue-600/10 rounded-[32px] flex items-center justify-center border border-blue-600/20 shadow-[0_0_40px_rgba(255,0,0,0.15)] mb-6 group hover:rotate-6 transition-transform cursor-default"
                    >
                        <Flame className="text-blue-600 w-10 h-10 group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2 italic">
                        GSMVIAGEM <span className="text-blue-700 drop-shadow-[0_0_12px_rgba(255,0,0,0.4)]">HUB</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em]">Operational Security Protocol</p>
                </div>

                {/* Login Card */}
                <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[48px] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group transition-all hover:border-blue-900/40">
                    <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Rocket size={240} className="text-blue-700 -rotate-12" />
                    </div>

                    <form action={login} className="space-y-6 relative z-10">
                        <div className="space-y-3 group">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-600 transition-colors ml-1">Authentication ID</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    defaultValue="admin@gsmviagem.com"
                                    placeholder="name@gsmviagem.com"
                                    className="pl-12 h-16 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-red-700 text-lg font-bold transition-all placeholder:text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 group">
                            <div className="flex items-center justify-between ml-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-600 transition-colors">Security Key</Label>
                                <a href="#" className="text-[10px] font-black text-blue-900 hover:text-blue-500 transition-colors uppercase tracking-widest">Lost Access?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    defaultValue="admin123"
                                    placeholder="••••••••"
                                    className="pl-12 h-16 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-red-700 text-lg font-bold transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col gap-4">
                            <SubmitButton className="h-16 bg-blue-700 hover:bg-blue-800 text-white font-black text-lg rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:brightness-110 active:translate-y-[2px] active:shadow-none">
                                EXECUTE ACCESS <ArrowRight size={20} className="ml-2" />
                            </SubmitButton>

                            <SubmitButton
                                formAction={signup}
                                variant="ghost"
                                className="h-16 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white border border-transparent hover:border-white/10 rounded-2xl transition-colors"
                            >
                                Request Encryption Code
                            </SubmitButton>
                        </div>
                    </form>

                    <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-3">
                        <ShieldCheck className="text-blue-900/50 w-4 h-4" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Level 4 Redundant Encryption</span>
                    </div>
                </div>

                <p className="mt-10 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest opacity-60">
                    © 2026 GSMVIAGEM Intelligence Hub
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-blue-700 font-black uppercase tracking-[0.5em] animate-pulse">Establishing Secure Uplink...</div>}>
            <LoginContent />
        </Suspense>
    );
}
