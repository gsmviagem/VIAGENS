import Link from 'next/link';
import { LayoutDashboard, Bot, Search, Ticket, Database, Settings, PlaneTakeoff } from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/auto-extrator', label: 'Auto-Extrator', icon: Bot },
    { href: '/busca', label: 'Busca em Tempo Real', icon: Search },
    { href: '/emissoes', label: 'Emissões', icon: Ticket },
    { href: '/planilha', label: 'Planilha / Sync', icon: Database },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
    return (
        <aside className="w-64 glass-card backdrop-blur-2xl border-r border-white/10 hidden md:flex flex-col h-screen fixed left-0 top-0 text-slate-300 z-50 rounded-none border-y-0 border-l-0">
            <div className="h-16 flex items-center px-6 border-b border-white/5 text-cyan-400 font-black text-xl tracking-tighter uppercase text-glow">
                <PlaneTakeoff className="mr-3 h-6 w-6 text-cyan-400" />
                GSMVIAGEM
            </div>
            <div className="px-6 py-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Módulos</div>
            </div>
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center px-3 py-2.5 rounded-md hover:bg-cyan-950/30 hover:text-cyan-400 transition-colors group"
                    >
                        <item.icon className="h-5 w-5 mr-3 text-slate-500 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all" />
                        <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-100 border border-slate-700">
                        OP
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-200">Operador Base</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
