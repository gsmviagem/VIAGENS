'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const [startDate, setStartDate] = useState('2020-01-01');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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
                    brokerName: selectedClient.broker,
                    companyName: selectedClient.company,
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

        // Branding Header
        doc.setFillColor(14, 14, 14);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('DIMAIS CORP', 20, 28);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('HUB FINANCIAL SYSTEMS', 20, 35);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE / FATURA', pageWidth - 20, 30, { align: 'right' });

        // Client & Invoice Details
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('REMETENTE:', 20, 65);
        doc.setFont('helvetica', 'normal');
        doc.text('DIMAIS CORP', 50, 65);

        doc.setFont('helvetica', 'bold');
        doc.text('DESTINATÁRIO:', 20, 72);
        doc.setFont('helvetica', 'normal');
        doc.text((selectedClient.company || selectedClient.broker).toUpperCase(), 50, 72);

        doc.setFont('helvetica', 'bold');
        doc.text('DATA EMISSÃO:', 20, 79);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('pt-BR'), 50, 79);

        // Period filter info
        if (startDate || endDate) {
            doc.setFont('helvetica', 'bold');
            doc.text('PERÍODO:', 20, 86);
            doc.setFont('helvetica', 'normal');
            doc.text(`${startDate || 'Início'} ate ${endDate || 'Hoje'}`, 50, 86);
        }

        // Table
        const tableData = data.emissions.map(e => [
            e.date,
            e.pax,
            e.pnr,
            e.product,
            e.route,
            e.value
        ]);

        autoTable(doc, {
            startY: 95,
            head: [['Data', 'Passageiro', 'LOC', 'Produto', 'Rota', 'Valor']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                5: { halign: 'right', fontStyle: 'bold' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;

        // Summary Box
        doc.setFillColor(245, 245, 245);
        doc.rect(pageWidth - 90, finalY - 5, 70, 35, 'F');

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Subtotal:', pageWidth - 85, finalY + 5);
        doc.setTextColor(0, 0, 0);
        doc.text(`R$ ${totalEmissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 25, finalY + 5, { align: 'right' });
        
        if (deductCredits && totalCredits > 0) {
            doc.setTextColor(100, 100, 100);
            doc.text('Créditos:', pageWidth - 85, finalY + 12);
            doc.setTextColor(180, 0, 0);
            doc.text(`- R$ ${totalCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 25, finalY + 12, { align: 'right' });
        }

        doc.setLineWidth(0.5);
        doc.line(pageWidth - 85, finalY + 18, pageWidth - 25, finalY + 18);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (finalTotal <= 0) {
            doc.setTextColor(0, 150, 0);
        } else {
            doc.setTextColor(0, 0, 0);
        }
        doc.text(finalTotal <= 0 ? 'CRÉDITO:' : 'TOTAL DEVIDO:', pageWidth - 85, finalY + 25);
        doc.text(`R$ ${Math.abs(finalTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 25, finalY + 25, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('DIMAIS CORP - SOLUÇÕES EM VIAGENS E TECNOLOGIA', pageWidth / 2, 285, { align: 'center' });

        doc.save(`Invoice_${(selectedClient.company || selectedClient.broker).replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto px-4">
            <header className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase font-display">Invoice Generation</h1>
                    <p className="text-[#a19f9d] mt-2">DIMAIS CORP - Hub Systems</p>
                </div>
                <div className="glass-panel px-4 py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">DIMAIS CORP ACTIVE</span>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* FILTERS PANEL (FIXED WIDTH) */}
                <div className="w-full lg:w-[400px] space-y-6 flex-shrink-0">
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
                            className="w-full bg-[#3c3b3b] hover:bg-[#2a2a2a] disabled:opacity-50 text-white font-black uppercase text-[11px] tracking-widest py-4 transition-all active:scale-95 border border-white/10"
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

                {/* PREVIEW PANEL (EXPANDED) */}
                <div className="flex-1 min-w-0 space-y-6">
                    <div className="glass-panel flex flex-col h-[700px] w-full">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-outline text-lg">preview</span>
                                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Billing Preview</h2>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] text-outline font-bold uppercase tracking-widest">{selectedClient?.company || selectedClient?.broker || 'No Client selected'}</span>
                                <button
                                    onClick={generatePDF}
                                    disabled={data.emissions.length === 0}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-sm text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-30"
                                >
                                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                    Exportar PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            {data.emissions.length > 0 ? (
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead className="sticky top-0 bg-[#151515] z-10">
                                        <tr className="border-b border-white/10">
                                            <th className="w-24 px-4 py-3 text-[9px] font-black text-outline uppercase tracking-widest">Data</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-outline uppercase tracking-widest">Passageiro / Localizador</th>
                                            <th className="w-32 px-4 py-3 text-[9px] font-black text-outline uppercase tracking-widest">Rota</th>
                                            <th className="w-24 px-4 py-3 text-[9px] font-black text-outline uppercase tracking-widest text-right">Produto</th>
                                            <th className="w-28 px-4 py-3 text-right text-[9px] font-black text-outline uppercase tracking-widest">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.emissions.map((e, i) => (
                                            <tr key={i} className="hover:bg-white/2 transition-colors border-l-2 border-transparent hover:border-secondary">
                                                <td className="px-4 py-2 text-[10px] font-mono text-white/40">{e.date}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-white uppercase truncate" title={e.pax}>{e.pax}</span>
                                                        <span className="text-[9px] font-mono text-outline/60">{e.pnr}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-[10px] text-white/70 whitespace-nowrap overflow-hidden text-ellipsis">{e.route}</td>
                                                <td className="px-4 py-2 text-right text-[9px] font-black text-secondary uppercase">{e.product}</td>
                                                <td className="px-4 py-2 text-right text-[10px] font-bold text-white">
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
                                <span className={cn(
                                    "text-[12px] font-black uppercase tracking-widest",
                                    finalTotal <= 0 ? "text-emerald-500" : "text-white"
                                )}>
                                    {finalTotal <= 0 ? 'Saldo Credor' : 'Total a Pagar'}
                                </span>
                                <span className={cn(
                                    "text-2xl font-black",
                                    finalTotal <= 0 ? "text-emerald-500" : "text-secondary"
                                )}>
                                    R$ {Math.abs(finalTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
