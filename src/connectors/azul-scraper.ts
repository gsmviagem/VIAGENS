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
            headless: true, // Set to false for debugging
            args: ['--disable-blink-features=AutomationControlled']
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
            console.log(`[AZUL] Starting extraction for CPF: ${options.cpf}`);

            // 1. Navigate to International portal
            await page.goto('https://azulpelomundo.voeazul.com.br/pt/home', { waitUntil: 'networkidle' });

            // 2. Click on "Minhas Viagens" (Consultar PNR)
            await page.click('button#consultar-pnr');
            await page.waitForTimeout(1000);

            // 3. Login Flow
            await page.fill('input[placeholder*="CPF"]', options.cpf);
            await page.fill('input[placeholder*="Senha"]', options.password);

            // Human-like delay
            await page.waitForTimeout(500 + Math.random() * 1000);

            await page.click('div.Login__button, button:has-text("Entrar")');

            // 4. Wait for dashboard/redirect
            await page.waitForNavigation({ waitUntil: 'networkidle' });

            // 5. Scrape list of reservations
            const reservations = await page.$$eval('.trip-card', (cards) => {
                return cards.map(card => {
                    const locator = card.querySelector('.locator-code')?.textContent?.trim() || '';
                    return { locator };
                });
            });

            console.log(`[AZUL] Found ${reservations.length} reservations.`);

            for (const res of reservations) {
                // 6. Click Details
                // Implementation: Navigate to details or click the specific card's detail button
                await this.extractReservationDetails(page, res.locator, options.accountId);
            }

            return { success: true, count: reservations.length };

        } catch (error: any) {
            console.error('[AZUL] Extraction error:', error.message);
            return { success: false, error: error.message };
        } finally {
            await page.close();
            if (this.browser) await this.browser.close();
        }
    }

    private async extractReservationDetails(page: Page, locator: string, accountId?: string) {
        // Logic to click 'Detalhes' and parse the full page content
        // This is a placeholder for the detailed parsing logic once logged in
        console.log(`[AZUL] Extracting details for locator: ${locator}`);

        // Mocking found data for now as we don't have real creds to test
        const mockData = {
            airline: 'Azul',
            account_id: accountId,
            locator: locator,
            passenger_name: 'JOHN DOE', // Full name from screen
            origin: 'GRU',
            destination: 'MCO',
            flight_date: new Date().toISOString().split('T')[0],
            miles_used: 125000,
            status: 'pending_sync'
        };

        // Save to Supabase
        const { error } = await this.supabase
            .from('extracted_bookings')
            .upsert(mockData, { onConflict: 'airline,locator' });

        if (error) console.error(`[AZUL] Error saving ${locator}:`, error.message);
    }
}
