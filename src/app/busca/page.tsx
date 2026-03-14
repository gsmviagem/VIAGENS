'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuotationResult {
    site: string;
    price: number | string;
    currency: 'miles' | 'BRL';
    success: boolean;
    error?: string;
}

function ResultCard({ result, index }: { result: QuotationResult; index: number }) {
    return (
        <motion.div
            key={result.site}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center gap-6 group hover:border-primary/20 transition-all hover:bg-white/[0.02] relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 h-full w-1 bg-primary/20 group-hover:bg-primary transition-all"></div>
            
            <div className="flex items-center gap-4 min-w-[180px]">
                <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">flight_takeoff</span>
                </div>
                <div>
                    <div className="font-bold text-white tracking-wide">{result.site}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Direct Access Node</div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-between px-2">
                {result.success ? (
                    <>
                        <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <span className="material-symbols-outlined text-sm">verified</span> Verified Stream
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary tracking-tighter">
                                {typeof result.price === 'number' ? result.price.toLocaleString('pt-BR') : result.price}
                            </div>
                            <div className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
                                {result.currency === 'miles' ? 'POINTS' : 'BRL'}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-primary/40 text-[10px] font-black uppercase tracking-widest ml-auto">
                        <span className="material-symbols-outlined text-sm">error</span>
                        <span>{result.error ?? 'Relay Timeout'}</span>
                    </div>
                )}
            </div>

            {result.success && (
                <button className="h-10 px-6 bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-primary hover:text-black hover:border-primary rounded-xl transition-all uppercase tracking-widest">
                    SELECT VECTOR
                </button>
            )}
        </motion.div>
    );
}

export default function BuscaPage() {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<QuotationResult[] | null>(null);

    const handleSwap = () => {
        setOrigin(destination);
        setDestination(origin);
    };

    const handleSearch = async () => {
        if (!origin.trim() || !destination.trim() || !date) {
            toast.error('Preencha origem, destino e data antes de buscar.');
            return;
        }

        setIsLoading(true);
        setResults(null);

        try {
            const res = await fetch('/api/quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: origin.toUpperCase(), destination: destination.toUpperCase(), date })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? 'Erro desconhecido');
            }

            setResults(data.results as QuotationResult[]);
            const successes = (data.results as QuotationResult[]).filter(r => r.success).length;
            toast.success(`Scan concluído! ${successes} companhias responderam.`);

        } catch (err: any) {
            toast.error('Falha na busca: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-white text-4xl font-light tracking-tight mb-2">Vector <span className="text-primary font-bold">Search</span></h1>
                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xs">radar</span>
                        Multi-Agent Cross-Platform Intelligent Routing
                    </p>
                </motion.div>
                <div className="hidden md:flex gap-4">
                    <div className="glass-panel px-4 py-2 rounded-full border border-white/5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm animate-pulse">broadcast_on_home</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ACTIVE SCANNER: 04</span>
                    </div>
                </div>
            </div>

            {/* Search Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-10 rounded-[2.5rem] border border-white/10 premium-shadow relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[12rem]">travel_explore</span>
                </div>
                
                <div className="relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-all ml-1">Departure Origin</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-primary transition-all">location_on</span>
                                <input
                                    placeholder="GRU"
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-bold uppercase placeholder:text-slate-800 focus:outline-none focus:border-primary/50 transition-all text-xl tracking-wider"
                                    value={origin}
                                    onChange={e => setOrigin(e.target.value)}
                                    maxLength={3}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-center pt-2">
                            <button
                                onClick={handleSwap}
                                className="size-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all shadow-xl"
                            >
                                <span className="material-symbols-outlined">swap_horiz</span>
                            </button>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-all ml-1">Target Arrival</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-primary transition-all">flight_land</span>
                                <input
                                    placeholder="JFK"
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-bold uppercase placeholder:text-slate-800 focus:outline-none focus:border-primary/50 transition-all text-xl tracking-wider"
                                    value={destination}
                                    onChange={e => setDestination(e.target.value)}
                                    maxLength={3}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-all ml-1">Relay Date</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">calendar_today</span>
                                <input
                                    type="date"
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white font-bold focus:outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-white/5">
                        <div className="flex gap-4">
                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">person</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Single Pax</span>
                            </div>
                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">star</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executive</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="w-full sm:w-auto h-16 px-12 bg-primary text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <div className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    SCANNING INFRASTRUCTURE...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">satellite_alt</span>
                                    INITIATE VECTOR SCAN
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Results */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20 gap-6"
                    >
                        <div className="size-20 rounded-full border-t-2 border-primary animate-spin shadow-[0_0_20px_rgba(212,175,55,0.2)]"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Relaying Global Nodes...</p>
                    </motion.div>
                )}

                {results && !isLoading && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-white font-bold text-lg flex items-center gap-3">
                                Live Matrix Feed <span className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]"></span>
                            </h2>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                {results.filter(r => r.success).length} / {results.length} RELAYS ONLINE
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {results.length === 0 ? (
                                <div className="text-center py-20 glass-panel rounded-3xl border border-white/5">
                                    <span className="material-symbols-outlined text-6xl text-slate-800 mb-4 block">location_off</span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">No Vectors found in current scope</p>
                                </div>
                            ) : (
                                results.map((r, i) => <ResultCard key={r.site} result={r} index={i} />)
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
