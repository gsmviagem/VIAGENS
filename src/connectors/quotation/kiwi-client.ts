/**
 * Kiwi.com Tequila Flight Search API client
 *
 * Docs: https://tequila.kiwi.com/portal/docs/tequila-api/search_api
 *
 * Env vars required:
 *   KIWI_API_KEY  – Token obtido em tequila.kiwi.com (cadastro só com e-mail)
 *
 * Setup (< 3 min, sem dados pessoais):
 *   1. Acesse tequila.kiwi.com
 *   2. Clique em "Get API key" → cadastre com e-mail
 *   3. Copie a API Key gerada
 *   4. Coloque em KIWI_API_KEY no .env.local
 *
 * Cobertura: 750+ companhias (GOL, LATAM, Azul, TAP, American, Emirates, etc.)
 * Retorna preços reais em BRL — ideal para complementar a busca de milhas.
 */

export interface KiwiOffer {
    airline: string;
    price: number;
    currency: string;
    duration: string;
    stops: number;
    deepLink: string;
}

export interface KiwiResult {
    site: string;
    price: number | string;
    currency: 'brl' | 'usd';
    success: boolean;
    error?: string;
    searchUrl?: string;
    airlineBreakdown?: { airline: string; price: string }[];
}

// ─── Airline IATA → name (mercado BR) ─────────────────────────────────────────
const AIRLINE_NAMES: Record<string, string> = {
    G3: 'GOL', LA: 'LATAM', JJ: 'LATAM', AD: 'Azul', TP: 'TAP', AA: 'American',
    UA: 'United', DL: 'Delta', BA: 'British', IB: 'Iberia', LH: 'Lufthansa',
    KL: 'KLM', AF: 'Air France', AV: 'Avianca', CM: 'Copa', AM: 'Aeromexico',
    AR: 'Aerolíneas', EK: 'Emirates', QR: 'Qatar', TK: 'Turkish', AC: 'Air Canada',
    FR: 'Ryanair', U2: 'easyJet', W6: 'Wizz', VY: 'Vueling', SK: 'SAS',
};

function airlineName(code: string): string {
    return AIRLINE_NAMES[code] ?? code;
}

/** Converte segundos em string legível: 9240 → "2h34m" */
function formatSeconds(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h${m > 0 ? `${m}m` : ''}`;
}

/** Converte YYYY-MM-DD → DD/MM/YYYY (formato aceito pelo Tequila) */
function toTequilaDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency.toUpperCase(),
        maximumFractionDigits: 2,
    }).format(amount);
}

// ─── Main search ──────────────────────────────────────────────────────────────
export async function searchKiwi(
    origin: string,
    destination: string,
    dateISO: string,
    passengers: number = 1,
): Promise<KiwiResult> {
    const fallbackUrl = `https://www.kiwi.com/pt/search/results/${origin}/${destination}/${dateISO}/no-return`;

    const apiKey = process.env.KIWI_API_KEY;
    if (!apiKey) {
        return {
            site: 'Kiwi',
            price: '–',
            currency: 'brl',
            success: false,
            error: 'Chave não configurada. Adicione KIWI_API_KEY no .env.local',
            searchUrl: fallbackUrl,
        };
    }

    try {
        const dateFormatted = toTequilaDate(dateISO);

        const params = new URLSearchParams({
            fly_from: origin,
            fly_to: destination,
            date_from: dateFormatted,
            date_to: dateFormatted,       // mesmo dia = busca exata
            curr: 'BRL',
            adults: String(passengers),
            children: '0',
            infants: '0',
            flight_type: 'oneway',
            one_for_city: '1',            // melhor voo por cidade de destino
            limit: '20',
            sort: 'price',
        });

        const res = await fetch(`https://api.tequila.kiwi.com/v2/search?${params}`, {
            headers: {
                'apikey': apiKey,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            if (res.status === 401) {
                return {
                    site: 'Kiwi',
                    price: '–',
                    currency: 'brl',
                    success: false,
                    error: 'API Key inválida. Verifique KIWI_API_KEY',
                    searchUrl: fallbackUrl,
                };
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const flights: any[] = data?.data ?? [];

        if (flights.length === 0) {
            return {
                site: 'Kiwi',
                price: 'N/A',
                currency: 'brl',
                success: false,
                error: 'Sem disponibilidade nesta data / rota',
                searchUrl: fallbackUrl,
            };
        }

        // Ordena por preço crescente (já vem ordenado, mas garantimos)
        const sorted = [...flights].sort((a, b) => a.price - b.price);
        const cheapest = sorted[0];

        // URL de deep link do Kiwi direto para compra
        const searchUrl: string = cheapest.deep_link ?? fallbackUrl;

        // Breakdown por companhia: melhor preço de cada cia entre todos os resultados
        const byAirline: Record<string, number> = {};
        for (const flight of sorted) {
            // Cada voo pode ter múltiplos segmentos com cias diferentes
            const mainAirline = airlineName(
                flight.airlines?.[0] ?? flight.route?.[0]?.airline ?? '??'
            );
            if (!byAirline[mainAirline] || flight.price < byAirline[mainAirline]) {
                byAirline[mainAirline] = flight.price;
            }
        }

        const airlineBreakdown = Object.entries(byAirline)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 5)
            .map(([airline, price]) => ({
                airline,
                price: formatPrice(price, 'BRL'),
            }));

        return {
            site: 'Kiwi',
            price: cheapest.price,
            currency: 'brl',
            success: true,
            searchUrl,
            airlineBreakdown,
        };

    } catch (e: any) {
        const msg: string = e?.message ?? 'Erro desconhecido';
        const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort');
        return {
            site: 'Kiwi',
            price: '–',
            currency: 'brl',
            success: false,
            error: isTimeout ? 'Timeout (>15s) — tente novamente' : msg,
            searchUrl: fallbackUrl,
        };
    }
}
