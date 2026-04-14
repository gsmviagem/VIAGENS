'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BuscaIdealOffer {
    flightCode: string;
    airline: string;
    departure: string;
    arrival: string;
    duration: string;
    stops: string;
    priceBrl: number;
    miles: number;
    type: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'busca-ideal-milheiro';

const DEFAULT_MILHEIRO: Record<string, number> = {
    LATAM: 25.5,
    AZUL: 13.5,
    GOL: 16,
    TAP: 44,
};

const MILHEIRO_ROWS: { key: string; label: string; icon: string }[] = [
    { key: 'LATAM', label: 'LATAM', icon: 'flight' },
    { key: 'AZUL', label: 'AZUL', icon: 'flight' },
    { key: 'GOL', label: 'SMILES / GOL', icon: 'flight' },
    { key: 'TAP', label: 'TAP', icon: 'flight' },
];

const AIRLINE_COLORS: Record<string, string> = {
    GOL: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    LATAM: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    AZUL: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    TAP: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
};

/** Normaliza "GOL (G3)" → "GOL", "LATAM Airlines" → "LATAM", etc. */
function normalizeAirline(raw: string): string {
    const upper = raw.toUpperCase();
    if (upper.includes('GOL')) return 'GOL';
    if (upper.includes('LATAM')) return 'LATAM';
    if (upper.includes('AZUL')) return 'AZUL';
    if (upper.includes('TAP')) return 'TAP';
    return raw;
}

const SORT_COLS = ['miles', 'cost', 'departure'] as const;
type SortCol = typeof SORT_COLS[number];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BuscaIdealPage() {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');
    const [passengers, setPassengers] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [offers, setOffers] = useState<BuscaIdealOffer[]>([]);
    const [searchUrl, setSearchUrl] = useState('');
    const [activeAirline, setActiveAirline] = useState('ALL');
    const [milheiro, setMilheiro] = useState(DEFAULT_MILHEIRO);
    const [sortCol, setSortCol] = useState<SortCol>('miles');
    const [sortAsc, setSortAsc] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    // Load milheiro from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) setMilheiro(prev => ({ ...prev, ...JSON.parse(saved) }));
        } catch { /* ignore */ }
    }, []);

    const handleMilheiroChange = useCallback((key: string, val: string) => {
        const num = parseFloat(val.replace(',', '.'));
        if (isNaN(num) || num < 0) return;
        setMilheiro(prev => {
            const updated = { ...prev, [key]: num };
            localStorage.setItem(LS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const handleReset = () => {
        setMilheiro(DEFAULT_MILHEIRO);
        localStorage.removeItem(LS_KEY);
        toast.success('Milheiro redefinido para os valores padrão');
    };

    const handleSwap = () => { setOrigin(destination); setDestination(origin); };

    const handleSearch = async () => {
        if (!origin.trim() || !destination.trim() || !date) {
            toast.error('Preencha origem, destino e data.');
            return;
        }
        setIsLoading(true);
        setOffers([]);
        setHasSearched(false);
        setActiveAirline('ALL');
        try {
            const res = await fetch('/api/busca-ideal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: origin.trim().toUpperCase(),
                    destination: destination.trim().toUpperCase(),
                    date,
                    passengers,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error ?? 'Erro na busca');
            const allOffers: BuscaIdealOffer[] = (data.offers ?? []).filter((o: BuscaIdealOffer) => o.miles > 0);
            setOffers(allOffers);
            setSearchUrl(data.searchUrl ?? '');
            setHasSearched(true);
            toast.success(`${allOffers.length} voos com milhas encontrados`);
        } catch (err: any) {
            toast.error(err.message);
            setHasSearched(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Airlines present in results (normalized)
    const airlines = useMemo(() => {
        const seen = new Set(offers.map(o => normalizeAirline(o.airline)));
        return ['ALL', ...Array.from(seen).sort()];
    }, [offers]);

    // Filtered + sorted
    const filtered = useMemo(() => {
        let list = activeAirline === 'ALL' ? offers : offers.filter(o => normalizeAirline(o.airline) === activeAirline);
        return [...list].sort((a, b) => {
            let diff = 0;
            if (sortCol === 'miles') diff = a.miles - b.miles;
            else if (sortCol === 'cost') {
                const ca = (a.miles / 1000) * (milheiro[normalizeAirline(a.airline)] ?? 0);
                const cb = (b.miles / 1000) * (milheiro[normalizeAirline(b.airline)] ?? 0);
                diff = ca - cb;
            } else if (sortCol === 'departure') diff = a.departure.localeCompare(b.departure);
            return sortAsc ? diff : -diff;
        });
    }, [offers, activeAirline, sortCol, sortAsc, milheiro]);

    const getCost = (offer: BuscaIdealOffer): number =>
        (offer.miles / 1000) * (milheiro[normalizeAirline(offer.airline)] ?? 0);

    const handleSort = (col: SortCol) => {
        if (sortCol === col) setSortAsc(a => !a);
        else { setSortCol(col); setSortAsc(true); }
    };

    const SortIcon = ({ col }: { col: SortCol }) => (
        <span className={cn('material-symbols-outlined text-[14px] ml-1 transition-transform', sortCol === col ? 'text-primary' : 'text-slate-600', sortCol === col && !sortAsc ? 'rotate-180' : '')}>
            {sortCol === col ? 'arrow_upward' : 'unfold_more'}
        </span>
    );

    return (
        <div className="space-y-6 w-full h-full overflow-hidden flex flex-col">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-1">
                        Busca <span className="text-primary font-normal">Ideal</span>
                    </h1>
                    <p className="text-slate-400 text-sm">Todos os voos com milhas disponíveis — calcule o custo real pelo seu milheiro.</p>
                </div>
                {searchUrl && (
                    <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                        <Badge className="bg-primary/10 text-primary border-primary/20 py-2 px-4 rounded-xl flex items-center gap-2 font-bold cursor-pointer hover:bg-primary/20 transition-colors">
                            <span className="material-symbols-outlined text-sm">open_in_new</span> Abrir no site
                        </Badge>
                    </a>
                )}
            </motion.div>

            {/* Search Form */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-5 rounded-2xl border border-white/10 shrink-0"
            >
                <div className="flex flex-wrap items-end gap-3">
                    {/* Origin */}
                    <div className="space-y-1 group w-28">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Origem</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base group-focus-within:text-primary transition-all">location_on</span>
                            <Input
                                placeholder="GRU"
                                className="pl-9 h-11 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-primary text-base font-bold uppercase"
                                value={origin}
                                onChange={e => setOrigin(e.target.value)}
                                maxLength={3}
                            />
                        </div>
                    </div>

                    {/* Swap */}
                    <Button
                        variant="ghost"
                        className="w-10 h-10 mb-0.5 rounded-full border border-white/10 glass-panel text-primary hover:bg-primary hover:text-background-dark transition-all"
                        onClick={handleSwap}
                    >
                        <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    </Button>

                    {/* Destination */}
                    <div className="space-y-1 group w-28">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Destino</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base group-focus-within:text-primary transition-all">location_on</span>
                            <Input
                                placeholder="GIG"
                                className="pl-9 h-11 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-primary text-base font-bold uppercase"
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                                maxLength={3}
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-1 group w-44">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Data</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">calendar_today</span>
                            <Input
                                type="date"
                                className="pl-9 h-11 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-primary text-sm font-bold"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Passengers */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Pax</label>
                        <div className="flex items-center gap-1 border border-white/10 rounded-xl px-3 h-11 text-slate-400 text-sm bg-white/5">
                            <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))} disabled={passengers <= 1}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-primary transition-colors disabled:opacity-30">−</button>
                            <span className="font-black text-white w-4 text-center">{passengers}</span>
                            <button type="button" onClick={() => setPassengers(p => Math.min(9, p + 1))} disabled={passengers >= 9}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-primary transition-colors disabled:opacity-30">+</button>
                        </div>
                    </div>

                    {/* Search button */}
                    <Button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="h-11 px-8 bg-primary text-background-dark font-black rounded-xl shadow-[0_0_16px_rgba(0,255,200,0.25)] hover:brightness-110 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
                    >
                        {isLoading
                            ? <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Buscando...</>
                            : <><span className="material-symbols-outlined text-base">search</span> Buscar</>
                        }
                    </Button>
                </div>
            </motion.div>

            {/* Content: Milheiro + Results */}
            <div className="flex-1 min-h-0 flex gap-5 overflow-hidden">
                {/* ── Milheiro Block ── */}
                <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-64 shrink-0 glass-panel rounded-2xl border border-white/10 p-5 flex flex-col gap-4 h-fit"
                >
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-white mb-0.5">Custo por Milheiro</h2>
                        <p className="text-[10px] text-slate-500">R$ por 1.000 milhas — salvo localmente</p>
                    </div>

                    <div className="space-y-3">
                        {MILHEIRO_ROWS.map(row => (
                            <div key={row.key} className="flex items-center gap-3">
                                <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 text-[10px] font-black', AIRLINE_COLORS[row.key] ?? 'border-white/10 bg-white/5 text-slate-400')}>
                                    {row.key === 'GOL' ? 'G' : row.key[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate">{row.label}</div>
                                </div>
                                <div className="relative w-20 shrink-0">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={milheiro[row.key] ?? ''}
                                        onChange={e => handleMilheiroChange(row.key, e.target.value)}
                                        className="w-full h-8 bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 text-right text-white text-xs font-black focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-1 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors py-1 flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-xs">restart_alt</span> Redefinir padrão
                        </button>
                    </div>
                </motion.div>

                {/* ── Results ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
                    {/* Filter tabs + count */}
                    <AnimatePresence>
                        {hasSearched && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between gap-3 shrink-0 flex-wrap"
                            >
                                <div className="flex gap-2 flex-wrap">
                                    {airlines.map(air => (
                                        <button
                                            key={air}
                                            type="button"
                                            onClick={() => setActiveAirline(air)}
                                            className={cn(
                                                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border',
                                                activeAirline === air
                                                    ? 'bg-primary/15 border-primary/30 text-primary'
                                                    : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                                            )}
                                        >
                                            {air === 'ALL' ? 'Todas' : air}
                                            {air === 'ALL'
                                                ? ` (${offers.length})`
                                                : ` (${offers.filter(o => o.airline === air).length})`
                                            }
                                        </button>
                                    ))}
                                </div>
                                {filtered.length > 0 && (
                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest shrink-0">
                                        {filtered.length} voo{filtered.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
                                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                <p className="font-black text-xs uppercase tracking-widest animate-pulse">Consultando Busca Ideal...</p>
                            </div>
                        )}

                        {!isLoading && hasSearched && filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
                                <span className="material-symbols-outlined text-5xl text-slate-800">location_off</span>
                                <p className="font-black uppercase tracking-widest text-xs">Nenhum voo com milhas encontrado</p>
                            </div>
                        )}

                        {!isLoading && !hasSearched && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-700">
                                <span className="material-symbols-outlined text-5xl">travel_explore</span>
                                <p className="font-black uppercase tracking-widest text-xs">Faça uma busca para ver os voos</p>
                            </div>
                        )}

                        {!isLoading && filtered.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
                            >
                                {/* Table header */}
                                <div className="grid grid-cols-[80px_80px_1fr_1fr_70px_100px_110px_110px] gap-0 border-b border-white/5 px-4 py-3">
                                    {[
                                        { label: 'CIA', col: null },
                                        { label: 'VOO', col: null },
                                        { label: 'SAÍDA', col: 'departure' as SortCol },
                                        { label: 'CHEGADA', col: null },
                                        { label: 'DUR.', col: null },
                                        { label: 'PARADAS', col: null },
                                        { label: 'MILHAS', col: 'miles' as SortCol },
                                        { label: 'CUSTO R$', col: 'cost' as SortCol },
                                    ].map(({ label, col }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => col && handleSort(col)}
                                            className={cn(
                                                'text-left text-[10px] font-black uppercase tracking-widest flex items-center',
                                                col ? 'text-slate-500 hover:text-slate-300 transition-colors cursor-pointer' : 'text-slate-600 cursor-default'
                                            )}
                                        >
                                            {label}
                                            {col && <SortIcon col={col} />}
                                        </button>
                                    ))}
                                </div>

                                {/* Rows */}
                                <div>
                                    {filtered.map((offer, i) => {
                                        const cost = getCost(offer);
                                        const airKey = normalizeAirline(offer.airline);
                                        const colorClass = AIRLINE_COLORS[airKey] ?? 'border-white/10 bg-white/5 text-slate-400';
                                        const depTime = offer.departure.split(' ')[1] ?? offer.departure;
                                        const arrTime = offer.arrival.split(' ')[1] ?? offer.arrival;

                                        return (
                                            <motion.div
                                                key={`${offer.flightCode}-${offer.departure}-${i}`}
                                                initial={{ opacity: 0, x: 12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                                                className="grid grid-cols-[80px_80px_1fr_1fr_70px_100px_110px_110px] gap-0 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group"
                                            >
                                                {/* CIA */}
                                                <div className="flex items-center">
                                                    <span className={cn('px-2 py-0.5 rounded-md border text-[10px] font-black uppercase', colorClass)}>
                                                        {airKey}
                                                    </span>
                                                </div>

                                                {/* VOO */}
                                                <div className="flex items-center">
                                                    <span className="text-slate-400 font-mono text-xs">{offer.flightCode}</span>
                                                </div>

                                                {/* SAÍDA */}
                                                <div className="flex flex-col justify-center">
                                                    <span className="text-white font-black text-sm">{depTime}</span>
                                                    <span className="text-slate-600 text-[10px]">{offer.departure.split(' ')[0]}</span>
                                                </div>

                                                {/* CHEGADA */}
                                                <div className="flex flex-col justify-center">
                                                    <span className="text-slate-300 font-bold text-sm">{arrTime}</span>
                                                    <span className="text-slate-600 text-[10px]">{offer.arrival.split(' ')[0]}</span>
                                                </div>

                                                {/* DURAÇÃO */}
                                                <div className="flex items-center">
                                                    <span className="text-slate-500 text-xs">{offer.duration}</span>
                                                </div>

                                                {/* PARADAS */}
                                                <div className="flex items-center">
                                                    <span className={cn('text-xs font-bold', offer.stops === 'Direto' ? 'text-green-400' : 'text-amber-400')}>
                                                        {offer.stops}
                                                    </span>
                                                </div>

                                                {/* MILHAS */}
                                                <div className="flex items-center">
                                                    <span className="text-primary font-black text-sm">
                                                        {offer.miles.toLocaleString('pt-BR')}
                                                        <span className="text-slate-600 text-[10px] font-normal ml-1">mi</span>
                                                    </span>
                                                </div>

                                                {/* CUSTO R$ */}
                                                <div className="flex items-center">
                                                    {cost > 0 ? (
                                                        <span className="text-white font-black text-sm">
                                                            {cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">—</span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
