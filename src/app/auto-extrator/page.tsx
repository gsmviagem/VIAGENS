'use client';

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
    red: 'text-red-400 border-red-500/30 bg-red-500/10',
};

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
    onSync: (airline: AirlineConfig, account: Account) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [cpf, setCpf] = useState('');
    const [password, setPassword] = useState('');
    const [description, setDescription] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [adding, setAdding] = useState(false);

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
                                className="w-full h-9 bg-primary text-black font-black text-xs rounded-xl"
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
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-0.5">
                {airlineAccounts.length === 0 ? (
                    <div className="text-center py-6 text-slate-600 border border-dashed border-white/8 rounded-xl">
                        <span className="material-symbols-outlined text-2xl mx-auto mb-2 opacity-30 block">key</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conta cadastrada</p>
                    </div>
                ) : (
                    airlineAccounts.map(account => (
                        <motion.div
                            key={account.id}
                            layout
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all"
                        >
                            <div className="flex items-center gap-3">
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
                            <div className="flex items-center gap-1.5">
                                {airline.syncEndpoint && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isRunning}
                                        onClick={() => onSync(airline, account)}
                                        className="h-7 px-2 text-slate-400 hover:text-primary border border-white/5 hover:border-primary/20 rounded-lg text-[10px] font-black"
                                    >
                                        {isRunning
                                            ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                            : <><span className="material-symbols-outlined text-sm mr-1">sync</span> Sync</>
                                        }
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 rounded-lg"
                                    onClick={() => onDeleteAccount(account.id)}
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </Button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
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
    const handleSync = async (airline: AirlineConfig, account: Account) => {
        if (!airline.syncEndpoint) {
            toast.error('Sincronia ainda não disponível para ' + airline.name);
            return;
        }

        setRunningAirline(airline.id);
        addLog('info', `[${airline.id.toUpperCase()}] Iniciando extração para conta ${account.login_cpf}...`);
        addLog('info', `[${airline.id.toUpperCase()}] Fazendo login em azulpelomundo.voeazul.com.br...`);

        try {
            const res = await fetch(airline.syncEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpf: account.login_cpf,
                    password: account.password ?? '',
                    accountId: account.id
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                addLog('success', `[${airline.id.toUpperCase()}] ${data.message}`);
                if (data.bookings?.length > 0) {
                    data.bookings.forEach((b: any) => {
                        addLog('success', `[${airline.id.toUpperCase()}] ✓ ${b.locator}: ${b.route} (${b.date}) — ${b.miles?.toLocaleString()} pts — ${b.cabin}`);
                    });
                }
                toast.success(data.message);
            } else {
                addLog('error', `[${airline.id.toUpperCase()}] Falha: ${data.error}`);
                toast.error(data.error);
            }
        } catch (err) {
            addLog('error', `[${airline.id.toUpperCase()}] Erro de conexão.`);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setRunningAirline(null);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        Auto-Extrator <span className="text-primary font-normal">Command</span>
                    </h1>
                    <p className="text-slate-400 max-w-xl">
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

            {/* Extraction Info Banner */}
            <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-500 text-xl mt-0.5 shrink-0">warning</span>
                <div>
                    <p className="text-sm font-bold text-yellow-400">Sobre a extração Azul</p>
                    <p className="text-xs text-slate-400 mt-1">O extrator faz login real em <strong>voeazul.com.br</strong>, navega para "Minhas Viagens", abre cada reserva e extrai todos os dados. O processo pode levar 2–5 minutos dependendo do número de emissões. Os dados são salvos automaticamente no banco de dados.</p>
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
                <div className="bg-black/60 rounded-xl p-4 font-mono text-xs leading-relaxed border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
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
                                    log.level === 'error' ? 'text-red-400' :
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
    );
}
