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

        // Fetch the full CANCEL sheet data up to column Z
        const rawData = await sheetsService.readSheetData('CANCEL!A:Z');
        if (!rawData) {
            throw new Error('Falha ao ler dados da planilha CANCEL.');
        }

        const counts = {
            solicitar: 0,
            solicitado: 0,
            base: 0,
            ok: 0
        };

        const ledger: any[] = [];
        let headers: string[] = [];

        // Skip row 0 (headers) for counting, but store headers
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            if (i === 0) {
                headers = row.map(h => (h || '').trim());
                continue;
            }

            if (!row || row.length === 0) continue;
            
            // X is column 23 (0-indexed)
            const status = (row[23] || '').trim().toUpperCase();
            if (status === 'SOLICITAR') counts.solicitar++;
            else if (status === 'SOLICITADO') counts.solicitado++;
            else if (status === 'BASE') counts.base++;
            else if (status === 'OK') counts.ok++;

            // Use the first cell (A, index 0) to check if row is reasonably valid (like an ID, Date, etc.)
            // We'll collect the row to send back as an object mapped by headers (or just array)
            const rowObj: Record<string, string> = {};
            headers.forEach((header, colIdx) => {
                if (header) {
                    rowObj[header] = (row[colIdx] || '').trim();
                }
            });
            // We only push rows that have some basic data (e.g. at least index 0 is not empty)
            if (row[0] && row[0].trim() !== '') {
                ledger.push(rowObj);
            }
        }

        // Return the most recent entries first for the new page
        ledger.reverse();

        return NextResponse.json({
            success: true,
            data: {
                counts,
                ledger
            }
        });

    } catch (error: any) {
        console.error('[API/CANCEL] Error:', error.message);
        return NextResponse.json({ success: false, error: 'Erro ao buscar dados: ' + error.message }, { status: 500 });
    }
}
