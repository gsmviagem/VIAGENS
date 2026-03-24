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
                // Sort by PRIORIDADE (1 on top, 3 at bottom)
                const sortedLedger = result.data.ledger.sort((a: any, b: any) => {
                    const pA = parseInt((a['PRIORIDADE'] || '99').toString()) || 99;
                    const pB = parseInt((b['PRIORIDADE'] || '99').toString()) || 99;
                    return pA - pB;
                });
                setLedger(sortedLedger);

                // Filter headers: up to 'TAXAS' (column K), excluding 'DATA' (column I)
                const actualHeaders = Object.keys(sortedLedger[0]);
                const kIndex = actualHeaders.indexOf('TAXAS');
                let displayHeaders = actualHeaders;
                if (kIndex !== -1) {
                    displayHeaders = actualHeaders.slice(0, kIndex + 1);
                }
                displayHeaders = displayHeaders.filter(h => h.toUpperCase() !== 'DATA');
                setHeaders(displayHeaders);
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

                    <div className="glass-panel overflow-hidden w-full overflow-x-auto relative shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                        {loading && ledger.length === 0 ? (
                            <div className="w-full h-64 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-outline animate-spin mb-4">refresh</span>
                                <p className="text-[11px] uppercase tracking-widest text-outline">Carregando dados da nuvem...</p>
                            </div>
                        ) : (
                            <div className="min-w-fit w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#474747]/30 bg-black/80 backdrop-blur-md">
                                            {headers.map(h => (
                                                <th key={h} className="p-4 text-[10px] font-bold tracking-[0.1em] uppercase text-outline whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLedger.length > 0 ? filteredLedger.map((row, i) => {
                                            const situacao = (row['SITUAÇÃO'] || '').toUpperCase();
                                            let rowBg = "hover:bg-white/5 bg-transparent border-b border-white/5"; 
                                            let textColor = "text-white/90";

                                            if (situacao === 'SOLICITAR') {
                                                rowBg = "bg-[#451010]/80 hover:bg-[#5c1616] border-b border-[#ff6b6b]/20"; // Vinho
                                            } else if (situacao === 'SOLICITADO') {
                                                rowBg = "bg-[#612e0f]/80 hover:bg-[#7a3b14] border-b border-[#ffa94d]/20"; // Laranja
                                            } else if (situacao === 'BASE') {
                                                rowBg = "bg-[#0b294d]/80 hover:bg-[#0e3b70] border-b border-[#4dabf7]/20"; // Azul
                                            } else if (situacao === 'OK') {
                                                rowBg = "bg-transparent hover:bg-white/5 border-b border-white/5 opacity-50"; // Sem cor, escuro (opacidade menor para dar o tom escuro/riscado)
                                                textColor = "text-white/40 italic"; 
                                            }

                                            return (
                                                <motion.tr 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.02 }}
                                                    key={i} 
                                                    className={cn("transition-colors group", rowBg)}
                                                >
                                                    {headers.map(h => {
                                                        const cellVal = row[h];
                                                        return (
                                                            <td key={`${i}-${h}`} className={cn("p-4 text-[11px] font-medium whitespace-nowrap", textColor)}>
                                                                {cellVal || '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </motion.tr>
                                            );
                                        }) : (
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
