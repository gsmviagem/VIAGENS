import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
import chromiumMin from '@sparticuz/chromium-min';

const BASE = 'https://azulpelomundo.voeazul.com.br';

export interface BookingData {
    locator: string;
    passengerName: string;
    passengerTicket: string;
    origin: string;
    destination: string;
    flightDate: string;
    departureTime: string;
    arrivalTime: string;
    operatingAirline: string;
    flightNumber: string;
    flightCategory: string;
    isRoundTrip: boolean;
    returnDate?: string;
    returnOrigin?: string;
    returnDestination?: string;
    returnDepartureTime?: string;
    returnArrivalTime?: string;
    milesUsed: number;
    cashPaid: number;
    paymentCard: string;
    status: string;
}

export class AzulScraper {
    private supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    private log(msg: string) { console.log(`[AZUL ${new Date().toISOString()}] ${msg}`); }

    async extract(options: { cpf: string; password: string; accountId?: string }): Promise<{ success: boolean; count?: number; bookings?: BookingData[]; message?: string; error?: string }> {
        const isVercel = !!process.env.VERCEL;
        const browser = await chromium.launch({
            args: isVercel ? chromiumMin.args : ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: isVercel ? await chromiumMin.executablePath('https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.tar') : undefined,
            headless: true,
        });

        try {
            this.log(`Iniciando browser para CPF: ${options.cpf}`);
            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            });
            const page = await context.newPage();

            // Carrega homepage para Dynatrace/Akamai configurar cookies anti-bot
            this.log('Carregando homepage...');
            await page.goto(`${BASE}/pt/home`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            // Login via fetch dentro do browser (usa cookies do browser)
            this.log('Fazendo login...');
            const loginResult = await page.evaluate(async ({ base, cpf, password }) => {
                const res = await fetch(`${base}/platform-session/api/v1/login/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerLogin: { login: cpf, password } }),
                    credentials: 'include',
                });
                if (!res.ok) throw new Error(`Login falhou: ${res.status}`);
                return res.json();
            }, { base: BASE, cpf: options.cpf, password: options.password });

            this.log(`Login OK — ${loginResult.firstName ?? ''} ${loginResult.lastName ?? ''}`);

            // Pequena pausa para cookies de sessão assentarem
            await page.waitForTimeout(1500);

            // Busca emissões dentro do browser com a sessão ativa
            this.log('Buscando emissões...');
            const rawBookings: any[] = await page.evaluate(async ({ base, cpf }) => {
                const res = await fetch(`${base}/checkout/api/v2/booking/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                        'Accept': 'application/json, text/plain, */*',
                        'Referer': `${base}/searchResult`,
                    },
                    body: JSON.stringify({ items: { cpfOrTa: cpf, pnr: '' } }),
                    credentials: 'include',
                });
                if (!res.ok) throw new Error(`Booking search falhou: ${res.status}`);
                return res.json();
            }, { base: BASE, cpf: options.cpf });

            this.log(`${rawBookings.length} emissões encontradas`);

            const bookings: BookingData[] = rawBookings.map(b => {
                const item = b.cart?.items?.[0] ?? {};
                const dep = item.departureFlight ?? {};
                const ret = item.returnFlight ?? null;
                const fg = dep.flightGroup?.[0] ?? {};
                const totals: any[] = b.cart?.total ?? [];
                const miles = totals.find((t: any) => t.currency === 'POINTS')?.value ?? 0;
                const cash = totals.find((t: any) => t.currency === 'BRL')?.value ?? 0;
                const pax = b.passengers?.[0] ?? {};

                return {
                    locator: b.pnrNumber,
                    passengerName: `${pax.name ?? ''} ${pax.lastName ?? ''}`.trim(),
                    passengerTicket: pax.ticketNumber ?? '',
                    origin: item.origin ?? '',
                    destination: item.destination ?? '',
                    flightDate: dep.departureDate ?? '',
                    departureTime: dep.departureTime ?? '',
                    arrivalTime: dep.finalArrivalTime ?? '',
                    operatingAirline: fg.operatingCarrier ?? '',
                    flightNumber: String(fg.flightNumber ?? ''),
                    flightCategory: dep.category ?? '',
                    isRoundTrip: !!ret,
                    returnDate: ret?.departureDate,
                    returnOrigin: ret?.originAirport,
                    returnDestination: ret?.finalDestination,
                    returnDepartureTime: ret?.departureTime,
                    returnArrivalTime: ret?.finalArrivalTime,
                    milesUsed: miles,
                    cashPaid: cash,
                    paymentCard: b.payment?.items?.[0]?.vendorCode ?? '',
                    status: b.statusAntiFraud ?? b.status ?? '',
                };
            });

            let saved = 0;
            for (const bk of bookings) {
                if (await this.saveBooking(bk, options.accountId)) saved++;
            }

            return { success: true, count: saved, bookings, message: `${saved} de ${bookings.length} emissões salvas.` };

        } catch (err: any) {
            this.log(`Erro: ${err.message}`);
            return { success: false, error: err.message };
        } finally {
            await browser.close();
        }
    }

    async saveBookingPublic(booking: BookingData, accountId?: string): Promise<boolean> {
        return this.saveBooking(booking, accountId);
    }

    private async saveBooking(booking: BookingData, accountId?: string): Promise<boolean> {
        try {
            const { error } = await this.supabase.from('extracted_bookings').upsert({
                airline: booking.operatingAirline || 'Azul',
                locator: booking.locator,
                passenger_name: booking.passengerName,
                origin: booking.origin,
                destination: booking.destination,
                flight_date: booking.flightDate,
                miles_used: booking.milesUsed,
                cash_paid: booking.cashPaid,
                taxes: booking.cashPaid,
                status: 'synced',
                source: `${booking.operatingAirline} ${booking.flightNumber}`.trim(),
                notes: [booking.flightCategory, `${booking.departureTime}→${booking.arrivalTime}`, booking.isRoundTrip ? `Volta: ${booking.returnDate} ${booking.returnOrigin}→${booking.returnDestination}` : 'Só ida', booking.passengerTicket, booking.status].filter(Boolean).join(' | '),
            }, { onConflict: 'airline,locator' });

            if (error) { this.log(`DB error ${booking.locator}: ${JSON.stringify(error)}`); return false; }
            return true;
        } catch (err: any) {
            this.log(`Save failed: ${err.message}`);
            return false;
        }
    }
}
