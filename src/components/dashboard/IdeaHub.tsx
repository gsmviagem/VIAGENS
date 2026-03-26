'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { debounce } from 'lodash';

export default function IdeaHub() {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const supabase = createClient();

    // Fetch initial data
    useEffect(() => {
        async function fetchIdea() {
            const { data, error } = await supabase
                .from('executive_ideas')
                .select('content')
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .single();
            
            if (data) {
                setContent(data.content || '');
            }
        }
        fetchIdea();
    }, []);

    // Manual save function
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('executive_ideas')
                .upsert({ 
                    id: '00000000-0000-0000-0000-000000000000', 
                    content: content,
                    updated_at: new Date().toISOString()
                });
            
            if (error) {
                const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurado';
                const maskedUrl = projectUrl.length > 20 
                    ? `${projectUrl.substring(0, 15)}...${projectUrl.substring(projectUrl.length - 10)}` 
                    : projectUrl;

                console.error('Supabase Save Error:', error);
                alert(`Erro ao salvar: ${error.message}\n\nURL do Projeto no Hub: ${maskedUrl}\n\nVerifique se este é o MESMO projeto onde você rodou o SQL.`);
            } else {
                setLastSaved(new Date());
            }
        } catch (err) {
            console.error('Save Catch Error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    return (
        <div className="glass-panel p-5 flex-1 flex flex-col bg-white/[0.01] border-white/5 overflow-hidden group">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-400">lightbulb</span>
                    <h2 className="font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-white/70">Idea Hub</h2>
                </div>
                <div className="flex items-center gap-3">
                    {lastSaved && (
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">
                            Atualizado {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`bg-white/10 hover:bg-white text-white hover:text-black px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 ${isSaving ? 'opacity-50' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[14px]">
                            {isSaving ? 'sync' : 'save'}
                        </span>
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 relative">
                <textarea
                    value={content}
                    onChange={handleChange}
                    placeholder="Capture sua próxima grande ideia aqui..."
                    className="w-full h-full bg-transparent text-white/50 font-['Inter'] text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar placeholder:text-white/10"
                />
            </div>
        </div>
    );
}
