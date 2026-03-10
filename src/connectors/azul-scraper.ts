import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Stealth configurations inspired by Apify and Playwright Stealth
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

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
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async init() {
        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        this.context = await this.browser.newContext({
            userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
            viewport: { width: 1280, height: 720 },
        });
    }

    async extract(options: AzulExtractionOptions) {
        if (!this.context) await this.init();
        const page = await this.context!.newPage();

        try {
            console.log(`[AZUL] Executing real extraction for CPF: ${options.cpf}`);

            // 1. Navigate to International portal
            await page.goto('https://azulpelomundo.voeazul.com.br/pt/home', { waitUntil: 'networkidle', timeout: 60000 });

            // 2. Click on "Minhas Viagens"
            const consultarBtn = await page.waitForSelector('button#consultar-pnr', { timeout: 15000 });
            await consultarBtn.click();
            await page.waitForTimeout(2000);

            // 3. Login Flow
            // Note: Selectors might vary based on dynamic id generation (observed 'undefined_loginField' in initial exploration)
            await page.fill('input[placeholder*="CPF"], input#undefined_loginField', options.cpf);
            await page.fill('input[placeholder*="Senha"], input#undefined_passwordField', options.password);

            await page.waitForTimeout(1000 + Math.random() * 1000);

            // Click Entrar - Using text selector as fallback
            await page.click('button:has-text("Entrar"), .Login__button');

            // 4. Wait for dashboard / "Meus Voos"
            // We expect to find trip cards or a specific post-login element
            await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

            // 5. Scrape list of reservations
            // Based on target site structure, we look for elements with trip info
            const reservations = await page.$$eval('.trip-card, .reservation-item', (cards) => {
                return cards.map(card => {
                    const locator = card.querySelector('.locator-code, .pnr-code')?.textContent?.trim() || '';
                    return { locator };
                });
            });

            if (reservations.length === 0) {
                console.log('[AZUL] No reservations found on dashboard.');
                return { success: true, count: 0, message: 'Nenhuma viagem encontrada para esta conta.' };
            }

            console.log(`[AZUL] Found ${reservations.length} reservations. Starting deep parsing...`);

            let capturedCount = 0;
            for (const res of reservations) {
                if (!res.locator) continue;

                const detailSuccess = await this.extractAndSaveReservationDetails(page, res.locator, options.accountId);
                if (detailSuccess) capturedCount++;
            }

            return { success: true, count: capturedCount, message: `Capturadas ${capturedCount} emissões com sucesso.` };

        } catch (error: any) {
            console.error('[AZUL] Real extraction failed:', error.message);
            return { success: false, error: error.message };
        } finally {
            await page.close();
            if (this.browser) await this.browser.close();
        }
    }

    private async extractAndSaveReservationDetails(page: Page, locator: string, accountId?: string) {
        try {
            console.log(`[AZUL] Parsing details for: ${locator}`);

            // Logic to click 'Details' for specifically this locator
            // This usually involves finding the card with this locator and clicking its button
            await page.click(`.trip-card:has-text("${locator}") button:has-text("Detalhes")`);
            await page.waitForTimeout(3000);

            // Parse the details page
            const flightData = await page.evaluate((loc) => {
                const passenger = document.querySelector('.passenger-name')?.textContent?.trim() || 'N/A';
                const origin = document.querySelector('.origin-city-code')?.textContent?.trim() || 'N/A';
                const destination = document.querySelector('.destination-city-code')?.textContent?.trim() || 'N/A';
                const date = document.querySelector('.flight-date')?.textContent?.trim() || '';
                const milesRaw = document.querySelector('.points-redeemed, .total-points')?.textContent || '0';

                return {
                    passenger_name: passenger,
                    origin: origin,
                    destination: destination,
                    flight_date: date,
                    miles_used: parseInt(milesRaw.replace(/\D/g, '')) || 0,
                    locator: loc
                };
            }, locator);

            // Persist to Supabase
            const { error } = await this.supabase
                .from('extracted_bookings')
                .upsert({
                    ...flightData,
                    airline: 'Azul',
                    account_id: accountId,
                    status: 'synced'
                }, { onConflict: 'airline,locator' });

            if (error) {
                console.error(`[AZUL] DB Error for ${locator}:`, error.message);
                return false;
            }

            // Go back to list
            await page.goBack({ waitUntil: 'networkidle' });
            return true;

        } catch (err: any) {
            console.error(`[AZUL] Error parsing locator ${locator}:`, err.message);
            return false;
        }
    }
}
