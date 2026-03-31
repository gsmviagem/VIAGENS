'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const sites = [
    { id: 'smiles', name: 'Smiles Rewards', color: 'border-orange-500/30 text-orange-400' },
    { id: 'latam', name: 'LATAM Pass', color: 'border-purple-500/30 text-purple-400' },
    { id: 'azul', name: 'Azul Rewards', color: 'border-blue-500/30 text-blue-400' },
    { id: 'busca-ideal', name: 'Busca Ideal (Multi-cia)', color: 'border-cyan-500/30 text-cyan-400' },
    { id: 'kiwi', name: 'Kiwi (Global BRL)', color: 'border-green-500/30 text-green-400' },
];

interface HistoryEntry {
    origin: string;
    destination: string;
    date: string;
    passengers: number;
    bestPrice: string;
    bestSite: string;
    ts: number;
}

const HISTORY_KEY = 'quotation_history';
const MAX_HISTORY = 5;

function loadHistory(): HistoryEntry[] {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveHistory(entry: HistoryEntry) {
    const prev = loadHistory().filter(
        h => !(h.origin === entry.origin && h.destination === entry.destination && h.date === entry.date)
    );
    const updated = [entry, ...prev].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

function isValidIATA(code: string): boolean {
    return /^[A-Z]{3}$/.test(code.trim().toUpperCase());
}

export default function CotacaoPage() {
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [searchStatus, setSearchStatus] = useState<Record<string, 'idle' | 'searching' | 'done' | 'error'>>({
        smiles: 'idle',
        latam: 'idle',
        azul: 'idle',
        'busca-ideal': 'idle',
        kiwi: 'idle',
    });
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [iataError, setIataError] = useState('');
    const [fromCache, setFromCache] = useState(false);

    const [form, setForm] = useState({
        origin: '',
        destination: '',
        date: '',
        passengers: 1
    });

    useEffect(() => {
        setHistory(loadHistory());
    }, []);

    const handleSwap = () => {
        setForm(prev => ({ ...prev, origin: prev.destination, destination: prev.origin }));
        setIataError('');
    };

    const validateForm = (): boolean => {
        const origin = form.origin.trim().toUpperCase();
        const dest = form.destination.trim().toUpperCase();
        if (!origin || !dest || !form.date) {
            setIataError('Preencha origem, destino e data.');
            return false;
        }
        if (!isValidIATA(origin)) {
            setIataError(`Código de origem inválido: "${origin}". Use 3 letras (ex: GRU).`);
            return false;
        }
        if (!isValidIATA(dest)) {
            setIataError(`Código de destino inválido: "${dest}". Use 3 letras (ex: JFK).`);
            return false;
        }
        setIataError('');
        return true;
    };

    const handleSearch = async () => {
        if (!validateForm()) return;

        setIsSearching(true);
        setFromCache(false);
        const newStatus = { ...searchStatus };
        Object.keys(newStatus).forEach(site => newStatus[site] = 'searching');
        setSearchStatus(newStatus);
        setResults([]);

        try {
            const payload = {
                ...form,
                origin: form.origin.trim().toUpperCase(),
                destination: form.destination.trim().toUpperCase(),
            };
            const response = await fetch('/api/quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || 'Erro na busca');
                Object.keys(newStatus).forEach(site => newStatus[site] = 'error');
                setSearchStatus({ ...newStatus });
                return;
            }

            if (data.success) {
                setResults(data.results);
                setFromCache(!!data.cached);
                const updatedStatus: any = {};
                data.results.forEach((r: any) => {
                    const key = r.site.toLowerCase().replace(/\s+/g, '-');
                    updatedStatus[key] = r.success ? 'done' : 'error';
                });
                setSearchStatus(updatedStatus);

                // Build best price for history
                const successResults = data.results.filter((r: any) => r.success && typeof r.price === 'number');
                const best = successResults.sort((a: any, b: any) => {
                    if (a.currency === b.currency) return a.price - b.price;
                    return a.currency === 'miles' ? -1 : 1;
                })[0];

                const entry: HistoryEntry = {
                    origin: payload.origin,
                    destination: payload.destination,
                    date: form.date,
                    passengers: form.passengers,
                    bestPrice: best ? `${best.price.toLocaleString('pt-BR')}${best.currency === 'miles' ? 'k mi' : ' BRL'}` : 'N/A',
                    bestSite: best?.site ?? '–',
                    ts: Date.now(),
                };
                saveHistory(entry);
                setHistory(loadHistory());

                if (data.cached) toast.info('Resultado em cache (< 15 min)');
            }
        } catch (error) {
            console.error('Search failed:', error);
            toast.error('Falha na conexão com o servidor.');
        } finally {
            setIsSearching(false);
        }
    };

    const loadFromHistory = (entry: HistoryEntry) => {
        setForm({ origin: entry.origin, destination: entry.destination, date: entry.date, passengers: entry.passengers });
        setIataError('');
    };

    const openViewBoard = (siteId: string) => {
        const result = results.find(r => r.site.toLowerCase().includes(siteId));
        if (result?.searchUrl) {
            window.open(result.searchUrl, '_blank', 'noopener,noreferrer');
        } else {
            // Fallback URLs per site
            const fallbacks: Record<string, string> = {
                smiles: 'https://www.smiles.com.br',
                latam: 'https://www.latamairlines.com/br/pt',
                azul: 'https://azulpelomundo.voeazul.com.br',
                'busca-ideal': 'https://busca.buscaideal.com.br',
                kiwi: 'https://www.kiwi.com/',
            };
            window.open(fallbacks[siteId] || '#', '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 animate-pulse"></div>

            <header className="mb-10 shrink-0">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="p-3 bg-black/5 rounded-2xl border border-black/10">
                        <span className="material-symbols-outlined text-white text-2xl font-bold">public</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-4xl font-black tracking-tight text-white">Quotation Matrix</h1>
                        <p className="text-white/70 font-bold">Multi-source flight comparison intelligence</p>
                    </div>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
                                <div className={cn(
                                    "flex items-center bg-white/5 border rounded-xl px-4 py-3 focus-within:border-primary/50 transition-all",
                                    iataError && form.origin && !isValidIATA(form.origin.toUpperCase()) ? 'border-red-500/50' : 'border-white/10'
                                )}>
                                    <span className="material-symbols-outlined text-slate-400 mr-3 text-lg rotate-45">flight</span>
                                    <input
                                        type="text"
                                        placeholder="EX: GRU"
                                        value={form.origin}
                                        maxLength={3}
                                        onChange={(e) => {
                                            setForm({ ...form, origin: e.target.value.toUpperCase() });
                                            setIataError('');
                                        }}
                                        className="bg-transparent border-none outline-none text-white font-bold w-full placeholder:text-slate-600 focus:ring-0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSwap}
                                    title="Trocar origem e destino"
                                    className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm rotate-90">swap_horiz</span>
                                </Button>
                            </div>

                            <div className="group relative">
                                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-1 block group-focus-within:text-primary transition-colors">Destination (IATA)</label>
                                <div className={cn(
                                    "flex items-center bg-white/5 border rounded-xl px-4 py-3 focus-within:border-primary/50 transition-all",
                                    iataError && form.destination && !isValidIATA(form.destination.toUpperCase()) ? 'border-red-500/50' : 'border-white/10'
                                )}>
                                    <span className="material-symbols-outlined text-slate-400 mr-3 text-lg -rotate-45">flight</span>
                                    <input
                                        type="text"
                                        placeholder="EX: LHR"
                                        value={form.destination}
                                        maxLength={3}
                                        onChange={(e) => {
                                            setForm({ ...form, destination: e.target.value.toUpperCase() });
                                            setIataError('');
                                        }}
                                        className="bg-transparent border-none outline-none text-white font-bold w-full placeholder:text-slate-600 focus:ring-0"
                                    />
                                </div>
                            </div>

                            {iataError && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[11px] text-red-400 font-bold flex items-center gap-1 pl-1"
                                >
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {iataError}
                                </motion.p>
                            )}

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
                                            min={1}
                                            max={9}
                                            value={form.passengers}
                                            onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) || 1 })}
                                            className="bg-transparent border-none outline-none text-white text-sm w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-full h-14 bg-primary hover:bg-primary-hover text-white font-extrabold text-lg mt-8 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 group"
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

                    {/* Search History */}
                    <div className="glass-panel p-6 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-sm">history</span>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Search History</h3>
                        </div>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-[11px] text-slate-600 text-center py-4">Nenhuma busca recente.</p>
                            ) : (
                                history.map((h, i) => (
                                    <button
                                        key={i}
                                        onClick={() => loadFromHistory(h)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 text-left"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-white">{h.origin} → {h.destination}</p>
                                            <p className="text-[10px] text-slate-500">{h.date} • {h.passengers} Pax</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-primary">{h.bestPrice}</p>
                                            <p className="text-[9px] text-slate-500 lowercase">{h.bestSite}</p>
                                        </div>
                                    </button>
                                ))
                            )}
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
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase">
                                                        Found Optimised Path {fromCache && <span className="text-emerald-600">(cache)</span>}
                                                    </span>
                                                </div>
                                            ) : searchStatus[site.id] === 'error' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-blue-400">cancel</span>
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase">Extraction Fault</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">Waiting Protocol...</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined opacity-20 text-xl text-primary font-bold">public</span>
                                </div>

                                <div className="mt-4">
                                    {(() => {
                                        const res = results.find(r => r.site.toLowerCase().replace(/\s+/g, '-').includes(site.id));
                                        const isDone = searchStatus[site.id] === 'done';

                                        // Busca Ideal: mostra top 5 em milhas quando disponível
                                        if (site.id === 'busca-ideal' && isDone && res?.milesBreakdown?.length > 0) {
                                            return (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1 mb-2">
                                                        <span className="material-symbols-outlined text-cyan-400 text-xs">stars</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/60">Top 5 em Milhas</span>
                                                    </div>
                                                    {res.milesBreakdown.map((b: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-[11px] bg-white/[0.03] rounded-lg px-2 py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-cyan-400/50 w-3">{i + 1}</span>
                                                                <div>
                                                                    <span className="text-slate-300 font-bold">{b.airline}</span>
                                                                    <span className="text-slate-600 ml-1 text-[9px]">{b.flightCode}</span>
                                                                    <p className="text-[9px] text-slate-600">{b.stops}</p>
                                                                </div>
                                                            </div>
                                                            <span className="font-black text-cyan-300">{b.miles} <span className="text-[9px] opacity-60">mi</span></span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-end pt-1">
                                                        <Button variant="ghost" size="sm" onClick={() => openViewBoard(site.id)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white">
                                                            Ver Site
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Kiwi: mostra breakdown por cia quando tem resultado
                                        if (site.id === 'kiwi' && isDone && res?.airlineBreakdown?.length > 0) {
                                            return (
                                                <div className="space-y-1.5">
                                                    {res.airlineBreakdown.map((b: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-[11px]">
                                                            <span className="text-slate-400 font-bold">{b.airline}</span>
                                                            <span className="font-black text-white">{b.price}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-end pt-1">
                                                        <Button variant="ghost" size="sm" onClick={() => openViewBoard(site.id)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white">
                                                            Ver Site
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
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
                                                            {res?.price !== undefined
                                                                ? typeof res.price === 'number'
                                                                    ? res.price.toLocaleString('pt-BR')
                                                                    : res.price
                                                                : '---'}
                                                            <span className="text-xs uppercase ml-1 opacity-50">
                                                                {res?.currency === 'miles' ? 'mi' : 'brl'}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openViewBoard(site.id)}
                                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                                                >
                                                    View Board
                                                </Button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Comparative Table */}
                    <div className="glass-panel p-1 border-white/5 bg-white/[0.01]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-200">Comparative Flight Matrix</h3>
                                <p className="text-xs text-slate-500">Aggregated results for best routing efficiency</p>
                            </div>
                            {fromCache && (
                                <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                                    Cache Hit &lt;15min
                                </span>
                            )}
                        </div>
                        {results.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                                            <th className="px-6 py-4 font-bold">Source</th>
                                            <th className="px-6 py-4 font-bold">Protocol</th>
                                            <th className="px-6 py-4 font-bold text-right">Extracted Value</th>
                                            <th className="px-6 py-4 font-bold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-medium">
                                        {results.map((res: any) => (
                                            <tr key={res.site} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-white font-bold">{res.site}</td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        res.success ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                                                    )}>
                                                        {res.success ? "Optimised" : "Fault"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-primary font-black">
                                                    {typeof res.price === 'number' ? res.price.toLocaleString('pt-BR') : res.price}{' '}
                                                    {res.currency === 'miles' ? 'MI' : 'BRL'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {res.searchUrl && (
                                                        <button
                                                            onClick={() => window.open(res.searchUrl, '_blank', 'noopener,noreferrer')}
                                                            className="text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-1 ml-auto"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                            Abrir
                                                        </button>
                                                    )}
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
