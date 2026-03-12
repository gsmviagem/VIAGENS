import { BaseScraper, QuotationResult, SearchOptions } from './base-scraper';

export class BuscaIdealScraper extends BaseScraper {
    protected name = 'Busca Ideal';

    async search(options: SearchOptions): Promise<QuotationResult> {
        if (!this.context) await this.init();
        const page = await this.context!.newPage();

        try {
            console.log(`[BUSCA IDEAL] Starting search: ${options.origin} -> ${options.destination}`);

            // 1. Navigate to Busca Ideal
            await page.goto('https://busca.buscaideal.com.br/', { waitUntil: 'networkidle', timeout: 60000 });

            // 2. Login Flow (Straightforward as per user)
            // Note: In production, these should come from the database 'Vault'
            const user = process.env.BUSCA_IDEAL_USER;
            const pass = process.env.BUSCA_IDEAL_PASS;

            if (user && pass && await page.isVisible('input[name="user"], #login')) {
                await page.fill('input[name="user"], #login', user);
                await page.fill('input[name="pass"], #password', pass);
                await page.click('button[type="submit"], #btn-login');
                await page.waitForNavigation({ waitUntil: 'networkidle' });
            }

            // 3. Interaction with search form
            await page.fill('input#origin-city, [name="from"]', options.origin);
            await page.fill('input#destination-city, [name="to"]', options.destination);

            // Handle date (assume YYYY-MM-DD or similar)
            await page.fill('input[type="date"], #departure-date', options.date);

            // Click Search
            await page.click('button.search-btn, #search-flights');

            // 4. Wait for results
            await page.waitForSelector('.flight-list, .results-grid', { timeout: 45000 });

            // 5. Extract lowest price (Busca Ideal is usually BRL or Miles, adjusting for BRL mostly)
            const lowestPrice = await page.evaluate(() => {
                const prices = Array.from(document.querySelectorAll('.price-amount, .total-price'))
                    .map(el => parseFloat(el.textContent?.replace(/[^\d,.]/g, '').replace(',', '.') || '0'))
                    .filter(p => p > 0);
                return prices.length > 0 ? Math.min(...prices) : 'N/A';
            });

            return {
                site: 'Busca Ideal',
                price: lowestPrice,
                currency: 'brl',
                success: true
            };

        } catch (error: any) {
            console.error('[BUSCA IDEAL] Search failed:', error.message);
            return {
                site: 'Busca Ideal',
                price: 'Error',
                currency: 'brl',
                success: false,
                error: error.message
            };
        } finally {
            await page.close();
        }
    }
}
