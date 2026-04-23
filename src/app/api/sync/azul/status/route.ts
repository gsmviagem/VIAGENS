import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supa() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobKey = searchParams.get('jobKey');

    if (!jobKey) return NextResponse.json({ status: 'idle' });

    const { data } = await supa()
        .from('settings')
        .select('value, updated_at')
        .eq('key', jobKey)
        .single();

    if (!data) return NextResponse.json({ status: 'idle' });
    const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return NextResponse.json({ ...val, updated_at: data.updated_at });
}
