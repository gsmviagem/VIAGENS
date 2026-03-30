import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Read single cell PRICE!C3
        const data = await sheetsService.readSheetData('PRICE!C3:C3');
        
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
