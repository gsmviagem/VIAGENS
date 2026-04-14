import { NextRequest, NextResponse } from 'next/server';
import { searchBuscaIdeal } from '@/connectors/quotation/busca-ideal-fetch';

const cache = new Map<string, { data: object; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
    if (entry.count >= 10) return false;
    entry.count++;
    return true;
}

function normalizeDate(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const parts = date.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return date;
}

export async function POST(req: NextRequest) {
    try {
        const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ success: false, error: 'Muitas requisições. Aguarde 1 minuto.' }, { status: 429 });
        }

        const body = await req.json();
        const origin: string = String(body.origin ?? '').trim().toUpperCase();
        const destination: string = String(body.destination ?? '').trim().toUpperCase();
        const passengers: number = Number(body.passengers) || 1;

        if (!origin || !destination || !body.date) {
            return NextResponse.json({ success: false, error: 'Origem, destino e data são obrigatórios' }, { status: 400 });
        }
        if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
            return NextResponse.json({ success: false, error: 'Códigos IATA inválidos (ex: GRU, GIG)' }, { status: 400 });
        }

        const dateISO = normalizeDate(String(body.date));
        const cacheKey = `${origin}-${destination}-${dateISO}-${passengers}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return NextResponse.json({ ...cached.data, cached: true });
        }

        const result = await searchBuscaIdeal(origin, destination, dateISO, passengers);

        if (result.success) {
            cache.set(cacheKey, { data: result, ts: Date.now() });
            if (cache.size > 100) {
                const now = Date.now();
                for (const [k, v] of cache.entries()) {
                    if (now - v.ts > CACHE_TTL) cache.delete(k);
                }
            }
        }

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API/BUSCA-IDEAL]', e.message);
        return NextResponse.json({ success: false, error: e?.message ?? 'Erro interno' }, { status: 500 });
    }
}
