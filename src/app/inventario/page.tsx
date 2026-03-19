import React from 'react';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const revalidate = 0; // Disable cache so it always fetches fresh data

export default async function InventarioPage() {
    const sheetsService = new GoogleSheetsService();
    
    // Fetch data for the three columns (ranges defined by user: B:F, H:L, N:R starting line 3)
    const latamData = await sheetsService.readSheetData('INV!B3:F');
    const smilesData = await sheetsService.readSheetData('INV!H3:L');
    const azulData = await sheetsService.readSheetData('INV!N3:R');
    
    const latamEntries = latamData || [];
    const smilesEntries = smilesData || [];
    const azulEntries = azulData || [];

    return (
        <div className="space-y-8 w-full min-h-screen pt-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-4xl font-black text-black tracking-tight" style={{ color: 'white' }}>INVENTÁRIO HUB</h1>
                <p className="text-white/70 font-bold uppercase tracking-widest text-[10px]">Controle Geral de Contas e Milhas</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LATAM Block */}
                <div className="rounded-xl overflow-hidden border border-red-900/40 bg-black shadow-[0_0_20px_rgba(220,38,38,0.15)] flex flex-col">
                    <div className="bg-gradient-to-r from-red-900 to-red-600 text-white font-black text-center py-2 uppercase tracking-widest text-sm">
                        LATAM
                    </div>
                    <div className="grid grid-cols-5 text-center text-[10px] font-bold text-white uppercase bg-black/50 py-2 border-b border-red-900/40">
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex flex-col flex-1 divide-y divide-white/5 overflow-auto max-h-[70vh]">
                        {latamEntries.map((row, i) => (
                            <div key={i} className="grid grid-cols-5 text-center text-xs text-white/80 py-2 hover:bg-white/5 transition-colors items-center h-10">
                                <div className="truncate px-1" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-1" title={row[1]}>{row[1] || '-'}</div>
                                <div className="truncate px-1" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-1" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-1" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {latamEntries.length === 0 && (
                            <div className="text-center py-8 text-white/40 text-xs font-bold w-full col-span-5">Nenhum dado encontrado</div>
                        )}
                    </div>
                </div>

                {/* SMILES Block */}
                <div className="rounded-xl overflow-hidden border border-orange-900/40 bg-black shadow-[0_0_20px_rgba(249,115,22,0.15)] flex flex-col">
                    <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black text-center py-2 uppercase tracking-widest text-sm">
                        SMILES
                    </div>
                    <div className="grid grid-cols-5 text-center text-[10px] font-bold text-white uppercase bg-black/50 py-2 border-b border-orange-900/40">
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex flex-col flex-1 divide-y divide-white/5 overflow-auto max-h-[70vh]">
                        {smilesEntries.map((row, i) => (
                            <div key={i} className="grid grid-cols-5 text-center text-xs text-white/80 py-2 hover:bg-white/5 transition-colors items-center h-10">
                                <div className="truncate px-1" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-1" title={row[1]}>{row[1] || '-'}</div>
                                <div className="truncate px-1" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-1" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-1" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {smilesEntries.length === 0 && (
                            <div className="text-center py-8 text-white/40 text-xs font-bold w-full col-span-5">Nenhum dado encontrado</div>
                        )}
                    </div>
                </div>

                {/* AZUL Block */}
                <div className="rounded-xl overflow-hidden border border-blue-900/40 bg-black shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white font-black text-center py-2 uppercase tracking-widest text-sm">
                        AZUL
                    </div>
                    <div className="grid grid-cols-5 text-center text-[10px] font-bold text-white uppercase bg-black/50 py-2 border-b border-blue-900/40">
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex flex-col flex-1 divide-y divide-white/5 overflow-auto max-h-[70vh]">
                        {azulEntries.map((row, i) => (
                            <div key={i} className="grid grid-cols-5 text-center text-xs text-white/80 py-2 hover:bg-white/5 transition-colors items-center h-10">
                                <div className="truncate px-1" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-1" title={row[1]}>{row[1] || '-'}</div>
                                <div className="truncate px-1" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-1" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-1" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {azulEntries.length === 0 && (
                            <div className="text-center py-8 text-white/40 text-xs font-bold w-full col-span-5">Nenhum dado encontrado</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
