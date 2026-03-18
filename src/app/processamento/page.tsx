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
        toast.success("Copiado!");
        setTimeout(() => setIsCopying(false), 2000);
    };

    const redButtonStyle = "bg-red-700 hover:bg-red-800 text-white font-black uppercase tracking-widest border-none shadow-[0_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px] transition-all";

    return (
        <div className="space-y-8 w-full pb-20">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1 mb-4"
            >
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
                        <BookIcon size={28} className="text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-black tracking-tight">Book</h1>
                        <p className="text-black/70 font-bold">Protocolos de emissão e atalhos de contingência.</p>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* 1. MENSAGEM BRUTA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/90 backdrop-blur-3xl p-6 rounded-[32px] border border-white/10 h-[750px] flex flex-col gap-6 shadow-2xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                            <Terminal size={20} className="text-red-600" />
                        </div>
                        <h3 className="font-black text-lg text-white uppercase tracking-tighter">Mensagem Bruta</h3>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <Textarea
                            placeholder="Cole aqui a mensagem bruta..."
                            className="h-full bg-black/40 border-white/5 text-slate-300 font-mono text-xs focus-visible:ring-red-600 rounded-2xl resize-none custom-scrollbar p-5 leading-loose"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={handleProcess}
                        className={`w-full h-16 rounded-2xl text-lg ${redButtonStyle}`}
                    >
                        <Zap className="mr-2 h-6 w-6 fill-current" /> PROCESSAR DADOS
                    </Button>
                </motion.div>

                {/* 2. RESULTADO */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-black/95 backdrop-blur-3xl p-6 rounded-[32px] border border-white/10 h-[750px] flex flex-col gap-6 shadow-2xl"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                                <LayoutTemplate size={20} className="text-red-600" />
                            </div>
                            <h3 className="font-black text-lg text-white uppercase tracking-tighter">Resultado</h3>
                        </div>
                        {result && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest bg-red-600/5 hover:bg-red-600/10"
                                onClick={handleCopy}
                            >
                                {isCopying ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                COPIAR TUDO
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-black/40 rounded-2xl p-6 border border-white/5 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                        {!result ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4">
                                <AlertCircle size={48} strokeWidth={1} />
                                <p className="font-black uppercase tracking-widest text-[10px]">Aguardando sinal...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formatOutput(result)}
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <Users size={18} className="text-red-600" />
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <span className="block text-white">PASSAGEIROS</span>
                                    {result.passengers.length} ({result.adults}A, {result.children}C, {result.infants}I)
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <Plane size={18} className="text-red-600" />
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <span className="block text-white">ROTA</span>
                                    {result.origin || 'N/A'} → {result.destination || 'N/A'}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* 3. ATALHOS */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-black/90 backdrop-blur-3xl p-6 rounded-[32px] border border-white/10 h-[750px] flex flex-col gap-6 shadow-2xl"
                >
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setActiveSection('contas')}
                            className={`flex-1 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest transition-all ${
                                activeSection === 'contas' 
                                ? 'bg-red-700 text-white shadow-[0_4px_0_0_rgba(0,0,0,1)]' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <Wallet className="mr-2 size-4" /> Contas
                        </Button>
                        <Button
                            onClick={() => setActiveSection('pagamentos')}
                            className={`flex-1 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest transition-all ${
                                activeSection === 'pagamentos' 
                                ? 'bg-red-700 text-white shadow-[0_4px_0_0_rgba(0,0,0,1)]' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <Banknote className="mr-2 size-4" /> Pagamentos
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-black/40 rounded-2xl p-4 border border-white/10 space-y-3">
                        {(activeSection === 'contas' ? contas : pagamentos).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700">
                                <Plus size={32} strokeWidth={1} className="opacity-20 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-center px-4 leading-relaxed">Nenhuma credencial configurada</p>
                            </div>
                        ) : (
                            (activeSection === 'contas' ? contas : pagamentos).map((item) => (
                                <div 
                                    key={item.id} 
                                    className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-red-600/30 transition-all flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-red-500 font-black text-[9px] uppercase tracking-wider mb-1 opacity-80">
                                            {item.label}
                                        </p>
                                        <p className="text-slate-200 text-xs font-mono truncate leading-tight">
                                            {item.text}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => copyShortcut(item.text)}
                                            className="size-10 rounded-xl bg-white/5 hover:bg-red-600/20 text-white transition-all active:scale-90"
                                        >
                                            <Copy size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => deleteShortcut(activeSection, item.id)}
                                            className="size-10 rounded-xl bg-red-900/10 hover:bg-red-900/40 text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-2 space-y-3">
                        <Input 
                            placeholder="Nome (Ex: Pix Itaú)"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            className="h-12 bg-black/60 border-white/10 rounded-2xl text-xs font-bold focus-visible:ring-red-600"
                        />
                        <Textarea 
                            placeholder="Texto do atalho..."
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            className="bg-black/60 border-white/10 rounded-2xl text-xs font-mono min-h-[100px] resize-none focus-visible:ring-red-600 custom-scrollbar p-4"
                        />
                        <Button
                            onClick={addShortcut}
                            className={`w-full h-16 rounded-2xl text-sm ${redButtonStyle}`}
                        >
                            <Plus className="mr-2 size-5" /> ADICIONAR ATALHO
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
