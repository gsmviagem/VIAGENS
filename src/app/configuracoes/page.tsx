'use client';

import React from 'react';
import {
    Settings,
    User,
    Cpu,
    Database,
    Shield,
    Save,
    RotateCcw,
    Bell,
    Fingerprint,
    Mail,
    Zap,
    Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-12 w-full">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl font-black text-black tracking-tight">System Matrix</h1>
                    <p className="text-black/70 max-w-xl font-bold">Configure parâmetros operacionais, credenciais de segurança e motores de automação.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="glass-panel border-black/10 text-black/60 hover:bg-black/5 uppercase text-[10px] font-black tracking-widest">
                        <Fingerprint className="mr-2 h-4 w-4" /> Audit Logs
                    </Button>
                </div>
            </motion.div>

            <Tabs defaultValue="geral" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 mb-8 h-auto flex flex-wrap gap-2 backdrop-blur-xl rounded-2xl w-fit">
                    <TabsTrigger
                        value="geral"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <User size={16} /> Profile
                    </TabsTrigger>
                    <TabsTrigger
                        value="automacao"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Zap size={16} /> Automation
                    </TabsTrigger>
                    <TabsTrigger
                        value="planilha"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Globe size={16} /> Integration
                    </TabsTrigger>
                    <TabsTrigger
                        value="seguranca"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Shield size={16} /> Security
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="geral">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-8 border border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <User className="text-primary w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white leading-none">Perfil Operacional</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Manage identities and visual preferences</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors">Display Name</Label>
                                <Input
                                    defaultValue="Operador Base"
                                    className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary rounded-xl"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors">Emergency Protocol Mail</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        defaultValue="operador@gsmviagem.com.br"
                                        className="pl-11 h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <Button className="bg-primary text-background-dark font-black px-8 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                                    <Save size={18} /> SAVE CHANGES
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="automacao">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-8 border border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <Zap className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-none">Motor de Automação</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Global behavior and bot clustering</p>
                                </div>
                            </div>
                            <Badge className="bg-green-500/10 text-green-400 border-none font-black text-[10px] px-3 py-1">V2.4 ACTIVE</Badge>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex justify-between group-focus-within:text-primary transition-colors">
                                    Refresh Rate (Minutes)
                                    <span className="text-primary/70">OPTIMAL: 30</span>
                                </Label>
                                <Input
                                    type="number"
                                    defaultValue="30"
                                    className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary font-mono rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation Protocol</Label>
                                <select className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all appearance-none cursor-pointer">
                                    <option value="auto" className="bg-background-dark">Autonomous Cluster (Full Background)</option>
                                    <option value="semi" className="bg-background-dark">Sentinel Mode (SMS Gate-kept)</option>
                                    <option value="manual" className="bg-background-dark">Explicit Trigger (On-Demand)</option>
                                </select>
                            </div>
                            <div className="pt-6 flex justify-between gap-4">
                                <Button variant="outline" className="glass-panel border-white/10 text-slate-400 hover:text-white h-12 px-6 rounded-xl">
                                    <RotateCcw size={18} className="mr-2" /> FACTORY RESET
                                </Button>
                                <Button className="bg-primary text-background-dark font-black px-8 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                                    <Cpu size={18} /> UPDATING KERNEL
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

            </Tabs>
        </div>
    )
}
