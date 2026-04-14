import React from 'react';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const revalidate = 0; // Disable cache so it always fetches fresh data

// Strip all non-numeric characters from CPF values
const cleanCpf = (value: string | undefined) => (value || '').replace(/\D/g, '') || '-';

// Format name to show only first and last
const formatName = (fullName: string | undefined) => {
    if (!fullName) return '-';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
};

export default async function InventarioPage() {
    const sheetsService = new GoogleSheetsService();
    
    // Fetch data for the three columns (ranges defined by user: B:F, H:L, N:R starting line 4)
    const latamData = await sheetsService.readSheetData('INV!B4:F');
    const smilesData = await sheetsService.readSheetData('INV!H4:L');
    const azulData = await sheetsService.readSheetData('INV!N4:R');
    
    const latamEntries = latamData || [];
    const smilesEntries = smilesData || [];
    const azulEntries = azulData || [];

    const gridLayout = "grid-cols-[2fr_2.5fr_2fr_1fr_1.5fr]";

    return (
        <div className="flex flex-col w-full h-full pt-2 text-[#e5e2e1] font-['Inter'] overflow-hidden">
            
            <header className="mb-6 shrink-0 flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-[0.05em] text-white">Asset Inventory</h1>
                    <p className="text-outline font-light tracking-wide max-w-md">Global control of integrated accounts and active mileage balances.</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <span className="block font-['Inter'] tracking-[0.1em] uppercase text-[10px] font-bold text-secondary">Data Synchronization</span>
                        <span className="text-sm font-medium flex items-center justify-end gap-2 text-white">
                            <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> 
                            Real-Time
                        </span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
                {/* LATAM Block */}
                <div className="glass-panel flex flex-col h-full overflow-hidden">
                    <div className="titanium-gradient text-white font-['Inter'] font-bold text-center py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0">
                        LATAM
                    </div>
                    <div className={`grid ${gridLayout} text-center text-[10px] font-bold text-outline uppercase bg-surface-container-highest/20 py-3 border-b border-outline-variant/30 shrink-0 tracking-[0.1em]`}>
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar bg-[#0e0e0e]/40">
                        {latamEntries.map((row, i) => (
                            <div key={i} className={`grid ${gridLayout} text-center text-[11px] text-white py-3 hover:bg-white/5 transition-colors items-center px-1`}>
                                <div className="truncate px-2 font-medium" title={row[0]}>{formatName(row[0])}</div>
                                <div className="truncate px-2 font-mono text-outline" title={cleanCpf(row[1])}>{cleanCpf(row[1])}</div>
                                <div className="truncate px-2 font-mono text-outline/60" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-2 font-medium tracking-tight text-secondary" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-2 font-bold tracking-tight" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {latamEntries.length === 0 && (
                            <div className="text-center py-12 text-outline/50 text-xs font-bold w-full col-span-5 uppercase tracking-widest">NO DATA AVAILABLE</div>
                        )}
                    </div>
                </div>

                {/* SMILES Block */}
                <div className="glass-panel flex flex-col h-full overflow-hidden">
                    <div className="titanium-gradient text-white font-['Inter'] font-bold text-center py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0">
                        SMILES
                    </div>
                    <div className={`grid ${gridLayout} text-center text-[10px] font-bold text-outline uppercase bg-surface-container-highest/20 py-3 border-b border-outline-variant/30 shrink-0 tracking-[0.1em]`}>
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar bg-[#0e0e0e]/40">
                        {smilesEntries.map((row, i) => (
                            <div key={i} className={`grid ${gridLayout} text-center text-[11px] text-white py-3 hover:bg-white/5 transition-colors items-center px-1`}>
                                <div className="truncate px-2 font-medium" title={row[0]}>{formatName(row[0])}</div>
                                <div className="truncate px-2 font-mono text-outline" title={cleanCpf(row[1])}>{cleanCpf(row[1])}</div>
                                <div className="truncate px-2 font-mono text-outline/60" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-2 font-medium tracking-tight text-secondary" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-2 font-bold tracking-tight" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {smilesEntries.length === 0 && (
                            <div className="text-center py-12 text-outline/50 text-xs font-bold w-full col-span-5 uppercase tracking-widest">NO DATA AVAILABLE</div>
                        )}
                    </div>
                </div>

                {/* AZUL Block */}
                <div className="glass-panel flex flex-col h-full overflow-hidden">
                    <div className="titanium-gradient text-white font-['Inter'] font-bold text-center py-4 border-b border-outline-variant/30 uppercase tracking-[0.1em] text-[11px] shrink-0">
                        AZUL
                    </div>
                    <div className={`grid ${gridLayout} text-center text-[10px] font-bold text-outline uppercase bg-surface-container-highest/20 py-3 border-b border-outline-variant/30 shrink-0 tracking-[0.1em]`}>
                        <div>NOME</div>
                        <div>CPF</div>
                        <div>SENHA</div>
                        <div>PREÇO</div>
                        <div>MILHAS</div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar bg-[#0e0e0e]/40">
                        {azulEntries.map((row, i) => (
                            <div key={i} className={`grid ${gridLayout} text-center text-[11px] text-white py-3 hover:bg-white/5 transition-colors items-center px-1`}>
                                <div className="truncate px-2 font-medium" title={row[0]}>{row[0] || '-'}</div>
                                <div className="truncate px-2 font-mono text-outline" title={cleanCpf(row[1])}>{cleanCpf(row[1])}</div>
                                <div className="truncate px-2 font-mono text-outline/60" title={row[2]}>{row[2] || '-'}</div>
                                <div className="truncate px-2 font-medium tracking-tight text-secondary" title={row[3]}>{row[3] || '-'}</div>
                                <div className="truncate px-2 font-bold tracking-tight" title={row[4]}>{row[4] || '-'}</div>
                            </div>
                        ))}
                        {azulEntries.length === 0 && (
                            <div className="text-center py-12 text-outline/50 text-xs font-bold w-full col-span-5 uppercase tracking-widest">NO DATA AVAILABLE</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
