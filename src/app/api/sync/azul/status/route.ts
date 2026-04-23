import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supa() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export async function GET() {
    const { data } = await supa()
        .from('settings')
        .select('value, updated_at')
        .eq('key', 'azul_sync_job')
        .single();

    if (!data) return NextResponse.json({ status: 'idle' });
    return NextResponse.json({ ...(data.value as object), updated_at: data.updated_at });
}
