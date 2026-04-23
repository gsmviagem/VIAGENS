import { NextRequest, NextResponse } from 'next/server';
import { AzulScraper } from '@/connectors/azul-scraper';

export const maxDuration = 300; // 5 min — scraping takes time

export async function POST(req: NextRequest) {
    try {
        const { cpf, password, accountId, bookings: preExtracted } = await req.json();

        if (!cpf || !password) {
            return NextResponse.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 });
        }

        if (!preExtracted || !Array.isArray(preExtracted) || preExtracted.length === 0) {
            return NextResponse.json({ error: 'bookings array is required' }, { status: 400 });
        }

        const scraper = new AzulScraper();
        let saved = 0;
        for (const b of preExtracted) {
            if (await scraper.saveBookingPublic(b, accountId)) saved++;
        }
        return NextResponse.json({ success: true, message: `${saved} de ${preExtracted.length} emissões salvas.`, count: saved });

    } catch (error: any) {
        console.error('[API/AZUL] Runtime error:', error.message);
        return NextResponse.json({ success: false, error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
