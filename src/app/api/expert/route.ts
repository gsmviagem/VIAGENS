import { NextRequest, NextResponse } from 'next/server';

const EF_BASE = 'https://www.expertflyer.com';
const RESULTS_URL = `${EF_BASE}/air/award-upgrade/results`;
// Server action ID for getFlightsAirlineAwards (extracted from EF JS chunk 8f72374701dd8375)
const ACTION_ID = '7f0cbe02bb4dd1fe1f8ad75bdc3a0c103498a17554';

function getSessionCookie(): string {
    const s0 = process.env.EF_SESSION_0?.trim();
    const s1 = process.env.EF_SESSION_1?.trim();
    if (!s0) throw new Error('Sessão não configurada — atualize EF_SESSION_0');
    const parts = [`appSession.0=${s0}`];
    if (s1) parts.push(`appSession.1=${s1}`);
    return parts.join('; ').replace(/[\r\n\t]/g, '');
}

export interface FlightResult {
    flight: string;
    departure: string;
    arrival: string;
    duration: string;
    aircraft: string;
    classes: { code: string; seats: string }[];
}

interface EFSegment {
    flightNumber?: string;
    marketingAirlineCode?: string;
    departureAirport?: string;
    arrivalAirport?: string;
    departureDateTime?: string;
    arrivalDateTime?: string;
    duration?: string | number;
    aircraftType?: string;
    bookingClassAvailability?: { code: string; availability: number; codeDescription?: string }[];
}

interface EFItinerary {
    segments?: EFSegment[];
}

interface EFDayResult {
    data?: { itineraries?: EFItinerary[] };
    itineraries?: EFItinerary[];
}

function parseRscActionResult(text: string): Record<string, unknown> | null {
    // RSC wire format: lines like "1:D{...}" or "1:{...}" contain action return value
    for (const line of text.split('\n')) {
        const match = line.match(/^\d+:D?(\{[\s\S]*)/);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed && typeof parsed === 'object' && ('searchResults' in parsed || 'error' in parsed)) {
                    return parsed;
                }
            } catch { /* keep scanning */ }
        }
    }
    // Fallback: scan for any JSON blob with searchResults
    const idx = text.indexOf('"searchResults"');
    if (idx !== -1) {
        // Find containing object boundary
        let start = idx;
        while (start > 0 && text[start] !== '{') start--;
        try {
            // Try to extract balanced JSON
            let depth = 0, end = start;
            for (let i = start; i < text.length; i++) {
                if (text[i] === '{') depth++;
                else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
            }
            return JSON.parse(text.slice(start, end + 1));
        } catch { /* ignore */ }
    }
    return null;
}

function mapItinerariesToFlights(dayResults: EFDayResult[]): FlightResult[] {
    const results: FlightResult[] = [];
    for (const day of dayResults) {
        const itineraries = day?.data?.itineraries ?? day?.itineraries ?? [];
        for (const itin of itineraries) {
            const segs = itin.segments ?? [];
            if (segs.length === 0) continue;
            const first = segs[0];
            const last = segs[segs.length - 1];
            const airline = first.marketingAirlineCode ?? 'AA';
            const flightNum = first.flightNumber ?? '';
            const depTime = first.departureDateTime?.slice(11, 16) ?? '';
            const arrTime = last.arrivalDateTime?.slice(11, 16) ?? '';
            const depAirport = first.departureAirport ?? '';
            const arrAirport = last.arrivalAirport ?? '';
            const dur = typeof first.duration === 'number'
                ? `${Math.floor(first.duration / 60)}h${String(first.duration % 60).padStart(2, '0')}`
                : String(first.duration ?? '');
            const classes = (first.bookingClassAvailability ?? []).map(c => ({
                code: c.code,
                seats: String(c.availability),
            }));
            results.push({
                flight: `${airline}${flightNum}`,
                departure: `${depAirport} ${depTime}`.trim(),
                arrival: `${arrAirport} ${arrTime}`.trim(),
                duration: dur,
                aircraft: first.aircraftType ?? '',
                classes,
            });
        }
    }
    return results;
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const depDate = searchParams.get('depDate');
    const retDate = searchParams.get('retDate');
    const classesRaw = searchParams.get('classes') || 'U';
    const direct = searchParams.get('direct') !== 'false';
    const excludeCodeshares = searchParams.get('excludeCodeshares') !== 'false';

    if (!origin || !destination || !depDate) {
        return NextResponse.json({ error: 'Parâmetros obrigatórios: origin, destination, depDate' }, { status: 400 });
    }

    try {
        const cookie = getSessionCookie();

        // Build search params matching ExpertFlyer's B object from chunk 8f72374701dd8375
        const actionArgs: Record<string, unknown> = {
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureDateTime: `${depDate}T00:00`,
            airLineCodes: ['AA'],
            excludeCodeshares,
            directAccess: false,
            connectionPreference: direct ? 'direct' : undefined,
            classFilter: classesRaw.split(',').filter(Boolean),
            resultsDisplay: 'tabbed',
            withRawXML: false,
        };
        if (retDate) {
            actionArgs.returnDateTime = `${retDate}T00:00`;
        }

        // Build the display URL (for "Ver no Site" link)
        const displayParams = new URLSearchParams({
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureDateTime: `${depDate}T00:00`,
            airLineCodes: 'AA',
            excludeCodeshares: String(excludeCodeshares),
            connectionPreference: direct ? 'direct' : 'any',
            classFilter: classesRaw,
            departureExactDate: 'exact',
            resultsDisplay: 'tabbed',
        });
        if (retDate) {
            displayParams.set('returnDateTime', `${retDate}T00:00`);
            displayParams.set('returnExactDate', 'exact');
        }
        const displayUrl = `${RESULTS_URL}?${displayParams}`;

        const res = await fetch(RESULTS_URL, {
            method: 'POST',
            headers: {
                'Cookie': cookie,
                'Next-Action': ACTION_ID,
                'Content-Type': 'application/json',
                'Accept': 'text/x-component',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
                'Referer': displayUrl,
                'Origin': EF_BASE,
                'Accept-Language': 'en-US,en;q=0.9',
            },
            body: JSON.stringify([actionArgs]),
        });

        if (res.status === 401 || res.status === 403) {
            return NextResponse.json({ error: 'Sessão expirada — atualize o cookie no Vercel' }, { status: 401 });
        }

        const text = await res.text();

        if (text.includes('/login') && res.redirected) {
            return NextResponse.json({ error: 'Sessão expirada — atualize o cookie no Vercel' }, { status: 401 });
        }

        const actionResult = parseRscActionResult(text);

        if (!actionResult) {
            return NextResponse.json({
                url: displayUrl,
                flights: [],
                debug: text.slice(0, 3000),
            });
        }

        if (actionResult.error) {
            const err = actionResult.error as Record<string, unknown>;
            return NextResponse.json({ error: err?.message || err?.details || 'Erro do ExpertFlyer' }, { status: 500 });
        }

        const sr = actionResult.searchResults as { departure?: EFDayResult[]; return?: EFDayResult[] } | undefined;
        const depFlights = mapItinerariesToFlights(sr?.departure ?? []);
        const retFlights = mapItinerariesToFlights(sr?.return ?? []);

        return NextResponse.json({
            url: displayUrl,
            flights: depFlights,
            returnFlights: retFlights.length > 0 ? retFlights : undefined,
            debug: depFlights.length === 0 ? text.slice(0, 3000) : undefined,
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
