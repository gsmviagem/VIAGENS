import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Fetch CLIENTS!J:L (Broker, Company, Total)
        const data = await sheetsService.readSheetData('CLIENTS!J3:L');
        if (!data) return NextResponse.json({ success: true, clients: [] });

        const clients = data
            .map((row, i) => ({
                id: i,
                broker: (row[0] || '').trim(),
                company: (row[1] || '').trim(),
                totalOwed: (row[2] || '0')
            }))
            .filter(c => c.broker || c.company);

        return NextResponse.json({
            success: true,
            clients
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
