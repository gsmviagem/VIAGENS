import { NextRequest, NextResponse } from 'next/server';
import { AzulScraper } from '@/connectors/azul-scraper';

export async function POST(req: NextRequest) {
    try {
        const { cpf, password, accountId } = await req.json();

        if (!cpf || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const scraper = new AzulScraper();
        const result = await scraper.extract({ cpf, password, accountId });

        if (result.success) {
            return NextResponse.json({
                message: `Extraction successful. Captured ${result.count} bookings.`,
                count: result.count
            });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[API/AZUL] Runtime error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
