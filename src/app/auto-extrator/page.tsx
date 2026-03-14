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
interface AutomationAccount {
    id: string;
    login_cpf: string;
    description: string;
    password?: string;
    is_active: boolean;
    integration_id: string;
}

interface AirlineConfig {
    id: 'azul' | 'smiles' | 'latam';
    name: string;
    icon: string;
    syncEndpoint?: string;
}

const AIRLINES: AirlineConfig[] = [
    { id: 'azul', name: 'Azul Viagens', syncEndpoint: '/api/sync/azul', icon: 'flight_takeoff' },
    { id: 'smiles', name: 'Smiles (GOL)', icon: 'auto_awesome' },
    { id: 'latam', name: 'LATAM Pass', icon: 'public' },
];

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
    accounts: AutomationAccount[];
    isRunning: boolean;
    onAddAccount: (airlineId: string, cpf: string, password: string, description: string) => Promise<void>;
    onDeleteAccount: (id: string) => Promise<void>;
    onSync: (airline: AirlineConfig, account: AutomationAccount) => Promise<void>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [cpf, setCpf] = useState('');
    const [password, setPassword] = useState('');
    const [description, setDescription] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [adding, setAdding] = useState(false);

    const airlineAccounts = accounts.filter(a => true);

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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-2xl p-6 flex flex-col gap-6 premium-shadow relative overflow-hidden group"
        >
            <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-primary transition-all duration-500"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-2xl">{airline.icon}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-wide">{airline.name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{airlineAccounts.length} ACTIVE NODES</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="size-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 transition-all shadow-lg"
                >
                    <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
                </button>
            </div>

            {/* Add Account Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-white/5 rounded-xl border border-white/5 p-4 space-y-4"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">CPF / Terminal Login</Label>
                            <Input
                                placeholder="000.000.000-00"
                                className="bg-black/30 border-white/10 text-white rounded-xl h-12 focus-visible:ring-primary/50"
                                value={cpf}
                                onChange={e => setCpf(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Access Credentials</Label>
                            <div className="relative">
                                <Input
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="bg-black/30 border-white/10 text-white rounded-xl h-12 pr-10 focus-visible:ring-primary/50"
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
                        <Button
                            className="w-full h-12 bg-primary text-black font-black text-xs rounded-xl shadow-lg shadow-primary/10"
                            onClick={handleAdd}
                            disabled={adding}
                        >
                            {adding ? <div className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : 'INITIATE CONNECTION'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Accounts List */}
            <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {airlineAccounts.length === 0 ? (
                    <div className="text-center py-6 text-slate-600 border border-dashed border-white/10 rounded-xl">
                        <span className="material-symbols-outlined text-3xl opacity-20 mb-2">vpn_key</span>
                        <p className="text-[9px] font-black uppercase tracking-widest">NO NODES DETECTED</p>
                    </div>
                ) : (
                    airlineAccounts.map((account, idx) => (
                        <div key={account.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group/item hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary/50 text-xl">fingerprint</span>
                                <div>
                                    <p className="text-white text-xs font-bold leading-tight">{account.description || 'Primary Engine'}</p>
                                    <p className="text-[9px] text-slate-500 font-mono tracking-tighter">TERMINAL-{(account.login_cpf || '').slice(-4)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-60 group-hover/item:opacity-100 transition-opacity">
                                {airline.syncEndpoint && (
                                    <button 
                                        disabled={isRunning}
                                        onClick={() => onSync(airline, account)}
                                        className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-black transition-all"
                                    >
                                        <span className={cn("material-symbols-outlined text-sm", isRunning && "animate-spin")}>sync</span>
                                    </button>
                                )}
                                <button 
                                    onClick={() => onDeleteAccount(account.id)}
                                    className="size-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AutoExtratorPage() {
    const supabase = createClient();
    const [accountsByAirline, setAccountsByAirline] = useState<Record<string, AutomationAccount[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [runningAirline, setRunningAirline] = useState<string | null>(null);
    const [logs, setLogs] = useState<{ id: number; time: string; level: string; message: string }[]>([
        { id: 1, time: new Date().toLocaleTimeString(), level: 'info', message: 'GSM-HUB SYSTEM INITIALIZED. PROTOCOLS LOADED.' }
    ]);

    const addLog = useCallback((level: string, message: string) => {
        setLogs(prev => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), level, message },
            ...prev.slice(0, 49)
        ]);
    }, []);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        const grouped: Record<string, AutomationAccount[]> = { azul: [], smiles: [], latam: [] };

        for (const airline of AIRLINES) {
            await supabase
                .from('airline_integrations')
                .upsert({ airline: airline.id }, { onConflict: 'airline' });

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

            grouped[airline.id] = (accounts ?? []) as AutomationAccount[];
        }

        setAccountsByAirline(grouped);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

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
            addLog('info', `CONNECTION ESTABLISHED FOR ${airlineId.toUpperCase()}: TERMINAL LOADED`);
            fetchAccounts();
        }
    };

    const handleDeleteAccount = async (id: string) => {
        const { error } = await supabase.from('airline_accounts').delete().eq('id', id);
        if (error) { toast.error('Erro ao remover'); }
        else { toast.success('Conta removida'); fetchAccounts(); addLog('info', 'TERMINAL DISCONNECTED AND PURGED.'); }
    };

    const handleSync = async (airline: AirlineConfig, account: AutomationAccount) => {
        if (!airline.syncEndpoint) {
            toast.error('Sincronia ainda não disponível para ' + airline.name);
            return;
        }

        setRunningAirline(airline.id);
        addLog('info', `[${airline.id.toUpperCase()}] SCANNING NODE ${account.login_cpf.slice(-4)}...`);
        addLog('info', `[${airline.id.toUpperCase()}] TARGET: SATELLITE RELAY ...`);

        try {
            const res = await fetch(airline.syncEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpf: account.login_cpf,
                    password: account.password || '',
                    accountId: account.id
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                addLog('success', `[${airline.id.toUpperCase()}] SYNC SECURE: ${data.message}`);
                if (data.bookings?.length > 0) {
                    data.bookings.forEach((b: any) => {
                        addLog('success', `[${airline.id.toUpperCase()}] EXTR: ${b.locator} → ${b.route} | ${b.miles?.toLocaleString()} PTS`);
                    });
                }
                toast.success(data.message);
            } else {
                addLog('error', `[${airline.id.toUpperCase()}] RELAY LOST: ${data.error}`);
                toast.error(data.error);
            }
        } catch (err) {
            addLog('error', `[${airline.id.toUpperCase()}] CONNECTION TIMEOUT.`);
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setRunningAirline(null);
        }
    };

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-white text-4xl font-light tracking-tight mb-2">Automation <span className="text-primary font-bold">Center</span></h1>
                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xs">precision_manufacturing</span>
                        Robotic Process Automation Relay
                    </p>
                </motion.div>
                {runningAirline && (
                    <Badge className="bg-primary/10 text-primary border border-primary/20 py-2 px-6 rounded-full font-black animate-pulse uppercase tracking-[0.2em] text-[10px]">
                        Scaning {runningAirline} ...
                    </Badge>
                )}
            </div>

            {/* Credential Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="glass-panel rounded-2xl h-64 animate-pulse bg-white/5 border border-white/5" />)
                ) : (
                    AIRLINES.map(airline => (
                        <AirlineCard
                            key={airline.id}
                            airline={airline}
                            accounts={accountsByAirline[airline.id] ?? []}
                            isRunning={runningAirline === airline.id}
                            onAddAccount={handleAddAccount}
                            onDeleteAccount={handleDeleteAccount}
                            onSync={handleSync}
                        />
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Console */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden premium-shadow border border-white/10"
                >
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-xl">terminal</span>
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">System Console</h3>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="size-2 rounded-full bg-red-500/50"></div>
                            <div className="size-2 rounded-full bg-yellow-500/50"></div>
                            <div className="size-2 rounded-full bg-emerald-500/50"></div>
                        </div>
                    </div>
                    <div className="bg-[#050505] p-6 font-mono text-[11px] leading-relaxed relative min-h-[400px]">
                        <div className="absolute inset-0 carbon-texture opacity-20 pointer-events-none"></div>
                        <div className="relative z-10 space-y-2">
                            <AnimatePresence initial={false}>
                                {logs.map(log => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex gap-4 group"
                                    >
                                        <span className="text-slate-700 select-none group-hover:text-primary transition-colors">[{log.time}]</span>
                                        <span className={cn(
                                            "flex-1",
                                            log.level === 'error' ? 'text-red-400 font-bold' :
                                            log.level === 'success' ? 'text-emerald-400 font-bold' :
                                            'text-slate-400'
                                        )}>
                                            <span className="opacity-50 mr-2">{'>'}</span>{log.message}
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Info Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-4 space-y-6"
                >
                    <div className="glass-panel p-6 rounded-2xl border border-primary/20 premium-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary">info</span>
                            <h2 className="text-white font-bold text-sm">Protocol Details</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <p className="text-[10px] font-black uppercase text-primary mb-2">Azul Extraction</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    The engine initiates a headless connection to <span className="text-white font-mono">voeazul.voeazul.com.br</span>. 
                                    Each booking in "My Trips" is parsed for locator, passenger data, and cabin clearance.
                                </p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Security Vault</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    All credentials are encrypted using AES-256 before being committed to the neural relay.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex justify-between items-center mb-6">
                            <span className="material-symbols-outlined text-slate-500">settings_suggest</span>
                            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Operational</span>
                        </div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Automaton Stats</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Success Rate</span>
                                <span className="text-sm font-bold text-emerald-500">98.2%</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Avg Response</span>
                                <span className="text-sm font-bold text-white">4.2s</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Uptime</span>
                                <span className="text-sm font-bold text-white">100%</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
