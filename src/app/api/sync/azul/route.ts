import { NextRequest, NextResponse } from 'next/server';
import { AzulScraper } from '@/connectors/azul-scraper';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

function supa() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cpf, password, accountId, bookings: preExtracted, full } = body;

        // ── Path A: local agent posted pre-extracted bookings ────────────────
        if (preExtracted && Array.isArray(preExtracted) && preExtracted.length > 0) {
            const scraper = new AzulScraper();
            let saved = 0;
            for (const b of preExtracted) {
                if (await scraper.saveBookingPublic(b, accountId)) saved++;
            }
            if (accountId) {
                const jobKey = `azul_sync_job_${accountId}`;
                await supa().from('settings').upsert({
                    key: jobKey,
                    value: { status: 'done', count: saved, total: preExtracted.length, completed_at: new Date().toISOString() },
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'key' });
            }
            return NextResponse.json({ success: true, message: `${saved} de ${preExtracted.length} emissões salvas.`, count: saved });
        }

        // ── Path B: UI triggered sync — queue job for local agent ────────────
        if (!accountId && (!cpf || !password)) {
            return NextResponse.json({ error: 'accountId ou cpf+senha obrigatório' }, { status: 400 });
        }

        let jobCpf = cpf;
        let jobPassword = password;
        let resolvedAccountId = accountId;

        if (accountId && !cpf) {
            const { data: acc } = await supa()
                .from('airline_accounts')
                .select('login_cpf, password')
                .eq('id', accountId)
                .single();
            if (!acc) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
            jobCpf = acc.login_cpf;
            jobPassword = acc.password;
        }

        const jobKey = `azul_sync_job_${resolvedAccountId ?? jobCpf}`;
        await supa().from('settings').upsert({
            key: jobKey,
            value: { status: 'pending', cpf: jobCpf, password: jobPassword, account_id: resolvedAccountId ?? null, full: !!full, requested_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

        return NextResponse.json({ success: true, queued: true, jobKey, message: 'Extração enfileirada. Aguarde o agente local...' });

    } catch (error: any) {
        console.error('[API/AZUL] Runtime error:', error.message);
        return NextResponse.json({ success: false, error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
