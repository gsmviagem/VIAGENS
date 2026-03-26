'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuotationResult {
    site: string;
    price: number | string;
    currency: 'miles' | 'BRL';
    success: boolean;
    error?: string;
}

const AIRLINE_COLORS: Record<string, string> = {
    Azul: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    LATAM: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    Smiles: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    BuscaIdeal: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
};

function ResultCard({ result, index }: { result: QuotationResult; index: number }) {
    const colorClass = AIRLINE_COLORS[result.site] ?? 'border-white/10 bg-white/5 text-slate-400';

    return (
        <motion.div
            key={result.site}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center gap-6 group hover:border-primary/20 transition-all hover:bg-white/[0.02]"
        >
            <div className="flex items-center gap-4 min-w-[140px]">
                <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center", colorClass)}>
                    <span className="material-symbols-outlined text-2xl font-bold">flight_takeoff</span>
                </div>
                <div>
                    <div className="font-black text-white">{result.site}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-black">Direct Access</div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-between px-2">
                {result.success ? (
                    <>
                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">check_circle</span> Online
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-primary drop-shadow-[0_0_4px_rgba(0,255,200,0.3)]">
                                {typeof result.price === 'number' ? result.price.toLocaleString('pt-BR') : result.price}
                            </div>
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                {result.currency === 'miles' ? 'MILHAS' : 'BRL'}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-primary text-xs font-bold ml-auto">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        <span>{result.error ?? 'Falha na busca'}</span>
                    </div>
                )}
            </div>

            {result.success && (
                <Button className="bg-white/5 border border-white/10 text-white rounded-xl h-10 px-6 group-hover:bg-primary group-hover:text-background-dark transition-all font-black text-xs">
                    SELECT <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
                </Button>
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
        <div className="space-y-8 w-full h-full overflow-hidden flex flex-col">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Vector <span className="text-primary font-normal">Search</span></h1>
                    <p className="text-slate-400 max-w-xl">Cruze dados de múltiplas companhias para encontrar a rota mais eficiente em milhas ou dinheiro.</p>
                </div>
                <div className="flex gap-3">
                    <Badge className="bg-primary/10 text-primary border-primary/20 py-2 px-4 rounded-xl flex items-center gap-2 font-bold select-none cursor-default">
                        <span className="material-symbols-outlined text-sm">bolt</span> 4 Nodes Ativos
                    </Badge>
                </div>
            </motion.div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10 min-h-0">
                {/* Search Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 rounded-[32px] border border-white/10 shadow-[0_0_50px_-12px_rgba(0,255,200,0.1)]"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Departure</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-primary transition-all">location_on</span>
                                <Input
                                    id="origin-input"
                                    placeholder="GRU, JFK..."
                                    className="pl-11 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold uppercase"
                                    value={origin}
                                    onChange={e => setOrigin(e.target.value)}
                                    maxLength={3}
                                />
                            </div>
                        </div>

                        <div className="relative md:flex items-center justify-center pt-6">
                            <Button
                                variant="ghost"
                                id="swap-button"
                                className="w-12 h-12 rounded-full border border-white/10 glass-panel text-primary hover:bg-primary hover:text-background-dark transition-all"
                                onClick={handleSwap}
                            >
                                <span className="material-symbols-outlined">swap_horiz</span>
                            </Button>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Arrival</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500">location_on</span>
                                <Input
                                    id="destination-input"
                                    placeholder="LHR, CDG..."
                                    className="pl-11 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold uppercase"
                                    value={destination}
                                    onChange={e => setDestination(e.target.value)}
                                    maxLength={3}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Date</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">calendar_today</span>
                                <Input
                                    id="date-input"
                                    type="date"
                                    className="pl-11 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-base font-bold"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                        <div className="flex gap-4">
                            <Badge variant="outline" className="border-white/10 text-slate-400 py-1.5 px-4 rounded-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary">person</span> 1 Adult
                            </Badge>
                            <Badge variant="outline" className="border-white/10 text-slate-400 py-1.5 px-4 rounded-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary">business_center</span> Economy
                            </Badge>
                        </div>
                        <Button
                            id="search-button"
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="w-full sm:w-auto px-12 h-14 bg-primary text-background-dark font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(0,255,200,0.3)] hover:brightness-110 flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <><span className="material-symbols-outlined animate-spin text-xl">refresh</span> SCANNING...</>
                            ) : (
                                <><span className="material-symbols-outlined text-xl">search</span> INITIATE SCAN</>
                            )}
                        </Button>
                    </div>
                </motion.div>

                {/* Results Section */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500"
                        >
                            <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            <p className="font-black text-xs uppercase tracking-widest animate-pulse">Consultando companhias aéreas...</p>
                        </motion.div>
                    )}

                    {results && !isLoading && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 pb-12"
                        >
                            <div className="flex items-center justify-between px-2 sticky top-0 z-10 bg-[#0e0e0e] py-2">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    Live Data Feed <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,200,1)]"></span>
                                </h2>
                                <Badge variant="outline" className="border-white/10 text-slate-400">
                                    {results.filter(r => r.success).length}/{results.length} online
                                </Badge>
                            </div>

                            <div className="grid gap-4">
                                {results.length === 0 ? (
                                    <div className="text-center py-16 text-slate-600 flex flex-col items-center gap-4">
                                        <span className="material-symbols-outlined text-5xl text-slate-800 mb-4 block">location_off</span>
                                        <p className="font-black uppercase tracking-widest text-xs">Nenhum resultado encontrado</p>
                                    </div>
                                ) : (
                                    results.map((r, i) => <ResultCard key={r.site} result={r} index={i} />)
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
