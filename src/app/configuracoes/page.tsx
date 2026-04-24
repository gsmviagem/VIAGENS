'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    User,
    Cpu,
    Shield,
    Save,
    RotateCcw,
    Fingerprint,
    Mail,
    Zap,
    Globe,
    Lock,
    Image,
    Trash2,
    Check,
    Link
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveProfile, profileKey, PROFILE_LABELS, type Profile } from '@/utils/profile';
import { ALL_NAV_ITEMS } from '@/utils/nav-items';

const MAX_HISTORY = 20;

interface WallpaperSettings { url: string; blur: number; dim: number; }
const DEFAULT_SETTINGS: WallpaperSettings = { url: '', blur: 0, dim: 0 };

function dispatchWallpaper(s: WallpaperSettings, profile: Profile) {
    localStorage.setItem(`hub_wallpaper_${profile}`, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('hub_wallpaper_settings_changed', { detail: s }));
}

async function loadProfileData(profile: Profile): Promise<{
    settings: WallpaperSettings;
    history: string[];
    textTheme: 'dark' | 'light';
    navHrefs: string[] | null;
}> {
    const supabase = createClient();
    const [{ data: s }, { data: h }, { data: t }, { data: n }] = await Promise.all([
        supabase.from('hub_settings').select('value').eq('key', profileKey('wallpaper_settings', profile)).maybeSingle(),
        supabase.from('hub_settings').select('value').eq('key', profileKey('wallpaper_history', profile)).maybeSingle(),
        supabase.from('hub_settings').select('value').eq('key', profileKey('text_theme', profile)).maybeSingle(),
        supabase.from('hub_settings').select('value').eq('key', profileKey('nav_items', profile)).maybeSingle(),
    ]);
    let settings = DEFAULT_SETTINGS;
    try { if (s?.value) settings = JSON.parse(s.value); } catch { /* ignore */ }
    let history: string[] = [];
    try { history = JSON.parse(h?.value || '[]'); } catch { history = []; }
    const textTheme: 'dark' | 'light' = (t?.value === 'light') ? 'light' : 'dark';
    let navHrefs: string[] | null = null;
    try { if (n?.value) navHrefs = JSON.parse(n.value); } catch { /* ignore */ }
    return { settings, history, textTheme, navHrefs };
}

export default function ConfiguracoesPage() {
    const [activeProfile, setActiveProfileState] = useState<Profile>('salem');
    const [wallpaperInput, setWallpaperInput] = useState('');
    const [wallpaperHistory, setWallpaperHistory] = useState<string[]>([]);
    const [wpSettings, setWpSettings] = useState<WallpaperSettings>(DEFAULT_SETTINGS);
    const [savingWallpaper, setSavingWallpaper] = useState(false);
    const [textTheme, setTextTheme] = useState<'dark' | 'light'>('dark');
    const [navHrefs, setNavHrefs] = useState<Set<string>>(new Set(ALL_NAV_ITEMS.map(i => i.href)));
    const [savingNav, setSavingNav] = useState(false);

    const loadForProfile = useCallback(async (profile: Profile) => {
        const data = await loadProfileData(profile);
        setWpSettings(data.settings);
        setWallpaperInput(data.settings.url);
        setWallpaperHistory(data.history);
        setTextTheme(data.textTheme);
        setNavHrefs(data.navHrefs ? new Set(data.navHrefs) : new Set(ALL_NAV_ITEMS.map(i => i.href)));
        // update wallpaper display if this is the active profile
        dispatchWallpaper(data.settings, profile);
    }, []);

    useEffect(() => {
        const profile = getActiveProfile();
        setActiveProfileState(profile);
        loadForProfile(profile);

        const onProfile = (e: Event) => {
            const p = (e as CustomEvent<Profile>).detail;
            setActiveProfileState(p);
            loadForProfile(p);
        };
        window.addEventListener('hub_profile_changed', onProfile);
        return () => window.removeEventListener('hub_profile_changed', onProfile);
    }, [loadForProfile]);

    const toggleTextTheme = async () => {
        const next = textTheme === 'dark' ? 'light' : 'dark';
        setTextTheme(next);
        localStorage.setItem(`hub_text_theme_${activeProfile}`, next);
        window.dispatchEvent(new CustomEvent('hub_text_theme_changed', { detail: next }));
        const supabase = createClient();
        await supabase.from('hub_settings').upsert({ key: profileKey('text_theme', activeProfile), value: next, updated_at: new Date().toISOString() });
        toast.success(next === 'light' ? 'Texto claro ativado.' : 'Texto escuro ativado.');
    };

    const applyWallpaper = async (url: string) => {
        const trimmed = url.trim();
        const next: WallpaperSettings = { ...wpSettings, url: trimmed };
        setSavingWallpaper(true);
        try {
            const newHistory = trimmed
                ? [trimmed, ...wallpaperHistory.filter(h => h !== trimmed)].slice(0, MAX_HISTORY)
                : wallpaperHistory;
            const supabase = createClient();
            await Promise.all([
                supabase.from('hub_settings').upsert({ key: profileKey('wallpaper_settings', activeProfile), value: JSON.stringify(next), updated_at: new Date().toISOString() }),
                supabase.from('hub_settings').upsert({ key: profileKey('wallpaper_history', activeProfile), value: JSON.stringify(newHistory), updated_at: new Date().toISOString() }),
            ]);
            setWpSettings(next);
            setWallpaperHistory(newHistory);
            dispatchWallpaper(next, activeProfile);
            toast.success(trimmed ? 'Papel de parede aplicado!' : 'Papel de parede removido.');
        } catch {
            toast.error('Erro ao salvar no Supabase.');
        } finally {
            setSavingWallpaper(false);
        }
    };

    const updateEffect = async (patch: Partial<WallpaperSettings>) => {
        const next = { ...wpSettings, ...patch };
        setWpSettings(next);
        dispatchWallpaper(next, activeProfile);
        const supabase = createClient();
        supabase.from('hub_settings').upsert({ key: profileKey('wallpaper_settings', activeProfile), value: JSON.stringify(next), updated_at: new Date().toISOString() });
    };

    const removeFromHistory = async (url: string) => {
        const newHistory = wallpaperHistory.filter(h => h !== url);
        const newSettings = wpSettings.url === url ? { ...wpSettings, url: '' } : wpSettings;
        setSavingWallpaper(true);
        try {
            const supabase = createClient();
            await Promise.all([
                supabase.from('hub_settings').upsert({ key: profileKey('wallpaper_settings', activeProfile), value: JSON.stringify(newSettings), updated_at: new Date().toISOString() }),
                supabase.from('hub_settings').upsert({ key: profileKey('wallpaper_history', activeProfile), value: JSON.stringify(newHistory), updated_at: new Date().toISOString() }),
            ]);
            setWallpaperHistory(newHistory);
            setWpSettings(newSettings);
            dispatchWallpaper(newSettings, activeProfile);
        } catch {
            toast.error('Erro ao salvar no Supabase.');
        } finally {
            setSavingWallpaper(false);
        }
    };

    const toggleNavItem = (href: string) => {
        setNavHrefs(prev => {
            const next = new Set(prev);
            if (next.has(href)) {
                if (next.size <= 1) return prev; // always keep at least one
                next.delete(href);
            } else {
                next.add(href);
            }
            return next;
        });
    };

    const saveNavItems = async () => {
        setSavingNav(true);
        try {
            const hrefs = Array.from(navHrefs);
            const supabase = createClient();
            await supabase.from('hub_settings').upsert({ key: profileKey('nav_items', activeProfile), value: JSON.stringify(hrefs), updated_at: new Date().toISOString() });
            localStorage.setItem(`hub_nav_${activeProfile}`, JSON.stringify(hrefs));
            window.dispatchEvent(new CustomEvent('hub_nav_items_changed', { detail: { profile: activeProfile, hrefs } }));
            toast.success('Menu atualizado!');
        } catch {
            toast.error('Erro ao salvar no Supabase.');
        } finally {
            setSavingNav(false);
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0"
            >
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mb-1">
                        Configurando perfil de
                    </p>
                    <h1 className="text-4xl font-black text-white tracking-tight">{PROFILE_LABELS[activeProfile]}</h1>
                    <p className="text-white/70 max-w-xl font-bold">Configure parâmetros operacionais, credenciais de segurança e motores de automação.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="glass-panel border-black/10 text-white/60 hover:bg-black/5 uppercase text-[10px] font-black tracking-widest">
                        <Fingerprint className="mr-2 h-4 w-4" /> Audit Logs
                    </Button>
                </div>
            </motion.div>

            <Tabs defaultValue="geral" className="flex-1 min-h-0 flex flex-col">
                <TabsList className="bg-white/5 border border-white/10 p-1 mb-8 h-auto flex flex-wrap gap-2 backdrop-blur-xl rounded-2xl w-fit shrink-0">
                    <TabsTrigger
                        value="geral"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <User size={16} /> Profile
                    </TabsTrigger>
                    <TabsTrigger
                        value="automacao"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Zap size={16} /> Automation
                    </TabsTrigger>
                    <TabsTrigger
                        value="planilha"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Globe size={16} /> Integration
                    </TabsTrigger>
                    <TabsTrigger
                        value="seguranca"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Shield size={16} /> Security
                    </TabsTrigger>
                    <TabsTrigger
                        value="aparencia"
                        className="data-[state=active]:bg-primary data-[state=active]:text-background-dark text-slate-400 py-2.5 px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Image size={16} /> Appearance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="geral">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-8 border border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <User className="text-primary w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white leading-none">Perfil Operacional</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Manage identities and visual preferences</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors">Display Name</Label>
                                <Input
                                    defaultValue="Operador Base"
                                    className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary rounded-xl"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors">Emergency Protocol Mail</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        defaultValue="operador@gsmviagem.com.br"
                                        className="pl-11 h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <Button className="bg-primary text-background-dark font-black px-8 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                                    <Save size={18} /> SAVE CHANGES
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="automacao">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-8 border border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <Zap className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-none">Motor de Automação</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Global behavior and bot clustering</p>
                                </div>
                            </div>
                            <Badge className="bg-green-500/10 text-green-400 border-none font-black text-[10px] px-3 py-1">V2.4 ACTIVE</Badge>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex justify-between group-focus-within:text-primary transition-colors">
                                    Refresh Rate (Minutes)
                                    <span className="text-primary/70">OPTIMAL: 30</span>
                                </Label>
                                <Input
                                    type="number"
                                    defaultValue="30"
                                    className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary font-mono rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation Protocol</Label>
                                <select className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all appearance-none cursor-pointer">
                                    <option value="auto" className="bg-background-dark">Autonomous Cluster (Full Background)</option>
                                    <option value="semi" className="bg-background-dark">Sentinel Mode (SMS Gate-kept)</option>
                                    <option value="manual" className="bg-background-dark">Explicit Trigger (On-Demand)</option>
                                </select>
                            </div>
                            <div className="pt-6 flex justify-between gap-4">
                                <Button variant="outline" className="glass-panel border-white/10 text-slate-400 hover:text-white h-12 px-6 rounded-xl">
                                    <RotateCcw size={18} className="mr-2" /> FACTORY RESET
                                </Button>
                                <Button className="bg-primary text-background-dark font-black px-8 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                                    <Cpu size={18} /> UPDATING KERNEL
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="seguranca">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-8 border border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Shield className="text-blue-500 w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white leading-none">Credenciais de Segurança</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Update your authentication protocol</p>
                            </div>
                        </div>

                        <form action={async (formData) => {
                            const { changePassword } = await import('./actions');
                            const res = await changePassword(formData);
                            if (res?.error) {
                                toast.error(res.error);
                            } else if (res?.success) {
                                toast.success(res.success);
                            }
                        }} className="space-y-6">
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-500 transition-colors">Nova Senha</Label>
                                <Input
                                    type="password"
                                    name="password"
                                    required
                                    className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-red-500 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-blue-500 transition-colors">Confirmar Nova Senha</Label>
                                <Input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-red-500 rounded-xl"
                                />
                            </div>
                            <div className="pt-6 flex gap-4">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                                    <Lock size={18} /> ALTERAR SENHA
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </TabsContent>

                <TabsContent value="aparencia" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel rounded-2xl p-8 border border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent space-y-10"
                    >
                        {/* Wallpaper section */}
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <Image className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-none">Papel de Parede</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Perfil: {PROFILE_LABELS[activeProfile]}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Text Theme */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor do Texto</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Para uso com papel de parede claro</p>
                                    </div>
                                    <Button
                                        onClick={toggleTextTheme}
                                        variant="outline"
                                        className={cn(
                                            "h-9 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all",
                                            textTheme === 'light'
                                                ? "bg-white text-black border-white/20 hover:bg-white/90"
                                                : "bg-transparent text-white/60 border-white/10 hover:bg-white/5"
                                        )}
                                    >
                                        {textTheme === 'light' ? 'Texto Preto' : 'Texto Branco'}
                                    </Button>
                                </div>

                                {/* URL Input */}
                                <div className="space-y-2 group">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-primary transition-colors">URL do Wallpaper</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input
                                                value={wallpaperInput}
                                                onChange={e => setWallpaperInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && applyWallpaper(wallpaperInput)}
                                                placeholder="https://... (imagem, vídeo ou YouTube)"
                                                className="pl-11 h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary rounded-xl"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => applyWallpaper(wallpaperInput)}
                                            disabled={savingWallpaper}
                                            className="bg-primary text-background-dark font-black h-12 px-6 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
                                        >
                                            {savingWallpaper ? <RotateCcw size={16} className="animate-spin" /> : <Check size={18} />}
                                        </Button>
                                    </div>
                                    {wpSettings.url && (
                                        <p className="text-[10px] text-primary/70 truncate font-mono mt-1">Ativo: {wpSettings.url}</p>
                                    )}
                                </div>

                                {/* Sliders */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Desfoque (Blur)</Label>
                                            <span className="text-[10px] font-mono text-primary/70">{wpSettings.blur}px</span>
                                        </div>
                                        <input type="range" min={0} max={20} step={1} value={wpSettings.blur}
                                            onChange={e => updateEffect({ blur: Number(e.target.value) })}
                                            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer" />
                                        <div className="flex justify-between text-[9px] text-slate-600 font-bold"><span>OFF</span><span>Máx (20px)</span></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Escurecimento (Dim)</Label>
                                            <span className="text-[10px] font-mono text-primary/70">{wpSettings.dim}%</span>
                                        </div>
                                        <input type="range" min={0} max={90} step={5} value={wpSettings.dim}
                                            onChange={e => updateEffect({ dim: Number(e.target.value) })}
                                            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer" />
                                        <div className="flex justify-between text-[9px] text-slate-600 font-bold"><span>OFF</span><span>Máx (90%)</span></div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => { setWallpaperInput(''); applyWallpaper(''); }} disabled={savingWallpaper}
                                        className="glass-panel border-white/10 text-slate-400 hover:text-white h-10 px-4 rounded-xl text-[11px] font-bold disabled:opacity-50">
                                        <Trash2 size={14} className="mr-1" /> Remover wallpaper
                                    </Button>
                                </div>

                                {/* History */}
                                {wallpaperHistory.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Histórico</Label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {wallpaperHistory.map((url, i) => (
                                                <div key={i} className={cn(
                                                    "flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer group",
                                                    wpSettings.url === url ? "border-primary/50 bg-primary/10" : "border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/10"
                                                )} onClick={() => { setWallpaperInput(url); applyWallpaper(url); }}>
                                                    <span className="flex-1 text-[11px] text-white/70 font-mono truncate">{url}</span>
                                                    {wpSettings.url === url && <Check size={12} className="text-primary shrink-0" />}
                                                    <button onClick={e => { e.stopPropagation(); removeFromHistory(url); }}
                                                        className="shrink-0 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Nav Items section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-white leading-none">Menu de Navegação</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Itens visíveis para {PROFILE_LABELS[activeProfile]}</p>
                                </div>
                                <Button
                                    onClick={saveNavItems}
                                    disabled={savingNav}
                                    className="bg-primary text-background-dark font-black h-9 px-4 rounded-xl text-[10px] shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    {savingNav ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />}
                                    <span className="ml-1.5">Salvar</span>
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_NAV_ITEMS.map(item => {
                                    const active = navHrefs.has(item.href);
                                    return (
                                        <button
                                            key={item.href}
                                            onClick={() => toggleNavItem(item.href)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                                                active
                                                    ? "bg-primary/10 border-primary/30 text-white"
                                                    : "bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/[0.06]"
                                            )}
                                        >
                                            <span className={cn("material-symbols-outlined text-[16px]", active ? "text-primary" : "text-white/20")}>{item.icon}</span>
                                            <span className="text-[11px] font-bold uppercase tracking-wide">{item.label}</span>
                                            {active && <Check size={12} className="ml-auto text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

            </Tabs>
        </div>
    );
}
