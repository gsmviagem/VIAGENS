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

        // Column G=Pax names, M=Conta (index 6 from G)
        const rawData = await sheetsService.readSheetData('BASE!G3:M');

        if (!rawData) {
            return NextResponse.json({ success: false, error: 'Falha ao ler dados da planilha BASE' }, { status: 500 });
        }

        // results: { "JOHN DOE": ["CONTA1", "CONTA2", ...] }
        const results: Record<string, string[]> = {};
        
        const searchNames = passengers.map((p: string) => p.toUpperCase().trim());
        for (const name of searchNames) results[name] = [];

        for (const row of rawData) {
            if (!row || !row[0]) continue;
            
            const paxCell = row[0].toUpperCase(); // Column G
            const accountCell = (row[6] || '').trim(); // Column M
            
            if (!accountCell) continue;

            for (const searchName of searchNames) {
                if (paxCell.includes(searchName)) {
                    // Add account only if not already listed (avoid duplicates)
                    if (!results[searchName].includes(accountCell)) {
                        results[searchName].push(accountCell);
                    }
                }
            }
        }

        // Remove empty entries
        const filtered: Record<string, string[]> = {};
        for (const [name, accounts] of Object.entries(results)) {
            if (accounts.length > 0) filtered[name] = accounts;
        }

        return NextResponse.json({
            success: true,
            data: filtered
        });

    } catch (error: any) {
        console.error(`[API/CHECK-PAX] Error:`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

