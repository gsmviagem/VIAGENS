import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

const RANGE = 'SUPPLIER!AK:AK';
const HEADER = 'LOC_EXCLUIDO';

export async function POST(req: NextRequest) {
    try {
        const { loc } = await req.json();
        if (!loc || typeof loc !== 'string') {
            return NextResponse.json({ success: false, error: 'LOC inválido.' }, { status: 400 });
        }

        const normalizedLoc = loc.trim().toUpperCase();
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Google Sheets não configurado.' }, { status: 500 });
        }

        const data = await sheetsService.readSheetData(RANGE);
        const existing: string[] = [];
        if (data) {
            for (let i = 1; i < data.length; i++) {
                const v = (data[i]?.[0] || '').trim().toUpperCase();
                if (v) existing.push(v);
            }
        }

        const idx = existing.indexOf(normalizedLoc);
        let excluded: boolean;

        if (idx >= 0) {
            // Remove — rewrite column without this LOC
            existing.splice(idx, 1);
            await sheetsService.clearRange(RANGE);
            const rows: string[][] = [[HEADER], ...existing.map(l => [l])];
            if (rows.length > 1) await sheetsService.updateSheetData(RANGE, rows);
            excluded = false;
        } else {
            // Add — append
            if (existing.length === 0) {
                // First entry: write header + value
                await sheetsService.updateSheetData(RANGE, [[HEADER], [normalizedLoc]]);
            } else {
                await sheetsService.appendValues(RANGE, [[normalizedLoc]]);
            }
            excluded = true;
        }

        return NextResponse.json({ success: true, excluded, loc: normalizedLoc });
    } catch (error: any) {
        console.error('[API/SUPPLIER/EXCLUDE]', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
