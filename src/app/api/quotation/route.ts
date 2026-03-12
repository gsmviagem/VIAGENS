import { NextResponse } from 'next/server';

export interface QuotationResult {
    site: string;
    price: number | string;
    currency: 'miles' | 'brl';
    success: boolean;
    error?: string;
    url?: string;
}

interface SearchOptions {
    origin: string;
    destination: string;
    date: string;
    passengers?: number;
}

// ─── Smiles HTTP Search ───────────────────────────────────────────────────────
async function searchSmiles(opts: SearchOptions): Promise<QuotationResult> {
    try {
        // Smiles has a public flight search API endpoint
        const params = new URLSearchParams({
            adults: String(opts.passengers ?? 1),
            children: '0',
            infants: '0',
            isFlexibleDateChecked: 'false',
            tripType: '2', // one-way
            currencyCode: 'BRL',
            departureDate: opts.date,
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
                    'authorization': 'Bearer public',
                    'region': 'BRASIL',
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(15000),
            }
        );

        if (!res.ok) throw new Error(`Smiles API returned ${res.status}`);

        const data = await res.json();
        const flights = data?.requestedFlightSegmentList?.[0]?.flightList ?? [];

        if (flights.length === 0) {
            return { site: 'Smiles', price: 'N/A', currency: 'miles', success: false, error: 'Sem voos disponíveis' };
        }

        const prices: number[] = flights
            .flatMap((f: any) => f.fareList ?? [])
            .map((fare: any) => fare?.miles ?? 0)
            .filter((m: number) => m > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : 'N/A';

        return { site: 'Smiles', price: lowest, currency: 'miles', success: true };
    } catch (e: any) {
        return { site: 'Smiles', price: 'Error', currency: 'miles', success: false, error: e.message };
    }
}

// ─── Azul HTTP Search ─────────────────────────────────────────────────────────
async function searchAzul(opts: SearchOptions): Promise<QuotationResult> {
    try {
        // Azul Fidelidade public API endpoint
        const params = new URLSearchParams({
            originAirportCode: opts.origin,
            destinationAirportCode: opts.destination,
            departureDate: opts.date,
            adults: String(opts.passengers ?? 1),
            children: '0',
            infants: '0',
            cabin: 'ALL',
        });

        const res = await fetch(
            `https://api.tudoazul.com.br/v1/travelagent/search?${params}`,
            {
                headers: {
                    'Authorization': 'Bearer public',
                    'Content-Type': 'application/json',
                    'x-api-key': 'public',
                },
                signal: AbortSignal.timeout(15000),
            }
        );

        // If their public API returns data, great. Otherwise fallback.
        if (!res.ok) throw new Error(`Azul API returned ${res.status}`);

        const data = await res.json();
        const flights = data?.flightList ?? data?.flights ?? [];

        if (flights.length === 0) {
            return { site: 'Azul', price: 'N/A', currency: 'miles', success: false, error: 'Sem voos disponíveis' };
        }

        const prices: number[] = flights
            .flatMap((f: any) => f.fareList ?? f.fares ?? [])
            .map((fare: any) => fare?.miles ?? fare?.points ?? 0)
            .filter((m: number) => m > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : 'N/A';
        return { site: 'Azul', price: lowest, currency: 'miles', success: true };

    } catch (e: any) {
        return { site: 'Azul', price: 'Error', currency: 'miles', success: false, error: e.message };
    }
}

// ─── LATAM HTTP Search ────────────────────────────────────────────────────────
async function searchLatam(opts: SearchOptions): Promise<QuotationResult> {
    try {
        // LATAM has a public availability API
        const body = {
            itinerary: [{
                departureDate: opts.date,
                originCode: opts.origin,
                destinationCode: opts.destination,
            }],
            passengers: [{ type: 'ADT', count: opts.passengers ?? 1 }],
            requestHeader: { brandId: '0' },
        };

        const res = await fetch('https://bff.latam.com/ws/proxy/booking-ar/v1/public/revenue/recommendations/oneway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) throw new Error(`LATAM API returned ${res.status}`);

        const data = await res.json();
        const flights = data?.data?.flights ?? [];

        if (flights.length === 0) {
            return { site: 'LATAM', price: 'N/A', currency: 'brl', success: false, error: 'Sem voos disponíveis' };
        }

        const prices: number[] = flights
            .flatMap((f: any) => f.cabins ?? [])
            .flatMap((c: any) => c.displayPrice ?? [])
            .map((p: any) => p?.amount ?? 0)
            .filter((p: number) => p > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : 'N/A';
        return { site: 'LATAM', price: lowest, currency: 'brl', success: true };

    } catch (e: any) {
        return { site: 'LATAM', price: 'Error', currency: 'brl', success: false, error: e.message };
    }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const opts: SearchOptions = await req.json();

        if (!opts.origin || !opts.destination || !opts.date) {
            return NextResponse.json({ success: false, error: 'Origem, destino e data são obrigatórios' }, { status: 400 });
        }

        // Normalize date to YYYY-MM-DD
        const dateParts = opts.date.split(/[-/]/);
        if (dateParts[0].length !== 4 && dateParts.length === 3) {
            opts.date = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }

        // Run all searches in parallel
        const results = await Promise.all([
            searchSmiles(opts),
            searchAzul(opts),
            searchLatam(opts),
        ]);

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[API/QUOTATION] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
