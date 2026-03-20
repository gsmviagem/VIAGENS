'use client';

import { useState, useMemo } from 'react';

interface FlightRow {
    id: string;
    product: string;
    route: string;
    milesOutbound: number;
    milesInbound: number;
    paxCount: number;
    totalTaxes: number;
}

export default function CalculatorClient({ initialDolar }: { initialDolar: number }) {
    const [dolar, setDolar] = useState<number>(initialDolar);
    const [rateUpTo50k, setRateUpTo50k] = useState<number>(14.50); // Example fallback
    const [rateOver50k, setRateOver50k] = useState<number>(13.50); // Example fallback

    const [rows, setRows] = useState<FlightRow[]>([
        { id: '1', product: '', route: '', milesOutbound: 0, milesInbound: 0, paxCount: 1, totalTaxes: 0 }
    ]);

    const addRow = () => {
        setRows([...rows, { id: Math.random().toString(36).substring(7), product: '', route: '', milesOutbound: 0, milesInbound: 0, paxCount: 1, totalTaxes: 0 }]);
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof FlightRow, value: string | number) => {
        setRows(rows.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    // Calculate totals
    const calculatedRows = useMemo(() => {
        return rows.map(row => {
            const totalMilesPerPax = (Number(row.milesOutbound) || 0) + (Number(row.milesInbound) || 0);
            const appliedRate = totalMilesPerPax <= 50000 ? rateUpTo50k : rateOver50k;
            const paxCount = Number(row.paxCount) || 1;
            
            const costOfMiles = (totalMilesPerPax / 1000) * appliedRate * paxCount;
            // Assuming taxes are in USD or required to be multiplied by USD
            const taxesCostBRL = (Number(row.totalTaxes) || 0) * dolar; 
            
            const totalCost = costOfMiles + taxesCostBRL;
            
            return {
                ...row,
                totalMilesPerPax,
                appliedRate,
                totalCost
            };
        });
    }, [rows, dolar, rateUpTo50k, rateOver50k]);

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
            {/* Variables Sidebar */}
            <div className="w-full xl:w-80 shrink-0 bg-[#0e0e0e]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                <h2 className="text-white font-bold tracking-widest text-xs uppercase mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    Variáveis de Cálculo
                </h2>
                
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] text-[#a19f9d] uppercase tracking-wider font-bold">Dólar (Google Sheets)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19f9d] font-medium">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={dolar}
                                onChange={(e) => setDolar(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] text-[#a19f9d] uppercase tracking-wider font-bold">Rate até 50k (Milhas)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19f9d] font-medium">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={rateUpTo50k}
                                onChange={(e) => setRateUpTo50k(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] text-[#a19f9d] uppercase tracking-wider font-bold">Rate acima 50k (Milhas)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19f9d] font-medium">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={rateOver50k}
                                onChange={(e) => setRateOver50k(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 w-full bg-[#0e0e0e]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                        Tabela de Voos
                    </h2>
                    <button 
                        onClick={addRow}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Adicionar
                    </button>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar pb-4">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider">Produto</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider">Rota</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider">Milhas Ida</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider">Milhas Volta</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider">Pax</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider min-w-[120px]">Taxas Tot. ($)</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider text-right min-w-[140px]">Custo Total (R$)</th>
                                <th className="py-3 px-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {calculatedRows.map((row) => (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-3 px-4">
                                        <input 
                                            type="text" 
                                            value={row.product} 
                                            onChange={(e) => updateRow(row.id, 'product', e.target.value)}
                                            placeholder="Ex: Latam"
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:bg-[#1a1a1a]"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="text" 
                                            value={row.route} 
                                            onChange={(e) => updateRow(row.id, 'route', e.target.value)}
                                            placeholder="GRU-MIA"
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:bg-[#1a1a1a]"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="number" 
                                            value={row.milesOutbound || ''} 
                                            onChange={(e) => updateRow(row.id, 'milesOutbound', parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:bg-[#1a1a1a]"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="number" 
                                            value={row.milesInbound || ''} 
                                            onChange={(e) => updateRow(row.id, 'milesInbound', parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:bg-[#1a1a1a]"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={row.paxCount || ''} 
                                            onChange={(e) => updateRow(row.id, 'paxCount', parseInt(e.target.value) || 1)}
                                            className="w-20 bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:bg-[#1a1a1a]"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a19f9d] text-sm">$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={row.totalTaxes || ''} 
                                                onChange={(e) => updateRow(row.id, 'totalTaxes', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent border border-transparent focus:border-white/10 rounded py-1 pl-6 pr-2 text-sm text-white focus:outline-none focus:bg-[#1a1a1a]"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-white">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.totalCost)}
                                            </span>
                                            <span className="text-[10px] text-[#a19f9d]">
                                                (Rate: R${row.appliedRate.toFixed(2)})
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <button 
                                            onClick={() => removeRow(row.id)}
                                            className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remover linha"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
