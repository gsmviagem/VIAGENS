import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    console.log(`[API/CHECK-PAX] Request started`);

    try {
        const body = await req.json();
        const { passengers } = body; // Array of strings (names)

        if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
            return NextResponse.json({ success: true, data: {} });
        }

        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Google Sheets não está configurado.' }, { status: 500 });
        }

        // Fetch BASE G:M (G=Pax, M=Conta) or just read BASE!G3:M since we only need pax and account.
        // Wait, reading a smaller range is faster.
        // Column G is 0, H=1, I=2, J=3, K=4, L=5, M=6
        const rawData = await sheetsService.readSheetData('BASE!G3:M');

        if (!rawData) {
            return NextResponse.json({ success: false, error: 'Falha ao ler dados da planilha BASE' }, { status: 500 });
        }

        const results: Record<string, string> = {};
        
        // Normalize search names to upper case
        const searchNames = passengers.map(p => p.toUpperCase().trim());

        // Reverse iterate to find the MOST RECENT emission if duplicated
        for (let i = rawData.length - 1; i >= 0; i--) {
            const row = rawData[i];
            if (!row || !row[0]) continue;
            
            const paxCell = row[0].toUpperCase(); // Column G (Pax names, separated by comma maybe)
            const accountCell = (row[6] || '').trim(); // Column M (Conta)
            
            if (!accountCell) continue;

            for (const searchName of searchNames) {
                // If this search names hasn't been found yet, and cell contains it
                if (!results[searchName] && paxCell.includes(searchName)) {
                    results[searchName] = accountCell;
                }
            }
            
            // If we found all of them, break early to save time
            if (Object.keys(results).length === searchNames.length) {
                break;
            }
        }

        return NextResponse.json({
            success: true,
            data: results
        });

    } catch (error: any) {
        console.error(`[API/CHECK-PAX] Error:`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
