import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface QuotationResult {
    site: string;
    price: number | string;
    currency: 'miles' | 'brl';
    flightDetails?: string;
    success: boolean;
    error?: string;
}

export interface SearchOptions {
    origin: string;
    destination: string;
    date: string;
    passengers: number;
}

export abstract class BaseScraper {
    protected browser: Browser | null = null;
    protected context: BrowserContext | null = null;
    protected name: string = 'Base';

    async init() {
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
    }

    async close() {
        if (this.browser) await this.browser.close();
    }

    abstract search(options: SearchOptions): Promise<QuotationResult>;
}
