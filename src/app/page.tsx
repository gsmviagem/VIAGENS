'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { Switch } from "@/components/ui/switch";

export default function DashboardPage() {
    const [syncProgress, setSyncProgress] = useState(82);
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [recentEmissions, setRecentEmissions] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalMiles: 0, totalEmissions: 0 });
    const [cancelStats, setCancelStats] = useState({ solicitar: 0, solicitado: 0, base: 0, ok: 0, loading: true });
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
                .limit(4); // limit to 4 to match the new UI template height

            setStats({ totalMiles, totalEmissions: totalEmissions || 0 });
            setIntegrations(integData || []);
            setRecentEmissions(recentData || []);
            setLoading(false);

            // Fetch Cancel Stats
            try {
                const cancelRes = await fetch('/api/sheets/cancel');
                const cancelJson = await cancelRes.json();
                if (cancelJson.success) {
                    setCancelStats({ ...cancelJson.data.counts, loading: false });
                } else {
                    setCancelStats(prev => ({ ...prev, loading: false }));
                }
            } catch (err) {
                setCancelStats(prev => ({ ...prev, loading: false }));
            }
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
        <div className="flex flex-col relative bg-transparent text-[#e5e2e1] font-['Inter']">
            {/* Header Section */}
            <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-[0.05em] text-white">Executive Cockpit</h1>
                    <p className="text-outline font-light tracking-wide max-w-md">Precision monitoring of global assets and automated flight paths.</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <span className="block font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-secondary">System Pulse</span>
                        <span className="text-sm font-medium flex items-center justify-end gap-2 text-white">
                            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></span>
                            Operational
                        </span>
                    </div>
                </div>
            </header>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* SECTION: Cancel Requests Tracking (Moved to top) */}
                <section className="col-span-1 md:col-span-12">
                    <div className="glass-panel p-6 w-full flex flex-col md:flex-row items-center justify-between gap-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none"></div>
                        <div className="flex items-center gap-4 z-10 shrink-0">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <span className="material-symbols-outlined text-red-400">cancel_schedule_send</span>
                            </div>
                            <div>
                                <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[12px] font-bold text-white leading-tight">Cancel<br/>Requests</h2>
                                <p className="text-[10px] text-outline tracking-wider lowercase">via google sheets</p>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full z-10">
                            {cancelStats.loading ? (
                                <div className="col-span-4 flex justify-center py-2">
                                    <span className="material-symbols-outlined animate-spin text-outline">refresh</span>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                        <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-red-300 transition-colors">Solicitar</p>
                                        <p className="text-2xl font-light text-white tracking-tighter">{cancelStats.solicitar}</p>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                        <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-amber-300 transition-colors">Solicitado</p>
                                        <p className="text-2xl font-light text-white tracking-tighter">{cancelStats.solicitado}</p>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                        <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-blue-300 transition-colors">Base</p>
                                        <p className="text-2xl font-light text-white tracking-tighter">{cancelStats.base}</p>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                        <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-emerald-300 transition-colors">OK</p>
                                        <p className="text-2xl font-light text-white tracking-tighter">{cancelStats.ok}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
                
                {/* SECTION 1: Air Automations (Large Asymmetric) */}
                <section className="md:col-span-8 group">
                    <div className="glass-panel h-[420px] p-8 flex flex-col justify-between relative overflow-hidden">
                        {/* Subtle Background Element */}
                        <div className="absolute -top-20 -right-20 w-80 h-80 opacity-5 pointer-events-none transition-transform group-hover:scale-105 duration-1000">
                            <span className="material-symbols-outlined text-[20rem]">flight_takeoff</span>
                        </div>
                        
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[11px] font-bold text-secondary mb-4">Air Automations</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-6">
                                        <div className="text-3xl font-light text-white">{stats.totalEmissions.toString().padStart(2, '0')}</div>
                                        <div className="h-px w-12 bg-outline-variant/30"></div>
                                        <div>
                                            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-secondary">Active Flight Paths</p>
                                            <p className="text-xs text-outline tracking-wider">Automated trajectory optimization active</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <button className="bg-white text-[#1a1c1c] px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#e2e2e2] transition-colors active:scale-95">Launch Script</button>
                            </div>
                        </div>

                        <div className="mt-auto grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
                            {['LATAM', 'SMILES', 'AZUL', 'TAP'].map((airline, idx) => {
                                const integration = integrations.find(i => i.airline.toUpperCase() === airline);
                                const isActive = integration?.status === 'active';
                                return (
                                    <div key={airline} className={cn("p-4 bg-surface-container-lowest/50 micro-border transition-all hover:bg-white/5", isActive ? "border-white/20" : "")}>
                                        <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-outline mb-1">{airline} SYS</p>
                                        <p className="text-lg font-medium text-white tracking-tighter">{isActive ? 'Online' : 'Standby'}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* SECTION 2: Live Issuing (Vertical Tall) */}
                <section className="md:col-span-4">
                    <div className="glass-panel h-[420px] p-8 flex flex-col titanium-gradient relative overflow-hidden">
                        <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[11px] font-bold text-secondary mb-8 z-10">Live Issuing</h2>
                        <div className="flex-1 space-y-6 z-10">
                            <div className="relative py-4 px-6 bg-surface-container-highest/30 micro-border backdrop-blur-md">
                                <div className="absolute top-2 right-4 flex gap-1 animate-pulse">
                                    <span className="w-1 h-1 bg-secondary rounded-full opacity-50"></span>
                                    <span className="w-1 h-1 bg-secondary rounded-full opacity-50"></span>
                                </div>
                                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-outline mb-4">Emission Feed</p>
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
                                    <span className="text-xl font-mono tracking-[0.2em] text-white">SYNC_ON</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4 pt-4 custom-scrollbar overflow-y-auto max-h-[140px] pr-2">
                                {recentEmissions.length > 0 ? recentEmissions.map((ext) => (
                                    <div key={ext.id} className="flex flex-col text-[11px] border-b border-outline-variant/10 pb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-outline uppercase tracking-wider">{ext.airline} | {ext.locator}</span>
                                            <span className="text-white font-medium">CAPTURED</span>
                                        </div>
                                        <span className="text-[10px] text-outline/60">{ext.passenger_name} • {ext.miles_used.toLocaleString()} pts</span>
                                    </div>
                                )) : <div className="text-xs text-outline italic">No recent captures...</div>}
                            </div>
                        </div>
                        <button className="w-full mt-6 py-4 micro-border text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/5 transition-all active:scale-95 z-10">
                            Halt Operations
                        </button>
                    </div>
                </section>

                {/* SECTION 3: Financial KPIs (Wide) */}
                <section className="md:col-span-7">
                    <div className="glass-panel p-8 h-[280px] flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[11px] font-bold text-secondary">Financial KPIs</h2>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-white/5 text-[9px] font-bold text-white tracking-widest uppercase rounded">YTD</span>
                                    <span className="px-3 py-1 text-[9px] font-bold text-outline tracking-widest uppercase cursor-pointer hover:text-white transition-colors">ALL TIME</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-[10px] font-medium text-outline uppercase tracking-widest mb-1">Miles Liquidity</p>
                                    <p className="text-3xl font-light text-white tracking-tight">{(stats.totalMiles / 1000000).toFixed(2)}M</p>
                                    <div className="mt-2 h-1 bg-outline-variant/20 overflow-hidden">
                                        <div className="h-full bg-secondary w-3/4"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-outline uppercase tracking-widest mb-1">Emission Count</p>
                                    <p className="text-3xl font-light text-white tracking-tight">{stats.totalEmissions}</p>
                                    <div className="mt-2 h-1 bg-outline-variant/20 overflow-hidden">
                                        <div className="h-full bg-secondary w-[90%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Abstract Chart Representation */}
                        <div className="h-16 w-full relative flex items-end gap-1 px-2 opacity-50">
                            {[40, 60, 55, 80, 95, 70, 65, 45, 50, 60].map((h, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.05 }}
                                    className={cn("w-full transition-all hover:bg-white/40 cursor-pointer", i === 4 ? "bg-secondary/60" : "bg-outline-variant/30")}
                                ></motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 4: Google Sheets Sync (Small Square) */}
                <section className="md:col-span-5">
                    <div className="glass-panel p-8 h-[280px] flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[11px] font-bold text-secondary">Data Synchronization</h2>
                                <span className="material-symbols-outlined text-outline">autorenew</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 group cursor-pointer">
                                    <div className="w-10 h-10 flex items-center justify-center bg-surface-container-high micro-border group-hover:bg-white/5 transition-all">
                                        <span className="material-symbols-outlined text-outline">table_chart</span>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-white tracking-wide">TICKETS_MASTER_SHEET</p>
                                        <p className="text-[10px] text-outline tracking-wider">Secure uplink active</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-outline-variant/20 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] text-outline uppercase font-bold tracking-widest">Auto-Sync Status</span>
                                <span className="text-[10px] text-white uppercase font-bold tracking-widest">{Math.round(syncProgress)}%</span>
                            </div>
                            <div className="w-full bg-surface-container-low h-10 flex items-center px-4 micro-border gap-3">
                                <motion.div 
                                    className="h-1 bg-secondary rounded-full" 
                                    style={{ width: `${Math.round(syncProgress)}%` }}
                                    transition={{ type: 'tween' }}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Removed Cancel section from here */}
            </div>
            
            <footer className="mt-12 pt-8 pb-4 flex justify-between items-center text-outline text-[10px] font-bold uppercase tracking-widest border-t border-[#474747]/30">
                <div className="flex items-center gap-4">
                    <span>CHRONOS OS V3.0.1</span>
                    <span className="w-1 h-1 bg-secondary rounded-full"></span>
                    <span>ALL SYSTEMS NOMINAL</span>
                </div>
                <div>SECURE CONNECTION ESTABLISHED</div>
            </footer>
        </div>
    );
}
