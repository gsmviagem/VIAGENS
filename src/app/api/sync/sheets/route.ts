import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const maxDuration = 60; // 1 min

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const sheetsService = new GoogleSheetsService();

        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ 
                success: false, 
                error: 'Google Sheets não está configurado. Verifique as variáveis de ambiente.' 
            }, { status: 500 });
        }

        // 1. Fetch bookings that haven't been synced or all bookings
        // For simplicity, we'll fetch all and the service will append.
        // In a real scenario, we might want a 'synced_to_sheets' flag in Supabase.
        const { data: bookings, error } = await supabase
            .from('extracted_bookings')
            .select('*')
                .order('created_at', { ascending: false });

        if (error) throw error;

        if (!bookings || bookings.length === 0) {
            return NextResponse.json({ success: true, message: 'Nenhuma emissão encontrada para sincronizar.', count: 0 });
        }

        // 2. Map to format expected by Sheets service
        const sheetData = bookings.map(b => ({
            locator: b.locator,
            airline: b.airline,
            route: `${b.origin} → ${b.destination}`,
            flightDate: b.flight_date,
            passengerName: b.passenger_name,
            milesUsed: b.miles_used,
            taxes: b.taxes,
            cabinClass: b.notes?.split(' | ')[0] || 'N/A', // Notes contains "Cabin | Type | Times"
        }));

        // 3. Append to Sheets
        const success = await sheetsService.appendBookings(sheetData);

        if (!success) {
            throw new Error('Falha ao escrever na planilha do Google Sheets.');
        }

        return NextResponse.json({
            success: true,
            message: 'Sincronização concluída com sucesso!',
            count: bookings.length
        });

    } catch (error: any) {
        console.error('[API/SHEETS] Sync error:', error.message);
        return NextResponse.json({ 
            success: false, 
            error: 'Erro na sincronização: ' + error.message 
        }, { status: 500 });
    }
}
