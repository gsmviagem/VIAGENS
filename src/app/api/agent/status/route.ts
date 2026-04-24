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
        .eq('key', 'azul_agent_heartbeat')
        .single();

    if (!data) {
        return NextResponse.json({ running: false, lastSeen: null, ageSeconds: null });
    }

    const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const lastTs = (val as any)?.ts ?? data.updated_at;
    const ageMs = Date.now() - new Date(lastTs).getTime();
    const running = ageMs < 60000;

    return NextResponse.json({ running, lastSeen: lastTs, ageSeconds: Math.floor(ageMs / 1000) });
}
