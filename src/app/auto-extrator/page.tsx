'use client';

import React, { useState, useEffect } from 'react';
import {
    Cpu,
    Terminal as TerminalIcon,
    Play,
    Pause,
    RefreshCw,
    KeyRound,
    CheckCircle2,
    XCircle,
    Zap,
    Activity,
    PlayCircle,
    UserPlus,
    Shield,
    Trash2,
    MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";

function DashboardCard({
    title,
    icon,
    children,
    accentColor,
    headerExtra,
    className = ''
}: {
    title: string,
    icon: React.ReactNode,
    children: React.ReactNode,
    accentColor: string,
    headerExtra?: React.ReactNode,
    className?: string
}) {
    const accentClass = accentColor === 'primary' ? 'text-primary border-primary/20 bg-primary/10' :
        accentColor === 'accent-blue' ? 'text-accent-blue border-accent-blue/20 bg-accent-blue/10' :
            accentColor === 'green' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                'text-slate-400 border-white/10 bg-white/5';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "glass-panel rounded-2xl p-6 flex flex-col gap-6 border border-white/5 relative overflow-hidden group",
                className
            )}
        >
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", accentClass)}>
                        {icon}
                    </div>
                    <h3 className="font-bold text-lg text-white">{title}</h3>
                </div>
                {headerExtra}
            </div>
            <div className="flex-1 flex flex-col relative z-10">
                {children}
            </div>
        </motion.div>
    );
}

const mockRobots = [
    { id: '1', name: 'Azul Extractor', airline: 'Azul', status: 'running', lastRun: '10 min atrás', sessionsStatus: 'valid' },
    { id: '2', name: 'Smiles Extractor', airline: 'Smiles', status: 'paused', lastRun: '2 horas atrás', sessionsStatus: 'expired' },
    { id: '3', name: 'LATAM Extractor', airline: 'LATAM', status: 'idle', lastRun: '5 min atrás', sessionsStatus: 'valid' },
]

export default function AutoExtratorPage() {
    const supabase = createClient();
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newAccount, setNewAccount] = useState({
        cpf: '',
        password: '',
        description: ''
    });

    // Logs state
    const [logs, setLogs] = useState<any[]>([
        { id: 1, time: '10:45:02', level: 'info', message: '[SYSTEM] Hub iniciado. Pronto para comandos.' }
    ]);

    useEffect(() => {
        fetchAccounts();

        // Setup initial integration if not exists
        ensureAzulIntegration();
    }, []);

    async function ensureAzulIntegration() {
        await supabase.from('airline_integrations').upsert({ airline: 'Azul' }, { onConflict: 'airline' });
    }

    async function fetchAccounts() {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('airline_accounts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching accounts:', error);
        } else {
            setAccounts(data || []);
        }
        setIsLoading(false);
    }

    async function handleAddAccount() {
        if (!newAccount.cpf || !newAccount.password) {
            toast.error("Preencha CPF e Senha");
            return;
        }

        // Get integration id for Azul
        const { data: intData } = await supabase.from('airline_integrations').select('id').eq('airline', 'Azul').single();

        if (!intData) return;

        const { error } = await supabase.from('airline_accounts').insert({
            integration_id: intData.id,
            login_cpf: newAccount.cpf,
            password: newAccount.password,
            description: newAccount.description,
            is_active: true
        });

        if (error) {
            toast.error("Erro ao salvar conta: " + error.message);
        } else {
            toast.success("Conta adicionada ao Vault");
            setNewAccount({ cpf: '', password: '', description: '' });
            setIsAddAccountOpen(false);
            fetchAccounts();
            addLog('info', `[VAULT] Nova conta de extração adicionada: ${newAccount.cpf}`);
        }
    }

    async function handleDeleteAccount(id: string) {
        const { error } = await supabase.from('airline_accounts').delete().eq('id', id);
        if (error) {
            toast.error("Erro ao remover");
        } else {
            toast.success("Conta removida");
            fetchAccounts();
        }
    }

    function addLog(level: string, message: string) {
        setLogs(prev => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), level, message },
            ...prev.slice(0, 19)
        ]);
    }

    const runSync = async (airline: string) => {
        if (accounts.length === 0) {
            toast.error("Nenhuma conta cadastrada no Vault");
            return;
        }

        addLog('info', `[${airline.toUpperCase()}] Iniciando sincronização forçada...`);

        try {
            const res = await fetch('/api/sync/azul', {
                method: 'POST',
                body: JSON.stringify({
                    cpf: accounts[0].login_cpf,
                    password: accounts[0].password,
                    accountId: accounts[0].id
                })
            });
            const data = await res.json();

            if (res.ok) {
                addLog('success', `[${airline.toUpperCase()}] Sincronização concluída: ${data.message}`);
                toast.success(data.message);
            } else {
                addLog('error', `[${airline.toUpperCase()}] Falha: ${data.error}`);
                toast.error(data.error);
            }
        } catch (err) {
            addLog('error', `[${airline.toUpperCase()}] Erro de conexão com o terminal.`);
        }
    }

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Auto-Extrator <span className="text-primary font-normal">Command</span></h1>
                    <p className="text-slate-400 max-w-xl">Gerencie os conectores das companhias e acompanhe as rotinas de captura autônoma.</p>
                </div>
                <div className="flex gap-3">
                    <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                        <DialogTrigger
                            render={
                                <Button className="bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10">
                                    <UserPlus className="mr-2 h-4 w-4 text-primary" /> Adicionar Conta
                                </Button>
                            }
                        />
                        <DialogContent className="glass-panel-heavy border-white/10 text-white sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">Register <span className="text-primary">Extraction Node</span></DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Insira as credenciais de acesso para automatizar a captura de dados desta companhia.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Companhia</Label>
                                    <Input value="Azul" disabled className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">CPF / Matrícula</Label>
                                    <Input
                                        placeholder="000.000.000-00"
                                        className="bg-white/5 border-white/10 text-white focus-visible:ring-primary"
                                        value={newAccount.cpf}
                                        onChange={e => setNewAccount({ ...newAccount, cpf: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Senha de Acesso</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        className="bg-white/5 border-white/10 text-white focus-visible:ring-primary"
                                        value={newAccount.password}
                                        onChange={e => setNewAccount({ ...newAccount, password: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Identificador (Opcional)</Label>
                                    <Input
                                        placeholder="Ex: Conta do Diretor"
                                        className="bg-white/5 border-white/10 text-white focus-visible:ring-primary"
                                        value={newAccount.description}
                                        onChange={e => setNewAccount({ ...newAccount, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddAccount} className="w-full bg-primary text-background-dark font-black h-12 rounded-xl">
                                    AUTHORIZE NODE
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button className="bg-primary text-background-dark font-bold hover:brightness-110">
                        <PlayCircle className="mr-2 h-4 w-4" /> Executar Todos
                    </Button>
                </div>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-3">
                {mockRobots.map(robot => (
                    <DashboardCard
                        key={robot.id}
                        title={robot.name}
                        icon={<Cpu className="w-5 h-5" />}
                        accentColor={robot.status === 'running' ? 'green' : robot.status === 'paused' ? 'primary' : 'slate'}
                        headerExtra={
                            <Badge className={cn(
                                "rounded-full px-3 py-1 border-none",
                                robot.status === 'running' ? 'bg-green-500/10 text-green-400' :
                                    robot.status === 'paused' ? 'bg-primary/10 text-primary' :
                                        'bg-slate-500/10 text-slate-400'
                            )}>
                                {robot.status === 'running' ? 'Active' : robot.status === 'paused' ? 'Paused' : 'Idle'}
                            </Badge>
                        }
                    >
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-xs font-semibold text-slate-400">Auth Session</span>
                                {robot.sessionsStatus === 'valid' ? (
                                    <span className="flex items-center text-green-400 text-xs font-bold gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> VALID
                                    </span>
                                ) : (
                                    <span className="flex items-center text-primary text-xs font-bold gap-1.5">
                                        <XCircle className="w-4 h-4" /> 2FA REQ
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last Sync</span>
                                <span className="text-xs text-slate-300 font-medium">{robot.lastRun}</span>
                            </div>

                            <div className="flex gap-2 pt-4 mt-auto">
                                {robot.sessionsStatus === 'expired' ? (
                                    <Button className="flex-1 h-9 text-[10px] font-black uppercase tracking-tighter bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 shadow-none">
                                        <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Validate SMS
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-9 text-[10px] font-black uppercase tracking-tighter glass-panel border-white/10 text-slate-400 hover:text-white"
                                        onClick={() => runSync(robot.airline)}
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Force Sync
                                    </Button>
                                )}
                                <Button className="flex-1 h-9 text-[10px] font-black uppercase tracking-tighter bg-white/5 border border-white/10 text-white hover:bg-white/10">
                                    {robot.status === 'paused' ? <Play className="w-3.5 h-3.5 mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
                                    {robot.status === 'paused' ? 'Resume' : 'Pause'}
                                </Button>
                            </div>
                        </div>
                    </DashboardCard>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <DashboardCard
                    title="Vault Accounts"
                    icon={<Shield className="w-5 h-5" />}
                    accentColor="accent-blue"
                    headerExtra={
                        <Badge variant="outline" className="bg-accent-blue/10 text-accent-blue border-none">
                            {accounts.length} ACTIVE NODES
                        </Badge>
                    }
                >
                    <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {isLoading ? (
                            <div className="text-center py-10 text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">
                                Accessing Vault...
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 font-black text-xs uppercase tracking-widest bg-white/5 rounded-2xl border border-dashed border-white/10">
                                No accounts registered.
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {accounts.map(account => (
                                    <motion.div
                                        key={account.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center border border-accent-blue/20">
                                                <Zap size={18} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white tracking-tight">{account.description || 'Extraction Node'}</div>
                                                <div className="text-[10px] text-slate-500 font-black flex items-center gap-2">
                                                    {account.login_cpf} • ACTIVE
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-500 hover:text-red-400"
                                                onClick={() => handleDeleteAccount(account.id)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </DashboardCard>

                <DashboardCard
                    title="System Console Log"
                    icon={<TerminalIcon className="w-5 h-5" />}
                    accentColor="primary"
                    headerExtra={<Activity className="text-primary w-4 h-4 animate-pulse" />}
                >
                    <div className="bg-black/40 rounded-xl p-6 font-mono text-sm leading-relaxed border border-white/5 overflow-hidden">
                        <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[220px]">
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-4 group">
                                    <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                                    <span className={cn(
                                        "transition-colors",
                                        log.level === 'error' ? 'text-primary' :
                                            log.level === 'success' ? 'text-green-400' :
                                                'text-slate-400'
                                    )}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-center gap-2 text-slate-500 italic">
                                    <span className="animate-bounce">...</span> Capturing packet from server node-brazil-1
                                </div>
                            )}
                        </div>
                    </div>
                </DashboardCard>
            </div>
        </div>
    )
}
