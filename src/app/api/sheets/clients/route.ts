import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // Fetch Emails from DATA BASE!F:H (F/G = broker/company, H = email)
        const emailsMap: Record<string, string> = {};
        const dbData = await sheetsService.readSheetData('DATA BASE!F:H');
        if (dbData) {
            for (const row of dbData) {
                if (!row) continue;
                const email = (row[2] || '').trim();
                const f = (row[0] || '').trim().toLowerCase();
                const g = (row[1] || '').trim().toLowerCase();
                if (email) {
                    if (f) emailsMap[f] = email;
                    if (g) emailsMap[g] = email;
                }
            }
        }

        // Fetch CLIENTS!J:L (Broker, Company, Total)
        const data = await sheetsService.readSheetData('CLIENTS!J3:L');
        if (!data) return NextResponse.json({ success: true, clients: [] });

        const clients = data
            .map((row, i) => {
                const broker = (row[0] || '').trim();
                const company = (row[1] || '').trim();
                
                // match by broker or company name against emailsMap (using includes for partial matches like 'ARIE AVRAM +507...')
                const bLower = broker.toLowerCase();
                const cLower = company.toLowerCase();
                
                let matchedEmail = emailsMap[bLower] || emailsMap[cLower];
                
                if (!matchedEmail) {
                    const foundKey = Object.keys(emailsMap).find(k => 
                        (k.length > 3 && bLower.includes(k)) || 
                        (k.length > 3 && cLower.includes(k))
                    );
                    if (foundKey) matchedEmail = emailsMap[foundKey];
                }

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
