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

        // Parse Headline Info (Rows 1-3)
        const headline = {
            startDate: rawData[1]?.[0] || 'N/A',
            endDate: rawData[1]?.[2] || 'N/A',
            mainSupplier: rawData[1]?.[3] || 'N/A',
        };

        // Parse Summary Table (Below headlines)
        const summary = {
            totalValue: rawData[8]?.[3] || 'R$ 0,00',
        };

        // Parse Suppliers List Table (Starts around A15)
        const suppliers: any[] = [];
        for (let i = 14; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !row[0] || i > 25) break; 
            suppliers.push({
                name: row[0],
                credit: row[1] || 'R$ 0,00',
                total: row[2] || 'R$ 0,00',
                highlight: row[0] === 'DAVI BALCAO' || row[0] === 'LIMINAR NOSSA' // Simple highlight logic based on photo
            });
        }

        // Parse Main Ledger Table (Starts around F3)
        const ledger: any[] = [];
        // Header is at Row 2, Data starts at Row 3
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            // F is index 5
            if (!row || !row[5]) continue; // Skip if no Date in F col
            
            // F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18, T=19
            ledger.push({
                date: row[5],         // F
                loc: row[6],          // G
                product: row[7],      // H
                price: row[8] || '0', // I (PREÇO)
                miles: row[9] || '0', // J (MILHAS)
                value: row[10] || '0',// K (VALOR)
                taxesCc: row[12] || 'N/A', // M (CC TAXES) - wait, column skip
                tax: row[13] || '0',   // N (TAX)
                total: row[16] || '0', // Q (TOTAL) - adjusting for the column spans in photo
                issueStatus: row[17] || 'PENDENTE', // R (EMISSÃO)
                taxStatus: row[18] || 'OK',        // S (TAXAS)
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
