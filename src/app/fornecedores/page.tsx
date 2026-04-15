"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';

export default function FornecedoresPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplier, setSupplier] = useState("TODOS");
    const [locator, setLocator] = useState("");
    const [pendingOnly, setPendingOnly] = useState(true);

    const [uniqueSuppliers, setUniqueSuppliers] = useState<string[]>([]);
    
    // Preparar Statement
    const [statementModalOpen, setStatementModalOpen] = useState(false);
    const [statementFiles, setStatementFiles] = useState<File[]>([]);
    const [statementLoading, setStatementLoading] = useState(false);
    const [statementDragging, setStatementDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                if (json.data.suppliers) {
                    const names: string[] = json.data.suppliers.map((s:any) => s.name);
                    setUniqueSuppliers(names);
                    // Se o fornecedor selecionado não existe mais (ex: alias mergeado), reset
                    setSupplier(prev => (prev !== 'TODOS' && !names.includes(prev)) ? 'TODOS' : prev);
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

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success("Copiado para a área de transferência!");
    };

    const parseCurrencyBR = (val: string): number => {
        if (!val) return 0;
        const clean = String(val).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const generateSupplierPDF = (returnBytes = false) => {
        if (!data || !data.ledger || data.ledger.length === 0) {
            toast.error('Nenhum dado para exportar.');
            return;
        }

        const doc = new jsPDF() as any;
        const pageWidth = doc.internal.pageSize.width;
        const PRIMARY: [number, number, number] = [10, 10, 20];
        const ACCENT: [number, number, number] = [16, 185, 129];
        const AMBER: [number, number, number] = [245, 158, 11];

        // === HEADER ===
        doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFillColor(0, 0, 10);
        doc.triangle(pageWidth - 80, 0, pageWidth, 0, pageWidth, 20, 'F');
        doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]);
        doc.rect(0, 20, pageWidth, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('DIMAIS CORP', 15, 14);

        // === INFO ROW ===
        const infoY = 30;
        const supplierInfo = data.suppliers?.find((s: any) => s.name === supplier);
        const resolvedName = supplierInfo?.fullName || (supplier && supplier !== 'TODOS' ? supplier : 'TODOS OS FORNECEDORES');
        const supplierLabel = resolvedName;
        const emitDate = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });

        // Left card: Supplier name + date
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, infoY, 110, 22, 1.5, 1.5, 'F');
        doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]);
        doc.rect(15, infoY + 3, 2.5, 16, 'F');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(140, 140, 140);
        doc.text('FORNECEDOR', 22, infoY + 7);

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(supplierLabel.length > 34 ? supplierLabel.substring(0, 34) + '...' : supplierLabel, 22, infoY + 14);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Emitido em ${emitDate}`, 22, infoY + 20);

        // Right summary box
        const totalBruto = data.ledger.reduce((acc: number, row: any) => acc + parseCurrencyBR(row.total), 0);
        const creditOkVal = supplierInfo ? parseCurrencyBR(supplierInfo.creditOk) : 0;
        const netTotal = totalBruto - creditOkVal;

        const sumBoxX = pageWidth - 65;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.3);
        doc.roundedRect(sumBoxX, infoY, 50, 22, 1.5, 1.5, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('Total Bruto', sumBoxX + 3, infoY + 7);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 7, { align: 'right' });

        if (creditOkVal !== 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(120, 120, 120);
            doc.text(creditOkVal > 0 ? 'Créditos' : 'Ajustes', sumBoxX + 3, infoY + 13);
            doc.setTextColor(16, 120, 80);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`${creditOkVal > 0 ? '-' : '+'}R$ ${Math.abs(creditOkVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 13, { align: 'right' });
        }

        const finalColor = netTotal <= 0 ? ACCENT : AMBER;
        doc.setFillColor(finalColor[0], finalColor[1], finalColor[2]);
        doc.rect(sumBoxX, infoY + 15.5, 50, 6.5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SALDO LÍQ.', sumBoxX + 3, infoY + 20);
        doc.setFontSize(11);
        doc.text(`R$ ${Math.abs(netTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sumBoxX + 47, infoY + 20, { align: 'right' });

        // --- LEDGER TABLE ---
        const ledgerRows = data.ledger.map((row: any) => {
            const priceVal = parseCurrencyBR(String(row.price || '0'));
            const milesVal = parseFloat(String(row.miles || '0').replace(',', '.'));
            const calcValor = priceVal * milesVal;

            return [
                row.date || '-',
                row.loc || '-',
                row.miles ? `${row.miles}K` : '-',
                row.price ? `R$ ${String(row.price).replace('R$', '').trim()}` : '-',
                `R$ ${calcValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                row.tax ? `R$ ${String(row.tax).replace('R$', '').trim()}` : 'R$ 0,00',
                row.total ? String(row.total).replace('R$', '').trim() : '0,00',
            ];
        });

        autoTable(doc, {
            startY: infoY + 30,
            head: [['Data', 'LOC', 'Milhas', 'Preço/Milha', 'Valor', 'Taxas', 'Total (R$)']],
            body: ledgerRows,
            theme: 'grid',
            headStyles: {
                fillColor: PRIMARY,
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
            columnStyles: { 6: { halign: 'center', fontStyle: 'bold' } },
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body') {
                    const rowData = data.ledger[hookData.row.index];
                    if (!rowData) return;
                    
                    const reqSupp = supplier !== 'TODOS' ? supplier : null;
                    
                    if (hookData.column.index === 4) { // Valor (Milhas)
                        const notMySupplier = reqSupp && rowData.milesSupplier !== reqSupp;
                        if (rowData.isMilesPaid || notMySupplier) {
                            hookData.cell.styles.textColor = [180, 180, 180];
                        }
                    }
                    if (hookData.column.index === 5) { // Taxas
                        const notMySupplier = reqSupp && rowData.taxSupplier !== reqSupp;
                        if (rowData.isTaxesPaid || notMySupplier) {
                            hookData.cell.styles.textColor = [180, 180, 180];
                        }
                    }
                }
            }
        });

        // --- CREDITS SECTION ---
        const creditEntries: { valor: number; valorFmt: string; detalhes: string }[] = supplierInfo?.creditDetails || [];
        if (creditEntries.length > 0) {
            const nextY = (doc as any).lastAutoTable.finalY + 10;
            doc.setTextColor(16, 120, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('CRÉDITOS APLICADOS', 20, nextY);

            const creditRows = creditEntries.map(c => [
                c.detalhes || '-',
                c.valorFmt
            ]);

            // Add summary row
            creditRows.push(['TOTAL CRÉDITOS', supplierInfo!.creditOk]);

            autoTable(doc, {
                startY: nextY + 3,
                head: [['Descrição / Detalhes', 'Valor']],
                body: creditRows,
                theme: 'plain',
                headStyles: { textColor: [100, 100, 100], fontSize: 8, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [50, 50, 50], halign: 'center' },
                columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
                didParseCell: (hookData: any) => {
                    // Highlight total row
                    if (hookData.row.index === creditRows.length - 1) {
                        hookData.cell.styles.fillColor = [230, 250, 240];
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.textColor = [10, 100, 50];
                    }
                }
            });
        }

        // --- FOOTER ---
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('DIMAIS CORP - TRAVEL PERSPECTIVE & BILLING TECHNOLOGY', pageWidth / 2, 285, { align: 'center' });

        if (returnBytes) {
            return doc.output('arraybuffer');
        }

        const dateStr = new Date();
        const fmtDate = `${String(dateStr.getDate()).padStart(2, '0')}.${String(dateStr.getMonth() + 1).padStart(2, '0')}.${dateStr.getFullYear()}`;
        const firstName = supplierLabel.split(' ')[0];
        const fileSupplier = supplier && supplier !== 'TODOS' ? firstName : 'ALL-SUPPLIERS';
        const fileName = `STATEMENT ${fileSupplier.toUpperCase()} - ${fmtDate}.pdf`;
        doc.save(fileName);
        toast.success('PDF exportado com sucesso!');

        // Send email in background
        try {
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: fileName, pdfBase64 })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) toast.success('E-mail do recíbo enviado!');
                else toast.error('Falha ao enviar e-mail: ' + data.error);
            })
            .catch(err => {
                console.error(err);
                toast.error('Erro ao enviar e-mail.');
            });
        } catch (e) {
            console.error('Failed to send email:', e);
        }
    };

    const handleStatementFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const newItems = Array.from(incoming).filter(f => ACCEPTED.includes(f.type));
        if (newItems.length === 0) {
            toast.error('Apenas PDF ou Imagens (PNG/JPG).');
            return;
        }
        setStatementFiles(prev => [...prev, ...newItems]);
    };

    const handleFullStatement = async () => {
        setStatementLoading(true);
        try {
            const statementBytes = generateSupplierPDF(true) as ArrayBuffer;
            if (!statementBytes) {
                setStatementLoading(false);
                return;
            }

            const merged = await PDFDocument.load(statementBytes);

            for (const f of statementFiles) {
                const fileBytes = await f.arrayBuffer();
                if (f.type === 'application/pdf') {
                    const srcDoc = await PDFDocument.load(fileBytes);
                    const pages = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
                    pages.forEach((p: any) => merged.addPage(p));
                } else if (f.type.startsWith('image/')) {
                    let img;
                    if (f.type === 'image/png') {
                        img = await merged.embedPng(fileBytes);
                    } else {
                        img = await merged.embedJpg(fileBytes);
                    }
                    const { width, height } = img;
                    const A4_W = 595.28;
                    const A4_H = 841.89;

                    const scale = Math.min(A4_W / width, A4_H / height);
                    const drawW = width * scale;
                    const drawH = height * scale;
                    const x = (A4_W - drawW) / 2;
                    const y = (A4_H - drawH) / 2;

                    const page = merged.addPage([A4_W, A4_H]);
                    page.drawImage(img, { x, y, width: drawW, height: drawH });
                }
            }

            const pdfBytes = await merged.save();
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const supplierInfo = data?.suppliers?.find((s: any) => s.name === supplier);
            const resolvedName = supplierInfo?.fullName || (supplier && supplier !== 'TODOS' ? supplier : 'TODOS');
            const firstName = resolvedName.split(' ')[0];
            
            const dateStr = new Date();
            const fmtDate = `${String(dateStr.getDate()).padStart(2, '0')}.${String(dateStr.getMonth() + 1).padStart(2, '0')}.${dateStr.getFullYear()}`;
            
            const fileName = `PAGAMENTO ${firstName.toUpperCase()} - ${fmtDate}.pdf`;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('PAGAMENTO gerado com sucesso!');
            setStatementModalOpen(false);
            setStatementFiles([]);

            try {
                const arr = new Uint8Array(pdfBytes);
                let binary = '';
                for (let i = 0; i < arr.byteLength; i++) {
                    binary += String.fromCharCode(arr[i]);
                }
                const pdfBase64 = btoa(binary);
                
                fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: fileName, pdfBase64 })
                })
                .then(res => res.json())
                .then(data => {
                    if(data.success) toast.success('E-mail do Statement enviado!');
                    else toast.error('Falha ao enviar e-mail: ' + data.error);
                })
                .catch(err => {
                    console.error(err);
                    toast.error('Erro de conexão no envio de e-mail.');
                });
            } catch (e) {
                console.error('Failed to send statement email:', e);
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao gerar Statement Final.');
        } finally {
            setStatementLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="material-symbols-outlined text-white text-6xl animate-spin">refresh</div>
                <p className="text-white/60 font-medium animate-pulse">Sincronizando com Base de Dados...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full h-full overflow-hidden flex flex-col">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/10 rounded-xl border border-black/10 backdrop-blur-md">
                        <span className="material-symbols-outlined text-white text-2xl font-bold">handshake</span>
                    </div>
                    <div className="leading-tight">
                        <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">Supplier Analytics</h1>
                        <p className="text-white/60 font-medium font-mono text-[11px] tracking-widest mt-0.5">
                            Análise Nativa de Saídas & Créditos
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setStatementModalOpen(true)}
                        disabled={!data || !data.ledger || data.ledger.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black text-[10px] tracking-widest uppercase h-9 px-4 rounded-xl shadow-lg transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">layers</span>
                        Recibo
                    </Button>
                    <Button
                        onClick={() => generateSupplierPDF(false)}
                        disabled={!data || !data.ledger || data.ledger.length === 0}
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-black text-[10px] tracking-widest uppercase h-9 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 min-h-0">
                <div className="bg-white/[0.03] rounded-2xl px-4 py-2.5">
                        <form onSubmit={handleFilterSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                            <div className="space-y-1 w-full">
                                <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Data Início</label>
                                <Input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-black/30 border-white/5 text-white fill-white rounded-lg h-9 text-xs w-full" 
                                />
                            </div>
                            <div className="space-y-1 w-full">
                                <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Data Final</label>
                                <Input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-black/30 border-white/5 text-white fill-white rounded-lg h-9 text-xs w-full" 
                                />
                            </div>
                            <div className="space-y-1 w-full">
                                <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Fornecedor</label>
                                <Select value={supplier} onValueChange={(val) => setSupplier(val || "TODOS")}>
                                    <SelectTrigger className="bg-black/30 border-white/5 text-white rounded-lg h-9 text-xs w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black/90 border-white/10 text-white rounded-lg backdrop-blur-3xl">
                                        <SelectItem value="TODOS">TODOS</SelectItem>
                                        {uniqueSuppliers.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 w-full">
                                <label className="text-[10px] font-black text-white/70 uppercase tracking-widest pl-1">Buscar LOC</label>
                                <Input 
                                    type="text" 
                                    placeholder="Ex: ABC123"
                                    value={locator}
                                    onChange={(e) => setLocator(e.target.value)}
                                    className="bg-black/30 border-white/5 text-white uppercase placeholder:normal-case placeholder:text-white/30 rounded-lg h-9 text-xs w-full" 
                                />
                            </div>
                            <div className="space-y-1 w-full flex flex-col justify-end">
                                <label className="text-[10px] font-black text-white/70 uppercase tracking-widest text-center hidden md:block">&nbsp;</label>
                                <Button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setPendingOnly(!pendingOnly); }}
                                    className={cn("w-full h-9 rounded-lg font-black text-[10px] transition-all", pendingOnly ? "bg-amber-500 hover:bg-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-black/30 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white")}
                                >
                                    {pendingOnly ? "SÓ PENDENTES" : "TODOS"}
                                </Button>
                            </div>
                            <div className="w-full flex flex-col justify-end space-y-1">
                                <label className="text-[10px] font-black text-white/70 uppercase tracking-widest text-center hidden md:block">&nbsp;</label>
                                <Button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-black hover:bg-black/80 text-white font-black text-xs h-9 rounded-lg shadow-lg transition-all"
                                >
                                    <span className={`material-symbols-outlined text-sm mr-1.5 ${loading ? 'animate-spin' : ''}`}>
                                        {loading ? 'refresh' : 'filter_list'}
                                    </span> 
                                    Aplicar
                                </Button>
                            </div>
                        </form>
                </div>

                {/* Metrics Overview */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-white/[0.03] rounded-2xl px-5 py-3 relative overflow-hidden">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Total Filtrado nas Saídas</p>
                        <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                            {data?.summary?.totalValue}
                            {loading && <span className="material-symbols-outlined text-sm animate-spin text-white/40">refresh</span>}
                        </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-2xl px-5 py-3">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Fornecedores Vinculados</p>
                        <div className="text-xl font-black text-white tracking-tighter">{data?.suppliers?.length || 0}</div>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-12 min-h-0">
                    {/* Suppliers List */}
                    <div className="lg:col-span-4 flex flex-col min-h-0">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <span className="material-symbols-outlined text-white/40 text-sm">account_balance_wallet</span>
                            <h2 className="font-bold text-white/60 uppercase tracking-widest text-[10px]">Créditos e Saldos</h2>
                        </div>
                        <div className="bg-white/[0.03] rounded-2xl p-1.5 flex-1 overflow-hidden flex flex-col min-h-[300px] max-h-[520px]">
                            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-0.5">
                                {data?.suppliers?.length === 0 ? (
                                    <div className="p-4 text-center text-white/30 text-xs font-mono mt-4">Nenhum fornecedor registrado.</div>
                                ) : null}

                                {data?.suppliers?.map((s: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                                            supplier === s.name
                                                ? "bg-white/10"
                                                : "bg-white/[0.02] hover:bg-white/[0.05]"
                                        )}
                                        onClick={() => setSupplier(s.name)}
                                    >
                                        {/* Status dot */}
                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                                            s.saldoType === 'POSITIVE' ? 'bg-emerald-400' :
                                            s.saldoType === 'NEGATIVE' ? 'bg-blue-400' : 'bg-white/20'
                                        )} />

                                        {/* Name */}
                                        <span className={cn("text-[11px] font-black uppercase tracking-wide flex-1 truncate", supplier === s.name ? "text-white" : "text-white/70")}>
                                            {s.name}
                                        </span>

                                        {/* Crédito */}
                                        <span className="text-emerald-400 font-mono text-[10px] shrink-0">{s.creditOk}</span>
                                        <span className="text-white/10 text-[9px]">|</span>
                                        {/* Devendo */}
                                        <span className="text-blue-400 font-mono text-[10px] shrink-0">{s.debt}</span>
                                        <span className="text-white/10 text-[9px]">|</span>

                                        {/* Saldo + copy */}
                                        <div
                                            className="flex items-center gap-1 cursor-pointer group/copy shrink-0"
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(s.saldo); }}
                                            title="Copiar Saldo"
                                        >
                                            <span className="text-white font-black text-[11px]">{s.saldo}</span>
                                            <span className="material-symbols-outlined text-[10px] text-white/20 group-hover/copy:text-white/60 transition-colors">content_copy</span>
                                        </div>

                                        {/* PIX copy */}
                                        {s.pix && (
                                            <div
                                                className="flex items-center gap-0.5 cursor-pointer group/pix shrink-0"
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(s.pix); }}
                                                title={`Copiar PIX: ${s.pix}`}
                                            >
                                                <span className="material-symbols-outlined text-[11px] text-emerald-400/40 group-hover/pix:text-emerald-400 transition-colors">tag</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Ledger Table */}
                    <div className="lg:col-span-8 flex flex-col gap-2.5 min-h-0">

                        {/* Ledger header + copy button */}
                        <div className="flex items-center justify-between gap-2 px-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-white/40 text-sm">payments</span>
                                <h2 className="font-bold text-white/60 uppercase tracking-widest text-[10px]">Registros</h2>
                                <Badge className="bg-white/5 text-white/50 font-black px-2 py-0 rounded-full text-[9px] ml-1">
                                    {data?.ledger?.length || 0} SAÍDAS
                                </Badge>
                            </div>
                            <Button
                                onClick={() => copyToClipboard(data?.generated?.summary)}
                                disabled={!data?.generated?.summary}
                                className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/10 disabled:opacity-30 text-white/60 hover:text-white font-black text-[9px] tracking-widest uppercase h-7 px-3 rounded-full transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                Copiar Resumo
                            </Button>
                        </div>

                        {/* Ledger Table */}
                        <div className="bg-white/[0.03] rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[250px] max-h-[520px]">
                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur-md">
                                        <tr className="text-[10px] uppercase tracking-widest text-white/30">
                                            <th className="px-3 py-2 font-black">Data</th>
                                            <th className="px-3 py-2 font-black">LOC</th>
                                            <th className="px-3 py-2 font-black text-right">Preço/Mi</th>
                                            <th className="px-3 py-2 font-black text-right">Valor</th>
                                            <th className="px-3 py-2 font-black text-right">Taxas</th>
                                            <th className="px-3 py-2 font-black text-right">Total</th>
                                            <th className="px-3 py-2 font-black text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-medium">
                                        {data?.ledger?.map((row: any, i: number) => {
                                            const reqSupp = supplier !== 'TODOS' ? supplier : null;
                                            const taxFaded = reqSupp
                                                ? (row.taxSupplier !== reqSupp || row.isTaxesPaid)
                                                : row.isTaxesPaid;
                                            const valueFaded = reqSupp
                                                ? (row.milesSupplier !== reqSupp || row.isMilesPaid)
                                                : row.isMilesPaid;

                                            const fmtPrice = row.price && row.price !== '0'
                                                ? `R$ ${String(row.price).replace('R$', '').trim()}`
                                                : '—';
                                            const fmtValue = row.value && row.value !== '0'
                                                ? `R$ ${String(row.value).replace('R$', '').trim()}`
                                                : '—';
                                            const fmtTax = row.tax && row.tax !== '0'
                                                ? `R$ ${String(row.tax).replace('R$', '').trim()}`
                                                : '—';
                                            const fmtTotal = row.total && row.total !== '0' && row.total !== ''
                                                ? (String(row.total).startsWith('R$') ? row.total : `R$ ${row.total}`)
                                                : '—';

                                            return (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                                <td className="px-3 py-1.5 text-white/40 font-mono whitespace-nowrap">{row.date}</td>
                                                <td className="px-3 py-1.5 text-white font-black group-hover:text-amber-200 transition-colors whitespace-nowrap">{row.loc}</td>
                                                <td className={cn("px-3 py-1.5 text-right whitespace-nowrap font-mono", valueFaded ? "text-white/20" : "text-white/60")}>{fmtPrice}</td>
                                                <td className={cn("px-3 py-1.5 text-right whitespace-nowrap font-mono", valueFaded ? "text-white/20" : "text-white/70")}>{fmtValue}</td>
                                                <td className={cn("px-3 py-1.5 text-right whitespace-nowrap font-mono", taxFaded ? "text-white/20" : "text-white/70")}>{fmtTax}</td>
                                                <td className="px-3 py-1.5 text-right text-white font-black whitespace-nowrap text-[13px]">{fmtTotal}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <Badge
                                                        className={cn(
                                                            "text-[8px] font-black uppercase h-4 rounded-full px-2 flex items-center justify-center w-fit mx-auto",
                                                            row.issueStatus === 'PENDENTE'
                                                                ? "bg-amber-500/20 text-amber-400"
                                                                : "bg-emerald-500/20 text-emerald-400"
                                                        )}
                                                    >
                                                        {row.issueStatus}
                                                    </Badge>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        {/* Credit rows */}
                                        {supplier && supplier !== 'TODOS' && (() => {
                                            const selSupplier = data?.suppliers?.find((s: any) => s.name === supplier);
                                            return selSupplier?.creditDetails?.map((c: any, ci: number) => (
                                                <tr key={`credit-${ci}`} className="hover:bg-emerald-500/5 transition-colors">
                                                    <td className="px-3 py-1.5 text-white/20 font-mono whitespace-nowrap text-[10px]">—</td>
                                                    <td className="px-3 py-1.5 text-emerald-400 font-black whitespace-nowrap max-w-[110px] truncate" title={c.detalhes}>{c.detalhes || '—'}</td>
                                                    <td className="px-3 py-1.5 text-right text-white/20 text-[10px]">—</td>
                                                    <td className="px-3 py-1.5 text-right text-white/20 text-[10px]">—</td>
                                                    <td className="px-3 py-1.5 text-right text-white/20 text-[10px]">—</td>
                                                    <td className="px-3 py-1.5 text-right text-emerald-400 font-black whitespace-nowrap">{c.valorFmt}</td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <Badge className="text-[8px] font-black uppercase h-4 rounded-full px-2 flex items-center justify-center w-fit mx-auto bg-emerald-500/15 text-emerald-400">
                                                            CRÉDITO
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                        {data?.ledger?.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-10 text-white/20 font-mono text-[11px]">Ajuste os filtros.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Preparar Statement */}
            <AnimatePresence>
                {statementModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-[600px] shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400">layers</span>
                                    <div>
                                        <h2 className="text-[12px] font-black text-white uppercase tracking-widest">Recibo</h2>
                                        <p className="text-[10px] text-white/50 font-mono">Merge Statement + Comprovantes</p>
                                    </div>
                                </div>
                                <button onClick={() => setStatementModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setStatementDragging(true); }}
                                onDragLeave={() => setStatementDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setStatementDragging(false); handleStatementFiles(e.dataTransfer.files); }}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                                    statementDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleStatementFiles(e.target.files)}
                                />
                                <span className="material-symbols-outlined text-[32px] text-emerald-400/60 mb-2 block">upload_file</span>
                                <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                                    Solte PDFs ou Imagens aqui
                                </p>
                                <p className="text-[9px] text-white/30 mt-1 font-mono">Comprovantes, etc (O Statement PDF é gerado e anexado sozinho)</p>
                            </div>

                            {statementFiles.length > 0 && (
                                <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
                                    {statementFiles.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-black/40 border border-white/5 p-2 px-3 rounded-md">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="material-symbols-outlined text-[14px] text-white/50">draft</span>
                                                <span className="text-[10px] text-white/80 font-mono truncate">{f.name}</span>
                                            </div>
                                            <button onClick={() => setStatementFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400/60 hover:text-red-400 transition-colors">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                onClick={handleFullStatement}
                                disabled={statementLoading}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] tracking-widest uppercase transition-all"
                            >
                                {statementLoading ? <span className="material-symbols-outlined animate-spin text-[16px] mr-2">refresh</span> : null}
                                {statementLoading ? 'Processando...' : 'GERAR RECIBO DE PAGAMENTO'}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
