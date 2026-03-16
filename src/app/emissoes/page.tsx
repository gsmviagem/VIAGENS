'use client';

import React, { useState, useEffect } from 'react';
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
import { createClient } from '@/utils/supabase/client';

export default function EmissoesPage() {
    const supabase = createClient();
    const [data, setData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchEmissoes();
    }, []);

    const fetchEmissoes = async () => {
        setIsLoading(true);
        const { data: dbData, error } = await supabase
            .from('extracted_bookings')
            .select('*')
            .order('flight_date', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error);
        } else {
            setData(dbData || []);
        }
        setIsLoading(false);
    };

    const handleExport = () => {
        if (data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Emissoes");
        XLSX.writeFile(workbook, `GSMVIAGEM_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredData = data.filter(item =>
        item.locator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destination?.toLowerCase().includes(searchTerm.toLowerCase())
    );

        <div className="space-y-12 w-full">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl font-black text-black tracking-tight">Operational Ledger</h1>
                    <p className="text-black/70 max-w-xl font-bold">Histórico centralizado de todas as emissões capturadas via auto-extração ou busca manual.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleExport}
                        disabled={data.length === 0}
                        className="glass-panel border-black/10 text-black/60 hover:bg-black/5 uppercase text-[10px] font-black tracking-widest px-6 disabled:opacity-50"
                    >
                        <FileDown className="mr-2 h-4 w-4 text-primary" /> Export Excel
                    </Button>
                    <Button
                        onClick={fetchEmissoes}
                        className="bg-black text-white font-bold hover:bg-primary transition-all"
                    >
                        <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Sincronizar Tudo
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
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-slate-500 font-black uppercase tracking-widest animate-pulse">
                                            Retrieving operational data...
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-slate-500 font-black uppercase tracking-widest">
                                            No records found in the ledger.
                                        </td>
                                    </tr>
                                ) : filteredData.map((item, idx) => (
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
                                                <span className="text-xl font-black text-white tracking-widest uppercase">{item.locator}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 border-b border-white/5 text-slate-300 font-bold tracking-tight uppercase">
                                            {item.passenger_name}
                                        </td>
                                        <td className="p-6 border-b border-white/5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-white font-black text-sm">
                                                    {item.origin} <Plane size={14} className="text-primary rotate-45" /> {item.destination}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">
                                                    <Calendar size={10} /> {item.flight_date} • {item.airline}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 border-b border-white/5 text-right">
                                            <div className="text-lg font-black text-primary drop-shadow-[0_0_4px_rgba(0,255,200,0.3)]">
                                                {item.miles_used?.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{item.airline} Points</div>
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
