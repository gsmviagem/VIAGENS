"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FornecedoresPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [supplier, setSupplier] = useState("TODOS");
    const [locator, setLocator] = useState("");
    const [pendingOnly, setPendingOnly] = useState(false);

    const [uniqueSuppliers, setUniqueSuppliers] = useState<string[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const payload = {
                startDate,
                endDate,
                supplier: supplier === "TODOS" ? "" : supplier,
                locator,
                pendingOnly
            };

            const res = await fetch('/api/sheets/supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (json.success) {
                setData(json.data);
                if (uniqueSuppliers.length === 0 && json.data.suppliers) {
                    setUniqueSuppliers(json.data.suppliers.map((s:any) => s.name));
                }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success("Copiado para a área de transferência!");
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="material-symbols-outlined text-black text-6xl animate-spin">refresh</div>
                <p className="text-black/60 font-medium animate-pulse">Sincronizando com Base de Dados...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/10 rounded-2xl border border-black/10 backdrop-blur-md">
                        <span className="material-symbols-outlined text-black text-3xl font-bold">handshake</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-black uppercase">Supplier Analytics</h1>
                        <p className="text-black/60 font-medium font-mono text-sm tracking-widest mt-1">
                            Análise Nativa de Saídas & Créditos
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[2rem] shadow-2xl">
                <CardContent className="p-5">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Data Início</label>
                            <Input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-black/30 border-white/5 text-white fill-white rounded-xl h-11" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Data Final</label>
                            <Input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-black/30 border-white/5 text-white rounded-xl h-11" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Fornecedor</label>
                            <Select value={supplier} onValueChange={(val) => setSupplier(val || "TODOS")}>
                                <SelectTrigger className="bg-black/30 border-white/5 text-white rounded-xl h-11">
                                    <SelectValue placeholder="Todos os fornecedores" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 border-white/10 text-white rounded-xl backdrop-blur-3xl">
                                    <SelectItem value="TODOS">TODOS</SelectItem>
                                    {uniqueSuppliers.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Buscar LOC</label>
                            <Input 
                                type="text" 
                                placeholder="Ex: ABC123"
                                value={locator}
                                onChange={(e) => setLocator(e.target.value)}
                                className="bg-black/30 border-white/5 text-white uppercase placeholder:normal-case placeholder:text-white/30 rounded-xl h-11" 
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2 pb-0.5 justify-center">
                                <input 
                                    type="checkbox"
                                    id="pendingOnly" 
                                    checked={pendingOnly}
                                    onChange={(e) => setPendingOnly(e.target.checked)}
                                    className="w-4 h-4 rounded-md border-black text-black focus:ring-black bg-white/20"
                                />
                                <label 
                                    htmlFor="pendingOnly" 
                                    className="text-[10px] font-black text-white uppercase tracking-widest leading-none cursor-pointer"
                                >
                                    SOMENTE PENDENTES
                                </label>
                            </div>
                            <Button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black hover:bg-black/80 text-white font-black text-xs h-11 rounded-xl shadow-lg transition-all"
                            >
                                <span className={`material-symbols-outlined text-sm mr-2 ${loading ? 'animate-spin' : ''}`}>
                                    {loading ? 'refresh' : 'filter_list'}
                                </span> 
                                Aplicar Filtros
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Metrics Overview */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -z-10 group-hover:bg-white/10 transition-all"></div>
                    <CardHeader className="pb-1 pt-5 px-6">
                        <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Filtrado nas Saídas</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                        <div className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                            {data?.summary?.totalValue}
                            {loading && <span className="material-symbols-outlined text-sm animate-spin text-white">refresh</span>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl">
                    <CardHeader className="pb-1 pt-5 px-6">
                        <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Créditos Ativos</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                        <div className="text-3xl font-black text-white tracking-tighter">
                            {data?.suppliers?.length} <span className="text-lg text-white/50 font-medium">Fornecedores Vinculados</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Suppliers List */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1 px-2">
                        <span className="material-symbols-outlined text-black text-xl">account_balance_wallet</span>
                        <h2 className="font-bold text-black uppercase tracking-widest text-sm">Créditos e Saldos</h2>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl">
                        <div className="space-y-1.5 min-h-[500px] max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
                            {data?.suppliers?.length === 0 ? (
                                <div className="p-4 text-center text-white/50 text-xs font-mono mt-10">Nenhum fornecedor registrado.</div>
                            ) : null}
                            
                            {data?.suppliers?.map((s: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "flex flex-col p-4 rounded-3xl border transition-all cursor-pointer",
                                        supplier === s.name
                                            ? "bg-white/20 border-white/30 shadow-lg" 
                                            : "bg-black/10 border-white/5 hover:bg-black/30"
                                    )}
                                    onClick={() => setSupplier(s.name)}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={cn("text-xs font-black uppercase", supplier === s.name ? "text-white" : "text-white/80")}>
                                            {s.name}
                                        </span>
                                        <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5", 
                                            s.saldoType === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                                            s.saldoType === 'NEGATIVE' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'
                                        )}>
                                            {s.saldoType === 'POSITIVE' ? 'CRÉDITO' : s.saldoType === 'NEGATIVE' ? 'DÍVIDA' : 'ZERADO'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                        <div className="bg-black/20 p-2 rounded-xl flex flex-col items-center">
                                            <span className="text-[9px] text-white/40 uppercase font-black mb-1">Pago (OK)</span>
                                            <span className="text-emerald-400 font-bold">{s.creditOk}</span>
                                        </div>
                                        <div className="bg-black/20 p-2 rounded-xl flex flex-col items-center">
                                            <span className="text-[9px] text-white/40 uppercase font-black mb-1">Devendo</span>
                                            <span className="text-red-400 font-bold">{s.debt}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center bg-white/5 border border-white/10 p-2 rounded-xl flex justify-between items-center px-4">
                                        <span className="text-[9px] text-white/60 uppercase font-black">Saldo Líquido</span>
                                        <span className="text-white font-black text-sm">{s.saldoType === 'NEGATIVE' ? '-' : ''}{s.saldo}</span>
                                    </div>
                                    {(s.creditPending && s.creditPending !== 'R$ 0,00') && (
                                        <div className="mt-2 text-center text-[9px] text-amber-200/60 uppercase font-black">
                                            + {s.creditPending} em transações pendentes
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Ledger Table and Text Generators */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Generative Texts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-2xl flex flex-col">
                            <div className="flex justify-between items-center mb-3 px-2">
                                <span className="text-[10px] uppercase font-black text-white/60 tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">subject</span> Mensagem Detalhada
                                </span>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/50 hover:text-white hover:bg-white/10 rounded-full" onClick={() => copyToClipboard(data?.generated?.full)}>
                                    <span className="material-symbols-outlined text-xs mr-1">content_copy</span> COPIAR
                                </Button>
                            </div>
                            <textarea 
                                readOnly 
                                value={data?.generated?.full || ''} 
                                className="w-full flex-grow min-h-[140px] bg-black/40 border-none rounded-2xl text-white/80 text-[10px] font-mono p-3 focus:outline-none resize-none custom-scrollbar"
                                placeholder="Nenhum dado filtrado para gerar mensagem..."
                            ></textarea>
                        </div>
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-2xl flex flex-col">
                            <div className="flex justify-between items-center mb-3 px-2">
                                <span className="text-[10px] uppercase font-black text-white/60 tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">short_text</span> Resumo
                                </span>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/50 hover:text-white hover:bg-white/10 rounded-full" onClick={() => copyToClipboard(data?.generated?.summary)}>
                                    <span className="material-symbols-outlined text-xs mr-1">content_copy</span> COPIAR
                                </Button>
                            </div>
                            <textarea 
                                readOnly 
                                value={data?.generated?.summary || ''} 
                                className="w-full flex-grow min-h-[140px] bg-black/40 border-none rounded-2xl text-white/80 text-[10px] font-mono p-3 focus:outline-none resize-none custom-scrollbar"
                                placeholder="Nenhum dado filtrado..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="flex-grow flex flex-col space-y-2">
                        <div className="flex items-center justify-between gap-2 px-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-black text-xl">payments</span>
                                <h2 className="font-bold text-black uppercase tracking-widest text-sm">Registros Encontrados</h2>
                            </div>
                            <Badge className="bg-black text-white hover:bg-black/80 font-black px-3 rounded-full">
                                {data?.ledger?.length || 0} SAÍDAS
                            </Badge>
                        </div>
                        
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex-grow">
                            <div className="overflow-x-auto min-h-[300px] max-h-[480px] custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/50 bg-black/30 sticky top-0 z-10 backdrop-blur-md">
                                            <th className="px-5 py-4 font-black">Data</th>
                                            <th className="px-5 py-4 font-black">LOC</th>
                                            <th className="px-5 py-4 font-black">Fornecedor</th>
                                            <th className="px-5 py-4 font-black text-right">Total</th>
                                            <th className="px-5 py-4 font-black text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-medium">
                                        {data?.ledger?.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-5 py-3 text-white/60 font-mono whitespace-nowrap">{row.date}</td>
                                                <td className="px-5 py-3 text-white font-black group-hover:text-amber-200 transition-colors whitespace-nowrap">{row.loc}</td>
                                                <td className="px-5 py-3 text-white/80 text-[10px] uppercase max-w-[150px] truncate" title={row.supplier}>{row.supplier || row.product}</td>
                                                <td className="px-5 py-3 text-right text-white font-black whitespace-nowrap">{row.total !== '0' && row.total !== '' ? `R$ ${row.total}` : '-'}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <Badge 
                                                        className={cn(
                                                            "text-[9px] font-black uppercase h-5 rounded-full px-2",
                                                            row.issueStatus === 'PENDENTE' 
                                                                ? "bg-amber-500 text-black border-none" 
                                                                : "bg-emerald-500 text-black border-none"
                                                        )}
                                                    >
                                                        {row.issueStatus}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                        {data?.ledger?.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-white/30 font-mono text-xs">Ajuste os filtros para encontrar saídas.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
