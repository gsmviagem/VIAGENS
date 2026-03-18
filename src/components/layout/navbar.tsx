'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';

const navItems = [
    { href: '/', label: 'Dashboard', icon: 'grid_view' },
    { href: '/cotacao', label: 'Quoting', icon: 'search' },
    { href: '/auto-extrator', label: 'Automations', icon: 'precision_manufacturing' },
    { href: '/emissoes', label: 'Financials', icon: 'payments' },
    { href: '/fornecedores', label: 'Suppliers', icon: 'handshake' },
    { href: '/processamento', label: 'Book', icon: 'auto_stories' },
    { href: '/configuracoes', label: 'Settings', icon: 'settings' },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-[100] px-6 py-6 flex items-center justify-between bg-transparent border-none">
                <div className="flex items-center gap-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="size-10 bg-black/10 rounded-xl flex items-center justify-center border border-black/20">
                            <span className="material-symbols-outlined text-black text-2xl">rocket_launch</span>
                        </div>
                        <Link href="/" className="text-xl font-black tracking-tighter text-black">
                            GSMVIAGEM
                        </Link>
                    </motion.div>
    
                    <nav className="hidden lg:flex items-center gap-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-extrabold flex items-center gap-2 pb-1 border-b-2 transition-all",
                                    pathname === item.href
                                        ? 'text-black border-black'
                                        : 'text-black/60 border-transparent hover:text-black'
                                )}
                            >
                                <span className="material-symbols-outlined text-[18px]">{item.icon}</span> {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
    
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center bg-black/5 border border-black/10 rounded-lg px-3 py-1.5 focus-within:border-black/30 transition-all">
                        <span className="material-symbols-outlined text-black/40 text-lg">search</span>
                        <input
                            className="bg-transparent border-none focus:outline-none text-sm w-48 text-black ml-2 placeholder:text-black/30"
                            placeholder="Quick find commands..."
                            type="text"
                        />
                        <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded text-black/50 ml-2 font-bold">⌘K</span>
                    </div>
    
                    <div className="flex items-center gap-2">
                        <button className="size-10 rounded-lg bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors relative border border-black/5">
                            <span className="material-symbols-outlined text-black/70 text-xl">notifications</span>
                            <span className="absolute top-2.5 right-2.5 size-2 bg-red-600 rounded-full ring-2 ring-white/10"></span>
                        </button>
    
                        <div className="h-8 w-[1px] bg-black/10 mx-1 hidden sm:block"></div>
    
                        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-black text-black">Alex Volkov</p>
                                <p className="text-[10px] text-black/60 uppercase font-black tracking-tighter">System Admin</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-black/20 p-0.5 overflow-hidden ring-offset-2 ring-offset-transparent group-hover:ring-2 ring-black/30 transition-all">
                                <img
                                    alt="User Avatar"
                                    className="w-full h-full rounded-full object-cover"
                                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                />
                            </div>
                            <form action={logout}>
                                <Button variant="ghost" size="icon" className="text-black/40 hover:text-red-600 ml-1">
                                    <span className="material-symbols-outlined">logout</span>
                                </Button>
                            </form>
                        </div>
    
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-black"
                            onClick={toggleMobileMenu}
                        >
                            {isMobileMenuOpen ? <span className="material-symbols-outlined text-3xl">close</span> : <span className="material-symbols-outlined text-3xl">menu</span>}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[90] lg:hidden bg-background-dark/95 backdrop-blur-2xl pt-24 px-6"
                    >
                        <nav className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl text-lg font-bold transition-all border",
                                        pathname === item.href
                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                            : 'bg-white/5 border-white/5 text-slate-400'
                                    )}
                                >
                                    <span className="material-symbols-outlined text-2xl">{item.icon}</span> {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <form action={logout} onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-lg">
                                    <span className="material-symbols-outlined text-2xl">logout</span> Sair da Sessão
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
