import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();
        if (!text || text.trim().length < 20) {
            return NextResponse.json({ error: 'Texto muito curto.' }, { status: 400 });
        }

        const message = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `Você é um especialista em programas de milhas e fidelidade no Brasil. Analise os termos e condições abaixo de uma campanha de transferência de milhas e liste SOMENTE as brechas, armadilhas e restrições que podem prejudicar o cliente. Seja direto e objetivo.

Para cada risco encontrado, use este formato exato:
🔴 CRÍTICO | [título curto]
[explicação em 1-2 linhas]

ou

🟡 ATENÇÃO | [título curto]
[explicação em 1-2 linhas]

Categorias que você DEVE verificar:
- Limite máximo de milhas transferidas/bonificadas
- Obrigatoriedade de clube, assinatura ou conta ativa
- Prazo de validade das milhas bonificadas
- Prazo para as milhas aparecerem na conta
- Exclusividade de cartões ou bancos parceiros
- Restrições de CPF (apenas um por campanha, lista negra)
- Milhas que não valem para emissão de passagens internacionais
- Condições de cancelamento ou estorno
- Letra miúda sobre o que configura "transferência válida"
- Qualquer outra armadilha relevante

Se não encontrar riscos em alguma categoria, não mencione. Se o texto não parecer termos de campanha de milhas, responda apenas: "⚠️ O texto não parece conter termos de campanha de milhas."

TERMOS E CONDIÇÕES:
${text}`
            }]
        });

        const content = message.content[0];
        const result = content.type === 'text' ? content.text : '';
        return NextResponse.json({ result });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
    }
}
