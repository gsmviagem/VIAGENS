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
    Cpu
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background-dark">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full"></div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,255,200,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <motion.div
                        initial={{ scale: 0.8, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(0,255,200,0.2)] mb-6 group hover:rotate-6 transition-transform cursor-default"
                    >
                        <Rocket className="text-primary w-10 h-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                        GSMVIAGEM <span className="text-primary drop-shadow-[0_0_8px_rgba(0,255,200,0.5)]">HUB</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Operational Access Protocol</p>
                </div>

                {/* Login Card */}
                <div className="glass-panel-heavy p-8 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cpu size={120} className="text-primary rotate-12" />
                    </div>

                    <form action={login} className="space-y-6 relative z-10">
                        <div className="space-y-2 group">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Authentication ID</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    defaultValue="admin@gsmviagem.com"
                                    placeholder="name@gsmviagem.com"
                                    className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex items-center justify-between ml-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors">Security Key</Label>
                                <a href="#" className="text-[10px] font-black text-primary/50 hover:text-primary transition-colors uppercase tracking-widest">Lost Key?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    defaultValue="admin123"
                                    placeholder="••••••••"
                                    className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-4">
                            <SubmitButton>
                                INITIALIZE SESSION <ArrowRight size={20} className="ml-2" />
                            </SubmitButton>

                            <Button
                                formAction={signup}
                                variant="ghost"
                                className="h-14 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white border border-transparent hover:border-white/10 rounded-2xl"
                            >
                                Request Authorization Code
                            </Button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-3">
                        <ShieldCheck className="text-green-500/50 w-4 h-4" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">AES-256 Encrypted Tunnel</span>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                    © 2026 GSMVIAGEM Systems Corp.
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background-dark flex items-center justify-center text-primary font-black uppercase tracking-widest">Initialising Secure Tunnel...</div>}>
            <LoginContent />
        </Suspense>
    );
}
