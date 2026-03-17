"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FornecedoresPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sheets/supplier');
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                toast.error(json.error || "Erro ao buscar dados");
            }
        } catch (error) {
            toast.error("Erro na conexão com o servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</div>
                <p className="text-slate-400 font-medium animate-pulse">Sincronizando com Google Sheets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
                        <span className="material-symbols-outlined text-primary text-3xl font-bold">handshake</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase">Supplier Dashboard</h1>
                        <p className="text-slate-400 font-medium font-mono text-sm tracking-widest">
                            {data?.headline?.startDate} → {data?.headline?.endDate} | {data?.headline?.mainSupplier}
                        </p>
                    </div>
                </div>
                <Button 
                    onClick={fetchData}
                    className="bg-primary hover:brightness-110 text-black font-black text-xs h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-sm mr-2">sync</span> ATUALIZAR DADOS
                </Button>
            </div>

            {/* Metrics Overview */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -z-10 group-hover:bg-primary/10 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-primary uppercase tracking-tighter">Total em Emissões</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tracking-tighter drop-shadow-lg">
                            {data?.summary?.totalValue}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Consolidado Fornecedor principal</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-amber-400 uppercase tracking-tighter">Créditos Ativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-200 tracking-tighter">
                            {data?.suppliers?.[0]?.credit || "R$ 0,00"}
                        </div>
                        <Badge variant="outline" className="mt-2 border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px]">VERIFICAÇÃO PENDENTE</Badge>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-tighter">Status de Sincronia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-green-400 font-bold text-xl gap-2">
                            <span className="material-symbols-outlined">check_circle</span>
                            LIVE CONNECTED
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase">Google Sheets: SUPPLIER TAB</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Suppliers List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-xl">list_alt</span>
                        <h2 className="font-bold text-white uppercase tracking-widest text-sm">Resumo Fornecedores</h2>
                    </div>
                    <div className="glass-panel p-2 border-white/5 bg-white/[0.02]">
                        <div className="space-y-1">
                            {data?.suppliers?.map((s: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "flex flex-col p-4 rounded-xl border transition-all cursor-default",
                                        s.highlight 
                                            ? "bg-primary/10 border-primary/30 shadow-lg shadow-black/50" 
                                            : "bg-transparent border-white/5 hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={cn("text-xs font-black uppercase text-slate-300", s.highlight && "text-white")}>
                                            {s.name}
                                        </span>
                                        {s.highlight && <Badge className="bg-primary text-black text-[9px] font-black h-4 px-1">FOCUS</Badge>}
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-500 uppercase">Crédito</span>
                                        <span className="text-slate-300 font-bold">{s.credit}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-black mt-1">
                                        <span className="text-slate-500 uppercase">Total</span>
                                        <span className={cn("text-slate-200", s.highlight && "text-primary")}>{s.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Ledger Table */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">payments</span>
                            <h2 className="font-bold text-white uppercase tracking-widest text-sm">Registro de Emissões</h2>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-slate-500">REAL-TIME FEED</Badge>
                    </div>
                    
                    <div className="glass-panel border-white/5 bg-white/[0.01] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
                                        <th className="px-6 py-4 font-black">Data</th>
                                        <th className="px-6 py-4 font-black">LOC</th>
                                        <th className="px-6 py-4 font-black">Produto</th>
                                        <th className="px-6 py-4 font-black">Milhas</th>
                                        <th className="px-6 py-4 font-black text-right">Total</th>
                                        <th className="px-6 py-4 font-black text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-medium">
                                    {data?.ledger?.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-6 py-4 text-slate-400 font-mono">{row.date}</td>
                                            <td className="px-6 py-4 text-white font-black group-hover:text-primary transition-colors">{row.loc}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 bg-slate-800/30">
                                                    {row.product}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-300">{row.miles}k</td>
                                            <td className="px-6 py-4 text-right text-primary font-black uppercase text-[13px]">{row.total}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge 
                                                    className={cn(
                                                        "text-[9px] font-black uppercase h-5",
                                                        row.issueStatus === 'PENDENTE' 
                                                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" 
                                                            : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                                    )}
                                                >
                                                    {row.issueStatus}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
