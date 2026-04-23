import { NextRequest, NextResponse } from 'next/server';
import { AzulScraper } from '@/connectors/azul-scraper';

export const maxDuration = 300; // 5 min — scraping takes time

export async function POST(req: NextRequest) {
    try {
        const { cpf, password, accountId, bookings: preExtracted } = await req.json();

        if (!cpf || !password) {
            return NextResponse.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 });
        }

        // If bookings were pre-extracted by the local script, save them directly
        if (preExtracted && Array.isArray(preExtracted) && preExtracted.length > 0) {
            const scraper = new AzulScraper();
            let saved = 0;
            for (const b of preExtracted) {
                if (await scraper.saveBookingPublic(b, accountId)) saved++;
            }
            const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT_SET';
            return NextResponse.json({ success: true, message: `${saved} de ${preExtracted.length} emissões salvas.`, count: saved, bookings: preExtracted, _debug_supa: supaUrl.substring(0, 30) });
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
                    cabin: b.flightCategory,
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
