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
    try {
        const sheetsService = new GoogleSheetsService();
        if (sheetsService.isConfigured()) {
            const data = await sheetsService.readSheetData('CALC!AB3');
            if (data && data[0] && data[0][0]) {
                const parsed = parseFloat(data[0][0].replace(',', '.'));
                if (!isNaN(parsed)) {
                    dolarValue = parsed;
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch Dolar from Google Sheets:', error);
    }
    
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase font-display">Calculadora de Voos</h1>
                <p className="text-[#a19f9d] mt-2">Calcule os custos de emissão baseados na cotação do dólar e rate de milhas.</p>
            </header>
            
            <CalculatorClient initialDolar={dolarValue} />
        </div>
    );
}
