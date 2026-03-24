"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FinancialsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [startDate, setStartDate] = useState("2025-01-01");
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesman, setSalesman] = useState("TODOS");
    const [product, setProduct] = useState("TODOS");
    const [route, setRoute] = useState("");

    const [uniqueSalesmen, setUniqueSalesmen] = useState<string[]>([]);
    const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
    const [lastSync, setLastSync] = useState<string>('');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                startDate,
                endDate,
                salesman: salesman === "TODOS" ? "" : salesman,
                product: product === "TODOS" ? "" : product,
                route
            };

            const res = await fetch('/api/sheets/base', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (json.success) {
                setData(json.data);
                setError(null);
                setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                if (uniqueSalesmen.length === 0 && json.data.options) {
                    setUniqueSalesmen(json.data.options.salesmen || []);
                    setUniqueProducts(json.data.options.products || []);
                }
            } else {
                const errMsg = json.error || "Erro ao buscar dados do Financeiro";
                setError(errMsg);
                toast.error(errMsg);
            }
        } catch (err: any) {
            const errMsg = "Erro na conexão com o servidor. Verifique sua internet e tente novamente.";
            setError(errMsg);
            toast.error(errMsg);
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

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="material-symbols-outlined text-white text-6xl animate-spin">leaderboard</div>
                <p className="text-white/60 font-medium animate-pulse">Processando Dados Financeiros da BASE...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="material-symbols-outlined text-red-400 text-6xl">cloud_off</div>
                <div className="text-center space-y-2">
                    <p className="text-white font-bold text-lg">Falha na Sincronização</p>
                    <p className="text-white/50 text-sm max-w-md">{error}</p>
                </div>
                <Button 
                    onClick={fetchData}
                    className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 font-black text-xs h-10 px-8 rounded-lg shadow-lg transition-all"
                >
                    <span className="material-symbols-outlined text-sm mr-2">refresh</span>
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-4">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 rounded-xl border border-emerald-500/30 backdrop-blur-md">
                        <span className="material-symbols-outlined text-emerald-400 text-2xl font-bold">query_stats</span>
                    </div>
                    <div className="leading-tight">
                        <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase flex items-center gap-2">
                            Dashboard Financials 
                            <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none font-mono tracking-widest text-[9px]">2025+</Badge>
                        </h1>
                        <p className="text-white/60 font-medium font-mono text-[11px] tracking-widest mt-0.5">
                            Real-time Analytics da Aba BASE
                            {lastSync && <span className="ml-3 text-emerald-400/80">● Sync {lastSync}</span>}
                            {error && <span className="ml-3 text-red-400/80">● Erro</span>}
                        </p>
                    </div>
                </div>
                <Button 
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 font-black text-[10px] h-9 px-5 rounded-lg shadow-lg transition-all uppercase tracking-widest disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-sm mr-1.5 ${loading ? 'animate-spin' : ''}`}>
                        {loading ? 'refresh' : 'sync'}
                    </span>
                    {loading ? 'Syncing...' : 'Sync'}
                </Button>
            </div>

            {/* Filtros */}
            <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-2xl">
                <CardContent className="px-4 py-3">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                        <div className="space-y-1 w-full">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Data Início</label>
                            <Input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-black/30 border-white/5 text-white fill-white rounded-lg h-9 text-xs w-full" 
                            />
                        </div>
                        <div className="space-y-1 w-full">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Data Final</label>
                            <Input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-black/30 border-white/5 text-white fill-white rounded-lg h-9 text-xs w-full" 
                            />
                        </div>
                        <div className="space-y-1 w-full">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Vendedor</label>
                            <Select value={salesman} onValueChange={(val) => setSalesman(val || "TODOS")}>
                                <SelectTrigger className="bg-black/30 border-white/5 text-white rounded-lg h-9 text-xs w-full">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 border-white/10 text-white rounded-lg backdrop-blur-3xl max-h-60">
                                    <SelectItem value="TODOS">TODOS</SelectItem>
                                    {uniqueSalesmen.filter(Boolean).map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 w-full">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Produto</label>
                            <Select value={product} onValueChange={(val) => setProduct(val || "TODOS")}>
                                <SelectTrigger className="bg-black/30 border-white/5 text-white rounded-lg h-9 text-xs w-full">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 border-white/10 text-white rounded-lg backdrop-blur-3xl">
                                    <SelectItem value="TODOS">TODOS</SelectItem>
                                    {uniqueProducts.filter(Boolean).map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 w-full">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Rota</label>
                            <Input 
                                type="text" 
                                placeholder="Ex: GRU-MIA"
                                value={route}
                                onChange={(e) => setRoute(e.target.value)}
                                className="bg-black/30 border-white/5 text-white uppercase placeholder:normal-case placeholder:text-white/30 rounded-lg h-9 text-xs w-full" 
                            />
                        </div>
                        <div className="w-full flex flex-col justify-end space-y-1">
                            <label className="text-[10px] font-black text-white/70 uppercase tracking-widest text-center hidden md:block">&nbsp;</label>
                            <Button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 font-black text-xs h-9 rounded-lg shadow-lg transition-all"
                            >
                                <span className={`material-symbols-outlined text-sm mr-1.5 ${loading ? 'animate-spin' : ''}`}>
                                    {loading ? 'refresh' : 'filter_list'}
                                </span> 
                                Aplicar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* KPIs Principais (4 cards grandes) */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-all"></div>
                    <CardHeader className="pb-0 pt-3 px-5 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Revenue</CardTitle>
                        <span className="material-symbols-outlined text-emerald-400 text-lg opacity-80">account_balance</span>
                    </CardHeader>
                    <CardContent className="px-5 pb-3 pt-1">
                        <div className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                            {data?.summary?.totalRevenue || "$0.00"}
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Volume Total (US$)</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -z-10 group-hover:bg-blue-500/10 transition-all"></div>
                    <CardHeader className="pb-0 pt-3 px-5 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Client Paid</CardTitle>
                        <span className="material-symbols-outlined text-blue-400 text-lg opacity-80">payments</span>
                    </CardHeader>
                    <CardContent className="px-5 pb-3 pt-1">
                        <div className="text-2xl font-black text-white tracking-tighter">
                            {data?.summary?.totalClientPaid || "$0.00"}
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Total Pago (US$)</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -z-10 group-hover:bg-amber-500/10 transition-all"></div>
                    <CardHeader className="pb-0 pt-3 px-5 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Vendas</CardTitle>
                        <span className="material-symbols-outlined text-amber-400 text-lg opacity-80">shopping_cart</span>
                    </CardHeader>
                    <CardContent className="px-5 pb-3 pt-1">
                        <div className="text-2xl font-black text-white tracking-tighter">
                            {data?.summary?.totalSales || 0} <span className="text-sm text-white/40 font-medium tracking-normal">Locs</span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Total de Emissões</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -z-10 group-hover:bg-purple-500/10 transition-all"></div>
                    <CardHeader className="pb-0 pt-3 px-5 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Milhas Usadas</CardTitle>
                        <span className="material-symbols-outlined text-purple-400 text-lg opacity-80">flight_takeoff</span>
                    </CardHeader>
                    <CardContent className="px-5 pb-3 pt-1">
                        <div className="text-2xl font-black text-white tracking-tighter">
                            {data?.summary?.totalMiles || 0}k
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Custo: {data?.summary?.avgPricePerMile}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sub-KPIs (Taxas, Passageiros, Ticket Médio) */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="bg-black/10 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] uppercase font-black text-white/50 tracking-widest mb-1">Ticket Médio</span>
                    <span className="text-lg font-bold text-white/90">{data?.summary?.avgTicket || "$0.00"}</span>
                </div>
                <div className="bg-black/10 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] uppercase font-black text-white/50 tracking-widest mb-1">Taxas Arrecadadas (R$)</span>
                    <span className="text-lg font-bold text-white/90">{data?.summary?.totalTaxBrl || "R$ 0,00"}</span>
                </div>
                <div className="bg-black/10 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] uppercase font-black text-white/50 tracking-widest mb-1">Total Passageiros</span>
                    <span className="text-lg font-bold text-white/90">{data?.summary?.totalPax || 0} pax</span>
                </div>
                <div className="bg-black/10 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] uppercase font-black text-white/50 tracking-widest mb-1">Média Pax/Venda</span>
                    <span className="text-lg font-bold text-white/90">{data?.summary?.avgPaxPerSale || "0"}</span>
                </div>
            </div>

            {/* Tabelas de Análise Profunda */}
            <div className="grid gap-4 lg:grid-cols-12">
                
                {/* Ranking de Vendedores (Main Focus) */}
                <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center gap-1.5 mb-0.5 px-2">
                        <span className="material-symbols-outlined text-white text-base">military_tech</span>
                        <h2 className="font-bold text-white uppercase tracking-widest text-xs">Ranking de Consultores</h2>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-2 rounded-[1rem] shadow-2xl h-[400px] overflow-hidden flex flex-col">
                        <div className="space-y-2 overflow-y-auto pr-1 flex-grow custom-scrollbar">
                            {data?.salesmen?.length === 0 ? (
                                <div className="p-4 text-center text-white/50 text-xs font-mono mt-4">Nenhum vendedor encontrado.</div>
                            ) : null}
                            
                            {data?.salesmen?.map((s: any, idx: number) => (
                                <div key={idx} className="bg-black/30 border border-white/5 p-2.5 rounded-xl flex flex-col relative overflow-hidden">
                                    {idx === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-400/20 to-transparent -z-10 rounded-tr-xl"></div>}
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                                idx === 0 ? "bg-amber-400 text-black" : 
                                                idx === 1 ? "bg-slate-300 text-black" : 
                                                idx === 2 ? "bg-amber-700 text-white" : "bg-white/10 text-white/50"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <span className="text-xs font-black uppercase text-white tracking-wide">{s.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-emerald-400 leading-none">{s.revenue}</div>
                                            <div className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Revenue</div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div className="bg-white/5 rounded-md p-1.5 flex flex-col text-center">
                                            <span className="text-[9px] text-white/50 font-black uppercase mb-0.5">Vendas</span>
                                            <span className="text-xs text-white font-mono">{s.sales}</span>
                                        </div>
                                        <div className="bg-white/5 rounded-md p-1.5 flex flex-col text-center">
                                            <span className="text-[9px] text-white/50 font-black uppercase mb-0.5">Ticket</span>
                                            <span className="text-xs text-white font-mono">{s.ticket}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Receita Mensal e Performance por Produto */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    
                    {/* Linha superior: Mensal e Produtos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[180px]">
                        {/* Mensal */}
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] p-3 shadow-2xl flex flex-col">
                            <h2 className="font-bold text-white uppercase tracking-widest text-[11px] mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">calendar_month</span> Evolução Mensal
                            </h2>
                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] uppercase text-white/50 sticky top-0 bg-black/40 backdrop-blur-md">
                                            <th className="py-1.5">Mês/Ano</th>
                                            <th className="py-1.5">Vendas</th>
                                            <th className="py-1.5 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data?.monthly?.map((m: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="py-1.5 text-white/80 font-mono text-[10px]">{m.mesAno}</td>
                                                <td className="py-1.5 text-white/80">{m.sales}</td>
                                                <td className="py-1.5 text-emerald-400 font-bold text-right">{m.revenue}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Produtos */}
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] p-3 shadow-2xl flex flex-col">
                            <h2 className="font-bold text-white uppercase tracking-widest text-[11px] mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">inventory_2</span> Performance Produto (Cias)
                            </h2>
                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] uppercase text-white/50 sticky top-0 bg-black/40 backdrop-blur-md">
                                            <th className="py-1.5">Programa</th>
                                            <th className="py-1.5">Miles (k)</th>
                                            <th className="py-1.5 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data?.products?.slice(0,10).map((p: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="py-1.5 text-white/80 font-bold uppercase text-[10px]">{p.name || "N/A"}</td>
                                                <td className="py-1.5 text-white/60 font-mono">{(p.milesVal || 0).toLocaleString('pt-BR')}</td>
                                                <td className="py-1.5 text-emerald-400 font-bold text-right">{p.revenue}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Últimas Vendas (Ledger) */}
                    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] shadow-2xl flex-grow flex flex-col overflow-hidden h-full max-h-[204px]">
                        <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
                            <h2 className="font-bold text-white uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">receipt_long</span> Últimas Emissões (Base)
                            </h2>
                            <Badge className="bg-white/5 text-white/50 hover:bg-white/10 font-mono px-1.5 py-0 rounded text-[9px]">
                                ÚLTIMOS {data?.ledger?.length || 0}
                            </Badge>
                        </div>
                        <div className="overflow-x-auto flex-grow custom-scrollbar">
                            <table className="w-full text-left text-[11px]">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest text-white/50 bg-black/30 sticky top-0 z-10 backdrop-blur-md">
                                        <th className="px-3 py-2 font-black">Data</th>
                                        <th className="px-3 py-2 font-black">LOC</th>
                                        <th className="px-3 py-2 font-black">Vendedor</th>
                                        <th className="px-3 py-2 font-black">Cliente</th>
                                        <th className="px-3 py-2 font-black text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-medium">
                                    {data?.ledger?.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-3 py-1.5 text-white/60 font-mono whitespace-nowrap">{row.date}</td>
                                            <td className="px-3 py-1.5 text-white font-black group-hover:text-emerald-300 transition-colors whitespace-nowrap">{row.loc}</td>
                                            <td className="px-3 py-1.5 text-white/80 text-[10px] uppercase">{row.salesman}</td>
                                            <td className="px-3 py-1.5 text-white/60 text-[10px] uppercase truncate max-w-[120px]">{row.client}</td>
                                            <td className="px-3 py-1.5 text-right text-emerald-400 font-black whitespace-nowrap">{row.revenue !== "$0.00" ? row.revenue : '-'}</td>
                                        </tr>
                                    ))}
                                    {data?.ledger?.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-6 text-white/30 font-mono text-[11px]">Sem resultados.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
