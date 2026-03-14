'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';

const navItems = [
    { href: '/', label: 'Fleet', icon: 'dashboard' },
    { href: '/cotacao', label: 'Operations', icon: 'settings_input_component' },
    { href: '/auto-extrator', label: 'Concierge', icon: 'concierge' }, // Mapping to existing routes with new labels
    { href: '/planilha', label: 'Logistics', icon: 'local_shipping' },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between whitespace-nowrap border-b border-primary/10 bg-black/40 backdrop-blur-md px-10 py-4 h-20">
                <div className="flex items-center gap-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 text-primary"
                    >
                        <div className="size-6 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">diamond</span>
                        </div>
                        <Link href="/" className="text-white text-xl font-bold tracking-[0.2em] uppercase">
                            GSMVIAGEM
                        </Link>
                    </motion.div>

                    <nav className="hidden lg:flex items-center gap-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-xs font-semibold uppercase letter-spacing-wide transition-colors",
                                    pathname === item.href
                                        ? 'text-primary border-b border-primary pb-1'
                                        : 'text-slate-400 hover:text-primary'
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex flex-1 justify-end gap-6 items-center">
                    <div className="hidden lg:flex flex-col min-w-40 h-10 max-w-64">
                        <div className="flex w-full flex-1 items-stretch rounded-lg bg-white/5 border border-white/10 px-3">
                            <div className="text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl">search</span>
                            </div>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-500 ml-2"
                                placeholder="Find Assets..."
                                type="text"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <button className="flex items-center justify-center rounded-full size-10 bg-white/5 border border-white/10 text-slate-300 hover:text-primary transition-all">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                        </button>
                        
                        <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
                        
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-1 py-1 pr-4">
                            <div 
                                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border border-primary/40 shadow-lg shadow-primary/20" 
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCE5J-eAfFwcyR0-KVtHp9fuTLn9VbmUQ1VzOl7sHocYz1890Cx7ysHqBUIUDja_1ZCNSlZd8N2LvxfxNCG_i82m_Ujbix2XtfKCQfoWwOpa9phFl5JI6TVWL6oDxZDikwmmIMZMyzqPBknQJlxOFlXrvWX-s1xhaY0WI28FPxnj7tKxFkTizDofipu1XcTb_Ck2sGRKybNV_T5i7s3vUnkxv0oJw9q8OMupiT5p-t6wb8nUfPgq1bTa7QJIKk-sSQwnYdOMpvUDQ')" }}
                            ></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-100 hidden sm:block">VIP Terminal</span>
                            
                            <form action={logout} className="ml-2 flex items-center">
                                <button type="submit" className="text-slate-500 hover:text-red-400 transition-colors flex items-center">
                                    <span className="material-symbols-outlined text-xl">logout</span>
                                </button>
                            </form>
                        </div>

                        <button
                            className="lg:hidden text-slate-400 size-10 flex items-center justify-center"
                            onClick={toggleMobileMenu}
                        >
                            <span className="material-symbols-outlined text-3xl">
                                {isMobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>
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
                        className="fixed inset-0 z-[90] lg:hidden bg-black/95 backdrop-blur-2xl pt-24 px-6 flex flex-col gap-6"
                    >
                        <nav className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl text-lg font-bold transition-all border uppercase tracking-[0.2em] text-xs",
                                        pathname === item.href
                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                            : 'bg-white/5 border-white/5 text-slate-400'
                                    )}
                                >
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-auto pb-12">
                            <form action={logout} onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full flex items-center justify-center gap-4 p-4 rounded-xl border border-red-500/20 text-red-500 font-bold uppercase tracking-widest text-xs">
                                    <span className="material-symbols-outlined">logout</span> Terminate Session
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
