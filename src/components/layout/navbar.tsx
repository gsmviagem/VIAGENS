'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { logout } from '@/app/login/actions';
import { CommandPalette } from './command-palette';

const navItems = [
    { href: '/', label: 'Overview', icon: 'dashboard' },
    { href: '/cotacao', label: 'Quoting', icon: 'search' },
    { href: '/processamento', label: 'Book', icon: 'auto_stories' },
    { href: '/inventario', label: 'Inventory', icon: 'inventory' },
    { href: '/dashboard', label: 'Financials', icon: 'payments' },
    { href: '/fornecedores', label: 'Suppliers', icon: 'handshake' },
    { href: '/cancelamentos', label: 'Cancel', icon: 'cancel_schedule_send' },
    { href: '/auto-extrator', label: 'Automations', icon: 'precision_manufacturing' },
    { href: '/calculo', label: 'Calculator', icon: 'calculate' },
    { href: '/invoice', label: 'Invoice', icon: 'description' },
    { href: '/ferramentas', label: 'Tools', icon: 'build' },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    return (
        <>
            <nav className="w-full flex justify-between items-center px-6 h-14 shrink-0 relative z-50">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                    <img
                        src="/logo.png"
                        alt="Dimais Corp"
                        className="w-8 h-8 object-contain brightness-110 group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="text-[13px] font-black tracking-[0.15em] text-white uppercase">DIMAIS CORP</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden lg:flex items-center gap-0.5 bg-white/[0.04] rounded-full px-1.5 py-1 overflow-x-auto max-w-[780px]">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-semibold tracking-wide whitespace-nowrap transition-all duration-200",
                                pathname === item.href
                                    ? 'text-white bg-white/10'
                                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
                            )}
                        >
                            <span className="material-symbols-outlined text-[13px] leading-none">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Ctrl+K button */}
                    <button
                        onClick={() => setIsPaletteOpen(true)}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-all text-white/40 hover:text-white/70"
                    >
                        <span className="material-symbols-outlined text-[13px]">search</span>
                        <kbd className="text-[9px] font-mono bg-white/5 px-1.5 py-0.5 rounded">⌘K</kbd>
                    </button>

                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 hidden sm:block">
                        <img alt="User" className="w-full h-full object-cover" src="/avatar.png" />
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden p-2 hover:bg-white/5 rounded-full transition-all"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <span className="material-symbols-outlined text-white text-[18px]">
                            {isMobileMenuOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed inset-0 z-[40] lg:hidden bg-[#080808]/97 backdrop-blur-2xl pt-20 px-5 overflow-y-auto"
                    >
                        <button
                            onClick={() => { setIsMobileMenuOpen(false); setIsPaletteOpen(true); }}
                            className="w-full flex items-center gap-3 p-4 mb-3 rounded-2xl bg-white/[0.04] text-white/40 text-[11px] font-bold uppercase tracking-widest hover:bg-white/[0.07] transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">search</span>
                            Busca Rápida
                            <kbd className="ml-auto text-[9px] bg-white/5 rounded px-1.5 py-0.5">Ctrl+K</kbd>
                        </button>

                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all",
                                        pathname === item.href
                                            ? 'text-white bg-white/[0.08]'
                                            : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-6 pt-4">
                            <form action={logout} onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/[0.04] text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/[0.07] transition-all">
                                    <span className="material-symbols-outlined text-[16px]">logout</span>
                                    Disconnect
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Command Palette */}
            <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
        </>
    );
}
