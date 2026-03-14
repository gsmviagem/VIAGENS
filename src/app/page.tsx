'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    const [syncProgress, setSyncProgress] = useState(82);
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [recentEmissions, setRecentEmissions] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalMiles: 0, totalEmissions: 0 });
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            const { count: totalEmissions } = await supabase
                .from('extracted_bookings')
                .select('*', { count: 'exact', head: true });

            const { data: milesData } = await supabase
                .from('extracted_bookings')
                .select('miles_used');

            const totalMiles = milesData?.reduce((acc, curr) => acc + (curr.miles_used || 0), 0) || 0;

            const { data: integData } = await supabase
                .from('airline_integrations')
                .select('*')
                .order('airline', { ascending: true });

            const { data: recentData } = await supabase
                .from('extracted_bookings')
                .select('*')
                .order('capture_date', { ascending: false })
                .limit(8);

            setStats({ totalMiles, totalEmissions: totalEmissions || 0 });
            setIntegrations(integData || []);
            setRecentEmissions(recentData || []);
            setLoading(false);
        }

        fetchData();

        const interval = setInterval(() => {
            setSyncProgress(prev => {
                if (prev >= 100) return 82;
                return prev + 0.1;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 pb-12">
            {/* Dashboard Header */}
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-white text-4xl font-light tracking-tight mb-2">Command <span className="text-primary font-bold">Center</span></h1>
                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xs">verified</span>
                        Performance Status: Operational | Terminal: GSM-VIP
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-4"
                >
                    <button className="bg-primary hover:bg-primary/80 transition-all text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/10">
                        Initialize Sync
                    </button>
                </motion.div>
            </div>

            {/* 4 High Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Air Automations */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-6 rounded-xl flex flex-col gap-6 premium-shadow group border-t-2 border-t-primary/50 relative overflow-hidden"
                >
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">auto_mode</span>
                        </div>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded">Active</span>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1 tracking-wide">Air Automations</h3>
                        <p className="text-slate-400 text-xs text-balance">Optimized route protocols for Azul & Partners</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {['Azul', 'Smiles', 'LATAM'].map(airline => {
                            const integration = integrations.find(i => i.airline.toLowerCase().includes(airline.toLowerCase()));
                            const isActive = integration?.accounts_count > 0;
                            return (
                                <div key={airline} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-xs text-slate-300 font-medium">{airline} Relay</span>
                                    <div className={cn("w-8 h-4 rounded-full relative transition-colors", isActive ? "bg-primary/20" : "bg-white/10")}>
                                        <div className={cn("absolute top-0.5 size-3 rounded-full shadow-sm transition-all", 
                                            isActive ? "right-0.5 bg-primary shadow-primary" : "left-0.5 bg-slate-600")}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Card 2: Live Issuing */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-6 rounded-xl flex flex-col gap-4 premium-shadow"
                >
                    <div className="flex justify-between items-center">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">flight_takeoff</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-500 hover:text-primary cursor-pointer transition-colors">more_vert</span>
                    </div>
                    <h3 className="text-white font-bold text-lg tracking-wide">Live Feed</h3>
                    <div className="space-y-4 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                        {recentEmissions.length > 0 ? recentEmissions.map((ext, idx) => (
                            <div key={ext.id} className={cn("flex flex-col border-l-2 pl-3 py-1 mb-2", idx % 2 === 0 ? "border-primary" : "border-white/20")}>
                                <div className="flex justify-between items-center">
                                    <p className="text-[11px] font-bold text-slate-200 uppercase">{ext.locator}</p>
                                    <p className={cn("text-[10px] font-bold", idx % 2 === 0 ? "text-primary" : "text-slate-500")}>
                                        {new Date(ext.capture_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{ext.passenger_name || 'VIP Client'}</p>
                            </div>
                        )) : (
                            <p className="text-xs text-slate-600 italic">No recent emissions detected.</p>
                        )}
                    </div>
                </motion.div>

                {/* Card 3: Sync Engine */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center gap-4 premium-shadow relative overflow-hidden"
                >
                    <div className="absolute inset-0 carbon-texture opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative size-28 flex items-center justify-center">
                            <svg className="size-full transform -rotate-90">
                                <circle cx="56" cy="56" fill="transparent" r="48" stroke="rgba(255,255,255,0.05)" strokeWidth="8"></circle>
                                <circle 
                                    className="drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] transition-all duration-500" 
                                    cx="56" cy="56" fill="transparent" r="48" stroke="#D4AF37" 
                                    strokeDasharray="301.59" 
                                    strokeDashoffset={301.59 - (301.59 * syncProgress) / 100} 
                                    strokeLinecap="round" strokeWidth="8"
                                ></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white tracking-tight">{Math.round(syncProgress)}%</span>
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest leading-none">Global Sync</span>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-lg mt-4 tracking-wide">Sync Engine</h3>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Satellite Relay Active</p>
                    </div>
                </motion.div>

                {/* Card 4: Financial KPIs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel p-6 rounded-xl flex flex-col gap-6 premium-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                        <h3 className="text-white font-bold text-lg tracking-wide">Revenue Flow</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Today</p>
                            <p className="text-lg font-bold text-primary">{stats.totalEmissions}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Miles</p>
                            <p className="text-lg font-bold text-white">{(stats.totalMiles / 1000).toFixed(0)}k</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Status</p>
                            <p className="text-lg font-bold text-emerald-500">OPTIMAL</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Uptime</p>
                            <p className="text-lg font-bold text-white">99.9%</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Secondary Operational View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-2 glass-panel rounded-xl overflow-hidden premium-shadow min-h-[400px] flex flex-col"
                >
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-white text-xl font-bold tracking-tight">Global Fleet Distribution</h2>
                        <div className="flex gap-2">
                            <button className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary">Real-Time</button>
                            <button className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-slate-500">Historical</button>
                        </div>
                    </div>
                    <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden">
                        <img 
                            alt="Fleet Map" 
                            className="w-full h-full object-cover opacity-20 grayscale mix-blend-screen transition-all duration-1000" 
                            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2066"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        
                        {/* Map Markers Simulation */}
                        <div className="absolute top-1/4 left-1/3 size-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#D4AF37]"></div>
                        <div className="absolute top-1/2 left-2/3 size-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#D4AF37]" style={{ animationDelay: '0.7s' }}></div>
                        <div className="absolute bottom-1/3 right-1/4 size-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#D4AF37]" style={{ animationDelay: '1.4s' }}></div>
                        
                        <div className="absolute bottom-6 left-6 z-10">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Nodes</span>
                                    <span className="text-2xl font-black text-white">42 Online</span>
                                </div>
                                <div className="h-10 w-[1px] bg-white/10"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Latency</span>
                                    <span className="text-2xl font-black text-primary">124ms</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-panel rounded-xl p-6 flex flex-col gap-6 premium-shadow border border-primary/20"
                >
                    <h2 className="text-white text-xl font-bold tracking-tight">Recent Clearance</h2>
                    <div className="flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {recentEmissions.slice(0, 5).map((ext) => (
                            <div key={ext.id} className="flex items-center gap-4">
                                <div className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-xl">description</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-100 uppercase tracking-wide truncate">{ext.airline} Clearance</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-medium">{new Date(ext.capture_date).toLocaleDateString()}</p>
                                </div>
                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            </div>
                        ))}
                        {recentEmissions.length === 0 && (
                            <p className="text-slate-500 text-xs text-center py-10 italic">No clearanced reports found.</p>
                        )}
                    </div>
                    <button className="mt-auto w-full py-3 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-[0.3em] rounded-lg hover:bg-primary/10 transition-all">
                        View All Logs
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
