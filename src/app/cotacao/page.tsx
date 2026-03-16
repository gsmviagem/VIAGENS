'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sites = [
    { id: 'smiles', name: 'Smiles Rewards', color: 'border-orange-500/30 text-orange-400' },
    { id: 'latam', name: 'LATAM Pass', color: 'border-purple-500/30 text-purple-400' },
    { id: 'azul', name: 'Azul Rewards', color: 'border-blue-500/30 text-blue-400' },
    { id: 'busca-ideal', name: 'Busca Ideal', color: 'border-cyan-500/30 text-cyan-400' },
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
                    updatedStatus[key] = r.success ? 'done' : 'error';
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
        <div className="min-h-screen pt-24 pb-12 px-6 lg:px-12 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 animate-pulse"></div>

            <header className="mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-2"
                >
                    <div className="p-3 bg-black/10 rounded-2xl border border-black/20">
                        <span className="material-symbols-outlined text-black text-2xl font-bold">public</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-black">Quotation Matrix</h1>
                        <p className="text-black/70 font-semibold">Multi-source flight comparison intelligence</p>
                    </div>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Search Form Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-4 space-y-6"
                >
                    <div className="glass-panel p-6 border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <span className="material-symbols-outlined text-sm">bolt</span>
                            <h2 className="font-bold uppercase tracking-widest text-sm">Target Flight details</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="group relative">
                                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block group-focus-within:text-primary transition-colors">Origin (IATA)</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-all">
                                    <span className="material-symbols-outlined text-slate-400 mr-3 text-lg rotate-45">flight</span>
                                    <input
                                        type="text"
                                        placeholder="EX: GRU"
                                        value={form.origin}
                                        onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                                        className="bg-transparent border-none outline-none text-white font-bold w-full placeholder:text-slate-600 focus:ring-0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30">
                                    <span className="material-symbols-outlined text-sm rotate-90">swap_horiz</span>
                                </Button>
                            </div>

                            <div className="group relative">
                                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block group-focus-within:text-primary transition-colors">Destination (IATA)</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-all">
                                    <span className="material-symbols-outlined text-slate-400 mr-3 text-lg -rotate-45">flight</span>
                                    <input
                                        type="text"
                                        placeholder="EX: LHR"
                                        value={form.destination}
                                        onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                                        className="bg-transparent border-none outline-none text-white font-bold w-full placeholder:text-slate-600 focus:ring-0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block">Date</label>
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                        <span className="material-symbols-outlined text-slate-400 mr-3 text-lg">calendar_today</span>
                                        <input
                                            type="text"
                                            placeholder="20/05/2026"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block">Passengers</label>
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                        <span className="material-symbols-outlined text-slate-400 mr-3 text-lg">person</span>
                                        <input
                                            type="number"
                                            value={form.passengers}
                                            onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) })}
                                            className="bg-transparent border-none outline-none text-white text-sm w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-full h-14 bg-primary hover:bg-primary-hover text-black font-extrabold text-lg mt-8 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 group"
                            >
                                {isSearching ? (
                                    <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined mr-2">bolt</span>
                                )}
                                {isSearching ? 'COMPILING DATA...' : 'INITIALIZE QUOTATION'}
                            </Button>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-sm">history</span>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Search History</h3>
                        </div>
                        <div className="space-y-3">
                            {[1, 2].map(i => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                                    <div>
                                        <p className="text-sm font-bold text-white">GRU → JFK</p>
                                        <p className="text-[10px] text-slate-500">20/05/2026 • 1 Pax</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-primary">65k mi</p>
                                        <p className="text-[9px] text-slate-500 lowercase">Smiles</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Results Area */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sites.map((site) => (
                            <motion.div
                                key={site.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                    "glass-panel p-6 flex flex-col justify-between border-l-4 min-h-[160px] relative overflow-hidden group",
                                    site.color
                                )}
                            >
                                {/* Site specific background glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-5 blur-3xl -z-10 group-hover:opacity-10 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-tighter text-slate-300">{site.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {searchStatus[site.id] === 'searching' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined w-3 h-3 animate-spin text-primary text-sm">refresh</span>
                                                    <span className="text-[10px] font-bold text-primary animate-pulse uppercase">Analysing Matrix...</span>
                                                </div>
                                            ) : searchStatus[site.id] === 'done' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Found Optimised Path</span>
                                                </div>
                                            ) : searchStatus[site.id] === 'error' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-red-400">cancel</span>
                                                    <span className="text-[10px] font-bold text-red-400 uppercase">Extraction Fault</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">Waiting Protocol...</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined opacity-20 text-xl text-primary font-bold">public</span>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-end justify-between">
                                        <div className="h-10 flex items-center">
                                            {searchStatus[site.id] === 'searching' ? (
                                                <div className="flex gap-1">
                                                    {[1, 2, 3].map(i => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ height: [4, 16, 4] }}
                                                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                                            className="w-1 bg-primary/40 rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-3xl font-black tracking-tighter text-white">
                                                    {results.find(r => r.site.toLowerCase().includes(site.id))?.price || '---'}
                                                    <span className="text-xs uppercase ml-1 opacity-50">
                                                        {results.find(r => r.site.toLowerCase().includes(site.id))?.currency === 'miles' ? 'mi' : 'brl'}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white">View Board</Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Comparative Table / Detailed Results */}
                    <div className="glass-panel p-1 border-white/5 bg-white/[0.01]">
                        <div className="p-6 border-b border-white/5">
                            <h3 className="font-bold text-slate-200">Comparative Flight Matrix</h3>
                            <p className="text-xs text-slate-500">Aggregated results for best routing efficiency</p>
                        </div>
                        {results.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                                            <th className="px-6 py-4 font-bold">Source</th>
                                            <th className="px-6 py-4 font-bold">Protocol</th>
                                            <th className="px-6 py-4 font-bold text-right">Extracted Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-medium">
                                        {results.map((res: any) => (
                                            <tr key={res.site} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-white font-bold">{res.site}</td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        res.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                                    )}>
                                                        {res.success ? "Optimised" : "Fault"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-primary font-black">
                                                    {res.price} {res.currency === 'miles' ? 'MI' : 'BRL'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-20 text-center">
                                <div className="inline-flex p-4 rounded-full bg-white/5 mb-4 border border-white/10 group-hover:border-primary/30 transition-all">
                                    <span className="material-symbols-outlined w-8 h-8 text-slate-600 flex items-center justify-center">search</span>
                                </div>
                                <h4 className="text-slate-400 font-bold">No active search protocol</h4>
                                <p className="text-xs text-slate-600 mt-1 max-w-[200px] mx-auto">Fill the flight details and initialize the quotation agent.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
