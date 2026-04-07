"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function FornecedoresPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplier, setSupplier] = useState("TODOS");
    const [locator, setLocator] = useState("");
    const [pendingOnly, setPendingOnly] = useState(true);

    const [uniqueSuppliers, setUniqueSuppliers] = useState<string[]>([]);

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
                if (uniqueSuppliers.length === 0 && json.data.suppliers) {
                    setUniqueSuppliers(json.data.suppliers.map((s:any) => s.name));
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
        const clean = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const generateSupplierPDF = () => {
        if (!data || !data.ledger || data.ledger.length === 0) {
            toast.error('Nenhum dado para exportar.');
            return;
        }

        const doc = new jsPDF() as any;
        const pageWidth = doc.internal.pageSize.width;
        const PRIMARY: [number, number, number] = [10, 10, 20];
        const ACCENT: [number, number, number] = [16, 185, 129];
        const AMBER: [number, number, number] = [245, 158, 11];

        // --- HEADER ---
        doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setFillColor(0, 0, 10);
        doc.triangle(pageWidth - 80, 0, pageWidth, 0, pageWidth, 18, 'F');
        doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]);
        doc.rect(0, 18, pageWidth, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('DIMAIS CORP', 15, 12);

        // "SUPPLIER" badge
        doc.setFillColor(245, 158, 11);
        doc.roundedRect(pageWidth - 46, 4, 31, 10, 1.5, 1.5, 'F');
        doc.setTextColor(10, 10, 20);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('SUPPLIER', pageWidth - 30.5, 9.5, { align: 'center', baseline: 'middle' });

        // --- INFO ROW ---
        const infoY = 28;
        const supplierInfo = data.suppliers?.find((s: any) => s.name === supplier);
        const resolvedName = supplierInfo?.fullName || (supplier && supplier !== 'TODOS' ? supplier : 'TODOS OS FORNECEDORES');
        const supplierLabel = resolvedName;

        // Left box: Supplier name
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, infoY, 85, 18, 1.5, 1.5, 'F');
        doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]);
        doc.rect(15, infoY + 3, 2, 12, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(140, 140, 140);
        doc.text('SUPPLIER', 22, infoY + 7);
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(supplierLabel.length > 28 ? supplierLabel.substring(0, 28) + '...' : supplierLabel, 22, infoY + 13);

        // Center: date
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Emitido em:', 108, infoY + 10);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' }), 124, infoY + 10);

        // Right summary box
        const totalBruto = data.ledger.reduce((acc: number, row: any) => acc + parseCurrencyBR(row.total), 0);
        // Credits: find selected supplier credits
        const creditOkVal = supplierInfo ? parseCurrencyBR(supplierInfo.creditOk) : 0;
        const netTotal = totalBruto - creditOkVal;

        const sumBoxX = pageWidth - 60;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.3);
        doc.roundedRect(sumBoxX, infoY, 45, 18, 1.5, 1.5, 'FD');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Total Bruto', sumBoxX + 3, infoY + 6);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sumBoxX + 42, infoY + 6, { align: 'right' });

        if (creditOkVal > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('Créditos', sumBoxX + 3, infoY + 10.5);
            doc.setTextColor(16, 120, 80);
            doc.setFont('helvetica', 'bold');
            doc.text(`-R$ ${creditOkVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sumBoxX + 42, infoY + 10.5, { align: 'right' });
        }

        const finalColor = netTotal <= 0 ? ACCENT : AMBER;
        doc.setFillColor(finalColor[0], finalColor[1], finalColor[2]);
        doc.rect(sumBoxX, infoY + 13, 45, 5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SALDO LÍQ.', sumBoxX + 3, infoY + 16.5);
        doc.text(`R$ ${Math.abs(netTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sumBoxX + 42, infoY + 16.5, { align: 'right' });

        // --- LEDGER TABLE ---
        const ledgerRows = data.ledger.map((row: any) => [
            row.date || '-',
            row.loc || '-',
            row.miles ? `${row.miles}K` : '-',
            row.price ? `R$ ${String(row.price).replace('R$', '').trim()}` : '-',
            row.tax ? `R$ ${String(row.tax).replace('R$', '').trim()}` : 'R$ 0,00',
            row.total ? String(row.total).replace('R$', '').trim() : '0,00',
        ]);

        autoTable(doc, {
            startY: infoY + 28,
            head: [['Data', 'LOC', 'Milhas', 'Preço/Milha', 'Taxas', 'Total (R$)']],
            body: ledgerRows,
            theme: 'grid',
            headStyles: {
                fillColor: PRIMARY,
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: [50, 50, 50],
                lineColor: [235, 235, 235]
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } }
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
                headStyles: { textColor: [100, 100, 100], fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [50, 50, 50] },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
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

        const dateStr = new Date();
        const fmtDate = `${String(dateStr.getDate()).padStart(2, '0')}.${String(dateStr.getMonth() + 1).padStart(2, '0')}.${dateStr.getFullYear()}`;
        const firstName = supplierLabel.split(' ')[0];
        const fileSupplier = supplier && supplier !== 'TODOS' ? firstName : 'ALL-SUPPLIERS';
        doc.save(`STATEMENT (${fileSupplier}) - ${fmtDate}.pdf`);
        toast.success('PDF exportado com sucesso!');
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
                <Button
                    onClick={generateSupplierPDF}
                    disabled={!data || !data.ledger || data.ledger.length === 0}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-black text-[10px] tracking-widest uppercase h-9 px-5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    Exportar PDF
                </Button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4 min-h-0">
                {/* Filter Controls */}
                <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-2xl">
                    <CardContent className="px-4 py-2.5">
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
                    </CardContent>
                </Card>

                {/* Metrics Overview */}
                <div className="grid gap-3 md:grid-cols-2">
                    <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -z-10 group-hover:bg-white/10 transition-all"></div>
                        <CardHeader className="pb-0 pt-2.5 px-5">
                            <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Filtrado nas Saídas</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-2.5">
                            <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                                {data?.summary?.totalValue}
                                {loading && <span className="material-symbols-outlined text-sm animate-spin text-white">refresh</span>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/20 border-white/10 backdrop-blur-xl rounded-[1rem] shadow-xl">
                        <CardHeader className="pb-0 pt-2.5 px-5">
                            <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-widest">Créditos Ativos</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-2.5">
                            <div className="text-xl font-black text-white tracking-tighter">
                                {data?.suppliers?.length} <span className="text-xs text-white/50 font-medium ml-1">Fornecedores Vinculados</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-3 lg:grid-cols-12 min-h-0">
                    {/* Suppliers List */}
                    <div className="lg:col-span-4 space-y-2 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5 px-2 shrink-0">
                            <span className="material-symbols-outlined text-white text-base">account_balance_wallet</span>
                            <h2 className="font-bold text-white uppercase tracking-widest text-xs">Créditos e Saldos</h2>
                        </div>
                        <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-1.5 rounded-[1rem] shadow-2xl flex-1 overflow-hidden flex flex-col min-h-[300px]">
                            <div className="space-y-1.5 overflow-y-auto pr-1 flex flex-col flex-1 custom-scrollbar">
                                {data?.suppliers?.length === 0 ? (
                                    <div className="p-4 text-center text-white/50 text-xs font-mono mt-4">Nenhum fornecedor registrado.</div>
                                ) : null}
                                
                                {data?.suppliers?.map((s: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className={cn(
                                            "flex flex-col p-2 rounded-xl border transition-all cursor-pointer",
                                            supplier === s.name
                                                ? "bg-white/20 border-white/30 shadow-lg" 
                                                : "bg-black/10 border-white/5 hover:bg-black/30"
                                        )}
                                        onClick={() => setSupplier(s.name)}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={cn("text-[11px] font-black uppercase tracking-wide", supplier === s.name ? "text-white" : "text-white/80")}>
                                                {s.name}
                                            </span>
                                            <Badge className={cn("text-[9px] font-black uppercase px-1.5 py-0 rounded", 
                                                s.saldoType === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                                                s.saldoType === 'NEGATIVE' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/50'
                                            )}>
                                                {s.saldoType === 'POSITIVE' ? 'CRÉDITO' : s.saldoType === 'NEGATIVE' ? 'DÍVIDA' : 'ZERADO'}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                                            <div className="bg-black/20 p-1 rounded-lg flex flex-col items-center">
                                                <span className="text-[9px] text-white/40 uppercase font-black mb-0">Pago (OK)</span>
                                                <span className="text-emerald-400 font-bold leading-tight">{s.creditOk}</span>
                                            </div>
                                            <div className="bg-black/20 p-1 rounded-lg flex flex-col items-center">
                                                <span className="text-[9px] text-white/40 uppercase font-black mb-0">Devendo</span>
                                                <span className="text-blue-400 font-bold leading-tight">{s.debt}</span>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 text-center bg-white/5 border border-white/10 p-1 rounded-lg flex justify-between items-center px-2">
                                            <span className="text-[9px] text-white/60 uppercase font-black">Saldo Líquido</span>
                                            <span className="text-white font-black text-xs leading-none py-0.5">{s.saldoType === 'NEGATIVE' ? '-' : ''}{s.saldo}</span>
                                        </div>
                                        {(s.creditPending && s.creditPending !== 'R$ 0,00') && (
                                            <div className="mt-1 text-center text-[9px] text-amber-200/60 uppercase font-black">
                                                + {s.creditPending} pendente
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Ledger Table and Text Generators */}
                    <div className="lg:col-span-8 flex flex-col gap-3">
                        {/* Generative Texts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 shrink-0">
                            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] p-2 shadow-2xl flex flex-col">
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <span className="text-[10px] uppercase font-black text-white/60 tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">subject</span> Detalhado
                                    </span>
                                    <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-white/50 hover:text-white hover:bg-white/10 rounded-md" onClick={() => copyToClipboard(data?.generated?.full)}>
                                        <span className="material-symbols-outlined text-[11px] mr-1">content_copy</span> COPIAR
                                    </Button>
                                </div>
                                <textarea 
                                    readOnly 
                                    value={data?.generated?.full || ''} 
                                    className="w-full min-h-[75px] h-[75px] bg-black/40 border-none rounded-lg text-white/80 text-[11px] font-mono p-2 focus:outline-none resize-none custom-scrollbar leading-tight"
                                    placeholder="..."
                                ></textarea>
                            </div>
                            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] p-2 shadow-2xl flex flex-col">
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <span className="text-[10px] uppercase font-black text-white/60 tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">short_text</span> Resumo
                                    </span>
                                    <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-white/50 hover:text-white hover:bg-white/10 rounded-md" onClick={() => copyToClipboard(data?.generated?.summary)}>
                                        <span className="material-symbols-outlined text-[11px] mr-1">content_copy</span> COPIAR
                                    </Button>
                                </div>
                                <textarea 
                                    readOnly 
                                    value={data?.generated?.summary || ''} 
                                    className="w-full min-h-[75px] h-[75px] bg-black/40 border-none rounded-lg text-white/80 text-[11px] font-mono p-2 focus:outline-none resize-none custom-scrollbar leading-tight"
                                    placeholder="..."
                                ></textarea>
                            </div>
                        </div>

                        {/* Ledger Table */}
                        <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
                            <div className="flex items-center justify-between gap-2 px-1 shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-white text-base">payments</span>
                                    <h2 className="font-bold text-white uppercase tracking-widest text-xs">Registros</h2>
                                </div>
                                <Badge className="bg-black text-white hover:bg-black/80 font-black px-2 py-0 rounded text-[10px]">
                                    {data?.ledger?.length || 0} SAÍDAS
                                </Badge>
                            </div>
                            
                            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[250px]">
                                <div className="overflow-y-auto custom-scrollbar flex-1">
                                    <table className="w-full text-left text-[11px]">
                                        <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-md">
                                            <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/50">
                                                <th className="px-3 py-2 font-black">Data</th>
                                                <th className="px-3 py-2 font-black">LOC</th>
                                                <th className="px-3 py-2 font-black">Fornecedor</th>
                                                <th className="px-3 py-2 font-black text-right">Total</th>
                                                <th className="px-3 py-2 font-black text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-medium">
                                            {data?.ledger?.map((row: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-3 py-1.5 text-white/60 font-mono whitespace-nowrap">{row.date}</td>
                                                    <td className="px-3 py-1.5 text-white font-black group-hover:text-amber-200 transition-colors whitespace-nowrap">{row.loc}</td>
                                                    <td className="px-3 py-1.5 text-white/80 text-[10px] uppercase max-w-[120px] truncate" title={row.supplier}>{row.supplier || row.product}</td>
                                                    <td className="px-3 py-1.5 text-right text-white font-black whitespace-nowrap">{row.total !== '0' && row.total !== '' ? `R$ ${row.total}` : '-'}</td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <Badge 
                                                            className={cn(
                                                                "text-[9px] font-black uppercase h-5 rounded px-1.5 flex items-center justify-center w-fit mx-auto",
                                                                row.issueStatus === 'PENDENTE' 
                                                                    ? "bg-amber-500 text-white border-none" 
                                                                    : "bg-emerald-500 text-white border-none"
                                                            )}
                                                        >
                                                            {row.issueStatus}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                            {data?.ledger?.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8 text-white/30 font-mono text-[11px]">Ajuste os filtros.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
