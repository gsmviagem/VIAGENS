/**
 * Busca Ideal – cliente fetch-based (sem Playwright, roda no Vercel)
 *
 * Fluxo real descoberto via engenharia reversa da SPA Vue.js:
 *  1. GET  /login/auth           → pega JSESSIONID pré-login
 *  2. POST /login/authenticate   → troca por JSESSIONID autenticado
 *  3. GET  /                     → extrai idCli do HTML
 *  4. POST /busca/searchFlights  → JSON com voos por companhia
 *     - di deve estar em formato YYYY-MM-DD (ISO)
 *     - chamar uma vez por cia (GOL, LATAM, AZUL, TAP)
 *
 * Env vars:
 *   BUSCA_IDEAL_USER  – login
 *   BUSCA_IDEAL_PASS  – senha
 */

export interface BuscaIdealOffer {
    flightCode: string;   // ex: "G31380"
    airline: string;      // ex: "GOL"
    departure: string;    // ex: "10/04/2026 21:55"
    arrival: string;      // ex: "10/04/2026 23:05"
    duration: string;     // ex: "01:10"
    stops: string;        // ex: "Direto" | "1 parada(s)"
    priceBrl: number;     // TotalValorSky (preço Sky)
    miles: number;        // TotalMilhas
    taxes: number;        // Taxas aeroportuárias / embarque
    type: string;         // menorPreco: "Sky" | "Cia" etc.
}

export interface BuscaIdealResult {
    site: string;
    price: number | string;
    currency: 'brl' | 'miles';
    success: boolean;
    error?: string;
    searchUrl?: string;
    offers?: BuscaIdealOffer[];
    airlineBreakdown?: { airline: string; price: string }[];
    milesBreakdown?: { airline: string; flightCode: string; miles: string; departure: string; stops: string }[];
}

// ─── Session cache ────────────────────────────────────────────────────────────
interface SessionCache {
    cookie: string;
    idCli: string;
    expiresAt: number;
}

let _session: SessionCache | null = null;
const SESSION_TTL = 25 * 60 * 1000; // 25 min

const BASE = 'https://busca.buscaideal.com.br';

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

// ─── Login + extração de idCli ────────────────────────────────────────────────
function extractIdCli(html: string): string | null {
    const m =
        html.match(/Cliente\s*=\s*(\d{4,8})/) ??
        html.match(/idCli['":\s=]+(\d{4,8})/i) ??
        html.match(/"idCliente"\s*:\s*(\d{4,8})/) ??
        html.match(/"id"\s*:\s*(\d{4,8})/) ??
        html.match(/idcliente['":\s=]+(\d{4,8})/i) ??
        html.match(/cliente['":\s=]+(\d{4,8})/i) ??
        html.match(/[?&]idCli=(\d{4,8})/);
    return m?.[1] ?? null;
}

async function authenticate(user: string, pass: string): Promise<SessionCache> {
    // 0. GET /login/auth para pegar JSESSIONID pré-login
    let preCookie = '';
    try {
        const preRes = await fetch(`${BASE}/login/auth`, {
            headers: { ...DEFAULT_HEADERS },
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
        });
        const setCookieHeader = preRes.headers.get('set-cookie') ?? '';
        preCookie = setCookieHeader.split(';')[0].trim();
        console.log(`[BUSCA-IDEAL] Pre-login cookie: ${preCookie.split('=')[0]}`);
    } catch (e: any) {
        console.log(`[BUSCA-IDEAL] Pre-login GET failed: ${e.message}`);
    }

    // 1. POST login
    const loginRes = await fetch(`${BASE}/login/authenticate`, {
        method: 'POST',
        headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': BASE,
            'Referer': `${BASE}/login/auth`,
            ...(preCookie ? { 'Cookie': preCookie } : {}),
        },
        body: new URLSearchParams({ username: user, password: pass, 'remember-me': 'on' }).toString(),
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
    });

    const setCookieLogin = loginRes.headers.get('set-cookie') ?? '';
    const location = loginRes.headers.get('location') ?? '';
    const sessionCookie = setCookieLogin.split(';')[0].trim();

    if (!sessionCookie) {
        if (location.includes('login_error') || loginRes.status === 401) {
            throw new Error('Credenciais inválidas. Verifique BUSCA_IDEAL_USER e BUSCA_IDEAL_PASS.');
        }
        throw new Error(`Login não retornou cookie de sessão (status ${loginRes.status}, location: ${location})`);
    }

    if (location.includes('login_error')) {
        throw new Error('Credenciais inválidas. Verifique BUSCA_IDEAL_USER e BUSCA_IDEAL_PASS.');
    }

    console.log(`[BUSCA-IDEAL] Login OK – redirect: ${location}`);

    // 2. Extrai idCli do homepage
    let idCli: string | null = null;
    const pagesToTry = [
        location.startsWith('http') ? location : `${BASE}${location.startsWith('/') ? '' : '/'}${location}`,
        `${BASE}/`,
        `${BASE}/busca`,
    ];

    for (const pageUrl of pagesToTry) {
        try {
            const res = await fetch(pageUrl, {
                headers: { ...DEFAULT_HEADERS, 'Cookie': sessionCookie, 'Referer': `${BASE}/login/auth` },
                signal: AbortSignal.timeout(10_000),
            });
            const html = await res.text();
            idCli = extractIdCli(html);
            console.log(`[BUSCA-IDEAL] ${pageUrl} (${res.status}) – idCli: ${idCli ?? 'not found'}`);
            if (idCli) break;
        } catch (e: any) {
            console.log(`[BUSCA-IDEAL] Erro em ${pageUrl}: ${e.message}`);
        }
    }

    if (!idCli) {
        throw new Error('Não foi possível extrair idCli. Login pode ter falhado ou site bloqueou o servidor.');
    }

    const cache: SessionCache = { cookie: sessionCookie, idCli, expiresAt: Date.now() + SESSION_TTL };
    _session = cache;
    console.log(`[BUSCA-IDEAL] Autenticado – idCli: ${idCli}`);
    return cache;
}

async function getSession(user: string, pass: string): Promise<SessionCache> {
    if (_session && Date.now() < _session.expiresAt) return _session;
    return authenticate(user, pass);
}

// ─── Chamada por companhia ────────────────────────────────────────────────────
async function fetchFlightsByCia(
    cia: string,
    origin: string,
    destination: string,
    dateISO: string,
    passengers: number,
    session: SessionCache,
    cabin: 'economy' | 'executive' = 'economy',
): Promise<any[]> {
    const body = new URLSearchParams({
        cia,
        o: origin,
        d: destination,
        totalAdults: String(passengers),
        totalChildren: '0',
        totalBaby: '0',
        ida: 'true',
        di: dateISO,        // ← YYYY-MM-DD (ISO) conforme reverse-engineering da SPA
        df: '',
        cex: cabin === 'executive' ? 'true' : 'false',
        idCliente: session.idCli,
    });

    const res = await fetch(`${BASE}/busca/searchFlights`, {
        method: 'POST',
        headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': session.cookie,
            'Referer': `${BASE}/busca/index`,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Origin': BASE,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const trechoKey = origin + destination;
    return data?.results?.Trechos?.[trechoKey]?.Voos ?? [];
}

// ─── Função principal ─────────────────────────────────────────────────────────
export async function searchBuscaIdeal(
    origin: string,
    destination: string,
    dateISO: string, // YYYY-MM-DD
    passengers: number = 1,
    cabin: 'economy' | 'executive' = 'economy',
): Promise<BuscaIdealResult> {
    const [y, m, d] = dateISO.split('-');
    const dateFmt = `${d}/${m}/${y}`;
    const searchUrl = `${BASE}/busca/index?executar=1&o=${origin}&d=${destination}&di=${dateFmt}&df=${dateFmt}&pa=${passengers}&pc=0&pb=0&ida=true&af=${origin}&at=${destination}&azul=1&gol=1&latam=1&tap=1&outros=1`;

    const user = process.env.BUSCA_IDEAL_USER;
    const pass = process.env.BUSCA_IDEAL_PASS;

    if (!user || !pass) {
        return {
            site: 'Busca Ideal',
            price: '–',
            currency: 'brl',
            success: false,
            error: 'Credenciais não configuradas. Adicione BUSCA_IDEAL_USER e BUSCA_IDEAL_PASS no .env.local',
            searchUrl,
        };
    }

    try {
        const session = await getSession(user, pass);

        // Busca em paralelo por companhia
        const airlines = ['GOL', 'LATAM', 'AZUL', 'TAP'];
        const settled = await Promise.allSettled(
            airlines.map(cia => fetchFlightsByCia(cia, origin, destination, dateISO, passengers, session, cabin))
        );

        // Verifica se a sessão expirou (redireciona para login)
        const allVoosRaw: any[] = [];
        for (const r of settled) {
            if (r.status === 'fulfilled') allVoosRaw.push(...r.value);
            else console.log(`[BUSCA-IDEAL] Cia error: ${r.reason?.message}`);
        }

        if (allVoosRaw.length === 0) {
            console.log(`[BUSCA-IDEAL] 0 voos para ${origin}→${destination} em ${dateISO}`);
            return {
                site: 'Busca Ideal',
                price: 'N/A',
                currency: 'brl',
                success: false,
                error: 'Sem disponibilidade nesta rota/data',
                searchUrl,
            };
        }

        // Mapeia para BuscaIdealOffer
        const offers: BuscaIdealOffer[] = allVoosRaw.map(v => ({
            flightCode: v.NumeroVoo ?? '',
            airline: v.Companhia ?? '',
            departure: v.Embarque ?? '',
            arrival: v.Desembarque ?? '',
            duration: v.Duracao ?? '',
            stops: (v.NumeroConexoes ?? 0) > 0 ? `${v.NumeroConexoes} parada(s)` : 'Direto',
            priceBrl: v.TotalValorSky ?? v.TotalValorCia ?? 0,
            miles: v.TotalMilhas ?? 0,
            taxes: v.Taxas ?? v.TaxasAeroportuarias ?? v.TaxaEmbarque ?? v.TaxasTotal ?? 0,
            type: v.menorPreco ?? '',
        })).filter(o => o.priceBrl > 0 || o.miles > 0);

        // Melhor preço BRL
        const withPrice = offers.filter(o => o.priceBrl > 0).sort((a, b) => a.priceBrl - b.priceBrl);

        // Breakdown por companhia em BRL (mais barata por cia)
        const byAirline: Record<string, number> = {};
        for (const o of withPrice) {
            if (!byAirline[o.airline] || o.priceBrl < byAirline[o.airline]) {
                byAirline[o.airline] = o.priceBrl;
            }
        }
        const airlineBreakdown = Object.entries(byAirline)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 6)
            .map(([airline, price]) => ({
                airline,
                price: `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            }));

        // Top 5 mais baratos em milhas
        const withMiles = offers.filter(o => o.miles > 0).sort((a, b) => a.miles - b.miles);
        const milesBreakdown = withMiles.slice(0, 5).map(o => ({
            airline: o.airline,
            flightCode: o.flightCode,
            miles: o.miles.toLocaleString('pt-BR'),
            departure: o.departure,
            stops: o.stops,
        }));

        // Preço principal: menor milhas se disponível, senão menor BRL
        const cheapestMiles = withMiles[0];
        const cheapestBrl = withPrice[0];
        const mainPrice = cheapestMiles ? cheapestMiles.miles : (cheapestBrl?.priceBrl ?? 'N/A');
        const mainCurrency = cheapestMiles ? 'miles' : 'brl';

        console.log(`[BUSCA-IDEAL] ${offers.length} voos | cheapest miles: ${cheapestMiles?.miles ?? 'none'} | cheapest BRL: ${cheapestBrl?.priceBrl ?? 'none'}`);

        return {
            site: 'Busca Ideal',
            price: mainPrice,
            currency: mainCurrency,
            success: true,
            searchUrl,
            offers: offers.slice(0, 100),
            airlineBreakdown,
            milesBreakdown,
        };

    } catch (e: any) {
        const msg: string = e?.message ?? 'Erro desconhecido';
        const isTimeout = msg.includes('timeout') || msg.toLowerCase().includes('abort');
        if (msg.includes('expirada') || msg.includes('Credenciais')) _session = null;

        return {
            site: 'Busca Ideal',
            price: '–',
            currency: 'brl',
            success: false,
            error: isTimeout ? 'Timeout (>30s) – tente novamente' : msg,
            searchUrl,
        };
    }
}
