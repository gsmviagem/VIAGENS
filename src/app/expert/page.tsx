'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CLASS_OPTIONS = [
    { value: 'Z', label: 'First' },
    { value: 'U', label: 'Business' },
    { value: 'X', label: 'Prem Eco' },
    { value: 'T', label: 'Economy' },
];

interface FlightResult {
    flight: string;
    departure: string;
    arrival: string;
    duration: string;
    aircraft: string;
    classes: { code: string; seats: string }[];
}

interface SearchResult {
    flights: FlightResult[];
    returnFlights?: FlightResult[];
    url: string;
    debug?: string;
}

function buildApiUrl(form: {
    origin: string; destination: string;
    depDate: string; retDate: string;
    classes: string[];
    direct: boolean; excludeCodeshares: boolean;
}): string {
    const params = new URLSearchParams({
        origin: form.origin,
        destination: form.destination,
        depDate: form.depDate,
        classes: form.classes.join(','),
        direct: String(form.direct),
        excludeCodeshares: String(form.excludeCodeshares),
    });
    if (form.retDate) params.set('retDate', form.retDate);
    return `/api/expert?${params}`;
}

export default function ExpertPage() {
    const [form, setForm] = useState({
        origin: '',
        destination: '',
        depDate: '',
        retDate: '',
        classes: ['U'] as string[],
        direct: true,
        excludeCodeshares: true,
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);

    const set = (key: string, value: string | boolean) =>
        setForm(f => ({ ...f, [key]: value }));

    const toggleClass = (val: string) =>
        setForm(f => ({
            ...f,
            classes: f.classes.includes(val)
                ? f.classes.filter(c => c !== val)
                : [...f.classes, val],
        }));

    const isValid = form.origin.length >= 3 && form.destination.length >= 3 && !!form.depDate && form.classes.length > 0;

    const handleSearch = async () => {
        if (!isValid) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(buildApiUrl(form));
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro na busca');
            setResult(data);
            if (data.flights.length === 0) toast.info('Nenhum voo encontrado — verifique os filtros');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto py-8 space-y-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-400 text-2xl">travel_explore</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Expert Flyer</h1>
                        <p className="text-[11px] text-white/30 font-medium">Award & Upgrade — American Airlines</p>
                    </div>
                    {result && (
                        <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                            Ver no Site
                        </a>
                    )}
                </motion.div>

                {/* Form */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">

                    {/* Route */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Origem</label>
                            <Input
                                maxLength={3}
                                placeholder="GRU"
                                value={form.origin}
                                onChange={e => set('origin', e.target.value.toUpperCase())}
                                className="bg-white/[0.04] border-white/10 text-white font-black text-lg text-center h-12 rounded-xl placeholder:text-white/15 focus:border-amber-500/40 uppercase tracking-widest"
                            />
                        </div>
                        <div className="flex items-center justify-center pb-1">
                            <span className="material-symbols-outlined text-white/20 text-xl">arrow_forward</span>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Destino</label>
                            <Input
                                maxLength={3}
                                placeholder="JFK"
                                value={form.destination}
                                onChange={e => set('destination', e.target.value.toUpperCase())}
                                className="bg-white/[0.04] border-white/10 text-white font-black text-lg text-center h-12 rounded-xl placeholder:text-white/15 focus:border-amber-500/40 uppercase tracking-widest"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Ida</label>
                            <Input type="date" value={form.depDate}
                                onChange={e => set('depDate', e.target.value)}
                                className="bg-white/[0.04] border-white/10 text-white h-11 rounded-xl focus:border-amber-500/40 [color-scheme:dark]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                Volta <span className="normal-case font-medium text-white/20">(opcional)</span>
                            </label>
                            <Input type="date" value={form.retDate}
                                onChange={e => set('retDate', e.target.value)}
                                className="bg-white/[0.04] border-white/10 text-white h-11 rounded-xl focus:border-amber-500/40 [color-scheme:dark]" />
                        </div>
                    </div>

                    {/* Class */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            Classe <span className="normal-case font-medium text-white/20">(múltipla)</span>
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {CLASS_OPTIONS.map(c => (
                                <button key={c.value} onClick={() => toggleClass(c.value)}
                                    className={cn(
                                        'h-10 rounded-xl border text-[11px] font-black uppercase tracking-wide transition-all',
                                        form.classes.includes(c.value)
                                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                            : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/60'
                                    )}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex gap-3">
                        <button onClick={() => set('direct', !form.direct)}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all',
                                form.direct
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                    : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/60'
                            )}>
                            <span className="material-symbols-outlined text-[14px]">flight_land</span>
                            Direto
                        </button>
                        <button onClick={() => set('excludeCodeshares', !form.excludeCodeshares)}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all',
                                form.excludeCodeshares
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                    : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/60'
                            )}>
                            <span className="material-symbols-outlined text-[14px]">block</span>
                            Sem Codeshares
                        </button>
                    </div>
                </motion.div>

                {/* Search Button */}
                <Button
                    onClick={handleSearch}
                    disabled={!isValid || loading}
                    className={cn(
                        'w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all',
                        isValid && !loading
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                            : 'bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/5'
                    )}>
                    {loading ? (
                        <>
                            <span className="material-symbols-outlined text-[18px] mr-2 animate-spin">progress_activity</span>
                            Buscando...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[18px] mr-2">travel_explore</span>
                            Buscar Disponibilidade
                        </>
                    )}
                </Button>

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                    {result.flights.length > 0
                                        ? `${result.flights.length} voo${result.flights.length !== 1 ? 's' : ''} encontrado${result.flights.length !== 1 ? 's' : ''}`
                                        : 'Sem disponibilidade'}
                                </p>
                            </div>

                            {result.flights.length > 0 ? (
                                result.flights.map((f, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="glass-panel rounded-2xl border border-white/5 hover:border-amber-500/20 transition-all p-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-amber-400 text-[16px]">flight</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-white text-sm">{f.flight}</div>
                                                <div className="text-[10px] text-white/30 font-medium mt-0.5">
                                                    {[f.departure, f.arrival, f.duration, f.aircraft].filter(Boolean).join(' · ')}
                                                </div>
                                            </div>
                                            {(f.classes ?? []).map(c => (
                                                <div key={c.code} className="text-center shrink-0">
                                                    <div className="text-xs font-black text-amber-400">{c.seats}</div>
                                                    <div className="text-[9px] text-white/30 uppercase">{c.code}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="glass-panel rounded-2xl border border-white/5 p-8 text-center space-y-3">
                                    <span className="material-symbols-outlined text-white/20 text-4xl">flight_takeoff</span>
                                    <p className="text-white/30 text-sm font-medium">Nenhuma disponibilidade encontrada</p>
                                    <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-amber-400 text-[11px] font-bold hover:text-amber-300 transition-colors"
                                    >
                                        Verificar diretamente no ExpertFlyer
                                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                    </a>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
