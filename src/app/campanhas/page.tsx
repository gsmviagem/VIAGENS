'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { analyzeTC, extractFacts, type RuleMatch, type ExtractedFact } from '@/utils/tc-analyzer';

const SUPABASE_KEY = 'program_milheiros';

const DEFAULT_PROGRAMS = [
    { name: 'Esfera', milheiro: 35 },
    { name: 'Livelo', milheiro: 30 },
    { name: 'Smiles', milheiro: 28 },
    { name: 'TudoAzul', milheiro: 32 },
    { name: 'Latam Pass', milheiro: 38 },
];

interface Program { name: string; milheiro: number; }

function fmtMilhas(n: number): string { return n.toLocaleString('pt-BR'); }
function fmtCurrency(n: number): string {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
function parseBR(val: string): number {
    const n = parseFloat(val.replace(',', '.'));
    return isNaN(n) ? 0 : n;
}
function milheiroColor(m: number) {
    if (m <= 0) return { text: 'text-white/40', border: 'border-white/5', bg: '' };
    if (m <= 25) return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' };
    if (m <= 40) return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' };
    return { text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' };
}
function milheiroLabel(m: number) {
    if (m <= 0) return 'custo por 1.000 milhas';
    if (m <= 25) return '✓ Ótimo negócio';
    if (m <= 40) return '~ Razoável';
    return '✗ Caro';
}

export default function CampanhasPage() {
    const supabase = createClient();

    // Programs
    const [programs, setPrograms] = useState<Program[]>(DEFAULT_PROGRAMS);
    const [progLoading, setProgLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newMilheiro, setNewMilheiro] = useState('');
    const [editIdx, setEditIdx] = useState<number | null>(null);

    // Calc inputs
    const [bonus, setBonus] = useState('');
    const [teto, setTeto] = useState('');
    const [valorPago, setValorPago] = useState('');
    const [milhasGastas, setMilhasGastas] = useState('');
    const [taxaConversao, setTaxaConversao] = useState('');  // pontos por milha, ex: 3
    const [selectedProg, setSelectedProg] = useState('');
    const [milheiroAvulso, setMilheiroAvulso] = useState('');

    // T&C
    const [termos, setTermos] = useState('');

    // Load programs from Supabase
    useEffect(() => {
        supabase
            .from('hub_settings')
            .select('value')
            .eq('key', SUPABASE_KEY)
            .maybeSingle()
            .then(({ data }) => {
                if (data?.value) {
                    try {
                        const parsed = JSON.parse(data.value);
                        if (Array.isArray(parsed) && parsed.length > 0) setPrograms(parsed);
                    } catch { /* ignore */ }
                }
                setProgLoading(false);
            });
    }, []);

    const savePrograms = useCallback(async (list: Program[]) => {
        const value = JSON.stringify(list);
        await supabase
            .from('hub_settings')
            .upsert({ key: SUPABASE_KEY, value }, { onConflict: 'key' });
    }, [supabase]);

    // Calc — tudo em K
    const bonusPct = parseBR(bonus);
    const tetoK = parseBR(teto);
    const valorNum = parseBR(valorPago);
    const taxaRaw = parseBR(taxaConversao);
    const taxaConversaoNum = taxaRaw > 0 ? taxaRaw : 1;   // pontos por milha (default 1:1)
    const milheiroAvulsoNum = parseBR(milheiroAvulso);
    const prog = programs.find(p => p.name === selectedProg);
    const milheiroProg = milheiroAvulsoNum > 0 ? milheiroAvulsoNum : (prog?.milheiro ?? 0);

    // Optimal recommendation cards
    const maxTransferK   = bonusPct > 0 && tetoK > 0 ? (tetoK / (bonusPct / 100)) * taxaConversaoNum : 0;
    const milhasBaseMaxK = maxTransferK > 0 ? maxTransferK / taxaConversaoNum : 0;
    const milhasTotalK   = milhasBaseMaxK + tetoK;

    // Actual cost — based on what user typed in milhasGastas (falls back to maxTransfer)
    const milhasGastasK     = parseBR(milhasGastas);
    const pontosTransferK   = milhasGastasK > 0 ? milhasGastasK : maxTransferK;
    const milhasBaseActualK = pontosTransferK / taxaConversaoNum;
    const bonusActualK      = bonusPct > 0 ? Math.min(milhasBaseActualK * (bonusPct / 100), tetoK > 0 ? tetoK : Infinity) : 0;
    const milhasActualK     = milhasBaseActualK + bonusActualK;
    const custoMilhas       = milheiroProg * pontosTransferK;
    const custoTotal        = custoMilhas + valorNum;
    const milheiroEfetivo   = milhasActualK > 0 && custoTotal > 0 ? custoTotal / milhasActualK : 0;

    const hasCalc = maxTransferK > 0 || tetoK > 0;
    const colors = milheiroColor(milheiroEfetivo);

    // T&C analysis (live, client-side)
    const tcResults: RuleMatch[] = useMemo(() => analyzeTC(termos), [termos]);
    const tcFacts: ExtractedFact[] = useMemo(() => extractFacts(termos), [termos]);

    // Auto-fill calculator from extracted facts (only fills empty fields)
    useEffect(() => {
        for (const f of tcFacts) {
            if (!f.fieldKey || f.rawValue == null) continue;
            if (f.fieldKey === 'bonus' && !bonus) setBonus(String(f.rawValue));
            if (f.fieldKey === 'teto'  && !teto)  setTeto(String(f.rawValue));
            if (f.fieldKey === 'conversao' && !taxaConversao) setTaxaConversao(String(f.rawValue));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tcFacts]);
    const criticals = tcResults.filter(r => r.level === 'critical');
    const warnings = tcResults.filter(r => r.level === 'warning');
    const infos = tcResults.filter(r => r.level === 'info');

    // Program table actions
    const addProgram = async () => {
        const n = newName.trim();
        const m = parseBR(newMilheiro);
        if (!n || m <= 0) { toast.error('Nome e milheiro válido obrigatórios.'); return; }
        if (programs.some(p => p.name.toLowerCase() === n.toLowerCase())) { toast.error('Programa já existe.'); return; }
        const updated = [...programs, { name: n, milheiro: m }];
        setPrograms(updated);
        setNewName(''); setNewMilheiro('');
        await savePrograms(updated);
    };

    const removeProgram = async (idx: number) => {
        const removed = programs[idx].name;
        const updated = programs.filter((_, i) => i !== idx);
        setPrograms(updated);
        if (selectedProg === removed) setSelectedProg('');
        await savePrograms(updated);
    };

    const startEdit = (idx: number) => {
        setEditIdx(idx);
        setNewName(programs[idx].name);
        setNewMilheiro(String(programs[idx].milheiro));
    };

    const saveEdit = async () => {
        if (editIdx === null) return;
        const n = newName.trim();
        const m = parseBR(newMilheiro);
        if (!n || m <= 0) { toast.error('Nome e milheiro válido obrigatórios.'); return; }
        const updated = programs.map((p, i) => i === editIdx ? { name: n, milheiro: m } : p);
        if (selectedProg === programs[editIdx].name) setSelectedProg(n);
        setPrograms(updated);
        setEditIdx(null); setNewName(''); setNewMilheiro('');
        await savePrograms(updated);
    };

    return (
        <div className="h-full overflow-hidden flex flex-col gap-3">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-1 shrink-0">
                <h1 className="text-4xl font-black text-white tracking-tight">Campanhas</h1>
                <p className="text-white/50 font-bold text-sm">Calcule o custo real da transferência com bônus e analise os termos automaticamente.</p>
            </motion.div>

            {/* TOP ROW: Program table + Calculator */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-3">

                {/* Program Table */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center gap-2.5 shrink-0">
                        <span className="material-symbols-outlined text-primary text-xl">table_chart</span>
                        <div>
                            <h2 className="text-white font-black text-base leading-none">Programas</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">Milheiro por programa</p>
                        </div>
                        {progLoading && <span className="material-symbols-outlined animate-spin text-white/20 text-[14px] ml-auto">refresh</span>}
                    </div>

                    <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                        {programs.map((p, i) => (
                            <div
                                key={i}
                                onClick={() => editIdx === null && setSelectedProg(p.name)}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all group",
                                    selectedProg === p.name ? "bg-primary/10 border border-primary/20" : "bg-white/[0.03] hover:bg-white/[0.06] border border-transparent"
                                )}
                            >
                                <span className={cn("text-[11px] font-black uppercase tracking-wide", selectedProg === p.name ? "text-primary" : "text-white/60 group-hover:text-white/80")}>{p.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm font-black tabular-nums font-mono", selectedProg === p.name ? "text-white" : "text-white/80")}>{fmtCurrency(p.milheiro)}</span>
                                    <button onClick={e => { e.stopPropagation(); startEdit(i); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all">
                                        <span className="material-symbols-outlined text-[13px]">edit</span>
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); removeProgram(i); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all">
                                        <span className="material-symbols-outlined text-[13px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="shrink-0 space-y-2 pt-2 border-t border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{editIdx !== null ? 'Editar programa' : 'Adicionar programa'}</p>
                        <div className="flex gap-2">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome"
                                className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-white text-[11px] font-bold focus:outline-none focus:border-primary/40 transition-all" />
                            <div className="relative w-24">
                                <input type="number" value={newMilheiro} onChange={e => setNewMilheiro(e.target.value)} placeholder="35"
                                    className="w-full h-9 bg-white/5 border border-white/10 rounded-xl pl-3 pr-6 text-white text-[11px] font-mono focus:outline-none focus:border-primary/40 transition-all" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[9px] font-bold">R$</span>
                            </div>
                            <button onClick={editIdx !== null ? saveEdit : addProgram}
                                className="h-9 px-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-black text-[10px] uppercase tracking-widest transition-all">
                                {editIdx !== null ? 'OK' : '+'}
                            </button>
                            {editIdx !== null && (
                                <button onClick={() => { setEditIdx(null); setNewName(''); setNewMilheiro(''); }}
                                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 font-black text-[10px] transition-all">✕</button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Calculator */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="xl:col-span-2 glass-panel rounded-2xl p-6 border border-white/5 space-y-5 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-400 text-2xl">calculate</span>
                        <div>
                            <h2 className="text-white font-black text-lg leading-none">Calculadora de Transferência</h2>
                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-1">Bônus · Teto · Milheiro Efetivo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Bônus</label>
                            <div className="relative">
                                <input type="number" min="0" max="1000" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="100"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 transition-all" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">%</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Teto de Bônus</label>
                            <div className="relative">
                                <input type="number" min="0" value={teto} onChange={e => setTeto(e.target.value)} placeholder="50"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 transition-all" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">K</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Milhas Gastas</label>
                            <div className="relative">
                                <input type="number" min="0" value={milhasGastas} onChange={e => setMilhasGastas(e.target.value)} placeholder="50"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 transition-all" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">K</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Conversão</label>
                            <div className="relative">
                                <input type="number" min="1" value={taxaConversao} onChange={e => setTaxaConversao(e.target.value)} placeholder="1"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 transition-all" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 text-[9px] font-bold leading-tight text-right">pts/<br/>mi</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Valor Pago</label>
                            <div className="relative">
                                <input type="number" min="0" value={valorPago} onChange={e => setValorPago(e.target.value)} placeholder="0"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 transition-all" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">R$</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={cn("flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-all", (selectedProg && !milheiroAvulso) ? "bg-primary/5 border border-primary/15" : "bg-white/[0.02] border border-white/5")}>
                            <span className="material-symbols-outlined text-[14px] text-white/30">hub</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Programa:</span>
                            {selectedProg && !milheiroAvulso
                                ? <span className="text-[11px] font-black text-primary">{selectedProg} — <span className="font-mono">{fmtCurrency(milheiroProg)}/K</span></span>
                                : <span className="text-[10px] text-white/20 italic">{milheiroAvulso ? 'milheiro avulso ativo' : 'selecione na tabela ao lado'}</span>}
                        </div>
                        <div className="space-y-0 shrink-0">
                            <div className="relative w-36">
                                <input type="number" min="0" value={milheiroAvulso} onChange={e => setMilheiroAvulso(e.target.value)} placeholder="Milheiro avulso"
                                    className="w-full h-9 bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 text-white font-mono text-[11px] focus:outline-none focus:border-primary/40 transition-all placeholder:text-white/20" />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-[9px] font-bold">R$/K</span>
                            </div>
                        </div>
                    </div>

                    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3 transition-opacity duration-300", !hasCalc && "opacity-25 pointer-events-none")}>
                        <div className="glass-panel rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400/70">Máx. a Transferir</p>
                            <p className="text-white font-black text-xl font-mono">{maxTransferK > 0 ? `${fmtMilhas(maxTransferK)}K` : '—'}</p>
                            <p className="text-white/30 text-[10px]">{maxTransferK > 0 ? `para atingir o teto de ${tetoK}K bônus` : 'defina bônus e teto'}</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Total com Bônus</p>
                            <p className="text-white font-black text-xl font-mono">{fmtMilhas(milhasTotalK * 1000)}</p>
                            <p className="text-white/30 text-[10px]">
                                {tetoK > 0 ? `+${fmtMilhas(tetoK * 1000)} bônus incluídos` : 'defina o teto de bônus'}
                            </p>
                        </div>
                        <div className={cn("glass-panel rounded-xl p-4 border space-y-1", colors.border, colors.bg)}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Milheiro Efetivo</p>
                            <p className={cn("font-black text-xl font-mono", colors.text)}>{milheiroEfetivo > 0 ? fmtCurrency(milheiroEfetivo / 100) : '—'}</p>
                            <p className="text-white/30 text-[10px]">{milheiroLabel(milheiroEfetivo / 100)}</p>
                        </div>
                    </div>

                    {hasCalc && custoTotal > 0 && (
                        <div className="text-[11px] text-white/25 font-mono bg-white/[0.02] rounded-xl px-4 py-3 space-y-1">
                            {taxaConversaoNum > 1 && pontosTransferK > 0 && <div>Conversão: <span className="text-white/50">{pontosTransferK.toFixed(1)}K pontos ÷ {taxaConversaoNum} = {fmtMilhas(milhasBaseActualK * 1000)} milhas base</span></div>}
                            {milheiroProg > 0 && pontosTransferK > 0 && <div>Custo milhas: <span className="text-white/50">{fmtCurrency(milheiroProg)} × {pontosTransferK.toFixed(1)}K = {fmtCurrency(custoMilhas)}</span></div>}
                            {valorNum > 0 && <div>+ Valor pago: <span className="text-white/50">{fmtCurrency(valorNum)}</span></div>}
                            <div className="pt-1 border-t border-white/5">
                                Custo total: <span className="text-white/60 font-bold">{fmtCurrency(custoTotal)}</span>
                                {milhasTotalK > 0 && <> ÷ {fmtMilhas(milhasTotalK * 1000)} milhas = <span className="text-white/60 font-bold">{fmtCurrency(milheiroEfetivo / 100)}/K</span></>}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* T&C Analyzer */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3 shrink-0 flex flex-col" style={{ height: '46%' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-400 text-2xl">policy</span>
                        <div>
                            <h2 className="text-white font-black text-lg leading-none">Análise de Termos</h2>
                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-1">Detecção automática de armadilhas</p>
                        </div>
                    </div>
                    {tcResults.length > 0 && (
                        <div className="flex items-center gap-2">
                            {criticals.length > 0 && <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest">{criticals.length} crítico{criticals.length > 1 ? 's' : ''}</span>}
                            {warnings.length > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest">{warnings.length} atenção</span>}
                            {infos.length > 0 && <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest">{infos.length} info</span>}
                        </div>
                    )}
                </div>

                {/* layout: textarea estreita à esquerda, resultados largos à direita */}
                <div className="flex-1 min-h-0 flex gap-3">

                    {/* Textarea — coluna estreita */}
                    <div className="flex flex-col min-h-0 gap-1.5 w-[28%] shrink-0">
                        <textarea
                            value={termos}
                            onChange={e => setTermos(e.target.value)}
                            placeholder="Cole os T&C aqui..."
                            className="flex-1 min-h-0 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white/70 text-[11px] font-mono resize-none focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all placeholder:text-white/20 leading-relaxed"
                        />
                        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest shrink-0">{RULES_COUNT} padrões</p>
                    </div>

                    {/* Results — coluna larga */}
                    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">

                        {/* Extracted facts strip */}
                        {tcFacts.length > 0 && (
                            <div className="shrink-0 flex flex-wrap gap-1.5">
                                {tcFacts.map((f, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/8 rounded-lg px-2.5 py-1.5">
                                        <span className="material-symbols-outlined text-white/40 text-[13px]">{f.icon}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{f.label}:</span>
                                        <span className="text-[11px] font-black text-white/80">{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Risk rules */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                            {tcResults.length === 0 && termos.trim() === '' && (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center space-y-2">
                                        <span className="material-symbols-outlined text-white/10 text-4xl block">policy</span>
                                        <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Cole os termos para análise</p>
                                    </div>
                                </div>
                            )}
                            {tcResults.length === 0 && termos.trim() !== '' && (
                                <div className="h-full flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-emerald-400/60 text-xs font-black uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        Nenhum risco identificado
                                    </div>
                                </div>
                            )}
                            {tcResults.map((r, i) => (
                                <div key={i} className={cn(
                                    "rounded-xl p-2.5 border space-y-1",
                                    r.level === 'critical' && "bg-red-500/5 border-red-500/20",
                                    r.level === 'warning' && "bg-amber-500/5 border-amber-500/15",
                                    r.level === 'info' && "bg-blue-500/5 border-blue-500/15",
                                )}>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0",
                                            r.level === 'critical' && "bg-red-500/20 text-red-400",
                                            r.level === 'warning' && "bg-amber-500/20 text-amber-400",
                                            r.level === 'info' && "bg-blue-500/20 text-blue-400",
                                        )}>
                                            {r.level === 'critical' ? '🔴' : r.level === 'warning' ? '🟡' : '🔵'}
                                        </span>
                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-wide">{r.category}</span>
                                    </div>
                                    <p className="text-[11px] text-white/55 leading-relaxed">{r.message}</p>
                                    {r.excerpts.map((ex, j) => (
                                        <p key={j} className="text-[10px] font-mono text-white/25 bg-white/[0.03] rounded px-2 py-1 italic">"{ex}"</p>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Count for display — keep in sync with tc-analyzer.ts
const RULES_COUNT = 37;
