'use client';

import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { parseFlightMessage, ProcessedData } from '@/utils/message-parser';

type Shortcut = {
    id: string;
    label: string;
    text: string;
};

export default function BookPage() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<ProcessedData | null>(null);
    const [isCopying, setIsCopying] = useState(false);
    const [outputMode, setOutputMode] = useState<'full' | 'simple'>('full');

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

    const handleProcess = (mode: 'full' | 'simple') => {
        if (!input.trim()) {
            toast.error("Insira uma mensagem para processar");
            return;
        }

        try {
            const data = parseFlightMessage(input);
            setResult(data);
            setOutputMode(mode);
            toast.success(`Dados processados (${mode === 'full' ? 'Completo' : 'Simplificado'})`);
        } catch (err) {
            toast.error("Erro ao processar mensagem");
        }
    };

    const formatOutput = (data: ProcessedData) => {
        if (outputMode === 'simple') {
            const header = `${data.origin} - ${data.destination}
${data.date}
${data.classType}`;

            const passengerBlocks = data.passengers.map(p => {
                return `${p.firstName}
${p.lastName}
${p.birthDate}
${p.gender}`;
            }).join('\n\n');

            return `${header}\n\n${passengerBlocks}`;
        }

        const baseInfo = `Gostaria de emitir em tabela fixa:
⇾ Origem e Destino: ${data.origin} - ${data.destination}
⇾ Data de ida: ${data.date}
⇾ Classe: ${data.classType}
⇾ Companhia parceira: ${data.partner}
⇾ Adultos: ${data.adults}
⇾ Crianças: ${data.children}
⇾ Bebês: ${data.infants}
⇾ Voo: ${data.flightTime}`;

        const passengerBlocks = data.passengers.map(p => {
            return `
DADOS DO PASSAGEIRO
➔ Primeiro nome: ${p.firstName}
➔ Último nome: ${p.lastName}
➔ Gênero: ${p.gender}
➔ Data de nascimento: ${p.birthDate}
➔ Número do passaporte: ${p.passportNumber}
➔ Nacionalidade: ${p.nationality}
➔ Data de validade do passaporte: ${p.passportExpiry}
➔ País de emissão do passaporte: ${p.passportIssuanceCountry}`;
        }).join('\n');

        return `${baseInfo}\n${passengerBlocks}`;
    };

    const handleCopy = () => {
        if (!result) return;
        setIsCopying(true);
        navigator.clipboard.writeText(formatOutput(result));
        toast.success("Copiado!");
        setTimeout(() => setIsCopying(false), 2000);
    };

    return (
        <div className="flex flex-col w-full h-[calc(100vh-11rem)] pt-2 text-[#e5e2e1] font-['Inter']">
            
            <header className="mb-6 shrink-0">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-[0.05em] text-white">Book</h1>
                    <p className="text-outline font-light tracking-wide max-w-md">Protocolos de emissão e atalhos de contingência.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
                
                {/* 1. MENSAGEM BRUTA */}
                <div className="glass-panel flex flex-col h-full overflow-hidden">
                    <div className="titanium-gradient text-white font-['Inter'] font-bold text-center py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">terminal</span>
                        MENSAGEM BRUTA
                    </div>
                    
                    <div className="flex-1 overflow-hidden bg-[#0e0e0e]/40">
                        <textarea
                            placeholder="Cole aqui a mensagem bruta..."
                            className="h-full w-full bg-transparent text-[#a19f9d] font-mono text-xs focus:outline-none resize-none custom-scrollbar p-5 leading-relaxed placeholder:text-[#555]"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 shrink-0 border-t border-white/5">
                        <button
                            onClick={() => handleProcess('full')}
                            className="flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-md"
                        >
                            <span className="material-symbols-outlined text-[16px]">bolt</span>
                            COMPLETO
                        </button>
                        <button
                            onClick={() => handleProcess('simple')}
                            className="flex items-center justify-center gap-2 bg-white/10 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                        >
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            SIMPLIFICADO
                        </button>
                    </div>
                </div>

                {/* 2. RESULTADO */}
                <div className="glass-panel flex flex-col h-full overflow-hidden">
                    <div className="titanium-gradient text-white font-['Inter'] font-bold py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0 flex items-center justify-between px-5">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">view_quilt</span>
                            RESULTADO
                        </div>
                        {result && (
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#a19f9d] hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md"
                            >
                                <span className="material-symbols-outlined text-[14px]">
                                    {isCopying ? 'check' : 'content_copy'}
                                </span>
                                COPIAR
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#0e0e0e]/40 p-5 font-mono text-[11px] text-[#a19f9d] whitespace-pre-wrap leading-relaxed custom-scrollbar">
                        {!result ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#555] gap-4">
                                <span className="material-symbols-outlined text-[40px] opacity-30">hourglass_empty</span>
                                <p className="font-black uppercase tracking-widest text-[9px] opacity-40">Aguardando sinal...</p>
                            </div>
                        ) : (
                            <div>{formatOutput(result)}</div>
                        )}
                    </div>

                    {result && (
                        <div className="grid grid-cols-2 gap-3 p-4 shrink-0 border-t border-white/5">
                            <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center gap-3 overflow-hidden">
                                <span className="material-symbols-outlined text-[16px] text-white/40">group</span>
                                <div className="text-[9px] font-bold text-[#a19f9d] uppercase tracking-wider truncate">
                                    <span className="block text-white font-black">PASSAGEIROS</span>
                                    {result.passengers.length} ({result.adults}A, {result.children}C, {result.infants}I)
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center gap-3 overflow-hidden">
                                <span className="material-symbols-outlined text-[16px] text-white/40">flight</span>
                                <div className="text-[9px] font-bold text-[#a19f9d] uppercase tracking-wider truncate">
                                    <span className="block text-white font-black">ROTA</span>
                                    {result.origin || 'N/A'} → {result.destination || 'N/A'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. ATALHOS */}
                <div className="glass-panel flex flex-col h-full overflow-hidden">
                    <div className="titanium-gradient text-white font-['Inter'] font-bold text-center py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">bookmark</span>
                        ATALHOS
                    </div>
                    
                    <div className="flex gap-2 p-4 shrink-0">
                        <button
                            onClick={() => setActiveSection('contas')}
                            className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                activeSection === 'contas' 
                                ? 'bg-white text-black shadow-md' 
                                : 'bg-white/5 text-[#a19f9d] hover:bg-white/10 border border-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                            Contas
                        </button>
                        <button
                            onClick={() => setActiveSection('pagamentos')}
                            className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                activeSection === 'pagamentos' 
                                ? 'bg-white text-black shadow-md' 
                                : 'bg-white/5 text-[#a19f9d] hover:bg-white/10 border border-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[14px]">payments</span>
                            Pagamentos
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 custom-scrollbar bg-[#0e0e0e]/40 space-y-2 min-h-0 py-2">
                        {(activeSection === 'contas' ? contas : pagamentos).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#555]">
                                <span className="material-symbols-outlined text-[32px] opacity-30 mb-2">add_circle</span>
                                <p className="text-[9px] font-black uppercase tracking-widest text-center px-4 leading-relaxed opacity-40">Nenhuma credencial configurada</p>
                            </div>
                        ) : (
                            (activeSection === 'contas' ? contas : pagamentos).map((item) => (
                                <div 
                                    key={item.id} 
                                    className="group p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0 pr-3">
                                        <p className="text-white/60 font-black text-[9px] uppercase tracking-wider mb-0.5">
                                            {item.label}
                                        </p>
                                        <p className="text-white text-[11px] font-mono truncate leading-tight">
                                            {item.text}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => copyShortcut(item.text)}
                                            className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        </button>
                                        <button
                                            onClick={() => deleteShortcut(activeSection, item.id)}
                                            className="w-7 h-7 rounded-md bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 space-y-2 shrink-0 border-t border-white/5">
                        <input 
                            placeholder="Nome (Ex: Pix Itaú)"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            className="w-full h-10 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 text-xs font-bold text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-[#555]"
                        />
                        <textarea 
                            placeholder="Texto do atalho..."
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white min-h-[80px] max-h-[100px] resize-none focus:outline-none focus:border-white/30 transition-colors custom-scrollbar placeholder:text-[#555]"
                        />
                        <button
                            onClick={addShortcut}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-md"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            ADICIONAR ATALHO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
