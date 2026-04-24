'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { analyzeScreen, STATE_META, type ScreenAnalysis, type OperationState } from '@/utils/screen-analyzer';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = 'recebido' | 'emitido' | 'loc_enviado' | 'passagem_enviada';

interface ScreenSource {
    id: string;
    label: string;
    stream: MediaStream;
}

interface TicketItem {
    id: string;
    passenger: string;
    route: string;
    airline: string;
    locator: string;
    ticketNumber: string;
    date: string;
    stages: Record<Stage, boolean>;
    firstSeen: number;
    lastSeen: number;
    sourceLabel: string;
    analysis: ScreenAnalysis | null;
    opState: OperationState;
    opConfidence: number;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────
const AIRLINES = ['GOL', 'LATAM', 'AZUL', 'TAP', 'AVIANCA', 'AMERICAN', 'UNITED', 'DELTA', 'COPA', 'IBERIA'];
const IATA_CODES = new Set([
    'GRU','GIG','CGH','SDU','BSB','SSA','FOR','REC','BEL','MAO','CWB','POA','FLN','NAT','MCZ',
    'MCP','VCP','CNF','GYN','AJU','SLZ','THE','JPA','VIX','UDI','LDB','CPV','JDO','IMP','PMW',
    'MIA','JFK','LAX','ORD','DFW','ATL','LHR','CDG','MAD','LIS','FCO','FRA','AMS','ZRH','GVA',
    'EZE','BOG','SCL','GUA','MEX','CUN','PTY','MVD','LIM','UIO','GYE','VVI','ASU','COR',
]);

const STAGE_LABELS: Record<Stage, string> = {
    recebido: 'Recebido',
    emitido: 'Emitido',
    loc_enviado: 'LOC Enviado',
    passagem_enviada: 'Email Enviado',
};
const STAGE_ORDER: Stage[] = ['recebido', 'emitido', 'loc_enviado', 'passagem_enviada'];
const STAGE_COLORS: Record<Stage, { dot: string; badge: string; bar: string }> = {
    recebido:          { dot: 'bg-blue-400',    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',     bar: 'bg-blue-400'    },
    emitido:           { dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',   bar: 'bg-amber-400'   },
    loc_enviado:       { dot: 'bg-purple-400',  badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', bar: 'bg-purple-400'  },
    passagem_enviada:  { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-400' },
};

const LS_KEY = 'monitor-tickets-v2';

// ─── OCR helpers ──────────────────────────────────────────────────────────────
function extractFromText(text: string, sourceLabel: string): Partial<TicketItem>[] {
    const analysis = analyzeScreen(text);
    const e = analysis.entities;

    const routes = e.segments.map(s =>
        s.origin && s.destination ? `${s.origin.value}→${s.destination.value}` : ''
    ).filter(Boolean);

    const passenger = e.passengers[0]?.fullName?.value || '';
    const date = e.segments[0]?.date?.value || '';

    if (routes.length === 0 && !e.pnr && !passenger) return [];

    return [{
        airline:       e.airline?.value || '',
        sourceLabel,
        route:         routes[0] || '',
        locator:       e.pnr?.value || '',
        ticketNumber:  e.ticketNumber?.value || '',
        passenger,
        date,
        analysis,
        opState:       analysis.state.state,
        opConfidence:  analysis.state.confidence,
    }];
}

function makeId(item: Partial<TicketItem>): string {
    return `${item.passenger || ''}-${item.route || ''}-${item.date || ''}`.toLowerCase().replace(/\s+/g, '') || `unknown-${Date.now()}`;
}

function loadTickets(): TicketItem[] {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveTickets(t: TicketItem[]) { localStorage.setItem(LS_KEY, JSON.stringify(t)); }

// ─── Component ────────────────────────────────────────────────────────────────
export default function MonitorPage() {
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [screens, setScreens] = useState<ScreenSource[]>([]);
    const [intervalSec, setIntervalSec] = useState(10);
    const [ocrStatus, setOcrStatus] = useState<'loading' | 'ready' | 'scanning'>('loading');
    const [lastScan, setLastScan] = useState<Date | null>(null);
    const [filterStage, setFilterStage] = useState<Stage | 'ALL'>('ALL');
    const [flashId, setFlashId] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);

    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const screensRef = useRef<ScreenSource[]>([]);

    // Keep ref in sync for use inside interval callback
    useEffect(() => { screensRef.current = screens; }, [screens]);

    useEffect(() => { setTickets(loadTickets()); }, []);

    // Init Tesseract
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { createWorker } = await import('tesseract.js');
                const w = await createWorker('por+eng', 1, { logger: () => {} });
                if (cancelled) { w.terminate(); return; }
                workerRef.current = w;
                setOcrStatus('ready');
            } catch (e) { console.error('[Monitor] Tesseract init:', e); }
        })();
        return () => { cancelled = true; workerRef.current?.terminate(); };
    }, []);

    const scanAll = useCallback(async () => {
        const currentScreens = screensRef.current;
        if (!workerRef.current || currentScreens.length === 0 || !canvasRef.current) return;
        setOcrStatus('scanning');

        for (const src of currentScreens) {
            const video = videoRefs.current.get(src.id);
            if (!video || video.videoWidth === 0) continue;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            ctx.drawImage(video, 0, 0);

            try {
                const { data: { text } } = await workerRef.current.recognize(canvas);
                const extracted = extractFromText(text, src.label);

                if (extracted.length > 0) {
                    setTickets(prev => {
                        let updated = [...prev];
                        let changed = false;
                        for (const item of extracted) {
                            const id = makeId(item);
                            const existing = updated.find(t => t.id === id);
                            if (existing) {
                                existing.lastSeen = Date.now();
                                if (item.locator && !existing.locator) {
                                    existing.locator = item.locator;
                                    existing.stages.emitido = true;
                                }
                                changed = true;
                            } else {
                                const newItem: TicketItem = {
                                    id,
                                    passenger:    item.passenger || '',
                                    route:        item.route || '',
                                    airline:      item.airline || '',
                                    locator:      item.locator || '',
                                    ticketNumber: item.ticketNumber || '',
                                    date:         item.date || '',
                                    sourceLabel:  item.sourceLabel || src.label,
                                    stages:       { recebido: true, emitido: !!item.locator || !!item.ticketNumber, loc_enviado: false, passagem_enviada: false },
                                    firstSeen:    Date.now(),
                                    lastSeen:     Date.now(),
                                    analysis:     item.analysis || null,
                                    opState:      item.opState || 'estado_desconhecido',
                                    opConfidence: item.opConfidence || 0,
                                };
                                updated = [newItem, ...updated];
                                setFlashId(id);
                                setTimeout(() => setFlashId(null), 2500);
                                toast.success(`Nova passagem: ${newItem.route || newItem.passenger || 'item'} (${src.label})`);
                                changed = true;
                            }
                        }
                        if (changed) { saveTickets(updated); return updated; }
                        return prev;
                    });
                }
            } catch (e) { console.error('[Monitor] OCR error:', e); }
        }

        setLastScan(new Date());
        setOcrStatus('ready');
    }, []);

    // Start/stop interval
    useEffect(() => {
        if (scanning && screens.length > 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(scanAll, intervalSec * 1000);
            setTimeout(scanAll, 800); // first scan soon
        } else {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [scanning, screens.length, intervalSec, scanAll]);

    const addScreen = async () => {
        if (screens.length >= 3) { toast.error('Máximo 3 telas simultâneas'); return; }
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 }, audio: false });
            const id = `screen-${Date.now()}`;
            const label = `Tela ${screens.length + 1}`;
            stream.getVideoTracks()[0].addEventListener('ended', () => removeScreen(id));
            const newSrc: ScreenSource = { id, label, stream };

            setScreens(prev => {
                const updated = [...prev, newSrc];
                screensRef.current = updated;
                return updated;
            });

            // Attach to video after next render
            requestAnimationFrame(() => {
                const video = videoRefs.current.get(id);
                if (video) { video.srcObject = stream; video.play().catch(() => {}); }
            });

            setScanning(true);
            toast.success(`${label} adicionada`);
        } catch (e: any) {
            if (e.name !== 'NotAllowedError') toast.error('Erro: ' + e.message);
        }
    };

    const removeScreen = (id: string) => {
        setScreens(prev => {
            const src = prev.find(s => s.id === id);
            src?.stream.getTracks().forEach(t => t.stop());
            const updated = prev.filter(s => s.id !== id).map((s, i) => ({ ...s, label: `Tela ${i + 1}` }));
            screensRef.current = updated;
            if (updated.length === 0) setScanning(false);
            return updated;
        });
        videoRefs.current.delete(id);
    };

    const stopAll = () => {
        screens.forEach(s => s.stream.getTracks().forEach(t => t.stop()));
        videoRefs.current.clear();
        setScreens([]);
        screensRef.current = [];
        setScanning(false);
    };

    const toggleStage = (id: string, stage: Stage) => {
        setTickets(prev => {
            const updated = prev.map(t => {
                if (t.id !== id) return t;
                const idx = STAGE_ORDER.indexOf(stage);
                const newStages = { ...t.stages };
                newStages[stage] = !t.stages[stage];
                if (newStages[stage]) STAGE_ORDER.slice(0, idx).forEach(s => { newStages[s] = true; });
                return { ...t, stages: newStages };
            });
            saveTickets(updated);
            return updated;
        });
    };

    const removeTicket = (id: string) => {
        setTickets(prev => { const u = prev.filter(t => t.id !== id); saveTickets(u); return u; });
    };

    const updateField = (id: string, field: keyof Pick<TicketItem,'passenger'|'route'|'airline'|'locator'|'ticketNumber'|'date'>, value: string) => {
        setTickets(prev => { const u = prev.map(t => t.id === id ? { ...t, [field]: value } : t); saveTickets(u); return u; });
    };

    const addManual = () => {
        const id = `manual-${Date.now()}`;
        const item: TicketItem = {
            id, passenger: '', route: '', airline: '', locator: '', ticketNumber: '', date: '', sourceLabel: 'Manual',
            stages: { recebido: true, emitido: false, loc_enviado: false, passagem_enviada: false },
            firstSeen: Date.now(), lastSeen: Date.now(),
            analysis: null, opState: 'pedido_recebido', opConfidence: 0,
        };
        setTickets(prev => { const u = [item, ...prev]; saveTickets(u); return u; });
    };

    const currentStage = (t: TicketItem): Stage => {
        for (let i = STAGE_ORDER.length - 1; i >= 0; i--) if (t.stages[STAGE_ORDER[i]]) return STAGE_ORDER[i];
        return 'recebido';
    };

    const filtered = filterStage === 'ALL' ? tickets : tickets.filter(t => currentStage(t) === filterStage);
    const counts = STAGE_ORDER.reduce((acc, s) => ({ ...acc, [s]: tickets.filter(t => currentStage(t) === s).length }), {} as Record<Stage, number>);
    const isActive = scanning && screens.length > 0;

    return (
        <div className="min-h-screen bg-[#0e0e0e] text-white pt-32 pb-10 px-6 max-w-[1400px] mx-auto">
            <canvas ref={canvasRef} className="hidden" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20')} />
                        Monitor de Tela
                    </h1>
                    <p className="text-white/30 text-[10px] font-mono mt-0.5">
                        OCR sem IA · Tesseract.js · {screens.length} tela(s) ativa(s)
                        {lastScan && ` · último scan ${lastScan.toLocaleTimeString('pt-BR')}`}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={intervalSec}
                        onChange={e => setIntervalSec(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 px-2.5 py-1.5"
                    >
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                        <option value={60}>60s</option>
                    </select>

                    <button
                        onClick={addScreen}
                        disabled={ocrStatus === 'loading' || screens.length >= 3}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 disabled:opacity-30 text-white/70 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                    >
                        <span className="material-symbols-outlined text-[14px]">add_to_queue</span>
                        Adicionar Tela {screens.length > 0 && `(${screens.length}/3)`}
                    </button>

                    {screens.length > 0 && (
                        <button
                            onClick={stopAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-red-500/20"
                        >
                            <span className="material-symbols-outlined text-[14px]">stop_circle</span>
                            Parar Tudo
                        </button>
                    )}

                    {ocrStatus === 'loading' && (
                        <span className="text-[10px] text-white/30 font-mono animate-pulse">carregando OCR...</span>
                    )}
                    {ocrStatus === 'scanning' && (
                        <span className="text-[10px] text-emerald-400 font-mono animate-pulse">escaneando...</span>
                    )}
                </div>
            </div>

            {/* Screen previews */}
            {screens.length > 0 && (
                <div className={cn("grid gap-3 mb-6", screens.length === 1 ? 'grid-cols-1 max-w-sm' : screens.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                    {screens.map(src => (
                        <div key={src.id} className="relative bg-black rounded-xl overflow-hidden border border-white/10 aspect-video group">
                            <video
                                ref={el => { if (el) { videoRefs.current.set(src.id, el); el.srcObject = src.stream; el.play().catch(() => {}); } }}
                                className="w-full h-full object-contain"
                                muted playsInline
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{src.label}</span>
                                <button
                                    onClick={() => removeScreen(src.id)}
                                    className="w-6 h-6 bg-red-500/30 hover:bg-red-500/60 text-red-300 rounded-full flex items-center justify-center transition-all"
                                >
                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                </button>
                            </div>
                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[9px] text-white/70 font-mono">{src.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state: no screens */}
            {screens.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 mb-6 border border-dashed border-white/10 rounded-2xl">
                    <span className="material-symbols-outlined text-[48px] text-white/10 mb-3">monitor</span>
                    <p className="text-white/30 text-[12px] font-mono mb-4">Nenhuma tela monitorada</p>
                    <button
                        onClick={addScreen}
                        disabled={ocrStatus === 'loading'}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-black text-[12px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 border border-emerald-500/20"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_to_queue</span>
                        {ocrStatus === 'loading' ? 'Carregando OCR...' : 'Iniciar Monitoramento'}
                    </button>
                    <p className="text-white/20 text-[10px] font-mono mt-3">Você pode adicionar até 3 telas simultaneamente</p>
                </div>
            )}

            {/* Main layout: filter sidebar + ticket list */}
            <div className="grid grid-cols-[200px_1fr] gap-5">
                {/* Filter sidebar */}
                <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1 mb-1">Filtrar por estágio</p>
                    <button
                        onClick={() => setFilterStage('ALL')}
                        className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-black transition-all",
                            filterStage === 'ALL' ? 'bg-white/10 text-white' : 'bg-white/[0.02] text-white/40 hover:bg-white/[0.05]'
                        )}
                    >
                        <span>Todos</span>
                        <span className="font-mono">{tickets.length}</span>
                    </button>
                    {STAGE_ORDER.map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStage(filterStage === s ? 'ALL' : s)}
                            className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-black transition-all border",
                                filterStage === s ? STAGE_COLORS[s].badge : 'bg-white/[0.02] text-white/40 hover:bg-white/[0.05] border-transparent'
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", STAGE_COLORS[s].dot)} />
                                <span>{STAGE_LABELS[s]}</span>
                            </div>
                            <span className="font-mono">{counts[s]}</span>
                        </button>
                    ))}

                    <div className="mt-3 flex flex-col gap-1.5">
                        <button
                            onClick={addManual}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <span className="material-symbols-outlined text-[13px]">add</span>
                            Adicionar Manual
                        </button>
                        {tickets.length > 0 && (
                            <button
                                onClick={() => { setTickets([]); saveTickets([]); }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-red-500/10 text-white/20 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                                Limpar Tudo
                            </button>
                        )}
                    </div>
                </div>

                {/* Ticket list */}
                <div className="flex flex-col gap-2.5">
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-white/20">
                            <span className="material-symbols-outlined text-[40px] mb-2">airplane_ticket</span>
                            <p className="text-[11px] font-mono">
                                {tickets.length === 0 ? 'Nenhuma passagem detectada ainda' : 'Nenhuma passagem neste estágio'}
                            </p>
                        </div>
                    )}

                    {filtered.map(ticket => {
                        const stage = currentStage(ticket);
                        const isNew = flashId === ticket.id;

                        return (
                            <div
                                key={ticket.id}
                                className={cn(
                                    "rounded-xl border transition-all",
                                    isNew ? 'border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.1)]' : 'border-white/[0.06]',
                                    ticket.stages.passagem_enviada && 'opacity-40'
                                )}
                            >
                                {/* Progress bar */}
                                <div className="flex h-[3px] rounded-t-xl overflow-hidden">
                                    {STAGE_ORDER.map(s => (
                                        <div key={s} className={cn("flex-1 transition-all", ticket.stages[s] ? STAGE_COLORS[s].bar : 'bg-white/5')} />
                                    ))}
                                </div>

                                <div className="flex flex-col">
                                    {/* Op State badge */}
                                    {ticket.opState !== 'estado_desconhecido' && (
                                        <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                                            <span className={cn("material-symbols-outlined text-[13px]", STATE_META[ticket.opState].color)}>
                                                {STATE_META[ticket.opState].icon}
                                            </span>
                                            <span className={cn("text-[9px] font-black uppercase tracking-widest", STATE_META[ticket.opState].color)}>
                                                {STATE_META[ticket.opState].label}
                                            </span>
                                            <span className="text-[9px] text-white/20 font-mono ml-auto">
                                                {Math.round(ticket.opConfidence * 100)}% conf.
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 px-4 py-2.5">
                                        {/* Source badge */}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 shrink-0 w-12 text-center">{ticket.sourceLabel}</span>

                                        {/* Passenger */}
                                        <input
                                            value={ticket.passenger}
                                            onChange={e => updateField(ticket.id, 'passenger', e.target.value)}
                                            placeholder="Passageiro"
                                            className="bg-transparent text-white font-black text-[12px] uppercase tracking-wide placeholder:text-white/15 outline-none w-[140px] shrink-0"
                                        />

                                        {/* Route */}
                                        <input
                                            value={ticket.route}
                                            onChange={e => updateField(ticket.id, 'route', e.target.value)}
                                            placeholder="GRU→JFK"
                                            className="bg-transparent text-white/50 font-mono text-[11px] placeholder:text-white/15 outline-none w-[80px] shrink-0"
                                        />

                                        {/* Airline */}
                                        {ticket.airline && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/8 text-white/40 shrink-0">{ticket.airline}</span>
                                        )}

                                        {/* Date */}
                                        {ticket.date && <span className="text-white/25 font-mono text-[10px] shrink-0">{ticket.date}</span>}

                                        {/* PNR */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {ticket.locator ? (
                                                <>
                                                    <span className="font-mono font-black text-amber-400 text-[12px]">{ticket.locator}</span>
                                                    <button onClick={() => { navigator.clipboard.writeText(ticket.locator); toast.success('Copiado!'); }} className="text-white/20 hover:text-white/60 transition-colors">
                                                        <span className="material-symbols-outlined text-[11px]">content_copy</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <input
                                                    value={ticket.locator}
                                                    onChange={e => {
                                                        const v = e.target.value.toUpperCase();
                                                        updateField(ticket.id, 'locator', v);
                                                        if (v.length === 6) toggleStage(ticket.id, 'emitido');
                                                    }}
                                                    placeholder="PNR"
                                                    className="bg-transparent text-amber-400/60 font-mono text-[11px] placeholder:text-white/15 outline-none w-[80px]"
                                                />
                                            )}
                                        </div>

                                        {/* Ticket Number */}
                                        {ticket.ticketNumber ? (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="material-symbols-outlined text-[11px] text-emerald-400">confirmation_number</span>
                                                <span className="font-mono text-emerald-400 text-[11px] font-black">{ticket.ticketNumber}</span>
                                                <button onClick={() => { navigator.clipboard.writeText(ticket.ticketNumber); toast.success('Ticket copiado!'); }} className="text-white/20 hover:text-white/60 transition-colors">
                                                    <span className="material-symbols-outlined text-[11px]">content_copy</span>
                                                </button>
                                            </div>
                                        ) : null}

                                        {/* Stage toggles */}
                                        <div className="flex items-center gap-1 ml-auto shrink-0">
                                            {STAGE_ORDER.map((s, idx) => (
                                                <button
                                                    key={s}
                                                    onClick={() => toggleStage(ticket.id, s)}
                                                    title={STAGE_LABELS[s]}
                                                    className={cn(
                                                        "w-6 h-6 rounded-md border text-[10px] font-black flex items-center justify-center transition-all",
                                                        ticket.stages[s] ? STAGE_COLORS[s].badge : 'border-white/10 bg-white/[0.02] text-white/20 hover:border-white/20'
                                                    )}
                                                >
                                                    {idx + 1}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => removeTicket(ticket.id)}
                                                className="w-6 h-6 ml-1 rounded-md border border-white/5 text-white/20 hover:text-red-400 hover:border-red-400/20 flex items-center justify-center transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Ambiguidades / campos ausentes */}
                                    {ticket.analysis?.state.ambiguities.length ? (
                                        <div className="px-4 pb-2 flex flex-wrap gap-1">
                                            {ticket.analysis.state.ambiguities.map((a, i) => (
                                                <span key={i} className="text-[9px] text-orange-400/70 font-mono bg-orange-400/5 px-2 py-0.5 rounded-full">⚠ {a}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
