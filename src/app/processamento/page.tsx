'use client';

import React, { useState } from 'react';
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
    CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { parseFlightMessage, ProcessedData } from '@/utils/message-parser';

export default function ProcessamentoPage() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<ProcessedData | null>(null);
    const [isCopying, setIsCopying] = useState(false);

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
        return `Gostaria de emitir em tabela fixa:
⇾ Origem e Destino: ${data.origin} - ${data.destination}
⇾ Data de ida: ${data.date}
⇾ Classe: ${data.classType}
⇾ Companhia parceira: ${data.partner}
⇾ Adultos: ${data.adults}
⇾ Crianças: ${data.children}
⇾ Bebês: ${data.infants}
⇾ Voo: ${data.flightTime}

"DADOS DO PASSAGEIRO
➔ Primeiro nome: ${data.passenger.firstName}
➔ Último nome: ${data.passenger.lastName}
➔ Gênero: ${data.passenger.gender}
➔ Data de nascimento: ${data.passenger.birthDate}
➔ Número do passaporte: ${data.passenger.passportNumber}
➔ Nacionalidade: ${data.passenger.nationality}
➔ Data de validade do passaporte: ${data.passenger.passportExpiry}
➔ País de emissão do passaporte: ${data.passenger.passportIssuanceCountry}"`;
    };

    const handleCopy = () => {
        if (!result) return;
        setIsCopying(true);
        navigator.clipboard.writeText(formatOutput(result));
        toast.success("Copiado para a área de transferência");
        setTimeout(() => setIsCopying(false), 2000);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2"
            >
                <h1 className="text-4xl font-black text-white tracking-tight">Semantic <span className="text-primary font-normal">Processor</span></h1>
                <p className="text-slate-400">Transforme mensagens brutas de solicitações em formatos prontos para emissão.</p>
            </motion.div>

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
                        <h3 className="font-bold text-lg text-white">Raw Message Input</h3>
                    </div>

                    <Textarea
                        placeholder="Cole aqui a mensagem bruta... (Ex: Pls issue lhr-jfk for today mar10 8pm Jacob halberstam march 25 85)"
                        className="min-h-[300px] bg-black/40 border-white/10 text-slate-300 font-mono text-sm focus-visible:ring-primary rounded-2xl resize-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />

                    <Button
                        onClick={handleProcess}
                        className="w-full h-14 bg-primary text-background-dark font-black text-lg rounded-2xl hover:brightness-110 shadow-[0_0_20px_rgba(0,255,200,0.2)]"
                    >
                        <Zap className="mr-2 h-5 w-5" /> PROCESS DATA
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
                            <h3 className="font-bold text-lg text-white">Processed Result</h3>
                        </div>
                        {result && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs font-bold text-slate-400 hover:text-white"
                                onClick={handleCopy}
                            >
                                {isCopying ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                COPY ALL
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
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <User size={16} className="text-primary" />
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <span className="block text-white">PASSENGER</span>
                                    {result.passenger.firstName} {result.passenger.lastName}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                <Plane size={16} className="text-accent-blue" />
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <span className="block text-white">ROUTE</span>
                                    {result.origin} → {result.destination}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
