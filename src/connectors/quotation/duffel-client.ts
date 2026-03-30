/**
 * Duffel Flight Search API client
 *
 * Docs: https://duffel.com/docs/api/overview/welcome
 *
 * Env vars required:
 *   DUFFEL_API_KEY  – Token from app.duffel.com (starts with "duffel_test_" or "duffel_live_")
 *
 * Setup (5 min):
 *   1. Crie conta gratuita em app.duffel.com
 *   2. Vá em Settings → Access Tokens → Create token
 *   3. Copie o token (começa com duffel_test_...)
 *   4. Coloque em DUFFEL_API_KEY no .env.local
 *
 * Cobertura: 300+ companhias aéreas (GOL, LATAM, Azul, TAP, American, Emirates, etc.)
 * O sandbox retorna dados reais de disponibilidade sem cobrar nada.
 */

export interface DuffelOffer {
    airline: string;
    price: number;
    currency: string;
    duration: string;
    stops: number;
}

export interface DuffelResult {
    site: string;
    price: number | string;
    currency: 'brl' | 'usd';
    success: boolean;
    error?: string;
    searchUrl?: string;
    airlineBreakdown?: { airline: string; price: string }[];
}

const BASE = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(iso: string | undefined): string {
    if (!iso) return '';
    // PT2H35M → 2h35m
    return iso.replace('PT', '').toLowerCase();
}

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency.toUpperCase(),
        maximumFractionDigits: 2,
    }).format(amount);
}

// ─── Main search ──────────────────────────────────────────────────────────────
export async function searchDuffel(
    origin: string,
    destination: string,
    dateISO: string,
    passengers: number = 1,
): Promise<DuffelResult> {
    const searchUrl = `https://app.duffel.com`;

    const apiKey = process.env.DUFFEL_API_KEY;
    if (!apiKey) {
        return {
            site: 'Duffel',
            price: '–',
            currency: 'usd',
            success: false,
            error: 'Chave não configurada. Adicione DUFFEL_API_KEY no .env.local',
            searchUrl,
        };
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Duffel-Version': DUFFEL_VERSION,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    try {
        // Build passenger list
        const passengersList = Array.from({ length: passengers }, () => ({ type: 'adult' }));

        // POST /air/offer_requests?return_offers=true
        // This returns offers inline in a single call — simpler and faster
        const body = {
            data: {
                slices: [
                    {
                        origin,
                        destination,
                        departure_date: dateISO,
                    },
                ],
                passengers: passengersList,
                cabin_class: 'economy',
            },
        };

        const offerReqRes = await fetch(`${BASE}/air/offer_requests?return_offers=true`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20_000),
        });

        if (!offerReqRes.ok) {
            const err = await offerReqRes.json().catch(() => ({ errors: [{ message: offerReqRes.statusText }] }));
            const msg = err?.errors?.[0]?.message ?? `HTTP ${offerReqRes.status}`;

            // 422 = unprocessable → rota sem disponibilidade ou data inválida
            if (offerReqRes.status === 422) {
                return {
                    site: 'Duffel',
                    price: 'N/A',
                    currency: 'usd',
                    success: false,
                    error: 'Sem disponibilidade ou data inválida nesta rota',
                    searchUrl,
                };
            }

            throw new Error(msg);
        }

        const reqData = await offerReqRes.json();
        const offers: any[] = reqData?.data?.offers ?? [];

        if (offers.length === 0) {
            return {
                site: 'Duffel',
                price: 'N/A',
                currency: 'usd',
                success: false,
                error: 'Sem disponibilidade nesta data',
                searchUrl,
            };
        }

        // Sort by total_amount ascending
        const sorted = [...offers].sort(
            (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
        );

        const cheapest = sorted[0];
        const cheapestPrice = parseFloat(cheapest.total_amount);
        const currency = (cheapest.total_currency ?? 'USD').toUpperCase();

        // Build airline breakdown (cheapest per airline, top 5)
        const byAirline: Record<string, number> = {};
        for (const offer of sorted) {
            const airline = offer.owner?.name ?? offer.owner?.iata_code ?? '??';
            const price = parseFloat(offer.total_amount);
            if (!byAirline[airline] || price < byAirline[airline]) {
                byAirline[airline] = price;
            }
        }
        const airlineBreakdown = Object.entries(byAirline)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 5)
            .map(([airline, price]) => ({
                airline,
                price: formatPrice(price, currency),
            }));

        return {
            site: 'Duffel',
            price: cheapestPrice,
            currency: currency === 'BRL' ? 'brl' : 'usd',
            success: true,
            searchUrl,
            airlineBreakdown,
        };

    } catch (e: any) {
        const msg: string = e?.message ?? 'Erro desconhecido';
        const isTimeout = msg.includes('timeout') || msg.toLowerCase().includes('abort');
        return {
            site: 'Duffel',
            price: '–',
            currency: 'usd',
            success: false,
            error: isTimeout ? 'Timeout (>20s) – tente novamente' : msg,
            searchUrl,
        };
    }
}
