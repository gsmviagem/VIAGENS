"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function PlanilhaPage() {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        toast.loading("Sincronizando com Google Sheets...", { id: "sync-sheets" });

        try {
            const response = await fetch('/api/sync/sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Sincronizado! ${data.count} itens enviados.`, { id: "sync-sheets" });
            } else {
                toast.error(data.error || "Erro ao sincronizar", { id: "sync-sheets" });
            }
        } catch (error) {
            toast.error("Falha na comunicação com o servidor", { id: "sync-sheets" });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Sincronização com Planilha</h1>
                    <p className="text-slate-400 mt-1">Integração bidirecional com Google Sheets para gestão financeira.</p>
                </div>
                <Button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="bg-primary hover:brightness-110 text-black font-black text-xs h-10 px-6 rounded-xl shadow-lg disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-sm mr-2 ${isSyncing ? 'animate-spin' : ''}`}>
                        {isSyncing ? 'refresh' : 'sync'}
                    </span> 
                    {isSyncing ? 'Sincronizando...' : 'Enviar Pendentes Agora'}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Status da Conexão</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-green-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">
                            <span className="material-symbols-outlined mr-2">check_circle</span> Ativa
                        </div>
                        <p className="text-xs text-slate-500 mt-2 bg-slate-950/50 inline-block px-2 py-1 rounded border border-slate-800">Autenticado via Service Account</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Última Sincronização</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-slate-200">Hoje, 10:45</div>
                        <p className="text-xs text-slate-500 mt-2 bg-slate-950/50 inline-block px-2 py-1 rounded border border-slate-800">12 linhas inseridas com sucesso</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Pendências</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-amber-400 flex items-center gap-2">
                           <span className="material-symbols-outlined text-amber-400">pending_actions</span> 4 Emissões
                        </div>
                        <p className="text-xs text-slate-500 mt-2 bg-slate-950/50 inline-block px-2 py-1 rounded border border-slate-800">Aguardando lote das 11:00</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden">
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-slate-400">Falhas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex items-center text-slate-300 font-bold text-xl">
                            <span className="material-symbols-outlined mr-2 text-slate-500">error</span> 0
                        </div>
                        <p className="text-xs text-slate-500 mt-2 bg-slate-950/50 inline-block px-2 py-1 rounded border border-slate-800">Sincronização 100% estável</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-[#0b101e] border-slate-800 shadow-xl overflow-hidden mt-6">
                <CardHeader className="bg-slate-900/80 border-b border-slate-800 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-300 flex items-center text-sm font-mono tracking-wide">
                            <span className="material-symbols-outlined text-green-500 mr-3">table_view</span>
                            Histórico de Sincronização
                        </CardTitle>
                        <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 hidden sm:inline-flex">Google Sheets ID: 1aB2...xYz</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 sm:p-6 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-800/60 rounded-lg bg-slate-950/50 text-sm hover:border-slate-700 transition-colors">
                            <div className="flex flex-col gap-1.5 mb-2 sm:mb-0">
                                <span className="font-semibold text-slate-200">Lote de Envio Automático #8492</span>
                                <span className="text-xs text-slate-500 flex items-center"><span className="material-symbols-outlined text-[12px] mr-1">schedule</span> 10:45:00 - 09 Mar 2026</span>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1.5">
                                <span className="text-green-400 font-medium flex items-center"><span className="material-symbols-outlined text-sm mr-1.5">check_circle</span> Sucesso (12 linhas inseridas)</span>
                                <span className="text-xs text-slate-500 font-mono">Duração: 1.2s</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-800/60 rounded-lg bg-slate-950/50 text-sm hover:border-slate-700 transition-colors">
                            <div className="flex flex-col gap-1.5 mb-2 sm:mb-0">
                                <span className="font-semibold text-slate-200">Lote de Envio Automático #8491</span>
                                <span className="text-xs text-slate-500 flex items-center"><span className="material-symbols-outlined text-[12px] mr-1">schedule</span> 10:40:00 - 09 Mar 2026</span>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1.5">
                                <span className="text-green-400 font-medium flex items-center"><span className="material-symbols-outlined text-sm mr-1.5">check_circle</span> Sucesso (3 linhas inseridas)</span>
                                <span className="text-xs text-slate-500 font-mono">Duração: 0.8s</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-800/60 rounded-lg bg-slate-950/30 text-sm opacity-70">
                            <div className="flex flex-col gap-1.5 mb-2 sm:mb-0">
                                <span className="font-semibold text-slate-200">Lote de Envio Automático #8490</span>
                                <span className="text-xs text-slate-500 flex items-center"><span className="material-symbols-outlined text-[12px] mr-1">schedule</span> 10:35:00 - 09 Mar 2026</span>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1.5">
                                <span className="text-slate-400 font-medium flex items-center">Ignorado (Sem novos dados)</span>
                                <span className="text-xs text-slate-500 font-mono">Duração: 0.3s</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
