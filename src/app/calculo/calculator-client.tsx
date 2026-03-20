'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';

interface FlightRow {
    id: string;
    product: string;
    route: string;
    milesOutbound: number | string;
    milesInbound: number | string;
    paxCount: number | string;
    totalTaxes: number | string;
}

interface AzulRoute {
    id: string;
    route: string;
    price: number | string;
}

interface ClientPreset {
    id: string;
    name: string;
    rateUnder50: number;
    rateOver50: number;
}

const DEFAULT_PRESETS: ClientPreset[] = [
    { id: 'p1', name: 'Yossef', rateUnder50: 4.5, rateOver50: 4.0 },
];

const DEFAULT_AZUL_ROUTES: AzulRoute[] = [
    { id: 'a1', route: 'VCP-FLL', price: 3000 },
    { id: 'a2', route: 'VCP-MCO', price: 3500 },
    { id: 'a3', route: 'CNF-FLL', price: 3800 },
    { id: 'a4', route: 'VCP-LIS', price: 4000 },
    { id: 'a5', route: 'VCP-ORY', price: 4000 },
];

export default function CalculatorClient({ initialDolar }: { initialDolar: number }) {
    const [dolar, setDolar] = useState<number>(initialDolar || 5.0);
    const [rateUpTo50k, setRateUpTo50k] = useState<number>(14.50);
    const [rateOver50k, setRateOver50k] = useState<number>(13.50);

    const [presets, setPresets] = useState<ClientPreset[]>(DEFAULT_PRESETS);
    const [activePresetId, setActivePresetId] = useState<string | null>(null);
    const [newPresetName, setNewPresetName] = useState('');

    const [azulRoutes, setAzulRoutes] = useState<AzulRoute[]>(DEFAULT_AZUL_ROUTES);

    const [rows, setRows] = useState<FlightRow[]>([
        { id: '1', product: '', route: '', milesOutbound: '', milesInbound: '', paxCount: 1, totalTaxes: '' }
    ]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const savedRates = localStorage.getItem('gsm_calc_rates');
            if (savedRates) {
                const parsed = JSON.parse(savedRates);
                setRateUpTo50k(parsed.rateUpTo50k ?? 14.50);
                setRateOver50k(parsed.rateOver50k ?? 13.50);
            }
            const savedPresets = localStorage.getItem('gsm_calc_presets');
            if (savedPresets) setPresets(JSON.parse(savedPresets));
            const savedAzul = localStorage.getItem('gsm_calc_azul');
            if (savedAzul) setAzulRoutes(JSON.parse(savedAzul));
        } catch {}
    }, []);

    const saveRates = () => {
        localStorage.setItem('gsm_calc_rates', JSON.stringify({ rateUpTo50k, rateOver50k }));
        toast.success('Rates salvos!');
    };

    const savePresets = (updated: ClientPreset[]) => {
        setPresets(updated);
        localStorage.setItem('gsm_calc_presets', JSON.stringify(updated));
    };

    const saveAzulRoutes = (updated: AzulRoute[]) => {
        setAzulRoutes(updated);
        localStorage.setItem('gsm_calc_azul', JSON.stringify(updated));
    };

    const addPreset = () => {
        if (!newPresetName.trim()) { toast.error('Digite o nome do cliente'); return; }
        const newP: ClientPreset = {
            id: Math.random().toString(36).substring(7),
            name: newPresetName.trim(),
            rateUnder50: rateUpTo50k,
            rateOver50: rateOver50k,
        };
        savePresets([...presets, newP]);
        setNewPresetName('');
        toast.success(`Preset "${newP.name}" criado!`);
    };

    const removePreset = (id: string) => {
        savePresets(presets.filter(p => p.id !== id));
        if (activePresetId === id) setActivePresetId(null);
        toast.info('Preset removido');
    };

    const loadPreset = (preset: ClientPreset) => {
        setRateUpTo50k(preset.rateUnder50);
        setRateOver50k(preset.rateOver50);
        setActivePresetId(preset.id);
        toast.success(`Preset "${preset.name}" carregado`);
    };

    const updatePresetRates = (id: string) => {
        const updated = presets.map(p => p.id === id ? { ...p, rateUnder50: rateUpTo50k, rateOver50: rateOver50k } : p);
        savePresets(updated);
        toast.success('Preset atualizado com os rates atuais!');
    };

    const addRow = () => {
        setRows([...rows, { id: Math.random().toString(36).substring(7), product: '', route: '', milesOutbound: '', milesInbound: '', paxCount: 1, totalTaxes: '' }]);
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof FlightRow, value: string | number) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const addAzulRoute = () => {
        const updated = [...azulRoutes, { id: Math.random().toString(36).substring(7), route: '', price: '' as string | number }];
        saveAzulRoutes(updated);
    };

    const updateAzulRoute = (id: string, field: keyof AzulRoute, value: string | number) => {
        const updated = azulRoutes.map(r => r.id === id ? { ...r, [field]: value } : r);
        saveAzulRoutes(updated);
    };

    const removeAzulRoute = (id: string) => {
        saveAzulRoutes(azulRoutes.filter(r => r.id !== id));
    };

    // =============================================
    // FORMULA: (Mi + Mv) * N * R + T
    // If AZUL matched → just use fixed price from list
    // =============================================
    const calculatedRows = useMemo(() => {
        return rows.map(row => {
            const Mi = Number(row.milesOutbound) || 0;
            const Mv = Number(row.milesInbound) || 0;
            const N = Number(row.paxCount) || 1;
            const T = Number(row.totalTaxes) || 0;

            const totalMiles = Mi + Mv;
            const R = totalMiles <= 50 ? rateUpTo50k : rateOver50k;

            const isAzul = (row.product || '').toLowerCase().includes('azul');
            const matchedAzulRoute = isAzul
                ? azulRoutes.find(r => r.route.trim().toUpperCase() === (row.route || '').trim().toUpperCase())
                : null;

            let totalCostUSD: number;

            if (matchedAzulRoute) {
                // Azul: completely ignore the formula, use fixed price * pax
                totalCostUSD = Number(matchedAzulRoute.price) * N;
            } else {
                // Standard: (Mi + Mv) * N * R + T
                totalCostUSD = (Mi + Mv) * N * R + T;
            }

            const safeDolar = dolar > 0 ? dolar : 1;
            const totalCostBRL = totalCostUSD * safeDolar;

            return {
                ...row,
                appliedRate: R,
                totalCostUSD,
                totalCostBRL,
                isAzulMatched: !!matchedAzulRoute
            };
        });
    }, [rows, dolar, rateUpTo50k, rateOver50k, azulRoutes]);

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
            {/* Variables Sidebar */}
            <div className="w-full xl:w-80 shrink-0 space-y-6">

                {/* Rates Panel */}
                <div className="bg-[#0e0e0e]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
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
                                    type="number" step="0.01"
                                    value={dolar === 0 ? '' : dolar}
                                    onChange={(e) => setDolar(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-[#a19f9d] uppercase tracking-wider font-bold">Rate ≤ 50 (milheiros)</label>
                            <input
                                type="number" step="0.01"
                                value={rateUpTo50k === 0 ? '' : rateUpTo50k}
                                onChange={(e) => { setRateUpTo50k(parseFloat(e.target.value) || 0); setActivePresetId(null); }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-[#a19f9d] uppercase tracking-wider font-bold">Rate &gt; 50 (milheiros)</label>
                            <input
                                type="number" step="0.01"
                                value={rateOver50k === 0 ? '' : rateOver50k}
                                onChange={(e) => { setRateOver50k(parseFloat(e.target.value) || 0); setActivePresetId(null); }}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>

                        <button
                            onClick={saveRates}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-md"
                        >
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            Salvar Rates
                        </button>
                    </div>
                </div>

                {/* Client Presets Panel */}
                <div className="bg-[#0e0e0e]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                    <h3 className="text-white font-bold tracking-widest text-[10px] uppercase mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">group</span>
                        Presets de Clientes
                    </h3>

                    <div className="space-y-2 mb-4">
                        {presets.map(preset => (
                            <div
                                key={preset.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer group ${
                                    activePresetId === preset.id
                                        ? 'bg-white/10 border-white/20'
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                                }`}
                                onClick={() => loadPreset(preset)}
                            >
                                <div className="min-w-0">
                                    <p className="text-white text-xs font-bold truncate">{preset.name}</p>
                                    <p className="text-[9px] text-[#a19f9d] font-mono">
                                        ≤50: {preset.rateUnder50} &nbsp;|&nbsp; &gt;50: {preset.rateOver50}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {activePresetId === preset.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updatePresetRates(preset.id); }}
                                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
                                            title="Atualizar preset com rates atuais"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">save</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removePreset(preset.id); }}
                                        className="w-6 h-6 rounded bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[12px]">close</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nome do cliente"
                            value={newPresetName}
                            onChange={e => setNewPresetName(e.target.value)}
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-[#555]"
                        />
                        <button
                            onClick={addPreset}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-white/10"
                        >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                    </div>
                    <p className="text-[9px] text-[#555] mt-2">Clique num preset para carregar os rates. O novo preset usa os rates atuais.</p>
                </div>

                {/* Azul Routes Panel */}
                <div className="bg-[#0e0e0e]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                    <h3 className="text-white font-bold tracking-widest text-[10px] uppercase mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">flight</span>
                            Rotas Azul (Preço Fixo)
                        </span>
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
                                    className="w-20 bg-[#1a1a1a] border border-white/10 rounded py-1.5 px-2 text-xs text-white uppercase focus:outline-none focus:border-white/30 transition-colors"
                                />
                                <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a19f9d] text-[10px]">$</span>
                                    <input
                                        type="number"
                                        value={route.price === 0 ? '' : route.price}
                                        onChange={(e) => updateAzulRoute(route.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded py-1.5 pl-5 pr-2 text-xs text-white focus:outline-none focus:border-white/30 transition-colors"
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
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-white font-bold tracking-widest text-xs uppercase flex items-center gap-2 border-l-[3px] border-white pl-3">
                            Tabela de Voos
                        </h2>
                        <p className="text-[9px] text-[#555] ml-5 mt-1 font-mono">
                            Fórmula: (Mi + Mv) × N × R + T &nbsp;|&nbsp; Azul = preço fixo da lista
                        </p>
                    </div>
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
                                <th className="py-3 px-4 text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider text-right min-w-[160px]">Custo Total</th>
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
                                            value={row.milesOutbound}
                                            onChange={(e) => updateRow(row.id, 'milesOutbound', e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="number"
                                            value={row.milesInbound}
                                            onChange={(e) => updateRow(row.id, 'milesInbound', e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="number" min="1"
                                            value={row.paxCount}
                                            onChange={(e) => updateRow(row.id, 'paxCount', parseInt(e.target.value) || 1)}
                                            className="w-16 bg-transparent border border-transparent focus:border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a19f9d] text-sm">$</span>
                                            <input
                                                type="number" step="0.01"
                                                value={row.totalTaxes}
                                                onChange={(e) => updateRow(row.id, 'totalTaxes', e.target.value)}
                                                placeholder="0"
                                                className="w-full bg-transparent border border-transparent focus:border-white/10 rounded py-1.5 pl-6 pr-2 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-colors"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-[#22c55e] whitespace-nowrap text-base">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.totalCostUSD)}
                                            </span>
                                            <span className="text-[11px] text-white font-medium whitespace-nowrap mt-0.5 opacity-80">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.totalCostBRL)}
                                            </span>
                                            <span className="text-[9px] text-[#a19f9d] mt-1 font-medium tracking-wide">
                                                {row.isAzulMatched
                                                    ? 'FIXED (AZUL)'
                                                    : `RATE: ${row.appliedRate}`}
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
