import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    console.log(`[API/CHECK-PAX] Request started`);

    try {
        const body = await req.json();
        const { passengers } = body; // Array of strings (names)

        if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
            return NextResponse.json({ success: true, data: {} });
        }

        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Google Sheets não está configurado.' }, { status: 500 });
        }

        // Reading from B to M to get:
        // B(0): Booking Date (DD/MM/YYYY)
        // G(5): Pax Name
        // H(6): PNR / Localizador
        // M(11): Conta
        const rawData = await sheetsService.readSheetData('BASE!B3:M');

        if (!rawData) {
            return NextResponse.json({ success: false, error: 'Falha ao ler dados da planilha BASE' }, { status: 500 });
        }

        const currentYear = new Date().getFullYear();

        // results: { "JOHN DOE": [{ localizador: "ABC123", conta: "CONTA1" }, ...] }
        const results: Record<string, { localizador: string; conta: string }[]> = {};

        const searchNames = passengers.map((p: string) => p.toUpperCase().trim());
        for (const name of searchNames) results[name] = [];

        for (const row of rawData) {
            if (!row || !row[5]) continue; // Must have Pax Name in col G (index 5)

            const dateStr = (row[0] || '').trim(); // B(0): DD/MM/YYYY

            // Filter: only current year emissions
            if (dateStr) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const rowYear = parseInt(parts[2]);
                    if (rowYear !== currentYear) continue;
                }
            } else {
                // No date — skip
                continue;
            }

            const paxCell = row[5].toUpperCase(); // G(5): Pax Name
            const localizador = (row[6] || '').trim().toUpperCase(); // H(6): PNR/Localizador
            const accountCell = (row[11] || '').trim(); // M(11): Conta

            for (const searchName of searchNames) {
                if (paxCell.includes(searchName)) {
                    // Add entry only if localizador not already listed (avoid duplicates)
                    const alreadyAdded = results[searchName].some(e => e.localizador === localizador);
                    if (!alreadyAdded && localizador) {
                        results[searchName].push({ localizador, conta: accountCell });
                    }
                }
            }
        }

        // Remove empty entries and format as displayable strings
        const filtered: Record<string, string[]> = {};
        for (const [name, entries] of Object.entries(results)) {
            if (entries.length > 0) {
                filtered[name] = entries.map(e =>
                    e.conta ? `${e.localizador} (${e.conta})` : e.localizador
                );
            }
        }

        return NextResponse.json({
            success: true,
            data: filtered
        });

    } catch (error: any) {
        console.error(`[API/CHECK-PAX] Error:`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
