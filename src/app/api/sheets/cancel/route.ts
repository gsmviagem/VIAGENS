import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    try {
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Google Sheets não está configurado.' }, { status: 500 });
        }

        // Fetch just the status column from the CANCEL sheet
        const statusData = await sheetsService.readSheetData('CANCEL!X:X');
        if (!statusData) {
            throw new Error('Falha ao ler dados da planilha CANCEL.');
        }

        const counts = {
            solicitar: 0,
            solicitado: 0,
            base: 0,
            ok: 0
        };

        // Skip header if it exists (assuming row 0 or 1 is header, but we'll just check the strings directly)
        for (const row of statusData) {
            if (!row || !row[0]) continue;
            
            const status = row[0].trim().toUpperCase();
            if (status === 'SOLICITAR') counts.solicitar++;
            else if (status === 'SOLICITADO') counts.solicitado++;
            else if (status === 'BASE') counts.base++;
            else if (status === 'OK') counts.ok++;
        }

        return NextResponse.json({
            success: true,
            data: counts
        });

    } catch (error: any) {
        console.error('[API/CANCEL] Error:', error.message);
        return NextResponse.json({ success: false, error: 'Erro ao buscar dados: ' + error.message }, { status: 500 });
    }
}
