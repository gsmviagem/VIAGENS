'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActiveTool = 'merge' | 'img2pdf' | null;

interface FileItem {
    id: string;
    file: File;
    name: string;
    size: string;
    preview?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Tool Cards ───────────────────────────────────────────────────────────────
const TOOLS = [
    {
        id: 'merge' as const,
        icon: 'merge_type',
        label: 'Merge PDFs',
        description: 'Combine múltiplos arquivos PDF em um único documento.',
        accent: '#3b82f6', // blue
        accentAlpha: 'rgba(59,130,246,0.12)',
    },
    {
        id: 'img2pdf' as const,
        icon: 'image',
        label: 'Image → PDF',
        description: 'Converta imagens PNG ou JPG em um arquivo PDF.',
        accent: '#a855f7', // purple
        accentAlpha: 'rgba(168,85,247,0.12)',
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function FerramentasPage() {
    const [activeTool, setActiveTool] = useState<ActiveTool>(null);

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto px-6 h-full overflow-hidden flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-display italic">
                        Tools
                    </h1>
                    <p className="text-[#a19f9d] mt-2 font-mono uppercase text-[10px] tracking-widest">
                        Dimais Corp · PDF &amp; Document Utilities
                    </p>
                </div>
                <div className="glass-panel px-6 py-3 flex items-center gap-3 border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                        Client-Side · No Upload
                    </span>
                </div>
            </header>

            {/* Tool Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                {TOOLS.map((tool) => (
                    <motion.button
                        key={tool.id}
                        onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                            'relative text-left p-7 rounded-sm border transition-all overflow-hidden',
                            activeTool === tool.id
                                ? 'border-white/20 bg-white/5'
                                : 'border-white/5 bg-black/20 hover:border-white/10'
                        )}
                    >
                        {/* Glow bg */}
                        <div
                            className="absolute inset-0 rounded-sm pointer-events-none transition-opacity duration-500"
                            style={{
                                background: `radial-gradient(ellipse at 20% 50%, ${tool.accentAlpha} 0%, transparent 70%)`,
                                opacity: activeTool === tool.id ? 1 : 0,
                            }}
                        />
                        <div className="relative z-10 flex items-start gap-5">
                            <div
                                className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0"
                                style={{ background: tool.accentAlpha, border: `1px solid ${tool.accent}30` }}
                            >
                                <span
                                    className="material-symbols-outlined text-[24px]"
                                    style={{ color: tool.accent }}
                                >
                                    {tool.icon}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-black text-white uppercase tracking-widest">
                                    {tool.label}
                                </p>
                                <p className="text-[10px] text-[#a19f9d] mt-1.5 leading-relaxed">
                                    {tool.description}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    'material-symbols-outlined text-[18px] transition-transform duration-300',
                                    activeTool === tool.id ? 'rotate-90' : ''
                                )}
                                style={{ color: activeTool === tool.id ? tool.accent : '#666' }}
                            >
                                chevron_right
                            </span>
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Active Tool Panel */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTool === 'merge' && (
                        <motion.div
                            key="merge"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MergePDFTool />
                        </motion.div>
                    )}
                    {activeTool === 'img2pdf' && (
                        <motion.div
                            key="img2pdf"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ImageToPDFTool />
                        </motion.div>
                    )}
                    {!activeTool && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 gap-5 text-center"
                        >
                            <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02]">
                                <span className="material-symbols-outlined text-4xl opacity-20">build</span>
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-30 text-white">
                                Selecione uma ferramenta acima
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 1 — Merge PDFs
// ═══════════════════════════════════════════════════════════════════════════════
function MergePDFTool() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const newItems: FileItem[] = Array.from(incoming)
            .filter((f) => f.type === 'application/pdf')
            .map((f) => ({ id: uid(), file: f, name: f.name, size: fmtSize(f.size) }));
        if (newItems.length === 0) {
            toast.error('Apenas arquivos PDF são aceitos.');
            return;
        }
        setFiles((prev) => [...prev, ...newItems]);
    };

    const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        setFiles((prev) => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const moveDown = (idx: number) => {
        setFiles((prev) => {
            if (idx === prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    }, []);

    const mergePDFs = async () => {
        if (files.length < 2) { toast.error('Adicione ao menos 2 PDFs.'); return; }
        setLoading(true);
        try {
            const merged = await PDFDocument.create();
            for (const item of files) {
                const bytes = await item.file.arrayBuffer();
                const src = await PDFDocument.load(bytes);
                const pages = await merged.copyPages(src, src.getPageIndices());
                pages.forEach((p) => merged.addPage(p));
            }
            const pdfBytes = await merged.save();
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '.');
            a.download = `MERGED-${today}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('PDF unificado gerado com sucesso!');
        } catch (err) {
            toast.error('Erro ao unir os PDFs. Verifique os arquivos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-5">
                <span className="material-symbols-outlined text-blue-400 text-[20px]">merge_type</span>
                <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Merge PDFs</h2>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all',
                    dragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-blue-500/40 hover:bg-blue-500/5'
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                />
                <span className="material-symbols-outlined text-[40px] text-blue-400/60 mb-3 block">upload_file</span>
                <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                    Solte os PDFs aqui ou clique para selecionar
                </p>
                <p className="text-[9px] text-white/30 mt-2 font-mono">Somente .PDF · Múltiplos arquivos aceitos</p>
            </div>

            {/* File list */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                {files.length} arquivo{files.length !== 1 ? 's' : ''} · Arraste para reordenar
                            </span>
                            <button
                                onClick={() => setFiles([])}
                                className="text-[8px] font-black text-red-400/60 hover:text-red-400 uppercase tracking-widest transition-colors"
                            >
                                Limpar tudo
                            </button>
                        </div>
                        {files.map((f, idx) => (
                            <motion.div
                                key={f.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-3 bg-black/30 border border-white/5 px-4 py-3 rounded-sm group"
                            >
                                <span className="text-[11px] font-black text-blue-400/60 w-5 text-center shrink-0">
                                    {idx + 1}
                                </span>
                                <span className="material-symbols-outlined text-[16px] text-blue-400/60 shrink-0">
                                    picture_as_pdf
                                </span>
                                <span className="flex-1 text-[10px] font-mono text-white/80 truncate">{f.name}</span>
                                <span className="text-[9px] text-white/30 font-mono shrink-0">{f.size}</span>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => moveUp(idx)}
                                        disabled={idx === 0}
                                        className="p-1 rounded hover:bg-white/10 disabled:opacity-20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[14px] text-white/50">arrow_upward</span>
                                    </button>
                                    <button
                                        onClick={() => moveDown(idx)}
                                        disabled={idx === files.length - 1}
                                        className="p-1 rounded hover:bg-white/10 disabled:opacity-20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[14px] text-white/50">arrow_downward</span>
                                    </button>
                                    <button
                                        onClick={() => removeFile(f.id)}
                                        className="p-1 rounded hover:bg-red-500/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[14px] text-red-400/60 hover:text-red-400">close</span>
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action */}
            <button
                onClick={mergePDFs}
                disabled={files.length < 2 || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase text-[11px] tracking-[0.3em] py-5 transition-all active:scale-95 rounded-sm flex items-center justify-center gap-3"
            >
                {loading ? (
                    <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                        Processando...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[18px]">merge_type</span>
                        Unir e Baixar PDF
                    </>
                )}
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 2 — Image → PDF
// ═══════════════════════════════════════════════════════════════════════════════
function ImageToPDFTool() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
    const inputRef = useRef<HTMLInputElement>(null);

    const ACCEPTED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const newItems: FileItem[] = Array.from(incoming)
            .filter((f) => ACCEPTED.includes(f.type))
            .map((f) => {
                const preview = URL.createObjectURL(f);
                return { id: uid(), file: f, name: f.name, size: fmtSize(f.size), preview };
            });
        if (newItems.length === 0) {
            toast.error('Apenas PNG ou JPG são aceitos.');
            return;
        }
        setFiles((prev) => [...prev, ...newItems]);
    };

    const removeFile = (id: string) => {
        setFiles((prev) => {
            const removed = prev.find((f) => f.id === id);
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return prev.filter((f) => f.id !== id);
        });
    };

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        setFiles((prev) => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const moveDown = (idx: number) => {
        setFiles((prev) => {
            if (idx === prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    }, []);

    const convertToPDF = async () => {
        if (files.length === 0) { toast.error('Adicione ao menos uma imagem.'); return; }
        setLoading(true);
        try {
            const doc = await PDFDocument.create();
            for (const item of files) {
                const bytes = await item.file.arrayBuffer();
                let img;
                if (item.file.type === 'image/png') {
                    img = await doc.embedPng(bytes);
                } else {
                    img = await doc.embedJpg(bytes);
                }
                const { width, height } = img;
                const A4_W = 595.28;
                const A4_H = 841.89;

                let drawW = A4_W;
                let drawH = A4_H;
                let x = 0;
                let y = 0;

                if (fitMode === 'fit') {
                    const scale = Math.min(A4_W / width, A4_H / height);
                    drawW = width * scale;
                    drawH = height * scale;
                    x = (A4_W - drawW) / 2;
                    y = (A4_H - drawH) / 2;
                }

                const page = doc.addPage([A4_W, A4_H]);
                page.drawImage(img, { x, y, width: drawW, height: drawH });
            }

            const pdfBytes = await doc.save();
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '.');
            a.download = `IMAGES-${today}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`${files.length} imagem(ns) convertida(s) com sucesso!`);
        } catch (err) {
            toast.error('Erro ao converter as imagens.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-purple-400 text-[20px]">image</span>
                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Image → PDF</h2>
                </div>
                {/* Fit mode toggle */}
                <div className="flex items-center gap-1 bg-black/30 border border-white/5 rounded-sm p-1">
                    {(['fit', 'fill'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setFitMode(mode)}
                            className={cn(
                                'px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all',
                                fitMode === mode
                                    ? 'bg-purple-600 text-white'
                                    : 'text-white/40 hover:text-white'
                            )}
                        >
                            {mode === 'fit' ? 'Ajustar (Fit)' : 'Preencher (Fill)'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all',
                    dragging
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5'
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                />
                <span className="material-symbols-outlined text-[40px] text-purple-400/60 mb-3 block">add_photo_alternate</span>
                <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                    Solte as imagens aqui ou clique para selecionar
                </p>
                <p className="text-[9px] text-white/30 mt-2 font-mono">PNG · JPG · WEBP · Cada imagem vira uma página</p>
            </div>

            {/* Image grid preview */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                {files.length} imagem{files.length !== 1 ? 'ns' : ''} · {files.length} página{files.length !== 1 ? 's' : ''} no PDF
                            </span>
                            <button
                                onClick={() => { files.forEach(f => f.preview && URL.revokeObjectURL(f.preview)); setFiles([]); }}
                                className="text-[8px] font-black text-red-400/60 hover:text-red-400 uppercase tracking-widest transition-colors"
                            >
                                Limpar tudo
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {files.map((f, idx) => (
                                <motion.div
                                    key={f.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative group aspect-[3/4] bg-black/30 border border-white/5 rounded-sm overflow-hidden"
                                >
                                    {f.preview && (
                                        <img
                                            src={f.preview}
                                            alt={f.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                        <p className="text-[8px] font-mono text-white/80 text-center truncate w-full">{f.name}</p>
                                        <p className="text-[8px] text-white/40 font-black">Pág. {idx + 1}</p>
                                        <div className="flex gap-1">
                                            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all">
                                                <span className="material-symbols-outlined text-[12px] text-white">arrow_upward</span>
                                            </button>
                                            <button onClick={() => moveDown(idx)} disabled={idx === files.length - 1} className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all">
                                                <span className="material-symbols-outlined text-[12px] text-white">arrow_downward</span>
                                            </button>
                                            <button onClick={() => removeFile(f.id)} className="p-1 rounded bg-red-500/30 hover:bg-red-500/60 transition-all">
                                                <span className="material-symbols-outlined text-[12px] text-white">close</span>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Page number badge */}
                                    <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm">
                                        {idx + 1}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action */}
            <button
                onClick={convertToPDF}
                disabled={files.length === 0 || loading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase text-[11px] tracking-[0.3em] py-5 transition-all active:scale-95 rounded-sm flex items-center justify-center gap-3"
            >
                {loading ? (
                    <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                        Convertendo...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        Converter e Baixar PDF
                    </>
                )}
            </button>
        </div>
    );
}
