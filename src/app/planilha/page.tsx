'use client';

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PlanilhaPage() {
    return (
        <div className="space-y-10 pb-20">
            {/* Header section */}
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-white text-4xl font-light tracking-tight mb-2">Logistics <span className="text-primary font-bold">Registry</span></h1>
                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xs">sync_alt</span>
                        Bidirectional Cloud Spreadsheet Synchronization
                    </p>
                </motion.div>
                <div className="hidden md:flex gap-4">
                    <button className="h-12 bg-primary hover:bg-primary/80 transition-all text-black font-bold uppercase tracking-[0.2em] rounded-2xl px-8 flex items-center gap-3 shadow-xl shadow-primary/10">
                        <span className="material-symbols-outlined text-lg">sync</span>
                        Force Relay
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Relay Connection', value: 'ACTIVE', status: 'optimal', icon: 'link' },
                    { label: 'Last Operations', value: '10:45 AM', status: 'done', icon: 'schedule' },
                    { label: 'Pending Extraction', value: '04 Units', status: 'warning', icon: 'inventory_2' },
                    { label: 'Neural Stability', value: '100%', status: 'optimal', icon: 'verified_user' },
                ].map((kpi, idx) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-panel p-6 rounded-2xl border border-white/5 premium-shadow relative group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">{kpi.label}</p>
                            <span className="material-symbols-outlined text-white/10 group-hover:text-primary/20 transition-colors">{kpi.icon}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={cn(
                                "text-2xl font-bold tracking-tight",
                                kpi.status === 'optimal' ? "text-emerald-500" :
                                kpi.status === 'warning' ? "text-primary" : "text-white"
                            )}>
                                {kpi.value}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">Protocol: Google Sheets Relay</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* History Table */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel rounded-2xl border border-white/5 premium-shadow overflow-hidden"
            >
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <div>
                        <h3 className="text-white font-bold text-lg">Synchronization Feed</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Real-time Batch Execution Logging</p>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-slate-500 font-mono text-[9px]">ID: 1aB2...xYz</Badge>
                </div>
                
                <div className="divide-y divide-white/5">
                    {[
                        { id: '#8492', time: '10:45:00', date: '09 Mar 2026', items: '12 Rows', status: 'optimized', duration: '1.2s' },
                        { id: '#8491', time: '10:40:00', date: '09 Mar 2026', items: '03 Rows', status: 'optimized', duration: '0.8s' },
                        { id: '#8490', time: '10:35:00', date: '09 Mar 2026', items: '00 Rows', status: 'standby', duration: '0.3s' },
                    ].map((log, i) => (
                        <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group">
                            <div className="flex items-center gap-4 mb-4 md:mb-0">
                                <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/30 transition-all">
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-xl">description</span>
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Batch Command {log.id}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">{log.time} • {log.date}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-8">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-slate-300">{log.items}</p>
                                    <p className="text-[9px] text-slate-600 uppercase font-black">EXTRACTED</p>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border",
                                        log.status === 'optimized' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-500 border-white/10"
                                    )}>
                                        {log.status === 'optimized' ? 'Optimized' : 'Standby'}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-700 w-12 text-right">{log.duration}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 bg-white/[0.01] border-t border-white/5 text-center">
                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-primary transition-colors">See Archive</button>
                </div>
            </motion.div>
        </div>
    );
}
