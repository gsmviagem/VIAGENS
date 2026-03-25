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
    id: string;
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
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ emissions: Emission[], credits: Credit[] }>({ emissions: [], credits: [] });
    const [selectedCreditIds, setSelectedCreditIds] = useState<Set<string>>(new Set());

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
                // Add unique IDs to credits for selection
                const creditsWithIds = json.data.credits.map((c: any, i: number) => ({
                    ...c,
                    id: `credit-${i}-${c.amount}`
                }));
                setData({ ...json.data, credits: creditsWithIds });
                
                // Select all by default
                setSelectedCreditIds(new Set(creditsWithIds.map((c: any) => c.id)));
                toast.success('Data loaded successfully');
            } else {
                toast.error('Error loading data');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const parseCurrency = (val: string) => {
        const clean = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const formatUSDate = (brDate: string) => {
        if (!brDate || !brDate.includes('/')) return brDate;
        const [d, m, y] = brDate.split('/');
        return `${m}/${d}/${y}`;
    };

    const totalEmissions = useMemo(() => {
        return data.emissions.reduce((acc, curr) => acc + parseCurrency(curr.value), 0);
    }, [data.emissions]);

    const activeCredits = useMemo(() => {
        return data.credits.filter(c => selectedCreditIds.has(c.id));
    }, [data.credits, selectedCreditIds]);

    const totalSelectedCredits = useMemo(() => {
        return activeCredits.reduce((acc, curr) => acc + curr.amount, 0);
    }, [activeCredits]);

    const finalTotal = totalEmissions - totalSelectedCredits;

    const toggleCredit = (id: string) => {
        const next = new Set(selectedCreditIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCreditIds(next);
    };

    const generatePDF = () => {
        if (!selectedClient) return;

        const doc = new jsPDF() as any;
        const pageWidth = doc.internal.pageSize.width;
        const PRIMARY_BLUE: [number, number, number] = [0, 43, 92]; // #002b5c

        // Branding Header
        doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('DIMAIS CORP', 20, 28);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 200);
        doc.text('HUB FINANCIAL SYSTEMS - EXECUTIVE BILLING', 20, 35);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE', pageWidth - 20, 30, { align: 'right' });

        // Client & Invoice Details
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('FROM:', 20, 65);
        doc.setFont('helvetica', 'normal');
        doc.text('DIMAIS CORP', 50, 65);

        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO:', 20, 72);
        doc.setFont('helvetica', 'normal');
        doc.text((selectedClient.company || selectedClient.broker).toUpperCase(), 50, 72);

        doc.setFont('helvetica', 'bold');
        doc.text('DATE:', 20, 79);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('en-US'), 50, 79);

        // Period 
        let periodText = 'No items found';
        if (data.emissions.length > 0) {
            const rowDates = data.emissions.map(e => {
                const [d, m, y] = e.date.split('/');
                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
            }).filter(t => !isNaN(t));
            const min = new Date(Math.min(...rowDates));
            const max = new Date(Math.max(...rowDates));
            periodText = `${min.toLocaleDateString('en-US')} - ${max.toLocaleDateString('en-US')}`;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('PERIOD:', 20, 86);
        doc.setFont('helvetica', 'normal');
        doc.text(periodText, 50, 86);

        // Summary Box (Top)
        doc.setFillColor(245, 247, 250);
        doc.rect(pageWidth - 90, 60, 70, 35, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Gross Expenses:', pageWidth - 85, 70);
        doc.setTextColor(0, 0, 0);
        doc.text(`$ ${totalEmissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 25, 70, { align: 'right' });
        
        doc.setTextColor(100, 100, 100);
        doc.text('Applied Credits:', pageWidth - 85, 77);
        doc.setTextColor(180, 0, 0);
        doc.text(`- $ ${totalSelectedCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 25, 77, { align: 'right' });

        doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 85, 82, pageWidth - 25, 82);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const finalColor: [number, number, number] = finalTotal <= 0 ? [0, 150, 0] : PRIMARY_BLUE;
        doc.setTextColor(finalColor[0], finalColor[1], finalColor[2]);
        doc.text(finalTotal <= 0 ? 'CREDIT BALANCE:' : 'NET TOTAL DUE:', pageWidth - 85, 89);
        doc.text(`$ ${Math.abs(finalTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 25, 89, { align: 'right' });

        // Emissions Table
        doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
        doc.setFontSize(10);
        doc.text('ITEMIZED EXPENSES', 20, 105);

        const emissionsRows = data.emissions.map(e => [
            formatUSDate(e.date),
            e.pax,
            e.pnr,
            e.product,
            e.route,
            e.value.replace('R$', '$')
        ]);

        autoTable(doc, {
            startY: 108,
            head: [['Date', 'Passenger', 'Loc', 'Product', 'Route', 'Amount']],
            body: emissionsRows,
            theme: 'striped',
            headStyles: { fillColor: PRIMARY_BLUE, textColor: [255, 255, 255], fontSize: 8 },
            bodyStyles: { fontSize: 7, cellPadding: 1.5 },
            columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } }
        });

        // Credits Table (If any selected)
        if (activeCredits.length > 0) {
            const nextY = (doc as any).lastAutoTable.finalY + 10;
            doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
            doc.setFontSize(10);
            doc.text('APPLIED PAYMENTS / CREDITS', 20, nextY);

            const creditRows = activeCredits.map(c => [
                formatUSDate(c.date),
                c.payment || 'Payment',
                c.type || 'Standard',
                `$ ${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            ]);

            autoTable(doc, {
                startY: nextY + 3,
                head: [['Date', 'Reference', 'Type', 'Amount']],
                body: creditRows,
                theme: 'plain',
                headStyles: { textColor: [100, 100, 100], fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 7, cellPadding: 1.5 },
                columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('DIMAIS CORP - TRAVEL PERSPECTIVE & BILLING TECHNOLOGY', pageWidth / 2, 285, { align: 'center' });

        doc.save(`Invoice_${(selectedClient.company || selectedClient.broker).replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
    };

    return (
        <div className="space-y-8 max-w-[1700px] mx-auto px-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-display italic">Invoice Center</h1>
                    <p className="text-[#a19f9d] mt-2 font-mono uppercase text-[10px] tracking-widest">Dimais Corp Portfolio Billing System</p>
                </div>
                <div className="glass-panel px-6 py-3 flex items-center gap-3 border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">System Online</span>
                </div>
            </header>

            <div className="flex flex-col xl:flex-row gap-10">
                {/* SEARCH & FILTERS */}
                <div className="w-full xl:w-[400px] space-y-6 flex-shrink-0">
                    <div className="glass-panel p-8 space-y-8">
                        <section className="space-y-3">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest">Client Name or Company</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        if (selectedClient) setSelectedClient(null);
                                    }}
                                    placeholder="Search broker or entity..."
                                    className="w-full bg-black/40 micro-border px-4 py-4 text-white text-sm focus:outline-none focus:border-secondary transition-all"
                                />
                                <AnimatePresence>
                                    {filteredClients.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] micro-border z-50 shadow-2xl premium-shadow"
                                        >
                                            {filteredClients.map((c, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setSelectedClient(c);
                                                        setSearch(`${c.broker} (${c.company})`);
                                                    }}
                                                    className="w-full text-left px-5 py-4 text-sm text-[#c8c6c5] hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    <p className="font-black uppercase tracking-tight">{c.broker}</p>
                                                    <p className="text-[9px] text-outline uppercase font-mono mt-1">{c.company}</p>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </section>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-outline uppercase tracking-widest">Start Date</label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-black/40 micro-border px-4 py-4 text-white text-sm focus:outline-none focus:border-secondary transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-outline uppercase tracking-widest">End Date</label>
                                <input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-black/40 micro-border px-4 py-4 text-white text-sm focus:outline-none focus:border-secondary transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleFetchData}
                            disabled={!selectedClient || loading}
                            className="w-full bg-[#1c1b1b] hover:bg-[#2a2a2a] disabled:opacity-30 text-white font-black uppercase text-[11px] tracking-[0.3em] py-5 transition-all active:scale-95 border border-white/10"
                        >
                            {loading ? 'Processing...' : 'Fetch Billing Data'}
                        </button>
                    </div>

                    {/* STATS */}
                    {selectedClient && (
                        <div className="glass-panel p-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
                            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">Current Sheet Balance</h3>
                            <div>
                                <p className="text-[10px] text-outline uppercase font-mono">Ledger Total</p>
                                <p className="text-3xl font-black text-white italic tracking-tighter">{selectedClient.totalOwed}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* PREVIEW & SELECTION */}
                <div className="flex-1 min-w-0 space-y-8">
                    {/* TOP SUMMARY BOX */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-1">
                         <div className="glass-panel p-6 border-r-0 rounded-r-none">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest">Total Expenses</span>
                            <p className="text-2xl font-black text-white mt-1">$ {totalEmissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                         </div>
                         <div className="glass-panel p-6 border-x-0 rounded-none bg-emerald-500/2">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Applied Credits</span>
                            <p className="text-2xl font-black text-emerald-400 mt-1">- $ {totalSelectedCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                         </div>
                         <div className="glass-panel p-6 border-l-0 rounded-l-none bg-white/2">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest">Net Total Due</span>
                            <p className={cn(
                                "text-2xl font-black mt-1",
                                finalTotal <= 0 ? "text-emerald-500" : "text-secondary"
                            )}>
                                $ {Math.abs(finalTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                {finalTotal < 0 && <span className="text-[10px] ml-2 font-mono uppercase">(Credit)</span>}
                            </p>
                         </div>
                    </div>

                    <div className="glass-panel flex flex-col h-[750px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-outline">description</span>
                                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Draft Invoice Preview</h2>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-black text-white uppercase tracking-tight">{selectedClient?.company || selectedClient?.broker}</p>
                                    <p className="text-[8px] text-outline uppercase font-mono">{data.emissions.length} Items Found</p>
                                </div>
                                <button
                                    onClick={generatePDF}
                                    disabled={data.emissions.length === 0}
                                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-sm text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all disabled:opacity-20 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                    Export PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <AnimatePresence mode="wait">
                            {data.emissions.length > 0 ? (
                                <div className="divide-y-8 divide-black/20">
                                    {/* EMISSIONS TABLE */}
                                    <div className="p-0">
                                        <div className="sticky top-0 bg-[#1a1a1a] px-6 py-3 border-b border-white/10 flex justify-between items-center">
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Listing: Expenses</span>
                                            <span className="text-[8px] text-outline font-mono uppercase">Emissions Data</span>
                                        </div>
                                        <table className="w-full text-left border-collapse table-fixed">
                                            <thead>
                                                <tr className="bg-black/20">
                                                    <th className="w-24 px-6 py-4 text-[8px] font-black text-outline uppercase">Date</th>
                                                    <th className="px-6 py-4 text-[8px] font-black text-outline uppercase text-center">Passenger / Loc</th>
                                                    <th className="w-32 px-6 py-4 text-[8px] font-black text-outline uppercase">Route</th>
                                                    <th className="w-28 px-6 py-4 text-right text-[8px] font-black text-outline uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {data.emissions.map((e, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-3 text-[10px] font-mono text-white/30">{formatUSDate(e.date)}</td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex flex-col text-center">
                                                                <span className="text-[10px] font-black text-white uppercase truncate px-1" title={e.pax}>{e.pax}</span>
                                                                <span className="text-[9px] font-mono text-outline/40 leading-none mt-1">{e.pnr}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className="text-[10px] text-white/70 block truncate">{e.route}</span>
                                                            <span className="text-[8px] text-emerald-500/60 font-black uppercase">{e.product}</span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-[11px] font-black text-white">
                                                            $ {parseCurrency(e.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* CREDITS TABLE */}
                                    {data.credits.length > 0 && (
                                        <div className="p-0 bg-emerald-500/[0.01]">
                                            <div className="sticky top-0 bg-[#1a1a1a] px-6 py-3 border-b border-white/10 flex justify-between items-center">
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">Manual Selection: Payments & Credits</span>
                                                <div className="flex gap-4">
                                                     <button 
                                                        onClick={() => setSelectedCreditIds(new Set(data.credits.map(c => c.id)))}
                                                        className="text-[8px] font-black text-emerald-400 uppercase hover:underline"
                                                     >
                                                        Select All
                                                     </button>
                                                     <button 
                                                        onClick={() => setSelectedCreditIds(new Set())}
                                                        className="text-[8px] font-black text-outline uppercase hover:underline"
                                                     >
                                                        Deselect All
                                                     </button>
                                                </div>
                                            </div>
                                            <table className="w-full text-left border-collapse table-fixed">
                                                <tbody className="divide-y divide-white/5">
                                                    {data.credits.map((c, i) => {
                                                        const isSelected = selectedCreditIds.has(c.id);
                                                        return (
                                                            <tr 
                                                                key={i} 
                                                                className={cn(
                                                                    "hover:bg-emerald-500/5 transition-colors cursor-pointer group",
                                                                    !isSelected && "opacity-30 contrast-75"
                                                                )}
                                                                onClick={() => toggleCredit(c.id)}
                                                            >
                                                                <td className="w-16 px-6 py-4 text-center">
                                                                    <div className={cn(
                                                                        "w-4 h-4 rounded-sm border transition-all flex items-center justify-center m-auto",
                                                                        isSelected ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-white/20"
                                                                    )}>
                                                                        {isSelected && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="w-24 px-4 py-4 text-[10px] font-mono text-emerald-400/40">{formatUSDate(c.date)}</td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">{c.payment || 'Payment Reference'}</span>
                                                                        <span className="text-[8px] text-outline uppercase mt-1">{c.type}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="w-32 px-6 py-4 text-right text-[11px] font-black text-emerald-400">
                                                                    - $ {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-outline gap-6">
                                    <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02]">
                                        <span className="material-symbols-outlined text-4xl opacity-20">receipt_long</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Ready to audit</p>
                                        <p className="text-[9px] uppercase mt-2 opacity-20 font-mono">Select a client to initiate billing preview</p>
                                    </div>
                                </div>
                            )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
