'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import { parseFlightMessage, ProcessedData, PassengerData } from '@/utils/message-parser';
import Tesseract from 'tesseract.js';
import { parseMRZ } from '@/utils/mrz-parser';

type Shortcut = {
    id: string;
    label: string;
    text: string;
};

export default function BookPage() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<ProcessedData | null>(null);
    const [isCopyingFlight, setIsCopyingFlight] = useState(false);
    const [isCopyingPax, setIsCopyingPax] = useState(false);
    const [outputMode, setOutputMode] = useState<'full' | 'simple'>('full');
    const [isAmericanFormat, setIsAmericanFormat] = useState(false);
    
    // Image Upload States
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const checkPaxHistory = async (passengersToCheck: PassengerData[]) => {
        try {
            const names = passengersToCheck.map(p => `${p.firstName} ${p.lastName}`.trim());
            const res = await fetch('/api/sheets/check-pax', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passengers: names })
            });
            const json = await res.json();
            
            if (json.success && Object.keys(json.data).length > 0) {
                setResult(prev => {
                    if (!prev) return prev;
                    const updatedPassengers = prev.passengers.map(p => {
                        const fullName = `${p.firstName} ${p.lastName}`.trim().toUpperCase();
                        const foundAccounts: string[] = json.data[fullName];
                        if (foundAccounts && foundAccounts.length > 0) {
                            return { ...p, previousAccount: foundAccounts };
                        }
                        return p;
                    });
                    return { ...prev, passengers: updatedPassengers };
                });
                toast.success('Passageiro(s) com emissão anterior encontrados!');
            }
        } catch (e) {
            console.error('Falha ao verificar histórico:', e);
        }
    };

    const handleProcess = (mode: 'full' | 'simple') => {
        if (!input.trim()) {
            toast.error("Insira uma mensagem para processar");
            return;
        }

        try {
            const data = parseFlightMessage(input, isAmericanFormat);
            setResult(data);
            setOutputMode(mode);
            toast.success(`Dados processados (${mode === 'full' ? 'Completo' : 'Simplificado'})`);
            
            // Verificação automática de Pax Async
            checkPaxHistory(data.passengers);
        } catch (err) {
            toast.error("Erro ao processar mensagem");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsProcessingImage(true);
        let extractedPassengers = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                toast.info(`Analisando imagem ${i + 1} de ${files.length}... (pode levar alguns segundos)`);
                
                const { data: { text } } = await Tesseract.recognize(file, 'eng');
                
                const mrzData = parseMRZ(text);
                if (mrzData) {
                    extractedPassengers.push(mrzData);
                    toast.success(`Passageiro ${mrzData.firstName} extraído!`);
                } else {
                    toast.error(`Não foi possível extrair dados da imagem ${i + 1}`);
                }
            }

            if (extractedPassengers.length > 0) {
                const calculateAge = (birthDate: string) => {
                    const parts = birthDate.split('/');
                    if (parts.length !== 3) return 30; // default adult
                    return new Date().getFullYear() - parseInt(parts[2]);
                };

                setResult(prev => {
                    const current = prev || {
                        origin: '', destination: '', date: '',
                        returnDate: '', returnDestination: '', returnFlightTime: '',
                        classType: '', partner: '',
                        adults: 0, children: 0, infants: 0,
                        flightTime: '', passengers: [], hasFlightData: false
                    };
                    
                    const newAdults = extractedPassengers.filter(p => calculateAge(p.birthDate) >= 12).length;
                    const newChildren = extractedPassengers.filter(p => calculateAge(p.birthDate) >= 2 && calculateAge(p.birthDate) < 12).length;
                    const newInfants = extractedPassengers.filter(p => calculateAge(p.birthDate) < 2).length;
                    
                    return {
                        ...current,
                        passengers: [...current.passengers, ...extractedPassengers],
                        adults: current.adults + newAdults,
                        children: current.children + newChildren,
                        infants: current.infants + newInfants
                    };
                });
                
                checkPaxHistory(extractedPassengers);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao processar as imagens OCR");
        } finally {
            setIsProcessingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatFlightBlock = (data: ProcessedData): string => {
        if (!data.hasFlightData) return '';
        const isRoundTrip = !!(data.returnDate || data.returnFlightTime);
        const route = `${data.origin} - ${data.destination}`;

        if (outputMode === 'simple') {
            if (isRoundTrip) {
                return `${route}\nIda: ${data.date} ${data.flightTime}\nVolta: ${data.returnDate} ${data.returnFlightTime}\n${data.classType}`.trim();
            }
            return `${route}\n${data.date}\n${data.classType}`.trim();
        }

        if (isRoundTrip) {
            return `Gostaria de emitir em tabela fixa:\n⇾ Origem e Destino: ${route}\n⇾ Data de ida: ${data.date}\n⇾ Voo da ida: ${data.flightTime}\n⇾ Data de volta: ${data.returnDate}\n⇾ Voo da volta: ${data.returnFlightTime}\n⇾ Classe: ${data.classType}\n⇾ Companhia parceira: ${data.partner}\n⇾ Adultos: ${data.adults}\n⇾ Crianças: ${data.children}\n⇾ Bebês: ${data.infants}`;
        }
        return `Gostaria de emitir em tabela fixa:\n⇾ Origem e Destino: ${route}\n⇾ Data: ${data.date}\n⇾ Voo: ${data.flightTime}\n⇾ Classe: ${data.classType}\n⇾ Companhia parceira: ${data.partner}\n⇾ Adultos: ${data.adults}\n⇾ Crianças: ${data.children}\n⇾ Bebês: ${data.infants}`;
    };

    const formatPassengerBlock = (data: ProcessedData): string => {
        if (outputMode === 'simple') {
            return data.passengers.map(p => {
                return `${p.firstName}\n${p.lastName}\n${p.birthDate}\n${p.gender}`;
            }).join('\n\n');
        }
        return data.passengers.map(p => {
            return `DADOS DO PASSAGEIRO\n➔ Primeiro nome: ${p.firstName}\n➔ Último nome: ${p.lastName}\n➔ Gênero: ${p.gender}\n➔ Data de nascimento: ${p.birthDate}\n➔ Número do passaporte: ${p.passportNumber}\n➔ Nacionalidade: ${p.nationality}\n➔ Data de validade do passaporte: ${p.passportExpiry}\n➔ País de emissão do passaporte: ${p.passportIssuanceCountry}`;
        }).join('\n\n');
    };

    const handleCopyFlight = () => {
        if (!result) return;
        navigator.clipboard.writeText(formatFlightBlock(result));
        toast.success('Voo copiado!');
        setIsCopyingFlight(true);
        setTimeout(() => setIsCopyingFlight(false), 2000);
    };

    const handleCopyPax = () => {
        if (!result) return;
        navigator.clipboard.writeText(formatPassengerBlock(result));
        toast.success('Passageiro(s) copiado(s)!');
        setIsCopyingPax(true);
        setTimeout(() => setIsCopyingPax(false), 2000);
    };

    return (
        <div className="flex flex-col w-full h-full pt-2 text-[#e5e2e1] font-['Inter'] overflow-hidden">
            
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

                    <div className="px-4 pt-3 pb-2 shrink-0 border-t border-white/5 flex gap-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            style={{ display: 'none' }} 
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessingImage}
                            className="flex items-center justify-center gap-2 bg-white/10 text-white flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessingImage ? (
                                <>
                                    <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                                    Lendo Foto...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[14px]">add_photo_alternate</span>
                                    Passaporte (Foto)
                                </>
                            )}
                        </button>
                    </div>

                    <div className="px-4 shrink-0">
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={isAmericanFormat}
                                    onChange={(e) => setIsAmericanFormat(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-8 h-[18px] bg-white/10 rounded-full peer-checked:bg-white/80 transition-all border border-white/10 peer-checked:border-white/30" />
                                <div className="absolute left-[3px] top-[3px] w-3 h-3 bg-[#555] rounded-full peer-checked:translate-x-[14px] peer-checked:bg-black transition-all" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#777] group-hover:text-[#aaa] transition-colors select-none">
                                Datas americanas (MM/DD)
                            </span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 shrink-0">
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
                    <div className="titanium-gradient text-white font-['Inter'] font-bold py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0 flex items-center justify-center gap-2 px-5">
                        <span className="material-symbols-outlined text-[16px]">view_quilt</span>
                        RESULTADO
                    </div>

                    {!result ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-4 bg-[#0e0e0e]/40">
                            <span className="material-symbols-outlined text-[40px] opacity-30">hourglass_empty</span>
                            <p className="font-black uppercase tracking-widest text-[9px] opacity-40">Aguardando sinal...</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                            {/* BLOCO VOO */}
                            {result.hasFlightData && (
                                <div className="flex flex-col min-h-0 border-b border-white/5" style={{ flex: result.passengers.length > 0 ? '0 0 auto' : '1 1 0' }}>
                                    <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02] shrink-0">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50">
                                            <span className="material-symbols-outlined text-[14px]">flight</span>
                                            VOO
                                        </div>
                                        <button
                                            onClick={handleCopyFlight}
                                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#a19f9d] hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-md"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">{isCopyingFlight ? 'check' : 'content_copy'}</span>
                                            COPIAR
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar px-5 pb-4 pt-1 font-mono text-[11px] text-[#a19f9d] whitespace-pre-wrap leading-relaxed">
                                        {formatFlightBlock(result)}
                                    </div>
                                </div>
                            )}

                            {/* BLOCO PAX */}
                            {result.passengers.length > 0 && (
                                <div className="flex flex-col flex-1 min-h-0">
                                    <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02] shrink-0">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50">
                                            <span className="material-symbols-outlined text-[14px]">group</span>
                                            PASSAGEIROS · {result.passengers.length} ({result.adults}A {result.children}C {result.infants}I)
                                        </div>
                                        <button
                                            onClick={handleCopyPax}
                                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#a19f9d] hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-md"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">{isCopyingPax ? 'check' : 'content_copy'}</span>
                                            COPIAR
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 px-5 pb-4 pt-4 flex flex-col gap-6">
                                        {result.passengers.map((p, idx) => (
                                            <div key={idx} className="flex flex-col gap-3">
                                                <div className="font-mono text-[11px] text-[#a19f9d] whitespace-pre-wrap leading-relaxed">
                                                    {outputMode === 'simple'
                                                        ? `${p.firstName}\n${p.lastName}\n${p.birthDate}\n${p.gender}`
                                                        : `DADOS DO PASSAGEIRO\n➔ Primeiro nome: ${p.firstName}\n➔ Último nome: ${p.lastName}\n➔ Gênero: ${p.gender}\n➔ Data de nascimento: ${p.birthDate}\n➔ Número do passaporte: ${p.passportNumber}\n➔ Nacionalidade: ${p.nationality}\n➔ Data de validade do passaporte: ${p.passportExpiry}\n➔ País de emissão do passaporte: ${p.passportIssuanceCountry}`
                                                    }
                                                </div>
                                                {p.previousAccount && p.previousAccount.length > 0 && (
                                                    <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-md flex items-start gap-2 shadow-[0_0_15px_rgba(245,158,11,0.05)] w-full max-w-sm">
                                                        <span className="material-symbols-outlined text-amber-500 text-[14px] mt-0.5">warning</span>
                                                        <div>
                                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Pax Emitido Anteriormente</p>
                                                            <p className="text-[10px] text-amber-500/80 font-mono tracking-wider">{p.previousAccount.join(', ')}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {idx < result.passengers.length - 1 && <div className="h-px border-b border-white/5 border-dashed mt-2"></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
