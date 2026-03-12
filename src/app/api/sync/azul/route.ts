import { NextRequest, NextResponse } from 'next/server';
import { AzulScraper } from '@/connectors/azul-scraper';

export const maxDuration = 300; // 5 min — scraping takes time

export async function POST(req: NextRequest) {
    try {
        const { cpf, password, accountId } = await req.json();

        if (!cpf || !password) {
            return NextResponse.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 });
        }

        const scraper = new AzulScraper();
        const result = await scraper.extract({ cpf, password, accountId });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                count: result.count,
                bookings: result.bookings?.map(b => ({
                    locator: b.locator,
                    route: `${b.origin} → ${b.destination}`,
                    date: b.flightDate,
                    passenger: b.passengerName,
                    miles: b.milesUsed,
                    cabin: b.cabinClass,
                }))
            });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[API/AZUL] Runtime error:', error.message);
        return NextResponse.json({ success: false, error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
