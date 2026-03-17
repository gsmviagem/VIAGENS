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
        <div className="space-y-4 pb-4">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-black/10 rounded-2xl border border-black/10 backdrop-blur-md">
                        <span className="material-symbols-outlined text-black text-2xl font-bold">handshake</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-black uppercase leading-tight">Supplier Analytics</h1>
                        <p className="text-black/60 font-medium font-mono text-[10px] tracking-widest mt-0.5">
                            Análise Nativa de Saídas & Créditos
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1.5rem] shadow-2xl">
                <CardContent className="px-4 py-3">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/70 uppercase tracking-widest pl-1">Data Início</label>
                            <Input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-black/30 border-white/5 text-white fill-white rounded-xl h-9 text-xs" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/70 uppercase tracking-widest pl-1">Data Final</label>
                            <Input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-black/30 border-white/5 text-white rounded-xl h-9 text-xs" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/70 uppercase tracking-widest pl-1">Fornecedor</label>
                            <Select value={supplier} onValueChange={(val) => setSupplier(val || "TODOS")}>
                                <SelectTrigger className="bg-black/30 border-white/5 text-white rounded-xl h-9 text-xs">
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
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/70 uppercase tracking-widest pl-1">Buscar LOC</label>
                            <Input 
                                type="text" 
                                placeholder="Ex: ABC123"
                                value={locator}
                                onChange={(e) => setLocator(e.target.value)}
                                className="bg-black/30 border-white/5 text-white uppercase placeholder:normal-case placeholder:text-white/30 rounded-xl h-9 text-xs" 
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 pb-0.5 justify-center">
                                <input 
                                    type="checkbox"
                                    id="pendingOnly" 
                                    checked={pendingOnly}
                                    onChange={(e) => setPendingOnly(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded-sm border-black text-black focus:ring-black bg-white/20"
                                />
                                <label 
                                    htmlFor="pendingOnly" 
                                    className="text-[9px] font-black text-white uppercase tracking-widest leading-none cursor-pointer"
                                >
                                    SOMENTE PENDENTES
                                </label>
                            </div>
                            <Button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black hover:bg-black/80 text-white font-black text-[10px] h-9 rounded-xl shadow-lg transition-all"
                            >
                                <span className={`material-symbols-outlined text-[11px] mr-1.5 ${loading ? 'animate-spin' : ''}`}>
                                    {loading ? 'refresh' : 'filter_list'}
                                </span> 
                                Aplicar Filtros
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Metrics Overview */}
            <div className="grid gap-3 md:grid-cols-2">
                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1.5rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -z-10 group-hover:bg-white/10 transition-all"></div>
                    <CardHeader className="pb-0 pt-3 px-5">
                        <CardTitle className="text-[9px] font-black text-white/60 uppercase tracking-widest">Total Filtrado nas Saídas</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-3">
                        <div className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                            {data?.summary?.totalValue}
                            {loading && <span className="material-symbols-outlined text-sm animate-spin text-white">refresh</span>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1.5rem] shadow-xl">
                    <CardHeader className="pb-0 pt-3 px-5">
                        <CardTitle className="text-[9px] font-black text-white/60 uppercase tracking-widest">Créditos Ativos</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-3">
                        <div className="text-2xl font-black text-white tracking-tighter">
                            {data?.suppliers?.length} <span className="text-sm text-white/50 font-medium">Fornecedores Vinculados</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
                {/* Suppliers List */}
                <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center gap-1.5 mb-0.5 px-2">
                        <span className="material-symbols-outlined text-black text-lg">account_balance_wallet</span>
                        <h2 className="font-bold text-black uppercase tracking-widest text-xs">Créditos e Saldos</h2>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-1.5 rounded-[1.5rem] shadow-2xl">
                        <div className="space-y-1.5 min-h-[300px] max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                            {data?.suppliers?.length === 0 ? (
                                <div className="p-4 text-center text-white/50 text-[10px] font-mono mt-10">Nenhum fornecedor registrado.</div>
                            ) : null}
                            
                            {data?.suppliers?.map((s: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "flex flex-col p-3 rounded-2xl border transition-all cursor-pointer",
                                        supplier === s.name
                                            ? "bg-white/20 border-white/30 shadow-lg" 
                                            : "bg-black/10 border-white/5 hover:bg-black/30"
                                    )}
                                    onClick={() => setSupplier(s.name)}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={cn("text-[10px] font-black uppercase tracking-wide", supplier === s.name ? "text-white" : "text-white/80")}>
                                            {s.name}
                                        </span>
                                        <Badge className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm", 
                                            s.saldoType === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                                            s.saldoType === 'NEGATIVE' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'
                                        )}>
                                            {s.saldoType === 'POSITIVE' ? 'CRÉDITO' : s.saldoType === 'NEGATIVE' ? 'DÍVIDA' : 'ZERADO'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                                        <div className="bg-black/20 p-1.5 rounded-xl flex flex-col items-center">
                                            <span className="text-[8px] text-white/40 uppercase font-black mb-0.5">Pago (OK)</span>
                                            <span className="text-emerald-400 font-bold leading-none">{s.creditOk}</span>
                                        </div>
                                        <div className="bg-black/20 p-1.5 rounded-xl flex flex-col items-center">
                                            <span className="text-[8px] text-white/40 uppercase font-black mb-0.5">Devendo</span>
                                            <span className="text-red-400 font-bold leading-none">{s.debt}</span>
                                        </div>
                                    </div>
                                    <div className="mt-1.5 text-center bg-white/5 border border-white/10 p-1.5 rounded-xl flex justify-between items-center px-3">
                                        <span className="text-[8px] text-white/60 uppercase font-black">Saldo Líquido</span>
                                        <span className="text-white font-black text-[11px] leading-none">{s.saldoType === 'NEGATIVE' ? '-' : ''}{s.saldo}</span>
                                    </div>
                                    {(s.creditPending && s.creditPending !== 'R$ 0,00') && (
                                        <div className="mt-1.5 text-center text-[8px] text-amber-200/60 uppercase font-black">
                                            + {s.creditPending} pendente
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Ledger Table and Text Generators */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    {/* Generative Texts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-3 shadow-2xl flex flex-col">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[9px] uppercase font-black text-white/60 tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[11px]">subject</span> Mensagem Detalhada
                                </span>
                                <Button size="sm" variant="ghost" className="h-5 px-2 text-[9px] text-white/50 hover:text-white hover:bg-white/10 rounded-full" onClick={() => copyToClipboard(data?.generated?.full)}>
                                    <span className="material-symbols-outlined text-[10px] mr-1">content_copy</span> COPIAR
                                </Button>
                            </div>
                            <textarea 
                                readOnly 
                                value={data?.generated?.full || ''} 
                                className="w-full flex-grow min-h-[85px] h-[85px] bg-black/40 border-none rounded-xl text-white/80 text-[9px] font-mono p-2.5 focus:outline-none resize-none custom-scrollbar leading-tight"
                                placeholder="..."
                            ></textarea>
                        </div>
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-3 shadow-2xl flex flex-col">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[9px] uppercase font-black text-white/60 tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[11px]">short_text</span> Resumo
                                </span>
                                <Button size="sm" variant="ghost" className="h-5 px-2 text-[9px] text-white/50 hover:text-white hover:bg-white/10 rounded-full" onClick={() => copyToClipboard(data?.generated?.summary)}>
                                    <span className="material-symbols-outlined text-[10px] mr-1">content_copy</span> COPIAR
                                </Button>
                            </div>
                            <textarea 
                                readOnly 
                                value={data?.generated?.summary || ''} 
                                className="w-full flex-grow min-h-[85px] h-[85px] bg-black/40 border-none rounded-xl text-white/80 text-[9px] font-mono p-2.5 focus:outline-none resize-none custom-scrollbar leading-tight"
                                placeholder="..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="flex-grow flex flex-col space-y-2">
                        <div className="flex items-center justify-between gap-2 px-2">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-black text-lg">payments</span>
                                <h2 className="font-bold text-black uppercase tracking-widest text-xs">Registros Encontrados</h2>
                            </div>
                            <Badge className="bg-black text-white hover:bg-black/80 font-black px-2.5 py-0.5 rounded-full text-[9px]">
                                {data?.ledger?.length || 0} SAÍDAS
                            </Badge>
                        </div>
                        
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl flex-grow">
                            <div className="overflow-x-auto min-h-[250px] max-h-[380px] custom-scrollbar">
                                <table className="w-full text-left text-[10px]">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest text-white/50 bg-black/30 sticky top-0 z-10 backdrop-blur-md">
                                            <th className="px-4 py-3 font-black">Data</th>
                                            <th className="px-4 py-3 font-black">LOC</th>
                                            <th className="px-4 py-3 font-black">Fornecedor</th>
                                            <th className="px-4 py-3 font-black text-right">Total</th>
                                            <th className="px-4 py-3 font-black text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-medium">
                                        {data?.ledger?.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-4 py-2.5 text-white/60 font-mono whitespace-nowrap">{row.date}</td>
                                                <td className="px-4 py-2.5 text-white font-black group-hover:text-amber-200 transition-colors whitespace-nowrap">{row.loc}</td>
                                                <td className="px-4 py-2.5 text-white/80 text-[9px] uppercase max-w-[150px] truncate" title={row.supplier}>{row.supplier || row.product}</td>
                                                <td className="px-4 py-2.5 text-right text-white font-black whitespace-nowrap">{row.total !== '0' && row.total !== '' ? `R$ ${row.total}` : '-'}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <Badge 
                                                        className={cn(
                                                            "text-[8px] font-black uppercase h-4 rounded-full px-2",
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
                                                <td colSpan={5} className="text-center py-10 text-white/30 font-mono text-[10px]">Ajuste os filtros para encontrar saídas.</td>
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
