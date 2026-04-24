'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import IdeaHub from '@/components/dashboard/IdeaHub';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } })
};

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

            try {
                const cancelRes = await fetch('/api/sheets/cancel');
                const cancelJson = await cancelRes.json();
                if (cancelJson.success) setCancelStats({ ...cancelJson.data.counts, loading: false });
                else setCancelStats(prev => ({ ...prev, loading: false }));
            } catch { setCancelStats(prev => ({ ...prev, loading: false })); }

            try {
                const [marketRes, supplierRes] = await Promise.all([
                    fetch('/api/sheets/market'),
                    fetch('/api/sheets/supplier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pendingOnly: true }) })
                ]);
                const marketJson = await marketRes.json();
                const supplierJson = await supplierRes.json();
                setMarketData({ dolar: marketJson.success ? marketJson.data.dolar : 0, suppliers: supplierJson.success ? supplierJson.data.suppliers : [], loading: false });

                try {
                    const calcRes = await fetch('/api/sheets/calc-check');
                    const calcJson = await calcRes.json();
                    if (calcJson.success) setCalcAlert(calcJson.hasContent);
                } catch {}
            } catch { setMarketData(prev => ({ ...prev, loading: false })); }
        }
        fetchData();
    }, []);

    const pendingSuppliers = marketData.suppliers.filter((s: any) => s.saldoType === 'NEGATIVE');

    return (
        <div className="flex flex-col h-full overflow-hidden text-[#edebe8] font-['Inter']">
            {/* Header */}
            <motion.header
                variants={fadeUp} custom={0} initial="hidden" animate="show"
                className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 shrink-0"
            >
                <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-1">DIMAIS CORP · EXECUTIVE</p>
                    <h1 className="text-3xl font-black tracking-tight text-white leading-none">Overview</h1>
                </div>
                <div className="flex items-center gap-3">
                    {calcAlert && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full"
                        >
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Precificação</span>
                        </motion.div>
                    )}
                    <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-semibold text-white/50 tracking-widest uppercase">Operational</span>
                    </div>
                </div>
            </motion.header>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">

                {/* LEFT: 8 cols */}
                <div className="md:col-span-8 flex flex-col gap-3 overflow-hidden">

                    {/* Cancel Requests bar */}
                    <motion.section variants={fadeUp} custom={1} initial="hidden" animate="show" className="shrink-0">
                        <div className="bg-white/[0.03] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
                            <div className="flex items-center gap-3 shrink-0 z-10">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-400 text-[18px]">cancel_schedule_send</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black tracking-widest uppercase text-white/30">Cancel Requests</p>
                                    <p className="text-[11px] text-white/60 font-medium">via Google Sheets</p>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-4 gap-2 z-10 w-full">
                                {cancelStats.loading ? (
                                    <div className="col-span-4 flex justify-center">
                                        <span className="material-symbols-outlined animate-spin text-white/20">refresh</span>
                                    </div>
                                ) : (
                                    [
                                        { label: 'Solicitar', val: cancelStats.solicitar, color: 'text-red-400' },
                                        { label: 'Solicitado', val: cancelStats.solicitado, color: 'text-amber-400' },
                                        { label: 'Base', val: cancelStats.base, color: 'text-blue-400' },
                                        { label: 'OK', val: cancelStats.ok, color: 'text-emerald-400' },
                                    ].map(({ label, val, color }) => (
                                        <div key={label} className="bg-white/[0.03] rounded-xl p-2.5 flex flex-col items-center justify-center hover:bg-white/[0.06] transition-all">
                                            <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-0.5">{label}</p>
                                            <p className={`text-2xl font-light tracking-tighter ${color}`}>{val}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.section>

                    {/* Lower split: Suppliers + Visualizer */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">

                        {/* Accounts Payable */}
                        <motion.section variants={fadeUp} custom={2} initial="hidden" animate="show" className="md:col-span-4 flex flex-col overflow-hidden min-h-0">
                            <div className="bg-white/[0.03] rounded-2xl p-4 flex flex-col h-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent rounded-2xl pointer-events-none" />
                                <div className="flex justify-between items-center mb-4 shrink-0 z-10">
                                    <div>
                                        <p className="text-[9px] font-black tracking-[0.2em] uppercase text-blue-400/70 mb-0.5">Accounts Payable</p>
                                        <h2 className="text-base font-bold text-white leading-tight">Fornecedores</h2>
                                    </div>
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-blue-400 text-[16px]">handshake</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 z-10">
                                    {marketData.loading ? (
                                        <div className="py-8 flex justify-center">
                                            <span className="material-symbols-outlined animate-spin text-white/20">refresh</span>
                                        </div>
                                    ) : pendingSuppliers.length > 0 ? (
                                        pendingSuppliers.map((s: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all group">
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide truncate max-w-[80px] group-hover:text-white/60 transition-colors">{s.name}</span>
                                                <span className="text-[13px] font-black text-white tabular-nums">{s.saldo}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-white/20 text-[10px] uppercase font-black tracking-widest">All Clear</div>
                                    )}
                                </div>
                            </div>
                        </motion.section>

                        {/* Brand Visualizer */}
                        <motion.section variants={fadeUp} custom={3} initial="hidden" animate="show" className="md:col-span-8 overflow-hidden flex flex-col">
                            <div className="rounded-2xl h-full flex flex-col items-center justify-center relative overflow-hidden group">
                                <img
                                    src="/logo.png"
                                    alt="Dimais Hub"
                                    className="w-3/5 max-w-[320px] object-contain z-10 opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-[2000ms] drop-shadow-[0_0_40px_rgba(255,255,255,0.12)]"
                                />
                                <div className="absolute bottom-4 inset-x-0 flex flex-col items-center z-10 pointer-events-none">
                                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
                                    <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.7em]">Hub · Operational · Secure</p>
                                </div>
                            </div>
                        </motion.section>
                    </div>
                </div>

                {/* RIGHT: 4 cols */}
                <div className="md:col-span-4 flex flex-col gap-3 overflow-hidden">

                    {/* Financial Suite */}
                    <motion.a
                        variants={fadeUp} custom={1} initial="hidden" animate="show"
                        href="/dashboard"
                        className="bg-white/[0.03] rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.05] transition-all cursor-pointer group shrink-0 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent rounded-2xl pointer-events-none" />
                        <div className="flex justify-between items-start z-10 mb-4">
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-400/70">Financial Suite</p>
                            <span className="material-symbols-outlined text-white/20 group-hover:text-emerald-400 transition-colors text-[16px]">arrow_forward</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 z-10">
                            <div>
                                <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Asset Miles</p>
                                <p className="text-2xl font-light text-white tracking-tighter leading-none">
                                    {(stats.totalMiles / 1_000_000).toFixed(2)}<span className="text-base text-white/40 font-normal ml-0.5">M</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Emissions</p>
                                <p className="text-2xl font-light text-white tracking-tighter leading-none">{stats.totalEmissions}</p>
                            </div>
                        </div>
                    </motion.a>

                    {/* Dollar card */}
                    <motion.div
                        variants={fadeUp} custom={2} initial="hidden" animate="show"
                        className="bg-white/[0.03] rounded-2xl p-4 shrink-0 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] to-transparent rounded-2xl pointer-events-none" />
                        <div className="flex justify-between items-start mb-3 z-10 relative">
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-amber-400/70">Market Pulse</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                                <span className="text-[9px] text-amber-400/60 font-bold uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 z-10 relative">
                            <span className="text-4xl font-black text-white tracking-tighter leading-none">
                                {marketData.dolar.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-base text-white/30 font-medium">BRL</span>
                        </div>
                        <p className="text-[9px] text-white/20 font-semibold uppercase tracking-widest mt-1 z-10 relative">USD/BRL</p>
                    </motion.div>

                    {/* Idea Hub */}
                    <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="flex-1 min-h-0 overflow-hidden">
                        <IdeaHub />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
