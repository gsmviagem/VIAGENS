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

interface AzulRoute {
    id: string;
    route: string;
    price: number;
}

export default function CalculatorClient({ initialDolar }: { initialDolar: number }) {
    const [dolar, setDolar] = useState<number>(initialDolar || 5.0);
    const [rateUpTo50k, setRateUpTo50k] = useState<number>(14.50);
    const [rateOver50k, setRateOver50k] = useState<number>(13.50);

    const [azulRoutes, setAzulRoutes] = useState<AzulRoute[]>([
        { id: 'a1', route: 'VCP-FLL', price: 3000 },
        { id: 'a2', route: 'VCP-MCO', price: 3500 },
        { id: 'a3', route: 'CNF-FLL', price: 3800 },
        { id: 'a4', route: 'VCP-LIS', price: 4000 },
        { id: 'a5', route: 'VCP-ORY', price: 4000 },
    ]);

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

    const addAzulRoute = () => {
        setAzulRoutes([...azulRoutes, { id: Math.random().toString(36).substring(7), route: '', price: 0 }]);
    };

    const updateAzulRoute = (id: string, field: keyof AzulRoute, value: string | number) => {
        setAzulRoutes(azulRoutes.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    const removeAzulRoute = (id: string) => {
        setAzulRoutes(azulRoutes.filter(r => r.id !== id));
    };

    // Calculate totals
    const calculatedRows = useMemo(() => {
        return rows.map(row => {
            const totalMilesPerPax = (Number(row.milesOutbound) || 0) + (Number(row.milesInbound) || 0);
            const appliedRate = totalMilesPerPax <= 50000 ? rateUpTo50k : rateOver50k;
            const paxCount = Number(row.paxCount) || 1;
            
            const isAzul = (row.product || '').toLowerCase().includes('azul');
            const matchedAzulRoute = isAzul 
                ? azulRoutes.find(r => r.route.trim().toUpperCase() === (row.route || '').trim().toUpperCase()) 
                : null;
            
            let costOfMiles = 0;
            if (matchedAzulRoute) {
                // Predefined Route rule: Fixed Price * pax
                costOfMiles = matchedAzulRoute.price * paxCount;
            } else {
                // Normal MIles rule: (Total Miles / 1000) * Rate * pax
                costOfMiles = (totalMilesPerPax / 1000) * appliedRate * paxCount;
            }
            
            // Taxes assumed in USD (Taxas Tot. ($))
            const taxesCostBRL = (Number(row.totalTaxes) || 0) * dolar; 
            
            const totalCostBRL = costOfMiles + taxesCostBRL;
            const totalCostUSD = dolar > 0 ? totalCostBRL / dolar : 0;
            
            return {
                ...row,
                totalMilesPerPax,
                appliedRate,
                totalCostBRL,
                totalCostUSD,
                isAzulMatched: !!matchedAzulRoute
            };
        });
    }, [rows, dolar, rateUpTo50k, rateOver50k, azulRoutes]);

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

                <div className="mt-8 pt-6 border-t border-white/10">
                    <h3 className="text-white font-bold tracking-widest text-[10px] uppercase mb-4 flex items-center justify-between">
                        Rotas Azul (Preço Fixo)
                        <button onClick={addAzulRoute} className="p-1 hover:bg-white/10 rounded transition-colors" title="Adicionar Rota">
                            <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                    </h3>
                    <div className="space-y-2">
                        {azulRoutes.map(route => (
                            <div key={route.id} className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={route.route}
                                    onChange={(e) => updateAzulRoute(route.id, 'route', e.target.value)}
                                    placeholder="Rota"
                                    className="w-16 bg-[#1a1a1a] border border-white/10 rounded py-1.5 px-2 text-xs text-white uppercase focus:outline-none focus:border-white/30 transition-colors"
                                />
                                <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a19f9d] text-[10px]">R$</span>
                                    <input 
                                        type="number" 
                                        value={route.price === 0 ? '' : route.price}
                                        onChange={(e) => updateAzulRoute(route.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded py-1.5 pl-6 pr-2 text-xs text-white focus:outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>
                                <button onClick={() => removeAzulRoute(route.id)} className="text-red-500/50 hover:text-red-500 p-1 transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 w-full bg-[#0e0e0e]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white font-bold tracking-widest text-xs uppercase flex items-center gap-2 border-l-[3px] border-white pl-3">
                        Tabela de Voos
                    </h2>
                    <button 
                        onClick={addRow}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-md"
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
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider text-right min-w-[140px]">Custo Total</th>
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
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="text" 
                                            value={row.route} 
                                            onChange={(e) => updateRow(row.id, 'route', e.target.value)}
                                            placeholder="GRU-MIA"
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white uppercase focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="number" 
                                            value={row.milesOutbound === 0 ? '' : row.milesOutbound} 
                                            onChange={(e) => updateRow(row.id, 'milesOutbound', parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="number" 
                                            value={row.milesInbound === 0 ? '' : row.milesInbound} 
                                            onChange={(e) => updateRow(row.id, 'milesInbound', parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={row.paxCount === 0 ? '' : row.paxCount} 
                                            onChange={(e) => updateRow(row.id, 'paxCount', parseInt(e.target.value) || 1)}
                                            className="w-16 bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a19f9d] text-sm">$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={row.totalTaxes === 0 ? '' : row.totalTaxes} 
                                                onChange={(e) => updateRow(row.id, 'totalTaxes', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent border border-transparent focus:border-white/10 rounded py-1.5 pl-6 pr-2 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-white whitespace-nowrap">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.totalCostBRL)}
                                            </span>
                                            <span className="text-[11px] text-[#22c55e] font-semibold whitespace-nowrap mt-0.5">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.totalCostUSD)}
                                            </span>
                                            <span className="text-[9px] text-[#a19f9d] mt-1 font-medium tracking-wide">
                                                {row.isAzulMatched 
                                                    ? 'FIXED (AZUL)' 
                                                    : `RATE: R$${row.appliedRate.toFixed(2)}`}
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
