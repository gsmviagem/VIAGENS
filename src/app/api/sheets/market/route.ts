import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Fetch Dollar from CALC!AB3
        const data = await sheetsService.readSheetData('CALC!AB3');
        let dolarValue = 0;
        if (data && data[0] && data[0][0]) {
            const parsed = parseFloat(data[0][0].replace(',', '.'));
            if (!isNaN(parsed)) {
                dolarValue = parsed;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                dolar: dolarValue
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
