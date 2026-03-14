import { NextResponse } from 'next/server';

export interface QuotationResult {
    site: string;
    price: number | string;
    currency: 'miles' | 'brl';
    success: boolean;
    error?: string;
    searchUrl?: string;
}

interface SearchOptions {
    origin: string;
    destination: string;
    date: string;
    passengers?: number;
}

/**
 * Format date from any common format to YYYY-MM-DD 
 */
function normalizeDate(date: string): string {
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    // DD/MM/YYYY
    const parts = date.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return date;
}

// ─── Smiles ───────────────────────────────────────────────────────────────────
async function searchSmiles(opts: SearchOptions, dateISO: string): Promise<QuotationResult> {
    const searchUrl = `https://www.smiles.com.br/emissao-passagem-com-milhas?originAirportCode=${opts.origin}&destinationAirportCode=${opts.destination}&departureDate=${dateISO}&adults=${opts.passengers ?? 1}&children=0&infants=0&tripType=2&currencyCode=BRL`;

    try {
        // Smiles internal API – requires cookies/session. Try with minimal headers.
        const params = new URLSearchParams({
            adults: String(opts.passengers ?? 1),
            children: '0',
            infants: '0',
            isFlexibleDateChecked: 'false',
            tripType: '2',
            currencyCode: 'BRL',
            departureDate: dateISO,
            originAirportCode: opts.origin,
            destinationAirportCode: opts.destination,
            cabin: 'ALL',
            limit: '8',
            offset: '0',
            group_id: '0',
        });

        const res = await fetch(
            `https://api-air-flightsearch-prd.smiles.com.br/v1/airlines/search?${params}`,
            {
                headers: {
                    'channel': 'web',
                    'region': 'BRASIL',
                    'origin': 'https://www.smiles.com.br',
                    'referer': 'https://www.smiles.com.br/',
                    'accept': 'application/json, text/plain, */*',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                },
                // signal: AbortSignal.timeout(12000),
            }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const flights: any[] = data?.requestedFlightSegmentList?.[0]?.flightList ?? [];

        if (flights.length === 0) {
            return { site: 'Smiles', price: 'N/A', currency: 'miles', success: false, error: 'Sem disponibilidade', searchUrl };
        }

        const prices: number[] = flights
            .flatMap((f: any) => f.fareList ?? [])
            .map((fare: any) => fare?.miles ?? 0)
            .filter((m: number) => m > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : null;
        if (!lowest) return { site: 'Smiles', price: 'N/A', currency: 'miles', success: false, error: 'Sem preços', searchUrl };

        return { site: 'Smiles', price: lowest, currency: 'miles', success: true, searchUrl };
    } catch (e: any) {
        return { site: 'Smiles', price: '–', currency: 'miles', success: false, error: `Busca indisponível – clique em View Board`, searchUrl };
    }
}

// ─── Azul ─────────────────────────────────────────────────────────────────────
async function searchAzul(opts: SearchOptions, dateISO: string): Promise<QuotationResult> {
    // Azul Pelo Mundo deep link format
    const searchUrl = `https://azulpelomundo.voeazul.com.br/pt/result?origin=${opts.origin}&destination=${opts.destination}&departDate=${dateISO}&adults=${opts.passengers ?? 1}&children=0&infants=0&type=OW`;

    try {
        // Try TudoAzul API
        const params = new URLSearchParams({
            originAirportCode: opts.origin,
            destinationAirportCode: opts.destination,
            departureDate: dateISO,
            adults: String(opts.passengers ?? 1),
            children: '0',
            infants: '0',
            cabin: 'ALL',
        });

        const res = await fetch(`https://api.tudoazul.com.br/v1/flight/search?${params}`, {
            headers: {
                'Accept': 'application/json',
                'Origin': 'https://azulpelomundo.voeazul.com.br',
                'Referer': 'https://azulpelomundo.voeazul.com.br/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
           // signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const flights: any[] = data?.flightList ?? data?.flights ?? data?.data ?? [];

        if (!Array.isArray(flights) || flights.length === 0) {
            return { site: 'Azul', price: 'N/A', currency: 'miles', success: false, error: 'Sem disponibilidade', searchUrl };
        }

        const prices: number[] = flights
            .flatMap((f: any) => f.fareList ?? f.fares ?? [])
            .map((fare: any) => fare?.miles ?? fare?.points ?? 0)
            .filter((m: number) => m > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : null;
        if (!lowest) return { site: 'Azul', price: 'N/A', currency: 'miles', success: false, error: 'Sem preços', searchUrl };

        return { site: 'Azul', price: lowest, currency: 'miles', success: true, searchUrl };
    } catch (e: any) {
        return { site: 'Azul', price: '–', currency: 'miles', success: false, error: 'Busca indisponível – clique em View Board', searchUrl };
    }
}

// ─── LATAM ────────────────────────────────────────────────────────────────────
async function searchLatam(opts: SearchOptions, dateISO: string): Promise<QuotationResult> {
    const searchUrl = `https://www.latamairlines.com/br/pt/oferta-voos?origin=${opts.origin}&destination=${opts.destination}&outbound=${dateISO}&adt=${opts.passengers ?? 1}&chd=0&inf=0&trip=OW&cabin=Economy&redemption=true`;

    try {
        const body = {
            itinerary: [{ departureDate: dateISO, originCode: opts.origin, destinationCode: opts.destination }],
            passengers: [{ type: 'ADT', count: opts.passengers ?? 1 }],
            requestHeader: { brandId: '0' },
        };

        const res = await fetch('https://bff.latam.com/ws/proxy/booking-ar/v1/public/revenue/recommendations/oneway', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify(body),
            // signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const flights: any[] = data?.data?.flights ?? [];

        if (flights.length === 0) {
            return { site: 'LATAM', price: 'N/A', currency: 'brl', success: false, error: 'Sem disponibilidade', searchUrl };
        }

        const prices: number[] = flights
            .flatMap((f: any) => f.cabins ?? [])
            .flatMap((c: any) => c.fares ?? c.displayPrice ?? [])
            .map((p: any) => parseFloat(p?.amount ?? p?.totalAmount ?? '0'))
            .filter((p: number) => p > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : null;
        if (!lowest) return { site: 'LATAM', price: 'N/A', currency: 'brl', success: false, error: 'Sem preços', searchUrl };

        return { site: 'LATAM', price: lowest, currency: 'brl', success: true, searchUrl };
    } catch (e: any) {
        return { site: 'LATAM', price: '–', currency: 'brl', success: false, error: 'Busca indisponível – clique em View Board', searchUrl };
    }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const opts: SearchOptions = await req.json();

        if (!opts.origin || !opts.destination || !opts.date) {
            return NextResponse.json({ success: false, error: 'Origem, destino e data são obrigatórios' }, { status: 400 });
        }

        const dateISO = normalizeDate(opts.date);

        const results = await Promise.all([
            searchSmiles(opts, dateISO),
            searchAzul(opts, dateISO),
            searchLatam(opts, dateISO),
        ]);

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[API/QUOTATION] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
