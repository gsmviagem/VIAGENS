import { BaseScraper, QuotationResult, SearchOptions } from './base-scraper';

export class LatamScraper extends BaseScraper {
    protected name = 'LATAM';

    async search(options: SearchOptions): Promise<QuotationResult> {
        if (!this.context) await this.init();
        const page = await this.context!.newPage();

        try {
            console.log(`[LATAM] Starting miles search: ${options.origin} -> ${options.destination}`);

            // 1. Navigate to LATAM
            await page.goto('https://www.latamairlines.com/br/pt', { waitUntil: 'networkidle', timeout: 60000 });

            // 2. Login Check (Standalone logic for now, eventually uses database)
            // Note: User mentioned login is required but straightforward

            // 3. Select "Buscar com milhas"
            // This is a critical step requested by the user
            await page.click('text="Buscar com milhas", #rewards-toggle');
            await page.waitForTimeout(1000);

            // 4. Interaction with search form
            await page.fill('input#origin, [name="origin"]', options.origin);
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');

            await page.fill('input#destination, [name="destination"]', options.destination);
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');

            // Select Date (Handling date pickers is usually complex, but let's assume direct input for now)
            // Select Search
            await page.click('button#btnSearch, [type="submit"]');

            // 5. Wait for results
            await page.waitForSelector('.flight-matrix, .sc-results', { timeout: 45000 });

            // 6. Extract lowest miles
            const lowestPrice = await page.evaluate(() => {
                const milesElements = Array.from(document.querySelectorAll('.miles, .points-value'))
                    .map(el => parseInt(el.textContent?.replace(/\D/g, '') || '0'))
                    .filter(p => p > 0);
                return milesElements.length > 0 ? Math.min(...milesElements) : 'N/A';
            });

            return {
                site: 'LATAM',
                price: lowestPrice,
                currency: 'miles',
                success: true
            };

        } catch (error: any) {
            console.error('[LATAM] Search failed:', error.message);
            return {
                site: 'LATAM',
                price: 'Error',
                currency: 'miles',
                success: false,
                error: error.message
            };
        } finally {
            await page.close();
        }
    }
}
