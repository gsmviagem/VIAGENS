import { Bell, Activity, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';

export function Topbar() {
    return (
        <header className="h-16 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden text-slate-400">
                    <Menu className="h-5 w-5" />
                </Button>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center text-xs text-slate-300 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                    <Activity className="h-3.5 w-3.5 mr-2 text-green-400" />
                    <span className="font-medium mr-1 text-slate-400">Status:</span> Operacional
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30">
                    <div className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                    </div>
                </Button>
                <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
                <form action={logout}>
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-950/30 font-medium text-xs tracking-wide uppercase">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                    </Button>
                </form>
            </div>
        </header>
    );
}
