import { BaseScraper, QuotationResult, SearchOptions } from './base-scraper';

export class AzulQuotationScraper extends BaseScraper {
    protected name = 'Azul';

    async search(options: SearchOptions): Promise<QuotationResult> {
        if (!this.context) await this.init();
        const page = await this.context!.newPage();

        try {
            console.log(`[AZUL] Starting international search: ${options.origin} -> ${options.destination} on ${options.date}`);

            // Capture any XHR/Fetch that looks like a pricing response
            let capturedPrice: number | null = null;

            page.on('response', async (response) => {
                const url = response.url();
                // Azul Pelo Mundo is powered by Travelfusion/InnRoad or similar GDS APIs
                // We listen for any JSON response that contains pricing data
                if ((url.includes('api') || url.includes('search') || url.includes('flight')) && response.headers()['content-type']?.includes('application/json')) {
                    try {
                        const body = await response.json();
                        // Look for 'miles', 'points', 'redemptionPoints' in the response
                        const bodyStr = JSON.stringify(body);
                        const milesMatch = bodyStr.match(/"(miles|points|redemptionPoints|totalPoints|milesAmount)":\s*(\d+)/);
                        if (milesMatch && !capturedPrice) {
                            const value = parseInt(milesMatch[2]);
                            if (value > 0) {
                                capturedPrice = value;
                                console.log(`[AZUL] Intercepted price from API: ${capturedPrice}`);
                            }
                        }
                    } catch {
                        // Ignore parsing errors  
                    }
                }
            });

            // Navigate with a realistic user-agent
            await page.goto('https://azulpelomundo.voeazul.com.br/pt/home', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait for form to load
            await page.waitForTimeout(3000);

            // Try to interact with the search form using multiple fallback selectors
            try {
                // Origin field - try various selectors
                const originSelectors = [
                    'input[placeholder*="Origem"]',
                    'input[placeholder*="origin"]',
                    'input[data-testid*="origin"]',
                    'input[id*="origin"]',
                    'input[name*="origin"]',
                    '#origin',
                    '.origin-input input'
                ];

                for (const sel of originSelectors) {
                    try {
                        await page.waitForSelector(sel, { timeout: 3000 });
                        await page.fill(sel, options.origin);
                        await page.waitForTimeout(600);
                        // Try to pick autocomplete result or press Enter
                        await page.keyboard.press('ArrowDown');
                        await page.keyboard.press('Enter');
                        console.log(`[AZUL] Origin filled with selector: ${sel}`);
                        break;
                    } catch { continue; }
                }

                // Destination field
                const destSelectors = [
                    'input[placeholder*="Destino"]',
                    'input[placeholder*="destination"]',
                    'input[data-testid*="destination"]',
                    'input[id*="destination"]',
                    'input[name*="destination"]',
                    '#destination',
                    '.destination-input input'
                ];

                for (const sel of destSelectors) {
                    try {
                        await page.waitForSelector(sel, { timeout: 3000 });
                        await page.click(sel);
                        await page.fill(sel, options.destination);
                        await page.waitForTimeout(600);
                        await page.keyboard.press('ArrowDown');
                        await page.keyboard.press('Enter');
                        console.log(`[AZUL] Destination filled with selector: ${sel}`);
                        break;
                    } catch { continue; }
                }

                // Date field
                if (options.date) {
                    const dateSelectors = [
                        'input[type="date"]',
                        'input[placeholder*="Data"]',
                        'input[id*="date"]',
                        'input[data-testid*="date"]',
                    ];

                    for (const sel of dateSelectors) {
                        try {
                            await page.waitForSelector(sel, { timeout: 2000 });
                            await page.fill(sel, options.date);
                            console.log(`[AZUL] Date filled with selector: ${sel}`);
                            break;
                        } catch { continue; }
                    }
                }

                // Search button
                const searchSelectors = [
                    'button[type="submit"]',
                    'button:has-text("Buscar")',
                    'button:has-text("Search")',
                    '.search-btn',
                    '#search-button',
                    '[data-testid="search-button"]'
                ];

                for (const sel of searchSelectors) {
                    try {
                        await page.waitForSelector(sel, { timeout: 2000 });
                        await page.click(sel);
                        console.log(`[AZUL] Clicked search with selector: ${sel}`);
                        break;
                    } catch { continue; }
                }

            } catch (formError: any) {
                console.warn('[AZUL] Form interaction failed, trying URL-based approach:', formError.message);

                // Fallback: try constructing the search URL directly
                const searchUrl = `https://azulpelomundo.voeazul.com.br/pt/results?origin=${options.origin}&destination=${options.destination}&date=${options.date}&adt=1&chd=0&inf=0&cabin=Economy`;
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            }

            // Wait for results to load
            await page.waitForTimeout(8000);

            // If we captured from network, use it
            if (capturedPrice) {
                return { site: 'Azul', price: capturedPrice, currency: 'miles', success: true };
            }

            // Try DOM extraction as fallback
            const lowestPrice = await page.evaluate(() => {
                // Cast to any to use NodeList methods without TS dom lib
                const selectors = [
                    '.reward-price', '.points', '.miles', '[class*="price"]',
                    '[class*="miles"]', '[class*="points"]', '[class*="pontos"]'
                ];
                for (const sel of selectors) {
                    const elements = Array.from(document.querySelectorAll(sel));
                    const prices = elements
                        .map(el => parseInt((el as HTMLElement).textContent?.replace(/\D/g, '') || '0'))
                        .filter(p => p > 5000 && p < 5000000); // sanity check for miles range
                    if (prices.length > 0) return Math.min(...prices);
                }
                return 'N/A';
            });

            if (lowestPrice === 'N/A') {
                return {
                    site: 'Azul',
                    price: 'N/A',
                    currency: 'miles',
                    success: false,
                    error: 'Nenhum resultado encontrado'
                };
            }

            return { site: 'Azul', price: lowestPrice, currency: 'miles', success: true };

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
