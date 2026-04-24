export interface NavItem { href: string; label: string; icon: string; }

export const ALL_NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Overview', icon: 'dashboard' },
    { href: '/cotacao', label: 'Quoting', icon: 'search' },
    { href: '/busca-ideal', label: 'Miles', icon: 'airlines' },
    { href: '/processamento', label: 'Book', icon: 'auto_stories' },
    { href: '/inventario', label: 'Inventory', icon: 'inventory' },
    { href: '/dashboard', label: 'Financials', icon: 'payments' },
    { href: '/fornecedores', label: 'Suppliers', icon: 'handshake' },
    { href: '/cancelamentos', label: 'Cancel', icon: 'cancel_schedule_send' },
    { href: '/auto-extrator', label: 'Automations', icon: 'precision_manufacturing' },
    { href: '/calculo', label: 'Calculator', icon: 'calculate' },
    { href: '/invoice', label: 'Invoice', icon: 'description' },
    { href: '/ferramentas', label: 'Tools', icon: 'build' },
    { href: '/monitor', label: 'Monitor', icon: 'monitor' },
    { href: '/campanhas', label: 'Campaigns', icon: 'campaign' },
    { href: '/expert', label: 'Expert', icon: 'travel_explore' },
    { href: '/configuracoes', label: 'Settings', icon: 'settings' },
];
