import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Read CALC!D18:D (Checks column D starting from row 18)
        const data = await sheetsService.readSheetData('CALC!D18:D100'); // Reading a reasonable range to avoid timeout, or just D18:D if the service handles it
        
        let hasContent = false;
        if (data && data.length > 0) {
            // Check if any row in the range has content in the first column (D)
            hasContent = data.some(row => row && row[0] && row[0].toString().trim() !== '');
        }

        return NextResponse.json({
            success: true,
            hasContent
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
