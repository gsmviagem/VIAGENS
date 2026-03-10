'use client';

import React, { useState } from 'react';
import {
    Search as SearchIcon,
    MapPin,
    Calendar,
    Users,
    ArrowRight,
    PlaneTakeoff,
    PlaneLanding,
    Clock,
    Zap,
    Filter,
    ArrowRightLeft,
    Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockResults = [
    { id: 1, airline: 'Azul', price: '45.000', currency: 'PTS', departure: 'GRU', arrival: 'CNF', date: '20/03', duration: '1h 15m', type: 'Direto' },
    { id: 2, airline: 'LATAM', price: 'R$ 890', currency: 'BRL', departure: 'CGH', arrival: 'SDU', date: '21/03', duration: '1h 05m', type: 'Direto' },
    { id: 3, airline: 'Smiles', price: '28.500', currency: 'PTS', departure: 'GIG', arrival: 'BSB', date: '20/03', duration: '1h 50m', type: 'Parada em VCP' },
]

export default function BuscaPage() {
    return (
        <div className="space-y-10">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Vector <span className="text-primary font-normal">Search</span></h1>
                    <p className="text-slate-400 max-w-xl">Cruze dados de múltiplas companhias para encontrar a rota mais eficiente em milhas ou dinheiro.</p>
                </div>
                <div className="flex gap-3">
                    <Badge className="bg-primary/10 text-primary border-primary/20 py-2 px-4 rounded-xl flex items-center gap-2 font-bold select-none cursor-default">
                        <Users size={14} /> 12 Active Nodes
                    </Badge>
                </div>
            </motion.div>

            {/* Glass Search Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 rounded-[32px] border border-white/10 shadow-[0_0_50px_-12px_rgba(0,255,200,0.1)]"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Departure</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input placeholder="Origin City/IATA" className="pl-11 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold" />
                        </div>
                    </div>

                    <div className="relative md:flex items-center justify-center pt-8">
                        <Button variant="ghost" className="w-12 h-12 rounded-full border border-white/10 glass-panel text-primary hover:bg-primary hover:text-background-dark transition-all absolute z-10">
                            <ArrowRightLeft size={18} />
                        </Button>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Arrival</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input placeholder="Destination City/IATA" className="pl-11 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors ml-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input type="date" className="pl-11 h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-primary text-lg font-bold" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                    <div className="flex gap-4">
                        <Badge variant="outline" className="border-white/10 text-slate-400 py-1.5 px-4 rounded-lg flex items-center gap-2">
                            <Users size={14} /> 1 Adult
                        </Badge>
                        <Badge variant="outline" className="border-white/10 text-slate-400 py-1.5 px-4 rounded-lg flex items-center gap-2">
                            <Briefcase size={14} /> Economy
                        </Badge>
                    </div>
                    <Button className="w-full sm:w-auto px-12 h-14 bg-primary text-background-dark font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(0,255,200,0.3)] hover:brightness-110 flex items-center gap-3">
                        <SearchIcon size={20} /> INITIATE SCAN
                    </Button>
                </div>
            </motion.div>

            {/* Results Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        Live Data Feed <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,200,1)]"></span>
                    </h2>
                    <Button variant="ghost" className="text-slate-500 hover:text-white flex items-center gap-2">
                        <Filter size={16} /> Advanced Filters
                    </Button>
                </div>

                <div className="grid gap-4">
                    {mockResults.map((flight, idx) => (
                        <motion.div
                            key={flight.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center gap-8 group hover:border-primary/20 transition-all hover:bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-4 min-w-[150px]">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl border flex items-center justify-center",
                                    flight.airline === 'Azul' ? 'border-primary/20 bg-primary/10 text-primary' :
                                        flight.airline === 'LATAM' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                                            'border-orange-500/20 bg-orange-500/10 text-orange-400'
                                )}>
                                    <PlaneTakeoff size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-white">{flight.airline}</div>
                                    <div className="text-[10px] text-slate-500 uppercase font-black">Direct Access</div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-between md:justify-around px-4">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white">{flight.departure}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">{flight.date}</div>
                                </div>
                                <div className="flex flex-col items-center gap-1 flex-1 max-w-[120px] px-4">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter opacity-70 italic">{flight.duration}</div>
                                    <div className="h-[2px] w-full bg-slate-800 relative rounded-full">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"></div>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-background-dark border border-primary rounded-full flex items-center justify-center">
                                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-primary font-bold uppercase tracking-widest">{flight.type}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white">{flight.arrival}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">{flight.date}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pr-2">
                                <div className="text-right">
                                    <div className="text-2xl font-black text-primary drop-shadow-[0_0_4px_rgba(0,255,200,0.3)]">{flight.price}</div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{flight.currency}</div>
                                </div>
                                <Button className="bg-white/5 border border-white/10 text-white rounded-xl h-10 px-6 group-hover:bg-primary group-hover:text-background-dark transition-all font-black text-xs">
                                    SELECT <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
