/**
 * Busca Ideal – cliente fetch-based (sem Playwright, roda no Vercel)
 *
 * Fluxo descoberto via inspeção de rede:
 *  1. POST /login/authenticate  → form-data username + password  → session cookie
 *  2. GET  /                    → HTML contém "Cliente = <idCli>"
 *  3. GET  /busca/index?...     → HTML com resultados renderizados server-side
 *  4. Parse DOM via regex       → extrai companhia, horários, preço BRL, milhas
 *
 * Env vars:
 *   BUSCA_IDEAL_USER  – login (ex: gsmviavem.gabriel)
 *   BUSCA_IDEAL_PASS  – senha
 */

export interface BuscaIdealOffer {
    flightCode: string;      // ex: "AV0086"
    airline: string;         // ex: "Avianca"
    departure: string;       // ex: "20/05/2026 07:35 GRU"
    arrival: string;         // ex: "22/05/2026 02:05 JFK"
    duration: string;        // ex: "43:30"
    stops: string;           // ex: "2 parada(s)"
    priceBrl: number;        // ex: 1462.00
    miles: number;           // ex: 86000
    type: string;            // ex: "Exclusivo em milhas"
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
}

// ─── Session cache (module-level, por processo serverless) ────────────────────
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
        html.match(/idcliente['":\s=]+(\d{4,8})/i) ??
        html.match(/cliente['":\s=]+(\d{4,8})/i) ??
        html.match(/[?&]idCli=(\d{4,8})/) ??
        html.match(/\/(\d{5,8})\/busca/);
    return m?.[1] ?? null;
}

async function authenticate(user: string, pass: string): Promise<SessionCache> {
    // 1. POST login com redirect manual para capturar Set-Cookie
    const loginRes = await fetch(`${BASE}/login/authenticate`, {
        method: 'POST',
        headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': BASE,
            'Referer': `${BASE}/login/auth`,
        },
        body: new URLSearchParams({ username: user, password: pass }).toString(),
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
    });

    // Coleta todos os Set-Cookie da resposta
    const rawCookies = loginRes.headers.getSetCookie?.() ?? [];
    const setCookieHeader = loginRes.headers.get('set-cookie') ?? '';
    const location = loginRes.headers.get('location') ?? '';

    const cookiePairs: string[] = [];
    const cookieSources = rawCookies.length > 0 ? rawCookies : [setCookieHeader];
    for (const raw of cookieSources) {
        const parts = raw.split(';');
        if (parts[0]?.includes('=')) cookiePairs.push(parts[0].trim());
    }

    if (cookiePairs.length === 0) {
        if (location.includes('login_error') || loginRes.status === 401) {
            throw new Error('Credenciais inválidas. Verifique BUSCA_IDEAL_USER e BUSCA_IDEAL_PASS.');
        }
        throw new Error(`Login não retornou cookie de sessão (status ${loginRes.status}, location: ${location})`);
    }

    if (location.includes('login_error')) {
        throw new Error('Credenciais inválidas. Verifique BUSCA_IDEAL_USER e BUSCA_IDEAL_PASS.');
    }

    const sessionCookie = cookiePairs.join('; ');
    console.log(`[BUSCA-IDEAL] Login OK – cookies: ${cookiePairs.length}, redirect: ${location}`);

    // 2. Tenta extrair idCli em múltiplas páginas (redirect → / → /busca → /busca/index)
    const pagesToTry: string[] = [];
    if (location) {
        const redirectUrl = location.startsWith('http') ? location : `${BASE}${location.startsWith('/') ? '' : '/'}${location}`;
        pagesToTry.push(redirectUrl);
    }
    pagesToTry.push(`${BASE}/`);
    pagesToTry.push(`${BASE}/busca`);
    pagesToTry.push(`${BASE}/busca/index`);

    let idCli: string | null = null;
    for (const pageUrl of pagesToTry) {
        try {
            const res = await fetch(pageUrl, {
                headers: { ...DEFAULT_HEADERS, 'Cookie': sessionCookie, 'Referer': `${BASE}/login/auth` },
                signal: AbortSignal.timeout(10_000),
            });
            const html = await res.text();
            idCli = extractIdCli(html);
            console.log(`[BUSCA-IDEAL] Tentando ${pageUrl} (${res.status}) – idCli: ${idCli ?? 'não encontrado'}`);
            if (idCli) break;
        } catch (e: any) {
            console.log(`[BUSCA-IDEAL] Erro em ${pageUrl}: ${e.message}`);
        }
    }

    if (!idCli) {
        throw new Error('Não foi possível extrair idCli. Login pode ter falhado ou site bloqueou o servidor.');
    }

    const cache: SessionCache = {
        cookie: sessionCookie,
        idCli,
        expiresAt: Date.now() + SESSION_TTL,
    };

    _session = cache;
    console.log(`[BUSCA-IDEAL] Autenticado – idCli: ${cache.idCli}`);
    return cache;
}

async function getSession(user: string, pass: string): Promise<SessionCache> {
    if (_session && Date.now() < _session.expiresAt) return _session;
    return authenticate(user, pass);
}

// ─── Parser de resultados HTML ────────────────────────────────────────────────
function parseFlightResults(html: string): BuscaIdealOffer[] {
    const offers: BuscaIdealOffer[] = [];

    // Cada voo está em um bloco com classe voo_ida_X
    // Usamos regex para extrair os dados sem precisar de DOM
    const vooBlocks = html.split(/class="voo_ida_\d+"/);
    if (vooBlocks.length <= 1) return offers;

    for (let i = 1; i < vooBlocks.length; i++) {
        const block = vooBlocks[i];

        // Código do voo (ex: AV0086, G30561, LA3532)
        const flightMatch = block.match(/>\s*([A-Z]{2}\d{3,5})\s*</);
        const flightCode = flightMatch?.[1] ?? '';

        // Horário de partida (ex: 07:35) e data (ex: 20/05/2026)
        const partMatch = block.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+([A-Z]{3})/);
        const departure = partMatch ? `${partMatch[1]} ${partMatch[2]} ${partMatch[3]}` : '';

        // Duração (ex: 43:30)
        const durMatch = block.match(/(\d{1,2}:\d{2})\s*<\/span>/);
        const duration = durMatch?.[1] ?? '';

        // Número de paradas
        const stopsMatch = block.match(/(\d+)\s*parada/i);
        const stops = stopsMatch ? `${stopsMatch[1]} parada(s)` : 'Direto';

        // Chegada — segundo grupo de data+hora+IATA
        const allDateMatches = [...block.matchAll(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+([A-Z]{3})/g)];
        const arrival = allDateMatches.length >= 2
            ? `${allDateMatches[1][1]} ${allDateMatches[1][2]} ${allDateMatches[1][3]}`
            : '';

        // Preço BRL (ex: R$ 1.462,00)
        const priceMatch = block.match(/R\$\s*([\d.]+,\d{2})/);
        const priceBrl = priceMatch
            ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'))
            : 0;

        // Milhas (ex: 86.000)
        const milesMatch = block.match(/(\d{2,3}\.\d{3})\s*<\/span>/);
        const miles = milesMatch
            ? parseInt(milesMatch[1].replace(/\./g, ''), 10)
            : 0;

        // Tipo (ex: "Exclusivo em milhas")
        const typeMatch = block.match(/resultado-voos-preco-cia[^>]*>[^<]*<span[^>]*>([^<]+)</);
        const type = typeMatch?.[1]?.trim() ?? '';

        // Companhia a partir do código
        const airlineCode = flightCode.slice(0, 2);
        const airline = AIRLINE_MAP[airlineCode] ?? airlineCode;

        if (priceBrl > 0 || miles > 0) {
            offers.push({ flightCode, airline, departure, arrival, duration, stops, priceBrl, miles, type });
        }
    }

    return offers;
}

const AIRLINE_MAP: Record<string, string> = {
    AV: 'Avianca', G3: 'GOL', LA: 'LATAM', JJ: 'LATAM', AD: 'Azul',
    TP: 'TAP', AA: 'American', UA: 'United', DL: 'Delta', BA: 'British',
    IB: 'Iberia', LH: 'Lufthansa', KL: 'KLM', AF: 'Air France',
    CM: 'Copa', AM: 'Aeromexico', AR: 'Aerolíneas', EK: 'Emirates',
};

// ─── Função principal ─────────────────────────────────────────────────────────
export async function searchBuscaIdeal(
    origin: string,
    destination: string,
    dateISO: string, // YYYY-MM-DD
    passengers: number = 1,
): Promise<BuscaIdealResult> {
    // Formata data para YYYY/MM/DD (formato do Busca Ideal)
    const dateFmt = dateISO.replace(/-/g, '/');
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

        // Monta URL com idCli e cache-buster
        const params = new URLSearchParams({
            executar: '1',
            cia: '',
            di: dateFmt,
            df: dateFmt,
            f: 'Cidade ou Aeroporto',
            t: 'Cidade ou Aeroporto',
            pa: String(passengers),
            pc: '0',
            pb: '0',
            o: origin,
            cec: 'true',
            cex: 'false',
            ol: 'Cidade ou Aeroporto',
            oli: '',
            d: destination,
            dl: 'Cidade ou Aeroporto',
            ida: 'true',
            af: origin,
            at: destination,
            idCli: session.idCli,
            dli: '',
            ext: 'false',
            cache: String(Date.now()),
            isAv: 'false',
            avi: '0',
            avv: '0',
            iberia: '0',
            azul: '1',
            gol: '1',
            latam: '1',
            tap: '1',
            outros: '1',
        });

        const buscarUrl = `${BASE}/busca/index?${params}`;

        const res = await fetch(buscarUrl, {
            headers: {
                ...DEFAULT_HEADERS,
                'Cookie': session.cookie,
                'Referer': `${BASE}/`,
            },
            signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();

        // Verifica se foi redirecionado para login (sessão expirada)
        if (html.includes('/login/auth') && !html.includes('resultado-voos')) {
            _session = null; // invalida cache
            throw new Error('Sessão expirada. Tente novamente.');
        }

        const offers = parseFlightResults(html);

        if (offers.length === 0) {
            return {
                site: 'Busca Ideal',
                price: 'N/A',
                currency: 'brl',
                success: false,
                error: 'Sem disponibilidade nesta rota/data',
                searchUrl,
            };
        }

        // Melhor preço BRL
        const withPrice = offers.filter(o => o.priceBrl > 0).sort((a, b) => a.priceBrl - b.priceBrl);
        const cheapest = withPrice[0] ?? offers[0];

        // Breakdown por companhia (mais barata por cia)
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

        return {
            site: 'Busca Ideal',
            price: cheapest.priceBrl,
            currency: 'brl',
            success: true,
            searchUrl,
            offers: offers.slice(0, 20),
            airlineBreakdown,
        };

    } catch (e: any) {
        const msg: string = e?.message ?? 'Erro desconhecido';
        const isTimeout = msg.includes('timeout') || msg.toLowerCase().includes('abort');
        // Se sessão expirou, limpa cache
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
