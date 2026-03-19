import React from 'react';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const revalidate = 0; // Disable cache so it always fetches fresh data

export default async function InventarioPage() {
    const sheetsService = new GoogleSheetsService();
    
    // Fetch data for the three columns (ranges defined by user: B:F, H:L, N:R starting line 4)
    const latamData = await sheetsService.readSheetData('INV!B4:F');
    const smilesData = await sheetsService.readSheetData('INV!H4:L');
    const azulData = await sheetsService.readSheetData('INV!N4:R');
    
    const latamEntries = latamData || [];
    const smilesEntries = smilesData || [];
    const azulEntries = azulData || [];

    const gridLayout = "grid-cols-[2.5fr_2fr_1fr_1fr_1fr]";

    return (
        <div className="flex flex-col w-full h-[calc(100vh-80px)] overflow-hidden pt-4">
            
            <header className="mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-blue-900/40 shadow-[0_0_15px_rgba(30,58,138,0.3)]">
                        <span className="material-symbols-outlined text-white text-2xl font-bold">inventory</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg">INVENTÁRIO HUB</h1>
                        <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] drop-shadow-md">CONTROLE GERAL DE CONTAS E MILHAS</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0 pb-6 overflow-hidden">
                {/* LATAM Block */}
                <div className="rounded-2xl border border-blue-900/40 bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(30,58,138,0.2)] flex flex-col h-full overflow-hidden">
                    <div className="bg-gradient-to-r from-black via-blue-950/40 to-black text-white font-black text-center py-3 border-b border-blue-900/30 uppercase tracking-widest text-sm shrink-0">
                        LATAM
                    </div>
                    <div className={`grid ${gridLayout} text-center text-[10px] font-bold text-white uppercase bg-black/60 py-3 border-b border-blue-900/40 shrink-0`}>
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/10 custom-scrollbar bg-black/80">
                        {latamEntries.map((row, i) => (
                            <div key={i} className={`grid ${gridLayout} text-center text-xs text-white py-3 hover:bg-blue-900/20 transition-colors items-center`}>
                                <div className="truncate px-2 font-medium" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-2 font-mono text-white/80" title={row[1]}>{row[1] || '-'}</div>
                                <div className="truncate px-2 font-mono text-white/60" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-2 font-black text-blue-400" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-2 font-black" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {latamEntries.length === 0 && (
                            <div className="text-center py-12 text-white/40 text-xs font-bold w-full col-span-5">Nenhum dado encontrado</div>
                        )}
                    </div>
                </div>

                {/* SMILES Block */}
                <div className="rounded-2xl border border-blue-900/40 bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(30,58,138,0.2)] flex flex-col h-full overflow-hidden">
                    <div className="bg-gradient-to-r from-black via-blue-950/40 to-black text-white font-black text-center py-3 border-b border-blue-900/30 uppercase tracking-widest text-sm shrink-0">
                        SMILES
                    </div>
                    <div className={`grid ${gridLayout} text-center text-[10px] font-bold text-white uppercase bg-black/60 py-3 border-b border-blue-900/40 shrink-0`}>
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/10 custom-scrollbar bg-black/80">
                        {smilesEntries.map((row, i) => (
                            <div key={i} className={`grid ${gridLayout} text-center text-xs text-white py-3 hover:bg-blue-900/20 transition-colors items-center`}>
                                <div className="truncate px-2 font-medium" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-2 font-mono text-white/80" title={row[1]}>{row[1] || '-'}</div>
                                <div className="truncate px-2 font-mono text-white/60" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-2 font-black text-blue-400" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-2 font-black" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {smilesEntries.length === 0 && (
                            <div className="text-center py-12 text-white/40 text-xs font-bold w-full col-span-5">Nenhum dado encontrado</div>
                        )}
                    </div>
                </div>

                {/* AZUL Block */}
                <div className="rounded-2xl border border-blue-900/40 bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(30,58,138,0.2)] flex flex-col h-full overflow-hidden">
                    <div className="bg-gradient-to-r from-black via-blue-950/40 to-black text-white font-black text-center py-3 border-b border-blue-900/30 uppercase tracking-widest text-sm shrink-0">
                        AZUL
                    </div>
                    <div className={`grid ${gridLayout} text-center text-[10px] font-bold text-white uppercase bg-black/60 py-3 border-b border-blue-900/40 shrink-0`}>
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/10 custom-scrollbar bg-black/80">
                        {azulEntries.map((row, i) => (
                            <div key={i} className={`grid ${gridLayout} text-center text-xs text-white py-3 hover:bg-blue-900/20 transition-colors items-center`}>
                                <div className="truncate px-2 font-medium" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-2 font-mono text-white/80" title={row[1]}>{row[1] || '-'}</div>
                                <div className="truncate px-2 font-mono text-white/60" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-2 font-black text-blue-400" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-2 font-black" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {azulEntries.length === 0 && (
                            <div className="text-center py-12 text-white/40 text-xs font-bold w-full col-span-5">Nenhum dado encontrado</div>
                        )}
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(30,58,138,0.5);
                }
            `}} />
        </div>
    );
}
