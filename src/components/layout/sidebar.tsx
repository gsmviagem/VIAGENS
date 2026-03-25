'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/app/login/actions';

const navItems = [
    { href: '/', label: 'Overview', icon: 'dashboard' },
    { href: '/dashboard', label: 'Financials (BASE)', icon: 'query_stats' },
    { href: '/emissoes', label: 'Financials', icon: 'payments' },
    { href: '/inventario', label: 'Inventory (SAÍDAS)', icon: 'inventory' },
    { href: '/fornecedores', label: 'Suppliers', icon: 'handshake' },
    { href: '/cotacao', label: 'Quoting', icon: 'search' },
    { href: '/processamento', label: 'Book', icon: 'auto_stories' },
    { href: '/auto-extrator', label: 'Automations', icon: 'precision_manufacturing' },
    { href: '/calculo', label: 'Calculator', icon: 'calculate' },
    { href: '/invoice', label: 'Invoice', icon: 'description' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-16 w-full h-16 border-b border-[#474747]/15 bg-[#0e0e0e]/90 backdrop-blur-xl hidden lg:flex items-center z-40 px-8 shadow-sm">
            <nav className="flex-1 flex space-x-2 overflow-x-auto custom-scrollbar items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold rounded-md transition-all active:scale-95 whitespace-nowrap",
                                isActive 
                                    ? 'text-white bg-white/10' 
                                    : 'text-[#c8c6c5] hover:bg-[#201f1f] hover:text-white'
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    );
}
