import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { rateUpTo50k, rateOver50k } = await req.json();
        
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Save to CALC!Z3:AA3
        // Z3: rateUpTo50k, AA3: rateOver50k
        await sheetsService.updateSheetData('CALC!Z3:AA3', [[rateUpTo50k, rateOver50k]]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API/CALC-RATES] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
