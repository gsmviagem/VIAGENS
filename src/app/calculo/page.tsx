import { GoogleSheetsService } from '@/lib/google-sheets';
import CalculatorClient from './calculator-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Calculadora de Voos - CHRONOS HUB',
};

// Force dynamic since fetching live exchange rate might change
export const dynamic = 'force-dynamic';

export default async function CalculatorPage() {
    let dolarValue = 5.0; // fallback
    let defaultRates = { upTo50: 14.50, over50: 13.50 };

    try {
        const sheetsService = new GoogleSheetsService();
        if (sheetsService.isConfigured()) {
            // Fetch Dolar and Rates
            const [dolarData, ratesData] = await Promise.all([
                sheetsService.readSheetData('CALC!AB3'),
                sheetsService.readSheetData('CALC!Z3:AA3')
            ]);

            if (dolarData && dolarData[0] && dolarData[0][0]) {
                const parsed = parseFloat(dolarData[0][0].replace(',', '.'));
                if (!isNaN(parsed)) dolarValue = parsed;
            }

            if (ratesData && ratesData[0]) {
                const r1 = parseFloat(ratesData[0][0]);
                const r2 = parseFloat(ratesData[0][1]);
                if (!isNaN(r1)) defaultRates.upTo50 = r1;
                if (!isNaN(r2)) defaultRates.over50 = r2;
            }
        }
    } catch (error) {
        console.error('Failed to fetch data from Google Sheets:', error);
    }
    
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase font-display">Calculadora de Voos</h1>
                <p className="text-[#a19f9d] mt-2">Calcule os custos de emissão baseados na cotação do dólar e rate de milhas.</p>
            </header>
            
            <CalculatorClient 
                initialDolar={dolarValue} 
                initialRateUpTo50k={defaultRates.upTo50}
                initialRateOver50k={defaultRates.over50}
            />
        </div>
    );
}
