import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

function supa() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const airline = searchParams.get('airline') ?? 'Azul';

    const { data, error } = await supa()
        .from('extracted_bookings')
        .select('*')
        .order('flight_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: 'Nenhuma emissão encontrada' }, { status: 404 });

    const rows = data.map(b => ({
        'Localizador': b.locator ?? '',
        'Passageiro': b.passenger_name ?? '',
        'Origem': b.origin ?? '',
        'Destino': b.destination ?? '',
        'Data Voo': b.flight_date ?? '',
        'Milhas': b.miles_used ?? 0,
        'Taxas (R$)': b.cash_paid ?? 0,
        'Companhia': b.airline ?? '',
        'Voo': b.source ?? '',
        'Categoria': b.notes ?? '',
        'Status': b.status ?? '',
        'Data Captura': b.capture_date ? new Date(b.capture_date).toLocaleDateString('pt-BR') : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 6 }, { wch: 6 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
        { wch: 10 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Emissões');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `emissoes_azul_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
