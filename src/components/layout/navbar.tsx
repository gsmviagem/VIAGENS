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
];

// Light health check: ping Supabase URL and Sheets market endpoint
function useSystemStatus() {
    const [status, setStatus] = useState<'checking' | 'ok' | 'degraded' | 'offline'>('checking');

    useEffect(() => {
        let cancelled = false;
        async function check() {
            try {
                const res = await fetch('/api/sheets/market', { signal: AbortSignal.timeout(8000) });
                if (!cancelled) setStatus(res.ok ? 'ok' : 'degraded');
            } catch {
                if (!cancelled) setStatus('offline');
            }
        }
        check();
        const id = setInterval(check, 5 * 60 * 1000); // re-check every 5 min
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    return status;
}

const statusConfig = {
    checking: { color: 'bg-slate-500', label: 'Checking...', pulse: true },
    ok: { color: 'bg-emerald-500', label: 'Operational', pulse: true },
    degraded: { color: 'bg-amber-500', label: 'Degraded', pulse: false },
    offline: { color: 'bg-red-500', label: 'Offline', pulse: false },
};

export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    // Global Ctrl+K shortcut
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
            <nav className="w-full bg-[#131313]/90 backdrop-blur-xl border-b border-[#474747]/30 shadow-[0_40px_40px_rgba(0,0,0,0.08)] flex justify-between items-center px-8 h-16 shrink-0 relative z-50">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img
                            src="/logo.png"
                            alt="Dimais Corp Logo"
                            className="w-10 h-10 object-contain brightness-110 group-hover:scale-105 transition-transform"
                        />
                        <span className="text-xl font-black tracking-[0.1em] text-white">DIMAIS CORP</span>
                    </Link>

                    {/* Horizontal Navigation Links for Desktop */}
                    <div className="hidden lg:flex gap-1 overflow-x-auto custom-scrollbar">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "font-['Inter'] tracking-[0.05em] uppercase text-[11px] font-bold px-3 py-1.5 rounded-md active:scale-95 transition-all whitespace-nowrap flex items-center gap-1.5",
                                    pathname === item.href
                                        ? 'text-white bg-white/10'
                                        : 'text-[#c8c6c5] hover:text-white hover:bg-white/5 transition-colors'
                                )}
                            >
                                <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500/30 hidden sm:block">
                        <img
                            alt="User Profile"
                            className="w-full h-full object-cover"
                            src="/avatar.png"
                        />
                    </div>

                    <button
                        className="lg:hidden p-2 hover:bg-white/5 rounded-full transition-all active:scale-95"
                        onClick={toggleMobileMenu}
                    >
                        {isMobileMenuOpen
                            ? <span className="material-symbols-outlined text-white">close</span>
                            : <span className="material-symbols-outlined text-white">menu</span>}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[40] lg:hidden bg-[#0e0e0e]/95 backdrop-blur-2xl pt-24 px-6 overflow-y-auto"
                    >
                        {/* Mobile search trigger */}
                        <button
                            onClick={() => { setIsMobileMenuOpen(false); setIsPaletteOpen(true); }}
                            className="w-full flex items-center gap-3 p-4 mb-4 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">search</span>
                            Busca Rápida
                            <kbd className="ml-auto text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5">Ctrl+K</kbd>
                        </button>

                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 text-[12px] tracking-[0.1em] font-bold uppercase transition-all",
                                        pathname === item.href
                                            ? 'text-white border-l-2 border-white bg-white/5'
                                            : 'text-[#c8c6c5] hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span> {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <form action={logout} onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full flex items-center justify-center gap-4 p-4 rounded-sm bg-white/5 border border-white/10 text-white font-bold text-[10px] tracking-widest uppercase hover:bg-white/10">
                                    <span className="material-symbols-outlined text-[18px]">logout</span> Disconnect Session
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
