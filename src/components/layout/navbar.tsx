'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { logout } from '@/app/login/actions';

const navItems = [
    { href: '/', label: 'Overview', icon: 'dashboard' },
    { href: '/cotacao', label: 'Quoting', icon: 'search' },
    { href: '/processamento', label: 'Book', icon: 'auto_stories' },
    { href: '/inventario', label: 'Inventory', icon: 'inventory' },
    { href: '/emissoes', label: 'Financials', icon: 'payments' },
    { href: '/fornecedores', label: 'Suppliers', icon: 'handshake' },
    { href: '/auto-extrator', label: 'Automations', icon: 'precision_manufacturing' },
    { href: '/configuracoes', label: 'Settings', icon: 'settings' }
];

export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-[#131313]/90 backdrop-blur-xl border-b border-[#474747]/30 shadow-[0_40px_40px_rgba(0,0,0,0.08)] flex justify-between items-center px-8 h-16">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-black tracking-[0.1em] text-white">CHRONOS</Link>
                    
                    {/* Horizontal Quick Links for Desktop */}
                    <div className="hidden lg:flex gap-6">
                        <Link href="/" className={cn("font-['Inter'] tracking-[0.05em] uppercase text-[12px] font-medium pb-1 active:scale-95 transition-transform", pathname === '/' ? 'text-white border-b border-white' : 'text-[#c8c6c5] hover:text-white transition-colors hover:bg-white/5')}>Dashboard</Link>
                        <Link href="/inventario" className={cn("font-['Inter'] tracking-[0.05em] uppercase text-[12px] font-medium pb-1 active:scale-95 transition-transform", pathname === '/inventario' ? 'text-white border-b border-white' : 'text-[#c8c6c5] hover:text-white transition-colors hover:bg-white/5')}>Assets</Link>
                        <Link href="/fornecedores" className={cn("font-['Inter'] tracking-[0.05em] uppercase text-[12px] font-medium pb-1 active:scale-95 transition-transform", pathname === '/fornecedores' ? 'text-white border-b border-white' : 'text-[#c8c6c5] hover:text-white transition-colors hover:bg-white/5')}>Network</Link>
                        <Link href="/cotacao" className={cn("font-['Inter'] tracking-[0.05em] uppercase text-[12px] font-medium pb-1 active:scale-95 transition-transform", pathname === '/cotacao' ? 'text-white border-b border-white' : 'text-[#c8c6c5] hover:text-white transition-colors hover:bg-white/5')}>Market</Link>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="hidden sm:block p-2 hover:bg-white/5 rounded-full transition-all active:scale-95">
                        <span className="material-symbols-outlined text-white">notifications</span>
                    </button>
                    <Link href="/configuracoes" className="hidden lg:block p-2 hover:bg-white/5 rounded-full transition-all active:scale-95">
                        <span className="material-symbols-outlined text-white">settings</span>
                    </Link>
                    
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 hidden sm:block">
                        <img alt="User Profile" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" />
                    </div>

                    <button
                        className="lg:hidden p-2 hover:bg-white/5 rounded-full transition-all active:scale-95"
                        onClick={toggleMobileMenu}
                    >
                        {isMobileMenuOpen ? <span className="material-symbols-outlined text-white">close</span> : <span className="material-symbols-outlined text-white">menu</span>}
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
        </>
    );
}
