/**
 * screen-analyzer.ts
 * Motor de análise de tela para operações de emissão de passagens aéreas.
 * Sem IA — regex, heurísticas e máquina de estados baseada em regras.
 *
 * Fluxo: texto bruto → extração → normalização → scoring de estado → resultado
 */

// ══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════════════════

export interface ExtractedField<T = string> {
    value: T;
    confidence: number;   // 0–1
    evidence: string;     // trecho exato que gerou o match
    rule: string;         // nome da regra que detectou
}

export interface PassengerEntity {
    fullName:   ExtractedField | null;
    firstName:  ExtractedField | null;
    lastName:   ExtractedField | null;
    dob:        ExtractedField | null;          // ISO YYYY-MM-DD
    age:        ExtractedField<number> | null;
    passport:   ExtractedField | null;
}

export interface FlightSegment {
    origin:       ExtractedField | null;   // IATA
    destination:  ExtractedField | null;   // IATA
    date:         ExtractedField | null;   // ISO YYYY-MM-DD
    time:         ExtractedField | null;   // HH:MM
    flightNumber: ExtractedField | null;
    cabin:        ExtractedField | null;
}

export interface ExtractedEntities {
    passengers:      PassengerEntity[];
    segments:        FlightSegment[];
    airline:         ExtractedField | null;
    pax_count:       ExtractedField<number> | null;
    pnr:             ExtractedField | null;
    ticketNumber:    ExtractedField | null;   // 13-dígitos ou XXX-NNNNNNNNNN
    bookingRef:      ExtractedField | null;
    totalCash:       ExtractedField<number> | null;
    totalMiles:      ExtractedField<number> | null;
    taxes:           ExtractedField<number> | null;
    successMessages: ExtractedField[];
    errorMessages:   ExtractedField[];
    pageType:        ExtractedField<PageType> | null;
    buttons:         ExtractedField[];
}

export type PageType =
    | 'search' | 'results' | 'passenger' | 'payment'
    | 'confirmation' | 'success' | 'error' | 'unknown';

export type OperationState =
    | 'pedido_recebido'
    | 'dados_incompletos'
    | 'pronto_para_busca'
    | 'busca_em_andamento'
    | 'opcoes_encontradas'
    | 'selecionando_voo'
    | 'preenchendo_passageiro'
    | 'preenchendo_pagamento'
    | 'confirmacao_final'
    | 'emissao_em_andamento'
    | 'emitida_com_sucesso'
    | 'erro_na_emissao'
    | 'reserva_criada_nao_emitida'
    | 'cancelada'
    | 'estado_desconhecido';

export interface StateSignal {
    key:         string;
    description: string;
    weight:      number;          // magnitude do sinal
    state:       OperationState;  // estado que este sinal favorece
    found:       boolean;
    evidence?:   string;
}

export interface StateResult {
    state:         OperationState;
    confidence:    number;
    signals:       StateSignal[];
    ambiguities:   string[];
    missingFields: string[];
    explanation:   string;
}

export interface ScreenAnalysis {
    entities:    ExtractedEntities;
    state:       StateResult;
    rawText:     string;
    analyzedAt:  string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

const IATA_SET = new Set([
    // Brasil
    'GRU','GIG','CGH','SDU','BSB','SSA','FOR','REC','BEL','MAO','CWB','POA','FLN','NAT','MCZ',
    'MCP','VCP','CNF','GYN','AJU','SLZ','THE','JPA','VIX','UDI','LDB','CPV','JDO','IMP','PMW',
    'PPB','XAP','CGB','BVB','ROO','CXJ','MGF','NVT','IGU','MOC','GVR','PLU','CAC','BPS','CLN',
    // América do Norte
    'MIA','JFK','LAX','ORD','DFW','ATL','LHR','IAH','EWR','SFO','SEA','BOS','DEN','MCO','PHX',
    'MSP','DTW','LAS','SAN','TPA','PDX','HNL','ANC','SLC','RSW','BWI','IAD','DCA','CLT','PHL',
    // Europa
    'LHR','CDG','MAD','LIS','FCO','FRA','AMS','ZRH','GVA','BCN','MUC','VIE','BRU','CPH','ARN',
    'HEL','OSL','DUB','MAN','LGW','STN','MXP','FCO','ATH','IST','LED','SVO','DME','WAW','PRG',
    // América Latina
    'EZE','BOG','SCL','GUA','MEX','CUN','PTY','MVD','LIM','UIO','GYE','VVI','ASU','COR','AEP',
    'MDE','CLO','CTG','BOG','GYE','LPB','CBB','SCZ','NQN','MDZ','SLA','TUC','CRD','PMQ','USH',
    'HAV','SDQ','SJU','PUJ','BDA','POS','GEO','PBM','CCS','CAI','ACC','LOS','NBO','JNB','CPT',
    // Médio Oriente / Ásia
    'DXB','AUH','DOH','RUH','KWI','BAH','AMM','BEY','TLV','IST','CAI','ADD','NBO','CMB','BOM',
    'DEL','BLR','MAA','HYD','CCU','PNQ','GOI','SIN','KUL','CGK','BKK','MNL','HAN','SGN','PEK',
    'PVG','CAN','SZX','HKG','TPE','ICN','NRT','HND','KIX','NGO','CTS','FUK',
]);

const AIRLINE_NAMES = [
    'GOL','LATAM','AZUL','TAP','AVIANCA','AMERICAN','UNITED','DELTA','COPA','IBERIA',
    'LUFTHANSA','AIR FRANCE','KLM','TURKISH','EMIRATES','QATAR','BRITISH','SWISS',
    'AEROMEXICO','CONVIASA','SKY','JETSMART','FLYBONDI','GLOW','VIVA',
];

// Números de ticket por companhia (prefixo de 3 dígitos)
const AIRLINE_PREFIXES: Record<string, string> = {
    '001': 'American','005': 'Continental','006': 'Delta','009': 'United',
    '014': 'Air Canada','019': 'KLM','020': 'Lufthansa','026': 'British',
    '043': 'Japan','047': 'TAP','054': 'Azul','057': 'LATAM','086': 'Delta',
    '101': 'Iberia','112': 'Ryanair','125': 'British','127': 'Alaska',
    '180': 'Korean','200': 'Copa','220': 'Avianca','232': 'Air France',
    '236': 'Singapore','239': 'Emirates','254': 'GOL','280': 'Turkish',
    '537': 'Azul','695': 'Gol',
};

// Palavras de sucesso — múltiplos idiomas
const SUCCESS_PATTERNS: { re: RegExp; label: string; weight: number }[] = [
    { re: /\b(bilhete emitido|ticket issued|emiss[aã]o conclu[íi]da)\b/i, label: 'ticket_issued', weight: 1.0 },
    { re: /\b(ticketed|e-ticket)\b/i, label: 'ticketed', weight: 0.95 },
    { re: /\b(booking confirmed|reserva confirmada|reservation confirmed)\b/i, label: 'booking_confirmed', weight: 0.85 },
    { re: /\b(purchase complete|compra (efetuada|realizada|confirmada))\b/i, label: 'purchase_complete', weight: 0.9 },
    { re: /\b(pagamento aprovado|payment approved|pagamento efetuado)\b/i, label: 'payment_approved', weight: 0.85 },
    { re: /\b(it[ií]ner[áa]rio confirmado|itinerary confirmed)\b/i, label: 'itinerary_confirmed', weight: 0.8 },
    { re: /\b(issued|emitido)\b/i, label: 'issued', weight: 0.75 },
    { re: /\b(confirmed|confirmado)\b/i, label: 'confirmed', weight: 0.5 },
    { re: /\b(sucesso|success)\b/i, label: 'success_generic', weight: 0.4 },
    { re: /\bthank you for (your )?(booking|purchase)\b/i, label: 'thank_you', weight: 0.7 },
    { re: /\bobrigado pela compra\b/i, label: 'thank_you_pt', weight: 0.7 },
];

// Palavras de erro
const ERROR_PATTERNS: { re: RegExp; label: string; weight: number }[] = [
    { re: /\b(payment (failed|declined|refused)|pagamento (recusado|falhou|negado))\b/i, label: 'payment_failed', weight: 1.0 },
    { re: /\b(transaction (failed|error)|transa[çc][aã]o (falhou|erro))\b/i, label: 'transaction_failed', weight: 0.95 },
    { re: /\b(cart[aã]o inv[aá]lido|invalid card|card (declined|invalid))\b/i, label: 'invalid_card', weight: 0.9 },
    { re: /\b(session expired|sess[aã]o expirada|timeout)\b/i, label: 'session_expired', weight: 0.8 },
    { re: /\b(n[aã]o foi poss[ií]vel|could not complete|unable to (process|complete))\b/i, label: 'could_not_complete', weight: 0.85 },
    { re: /\b(error|erro)\b/i, label: 'error_generic', weight: 0.5 },
    { re: /\b(falha|failure)\b/i, label: 'failure_generic', weight: 0.5 },
    { re: /\b(tente novamente|try again|retry)\b/i, label: 'try_again', weight: 0.6 },
    { re: /\b(dados inv[aá]lidos|invalid (data|information))\b/i, label: 'invalid_data', weight: 0.7 },
];

// Botões CTA
const BUTTON_PATTERNS: { re: RegExp; label: string }[] = [
    { re: /\b(emitir|emit ticket|issue ticket|emiss[aã]o)\b/i, label: 'emit' },
    { re: /\b(pagar|pay now|pagamento|complete (purchase|payment)|efetuar pagamento)\b/i, label: 'pay' },
    { re: /\b(confirmar|confirm|confirmar reserva)\b/i, label: 'confirm' },
    { re: /\b(buscar|search|find flights|buscar voos)\b/i, label: 'search' },
    { re: /\b(selecionar|select|choose this flight|selecionar voo)\b/i, label: 'select_flight' },
    { re: /\b(reservar|book|book now|fazer reserva)\b/i, label: 'book' },
    { re: /\b(continuar|continue|next|pr[oó]ximo)\b/i, label: 'continue' },
    { re: /\b(cancelar|cancel|void)\b/i, label: 'cancel' },
];

// Tipo de página
const PAGE_TYPE_PATTERNS: { re: RegExp; type: PageType; weight: number }[] = [
    { re: /\b(bilhete emitido|ticket issued|booking (reference|number)|e-ticket)\b/i, type: 'success', weight: 1.0 },
    { re: /\b(pagamento|payment|checkout|cart[aã]o de cr[ée]dito|credit card|cvv|cvc)\b/i, type: 'payment', weight: 0.9 },
    { re: /\b(dados (do )?passageiro|passenger (details|information)|name as (in )?passport)\b/i, type: 'passenger', weight: 0.9 },
    { re: /\b(revisar reserva|review (booking|order)|confirm booking|resumo da reserva)\b/i, type: 'confirmation', weight: 0.85 },
    { re: /\b(escolha (seu )?voo|select (your )?flight|voos dispon[íi]veis|available flights|resultados)\b/i, type: 'results', weight: 0.9 },
    { re: /\b(buscar voos|search flights|origin|destination|data de ida|departure date)\b/i, type: 'search', weight: 0.8 },
    { re: /\b(error|erro|falha|failed|payment (failed|declined))\b/i, type: 'error', weight: 0.7 },
];

// Cabines
const CABIN_MAP: Record<string, string> = {
    'Y': 'Economy', 'W': 'Premium Economy', 'C': 'Business', 'J': 'Business', 'F': 'First',
    'ECONOMY': 'Economy', 'BUSINESS': 'Business', 'FIRST': 'First',
    'ECONÔMICA': 'Economy', 'EXECUTIVA': 'Business', 'PRIMEIRA CLASSE': 'First',
    'PREMIUM ECONOMY': 'Premium Economy', 'PREMIUM ECONÔMICA': 'Premium Economy',
};

// Meses por nome
const MONTH_MAP: Record<string, string> = {
    'janeiro':'01','fevereiro':'02','março':'03','abril':'04','maio':'05','junho':'06',
    'julho':'07','agosto':'08','setembro':'09','outubro':'10','novembro':'11','dezembro':'12',
    'jan':'01','fev':'02','mar':'03','abr':'04','mai':'05','jun':'06',
    'jul':'07','ago':'08','set':'09','out':'10','nov':'11','dez':'12',
    'january':'01','february':'02','march':'03','april':'04','may':'05','june':'06',
    'july':'07','august':'08','september':'09','october':'10','november':'11','december':'12',
};

// Stopwords para filtrar nomes falsos
const NAME_STOPWORDS = new Set([
    'THE','AND','FOR','ARE','BUT','NOT','YOU','ALL','CAN','HER','WAS','ONE','OUR','OUT',
    'DAY','GET','HAS','HIM','HIS','HOW','MAN','NEW','NOW','OLD','SEE','TWO','WAY','WHO',
    'BOY','DID','ITS','LET','PUT','SAY','SHE','TOO','USE','PARA','COM','UMA','SEM',
    'VOOS','VOOS','NOME','DATA','HORA','TIPO','VALOR','TAXA','TOTAL','ADULTO','ADULTOS',
    'CRIANÇA','INFANTE','PASSAGEM','BILHETE','RESERVA','EMISSAO','EMISSÃO',
]);

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS DE NORMALIZAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

function normDate(raw: string): string | null {
    raw = raw.trim();

    // dd/mm/yyyy ou dd-mm-yyyy
    const dmy = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

    // yyyy-mm-dd (já ISO)
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // dd de mês de yyyy
    const pt = raw.match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+)?(\d{4})$/i);
    if (pt) {
        const m = MONTH_MAP[pt[2].toLowerCase()];
        if (m) return `${pt[3]}-${m}-${pt[1].padStart(2, '0')}`;
    }

    // dd mês yyyy (inglês/português)
    const eng = raw.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    if (eng) {
        const m = MONTH_MAP[eng[2].toLowerCase()];
        if (m) return `${eng[3]}-${m}-${eng[1].padStart(2, '0')}`;
    }

    // mm/dd/yyyy (formato americano — heurística: mês <= 12)
    const mdy = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (mdy && parseInt(mdy[1]) <= 12) return `${mdy[3]}-${mdy[1]}-${mdy[2]}`;

    return null;
}

function normTime(raw: string): string | null {
    const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*[AaPp][Mm])?$/);
    if (!m) return null;
    let h = parseInt(m[1]);
    const min = m[2];
    if (raw.toLowerCase().includes('pm') && h < 12) h += 12;
    if (raw.toLowerCase().includes('am') && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
}

function normMoney(raw: string): number | null {
    const cleaned = raw.replace(/[R$USD€£\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

function normMiles(raw: string): number | null {
    // "50.000 milhas", "50K milhas", "1.5M milhas"
    const kilo = raw.match(/([\d,.]+)\s*[Kk]\b/);
    if (kilo) return parseFloat(kilo[1].replace(',', '.')) * 1000;
    const mega = raw.match(/([\d,.]+)\s*[Mm]\b/);
    if (mega) return parseFloat(mega[1].replace(',', '.')) * 1_000_000;
    const plain = raw.match(/([\d.]+(?:,\d+)?)\s*(milhas|miles|pontos|points|pts)\b/i);
    if (plain) return parseFloat(plain[1].replace('.', '').replace(',', '.'));
    return null;
}

function field<T = string>(
    value: T, confidence: number, evidence: string, rule: string
): ExtractedField<T> {
    return { value, confidence, evidence, rule };
}

function isValidIATA(code: string): boolean {
    return IATA_SET.has(code.toUpperCase());
}

// ══════════════════════════════════════════════════════════════════════════════
// EXTRAÇÃO DE ENTIDADES
// ══════════════════════════════════════════════════════════════════════════════

function extractPNR(text: string): ExtractedField | null {
    const upper = text.toUpperCase();

    // Contexto explícito (localizador, PNR, booking ref) → confiança alta
    const ctxRe = /(?:pnr|localizador|booking\s*(?:ref(?:erence)?|code)|reservation\s*(?:code|number)|record\s*locator)[:\s#]+([A-Z0-9]{5,7})\b/gi;
    let m = ctxRe.exec(upper);
    if (m) return field(m[1], 0.95, m[0], 'pnr_context');

    // 6 chars alphanuméricas com pelo menos 1 letra e 1 dígito, não IATA
    const bareRe = /\b([A-Z]{1,3}[0-9][A-Z0-9]{3,4}|[0-9][A-Z][A-Z0-9]{4})\b/g;
    const candidates: string[] = [];
    let bm: RegExpExecArray | null;
    while ((bm = bareRe.exec(upper)) !== null) {
        const c = bm[1];
        if (!IATA_SET.has(c) && !/^\d+$/.test(c) && /[A-Z]/.test(c) && /\d/.test(c) && c.length === 6) {
            candidates.push(c);
        }
    }
    if (candidates.length === 1) return field(candidates[0], 0.7, candidates[0], 'pnr_bare_6char');
    if (candidates.length > 1) return field(candidates[0], 0.55, candidates.join('|'), 'pnr_bare_ambiguous');

    return null;
}

function extractTicketNumber(text: string): ExtractedField | null {
    // Formato XXX-NNNNNNNNNN (3 dígitos + traço + 10 dígitos)
    const formatted = text.match(/\b(\d{3})-(\d{10})\b/g);
    if (formatted) {
        const raw = formatted[0];
        const prefix = raw.split('-')[0];
        const airline = AIRLINE_PREFIXES[prefix] || 'unknown';
        return field(raw, 0.97, raw, `ticket_formatted_${airline}`);
    }

    // 13 dígitos sequenciais (e-ticket sem traço)
    const bare13 = text.match(/\b(\d{13})\b/g);
    if (bare13) {
        const prefix = bare13[0].slice(0, 3);
        const airline = AIRLINE_PREFIXES[prefix] || 'unknown';
        return field(bare13[0], 0.90, bare13[0], `ticket_bare13_${airline}`);
    }

    return null;
}

function extractAirline(text: string): ExtractedField | null {
    const upper = text.toUpperCase();
    // Busca direta pelo nome
    for (const name of AIRLINE_NAMES) {
        if (upper.includes(name)) {
            return field(name, 0.85, name, 'airline_name_match');
        }
    }
    // Código IATA de companhia (2 letras + dígito, ex: G3, LA, AD)
    const codeRe = /\b([A-Z]{2})(\d{3,4})\b/g;
    const m = codeRe.exec(upper);
    if (m) {
        const code = m[1];
        const map: Record<string, string> = {
            'G3':'GOL','LA':'LATAM','JJ':'LATAM','AD':'AZUL','TP':'TAP',
            'AA':'AMERICAN','UA':'UNITED','DL':'DELTA','CM':'COPA','IB':'IBERIA',
            'LH':'LUFTHANSA','AF':'AIR FRANCE','KL':'KLM','TK':'TURKISH',
            'EK':'EMIRATES','QR':'QATAR','BA':'BRITISH','LX':'SWISS',
        };
        if (map[code]) return field(map[code], 0.75, m[0], 'airline_flight_code');
    }
    return null;
}

function extractSegments(text: string): FlightSegment[] {
    const upper = text.toUpperCase();
    const segments: FlightSegment[] = [];

    // Rota explícita: GRU → JFK, GRU-JFK, GRU/JFK, GRU > JFK
    const routeRe = /\b([A-Z]{3})\s*[-→>/]\s*([A-Z]{3})\b/g;
    let m: RegExpExecArray | null;
    const routes: Array<[string, string]> = [];
    while ((m = routeRe.exec(upper)) !== null) {
        if (isValidIATA(m[1]) && isValidIATA(m[2])) {
            routes.push([m[1], m[2]]);
        }
    }

    // Datas próximas a cada rota
    const dateMatches: string[] = [];
    const dateRe = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2})\b/g;
    while ((m = dateRe.exec(text)) !== null) dateMatches.push(m[1]);

    // Horários
    const timeMatches: string[] = [];
    const timeRe = /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\b/g;
    while ((m = timeRe.exec(text)) !== null) timeMatches.push(m[1]);

    // Número de voo
    const flightRe = /\b([A-Z]{2})\s*(\d{3,4})\b/g;
    const flights: string[] = [];
    while ((m = flightRe.exec(upper)) !== null) flights.push(`${m[1]}${m[2]}`);

    // Cabine
    let cabin: ExtractedField | null = null;
    for (const [key, val] of Object.entries(CABIN_MAP)) {
        if (upper.includes(key)) {
            cabin = field(val, 0.8, key, 'cabin_keyword');
            break;
        }
    }

    for (let i = 0; i < routes.length; i++) {
        const [orig, dest] = routes[i];
        const rawDate = dateMatches[i] || dateMatches[0] || null;
        const isoDate = rawDate ? normDate(rawDate) : null;
        const rawTime = timeMatches[i] || timeMatches[0] || null;
        const normT = rawTime ? normTime(rawTime) : null;

        segments.push({
            origin:       field(orig, 0.9, orig, 'iata_route'),
            destination:  field(dest, 0.9, dest, 'iata_route'),
            date:         isoDate ? field(isoDate, 0.85, rawDate!, 'date_near_route') : null,
            time:         normT ? field(normT, 0.8, rawTime!, 'time_near_route') : null,
            flightNumber: flights[i] ? field(flights[i], 0.8, flights[i], 'flight_number') : null,
            cabin,
        });
    }

    // Se não achou rota mas há IATAs soltos
    if (segments.length === 0) {
        const singleIATA = /\b([A-Z]{3})\b/g;
        const found: string[] = [];
        while ((m = singleIATA.exec(upper)) !== null) {
            if (isValidIATA(m[1]) && !found.includes(m[1])) found.push(m[1]);
        }
        if (found.length >= 2) {
            const rawDate = dateMatches[0] || null;
            const isoDate = rawDate ? normDate(rawDate) : null;
            segments.push({
                origin:       field(found[0], 0.6, found[0], 'iata_isolated'),
                destination:  field(found[1], 0.6, found[1], 'iata_isolated'),
                date:         isoDate ? field(isoDate, 0.7, rawDate!, 'date_isolated') : null,
                time:         null,
                flightNumber: null,
                cabin:        null,
            });
        }
    }

    return segments;
}

function extractPassengers(text: string): PassengerEntity[] {
    const upper = text.toUpperCase();
    const passengers: PassengerEntity[] = [];

    // DOB patterns: "nascimento", "date of birth", "dob", "born"
    const dobContextRe = /(?:nasc(?:imento)?|date\s+of\s+birth|dob|born)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi;
    const dobs: string[] = [];
    let dm: RegExpExecArray | null;
    while ((dm = dobContextRe.exec(text)) !== null) dobs.push(dm[1]);

    // Passaporte patterns
    const passportRe = /(?:passport(?:\s*(?:no|number|num))?|passaporte)[:\s#]+([A-Z]{1,2}\d{6,9})\b/gi;
    const passports: string[] = [];
    while ((dm = passportRe.exec(upper)) !== null) passports.push(dm[1]);

    // Idade
    const ageRe = /\b(\d{1,2})\s*(?:anos?|years?\s*old|yo)\b/gi;
    const ages: number[] = [];
    while ((dm = ageRe.exec(text)) !== null) {
        const a = parseInt(dm[1]);
        if (a >= 0 && a <= 120) ages.push(a);
    }

    // Nome: 2–4 palavras em maiúsculo, pelo menos 2 chars cada, sem stopwords
    // Contexto de nome: "passenger", "name", "passageiro", "nome", "pax"
    const nameCtxRe = /(?:passenger|passageiro|nome|name|pax|traveler)[:\s]+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{2,}){1,3})/gi;
    const contextNames: string[] = [];
    while ((dm = nameCtxRe.exec(upper)) !== null) {
        const candidate = dm[1].trim();
        if (!NAME_STOPWORDS.has(candidate) && !AIRLINE_NAMES.includes(candidate)) {
            contextNames.push(candidate);
        }
    }

    // Nome sem contexto: heurística mais rigorosa
    const bareNameRe = /\b([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{3,}(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{2,}){1,3})\b/g;
    const bareNames: string[] = [];
    while ((dm = bareNameRe.exec(upper)) !== null) {
        const words = dm[1].split(/\s+/);
        const valid = words.every(w =>
            w.length >= 2 &&
            !NAME_STOPWORDS.has(w) &&
            !IATA_SET.has(w) &&
            !AIRLINE_NAMES.some(a => a.startsWith(w))
        );
        if (valid && words.length >= 2) bareNames.push(dm[1]);
    }

    const allNames = contextNames.length > 0 ? contextNames : bareNames.slice(0, 4);
    const maxPax = Math.max(allNames.length, dobs.length, passports.length, 1);

    for (let i = 0; i < maxPax; i++) {
        const rawName = allNames[i] || null;
        const nameParts = rawName ? rawName.split(/\s+/) : [];
        const isoDoB = dobs[i] ? normDate(dobs[i]) : null;

        passengers.push({
            fullName:  rawName ? field(rawName, contextNames.length > 0 ? 0.85 : 0.6, rawName, contextNames.length > 0 ? 'name_context' : 'name_heuristic') : null,
            firstName: nameParts[0] ? field(nameParts[0], 0.8, nameParts[0], 'name_first') : null,
            lastName:  nameParts.length > 1 ? field(nameParts[nameParts.length - 1], 0.8, nameParts[nameParts.length - 1], 'name_last') : null,
            dob:       isoDoB ? field(isoDoB, 0.9, dobs[i], 'dob_context') : null,
            age:       ages[i] != null ? field(ages[i], 0.75, String(ages[i]), 'age_pattern') : null,
            passport:  passports[i] ? field(passports[i], 0.9, passports[i], 'passport_context') : null,
        });
    }

    return passengers.length > 0 ? passengers : [];
}

function extractFinancial(text: string): {
    totalCash: ExtractedField<number> | null;
    totalMiles: ExtractedField<number> | null;
    taxes: ExtractedField<number> | null;
} {
    // Dinheiro: R$ 1.234,56 | USD 1,234.56 | 1.234,56 BRL
    const moneyRe = /(?:R\$|BRL|USD|EUR|€|£|US\$)\s*([\d.,]+)|([\d.,]+)\s*(?:BRL|USD|EUR|reais?|dólares?)/gi;
    const moneyVals: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = moneyRe.exec(text)) !== null) {
        const raw = m[1] || m[2];
        const n = normMoney(raw);
        if (n !== null && n > 0) moneyVals.push(n);
    }

    // Taxas explícitas
    const taxRe = /(?:taxas?|fees?|charges?)[:\s]+(R\$|USD|€)?\s*([\d.,]+)/gi;
    let taxVal: number | null = null;
    while ((m = taxRe.exec(text)) !== null) {
        const n = normMoney(m[2]);
        if (n !== null) { taxVal = n; break; }
    }

    // Total explícito
    const totalRe = /(?:total|valor total|total amount|grand total)[:\s]+(R\$|USD|€)?\s*([\d.,]+)/gi;
    let totalVal: number | null = null;
    while ((m = totalRe.exec(text)) !== null) {
        const n = normMoney(m[2]);
        if (n !== null) { totalVal = n; break; }
    }

    // Milhas
    const milesRe = /([\d.,]+)\s*([KkMm])?\s*(milhas?|miles?|pontos?|points?|pts)\b/gi;
    let milesVal: number | null = null;
    while ((m = milesRe.exec(text)) !== null) {
        const n = normMiles(m[0]);
        if (n !== null) { milesVal = n; break; }
    }

    // Heurística: maior valor em dinheiro é provavelmente o total
    const maxMoney = moneyVals.length > 0 ? Math.max(...moneyVals) : null;
    const cashTotal = totalVal ?? maxMoney;

    return {
        totalCash:  cashTotal != null ? field(cashTotal, totalVal ? 0.9 : 0.7, String(cashTotal), totalVal ? 'money_total_label' : 'money_max_heuristic') : null,
        totalMiles: milesVal != null ? field(milesVal, 0.85, String(milesVal), 'miles_pattern') : null,
        taxes:      taxVal != null ? field(taxVal, 0.85, String(taxVal), 'tax_label') : null,
    };
}

function extractMessages(text: string): { successMessages: ExtractedField[]; errorMessages: ExtractedField[] } {
    const successMessages: ExtractedField[] = [];
    const errorMessages: ExtractedField[] = [];

    for (const { re, label, weight } of SUCCESS_PATTERNS) {
        const m = text.match(re);
        if (m) successMessages.push(field(label, weight, m[0], `success_${label}`));
    }
    for (const { re, label, weight } of ERROR_PATTERNS) {
        const m = text.match(re);
        if (m) errorMessages.push(field(label, weight, m[0], `error_${label}`));
    }

    return { successMessages, errorMessages };
}

function extractPageType(text: string): ExtractedField<PageType> | null {
    let best: { type: PageType; weight: number; evidence: string } | null = null;
    for (const { re, type, weight } of PAGE_TYPE_PATTERNS) {
        const m = text.match(re);
        if (m && (!best || weight > best.weight)) {
            best = { type, weight, evidence: m[0] };
        }
    }
    if (!best) return null;
    return field(best.type, best.weight, best.evidence, `page_type_${best.type}`);
}

function extractButtons(text: string): ExtractedField[] {
    const buttons: ExtractedField[] = [];
    for (const { re, label } of BUTTON_PATTERNS) {
        const m = text.match(re);
        if (m) buttons.push(field(label, 0.8, m[0], `button_${label}`));
    }
    return buttons;
}

function extractPaxCount(text: string): ExtractedField<number> | null {
    const re = /(\d+)\s*(adult(?:o|s)?|pax|passageiro[s]?|travelers?)\b/gi;
    const m = re.exec(text);
    if (m) {
        const n = parseInt(m[1]);
        if (n >= 1 && n <= 9) return field(n, 0.85, m[0], 'pax_count_label');
    }
    return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXTRAÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function extractEntities(text: string): ExtractedEntities {
    const { successMessages, errorMessages } = extractMessages(text);
    const { totalCash, totalMiles, taxes } = extractFinancial(text);

    return {
        passengers:      extractPassengers(text),
        segments:        extractSegments(text),
        airline:         extractAirline(text),
        pax_count:       extractPaxCount(text),
        pnr:             extractPNR(text),
        ticketNumber:    extractTicketNumber(text),
        bookingRef:      null, // pode ser extendido com regras específicas por cia
        totalCash,
        totalMiles,
        taxes,
        successMessages,
        errorMessages,
        pageType:        extractPageType(text),
        buttons:         extractButtons(text),
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// MÁQUINA DE ESTADOS — SCORING
// ══════════════════════════════════════════════════════════════════════════════

function buildSignals(e: ExtractedEntities, rawText: string): StateSignal[] {
    const signals: StateSignal[] = [];
    const hasName     = e.passengers.some(p => p.fullName != null);
    const hasRoute    = e.segments.length > 0;
    const hasDate     = e.segments.some(s => s.date != null);
    const hasPNR      = e.pnr != null;
    const hasTicket   = e.ticketNumber != null;
    const hasSuccess  = e.successMessages.length > 0;
    const hasError    = e.errorMessages.length > 0;
    const pageType    = e.pageType?.value ?? 'unknown';
    const hasEmitBtn  = e.buttons.some(b => b.value === 'emit');
    const hasPayBtn   = e.buttons.some(b => b.value === 'pay');
    const hasConfirmBtn = e.buttons.some(b => b.value === 'confirm');
    const hasSearchBtn  = e.buttons.some(b => b.value === 'search');
    const hasSelectBtn  = e.buttons.some(b => b.value === 'select_flight');
    const hasCancelBtn  = e.buttons.some(b => b.value === 'cancel');
    const successLabels = e.successMessages.map(s => s.value);
    const errorLabels   = e.errorMessages.map(s => s.value);

    const s = (key: string, desc: string, weight: number, state: OperationState, found: boolean, evidence?: string) =>
        signals.push({ key, description: desc, weight, state, found, evidence });

    // ── EMITIDA COM SUCESSO
    s('ticket_number_present',    'Número de bilhete (ticket) encontrado',                 1.0,  'emitida_com_sucesso',       hasTicket,   e.ticketNumber?.evidence);
    s('success_ticket_issued',    'Mensagem "bilhete emitido / ticket issued"',             0.95, 'emitida_com_sucesso',       successLabels.includes('ticket_issued') || successLabels.includes('ticketed'));
    s('success_purchase_complete','Mensagem "purchase complete / compra confirmada"',       0.85, 'emitida_com_sucesso',       successLabels.includes('purchase_complete') || successLabels.includes('payment_approved'));
    s('page_success',             'Página de sucesso detectada',                           0.9,  'emitida_com_sucesso',       pageType === 'success');
    s('thank_you_message',        'Mensagem de agradecimento pós-compra',                  0.7,  'emitida_com_sucesso',       successLabels.includes('thank_you') || successLabels.includes('thank_you_pt'));

    // ── RESERVA CRIADA NÃO EMITIDA
    s('pnr_without_ticket',       'PNR presente mas sem número de bilhete',                0.9,  'reserva_criada_nao_emitida', hasPNR && !hasTicket);
    s('booking_confirmed_no_ticket','Mensagem de reserva confirmada sem ticket',           0.85, 'reserva_criada_nao_emitida', (successLabels.includes('booking_confirmed') || successLabels.includes('itinerary_confirmed')) && !hasTicket);

    // ── ERRO NA EMISSÃO
    s('payment_failed',           'Falha de pagamento detectada',                          1.0,  'erro_na_emissao',           errorLabels.includes('payment_failed') || errorLabels.includes('transaction_failed') || errorLabels.includes('invalid_card'));
    s('could_not_complete',       'Mensagem de impossibilidade de conclusão',               0.9,  'erro_na_emissao',           errorLabels.includes('could_not_complete'));
    s('error_on_payment_page',    'Erro na página de pagamento',                           0.85, 'erro_na_emissao',           hasError && pageType === 'payment');
    s('session_expired',          'Sessão expirada',                                       0.8,  'erro_na_emissao',           errorLabels.includes('session_expired'));

    // ── EMISSÃO EM ANDAMENTO
    s('emit_button_visible',      'Botão de emissão visível',                              0.9,  'emissao_em_andamento',      hasEmitBtn);
    s('pnr_emit_context',         'PNR + botão emitir = processo iniciado',               0.85, 'emissao_em_andamento',      hasPNR && hasEmitBtn);

    // ── PREENCHENDO PAGAMENTO
    s('page_payment',             'Página de pagamento identificada',                      0.95, 'preenchendo_pagamento',     pageType === 'payment');
    s('pay_button',               'Botão de pagamento visível',                            0.85, 'preenchendo_pagamento',     hasPayBtn && pageType !== 'success');
    s('pnr_on_payment',           'PNR na tela de pagamento (reserva aguardando pay)',     0.8,  'preenchendo_pagamento',     hasPNR && pageType === 'payment');

    // ── CONFIRMAÇÃO FINAL
    s('page_confirmation',        'Tela de revisão/confirmação',                           0.95, 'confirmacao_final',         pageType === 'confirmation');
    s('confirm_button',           'Botão confirmar visível',                               0.8,  'confirmacao_final',         hasConfirmBtn && !hasPNR && !hasTicket);

    // ── PREENCHENDO PASSAGEIRO
    s('page_passenger',           'Página de dados do passageiro',                        0.95, 'preenchendo_passageiro',    pageType === 'passenger');
    s('dob_visible',              'Data de nascimento encontrada (formulário pax)',        0.85, 'preenchendo_passageiro',    e.passengers.some(p => p.dob != null));
    s('passport_visible',         'Número de passaporte visível',                          0.85, 'preenchendo_passageiro',    e.passengers.some(p => p.passport != null));

    // ── SELECIONANDO VOO
    s('select_button',            'Botão "selecionar voo"',                               0.85, 'selecionando_voo',          hasSelectBtn);
    s('results_with_prices',      'Resultados com preços (várias opções)',                 0.75, 'selecionando_voo',          pageType === 'results' && (e.totalCash != null || e.totalMiles != null));

    // ── OPÇÕES ENCONTRADAS
    s('page_results',             'Página de resultados de busca',                        0.9,  'opcoes_encontradas',        pageType === 'results');

    // ── BUSCA EM ANDAMENTO
    s('loading_indicator',        'Indicadores de carregamento no texto',                  0.85, 'busca_em_andamento',        /\b(aguarde|carregando|loading|searching|buscando|a processar)\b/i.test(rawText));

    // ── PRONTO PARA BUSCA
    s('full_route_and_passenger', 'Rota completa + nome de passageiro + data',             0.85, 'pronto_para_busca',         hasName && hasRoute && hasDate && !hasPNR);
    s('search_button_ready',      'Botão buscar com dados preenchidos',                    0.8,  'pronto_para_busca',         hasSearchBtn && hasRoute);

    // ── DADOS INCOMPLETOS
    s('no_route',                 'Sem rota identificada',                                 0.7,  'dados_incompletos',         !hasRoute);
    s('no_name',                  'Sem nome de passageiro identificado',                   0.5,  'dados_incompletos',         !hasName);
    s('partial_data_only',        'Apenas dados parciais (sem PNR, sem rota completa)',    0.6,  'dados_incompletos',         !hasRoute && !hasPNR && !hasTicket);

    // ── PEDIDO RECEBIDO
    s('name_or_route_no_pnr',     'Nome ou rota, sem PNR, sem ticket',                    0.6,  'pedido_recebido',           (hasName || hasRoute) && !hasPNR && !hasTicket);

    // ── CANCELADA
    s('cancel_keyword',           'Texto de cancelamento/void detectado',                  0.95, 'cancelada',                /\b(cancelad[oa]|canceled|cancelled|void(?:ed)?)\b/i.test(rawText));
    s('cancel_button_prominent',  'Apenas botão cancelar visível (sem outros CTAs)',       0.7,  'cancelada',                hasCancelBtn && !hasEmitBtn && !hasPayBtn && !hasConfirmBtn);

    return signals;
}

function scoreStates(signals: StateSignal[]): Map<OperationState, number> {
    const scores = new Map<OperationState, number>();
    for (const sig of signals) {
        if (!sig.found) continue;
        const cur = scores.get(sig.state) ?? 0;
        scores.set(sig.state, cur + sig.weight);
    }
    return scores;
}

// ══════════════════════════════════════════════════════════════════════════════
// INFERÊNCIA DE ESTADO
// ══════════════════════════════════════════════════════════════════════════════

export function inferState(e: ExtractedEntities, rawText = ''): StateResult {
    const signals = buildSignals(e, rawText);
    const scores  = scoreStates(signals);

    // Ordenar estados por score
    const ranked = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0) {
        return {
            state: 'estado_desconhecido',
            confidence: 0,
            signals,
            ambiguities: ['Nenhum sinal identificado no texto'],
            missingFields: missingFields(e),
            explanation: 'Sem dados suficientes para classificar o estado.',
        };
    }

    const [topState, topScore] = ranked[0];
    const [secondState, secondScore] = ranked[1] ?? [null, 0];

    // Normalizar confiança: score / maxPossível para aquele estado
    const maxScore = signals.filter(s => s.state === topState).reduce((a, b) => a + b.weight, 0) || 1;
    const confidence = Math.min(topScore / maxScore, 0.99);

    // Ambiguidade: gap pequeno entre top-1 e top-2
    const ambiguities: string[] = [];
    if (secondState && (topScore - secondScore) < 0.3) {
        ambiguities.push(`Ambiguidade entre "${topState}" e "${secondState}" (gap: ${(topScore - secondScore).toFixed(2)})`);
    }

    // Regras de negócio obrigatórias (não chute)
    let finalState = topState;

    // Nunca classifica emitida_com_sucesso sem ticket number
    if (finalState === 'emitida_com_sucesso' && !e.ticketNumber) {
        finalState = 'reserva_criada_nao_emitida';
        ambiguities.push('Reclassificado de "emitida" para "reserva_nao_emitida": ausência de número de bilhete');
    }

    // Se PNR + sucesso sem ticket → reserva, não emissão
    if (finalState === 'emitida_com_sucesso' && e.pnr && !e.ticketNumber) {
        finalState = 'reserva_criada_nao_emitida';
    }

    // Se erro claro, não pode ser sucesso
    if (finalState === 'emitida_com_sucesso' && e.errorMessages.length > 0) {
        finalState = 'erro_na_emissao';
        ambiguities.push('Erro detectado junto com sinais de sucesso — priorizando erro');
    }

    const activeSigs = signals.filter(s => s.found && s.state === finalState);
    const explanation = activeSigs.length > 0
        ? activeSigs.map(s => `[${s.key}] ${s.description}`).join(' · ')
        : 'Classificação por eliminação de outros estados.';

    return {
        state: finalState,
        confidence,
        signals,
        ambiguities,
        missingFields: missingFields(e),
        explanation,
    };
}

function missingFields(e: ExtractedEntities): string[] {
    const missing: string[] = [];
    if (e.passengers.length === 0 || !e.passengers[0].fullName) missing.push('nome do passageiro');
    if (e.segments.length === 0) missing.push('rota (origem/destino)');
    if (!e.segments.some(s => s.date)) missing.push('data do voo');
    if (!e.pnr) missing.push('PNR/localizador');
    if (!e.ticketNumber) missing.push('número do bilhete');
    return missing;
}

// ══════════════════════════════════════════════════════════════════════════════
// PONTO DE ENTRADA
// ══════════════════════════════════════════════════════════════════════════════

export function analyzeScreen(text: string): ScreenAnalysis {
    const entities = extractEntities(text);
    const state    = inferState(entities, text);
    return {
        entities,
        state,
        rawText:     text,
        analyzedAt:  new Date().toISOString(),
    };
}

// Labels e cores para UI
export const STATE_META: Record<OperationState, { label: string; color: string; icon: string }> = {
    pedido_recebido:         { label: 'Pedido Recebido',         color: 'text-blue-400',    icon: 'inbox' },
    dados_incompletos:       { label: 'Dados Incompletos',       color: 'text-orange-400',  icon: 'warning' },
    pronto_para_busca:       { label: 'Pronto p/ Busca',         color: 'text-cyan-400',    icon: 'search' },
    busca_em_andamento:      { label: 'Buscando…',               color: 'text-cyan-300',    icon: 'sync' },
    opcoes_encontradas:      { label: 'Opções Encontradas',      color: 'text-indigo-400',  icon: 'format_list_bulleted' },
    selecionando_voo:        { label: 'Selecionando Voo',        color: 'text-violet-400',  icon: 'airplane_ticket' },
    preenchendo_passageiro:  { label: 'Dados do Passageiro',     color: 'text-amber-400',   icon: 'person' },
    preenchendo_pagamento:   { label: 'Pagamento',               color: 'text-yellow-400',  icon: 'payment' },
    confirmacao_final:       { label: 'Confirmação Final',       color: 'text-lime-400',    icon: 'fact_check' },
    emissao_em_andamento:    { label: 'Emitindo…',               color: 'text-emerald-300', icon: 'pending' },
    emitida_com_sucesso:     { label: 'Emitida ✓',               color: 'text-emerald-400', icon: 'check_circle' },
    erro_na_emissao:         { label: 'Erro na Emissão',         color: 'text-red-400',     icon: 'error' },
    reserva_criada_nao_emitida: { label: 'Reserva (não emitida)', color: 'text-purple-400', icon: 'bookmark' },
    cancelada:               { label: 'Cancelada',               color: 'text-rose-500',    icon: 'cancel' },
    estado_desconhecido:     { label: 'Desconhecido',            color: 'text-white/30',    icon: 'help' },
};
