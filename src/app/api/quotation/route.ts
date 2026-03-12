import { NextResponse } from 'next/server';
import { SmilesScraper } from '@/connectors/quotation/smiles-client';
import { LatamScraper } from '@/connectors/quotation/latam-client';
import { AzulQuotationScraper } from '@/connectors/quotation/azul-client';
import { BuscaIdealScraper } from '@/connectors/quotation/busca-ideal-client';
import { SearchOptions } from '@/connectors/quotation/base-scraper';

export async function POST(req: Request) {
    try {
        const options: SearchOptions = await req.json();

        // Define scrapers
        const scrapers = [
            new SmilesScraper(),
            new LatamScraper(),
            new AzulQuotationScraper(),
            new BuscaIdealScraper()
        ];

        // Process in parallel
        const results = await Promise.all(scrapers.map(async (scraper) => {
            try {
                const res = await scraper.search(options);
                await scraper.close();
                return res;
            } catch (err: any) {
                return {
                    site: scraper.constructor.name.replace('Scraper', ''),
                    price: 'Timeout/Error',
                    currency: 'miles' as const,
                    success: false,
                    error: err.message
                };
            }
        }));

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
