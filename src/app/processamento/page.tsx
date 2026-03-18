'use client';

import React, { useState, useEffect } from 'react';
import {
    Terminal,
    Copy,
    Zap,
    Check,
    AlertCircle,
    LayoutTemplate,
    User,
    Plane,
    Globe,
    CreditCard,
    Users,
    Plus,
    Trash2,
    Book as BookIcon,
    Wallet,
    Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { parseFlightMessage, ProcessedData } from '@/utils/message-parser';
import { Badge } from '@/components/ui/badge';

type Shortcut = {
    id: string;
    label: string;
    text: string;
};

export default function BookPage() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<ProcessedData | null>(null);
    const [isCopying, setIsCopying] = useState(false);

    // Shortcut States
    const [contas, setContas] = useState<Shortcut[]>([]);
    const [pagamentos, setPagamentos] = useState<Shortcut[]>([]);
    
    // Form States
    const [newLabel, setNewLabel] = useState('');
    const [newText, setNewText] = useState('');
    const [activeSection, setActiveSection] = useState<'contas' | 'pagamentos'>('contas');

    useEffect(() => {
        const savedContas = localStorage.getItem('gsm_book_contas');
        const savedPagamentos = localStorage.getItem('gsm_book_pagamentos');
        if (savedContas) setContas(JSON.parse(savedContas));
        if (savedPagamentos) setPagamentos(JSON.parse(savedPagamentos));
    }, []);

    const saveShortcuts = (type: 'contas' | 'pagamentos', items: Shortcut[]) => {
        if (type === 'contas') {
            setContas(items);
            localStorage.setItem('gsm_book_contas', JSON.stringify(items));
        } else {
            setPagamentos(items);
            localStorage.setItem('gsm_book_pagamentos', JSON.stringify(items));
        }
    };

    const addShortcut = () => {
        if (!newLabel.trim() || !newText.trim()) {
            toast.error("Preencha o nome e o texto do atalho");
            return;
        }

        const newItem: Shortcut = {
            id: Date.now().toString(),
            label: newLabel,
            text: newText
        };

        if (activeSection === 'contas') {
            saveShortcuts('contas', [...contas, newItem]);
        } else {
            saveShortcuts('pagamentos', [...pagamentos, newItem]);
        }

        setNewLabel('');
        setNewText('');
        toast.success("Atalho adicionado!");
    };

    const deleteShortcut = (type: 'contas' | 'pagamentos', id: string) => {
        const items = type === 'contas' ? contas : pagamentos;
        saveShortcuts(type, items.filter(i => i.id !== id));
        toast.info("Atalho removido");
    };

    const copyShortcut = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copiado!");
    };

    const handleProcess = () => {
        if (!input.trim()) {
            toast.error("Insira uma mensagem para processar");
            return;
        }

        try {
            const data = parseFlightMessage(input);
            setResult(data);
            toast.success("Mensagem processada com sucesso!");
        } catch (err) {
            toast.error("Erro ao processar mensagem");
        }
    };

    const formatOutput = (data: ProcessedData) => {
        const baseInfo = `Gostaria de emitir em tabela fixa:
⇾ Origem e Destino: ${data.origin} - ${data.destination}
⇾ Data de ida: ${data.date}
⇾ Classe: ${data.classType}
⇾ Companhia parceira: ${data.partner}
⇾ Adultos: ${data.adults}
⇾ Crianças: ${data.children}
⇾ Bebês: ${data.infants}
⇾ Voo: ${data.flightTime}`;

        const passengerBlocks = data.passengers.map(p => `
DADOS DO PASSAGEIRO
➔ Primeiro nome: ${p.firstName}
➔ Último nome: ${p.lastName}
➔ Gênero: ${p.gender}
➔ Data de nascimento: ${p.birthDate}
➔ Número do passaporte: ${p.passportNumber}
➔ Nacionalidade: ${p.nationality}
➔ Data de validade do passaporte: ${p.passportExpiry}
➔ País de emissão do passaporte: ${p.passportIssuanceCountry}`).join('\n');

        return `${baseInfo}\n${passengerBlocks}`;
    };

    const handleCopy = () => {
        if (!result) return;
        setIsCopying(true);
        navigator.clipboard.writeText(formatOutput(result));
        toast.success("Copiado para a área de transferência");
        setTimeout(() => setIsCopying(false), 2000);
    };

    return (
        <div className="space-y-8 w-full pb-20">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1 mb-8"
            >
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-black/10 rounded-2xl flex items-center justify-center border border-black/20">
                        <BookIcon size={28} className="text-black" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-black tracking-tight">Book</h1>
                        <p className="text-black/70 font-bold">Processamento de mensagens e atalhos rápidos.</p>
                    </div>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Main Processor - Left Column (8 units) */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Input Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Terminal size={20} className="text-primary" />
                                </div>
                                <h3 className="font-bold text-lg text-white">Mensagem Bruta</h3>
                            </div>

                            <Textarea
                                placeholder="Cole aqui a mensagem bruta... (Ex: Pls issue lhr-jfk for today mar10 8pm Jacob halberstam march 25 85)"
                                className="min-h-[300px] bg-black/40 border-white/10 text-slate-300 font-mono text-sm focus-visible:ring-primary rounded-2xl resize-none"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />

                            <Button
                                onClick={handleProcess}
                                className="w-full h-14 bg-primary text-background-dark font-black text-lg rounded-2xl hover:brightness-110 shadow-[0_0_20px_rgba(0,255,200,0.2)] transition-all active:scale-[0.98]"
                            >
                                <Zap className="mr-2 h-5 w-5" /> PROCESSAR DADOS
                            </Button>
                        </motion.div>

                        {/* Output Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 relative min-h-[500px]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                                        <LayoutTemplate size={20} className="text-accent-blue" />
                                    </div>
                                    <h3 className="font-bold text-lg text-white">Resultado</h3>
                                </div>
                                {result && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs font-bold text-slate-400 hover:text-white"
                                        onClick={handleCopy}
                                    >
                                        {isCopying ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        COPIAR TUDO
                                    </Button>
                                )}
                            </div>

                            <div className="bg-black/60 rounded-2xl p-6 border border-white/5 min-h-[380px] font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {!result ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 mt-20">
                                        <AlertCircle size={48} strokeWidth={1} />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Aguardando processamento...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {formatOutput(result)}
                                    </div>
                                )}
                            </div>

                            {result && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                            <Users size={16} className="text-primary" />
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                                <span className="block text-white">TOTAL PASSAGEIROS</span>
                                                {result.passengers.length} ({result.adults}A, {result.children}C, {result.infants}I)
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                            <Plane size={16} className="text-accent-blue" />
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                                <span className="block text-white">ROTA</span>
                                                {result.origin || 'N/A'} → {result.destination || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Shortcut Blocks - Right Column (4 units) */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Shortcuts Tabs/Headers */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6"
                    >
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setActiveSection('contas')}
                                className={`flex-1 rounded-xl h-12 font-black text-xs uppercase tracking-widest transition-all ${
                                    activeSection === 'contas' 
                                    ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' 
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                <Wallet className="mr-2 size-4" /> Contas
                            </Button>
                            <Button
                                onClick={() => setActiveSection('pagamentos')}
                                className={`flex-1 rounded-xl h-12 font-black text-xs uppercase tracking-widest transition-all ${
                                    activeSection === 'pagamentos' 
                                    ? 'bg-accent-blue text-background-dark shadow-lg shadow-accent-blue/20' 
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                <Banknote className="mr-2 size-4" /> Pagamentos
                            </Button>
                        </div>

                        {/* Current List */}
                        <div className="space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {(activeSection === 'contas' ? contas : pagamentos).length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/10 rounded-2xl">
                                    <Plus size={24} className="opacity-20 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum atalho salvo</p>
                                </div>
                            ) : (
                                (activeSection === 'contas' ? contas : pagamentos).map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="text-white font-black text-[10px] uppercase tracking-wider mb-1 opacity-60">
                                                {item.label}
                                            </p>
                                            <p className="text-slate-300 text-xs font-mono truncate">
                                                {item.text}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => copyShortcut(item.text)}
                                                className="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
                                            >
                                                <Copy size={16} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => deleteShortcut(activeSection, item.id)}
                                                className="size-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add New Form */}
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Novo Atalho</p>
                            <Input 
                                placeholder="Nome (Ex: Pix Itaú)"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                className="h-12 bg-black/40 border-white/10 rounded-xl text-xs font-bold"
                            />
                            <Textarea 
                                placeholder="Texto do atalho..."
                                value={newText}
                                onChange={e => setNewText(e.target.value)}
                                className="bg-black/40 border-white/10 rounded-xl text-xs font-mono min-h-[80px] resize-none"
                            />
                            <Button
                                onClick={addShortcut}
                                className={`w-full h-12 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${
                                    activeSection === 'contas' ? 'bg-primary' : 'bg-accent-blue'
                                } text-background-dark active:scale-[0.98] shadow-lg`}
                            >
                                <Plus className="mr-2 size-4" /> Adicionar a {activeSection === 'contas' ? 'Contas' : 'Pagamentos'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
