'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Bot, Search, Ticket,
    Database, Settings, PlaneTakeoff,
    Bell, Activity, LogOut, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/auto-extrator', label: 'Auto-Extrator', icon: Bot },
    { href: '/busca', label: 'Busca', icon: Search },
    { href: '/emissoes', label: 'Emissões', icon: Ticket },
    { href: '/planilha', label: 'Sync', icon: Database },
    { href: '/configuracoes', label: 'Config', icon: Settings },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <header className="h-16 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6">
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center text-cyan-400 font-black text-xl tracking-tighter uppercase text-glow">
                    <PlaneTakeoff className="mr-2 h-6 w-6 text-cyan-400" />
                    GSMVIAGEM
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all group",
                                pathname === item.href
                                    ? "text-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_-3px_rgba(34,211,238,0.2)]"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn(
                                "h-4 w-4 mr-2 transition-all",
                                pathname === item.href ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center text-[10px] font-mono text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <Activity className="h-3 w-3 mr-2 text-green-400" />
                    STATUS: <span className="text-green-400 ml-1">OPERACIONAL</span>
                </div>

                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/20 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
                    </span>
                </Button>

                <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                <form action={logout}>
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-950/20 font-bold text-[10px] uppercase tracking-wider">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                    </Button>
                </form>

                <Button variant="ghost" size="icon" className="lg:hidden text-slate-400">
                    <Menu className="h-6 w-6" />
                </Button>
            </div>
        </header>
    );
}
