'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    Cpu,
    CreditCard,
    Settings,
    Search,
    Bell,
    Rocket,
    Search as SearchIcon,
    Terminal as TerminalIcon,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutGrid },
    { href: '/auto-extrator', label: 'Automations', icon: Cpu },
    { href: '/emissoes', label: 'Financials', icon: CreditCard },
    { href: '/processamento', label: 'Processor', icon: TerminalIcon },
    { href: '/configuracoes', label: 'Settings', icon: Settings },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-[100] px-6 py-3 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-background-dark/80">
                <div className="flex items-center gap-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                            <Rocket className="text-primary w-6 h-6" />
                        </div>
                        <Link href="/" className="text-xl font-extrabold tracking-tighter bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">
                            GSMVIAGEM
                        </Link>
                    </motion.div>

                    <nav className="hidden lg:flex items-center gap-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium flex items-center gap-2 pb-1 border-b-2 transition-all",
                                    pathname === item.href
                                        ? 'text-primary border-primary'
                                        : 'text-slate-400 border-transparent hover:text-white'
                                )}
                            >
                                <item.icon size={16} /> {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-all">
                        <SearchIcon className="text-slate-400 w-4 h-4" />
                        <input
                            className="bg-transparent border-none focus:outline-none text-sm w-48 text-slate-200 ml-2"
                            placeholder="Quick find commands..."
                            type="text"
                        />
                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 ml-2">⌘K</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors relative">
                            <Bell className="text-slate-300 w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background-dark"></span>
                        </button>

                        <div className="h-8 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>

                        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-white">Alex Volkov</p>
                                <p className="text-[10px] text-primary uppercase font-bold tracking-tighter">System Admin</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-primary/30 p-0.5 overflow-hidden ring-offset-2 ring-offset-background-dark group-hover:ring-2 ring-primary/50 transition-all">
                                <img
                                    alt="User Avatar"
                                    className="w-full h-full rounded-full object-cover"
                                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                />
                            </div>
                            <form action={logout}>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 ml-1">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-slate-400"
                            onClick={toggleMobileMenu}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
                                    <item.icon size={24} /> {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <form action={logout} onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-lg">
                                    <LogOut size={24} /> Sair da Sessão
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
