'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Account {
    id: string;
    login_cpf: string;
    description: string;
    is_active: boolean;
    integration_id: string;
    password?: string;
}

interface AirlineConfig {
    id: 'azul' | 'smiles' | 'latam';
    name: string;
    color: string;
    icon: string;
    syncEndpoint?: string;
}

const AIRLINES: AirlineConfig[] = [
    { id: 'azul', name: 'Azul Viagens', color: 'sky', syncEndpoint: '/api/sync/azul', icon: '✈' },
    { id: 'smiles', name: 'Smiles (GOL)', color: 'orange', icon: '⭐' },
    { id: 'latam', name: 'LATAM Pass', color: 'red', icon: '🌎' },
];

const COLOR_MAP: Record<string, string> = {
    sky: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    red: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
};

// ─── Agent Status Card ────────────────────────────────────────────────────────
function AgentStatusCard() {
    const [state, setState] = useState<{
        running: boolean; lastSeen: string | null; ageSeconds: number | null; loading: boolean; starting: boolean;
    }>({ running: false, lastSeen: null, ageSeconds: null, loading: true, starting: false });

    const check = useCallback(async () => {
        try {
            const r = await fetch('/api/agent/status');
            const d = await r.json();
            setState(prev => ({ ...prev, ...d, loading: false }));
        } catch {
            setState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => {
        check();
        const t = setInterval(check, 15000);
        return () => clearInterval(t);
    }, [check]);

    const handleStart = async () => {
        setState(prev => ({ ...prev, starting: true }));
        const r = await fetch('/api/agent/start', { method: 'POST' });
        const d = await r.json();
        if (!r.ok) {
            toast.error(d.error ?? 'Erro ao iniciar agente');
            setState(prev => ({ ...prev, starting: false }));
            return;
        }
        toast.success('Agente iniciado — aguardando heartbeat...');
        setTimeout(() => { check(); setState(prev => ({ ...prev, starting: false })); }, 8000);
    };

    const dot = state.loading ? 'bg-slate-600' : state.running ? 'bg-green-400' : 'bg-red-400';
    const label = state.loading ? 'Verificando...' : state.running
        ? `Online · ${state.ageSeconds != null ? `${state.ageSeconds}s` : ''}` : 'Offline';

    return (
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/8 bg-white/3 gap-4">
            <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-base">smart_toy</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agente Local</span>
                <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dot, state.running && 'animate-pulse')} />
                    <span className={cn('text-xs font-mono', state.running ? 'text-green-400' : 'text-slate-500')}>{label}</span>
                </div>
            </div>
            {!state.loading && !state.running && (
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={state.starting}
                    onClick={handleStart}
                    className="h-7 px-3 text-sky-400 hover:text-sky-300 border border-sky-500/20 hover:border-sky-500/40 rounded-lg text-[10px] font-black shrink-0"
                >
                    {state.starting
                        ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                        : <><span className="material-symbols-outlined text-sm mr-1">play_arrow</span>Iniciar</>
                    }
                </Button>
            )}
        </div>
    );
}

// ─── Airline Credential Card ──────────────────────────────────────────────────
function AirlineCard({
    airline,
    accounts,
    isRunning,
    onAddAccount,
    onDeleteAccount,
    onSync,
}: {
    airline: AirlineConfig;
    accounts: Account[];
    isRunning: boolean;
    onAddAccount: (airlineId: string, cpf: string, password: string, description: string) => Promise<void>;
    onDeleteAccount: (id: string) => Promise<void>;
    onSync: (airline: AirlineConfig, accounts: Account[], full?: boolean) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [cpf, setCpf] = useState('');
    const [password, setPassword] = useState('');
    const [description, setDescription] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [adding, setAdding] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const allSelected = accounts.length > 0 && selected.size === accounts.length;
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(accounts.map(a => a.id)));

    const colorClass = COLOR_MAP[airline.color] ?? 'text-slate-400 border-white/10 bg-white/5';
    const airlineAccounts = accounts.filter(a => {
        // We'll match by a convention: we'll tag accounts externally
        return true; // All accounts for this integration are already filtered outside
    });

    const handleAdd = async () => {
        if (!cpf || !password) { toast.error('CPF e senha são obrigatórios'); return; }
        setAdding(true);
        await onAddAccount(airline.id, cpf, password, description);
        setCpf(''); setPassword(''); setDescription('');
        setShowForm(false);
        setAdding(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-5 flex flex-col gap-4 border border-white/5"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border text-lg", colorClass)}>
                        {airline.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-white">{airline.name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            {airlineAccounts.length} conta{airlineAccounts.length !== 1 ? 's' : ''} ativa{airlineAccounts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl px-3 h-8"
                    onClick={() => setShowForm(f => !f)}
                >
                    <span className="material-symbols-outlined text-sm mr-1.5">person_add</span> Add
                </Button>
            </div>

            {/* Add Account Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pt-2 pb-1">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">CPF / Login</Label>
                                <Input
                                    placeholder="000.000.000-00"
                                    className="bg-black/30 border-white/10 text-white focus-visible:ring-primary rounded-xl h-10 text-sm"
                                    value={cpf}
                                    onChange={e => setCpf(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Senha</Label>
                                <div className="relative">
                                    <Input
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="bg-black/30 border-white/10 text-white focus-visible:ring-primary rounded-xl h-10 text-sm pr-10"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        onClick={() => setShowPass(v => !v)}
                                    >
                                        <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Apelido (opcional)</Label>
                                <Input
                                    placeholder="Ex: Conta do Diretor"
                                    className="bg-black/30 border-white/10 text-white focus-visible:ring-primary rounded-xl h-10 text-sm"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <Button
                                className="w-full h-9 bg-primary text-white font-black text-xs rounded-xl"
                                onClick={handleAdd}
                                disabled={adding}
                            >
                                {adding ? <span className="material-symbols-outlined animate-spin mr-1.5 text-sm">refresh</span> : <span className="material-symbols-outlined mr-1.5 text-sm">bolt</span>}
                                SALVAR CREDENCIAIS
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Accounts List */}
            <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-0.5">
                {airlineAccounts.length === 0 ? (
                    <div className="text-center py-6 text-slate-600 border border-dashed border-white/8 rounded-xl">
                        <span className="material-symbols-outlined text-2xl mx-auto mb-2 opacity-30 block">key</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conta cadastrada</p>
                    </div>
                ) : (
                    <>
                        {/* Select-all row */}
                        <div className="flex items-center justify-between px-1 pb-1">
                            <button onClick={toggleAll} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest transition-colors">
                                <span className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    allSelected ? 'bg-primary border-primary' : 'border-white/20 bg-white/5')}>
                                    {allSelected && <span className="material-symbols-outlined text-[10px] text-white leading-none">check</span>}
                                </span>
                                {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                            </button>
                            <span className="text-[10px] text-slate-600">{selected.size} selecionada{selected.size !== 1 ? 's' : ''}</span>
                        </div>

                        {airlineAccounts.map(account => (
                            <motion.div
                                key={account.id}
                                layout
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                className={cn("flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                    selected.has(account.id)
                                        ? 'bg-primary/10 border-primary/30'
                                        : 'bg-white/5 border-white/5 hover:border-white/10'
                                )}
                                onClick={() => toggle(account.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                        selected.has(account.id) ? 'bg-primary border-primary' : 'border-white/20 bg-white/5')}>
                                        {selected.has(account.id) && <span className="material-symbols-outlined text-[10px] text-white leading-none">check</span>}
                                    </span>
                                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-black", colorClass)}>
                                        {account.login_cpf.slice(-3)}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">{account.description || 'Conta de extração'}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                            {account.login_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**')}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 rounded-lg shrink-0"
                                    onClick={e => { e.stopPropagation(); onDeleteAccount(account.id); }}
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </Button>
                            </motion.div>
                        ))}
                    </>
                )}
            </div>

            {/* Bulk sync buttons */}
            {airline.syncEndpoint && selected.size > 0 && (
                <div className="flex gap-2 pt-1">
                    <Button
                        className="flex-1 h-9 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black text-xs rounded-xl"
                        disabled={isRunning}
                        onClick={() => onSync(airline, accounts.filter(a => selected.has(a.id)), false)}
                    >
                        {isRunning
                            ? <span className="material-symbols-outlined animate-spin mr-1.5 text-sm">refresh</span>
                            : <span className="material-symbols-outlined mr-1.5 text-sm">sync</span>}
                        Sync {selected.size} selecionada{selected.size !== 1 ? 's' : ''}
                    </Button>
                    <Button
                        variant="ghost"
                        className="h-9 px-3 text-slate-500 hover:text-yellow-400 border border-white/5 hover:border-yellow-500/20 font-black text-xs rounded-xl"
                        disabled={isRunning}
                        onClick={() => onSync(airline, accounts.filter(a => selected.has(a.id)), true)}
                        title="Extrai todas as emissões ignorando a base"
                    >
                        <span className="material-symbols-outlined text-sm mr-1">download_for_offline</span> Tudo
                    </Button>
                </div>
            )}
        </motion.div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AutoExtratorPage() {
    const supabase = createClient();
    const [accountsByAirline, setAccountsByAirline] = useState<Record<string, Account[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [runningAirline, setRunningAirline] = useState<string | null>(null);
    const [logs, setLogs] = useState<{ id: number; time: string; level: string; message: string }[]>([
        { id: 1, time: new Date().toLocaleTimeString(), level: 'info', message: '[SYSTEM] Hub iniciado. Pronto para comandos.' }
    ]);

    const addLog = useCallback((level: string, message: string) => {
        setLogs(prev => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), level, message },
            ...prev.slice(0, 49)
        ]);
    }, []);

    // ─── Fetch all accounts grouped by airline ───────────────────────────────
    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        const grouped: Record<string, Account[]> = { azul: [], smiles: [], latam: [] };

        for (const airline of AIRLINES) {
            // Ensure integration row exists
            await supabase
                .from('airline_integrations')
                .upsert({ airline: airline.id }, { onConflict: 'airline' });

            // Fetch integration id
            const { data: intData } = await supabase
                .from('airline_integrations')
                .select('id')
                .eq('airline', airline.id)
                .single();

            if (!intData) continue;

            const { data: accounts } = await supabase
                .from('airline_accounts')
                .select('*')
                .eq('integration_id', intData.id)
                .order('created_at', { ascending: false });

            grouped[airline.id] = accounts ?? [];
        }

        setAccountsByAirline(grouped);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

    // ─── Add account ─────────────────────────────────────────────────────────
    const handleAddAccount = async (airlineId: string, cpf: string, password: string, description: string) => {
        const { data: intData } = await supabase
            .from('airline_integrations')
            .select('id')
            .eq('airline', airlineId)
            .single();

        if (!intData) { toast.error('Integração não encontrada'); return; }

        const { error } = await supabase.from('airline_accounts').insert({
            integration_id: intData.id,
            login_cpf: cpf,
            password,
            description,
            is_active: true
        });

        if (error) {
            toast.error('Erro ao salvar: ' + error.message);
        } else {
            toast.success('Credenciais salvas no Vault');
            addLog('info', `[VAULT] Nova conta adicionada para ${airlineId.toUpperCase()}: ${cpf}`);
            fetchAccounts();
        }
    };

    // ─── Delete account ──────────────────────────────────────────────────────
    const handleDeleteAccount = async (id: string) => {
        const { error } = await supabase.from('airline_accounts').delete().eq('id', id);
        if (error) { toast.error('Erro ao remover'); }
        else { toast.success('Conta removida'); fetchAccounts(); addLog('info', '[VAULT] Conta removida.'); }
    };

    // ─── Run sync ────────────────────────────────────────────────────────────
    const handleSync = async (airline: AirlineConfig, accountsToSync: Account[], full = false) => {
        if (!airline.syncEndpoint) {
            toast.error('Sincronia ainda não disponível para ' + airline.name);
            return;
        }

        setRunningAirline(airline.id);
        addLog('info', `[${airline.id.toUpperCase()}] Enfileirando ${accountsToSync.length} conta(s) ${full ? '(COMPLETA)' : '(incremental)'}...`);

        // Queue all selected accounts in parallel (agent handles parallel execution)
        const queued: { jobKey: string; cpf: string }[] = [];
        for (const account of accountsToSync) {
            try {
                const res = await fetch(airline.syncEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountId: account.id, full })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    addLog('error', `[${airline.id.toUpperCase()}] ${account.login_cpf}: ${data.error ?? 'Erro'}`);
                } else if (data.queued) {
                    queued.push({ jobKey: data.jobKey, cpf: account.login_cpf });
                    addLog('info', `[${airline.id.toUpperCase()}] ${account.login_cpf} enfileirado.`);
                }
            } catch {
                addLog('error', `[${airline.id.toUpperCase()}] ${account.login_cpf}: erro de conexão.`);
            }
        }

        if (queued.length === 0) { setRunningAirline(null); return; }

        addLog('info', `[${airline.id.toUpperCase()}] ${queued.length} job(s) enfileirados. Aguardando agente...`);

        // Poll all jobs until all done/error
        const pending = new Map(queued.map(q => [q.jobKey, q.cpf]));
        let totalSaved = 0;
        let attempts = 0;
        const poll = setInterval(async () => {
            attempts++;
            for (const [jobKey, cpf] of [...pending]) {
                try {
                    const sr = await fetch(`/api/sync/azul/status?jobKey=${jobKey}`);
                    const s = await sr.json();
                    if (s.status === 'done') {
                        pending.delete(jobKey);
                        totalSaved += s.count ?? 0;
                        addLog('success', `[${airline.id.toUpperCase()}] ${cpf}: ${s.count} emissões salvas.`);
                    } else if (s.status === 'error') {
                        pending.delete(jobKey);
                        addLog('error', `[${airline.id.toUpperCase()}] ${cpf}: erro na extração.`);
                    }
                } catch { /* ignore */ }
            }
            if (pending.size === 0) {
                clearInterval(poll);
                toast.success(`${totalSaved} emissões salvas no total.`);
                setRunningAirline(null);
            } else if (attempts > 120) {
                clearInterval(poll);
                addLog('error', `[${airline.id.toUpperCase()}] Timeout — ${pending.size} job(s) não responderam.`);
                toast.error('Timeout na extração.');
                setRunningAirline(null);
            }
        }, 5000);
    };

    return (
        <div className="space-y-8 w-full h-full overflow-hidden flex flex-col">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0"
            >
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Auto-Extrator Command
                    </h1>
                    <p className="text-white/70 max-w-xl font-bold">
                        Gerencie credenciais das companhias e execute extrações automáticas de emissões.
                    </p>
                </div>
                {runningAirline && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 py-2 px-4 rounded-xl flex items-center gap-2 font-bold animate-pulse">
                        <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                        Extraindo {runningAirline.toUpperCase()}...
                    </Badge>
                )}
            </motion.div>

            {/* Agent Status */}
            <AgentStatusCard />

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 min-h-0">
                {/* Credential Cards — one per airline */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-sm">shield</span>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Vault de Credenciais</h2>
                    </div>
                    {isLoading ? (
                        <div className="grid md:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="glass-panel rounded-2xl p-5 h-40 animate-pulse opacity-30" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-4">
                            {AIRLINES.map(airline => (
                                <AirlineCard
                                    key={airline.id}
                                    airline={airline}
                                    accounts={accountsByAirline[airline.id] ?? []}
                                    isRunning={runningAirline === airline.id}
                                    onAddAccount={handleAddAccount}
                                    onDeleteAccount={handleDeleteAccount}
                                    onSync={handleSync}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Export Excel */}
                <div className="flex items-center gap-3">
                    <a
                        href="/api/export/azul"
                        download
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-bold text-sm transition-all"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Baixar Excel — Emissões
                    </a>
                    <span className="text-xs text-slate-500">Exporta todas as emissões salvas no banco de dados</span>
                </div>

                {/* Extraction Info Banner */}
                <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3">
                    <span className="material-symbols-outlined text-sky-400 text-xl mt-0.5 shrink-0">info</span>
                    <div>
                        <p className="text-sm font-bold text-sky-400">Como funciona a extração automática</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Clique em <strong>Sync</strong> — o hub enfileira o job. O <strong>agente local</strong> (rodando em background) faz o login, captura as emissões e salva no banco. Instale o agente uma vez com <code className="bg-white/10 px-1 rounded">scripts\azul-agent-install.bat</code>.
                        </p>
                    </div>
                </div>

                {/* Console Log */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-2xl p-5 border border-white/5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm text-primary">terminal</span>
                            </div>
                            <h3 className="font-bold text-white">System Console</h3>
                        </div>
                        <span className="material-symbols-outlined text-primary text-sm animate-pulse">monitoring</span>
                    </div>
                    <div className="bg-black/60 rounded-xl p-4 font-mono text-xs leading-relaxed border border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                        <AnimatePresence initial={false}>
                            {logs.map(log => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex gap-3"
                                >
                                    <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                                    <span className={cn(
                                        log.level === 'error' ? 'text-blue-400' :
                                            log.level === 'success' ? 'text-green-400' :
                                                'text-slate-400'
                                    )}>
                                        {log.message}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
