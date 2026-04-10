'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Command {
    id: string;
    label: string;
    description: string;
    icon: string;
    href?: string;
    action?: () => void;
    keywords?: string[];
}

const COMMANDS: Command[] = [
    { id: 'overview', label: 'Overview', description: 'Executive Cockpit', icon: 'dashboard', href: '/', keywords: ['home', 'inicio', 'cockpit'] },
    { id: 'cotacao', label: 'Cotação', description: 'Quotation Matrix – comparar voos', icon: 'public', href: '/cotacao', keywords: ['quoting', 'quote', 'busca', 'flight', 'voo', 'milhas'] },
    { id: 'processamento', label: 'Processamento', description: 'Book – processar booking', icon: 'auto_stories', href: '/processamento', keywords: ['book', 'booking', 'emissao', 'emissão'] },
    { id: 'inventario', label: 'Inventário', description: 'Estoque de passagens', icon: 'inventory', href: '/inventario', keywords: ['inventory', 'estoque', 'tickets'] },
    { id: 'financials', label: 'Financials', description: 'Dashboard financeiro', icon: 'payments', href: '/dashboard', keywords: ['finance', 'financeiro', 'revenue', 'receita', 'analytics'] },
    { id: 'fornecedores', label: 'Fornecedores', description: 'Contas a pagar – Suppliers', icon: 'handshake', href: '/fornecedores', keywords: ['suppliers', 'accounts payable', 'pagar'] },
    { id: 'cancelamentos', label: 'Cancelamentos', description: 'Gestão de cancelamentos', icon: 'cancel_schedule_send', href: '/cancelamentos', keywords: ['cancel', 'reembolso', 'refund'] },
    { id: 'auto-extrator', label: 'Automações', description: 'Auto-extrator de bookings', icon: 'precision_manufacturing', href: '/auto-extrator', keywords: ['automation', 'scraper', 'extractor', 'azul', 'smiles'] },
    { id: 'calculo', label: 'Calculadora', description: 'Cálculo de preços e milhas', icon: 'calculate', href: '/calculo', keywords: ['calculator', 'price', 'preco', 'preço', 'miles'] },
    { id: 'invoice', label: 'Invoice', description: 'Gerador de notas fiscais', icon: 'description', href: '/invoice', keywords: ['nota', 'fiscal', 'pdf', 'nota fiscal'] },
    { id: 'ferramentas', label: 'Tools', description: 'Merge PDF, Imagem para PDF', icon: 'build', href: '/ferramentas', keywords: ['tools', 'ferramentas', 'merge', 'pdf', 'imagem', 'image', 'converter'] },
    { id: 'configuracoes', label: 'Configurações', description: 'Settings – chaves e config', icon: 'settings', href: '/configuracoes', keywords: ['settings', 'config', 'api', 'keys'] },
];

function filterCommands(query: string): Command[] {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase().trim();
    return COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords?.some(k => k.includes(q))
    );
}

interface CommandPaletteProps {
    open: boolean;
    onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const filtered = filterCommands(query);

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const execute = useCallback((cmd: Command) => {
        onClose();
        if (cmd.action) {
            cmd.action();
        } else if (cmd.href) {
            router.push(cmd.href);
        }
    }, [onClose, router]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
            if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIndex]) execute(filtered[selectedIndex]); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, filtered, selectedIndex, execute, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="fixed left-1/2 top-[20%] z-[101] w-full max-w-[560px] -translate-x-1/2"
                    >
                        <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                                <span className="material-symbols-outlined text-white/40 text-xl shrink-0">search</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Navegar para... (ex: cotação, financials, invoice)"
                                    className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm font-medium outline-none"
                                />
                                <kbd className="text-[10px] font-bold text-white/20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
                            </div>

                            {/* Results */}
                            <div className="py-2 max-h-[340px] overflow-y-auto custom-scrollbar">
                                {filtered.length === 0 ? (
                                    <p className="text-center text-white/30 text-sm py-8">Nenhum resultado para "{query}"</p>
                                ) : (
                                    filtered.map((cmd, idx) => (
                                        <button
                                            key={cmd.id}
                                            onClick={() => execute(cmd)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={cn(
                                                "w-full flex items-center gap-4 px-5 py-3 transition-colors text-left",
                                                idx === selectedIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                idx === selectedIndex ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/10'
                                            )}>
                                                <span className={cn(
                                                    "material-symbols-outlined text-lg",
                                                    idx === selectedIndex ? 'text-primary' : 'text-white/50'
                                                )}>{cmd.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-sm font-bold",
                                                    idx === selectedIndex ? 'text-white' : 'text-white/70'
                                                )}>{cmd.label}</p>
                                                <p className="text-[11px] text-white/30 truncate">{cmd.description}</p>
                                            </div>
                                            {idx === selectedIndex && (
                                                <kbd className="text-[10px] font-bold text-white/20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 shrink-0">↵</kbd>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Footer hint */}
                            <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-4">
                                <span className="text-[10px] text-white/20 font-medium flex items-center gap-1.5">
                                    <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">↑↓</kbd> navegar
                                </span>
                                <span className="text-[10px] text-white/20 font-medium flex items-center gap-1.5">
                                    <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">↵</kbd> abrir
                                </span>
                                <span className="text-[10px] text-white/20 font-medium flex items-center gap-1.5">
                                    <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">ESC</kbd> fechar
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
