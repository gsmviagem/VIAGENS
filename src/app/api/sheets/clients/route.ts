import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Fetch CLIENTS!J:M (J=Broker, K=Company, L=Total, M=Email)
        const data = await sheetsService.readSheetData('CLIENTS!J3:M');
        if (!data) return NextResponse.json({ success: true, clients: [] });

        const clients = data
            .map((row, i) => {
                const broker = (row[0] || '').trim();
                const company = (row[1] || '').trim();
                
                // match by broker email in column M
                let matchedEmail = (row[3] || '').trim();

                // fallback
                const email = matchedEmail || `contato@${(company || broker || 'cliente').split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
                
                return {
                    id: i,
                    broker,
                    company,
                    totalOwed: (row[2] || '0'),
                    email
                };
            })
            .filter(c => c.broker || c.company);

        return NextResponse.json({
            success: true,
            clients
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
