import { BaseScraper, QuotationResult, SearchOptions } from './base-scraper';

export class AzulQuotationScraper extends BaseScraper {
    protected name = 'Azul';

    async search(options: SearchOptions): Promise<QuotationResult> {
        if (!this.context) await this.init();
        const page = await this.context!.newPage();

        try {
            console.log(`[AZUL] Starting international search: ${options.origin} -> ${options.destination}`);

            // 1. Navigate to Azul pelo Mundo
            await page.goto('https://azulpelomundo.voeazul.com.br/pt/home', { waitUntil: 'networkidle', timeout: 60000 });

            // 2. Interaction
            await page.fill('input#origin-input', options.origin);
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');

            await page.fill('input#destination-input', options.destination);
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');

            // Click search
            await page.click('button#search-button');

            // 3. Wait for results
            await page.waitForSelector('.reward-price, .points', { timeout: 40000 });

            // 4. Extract
            const lowestPrice = await page.evaluate(() => {
                const points = Array.from(document.querySelectorAll('.reward-price, .points'))
                    .map(el => parseInt(el.textContent?.replace(/\D/g, '') || '0'))
                    .filter(p => p > 0);
                return points.length > 0 ? Math.min(...points) : 'N/A';
            });

            return {
                site: 'Azul',
                price: lowestPrice,
                currency: 'miles',
                success: true
            };

        } catch (error: any) {
            console.error('[AZUL] Search failed:', error.message);
            return {
                site: 'Azul',
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
