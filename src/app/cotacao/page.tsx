'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plane,
    Calendar,
    Users,
    ArrowRightLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    Globe2,
    Zap,
    History
} from 'lucide-react';
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
    const [searchStatus, setSearchStatus] = useState<Record<string, 'idle' | 'searching' | 'done' | 'error'>>({
        smiles: 'idle',
        latam: 'idle',
        azul: 'idle',
        'busca-ideal': 'idle',
    });

    const handleSearch = () => {
        setIsSearching(true);
        // Simulate search progress per site
        const newStatus = { ...searchStatus };
        Object.keys(newStatus).forEach(site => newStatus[site] = 'searching');
        setSearchStatus(newStatus);

        // This will eventually call /api/quotation
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
                    <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
                        <Globe2 className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-white">Quotation Matrix</h1>
                        <p className="text-slate-400 font-medium">Multi-source flight comparison intelligence</p>
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
                            <Zap size={18} className="fill-primary/20" />
                            <h2 className="font-bold uppercase tracking-widest text-sm">Target Flight details</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="group relative">
                                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block group-focus-within:text-primary transition-colors">Origin (IATA)</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-all">
                                    <Plane className="w-4 h-4 text-slate-400 mr-3 rotate-45" />
                                    <input
                                        type="text"
                                        placeholder="EX: GRU"
                                        className="bg-transparent border-none outline-none text-white font-bold w-full placeholder:text-slate-600 focus:ring-0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30">
                                    <ArrowRightLeft size={14} className="rotate-90" />
                                </Button>
                            </div>

                            <div className="group relative">
                                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block group-focus-within:text-primary transition-colors">Destination (IATA)</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-all">
                                    <Plane className="w-4 h-4 text-slate-400 mr-3 -rotate-45" />
                                    <input
                                        type="text"
                                        placeholder="EX: LHR"
                                        className="bg-transparent border-none outline-none text-white font-bold w-full placeholder:text-slate-600 focus:ring-0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block">Date</label>
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                        <Calendar className="w-4 h-4 text-slate-400 mr-3" />
                                        <input type="text" placeholder="20/05/26" className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-slate-600" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block">Passengers</label>
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                        <Users className="w-4 h-4 text-slate-400 mr-3" />
                                        <input type="number" defaultValue={1} className="bg-transparent border-none outline-none text-white text-sm w-full" />
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-full h-14 bg-primary hover:bg-primary-hover text-black font-extrabold text-lg mt-8 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 group"
                            >
                                {isSearching ? (
                                    <Loader2 className="animate-spin mr-2" />
                                ) : (
                                    <Zap size={20} className="mr-2 fill-black/20" />
                                )}
                                {isSearching ? 'COMPILING DATA...' : 'INITIALIZE QUOTATION'}
                            </Button>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="text-primary w-4 h-4" />
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
                                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                                    <span className="text-[10px] font-bold text-primary animate-pulse uppercase">Analysing Matrix...</span>
                                                </div>
                                            ) : searchStatus[site.id] === 'done' ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Found Optimised Path</span>
                                                </div>
                                            ) : searchStatus[site.id] === 'error' ? (
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="w-3 h-3 text-red-400" />
                                                    <span className="text-[10px] font-bold text-red-400 uppercase">Extraction Fault</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">Waiting Protocol...</span>
                                            )}
                                        </div>
                                    </div>
                                    <Globe2 className="w-5 h-5 opacity-20" />
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
                                                <p className="text-3xl font-black tracking-tighter text-white">---</p>
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
                        <div className="p-20 text-center">
                            <div className="inline-flex p-4 rounded-full bg-white/5 mb-4 border border-white/10 group-hover:border-primary/30 transition-all">
                                <Search className="w-8 h-8 text-slate-600" />
                            </div>
                            <h4 className="text-slate-400 font-bold">No active search protocol</h4>
                            <p className="text-xs text-slate-600 mt-1 max-w-[200px] mx-auto">Fill the flight details and initialize the quotation agent.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
