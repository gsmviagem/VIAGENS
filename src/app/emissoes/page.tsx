'use client';

import React, { useEffect, useState } from 'react';
import {
    Download,
    Search as SearchIcon,
    Filter,
    MoreHorizontal,
    CreditCard,
    ArrowRightLeft,
    Calendar,
    User,
    MapPin,
    TrendingUp,
    FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";

// Formats full date to abbreviated format DD/MM/YYYY
function formatDate(dateStr: string) {
    const dt = new Date(dateStr)
    return dt.toLocaleDateString('pt-BR')
}

export default function EmissoesPage() {
    const [emissions, setEmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            const { data } = await supabase
                .from('extracted_bookings')
                .select('*')
                .order('flight_date', { ascending: false });

            setEmissions(data || []);
            setLoading(false);
        }
        fetchData();
    }, []);

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Financial <span className="text-primary font-normal">Ledger</span></h1>
                    <p className="text-slate-400 max-w-xl">Consulte todas as emissões extraídas e integradas ao ecossistema GSMVIAGEM.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="glass-panel border-white/10 text-slate-300 hover:bg-white/5">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button className="bg-primary text-background-dark font-bold hover:brightness-110">
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Manual Sync
                    </Button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-6 border border-white/5"
            >
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1 group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search by locator, passenger or airline..."
                            className="pl-11 h-12 bg-white/5 border-white/10 focus-visible:ring-primary text-slate-200 w-full rounded-xl transition-all"
                        />
                    </div>
                    <Button variant="outline" className="h-12 px-6 glass-panel border-white/10 text-slate-300 hover:bg-white/5 rounded-xl">
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                </div>

                <div className="rounded-xl border border-white/5 overflow-hidden bg-black/20">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent bg-white/5">
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-6 py-4">Status / Carrier</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-4">Locator</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-4">Passenger</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-4">Route / Date</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-4 text-right">Points / Cash</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-4 text-center">Sync</TableHead>
                                <TableHead className="text-right pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20 text-slate-500 italic">Loading encrypted ledger data...</TableCell>
                                </TableRow>
                            ) : emissions.length > 0 ? (
                                emissions.map((e, idx) => (
                                    <motion.tr
                                        key={e.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-white/5 hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-8 rounded-full",
                                                    e.airline === 'azul' ? 'bg-primary' : e.airline === 'latam' ? 'bg-red-500' : 'bg-orange-500'
                                                )}></div>
                                                <div>
                                                    <div className="text-sm font-bold text-white uppercase">{e.airline}</div>
                                                    <div className="text-[10px] text-slate-500 font-medium font-mono uppercase">Node TR-{idx + 100}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-sm font-black text-primary font-mono bg-primary/10 px-2 py-1 rounded border border-primary/20">{e.locator}</code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-bold text-slate-200">{e.passenger_name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1 group-hover:text-primary transition-colors">
                                                <User size={10} /> Priority Access
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                                <MapPin size={12} className="text-slate-500" />
                                                <span>{e.origin}</span>
                                                <ArrowRightLeft size={10} className="text-primary opacity-50" />
                                                <span>{e.destination}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                                <Calendar size={10} /> {formatDate(e.flight_date)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-sm font-black text-white">{Number(e.miles_used || 0).toLocaleString()} <span className="text-[10px] text-slate-500">PTS</span></div>
                                            {(e.cash_paid || e.taxes) && (
                                                <div className="text-[10px] text-slate-500 font-bold mt-1">R$ {Number(e.cash_paid || 0).toFixed(2)} + TX</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn(
                                                "rounded-full px-3 py-0.5 border-none text-[10px] font-black uppercase tracking-tighter",
                                                e.status === 'synced' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'
                                            )}>
                                                {e.status === 'synced' ? 'Vaulted' : 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-lg">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <FileText size={48} className="text-slate-800" />
                                            <p className="text-slate-500 italic">End of ledger reached. No records found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </motion.div>
        </div>
    )
}
