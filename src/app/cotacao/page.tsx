'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sites = [
    { id: 'smiles', name: 'Smiles Rewards', logo: 'orange' },
    { id: 'latam', name: 'LATAM Pass', logo: 'purple' },
    { id: 'azul', name: 'Azul Rewards', logo: 'blue' },
    { id: 'busca-ideal', name: 'Premium Feed', logo: 'gold' },
];

export default function CotacaoPage() {
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [searchStatus, setSearchStatus] = useState<Record<string, 'idle' | 'searching' | 'done' | 'error'>>({
        smiles: 'idle',
        latam: 'idle',
        azul: 'idle',
        'busca-ideal': 'idle',
    });

    const [form, setForm] = useState({
        origin: '',
        destination: '',
        date: '',
        passengers: 1
    });

    const handleSearch = async () => {
        if (!form.origin || !form.destination || !form.date) return;

        setIsSearching(true);
        const newStatus = { ...searchStatus };
        Object.keys(newStatus).forEach(site => newStatus[site] = 'searching');
        setSearchStatus(newStatus);
        setResults([]);

        try {
            const response = await fetch('/api/quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await response.json();

            if (data.success) {
                setResults(data.results);
                const updatedStatus: any = {};
                data.results.forEach((r: any) => {
                    const key = r.site.toLowerCase().replace(/\s+/g, '-');
                    if (updatedStatus[key]) {
                      updatedStatus[key] = r.success ? 'done' : 'error';
                    }
                });
                // Ensure all keys are updated based on mapping if needed
                sites.forEach(s => {
                   const res = data.results.find((r:any) => r.site.toLowerCase().includes(s.id.replace('-', '')));
                   updatedStatus[s.id] = res ? (res.success ? 'done' : 'error') : 'error';
                });
                setSearchStatus(updatedStatus);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header section */}
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-white text-4xl font-light tracking-tight mb-2">Operations <span className="text-primary font-bold">Matrix</span></h1>
                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xs">travel_explore</span>
                        Global Logistics Optimization Relay
                    </p>
                </motion.div>
                <div className="hidden md:flex gap-4">
                    <div className="glass-panel px-4 py-2 rounded-full border border-white/5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm animate-pulse">satellite_alt</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nodes Active: 04</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Search Configuration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-4 space-y-6"
                >
                    <div className="glass-panel p-8 rounded-[2rem] border border-white/10 premium-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <span className="material-symbols-outlined text-9xl">public</span>
                        </div>
                        
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <span className="material-symbols-outlined text-primary">flight_takeoff</span>
                                </div>
                                <h2 className="text-white font-bold uppercase tracking-widest text-xs">Target Parameters</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Departure (IATA)</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-primary transition-colors">location_on</span>
                                        <input
                                            type="text"
                                            placeholder="GRU"
                                            value={form.origin}
                                            onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-bold uppercase placeholder:text-slate-700 focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Arrival (IATA)</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-primary transition-colors">flight_land</span>
                                        <input
                                            type="text"
                                            placeholder="JFK"
                                            value={form.destination}
                                            onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-bold uppercase placeholder:text-slate-700 focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Relay Date</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">calendar_today</span>
                                        <input
                                            type="text"
                                            placeholder="20/05/2026"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-medium focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Total Passengers</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">person</span>
                                        <input
                                            type="number"
                                            value={form.passengers}
                                            onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) })}
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-full h-16 bg-primary hover:bg-primary/80 transition-all text-black font-bold uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSearching ? (
                                    <>
                                        <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        <span>Relaying...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">rocket_launch</span>
                                        <span>Initiate Vector</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* History Sidebar */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 premium-shadow">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-sm">history</span>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Previous Matrices</h3>
                        </div>
                        <div className="space-y-2">
                            {[1, 2].map(i => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all group">
                                    <div>
                                        <p className="text-white font-bold text-xs">GRU <span className="text-primary mx-1">→</span> JFK</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-tighter">20/05/2026 • 1 Pax</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors text-sm">arrow_forward_ios</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Results View */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sites.map((site, index) => (
                            <motion.div
                                key={site.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="glass-panel p-6 rounded-2xl border border-white/5 premium-shadow relative group hover:border-primary/30 transition-all flex flex-col justify-between min-h-[180px]"
                            >
                                <div className="absolute top-0 left-0 h-1 w-0 group-hover:w-full bg-primary transition-all duration-500"></div>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="text-white font-bold text-sm tracking-wide">{site.name}</h3>
                                        <div className="flex items-center gap-2">
                                            {searchStatus[site.id] === 'searching' ? (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary animate-pulse flex items-center gap-1">
                                                   <span className="size-1 bg-primary rounded-full animate-ping"></span> Scanning Matrix
                                                </span>
                                            ) : searchStatus[site.id] === 'done' ? (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1">
                                                   <span className="material-symbols-outlined text-[10px]">check_circle</span> Vector Optimal
                                                </span>
                                            ) : searchStatus[site.id] === 'error' ? (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/50 flex items-center gap-1">
                                                   <span className="material-symbols-outlined text-[10px]">error</span> Relay Lost
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Standby Protocol</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-white/10 group-hover:text-primary/20 transition-colors text-4xl">travel_explore</span>
                                </div>

                                <div className="mt-8 flex items-end justify-between">
                                    <div>
                                        {searchStatus[site.id] === 'searching' ? (
                                            <div className="flex gap-1.5 h-8 items-center">
                                                {[1, 2, 3].map(i => <div key={i} className="w-1 bg-primary/30 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                                            </div>
                                        ) : (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold text-white tracking-tighter">
                                                    {results.find(r => r.site.toLowerCase().includes(site.id.replace('-', '')) || r.site.toLowerCase().includes(site.id))?.price || '---'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                    {results.find(r => r.site.toLowerCase().includes(site.id.replace('-', '')) || r.site.toLowerCase().includes(site.id))?.currency === 'miles' ? 'pts' : 'brl'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors border-b border-transparent hover:border-primary pb-1">Analyze Clearance</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Detailed Matrix Table */}
                    <div className="glass-panel rounded-2xl border border-white/5 premium-shadow overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-white font-bold text-lg">Integrated Fleet Feed</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Real-time Comparative Dynamics</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-white/[0.01]">
                                        <th className="px-8 py-5">Source Node</th>
                                        <th className="px-8 py-5">Protocol Status</th>
                                        <th className="px-8 py-5 text-right">Extracted Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {results.length > 0 ? (
                                        results.map((res: any, i) => (
                                            <motion.tr 
                                                key={res.site}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="hover:bg-white/[0.03] transition-colors group"
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                                                        <span className="text-white font-bold text-sm uppercase tracking-wide">{res.site}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                                        res.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"
                                                    )}>
                                                        <span className="material-symbols-outlined text-[12px]">{res.success ? 'check_circle' : 'bolt'}</span>
                                                        {res.success ? "Optimized" : "Fault"}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className="text-primary font-bold text-lg tracking-tighter">{res.price}</span>
                                                    <span className="text-[8px] font-black text-slate-500 uppercase ml-1">{res.currency === 'miles' ? 'pts' : 'brl'}</span>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-8 py-20 text-center">
                                                <span className="material-symbols-outlined text-slate-700 text-6xl mb-4 block">query_stats</span>
                                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Active Protocol</p>
                                                <p className="text-[10px] text-slate-600 mt-1">Configure flight vector parameters to begin extraction.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
