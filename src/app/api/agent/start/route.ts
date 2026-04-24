import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST() {
    if (process.env.VERCEL === '1') {
        return NextResponse.json(
            { error: 'Disponível apenas em ambiente local', local: false },
            { status: 503 }
        );
    }

    try {
        const cwd = process.cwd();
        const script = path.join(cwd, 'scripts', 'azul-agent.py');
        const proc = spawn('python', [script], {
            detached: true,
            stdio: 'ignore',
            cwd,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });
        proc.unref();
        return NextResponse.json({ started: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
