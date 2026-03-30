/**
 * Amadeus Flight Offers API client
 *
 * Docs: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search
 *
 * Env vars required:
 *   AMADEUS_API_KEY      – Client ID from Amadeus developer portal
 *   AMADEUS_API_SECRET   – Client Secret from Amadeus developer portal
 *   AMADEUS_ENV          – "test" (default) | "production"
 *
 * Free test environment limitations:
 *   • ~100 routes available (major hubs covered)
 *   • Data may not reflect real-time availability
 *   • Upgrade to Self-Service Production at developers.amadeus.com
 */

export interface AmadeusOffer {
    airline: string;
    price: number;
    currency: string;
    duration: string;
    stops: number;
    departure: string;
    arrival: string;
}

export interface AmadeusResult {
    site: string;
    price: number | string;
    currency: 'brl' | 'usd';
    success: boolean;
    error?: string;
    searchUrl?: string;
    offers?: AmadeusOffer[];
    airlineBreakdown?: { airline: string; price: string }[];
}

// ─── Token cache (module-scoped, survives across requests in same process) ────
interface CachedToken {
    access_token: string;
    expires_at: number; // epoch ms
}

let _cachedToken: CachedToken | null = null;

function getBaseUrl(): string {
    const env = process.env.AMADEUS_ENV ?? 'test';
    return env === 'production'
        ? 'https://api.amadeus.com'
        : 'https://test.api.amadeus.com';
}

async function fetchToken(): Promise<string> {
    const apiKey = process.env.AMADEUS_API_KEY;
    const apiSecret = process.env.AMADEUS_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error('AMADEUS_API_KEY e AMADEUS_API_SECRET não configurados.');
    }

    // Return cached token if still valid (with 60s buffer)
    if (_cachedToken && Date.now() < _cachedToken.expires_at - 60_000) {
        return _cachedToken.access_token;
    }

    const res = await fetch(`${getBaseUrl()}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: apiSecret,
        }).toString(),
        signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Amadeus auth falhou (${res.status}): ${body}`);
    }

    const data = await res.json();
    _cachedToken = {
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in ?? 1799) * 1000,
    };

    return _cachedToken.access_token;
}

// ─── Airline IATA → name map (top carriers for BR market) ─────────────────────
const AIRLINE_NAMES: Record<string, string> = {
    G3: 'GOL', LA: 'LATAM', JJ: 'LATAM', AD: 'Azul', TP: 'TAP', AA: 'American',
    UA: 'United', DL: 'Delta', BA: 'British', IB: 'Iberia', LH: 'Lufthansa',
    KL: 'KLM', AF: 'Air France', AV: 'Avianca', CM: 'Copa', AM: 'Aeromexico',
    AR: 'Aerolíneas', EK: 'Emirates', QR: 'Qatar', TK: 'Turkish', AC: 'Air Canada',
};

function airlineName(code: string): string {
    return AIRLINE_NAMES[code] ?? code;
}

function formatDuration(iso: string): string {
    // PT2H35M → 2h35m
    return iso.replace('PT', '').toLowerCase();
}

// ─── Main search function ──────────────────────────────────────────────────────
export async function searchAmadeus(
    origin: string,
    destination: string,
    dateISO: string,
    passengers: number = 1,
    currencyCode: string = 'BRL',
): Promise<AmadeusResult> {
    const searchUrl = `https://www.amadeus.com/en/search?from=${origin}&to=${destination}&departureDate=${dateISO}&adults=${passengers}`;

    // Check env vars first to give a clear message
    if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
        return {
            site: 'Amadeus',
            price: '–',
            currency: 'brl',
            success: false,
            error: 'Chaves não configuradas. Adicione AMADEUS_API_KEY e AMADEUS_API_SECRET no .env.local',
            searchUrl,
        };
    }

    try {
        const token = await fetchToken();

        const params = new URLSearchParams({
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: dateISO,
            adults: String(passengers),
            currencyCode,
            max: '10',
            nonStop: 'false',
        });

        const res = await fetch(`${getBaseUrl()}/v2/shopping/flight-offers?${params}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.amadeus+json',
            },
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            const body = await res.text();
            // 400 in test env usually means route not in test dataset
            if (res.status === 400) {
                return {
                    site: 'Amadeus',
                    price: 'N/D',
                    currency: 'brl',
                    success: false,
                    error: 'Rota fora do dataset de teste. Ative o ambiente de produção.',
                    searchUrl,
                };
            }
            throw new Error(`HTTP ${res.status}: ${body}`);
        }

        const data = await res.json();
        const offers: any[] = data?.data ?? [];

        if (offers.length === 0) {
            return {
                site: 'Amadeus',
                price: 'N/A',
                currency: 'brl',
                success: false,
                error: 'Sem disponibilidade nesta data',
                searchUrl,
            };
        }

        // Parse all offers into structured data
        const parsed: AmadeusOffer[] = offers.map((offer: any) => {
            const seg = offer.itineraries?.[0]?.segments?.[0];
            return {
                airline: airlineName(offer.validatingAirlineCodes?.[0] ?? seg?.carrierCode ?? '??'),
                price: parseFloat(offer.price?.grandTotal ?? offer.price?.total ?? '0'),
                currency: offer.price?.currency ?? currencyCode,
                duration: formatDuration(offer.itineraries?.[0]?.duration ?? ''),
                stops: (offer.itineraries?.[0]?.segments?.length ?? 1) - 1,
                departure: seg?.departure?.at ?? '',
                arrival: offer.itineraries?.[0]?.segments?.at(-1)?.arrival?.at ?? '',
            };
        }).sort((a, b) => a.price - b.price);

        const cheapest = parsed[0];

        // Airline breakdown (cheapest per airline, top 5)
        const byAirline: Record<string, number> = {};
        for (const o of parsed) {
            if (!byAirline[o.airline] || o.price < byAirline[o.airline]) {
                byAirline[o.airline] = o.price;
            }
        }
        const airlineBreakdown = Object.entries(byAirline)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 5)
            .map(([airline, price]) => ({
                airline,
                price: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price),
            }));

        return {
            site: 'Amadeus',
            price: cheapest.price,
            currency: 'brl',
            success: true,
            searchUrl,
            offers: parsed.slice(0, 10),
            airlineBreakdown,
        };

    } catch (e: any) {
        const msg = e.message ?? 'Erro desconhecido';
        const isTimeout = msg.includes('timeout') || msg.includes('abort');
        return {
            site: 'Amadeus',
            price: '–',
            currency: 'brl',
            success: false,
            error: isTimeout ? 'Timeout – tente novamente' : msg,
            searchUrl,
        };
    }
}
