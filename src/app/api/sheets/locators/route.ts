import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
    try {
        const sheets = new GoogleSheetsService();
        const rows = await sheets.readSheetData('BASE!H:H');
        if (!rows) return NextResponse.json({ locators: [] });

        const locators = rows
            .flat()
            .map((v: any) => String(v ?? '').trim().toUpperCase())
            .filter(Boolean);

        return NextResponse.json({ locators });
    } catch (error: any) {
        console.error('[API/LOCATORS]', error.message);
        return NextResponse.json({ locators: [] });
    }
}
