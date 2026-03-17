import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();

        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ 
                success: false, 
                error: 'Google Sheets não está configurado.' 
            }, { status: 500 });
        }

        // Fetch the entire active area of the SUPPLIER sheet
        const rawData = await sheetsService.readSheetData('SUPPLIER!A1:T100');

        if (!rawData) {
            throw new Error('Falha ao ler dados da planilha.');
        }

        // Parse Headline Info
        // In array, Row 3 is index 2. B=1, C=2
        const headline = {
            startDate: rawData[2]?.[1] || 'N/A', // B
            endDate: rawData[1]?.[2] || 'N/A',   // C header was DATA FINAL, value might be in B or C
            mainSupplier: rawData[2]?.[2] || rawData[2]?.[3] || 'N/A', // C or D depending on merging
        };

        // Parse Summary Table
        // Total is usually under "TOTAL" in Row 10 (Index 9), Col D(3)
        const summary = {
            totalValue: rawData[9]?.[3] || 'R$ 0,00',
        };

        // Parse Suppliers List Table (Starts at index 14)
        const suppliers: any[] = [];
        for (let i = 14; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !row[1] || i > 30) break; // B is index 1
            if (row[1].trim() === '') continue;
            
            suppliers.push({
                name: row[1], // B
                credit: row[2] || 'R$ 0,00', // C
                total: row[3] || 'R$ 0,00', // D
                highlight: row[1] === 'DAVI BALCAO' || row[1] === 'LIMINAR NOSSA'
            });
        }

        // Parse Main Ledger Table (Starts at index 2)
        const ledger: any[] = [];
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            
            // F is index 5
            if (!row || !row[5] || row[5].trim() === '') continue; // Skip if no Date in F col
            
            // F=5(DATA), G=6(NOME), H=7(LOC), I=8(PRODUCT), J=9(PREÇO), K=10(MILHAS), L=11(SUPPLIER), M=12(VALOR), N=13(CC TAXES), O=14(TAX)
            // P=15(REP MIL), Q=16(REP TX), R=17(TOTAL), S=18(EMISSAO), T=19(TAXAS)
            ledger.push({
                date: row[5],
                loc: row[7] || '',          // H
                product: row[8] || '',      // I
                price: row[9] || '0',       // J
                miles: row[10] || '0',      // K
                value: row[12] || '0',      // M
                taxesCc: row[13] || '',     // N
                tax: row[14] || '0',        // O
                total: row[17] || '0',      // R
                issueStatus: row[18] || 'PENDENTE', // S
                taxStatus: row[19] || 'OK', // T
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                headline,
                summary,
                suppliers,
                ledger
            }
        });

    } catch (error: any) {
        console.error('[API/SUPPLIER] Error:', error.message);
        return NextResponse.json({ 
            success: false, 
            error: 'Erro ao buscar dados dos fornecedores: ' + error.message 
        }, { status: 500 });
    }
}
