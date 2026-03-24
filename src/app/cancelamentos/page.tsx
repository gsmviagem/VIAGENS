'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function CancelamentosPage() {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/sheets/cancel');
            const result = await res.json();
            
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Failed to fetch cancel data');
            }

            if (result.data.ledger && result.data.ledger.length > 0) {
                setLedger(result.data.ledger);
                setHeaders(Object.keys(result.data.ledger[0]));
            } else {
                setLedger([]);
                setHeaders([]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredLedger = ledger.filter(row => {
        if (!searchTerm) return true;
        const searchUpper = searchTerm.toUpperCase();
        return Object.values(row).some(v => 
            String(v).toUpperCase().includes(searchUpper)
        );
    });

    return (
        <div className="flex flex-col relative bg-transparent text-[#e5e2e1] font-['Inter']">
            {/* Header Section */}
            <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#474747]/30 pb-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-[0.05em] text-white">Cancelamentos</h1>
                    <p className="text-outline font-light tracking-wide max-w-md">Controle de cancelamentos sincronizado com Google Sheets.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={fetchData}
                        disabled={loading}
                        className="px-6 py-3 bg-surface-container-high micro-border hover:bg-white/5 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        <span className={cn("material-symbols-outlined text-[18px]", loading && "animate-spin")}>sync</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{loading ? 'Sincronizando...' : 'Atualizar'}</span>
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-8 p-6 glass-panel border border-red-500/30 flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl text-red-400 mb-2">warning</span>
                    <h3 className="text-lg text-white font-medium mb-1">Erro de Sincronização</h3>
                    <p className="text-sm text-outline mb-4 text-center">{error}</p>
                    <button onClick={fetchData} className="px-6 py-3 bg-white/10 hover:bg-white/20 micro-border text-xs uppercase tracking-widest font-bold transition-colors">Tentar Novamente</button>
                </div>
            )}

            {!error && (
                <>
                    <div className="mb-6 flex gap-4">
                        <div className="w-full max-w-md relative glass-panel flex items-center px-4">
                            <span className="material-symbols-outlined text-outline absolute left-4">search</span>
                            <input 
                                type="text"
                                placeholder="Filtrar por localizador, PNR, status..."
                                className="w-full bg-transparent border-none outline-none py-3 pl-10 text-sm text-white placeholder:text-outline"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="glass-panel overflow-hidden w-full overflow-x-auto relative">
                        {loading && ledger.length === 0 ? (
                            <div className="w-full h-64 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-outline animate-spin mb-4">refresh</span>
                                <p className="text-[11px] uppercase tracking-widest text-outline">Carregando dados da nuvem...</p>
                            </div>
                        ) : (
                            <div className="min-w-fit w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-black/40">
                                            {headers.map(h => (
                                                <th key={h} className="p-4 text-[10px] font-bold tracking-[0.1em] uppercase text-outline whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLedger.length > 0 ? filteredLedger.map((row, i) => (
                                            <motion.tr 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                key={i} 
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                                            >
                                                {headers.map(h => {
                                                    const cellVal = row[h];
                                                    const isStatus = h.toUpperCase() === 'STATUS';
                                                    let statusColor = "text-white";
                                                    if (isStatus) {
                                                        const upperVal = cellVal?.toUpperCase();
                                                        if (upperVal === 'OK') statusColor = 'text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded inline-block';
                                                        else if (upperVal === 'SOLICITAR') statusColor = 'text-red-400 bg-red-400/10 px-2 py-1 rounded inline-block';
                                                        else if (upperVal === 'SOLICITADO') statusColor = 'text-amber-400 bg-amber-400/10 px-2 py-1 rounded inline-block';
                                                        else if (upperVal === 'BASE') statusColor = 'text-blue-400 bg-blue-400/10 px-2 py-1 rounded inline-block';
                                                    }
                                                    return (
                                                        <td key={`${i}-${h}`} className="p-4 text-[11px] font-medium text-white/90 whitespace-nowrap">
                                                            <span className={isStatus ? statusColor : ""}>
                                                                {cellVal || '-'}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={headers.length || 1} className="p-8 text-center text-[11px] text-outline uppercase tracking-widest">
                                                    {searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhum dado na planilha.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
