'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BlackCalendar } from '@/components/ui/black-calendar';

interface Client {
    broker: string;
    company: string;
    totalOwed: string;
    email?: string;
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
    const [namingFormat, setNamingFormat] = useState<'DEFAULT' | 'RANGE' | 'MONTH'>('DEFAULT');

    const handleAddWeek = () => {
        const s = new Date(startDate);
        s.setUTCHours(12);
        s.setDate(s.getDate() + 7);
        
        const e = new Date(endDate);
        e.setUTCHours(12);
        e.setDate(e.getDate() + 7);

        setStartDate(s.toISOString().split('T')[0]);
        setEndDate(e.toISOString().split('T')[0]);
    };

    // Fetch clients on mount
    useEffect(() => {
        fetch('/api/sheets/clients', { cache: 'no-store' })
            .then(res => res.json())
            .then(json => {
                if (json.success) setClients(json.clients);
            })
            .catch(err => console.error("Error fetching clients:", err));
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
        return activeCredits.filter(c => c.amount >= 0).reduce((acc, curr) => acc + curr.amount, 0);
    }, [activeCredits]);

    const totalSelectedCharges = useMemo(() => {
        return activeCredits.filter(c => c.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    }, [activeCredits]);

    const finalTotal = totalEmissions - totalSelectedCredits + totalSelectedCharges;

    const toggleCredit = (id: string) => {
        const next = new Set(selectedCreditIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCreditIds(next);
    };

    const generatePDF = async () => {
        if (!selectedClient) return;

        const doc = new jsPDF() as any;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const PRIMARY_BLUE: [number, number, number] = [0, 43, 92]; // #002b5c
        const ACCENT_COLOR: [number, number, number] = [16, 185, 129]; // Emerald

        // === HEADER ===
        doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFillColor(0, 35, 75);
        doc.triangle(pageWidth - 80, 0, pageWidth, 0, pageWidth, 20, 'F');
        doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
        doc.rect(0, 20, pageWidth, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('DIMAIS CORP', 15, 14);

        // === INFO ROW ===
        const infoY = 30;
        const emitDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        // Left card: Client name + date
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, infoY, 110, 22, 1.5, 1.5, 'F');
        doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
        doc.rect(15, infoY + 3, 2.5, 16, 'F');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(140, 140, 140);
        doc.text('BILLED TO', 22, infoY + 7);

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const clientName = (selectedClient.company || selectedClient.broker).toUpperCase();
        doc.text(clientName.length > 34 ? clientName.substring(0, 34) + '...' : clientName, 22, infoY + 14);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Issued ${emitDate}`, 22, infoY + 20);

        // Right: Financial summary
        const sumBoxX = pageWidth - 65;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.3);
        doc.roundedRect(sumBoxX, infoY, 50, 22, 1.5, 1.5, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('Bookings', sumBoxX + 3, infoY + 7);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`$ ${totalEmissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 7, { align: 'right' });

        let pdfOffsetY = 0;
        if (totalSelectedCredits > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(120, 120, 120);
            doc.text('Credits', sumBoxX + 3, infoY + 13);
            doc.setTextColor(16, 185, 129);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`-$ ${totalSelectedCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 13, { align: 'right' });
            pdfOffsetY += 6;
        }
        if (totalSelectedCharges > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(120, 120, 120);
            doc.text('Debit', sumBoxX + 3, infoY + 13 + pdfOffsetY);
            doc.setTextColor(220, 38, 38);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`+$ ${totalSelectedCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 13 + pdfOffsetY, { align: 'right' });
            pdfOffsetY += 6;
        }

        const finalColor = finalTotal <= 0 ? ACCENT_COLOR : PRIMARY_BLUE;
        doc.setFillColor(finalColor[0], finalColor[1], finalColor[2]);
        doc.rect(sumBoxX, infoY + 15.5 + pdfOffsetY, 50, 6.5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL', sumBoxX + 3, infoY + 20 + pdfOffsetY);
        doc.setFontSize(11);
        doc.text(`$ ${Math.abs(finalTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 20 + pdfOffsetY, { align: 'right' });

        const emissionsRows = data.emissions.map((e: any) => [
            formatUSDate(e.date),
            e.pax,
            e.pnr,
            e.route,
            e.value.replace('R$', '$')
        ]);

        autoTable(doc, {
            startY: infoY + 30 + pdfOffsetY,
            head: [['Date', 'Passenger', 'Loc', 'Route', 'Price']],
            body: emissionsRows,
            theme: 'grid',
            headStyles: { 
                fillColor: PRIMARY_BLUE, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { 
                fontSize: 8, 
                cellPadding: 3, 
                textColor: [50, 50, 50],
                lineColor: [235, 235, 235],
                halign: 'center'
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 4: { halign: 'center', fontStyle: 'bold' } }
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
                headStyles: { textColor: [100, 100, 100], fontSize: 8, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
                columnStyles: { 3: { halign: 'center', fontStyle: 'bold' } }
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('DIMAIS CORP - TRAVEL PERSPECTIVE & BILLING TECHNOLOGY', pageWidth / 2, 285, { align: 'center' });

        const clientNameFile = selectedClient.company || selectedClient.broker;
        
        let finalFileName = '';

        if (namingFormat === 'RANGE') {
            const formatUS = (d: string) => {
                const parts = d.split('-');
                return `${parts[1]}.${parts[2]}.${parts[0]}`; // MM.DD.YYYY
            };
            finalFileName = `INVOICE ${clientNameFile.toUpperCase()} - ${formatUS(startDate)} - ${formatUS(endDate)}.pdf`;
        } else if (namingFormat === 'MONTH') {
            const sdDate = new Date(startDate);
            sdDate.setUTCHours(12);
            const edDate = new Date(endDate);
            edDate.setUTCHours(12);
            
            const startMonth = sdDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
            const startYear = sdDate.getFullYear();
            const endMonth = edDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
            const endYear = edDate.getFullYear();

            if (startMonth === endMonth && startYear === endYear) {
                finalFileName = `INVOICE ${clientNameFile.toUpperCase()} - ${startMonth} ${startYear}.pdf`;
            } else {
                finalFileName = `INVOICE ${clientNameFile.toUpperCase()} - ${startMonth} - ${endMonth} ${endYear}.pdf`;
            }
        } else {
            const todayFile = new Date();
            const formattedDateFile = `${String(todayFile.getMonth() + 1).padStart(2, '0')}.${String(todayFile.getDate()).padStart(2, '0')}.${todayFile.getFullYear()}`;
            finalFileName = `INVOICE ${clientNameFile.toUpperCase()} - ${formattedDateFile}.pdf`;
        }

        const fileName = finalFileName;
        doc.save(fileName);
        
        // Background email sending
        try {
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: fileName, pdfBase64 })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) toast.success('E-mail enviado automaticamente!');
                else toast.error('Falha ao enviar e-mail: ' + data.error);
            })
            .catch(err => {
                console.error(err);
                toast.error('Ocorreu um erro de rede ao enviar o PDF por e-mail.');
            });
        } catch (e) {
            console.error('Failed to send email:', e);
        }
    };

    return (
        <div className="space-y-8 max-w-[1700px] mx-auto px-6 h-full overflow-hidden flex flex-col">
            <header className="flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-display italic">Invoice Center</h1>
                    <p className="text-[#a19f9d] mt-2 font-mono uppercase text-[10px] tracking-widest">Dimais Corp Portfolio Billing System</p>
                </div>
                <div className="glass-panel px-6 py-3 flex items-center gap-3 border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">System Online</span>
                </div>
            </header>

            <div className="flex flex-col xl:flex-row gap-10 flex-1 overflow-hidden">
                {/* SEARCH & FILTERS */}
                <div className="w-full xl:w-[400px] space-y-6 flex-shrink-0 overflow-y-auto custom-scrollbar">
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

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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
                            
                            <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                                <label className="text-[10px] font-black text-outline uppercase tracking-widest">Select Period</label>
                                <button
                                    onClick={handleAddWeek}
                                    className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-all active:scale-95"
                                >
                                    +1 Semana
                                </button>
                            </div>
                            
                            <BlackCalendar 
                                startDate={startDate} 
                                endDate={endDate} 
                                onChange={(s, e) => {
                                    setStartDate(s);
                                    setEndDate(e);
                                }} 
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-outline uppercase tracking-widest">Document Naming</label>
                            <select 
                                value={namingFormat}
                                onChange={(e) => setNamingFormat(e.target.value as 'DEFAULT' | 'RANGE' | 'MONTH')}
                                className="w-full bg-black/40 micro-border px-4 py-4 text-[#e0e0e0] text-[11px] font-black tracking-widest uppercase focus:outline-none focus:border-secondary transition-all cursor-pointer appearance-none"
                            >
                                <option value="DEFAULT">DD.MM.YYYY (Current Date)</option>
                                <option value="RANGE">DD.MM.YYYY - DD.MM.YYYY (Range)</option>
                                <option value="MONTH">MONTH YEAR (Based on Setup)</option>
                            </select>
                        </div>

                        <button
                            onClick={handleFetchData}
                            disabled={!selectedClient || loading}
                            className="w-full bg-[#1c1b1b] hover:bg-[#2a2a2a] disabled:opacity-30 text-white font-black uppercase text-[11px] tracking-[0.3em] py-5 transition-all active:scale-95 border border-white/10"
                        >
                            {loading ? 'Processing...' : 'Fetch Billing Data'}
                        </button>

                        <AnimatePresence>
                            {selectedClient && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-black/20 micro-border p-6 space-y-5 border-emerald-500/20 mt-6">
                                        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                            <span className="material-symbols-outlined text-[14px] text-emerald-400">person</span>
                                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">Client Info</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[8px] font-black text-outline uppercase tracking-widest mb-1">Broker Name</p>
                                                <p className="text-[11px] font-black text-white uppercase">{selectedClient.broker || 'N/A'}</p>
                                            </div>
                                            
                                            <div>
                                                <p className="text-[8px] font-black text-outline uppercase tracking-widest mb-1">Company</p>
                                                <p className="text-[11px] font-black text-[#c8c6c5] uppercase">{selectedClient.company || 'N/A'}</p>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-[8px] font-black text-outline uppercase tracking-widest">Contact Email</p>
                                                    <button 
                                                        onClick={() => {
                                                            if (selectedClient.email) {
                                                                navigator.clipboard.writeText(selectedClient.email);
                                                                toast.success('Email copied successfully');
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 text-[8px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors active:scale-95"
                                                    >
                                                        <span className="material-symbols-outlined text-[10px]">content_copy</span> Copy
                                                    </button>
                                                </div>
                                                <p className="text-[10px] font-mono text-white/70 bg-black/40 py-2 px-3 rounded-sm border border-white/5 break-all">{selectedClient.email || 'No email provided'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

                {/* PREVIEW & SELECTION */}
                <div className="flex-1 min-w-0 flex flex-col gap-8 min-h-0">
                    {/* TOP SUMMARY BOX */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-1 shrink-0">
                         <div className="glass-panel p-6 border-r-0 rounded-r-none">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest">Total Expenses</span>
                            <p className="text-2xl font-black text-white mt-1">$ {totalEmissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                         </div>
                         <div className="glass-panel p-6 border-x-0 rounded-none bg-emerald-500/2 flex flex-col gap-1">
                            {totalSelectedCredits > 0 && <>
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Applied Credits</span>
                                <p className="text-xl font-black text-emerald-400">- $ {totalSelectedCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </>}
                            {totalSelectedCharges > 0 && <>
                                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Debit</span>
                                <p className="text-xl font-black text-red-400">+ $ {totalSelectedCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </>}
                            {totalSelectedCredits === 0 && totalSelectedCharges === 0 && <>
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Applied Credits</span>
                                <p className="text-2xl font-black text-emerald-400">$ 0.00</p>
                            </>}
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

                    <div className="glass-panel flex flex-col flex-1 min-h-0">
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
                                        <table className="w-full text-center border-collapse table-fixed">
                                            <thead>
                                                <tr className="bg-black/20">
                                                    <th className="w-24 px-6 py-4 text-[8px] font-black text-outline uppercase">Date</th>
                                                    <th className="px-6 py-4 text-[8px] font-black text-outline uppercase">Passenger</th>
                                                    <th className="w-24 px-6 py-4 text-[8px] font-black text-outline uppercase text-center">Loc</th>
                                                    <th className="px-6 py-4 text-[8px] font-black text-outline uppercase">Route</th>
                                                    <th className="w-28 px-6 py-4 text-right text-[8px] font-black text-outline uppercase">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {data.emissions.map((e, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-2 text-[10px] font-mono text-white/30">{formatUSDate(e.date)}</td>
                                                        <td className="px-6 py-2">
                                                            <span className="text-[10px] font-black text-white uppercase truncate block" title={e.pax}>{e.pax}</span>
                                                        </td>
                                                        <td className="px-6 py-2 text-center">
                                                            <span className="text-[9px] font-mono text-outline uppercase">{e.pnr}</span>
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <span className="text-[10px] text-white/70 block truncate">{e.route}</span>
                                                        </td>
                                                        <td className="px-6 py-2 text-right text-[11px] font-black text-white">
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
                                            <table className="w-full text-center border-collapse table-fixed">
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
                                                                        <span className={cn("text-[8px] uppercase mt-1", c.amount < 0 ? "text-red-400/60" : "text-outline")}>{c.amount < 0 ? 'Debit' : (c.type || 'Credit')}</span>
                                                                    </div>
                                                                </td>
                                                                <td className={cn("w-32 px-6 py-4 text-right text-[11px] font-black", c.amount < 0 ? "text-red-400" : "text-emerald-400")}>
                                                                    {c.amount < 0
                                                                        ? `+ $ ${Math.abs(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                                                        : `- $ ${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
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
