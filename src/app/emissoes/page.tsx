'use client';

import React, { useState } from 'react';
import {
    Search,
    Filter,
    Download,
    RefreshCw,
    FileDown,
    Plane,
    Calendar,
    User,
    Ticket,
    ExternalLink,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';

const mockEmissoes = [
    { id: 1, locator: 'AYX7W2', passenger: 'MARIA SILVA', origin: 'GRU', destination: 'JFK', date: '15/05/2026', miles: '85.000', airline: 'Azul', status: 'synced' },
    { id: 2, locator: 'B8K2R1', passenger: 'JOAO PEREIRA', origin: 'VCP', destination: 'LIS', date: '20/06/2026', miles: '120.000', airline: 'Azul', status: 'pending_sync' },
    { id: 3, locator: 'K9L0P3', passenger: 'ANDRE LOPES', origin: 'GIG', destination: 'MCO', date: '12/04/2026', miles: '65.000', airline: 'Azul', status: 'synced' },
];

export default function EmissoesPage() {
    const [data, setData] = useState(mockEmissoes);
    const [searchTerm, setSearchTerm] = useState('');

    const handleExport = () => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Emissoes");
        XLSX.writeFile(workbook, "GSMVIAGEM_HUB_Report.xlsx");
    };

    return (
        <div className="space-y-8 pb-20">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Operational <span className="text-primary font-normal">Ledger</span></h1>
                    <p className="text-slate-400 max-w-xl">Histórico centralizado de todas as emissões capturadas via auto-extração ou busca manual.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleExport}
                        className="glass-panel border-white/10 text-slate-300 hover:bg-white/5 uppercase text-[10px] font-black tracking-widest px-6"
                    >
                        <FileDown className="mr-2 h-4 w-4 text-primary" /> Export Excel
                    </Button>
                    <Button className="bg-primary text-background-dark font-bold hover:brightness-110">
                        <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar Tudo
                    </Button>
                </div>
            </motion.div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <Input
                        placeholder="Search locator, passenger or route..."
                        className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary font-bold text-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-14 glass-panel border-white/10 text-white text-lg font-bold rounded-2xl">
                    <Filter className="mr-2 h-5 w-5 text-primary" /> Filter
                </Button>
            </div>

            {/* Ledger Table */}
            <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Locator</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Passenger</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Details</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 text-right">Cost (Miles)</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 text-center">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {data.map((item, idx) => (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-white/[0.01] transition-colors group"
                                    >
                                        <td className="p-6 border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-8 bg-primary/20 rounded-full group-hover:bg-primary transition-colors"></div>
                                                <span className="text-xl font-black text-white tracking-widest">{item.locator}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 border-b border-white/5 text-slate-300 font-bold tracking-tight uppercase">
                                            {item.passenger}
                                        </td>
                                        <td className="p-6 border-b border-white/5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-white font-black text-sm">
                                                    {item.origin} <Plane size={14} className="text-primary rotate-45" /> {item.destination}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">
                                                    <Calendar size={10} /> {item.date} • {item.airline}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 border-b border-white/5 text-right">
                                            <div className="text-lg font-black text-primary drop-shadow-[0_0_4px_rgba(0,255,200,0.3)]">{item.miles}</div>
                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Azul Points</div>
                                        </td>
                                        <td className="p-6 border-b border-white/5 text-center">
                                            <Badge variant="outline" className={cn(
                                                "border-none rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-widest",
                                                item.status === 'synced' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'
                                            )}>
                                                {item.status === 'synced' ? 'Vaulted' : 'Pending'}
                                            </Badge>
                                        </td>
                                        <td className="p-6 border-b border-white/5 text-right">
                                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-xl">
                                                <ExternalLink size={18} />
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
