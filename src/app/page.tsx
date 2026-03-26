'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import IdeaHub from '@/components/dashboard/IdeaHub';
import { debounce } from 'lodash';

export default function DashboardPage() {
    const [stats, setStats] = useState({ totalMiles: 0, totalEmissions: 0 });
    const [cancelStats, setCancelStats] = useState({ solicitar: 0, solicitado: 0, base: 0, ok: 0, loading: true });
    const [marketData, setMarketData] = useState<{ dolar: number; suppliers: any[]; loading: boolean }>({ dolar: 0, suppliers: [], loading: true });
    const [calcAlert, setCalcAlert] = useState(false);
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

            setStats({ totalMiles, totalEmissions: totalEmissions || 0 });
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

            // Fetch Market & Suppliers
            try {
                const [marketRes, supplierRes] = await Promise.all([
                    fetch('/api/sheets/market'),
                    fetch('/api/sheets/supplier', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pendingOnly: true })
                    })
                ]);
                const marketJson = await marketRes.json();
                const supplierJson = await supplierRes.json();

                setMarketData({
                    dolar: marketJson.success ? marketJson.data.dolar : 0,
                    suppliers: supplierJson.success ? supplierJson.data.suppliers : [],
                    loading: false
                });

                // Fetch CALC Alert
                try {
                    const calcRes = await fetch('/api/sheets/calc-check');
                    const calcJson = await calcRes.json();
                    if (calcJson.success) {
                        setCalcAlert(calcJson.hasContent);
                    }
                } catch (err) {
                    console.error('Error fetching CALC alert:', err);
                }
            } catch (err) {
                setMarketData(prev => ({ ...prev, loading: false }));
            }
        }

        fetchData();
    }, []);

    return (
        <div className="flex flex-col relative bg-transparent text-[#e5e2e1] font-['Inter'] h-full overflow-hidden">
            {/* Header Section */}
            <header className="mb-4 flex flex-col md:flex-row justify-between items-end gap-4 shrink-0">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-[0.05em] text-white">Executive Cockpit</h1>
                    <p className="text-outline font-light tracking-wide max-w-md">Precision monitoring of global assets and automated flight paths.</p>
                </div>
                <div className="flex gap-4 items-end">
                    {calcAlert && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        >
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Calc.Alert: Active</span>
                        </motion.div>
                    )}
                    <div className="text-right">
                        <span className="block font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-secondary">System Pulse</span>
                        <span className="text-sm font-medium flex items-center justify-end gap-2 text-white">
                            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></span>
                            Operational
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Grid - fills remaining space */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">
                
                {/* LEFT COLUMN: Alerts & Suppliers (Main operational focus) */}
                <div className="col-span-1 md:col-span-8 flex flex-col gap-3 overflow-hidden">
                    {/* TOP SECTION: Cancel Requests */}
                    <section className="shrink-0">
                        <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none"></div>
                            <div className="flex items-center gap-4 z-10 shrink-0">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <span className="material-symbols-outlined text-red-400 text-[20px]">cancel_schedule_send</span>
                                </div>
                                <div>
                                    <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[11px] font-bold text-white leading-tight">Cancel Requests</h2>
                                    <p className="text-[9px] text-outline tracking-wider lowercase">via google sheets</p>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 w-full z-10">
                                {cancelStats.loading ? (
                                    <div className="col-span-4 flex justify-center py-2">
                                        <span className="material-symbols-outlined animate-spin text-outline">refresh</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                            <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-red-300 transition-colors">Solicitar</p>
                                            <p className="text-xl font-light text-white tracking-tighter">{cancelStats.solicitar}</p>
                                        </div>
                                        <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                            <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-amber-300 transition-colors">Solicitado</p>
                                            <p className="text-xl font-light text-white tracking-tighter">{cancelStats.solicitado}</p>
                                        </div>
                                        <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                            <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-blue-300 transition-colors">Base</p>
                                            <p className="text-xl font-light text-white tracking-tighter">{cancelStats.base}</p>
                                        </div>
                                        <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-all">
                                            <p className="text-[9px] font-black tracking-[0.1em] uppercase text-outline mb-1 group-hover:text-emerald-300 transition-colors">OK</p>
                                            <p className="text-xl font-light text-white tracking-tighter">{cancelStats.ok}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* MIDDLE SECTION: Split between Suppliers and Luxury Visualizer */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
                        {/* Suppliers Further Compacted */}
                        <section className="md:col-span-4 flex flex-col overflow-hidden min-h-0">
                            <div className="glass-panel p-5 flex flex-col bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20 h-full overflow-hidden">
                                <div className="flex justify-between items-center mb-4 shrink-0">
                                    <div>
                                        <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-blue-400 mb-1">Accounts Payable</h2>
                                        <p className="text-lg font-light text-white tracking-tight leading-tight">Fornecedores</p>
                                    </div>
                                    <span className="material-symbols-outlined text-blue-400">handshake</span>
                                </div>
                                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                                    {marketData.suppliers.length > 0 ? marketData.suppliers.filter((s:any) => s.saldoType === 'NEGATIVE').map((s:any, i:number) => (
                                        <div key={i} className="bg-black/40 border border-white/5 p-2.5 rounded-lg flex items-center justify-between hover:bg-white/5 transition-all group">
                                            <span className="text-[10px] font-black text-white/40 uppercase truncate group-hover:text-white/60 transition-colors max-w-[80px]" title={s.name}>{s.name}</span>
                                            <span className="text-sm font-bold text-white tracking-tighter shrink-0">R$ {s.saldo}</span>
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center text-outline text-[10px] uppercase font-bold tracking-widest opacity-30">
                                            OK
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* LUXURY JET BLACK AESTHETIC VISUALIZER */}
                        <section className="md:col-span-8 overflow-hidden flex flex-col">
                            <div className="glass-panel h-full flex flex-col bg-black border-white/5 items-center justify-center relative group overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] z-10 pointer-events-none"></div>
                                <img 
                                    src="/luxury-jet.png" 
                                    alt="Luxury Private Jet" 
                                    className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[2000ms] z-0 opacity-90"
                                />
                                <div className="absolute inset-x-0 bottom-6 flex flex-col items-center z-20 pointer-events-none">
                                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />
                                    <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.6em] animate-pulse">Elite.Fleet.Secure</p>
                                </div>
                                {/* Professional Framing Overlay */}
                                <div className="absolute inset-x-8 inset-y-8 border border-white/5 pointer-events-none z-20"></div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* RIGHT COLUMN: Financial KPIs & Market Data */}
                <div className="col-span-1 md:col-span-4 flex flex-col gap-3 overflow-hidden">
                    {/* Financial KPIs Link */}
                    <a href="/dashboard" className="glass-panel p-5 flex flex-col justify-between hover:bg-white/5 transition-all cursor-pointer group border-emerald-500/20 shrink-0">
                        <div className="flex justify-between items-start">
                            <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-emerald-400">Financial Suite</h2>
                            <span className="material-symbols-outlined text-outline group-hover:text-emerald-400 transition-colors text-[18px]">open_in_new</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <p className="text-[9px] font-medium text-outline uppercase tracking-widest mb-0.5">Asset Miles</p>
                                <p className="text-xl font-light text-white tracking-tight">{(stats.totalMiles / 1000000).toFixed(2)}M</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-medium text-outline uppercase tracking-widest mb-0.5">Global Emissions</p>
                                <p className="text-xl font-light text-white tracking-tight">{stats.totalEmissions}</p>
                            </div>
                        </div>
                    </a>

                    {/* Dollar Card */}
                    <div className="glass-panel p-5 flex flex-col justify-between bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20 shrink-0 h-32">
                        <div className="flex justify-between items-start">
                            <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-amber-500 mb-1">Market Pulse</h2>
                            <span className="material-symbols-outlined text-amber-500">attach_money</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">R$ {marketData.dolar.toFixed(2).replace('.', ',')}</span>
                            <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest animate-pulse">Live</span>
                        </div>
                    </div>

                    {/* Executive Idea Hub (Supabase Persistent) */}
                    <IdeaHub />
                </div>
            </div>
        </div>
    );
}
