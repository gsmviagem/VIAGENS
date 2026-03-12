import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

export interface BookingData {
    locator: string;
    passengerName: string;
    origin: string;
    destination: string;
    originCity: string;
    destinationCity: string;
    flightDate: string;
    departureTime: string;
    arrivalTime: string;
    operatingAirline: string;
    flightType: string; // Voo direto / Parada
    milesUsed: number;
    cashPaid: number;
    taxes: number;
    cabinClass: string;
    flightNumber: string;
}

interface AzulExtractionOptions {
    cpf: string;
    password: string;
    accountId?: string;
}

export class AzulScraper {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    private log(msg: string) {
        console.log(`[AZUL ${new Date().toISOString()}] ${msg}`);
    }

    async init() {
        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ]
        });
        this.context = await this.browser.newContext({
            userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
            viewport: { width: 1366, height: 768 },
            locale: 'pt-BR',
        });

        // Remove webdriver fingerprint
        await this.context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
    }

    async extract(options: AzulExtractionOptions): Promise<{ success: boolean; count?: number; bookings?: BookingData[]; message?: string; error?: string }> {
        if (!this.context) await this.init();
        const page = await this.context!.newPage();

        try {
            this.log(`Starting extraction for CPF: ${options.cpf}`);

            // ─── 1. Login ────────────────────────────────────────────────────
            // Azul Pelo Mundo — international awards booking portal
            await page.goto('https://azulpelomundo.voeazul.com.br/pt/my-bookings', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait for page to load and check if login is needed
            await page.waitForTimeout(3000);

            const isLoggedIn = await page.$('.pnr-card, .reservas-list, [class*="reserva"]').then(el => !!el).catch(() => false);

            if (!isLoggedIn) {
                this.log('Not logged in – starting login flow on Azul Pelo Mundo');

                // Click login / entrar button in header or modal
                const loginSelectors = [
                    // Azul Pelo Mundo uses a TudoAzul login modal
                    'button:has-text("Login")',
                    'a:has-text("Login")',
                    'button:has-text("Entrar")',
                    'a:has-text("Entrar")',
                    '[class*="login"]',
                    '[data-testid="login-btn"]',
                    '[aria-label*="login"]',
                ];

                let loginClicked = false;
                for (const sel of loginSelectors) {
                    try {
                        const el = await page.waitForSelector(sel, { timeout: 3000 });
                        if (el) { await el.click(); loginClicked = true; break; }
                    } catch { continue; }
                }

                if (!loginClicked) {
                    // Try direct login URL for Azul Pelo Mundo
                    await page.goto('https://azulpelomundo.voeazul.com.br/pt/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
                }

                await page.waitForTimeout(2000);

                // Fill CPF field
                const cpfSelectors = [
                    // Azul Pelo Mundo / TudoAzul login fields
                    'input[name="cpf"]',
                    'input[placeholder*="CPF"]',
                    'input[placeholder*="cpf"]',
                    'input[id*="cpf"]',
                    'input[id*="login"]',
                    'input[id*="username"]',
                    'input[type="text"]:first-of-type',
                    '#username',
                ];

                let cpfFilled = false;
                for (const sel of cpfSelectors) {
                    try {
                        await page.waitForSelector(sel, { timeout: 3000 });
                        await page.fill(sel, options.cpf);
                        cpfFilled = true;
                        this.log(`CPF filled with selector: ${sel}`);
                        break;
                    } catch { continue; }
                }

                if (!cpfFilled) throw new Error('Could not find CPF input field on login page');

                await page.waitForTimeout(500);

                // Fill password field
                const passSelectors = [
                    'input[name="password"]',
                    'input[type="password"]',
                    'input[placeholder*="senha"]',
                    'input[placeholder*="Senha"]',
                    '#password',
                ];

                let passFilled = false;
                for (const sel of passSelectors) {
                    try {
                        await page.waitForSelector(sel, { timeout: 3000 });
                        await page.fill(sel, options.password);
                        passFilled = true;
                        this.log(`Password filled with selector: ${sel}`);
                        break;
                    } catch { continue; }
                }

                if (!passFilled) throw new Error('Could not find password input field on login page');

                await page.waitForTimeout(500 + Math.random() * 500);

                // Click submit
                const submitSelectors = [
                    'button[type="submit"]',
                    'button:has-text("Entrar")',
                    'button:has-text("Login")',
                    'input[type="submit"]',
                    '.btn-entrar',
                ];

                for (const sel of submitSelectors) {
                    try {
                        await page.waitForSelector(sel, { timeout: 3000 });
                        await page.click(sel);
                        this.log(`Login submitted with selector: ${sel}`);
                        break;
                    } catch { continue; }
                }

                // Wait for navigation after login
                await page.waitForTimeout(5000);

                // Navigate to Minhas Reservas on Azul Pelo Mundo
                const currentUrl = page.url();
                if (!currentUrl.includes('my-bookings') && !currentUrl.includes('booking')) {
                    await page.goto('https://azulpelomundo.voeazul.com.br/pt/my-bookings', {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    await page.waitForTimeout(4000);
                }
            } else {
                this.log('Already on reservations page');
            }

            // ─── 2. List all reservations ────────────────────────────────────
            // Wait for the reservations list to load
            await page.waitForTimeout(3000);

            const locators = await this.getAllLocators(page);
            this.log(`Found ${locators.length} reservations on this page`);

            if (locators.length === 0) {
                return { success: true, count: 0, bookings: [], message: 'Nenhuma viagem encontrada para esta conta.' };
            }

            // ─── 3. Extract details for each booking ─────────────────────────
            const allBookings: BookingData[] = [];

            for (let i = 0; i < locators.length; i++) {
                const loc = locators[i];
                this.log(`Processing ${i + 1}/${locators.length}: ${loc}`);

                const bookingData = await this.extractBookingDetails(page, loc, options.accountId);
                if (bookingData) {
                    allBookings.push(bookingData);
                }

                // Small delay between requests to avoid rate limiting
                await page.waitForTimeout(1500 + Math.random() * 1000);
            }

            // ─── 4. Save to Supabase ─────────────────────────────────────────
            let savedCount = 0;
            for (const booking of allBookings) {
                const saved = await this.saveBooking(booking, options.accountId);
                if (saved) savedCount++;
            }

            return {
                success: true,
                count: savedCount,
                bookings: allBookings,
                message: `Capturadas ${savedCount} de ${allBookings.length} emissões.`
            };

        } catch (error: any) {
            this.log(`Extraction failed: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            await page.close();
            if (this.browser) await this.browser.close();
        }
    }

    private async getAllLocators(page: Page): Promise<string[]> {
        return page.evaluate(() => {
            const locators: string[] = [];

            // Multiple patterns to find locator codes
            const patterns = [
                // "Localizador: C7YAIS" text pattern
                ...Array.from(document.querySelectorAll('*')).filter(el => {
                    const text = el.textContent ?? '';
                    return text.match(/Localizador:\s*([A-Z0-9]{5,8})/) && el.children.length < 3;
                }),
            ];

            for (const el of patterns) {
                const match = (el.textContent ?? '').match(/Localizador:\s*([A-Z0-9]{5,8})/);
                if (match && !locators.includes(match[1])) {
                    locators.push(match[1]);
                }
            }

            // Also check for data attributes
            document.querySelectorAll('[data-locator], [data-pnr], .pnr-code, .localizador').forEach(el => {
                const code = el.getAttribute('data-locator') ?? el.getAttribute('data-pnr') ?? el.textContent?.trim() ?? '';
                if (code.match(/^[A-Z0-9]{5,8}$/) && !locators.includes(code)) {
                    locators.push(code);
                }
            });

            return locators;
        });
    }

    private async extractBookingDetails(page: Page, locator: string, accountId?: string): Promise<BookingData | null> {
        try {
            // Find and click "Ver detalhes" for this specific locator
            const clicked = await page.evaluate((loc) => {
                // Find all elements containing the locator text
                const allElements = Array.from(document.querySelectorAll('*'));
                for (const el of allElements) {
                    if ((el.textContent ?? '').includes(loc) && (el.textContent ?? '').includes('Localizador')) {
                        // Look for a "Ver detalhes" button nearby (parent card)
                        const card = el.closest('[class*="reserva"], [class*="pnr"], [class*="booking"], article, .card') as HTMLElement;
                        if (card) {
                            const btn = card.querySelector('a:last-of-type, button:last-of-type, a[href*="detalhe"], a[href*="detail"]') as HTMLElement;
                            if (btn) { btn.click(); return true; }
                        }
                        // Try clicking "Ver detalhes" text anywhere in the card
                        const detailsBtn = Array.from(document.querySelectorAll('a, button')).find(b =>
                            (b.textContent ?? '').toLowerCase().includes('ver detalhe') ||
                            (b.textContent ?? '').toLowerCase().includes('detalhes')
                        ) as HTMLElement | undefined;
                        if (detailsBtn) { detailsBtn.click(); return true; }
                    }
                }
                return false;
            }, locator);

            if (!clicked) {
                // Fallback: try clicking the button directly by text near the locator
                await page.click(`text="Ver detalhes"`, { timeout: 5000 }).catch(() => {});
            }

            await page.waitForTimeout(4000);

            // ─── Extract all details from the details page ──────────────────
            const data = await page.evaluate((loc) => {
                const text = (el: Element | null) => el?.textContent?.trim() ?? '';
                const attr = (el: Element | null, a: string) => el?.getAttribute(a)?.trim() ?? '';

                // Passenger name — usually shown as "Passageiro" or in a profile section
                const passengerEl = document.querySelector(
                    '[class*="passenger"], [class*="passageiro"], .nome-passageiro, [data-passenger]'
                ) ?? Array.from(document.querySelectorAll('*')).find(e =>
                    /Passageiro[:\s]+([A-ZÁÉÍÓÚÃÕ\s]+)/i.test(e.textContent ?? '') && (e.children.length ?? 0) < 3
                ) ?? null;

                const passengerMatch = text(passengerEl).match(/Passageiro[:\s]+([A-ZÁÉÍÓÚÃÕ\s]+)/i);
                const passengerName = passengerMatch ? passengerMatch[1].trim() : 'N/A';

                // IATA codes — appear as large text next to cities e.g. "SXM" "PTY"
                const iataPattern = /\b([A-Z]{3})\b/g;
                const pageText = document.body.innerText;
                const iataMatches = pageText.match(iataPattern) ?? [];
                const airports = iataMatches.filter(code => code.length === 3 && code !== 'N/A');

                // Flight date
                const dateEl = document.querySelector('[class*="date"], [class*="data"], time') ??
                    Array.from(document.querySelectorAll('*')).find(e => /\d{1,2}\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+20\d{2}/i.test(e.textContent ?? ''));
                const flightDate = text(dateEl);

                // Times
                const timePattern = /\b(\d{2}:\d{2})\b/g;
                const times = pageText.match(timePattern) ?? [];

                // Points / Miles
                const pointsEl = document.querySelector('[class*="pontos"], [class*="miles"], [class*="points"], [class*="milhas"]');
                const pointsMatch = (text(pointsEl) || pageText).match(/(\d[\d.,]+)\s*(pontos|milhas|pts)/i);
                const milesUsed = pointsMatch ? parseInt(pointsMatch[1].replace(/[.,]/g, '').replace(',', '')) : 0;

                // Cabin class
                const cabinEl = document.querySelector('[class*="cabin"], [class*="classe"], [class*="class"]');
                const cabinText = text(cabinEl) || '';
                const cabinMatch = pageText.match(/Classe\s+(Executiva|Econômica|Business|Economy|Premium)/i);
                const cabinClass = cabinMatch ? cabinMatch[1] : (cabinText || 'N/A');

                // Operating airline
                const airlineEl = document.querySelector('[class*="airline"], [class*="companhia"], [alt*="Airlines"], img[alt]');
                const operatingAirline = attr(airlineEl, 'alt') || text(airlineEl) || 'Azul';

                // Flight number
                const flightNumMatch = pageText.match(/voo\s+([A-Z]{2}\d{3,4})/i) ?? pageText.match(/([A-Z]{2}\s*\d{3,4})/);
                const flightNumber = flightNumMatch ? flightNumMatch[1] : '';

                // Flight type (direto vs parada)
                const flightType = pageText.toLowerCase().includes('direto') ? 'Voo direto' : 'Conexão';

                // Taxes
                const taxMatch = pageText.match(/taxa[s]?[:\s]*R?\$?\s*([\d,.]+)/i);
                const taxes = taxMatch ? parseFloat(taxMatch[1].replace('.', '').replace(',', '.')) : 0;

                return {
                    locator: loc,
                    passengerName,
                    origin: airports[0] ?? 'N/A',
                    destination: airports[1] ?? 'N/A',
                    originCity: '',
                    destinationCity: '',
                    flightDate,
                    departureTime: times[0] ?? '',
                    arrivalTime: times[1] ?? '',
                    operatingAirline: operatingAirline.replace(/^airlines?\s*/i, '').trim() || 'Azul',
                    flightType,
                    milesUsed,
                    cashPaid: 0,
                    taxes,
                    cabinClass,
                    flightNumber,
                };
            }, locator);

            // Go back to the Azul Pelo Mundo bookings list
            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async () => {
                await page.goto('https://azulpelomundo.voeazul.com.br/pt/my-bookings', { waitUntil: 'domcontentloaded' });
            });
            await page.waitForTimeout(2500);

            return data;

        } catch (err: any) {
            this.log(`Failed to extract details for ${locator}: ${err.message}`);
            // Try to navigate back to Azul Pelo Mundo bookings
            await page.goto('https://azulpelomundo.voeazul.com.br/pt/my-bookings', {
                waitUntil: 'domcontentloaded', timeout: 15000
            }).catch(() => {});
            await page.waitForTimeout(2000);
            return null;
        }
    }

    private async saveBooking(booking: BookingData, accountId?: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('extracted_bookings')
                .upsert({
                    airline: 'Azul',
                    account_id: accountId ?? null,
                    locator: booking.locator,
                    passenger_name: booking.passengerName,
                    origin: booking.origin,
                    destination: booking.destination,
                    flight_date: booking.flightDate || new Date().toISOString().split('T')[0],
                    miles_used: booking.milesUsed,
                    cash_paid: booking.cashPaid,
                    taxes: booking.taxes,
                    status: 'synced',
                    source: `${booking.operatingAirline} ${booking.flightNumber}`.trim(),
                    notes: `${booking.cabinClass} | ${booking.flightType} | ${booking.departureTime}→${booking.arrivalTime}`,
                }, { onConflict: 'airline,locator' });

            if (error) {
                this.log(`DB error for ${booking.locator}: ${error.message}`);
                return false;
            }

            this.log(`Saved: ${booking.locator} (${booking.origin}→${booking.destination} ${booking.flightDate})`);
            return true;
        } catch (err: any) {
            this.log(`Save failed for ${booking.locator}: ${err.message}`);
            return false;
        }
    }
}
