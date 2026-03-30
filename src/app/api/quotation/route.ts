import { NextResponse } from 'next/server';
import { searchAmadeus } from '@/connectors/quotation/amadeus-client';

export interface QuotationResult {
    site: string;
    price: number | string;
    currency: 'miles' | 'brl' | 'usd';
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

// ─── In-memory cache (15 min TTL) ─────────────────────────────────────────────
const cache = new Map<string, { results: QuotationResult[]; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(opts: SearchOptions, dateISO: string): string {
    return `${opts.origin}-${opts.destination}-${dateISO}-${opts.passengers ?? 1}`;
}

// ─── In-memory rate limiter (10 req/min per IP) ────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
}

/**
 * Format date from any common format to YYYY-MM-DD
 */
function normalizeDate(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const parts = date.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return date;
}

/**
 * Validate IATA airport code (3 uppercase letters)
 */
function isValidIATA(code: string): boolean {
    return /^[A-Z]{3}$/.test(code.trim().toUpperCase());
}

// ─── Smiles ───────────────────────────────────────────────────────────────────
async function searchSmiles(opts: SearchOptions, dateISO: string): Promise<QuotationResult> {
    const searchUrl = `https://www.smiles.com.br/emissao-passagem-com-milhas?originAirportCode=${opts.origin}&destinationAirportCode=${opts.destination}&departureDate=${dateISO}&adults=${opts.passengers ?? 1}&children=0&infants=0&tripType=2&currencyCode=BRL`;

    try {
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
                signal: AbortSignal.timeout(12000),
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
    const searchUrl = `https://azulpelomundo.voeazul.com.br/pt/result?origin=${opts.origin}&destination=${opts.destination}&departDate=${dateISO}&adults=${opts.passengers ?? 1}&children=0&infants=0&type=OW`;

    try {
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
            signal: AbortSignal.timeout(12000),
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
            signal: AbortSignal.timeout(12000),
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
        // Rate limiting
        const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim();
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ success: false, error: 'Muitas requisições. Aguarde 1 minuto.' }, { status: 429 });
        }

        const opts: SearchOptions = await req.json();

        if (!opts.origin || !opts.destination || !opts.date) {
            return NextResponse.json({ success: false, error: 'Origem, destino e data são obrigatórios' }, { status: 400 });
        }

        // IATA validation
        const origin = opts.origin.trim().toUpperCase();
        const destination = opts.destination.trim().toUpperCase();
        if (!isValidIATA(origin) || !isValidIATA(destination)) {
            return NextResponse.json({ success: false, error: 'Códigos IATA inválidos. Use 3 letras (ex: GRU, JFK, LHR).' }, { status: 400 });
        }
        opts.origin = origin;
        opts.destination = destination;

        const dateISO = normalizeDate(opts.date);

        // Check cache
        const cacheKey = getCacheKey(opts, dateISO);
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return NextResponse.json({ success: true, results: cached.results, cached: true });
        }

        const results = await Promise.all([
            searchSmiles(opts, dateISO),
            searchAzul(opts, dateISO),
            searchLatam(opts, dateISO),
            searchAmadeus(opts.origin, opts.destination, dateISO, opts.passengers ?? 1),
        ]);

        // Store in cache
        cache.set(cacheKey, { results, ts: Date.now() });

        // Cleanup old cache entries
        if (cache.size > 200) {
            const now = Date.now();
            for (const [key, val] of cache.entries()) {
                if (now - val.ts > CACHE_TTL) cache.delete(key);
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[API/QUOTATION] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
