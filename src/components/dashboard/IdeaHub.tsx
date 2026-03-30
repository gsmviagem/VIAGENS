'use client';

import React, { useState, useEffect } from 'react';

type Idea = {
    id: string;
    title: string;
    description: string;
    createdAt: string;
};

const STORAGE_KEY = 'gsm_idea_hub';

export default function IdeaHub() {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { setIdeas(JSON.parse(saved)); } catch {}
        }
    }, []);

    const persist = (list: Idea[]) => {
        setIdeas(list);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    };

    const addIdea = () => {
        if (!newTitle.trim()) return;
        const idea: Idea = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            description: newDescription.trim(),
            createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        };
        persist([idea, ...ideas]);
        setNewTitle('');
        setNewDescription('');
    };

    const deleteIdea = (id: string) => {
        persist(ideas.filter(i => i.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const startEdit = (idea: Idea) => {
        setEditingId(idea.id);
        setEditTitle(idea.title);
        setEditDescription(idea.description);
    };

    const saveEdit = (id: string) => {
        persist(ideas.map(i => i.id === id ? { ...i, title: editTitle.trim() || i.title, description: editDescription.trim() } : i));
        setEditingId(null);
    };

    return (
        <div className="glass-panel flex-1 flex flex-col bg-white/[0.01] border-white/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 shrink-0">
                <span className="material-symbols-outlined text-[16px] text-amber-400">lightbulb</span>
                <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-white/70">Idea Hub</h2>
                <span className="ml-auto text-[9px] font-bold text-white/20 uppercase tracking-widest">{ideas.length} IDEIA{ideas.length !== 1 ? 'S' : ''}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1.5 min-h-0">
                {ideas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#555] gap-3 py-8">
                        <span className="material-symbols-outlined text-[32px] opacity-30">lightbulb</span>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Nenhuma ideia ainda</p>
                    </div>
                ) : (
                    ideas.map(idea => (
                        <div
                            key={idea.id}
                            className="rounded-lg border border-white/5 bg-white/[0.03] hover:border-white/10 transition-all overflow-hidden"
                        >
                            {editingId === idea.id ? (
                                /* Edit mode */
                                <div className="p-3 space-y-2">
                                    <input
                                        autoFocus
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:border-white/30 transition-colors"
                                    />
                                    <textarea
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        rows={3}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-2.5 py-1.5 text-[11px] text-white/70 font-mono resize-none focus:outline-none focus:border-white/30 transition-colors custom-scrollbar"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => saveEdit(idea.id)}
                                            className="flex-1 py-1.5 bg-white text-black rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95"
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="flex-1 py-1.5 bg-white/5 text-white/50 rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* View mode */
                                <>
                                    <button
                                        onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left group"
                                    >
                                        <span className="material-symbols-outlined text-[13px] text-amber-400/70 shrink-0">
                                            {expandedId === idea.id ? 'expand_less' : 'expand_more'}
                                        </span>
                                        <span className="flex-1 text-[11px] font-bold text-white/80 truncate">{idea.title}</span>
                                        <span className="text-[8px] text-white/20 font-mono shrink-0">{idea.createdAt}</span>
                                        <button
                                            onClick={e => { e.stopPropagation(); startEdit(idea); }}
                                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-all shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">edit</span>
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); deleteIdea(idea.id); }}
                                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">delete</span>
                                        </button>
                                    </button>

                                    {expandedId === idea.id && idea.description && (
                                        <div className="px-4 pb-3 pt-0">
                                            <p className="text-[11px] text-white/50 font-mono leading-relaxed whitespace-pre-wrap border-t border-white/5 pt-2">
                                                {idea.description}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add new idea */}
            <div className="px-3 py-3 border-t border-white/5 space-y-2 shrink-0">
                <input
                    placeholder="Título da ideia..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addIdea(); } }}
                    className="w-full h-9 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 text-xs font-bold text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-[#555]"
                />
                <textarea
                    placeholder="Descrição (opcional)..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white resize-none min-h-[52px] max-h-[80px] focus:outline-none focus:border-white/30 transition-colors custom-scrollbar placeholder:text-[#555]"
                />
                <button
                    onClick={addIdea}
                    disabled={!newTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    ADICIONAR IDEIA
                </button>
            </div>
        </div>
    );
}
