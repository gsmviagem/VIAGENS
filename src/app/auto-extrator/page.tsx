'use client';

import React from 'react';
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
    PlayCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const mockLogs = [
    { id: 1, time: '10:45:02', level: 'info', message: '[AZUL] Sessão iniciada. Buscando dados da data 2026-03-09' },
    { id: 2, time: '10:45:15', level: 'success', message: '[AZUL] Capturadas 3 novas emissões.' },
    { id: 3, time: '08:30:00', level: 'error', message: '[SMILES] Erro de autenticação. Sessão expirou (2FA Requerido).' },
    { id: 4, time: '08:15:22', level: 'info', message: '[LATAM] Sincronização finalizada sem novidades.' },
]

export default function AutoExtratorPage() {
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
                    <Button variant="outline" className="glass-panel border-white/10 text-slate-300 hover:bg-white/5">
                        <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
                    </Button>
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
                                    <Button variant="outline" className="flex-1 h-9 text-[10px] font-black uppercase tracking-tighter glass-panel border-white/10 text-slate-400 hover:text-white">
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

            <DashboardCard
                title="System Console Log"
                icon={<TerminalIcon className="w-5 h-5" />}
                accentColor="primary"
                className="max-w-full"
                headerExtra={<Activity className="text-primary w-4 h-4 animate-pulse" />}
            >
                <div className="bg-black/40 rounded-xl p-6 font-mono text-sm leading-relaxed border border-white/5 overflow-hidden">
                    <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[300px]">
                        {mockLogs.map(log => (
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
                        <div className="flex items-center gap-2 text-slate-500 italic">
                            <span className="animate-bounce">...</span> Capturing packet from server node-brazil-1
                        </div>
                    </div>
                </div>
            </DashboardCard>
        </div>
    )
}
