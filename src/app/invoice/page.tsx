'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Client {
    broker: string;
    company: string;
    totalOwed: string;
}

interface Emission {
    date: string;
    pax: string;
    pnr: string;
    product: string;
    route: string;
    value: string;
}

interface Credit {
    payment: string;
    amount: number;
    type: string;
    date: string;
}

export default function InvoicePage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deductCredits, setDeductCredits] = useState(true);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ emissions: Emission[], credits: Credit[] }>({ emissions: [], credits: [] });

    // Fetch clients on mount
    useEffect(() => {
        fetch('/api/sheets/clients')
            .then(res => res.json())
            .then(json => {
                if (json.success) setClients(json.clients);
            });
    }, []);

    const filteredClients = useMemo(() => {
        if (!search || selectedClient) return [];
        const term = search.toLowerCase();
        return clients.filter(c => 
            c.broker.toLowerCase().includes(term) || 
            c.company.toLowerCase().includes(term)
        ).slice(0, 5);
    }, [search, clients, selectedClient]);

    const handleFetchData = async () => {
        if (!selectedClient) return;
        setLoading(true);
        try {
            const res = await fetch('/api/sheets/invoice-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    clientName: selectedClient.broker,
                    startDate,
                    endDate
                })
            });
            const json = await res.json();
            if (json.success) {
                setData(json.data);
                toast.success('Dados carregados');
            } else {
                toast.error('Erro ao carregar dados');
            }
        } catch (err) {
            toast.error('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const parseCurrency = (val: string) => {
        const clean = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const totalEmissions = useMemo(() => {
        return data.emissions.reduce((acc, curr) => acc + parseCurrency(curr.value), 0);
    }, [data.emissions]);

    const totalCredits = useMemo(() => {
        return data.credits.reduce((acc, curr) => acc + curr.amount, 0);
    }, [data.credits]);

    const finalTotal = deductCredits ? totalEmissions - totalCredits : totalEmissions;

    const generatePDF = () => {
        if (!selectedClient) return;

        const doc = new jsPDF() as any;
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFillColor(14, 14, 14);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CHRONOS HUB', 20, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('FATURA DE EMISSÕES', pageWidth - 20, 25, { align: 'right' });

        // Client Info
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE:', 20, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(`${selectedClient.broker} (${selectedClient.company})`, 50, 50);

        doc.setFont('helvetica', 'bold');
        doc.text('DATA:', 20, 58);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('pt-BR'), 50, 58);

        // Table
        const tableData = data.emissions.map(e => [
            e.date,
            e.pax,
            e.pnr,
            e.product,
            e.route,
            e.value
        ]);

        (doc as any).autoTable({
            startY: 70,
            head: [['Data', 'Passageiro', 'LOC', 'Produto', 'Rota', 'Valor']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Summary
        doc.setFontSize(10);
        doc.text(`Subtotal Emissões: R$ ${totalEmissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY, { align: 'right' });
        
        if (deductCredits && totalCredits > 0) {
            doc.setTextColor(180, 0, 0);
            doc.text(`Créditos/Pagamentos: - R$ ${totalCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 7, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL DEVIDO: R$ ${Math.max(0, finalTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 18, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Este documento é uma fatura pro-forma gerada automaticamente pelo Chronos Hub.', pageWidth / 2, 285, { align: 'center' });

        doc.save(`Invoice_${selectedClient.broker.replace(/\\s+/g, '_')}_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase font-display">Invoice Generation</h1>
                    <p className="text-[#a19f9d] mt-2">Gere faturas detalhadas para seus brokers e empresas.</p>
                </div>
                <div className="glass-panel px-4 py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Billing System Active</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FILTERS PANEL */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Nome do Cliente ou Empresa</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        if (selectedClient) setSelectedClient(null);
                                    }}
                                    placeholder="Buscar broker ou empresa..."
                                    className="w-full bg-black/40 micro-border px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary transition-colors"
                                />
                                <AnimatePresence>
                                    {filteredClients.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] micro-border z-50 shadow-2xl"
                                        >
                                            {filteredClients.map((c, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setSelectedClient(c);
                                                        setSearch(`${c.broker} (${c.company})`);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-[#c8c6c5] hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    <p className="font-bold">{c.broker}</p>
                                                    <p className="text-[10px] text-outline uppercase">{c.company}</p>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Data Inicial</label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-black/40 micro-border px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Data Final</label>
                                <input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-black/40 micro-border px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-white uppercase tracking-tight">Abater Créditos</span>
                                <span className="text-[9px] text-outline uppercase">Subtrair pagamentos em aberto</span>
                            </div>
                            <button 
                                onClick={() => setDeductCredits(!deductCredits)}
                                className={cn(
                                    "w-12 h-6 rounded-full transition-colors relative flex items-center px-1",
                                    deductCredits ? "bg-emerald-500" : "bg-white/10"
                                )}
                            >
                                <motion.div 
                                    animate={{ x: deductCredits ? 24 : 0 }}
                                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                                />
                            </button>
                        </div>

                        <button
                            onClick={handleFetchData}
                            disabled={!selectedClient || loading}
                            className="w-full bg-secondary hover:bg-secondary-dark disabled:opacity-50 text-white font-black uppercase text-[11px] tracking-widest py-4 transition-all active:scale-95"
                        >
                            {loading ? 'Carregando...' : 'Carregar Emissões'}
                        </button>
                    </div>

                    {/* CLIENT STATS CARD */}
                    {selectedClient && (
                        <div className="glass-panel p-6 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Total Status</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-outline uppercase">Dívida na Planilha</p>
                                    <p className="text-2xl font-black text-white">{selectedClient.totalOwed}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* PREVIEW PANEL */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel flex flex-col h-[600px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-outline">preview</span>
                                <h2 className="text-[11px] font-black text-white uppercase tracking-widest">Invoice Preview</h2>
                            </div>
                            <button
                                onClick={generatePDF}
                                disabled={data.emissions.length === 0}
                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-sm text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                Exportar PDF
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            {data.emissions.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#151515] z-10">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Data</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Pax / LOC</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-widest">Rota</th>
                                            <th className="px-6 py-4 text-right text-[9px] font-black text-outline uppercase tracking-widest">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.emissions.map((e, i) => (
                                            <tr key={i} className="hover:bg-white/2 transition-colors">
                                                <td className="px-6 py-4 text-[11px] font-mono text-white/60">{e.date}</td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[11px] font-bold text-white uppercase">{e.pax}</p>
                                                    <p className="text-[10px] font-mono text-outline">{e.pnr}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[11px] text-white/80">{e.route}</p>
                                                    <p className="text-[9px] text-outline uppercase font-bold">{e.product}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right text-[11px] font-bold text-white">
                                                    {e.value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-outline gap-4">
                                    <span className="material-symbols-outlined text-4xl opacity-20">receipt_long</span>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Nenhum dado carregado</p>
                                </div>
                            )}
                        </div>

                        {/* SUMMARY FOOTER */}
                        <div className="p-8 bg-black/40 border-t border-white/10 space-y-4">
                            <div className="flex justify-between items-center text-outline">
                                <span className="text-[10px] font-black uppercase tracking-widest">Subtotal Emissões</span>
                                <span className="text-sm font-bold text-white">R$ {totalEmissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            
                            {deductCredits && totalCredits > 0 && (
                                <div className="flex justify-between items-center text-emerald-400">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Créditos Abatidos</span>
                                    <span className="text-sm font-bold">- R$ {totalCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[12px] font-black text-white uppercase tracking-widest">Total a Pagar</span>
                                <span className="text-2xl font-black text-secondary">
                                    R$ {Math.max(0, finalTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
