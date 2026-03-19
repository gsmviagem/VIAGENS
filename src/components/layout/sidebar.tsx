'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 border-r border-[#474747]/15 bg-[#0e0e0e] hidden lg:flex flex-col py-8 z-40">
            <div className="px-6 mb-10">
                <h3 className="font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-secondary mb-1">Titanium Hub</h3>
                <p className="text-[11px] text-outline">Elite Status Verified</p>
            </div>
            
            <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-4 px-6 py-4 font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold transition-all active:translate-x-1",
                                isActive 
                                    ? 'text-white bg-white/5 border-r-2 border-white' 
                                    : 'text-[#c8c6c5] hover:bg-[#201f1f] hover:text-white'
                            )}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-4 px-2">
                <Link
                    href="/configuracoes"
                    className="flex items-center gap-4 text-[#c8c6c5] px-4 py-3 font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">settings</span>
                    Settings
                </Link>
                <form action={logout}>
                    <button className="w-full flex items-center gap-4 text-[#c8c6c5] px-4 py-3 font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold hover:text-white transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                        Sign Out
                    </button>
                </form>
            </div>
        </aside>
    );
}
