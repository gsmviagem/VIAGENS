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

    // Filter states corresponding to the SAÍDAS spreadsheet logic
    // B3 = startDate
    // C3 = endDate
    // D3 = supplierNome
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [supplier, setSupplier] = useState("TODOS");
    
    // C12 = locator
    const [locator, setLocator] = useState("");
    
    // D12 = pendingOnly
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

    // Initial fetch to load credits and initial state
    useEffect(() => {
        // Set default dates if needed, leaving raw for now
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
                <div className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</div>
                <p className="text-slate-400 font-medium animate-pulse">Sincronizando com SAÍDAS...</p>
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
                        <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase">Supplier Analytics</h1>
                        <p className="text-slate-400 font-medium font-mono text-sm tracking-widest mt-1">
                            Análise Nativa de Saídas & Créditos
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Controls (Mirrors Spreadsheet Header) */}
            <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
                <CardContent className="p-6">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Data Início</label>
                            <Input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-black/50 border-white/10 text-white fill-white" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Data Final</label>
                            <Input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-black/50 border-white/10 text-white" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Fornecedor</label>
                            <Select value={supplier} onValueChange={(val) => setSupplier(val || "TODOS")}>
                                <SelectTrigger className="bg-black/50 border-white/10 text-white">
                                    <SelectValue placeholder="Todos os fornecedores" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="TODOS">TODOS</SelectItem>
                                    {uniqueSuppliers.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscar LOC</label>
                            <Input 
                                type="text" 
                                placeholder="Ex: ABC123"
                                value={locator}
                                onChange={(e) => setLocator(e.target.value)}
                                className="bg-black/50 border-white/10 text-white uppercase placeholder:normal-case placeholder:text-slate-600" 
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 pb-1">
                                <input 
                                    type="checkbox"
                                    id="pendingOnly" 
                                    checked={pendingOnly}
                                    onChange={(e) => setPendingOnly(e.target.checked)}
                                    className="w-4 h-4 rounded border-primary text-primary focus:ring-primary focus:ring-offset-slate-900 bg-black/50"
                                />
                                <label 
                                    htmlFor="pendingOnly" 
                                    className="text-xs font-black text-slate-300 uppercase tracking-widest leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    SOMENTE PENDENTES
                                </label>
                            </div>
                            <Button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:brightness-110 text-black font-black text-xs h-10 rounded-lg shadow-lg"
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
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -z-10 group-hover:bg-primary/10 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-primary uppercase tracking-tighter">Total Filtrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tracking-tighter drop-shadow-lg flex items-center gap-3">
                            {data?.summary?.totalValue}
                            {loading && <span className="material-symbols-outlined text-sm animate-spin text-primary">refresh</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Soma bruta das saídas (filtro atual)</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-amber-400 uppercase tracking-tighter">Créditos Ativos Totais</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-200 tracking-tighter">
                            {data?.suppliers?.length} <span className="text-lg text-slate-500 font-medium">Fornecedores Pendentes</span>
                        </div>
                        <Badge variant="outline" className="mt-2 border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] border-none px-0">
                            CALCULADO EM TEMPO REAL DIRETAMENTE DAS SAÍDAS
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Suppliers List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-xl">list_alt</span>
                        <h2 className="font-bold text-white uppercase tracking-widest text-sm">Crédito por Fornecedor</h2>
                    </div>
                    <div className="glass-panel p-2 border-white/5 bg-white/[0.02]">
                        <div className="space-y-1 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {data?.suppliers?.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-xs font-mono">Nenhum fornecedor com crédito pendente encontrado.</div>
                            ) : null}
                            
                            {data?.suppliers?.map((s: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "flex flex-col p-4 rounded-xl border transition-all cursor-pointer hover:bg-white/5",
                                        supplier === s.name
                                            ? "bg-primary/10 border-primary/30 shadow-lg" 
                                            : "bg-transparent border-white/5"
                                    )}
                                    onClick={() => setSupplier(s.name)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={cn("text-xs font-black uppercase", supplier === s.name ? "text-primary" : "text-slate-300")}>
                                            {s.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm font-black mt-1">
                                        <span className="text-slate-500 uppercase text-[10px] mt-1">Total Pendente</span>
                                        <span className="text-slate-200">{s.credit}</span>
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
                            <h2 className="font-bold text-white uppercase tracking-widest text-sm">Registros (Filtro Atual)</h2>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-slate-500">
                            {data?.ledger?.length || 0} SAÍDAS ENCONTRADAS
                        </Badge>
                    </div>
                    
                    <div className="glass-panel border-white/5 bg-white/[0.01] overflow-hidden">
                        <div className="overflow-x-auto min-h-[600px] max-h-[600px] custom-scrollbar">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500 bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                                        <th className="px-6 py-4 font-black">Data</th>
                                        <th className="px-6 py-4 font-black">LOC</th>
                                        <th className="px-6 py-4 font-black">Fornecedor</th>
                                        <th className="px-6 py-4 font-black text-right">Total</th>
                                        <th className="px-6 py-4 font-black text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-medium">
                                    {data?.ledger?.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-6 py-4 text-slate-400 font-mono whitespace-nowrap">{row.date}</td>
                                            <td className="px-6 py-4 text-white font-black group-hover:text-primary transition-colors whitespace-nowrap">{row.loc}</td>
                                            <td className="px-6 py-4 text-slate-300 text-[10px] uppercase max-w-[150px] truncate" title={row.supplier}>{row.supplier || row.product}</td>
                                            <td className="px-6 py-4 text-right text-slate-200 font-black whitespace-nowrap">{row.total !== '0' && row.total !== '' ? `R$ ${row.total}` : '-'}</td>
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
                                    {data?.ledger?.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-slate-500 font-mono">Nenhum registro encontrado para estes filtros.</td>
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
