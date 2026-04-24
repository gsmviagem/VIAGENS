export type RiskLevel = 'critical' | 'warning' | 'info';

export interface RuleMatch {
    level: RiskLevel;
    category: string;
    message: string;
    excerpts: string[];
}

interface Rule {
    level: RiskLevel;
    category: string;
    message: string;
    patterns: RegExp[];
}

const RULES: Rule[] = [
    {
        level: 'warning', category: 'Prazo Curto para Uso',
        message: 'Prazo curto para resgatar ou usar as milhas transferidas.',
        patterns: [
            /prazo\s*(de\s*)?\d+\s*(dias?|meses?)\s*(para\s*)?(uso|resgate|utilização)/i,
            /utilizar?\s*(em\s*até|dentro\s*de)\s*\d+\s*(dias?|meses?)/i,
            /resgate\s*(até|dentro\s*de)\s*\d+\s*(dias?|meses?)/i,
            /\d+\s*dias?\s*(para|de)\s*(resgat|utiliz|us[ao]r)/i,
        ],
    },

    // ─── CLUBE / ASSOCIAÇÃO ────────────────────────────────────────────────────
    {
        level: 'critical', category: 'Clube Ativo Obrigatório',
        message: 'Exige clube ou assinatura ativa — se você não for sócio ou sua assinatura estiver inativa, o bônus pode ser negado.',
        patterns: [
            /clube?\s*(ativo|vigente|regular)/i,
            /sócio\s*(ativo|regular|vigente)/i,
            /assinatura\s*(ativa|vigente|em\s*dia)/i,
            /membro\s*(ativo|regular)/i,
            /ser\s*(sócio|associado|membro)\s*(ativo|do\s*clube)/i,
            /exclusivo\s*para\s*(sócios?|membros?|assinantes?)/i,
            /apenas\s*para\s*(sócios?|membros?|assinantes?|clientes?\s*gold|clientes?\s*platinum)/i,
            /clube\s*(smiles|livelo|esfera|latam|multiplus|tudoazul)/i,
            /(smiles|livelo|esfera|latam|tudoazul)\s*clube/i,
            /vínculo\s*(ativo|regular)/i,
        ],
    },
    {
        level: 'warning', category: 'Nível de Conta / Categoria',
        message: 'Pode ser restrito a clientes de determinada categoria (Gold, Platinum, Black etc.).',
        patterns: [
            /clientes?\s*(gold|platinum|black|diamond|elite|premium|vip|preferencial)/i,
            /nível\s*(gold|platinum|black|diamond|elite|premium)/i,
            /categoria\s*(gold|platinum|black|diamond)/i,
            /somente\s*(para\s*)?clientes?\s*(gold|platinum|black|select|top)/i,
            /benefício\s*(exclusivo|restrito)\s*(a|para)\s*(clientes?)/i,
        ],
    },

    // ─── LIMITE / TETO ────────────────────────────────────────────────────────
    {
        level: 'critical', category: 'Teto de Bônus',
        message: 'Existe um teto máximo de milhas bônus — transferir acima desse valor não gera bônus adicional.',
        patterns: [
            /limite\s*(máximo|de)\s*\d[\d.,]*\s*(mil)?\s*milhas?/i,
            /máximo\s*(de\s*)?\d[\d.,]*\s*(mil)?\s*milhas?\s*(de\s*)?bônus/i,
            /bônus?\s*(limitado|máximo)\s*(a|de)\s*\d[\d.,]*/i,
            /teto\s*(de\s*)?\d[\d.,]*\s*(mil)?\s*milhas?/i,
            /até\s*(o\s*)?máximo\s*(de\s*)?\d[\d.,]*\s*milhas?/i,
            /cap\s*(de\s*)?\d[\d.,]*\s*milhas?/i,
            /não\s*(exceder|ultrapassar)\s*\d[\d.,]*\s*(mil)?\s*milhas?/i,
        ],
    },
    {
        level: 'warning', category: 'Limite de Transferência',
        message: 'Há um limite na quantidade de milhas que podem ser transferidas nesta campanha.',
        patterns: [
            /transferência\s*(máxima|limitada)\s*(de|a)\s*\d[\d.,]*/i,
            /máximo\s*(de\s*)?\d[\d.,]*\s*(mil)?\s*(pontos?|milhas?)\s*(por|a cada)/i,
            /\d[\d.,]*\s*(mil)?\s*(pontos?|milhas?)\s*(por\s*)?(mês|período|cpf|conta|participante)/i,
            /limite\s*(por\s*)?(mês|período|cpf|conta|participante)/i,
        ],
    },

    // ─── NÃO REEMBOLSÁVEL / IRREVERSÍVEL ─────────────────────────────────────
    {
        level: 'critical', category: 'Não Reembolsável',
        message: 'A transferência é irreversível — milhas transferidas não voltam ao programa de origem.',
        patterns: [
            /não\s*(é\s*)?reembolsável/i,
            /irreversível/i,
            /não\s*(há|existe)\s*(possibilidade\s*(de|para))?\s*(estorno|devolução|reembolso|cancelamento)\s*(das?\s*)?milhas?/i,
            /milhas?\s*(transferidas?\s*)?(não\s*)?(podem\s*(ser\s*)?)?(devolvidas?|reembolsadas?|estornadas?|canceladas?)/i,
            /sem\s*(direito\s*(a|de))?\s*(devolução|reembolso|estorno)/i,
            /operação\s*(não\s*pode\s*ser|é)\s*(desfeita|cancelada|revertida)/i,
        ],
    },

    // ─── TAXAS / IOF / CUSTOS OCULTOS ────────────────────────────────────────
    {
        level: 'critical', category: 'Taxas e Custos Adicionais',
        message: 'Há cobranças adicionais (IOF, taxas de transferência, tarifas) que aumentam o custo real.',
        patterns: [
            /\biof\b/i,
            /taxa\s*(de\s*)?(transferência|conversão|administração|serviço)/i,
            /tarifa\s*(de\s*)?(conversão|transferência)/i,
            /cobrança\s*adicional/i,
            /imposto\s*(sobre\s*)?operações?\s*(financeiras?|de\s*crédito)/i,
            /taxa\s*(aplicável|será\s*cobrada)/i,
            /haverá\s*cobrança/i,
        ],
    },
    {
        level: 'warning', category: 'Custo de Adesão / Anuidade',
        message: 'Pode exigir pagamento de adesão ou anuidade para participar.',
        patterns: [
            /taxa\s*(de\s*)?adesão/i,
            /anuidade/i,
            /mensalidade/i,
            /pagamento\s*(de\s*)?inscrição/i,
            /valor\s*(de\s*)?(adesão|inscrição|participação)/i,
        ],
    },

    // ─── PERÍODO RESTRITO / BLACKOUT ──────────────────────────────────────────
    {
        level: 'critical', category: 'Períodos Bloqueados (Blackout)',
        message: 'Existem datas ou períodos em que as milhas não podem ser utilizadas (feriados, alta temporada).',
        patterns: [
            /blackout/i,
            /datas?\s*(bloqueadas?|restritas?|indisponíveis?)/i,
            /períodos?\s*(de\s*)?(restrição|bloqueio|exceção)/i,
            /alta\s*temporada/i,
            /não\s*(disponível|válido)\s*(em|para|durante|nos?)\s*(feriados?|datas?\s*comemorativas?|natal|réveillon|carnaval|páscoa)/i,
            /exceto\s*(nos?|em|durante)\s*(feriados?|alta\s*temporada)/i,
            /sujeito\s*a\s*(disponibilidade|restrições?)/i,
        ],
    },
    {
        level: 'warning', category: 'Período Limitado da Promoção',
        message: 'A promoção é válida apenas por tempo limitado — confira as datas.',
        patterns: [
            /válida?\s*(até|de|entre|apenas)\s*([\d/]+|[\w]+\s*\d{4})/i,
            /promoção\s*(encerra|termina|válida\s*até)/i,
            /oferta\s*(por\s*tempo\s*limitado|limitada)/i,
            /campanha\s*válida\s*(até|de)/i,
            /disponível\s*até\s*([\d/]+)/i,
        ],
    },

    // ─── PARCEIROS / ROTAS / VOOS ESPECÍFICOS ────────────────────────────────
    {
        level: 'warning', category: 'Rotas ou Parceiros Restritos',
        message: 'As milhas podem ser válidas apenas para rotas ou cias aéreas parceiras específicas.',
        patterns: [
            /parceiros?\s*participantes?/i,
            /voos?\s*(específicos?|selecionados?|determinados?)/i,
            /rotas?\s*(específicas?|selecionadas?|determinadas?|participantes?)/i,
            /apenas\s*(para\s*)?(voos?|rotas?|destinos?)\s*(da?|com|operados?\s*(por|pela?))\s*\w+/i,
            /não\s*(se\s*)?(aplica|vale)\s*(para|em)\s*(todos?\s*(os\s*)?voos?|voos?\s*internacionais?|voos?\s*domésticos?)/i,
            /voos?\s*operados?\s*(por|pela?)\s*(parceiro|companhia)\s*não\s*(participante|elegível)/i,
        ],
    },
    {
        level: 'warning', category: 'Exclusão de Destinos',
        message: 'Alguns destinos podem estar excluídos do resgate com essas milhas.',
        patterns: [
            /destinos?\s*(excluídos?|não\s*(elegíveis?|participantes?))/i,
            /não\s*(vale|válido)\s*(para|em)\s*(destinos?|rotas?)/i,
            /exceto\s*(para|em)\s*(destinos?|rotas?)/i,
            /\bexcluindo\b.*\bdestinos?\b/i,
        ],
    },

    // ─── MOVIMENTAÇÃO DE CONTA / ATIVIDADE ───────────────────────────────────
    {
        level: 'critical', category: 'Conta com Movimentação Recente',
        message: 'Pode exigir que a conta tenha movimentação recente — contas inativas podem ser desqualificadas.',
        patterns: [
            /conta\s*(ativa|com\s*movimentação)/i,
            /movimentação\s*(nos?|em)\s*(últimos?|recente)\s*\d+\s*(dias?|meses?)/i,
            /\d+\s*(dias?|meses?)\s*(de\s*)?movimentação/i,
            /conta\s*(inativa|sem\s*movimentação)\s*(será|poderá\s*ser|pode\s*ser)\s*(cancelada|bloqueada|não\s*elegível)/i,
            /exige?\s*(movimentação|transação)\s*(recente|prévia|anterior)/i,
            /último\s*(uso|acúmulo|resgate)\s*(há|em|dentro\s*de)\s*(menos\s*de\s*)?\d+/i,
        ],
    },
    {
        level: 'warning', category: 'Cadastro / Registro Prévio',
        message: 'Pode ser necessário se cadastrar previamente para participar.',
        patterns: [
            /cadastro\s*(prévio|obrigatório|necessário)/i,
            /inscrição\s*(obrigatória|prévia|necessária)/i,
            /opt[\s-]?in\s*(obrigatório|necessário)/i,
            /se\s*(inscreva|cadastre)\s*(antes|previamente|antecipadamente)/i,
            /necessário\s*(se\s*)?(inscrever|cadastrar)/i,
            /participação\s*(condicionada\s*a|sujeita\s*a)\s*(cadastro|inscrição)/i,
        ],
    },

    // ─── TRANSFERÊNCIA MÍNIMA ─────────────────────────────────────────────────
    {
        level: 'warning', category: 'Transferência Mínima',
        message: 'Existe um valor mínimo de milhas para transferência — você pode ser obrigado a transferir mais do que planejou.',
        patterns: [
            /transferência\s*mínima\s*(de\s*)?\d[\d.,]*/i,
            /mínimo\s*(de\s*)?\d[\d.,]*\s*(mil)?\s*(milhas?|pontos?)\s*(para|na)\s*transferência/i,
            /transferir\s*(pelo\s*)?menos\s*\d[\d.,]*\s*(mil)?\s*(milhas?|pontos?)/i,
            /quantidade\s*mínima.*\d[\d.,]*/i,
            /lotes?\s*mínimos?\s*de\s*\d[\d.,]*/i,
            /múltiplos?\s*de\s*\d[\d.,]*/i,
        ],
    },

    // ─── MILHAS PROMOCIONAIS / CATEGORIA ─────────────────────────────────────
    {
        level: 'critical', category: 'Milhas Promocionais com Restrições',
        message: 'As milhas geradas pelo bônus podem ser "promocionais" e não valerem para todos os resgates.',
        patterns: [
            /milhas?\s*(promocionais?|bônus)\s*(não\s*)?(vale[m]?|são\s*válidas?)\s*(para|em)/i,
            /milhas?\s*de\s*bônus\s*(não\s*)?(podem\s*(ser\s*)?)?(usadas?|utilizadas?|resgatadas?)\s*(em|para)/i,
            /não\s*(válidas?|elegíveis?)\s*(para\s*)?(upgrades?|passagens?\s*premium|classe\s*(executiva|first|business))/i,
            /milhas?\s*promocionais?\s*(expiram?|vencem|têm\s*validade\s*(menor|diferente|de\s*\d+))/i,
            /pontos?\s*de\s*bônus\s*(não\s*)?(são\s*transferíveis?|valem\s*para)/i,
            /bônus\s*(não\s*)?convertid[ao]s?\s*(para|em)\s*milhas?\s*(de\s*)?(programa)/i,
        ],
    },
    {
        level: 'warning', category: 'Validade Diferente para Milhas Bônus',
        message: 'Milhas de bônus podem ter prazo de validade diferente (geralmente menor) das milhas normais.',
        patterns: [
            /milhas?\s*de?\s*bônus.*prazo/i,
            /bônus.*validade\s*(de|menor|diferente)/i,
            /milhas?\s*promocionais?.*\d+\s*(dias?|meses?)/i,
            /validade\s*(diferente|menor|específica)\s*(para|das?)\s*milhas?\s*bônus/i,
        ],
    },

    // ─── ALTERAÇÃO DE REGRAS / CANCELAMENTO DO PROGRAMA ──────────────────────
    {
        level: 'critical', category: 'Programa Pode Cancelar ou Alterar Regras',
        message: 'A empresa se reserva o direito de alterar ou cancelar o programa sem aviso prévio.',
        patterns: [
            /reserva[-\s]?(se|o)\s*(o\s*)?direito\s*(de|a)\s*(alterar|modificar|cancelar|encerrar|suspender)/i,
            /sem\s*(aviso\s*)?(prévio|antecipado)/i,
            /a\s*qualquer\s*(momento|tempo)\s*(e\s*sem)?\s*(aviso|notificação)?/i,
            /pode\s*(ser\s*)?(alterado|modificado|cancelado|encerrado|suspenso)\s*(a\s*qualquer|sem)/i,
            /sujeito\s*a\s*(alterações?|modificações?|cancelamento)\s*(sem|a\s*qualquer)/i,
            /programa\s*(pode\s*ser\s*)?(encerrado|cancelado|suspenso)\s*(a\s*qualquer\s*momento|sem\s*aviso)/i,
        ],
    },
    {
        level: 'warning', category: 'Regras Sujeitas a Alteração',
        message: 'As condições podem ser alteradas — leia os termos atualizados antes de transferir.',
        patterns: [
            /termos?\s*(e\s*condições\s*)?(sujeitos?\s*a\s*)?alterações?/i,
            /condições?\s*sujeitas?\s*a\s*(alterações?|mudanças?)/i,
            /regras?\s*podem\s*(ser\s*)?alteradas?/i,
            /poderá\s*ser\s*alterado\s*sem\s*aviso/i,
            /política\s*(de\s*)?programa\s*sujeita\s*(a\s*)?mudanças?/i,
        ],
    },

    // ─── CARTÃO ESPECÍFICO ───────────────────────────────────────────────────
    {
        level: 'critical', category: 'Cartão Específico Obrigatório',
        message: 'A promoção pode ser exclusiva para portadores de um cartão de crédito específico.',
        patterns: [
            /exclusivo\s*(para\s*)?portadores?\s*(do\s*cartão|de\s*cartão)/i,
            /apenas\s*(para\s*)?clientes?\s*(com|portadores?)\s*(do\s*cartão|de\s*cartão)/i,
            /válido\s*(para\s*)?portadores?\s*(do\s*)?cartão\s+\w+/i,
            /necessário\s*(ter|possuir)\s*cartão\s*(de\s*crédito)?\s+\w+/i,
            /cartão\s*(participante|elegível|específico)/i,
            /somente\s*(para\s*)?clientes?\s*(banco|itaú|bradesco|santander|nubank|inter|c6|xp|next)/i,
        ],
    },

    // ─── FRAUDE / SUSPENSÃO DE CONTA ─────────────────────────────────────────
    {
        level: 'critical', category: 'Cláusula Antiabuso / Fraude',
        message: 'Uso considerado abusivo pode resultar em suspensão ou cancelamento da conta e das milhas.',
        patterns: [
            /(suspen[s]ão|cancelamento|bloqueio)\s*(da\s*)?(conta|cadastro)\s*(por|em\s*caso\s*de)/i,
            /abuso\s*(do\s*)?(sistema|programa|promoção)/i,
            /uso\s*(indevido|abusivo|fraudulento)/i,
            /atividade\s*(suspeita|fraudulenta|irregular)/i,
            /\bfraude\b/i,
            /transferência\s*(suspeita|fraudulenta)/i,
            /monitoramento\s*(de\s*)?transações?/i,
            /cancelamento\s*(das?\s*)?(milhas?|pontos?)\s*(em\s*caso|por)\s*(de\s*)?(fraude|abuso|irregularidade)/i,
        ],
    },

    // ─── PRAZO DE CRÉDITO (QUANDO AS MILHAS CHEGAM) ──────────────────────────
    {
        level: 'warning', category: 'Prazo para Crédito das Milhas',
        message: 'As milhas (e o bônus) podem demorar dias ou semanas para serem creditados na conta.',
        patterns: [
            /\d+\s*(dias?\s*úteis?|dias?\s*corridos?)\s*(para|até)\s*(credit|estorno|depositar|aparecer)/i,
            /creditad[ao]s?\s*(em\s*(até|prazo\s*de))?\s*\d+\s*(dias?|horas?)/i,
            /prazo\s*(de|para)\s*(crédito|creditação|processar|processamento)\s*(de|é\s*(de\s*)?)?\d+\s*(dias?)/i,
            /bônus\s*(será\s*)?creditad[ao]\s*(em\s*até|dentro\s*de)\s*\d+\s*(dias?|semanas?)/i,
            /até\s*\d+\s*dias?\s*(para\s*)?(as?\s*)?milhas?\s*(aparecerem?|serem?\s*creditadas?)/i,
        ],
    },

    // ─── CPF / SITUAÇÃO FISCAL ───────────────────────────────────────────────
    {
        level: 'warning', category: 'CPF Regular / Situação Fiscal',
        message: 'Pode exigir CPF em situação regular junto à Receita Federal.',
        patterns: [
            /cpf\s*(em\s*situação\s*regular|regular|sem\s*restrições?)/i,
            /situação\s*regular\s*(junto\s*(à|a)\s*)?(receita\s*federal|srf|fisco)/i,
            /restrições?\s*(fiscais?|no\s*cpf)/i,
            /cpf\s*(ativo|devidamente\s*regularizado)/i,
        ],
    },

    // ─── PARTICIPAÇÃO LIMITADA / SORTEIO ─────────────────────────────────────
    {
        level: 'warning', category: 'Vagas Limitadas',
        message: 'A promoção pode ter vagas ou participações limitadas — pode acabar antes do prazo.',
        patterns: [
            /vagas?\s*(limitadas?|disponíveis?)/i,
            /até\s*(o\s*)?(esgotamento\s*(do\s*)?estoque|limite\s*(de\s*)?vagas?)/i,
            /enquanto\s*(houver\s*)?(vagas?|estoque|disponibilidade)/i,
            /limitado\s*(a\s*)?\d+\s*(participantes?|clientes?|pessoas?)/i,
            /primeiros?\s*\d+\s*(participantes?|clientes?|pessoas?)/i,
            /por\s*ordem\s*(de|de\s*chegada)/i,
        ],
    },

    // ─── CONTA COMPARTILHADA / FAMILIAR ──────────────────────────────────────
    {
        level: 'warning', category: 'Restrição de Conta Familiar',
        message: 'Contas vinculadas, de menores ou compartilhadas podem não ser elegíveis.',
        patterns: [
            /conta\s*(familiar|compartilhada)\s*(não\s*)?(elegível|participante)/i,
            /titulares?\s*(exclusivos?|individuais?)/i,
            /não\s*(elegível|participante)\s*(para\s*)?(contas?\s*(familiares?|menores?|compartilhadas?))/i,
            /apenas\s*para\s*(maiores\s*(de\s*18|de\s*idade))/i,
            /\bmenores?\s*de\s*18\b/i,
        ],
    },

    // ─── PROGRAMA DIFERENTE DO ESPERADO ──────────────────────────────────────
    {
        level: 'critical', category: 'Conversão em Programa Diferente',
        message: 'As milhas podem ser creditadas em um programa diferente do esperado — verifique o programa de destino.',
        patterns: [
            /convertid[ao]s?\s*(para|em)\s*(milhas?|pontos?)\s*(do\s*)?\w+\s*(e\s*não|ao\s*invés)/i,
            /programa\s*(de\s*)?destino\s*(diferente|específico)/i,
            /crédito\s*(em|no)\s*programa\s*(parceiro|diferente)/i,
            /milhas?\s*(serão\s*)?creditadas?\s*(em|no|para)\s*(programa\s*)?(parceiro|diferente|terceiro)/i,
        ],
    },

    // ─── UPGRADE / CLASSE EXECUTIVA ───────────────────────────────────────────
    {
        level: 'warning', category: 'Não Válido para Upgrade ou Executiva',
        message: 'As milhas podem não ser válidas para resgates de upgrade ou classe executiva.',
        patterns: [
            /não\s*(válid[ao]s?|elegíveis?)\s*(para\s*)?(upgrades?|classe\s*(executiva|business|first))/i,
            /não\s*(permite|possibilita|pode\s*ser\s*usado)\s*(para\s*)?upgrade/i,
            /upgrades?\s*(não\s*)?(disponíveis?|inclusos?)/i,
            /excluso\s*(de\s*)?upgrades?/i,
        ],
    },

    // ─── APROVAÇÃO / CRITÉRIOS SUBJETIVOS ─────────────────────────────────────
    {
        level: 'warning', category: 'Aprovação Sujeita a Critério da Empresa',
        message: 'A participação pode depender de aprovação ou critérios internos da empresa.',
        patterns: [
            /a\s*critério\s*(exclusivo\s*)?(da\s*empresa|da\s*companhia|do\s*programa|\w+)/i,
            /aprovação\s*(prévia|interna|da\s*empresa)/i,
            /empresa\s*(se\s*reserva\s*(o\s*)?direito|pode\s*(recusar|negar|não\s*aprovar))/i,
            /participação\s*(sujeita\s*a|condicionada\s*a)\s*(aprovação|análise|critérios?)/i,
            /poderá\s*(ser\s*)?(recusado|negado|cancelado)\s*(sem|a\s*qualquer)/i,
        ],
    },

    // ─── RESTRIÇÃO GEOGRÁFICA ─────────────────────────────────────────────────
    {
        level: 'warning', category: 'Restrição por Estado / País',
        message: 'A promoção pode não ser válida em todos os estados ou países.',
        patterns: [
            /não\s*(válid[ao]|disponível)\s*(em|para\s*residentes?\s*(de|do|em))\s*(todo[s]?\s*(o\s*)?brasil|alguns?\s*estados?)/i,
            /exceto\s*(para\s*residentes?\s*(de|do|em))\s*\w+/i,
            /exclusivo\s*para\s*residentes?\s*(no|em|do)\s*(brasil|são\s*paulo|\w+)/i,
            /restrições?\s*(geográficas?|por\s*(estado|região|país))/i,
        ],
    },

    // ─── TEMPO DE ESPERA APÓS TRANSFERÊNCIA ──────────────────────────────────
    {
        level: 'warning', category: 'Período de Carência / Quarentena',
        message: 'Pode haver um período de espera antes de usar as milhas após a transferência.',
        patterns: [
            /período\s*(de\s*)?(carência|quarentena|bloqueio)\s*(de\s*)?\d+\s*(dias?|meses?)/i,
            /aguardar\s*(o\s*)?prazo\s*(de\s*)?\d+\s*(dias?|meses?)\s*(para\s*)?(usar|utilizar|resgatar)/i,
            /milhas?\s*(ficam\s*)?bloqueadas?\s*(por\s*)?\d+\s*(dias?|meses?)/i,
            /\d+\s*(dias?|meses?)\s*(de\s*)?(bloqueio|espera|carência)\s*(após|depois\s*(da|de))\s*transferência/i,
        ],
    },

    // ─── INFORMAÇÕES INCOMPLETAS ──────────────────────────────────────────────
    {
        level: 'info', category: 'Termos Incompletos / Regulamento Separado',
        message: 'O regulamento completo pode estar em outro documento — leia o regulamento integral antes de transferir.',
        patterns: [
            /regulamento\s*(completo|integral|detalhado)\s*(disponível|publicado|acessível)\s*(em|no|na)/i,
            /consulte\s*(o\s*)?regulamento/i,
            /termos?\s*(e\s*condições?\s*)?(completos?|integrais?)\s*(disponíveis?|em)/i,
            /acesse\s*(o\s*)?regulamento\s*(completo|integral)/i,
            /demais\s*(termos?|condições?|regras?)\s*(constam|estão|disponíveis?)\s*(em|no|na|no\s*site)/i,
        ],
    },
    {
        level: 'info', category: 'Foro / Arbitragem',
        message: 'Disputas podem ser resolvidas em foro específico ou arbitragem.',
        patterns: [
            /foro\s*(da\s*comarca|competente|eleito)/i,
            /arbitragem/i,
            /resolução\s*(de\s*)?conflitos?\s*(via|por)\s*(mediação|arbitragem)/i,
            /câmara\s*(de\s*)?arbitragem/i,
        ],
    },
];

function extractExcerpt(text: string, pattern: RegExp, context = 80): string {
    const match = pattern.exec(text);
    if (!match) return '';
    const start = Math.max(0, match.index - context);
    const end = Math.min(text.length, match.index + match[0].length + context);
    let excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    return excerpt;
}

export function analyzeTC(text: string): RuleMatch[] {
    if (!text.trim()) return [];
    const results: RuleMatch[] = [];

    for (const rule of RULES) {
        const excerpts: string[] = [];
        let matched = false;

        for (const pattern of rule.patterns) {
            // Reset lastIndex if global flag is set
            pattern.lastIndex = 0;
            if (pattern.test(text)) {
                matched = true;
                const excerpt = extractExcerpt(text, pattern);
                if (excerpt && !excerpts.includes(excerpt)) {
                    excerpts.push(excerpt);
                }
            }
        }

        if (matched) {
            results.push({
                level: rule.level,
                category: rule.category,
                message: rule.message,
                excerpts: excerpts.slice(0, 2), // max 2 excerpts per rule
            });
        }
    }

    // Sort: critical first, then warning, then info
    const order: Record<RiskLevel, number> = { critical: 0, warning: 1, info: 2 };
    results.sort((a, b) => order[a.level] - order[b.level]);

    return results;
}

// ─── STRUCTURED DATA EXTRACTION ──────────────────────────────────────────────

export type FactFieldKey = 'bonus' | 'teto' | 'conversao';

export interface ExtractedFact {
    label: string;
    value: string;
    icon: string;
    fieldKey?: FactFieldKey;
    rawValue?: number;
}

function normalizeNum(s: string): number {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function fmtNum(n: number): string {
    return n.toLocaleString('pt-BR');
}

// Find all dates (dd/mm/yyyy or "dd de mês yyyy") with optional time
interface DateOccurrence { pos: number; dateStr: string; timeStr?: string; }

const MONTHS = 'janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro';
const DATE_RE = new RegExp(
    `(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}|\\d{1,2}[°º]?\\s*de\\s*(?:${MONTHS})\\s*(?:de\\s*)?\\d{4})`,
    'gi'
);
const TIME_RE = /às?\s*(\d{1,2}[h:]\d{2}|\d{1,2}h)/i;

function findAllDates(text: string): DateOccurrence[] {
    const results: DateOccurrence[] = [];
    const re = new RegExp(DATE_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const pos = m.index;
        const dateStr = m[1].replace(/\s+/g, ' ').trim();
        // look for time in next 50 chars
        const after = text.slice(pos + dateStr.length, pos + dateStr.length + 55);
        const tm = TIME_RE.exec(after);
        results.push({ pos, dateStr, timeStr: tm?.[1] });
    }
    return results;
}

const START_KW = /(?:de|a partir de|início|começa|válid[ao]\s*(?:de|a\s*partir)|período[:\s]*de|transferência[:\s]*de)/i;
const END_KW   = /(?:até|a\s*(?:\d|até)|fim|encerra|término|termina|válid[ao]\s*até|finaliza)/i;

export function extractFacts(text: string): ExtractedFact[] {
    if (!text.trim()) return [];
    const facts: ExtractedFact[] = [];
    const t = text;

    // ── Campaign dates ─────────────────────────────────────────────────────
    const dates = findAllDates(t);
    let startFound = false, endFound = false;
    for (const d of dates) {
        const before = t.slice(Math.max(0, d.pos - 60), d.pos);
        const timeStr = d.timeStr ? ` às ${d.timeStr}` : '';
        if (!startFound && START_KW.test(before)) {
            facts.push({ label: 'Início', value: d.dateStr + timeStr, icon: 'event' });
            startFound = true;
        } else if (!endFound && END_KW.test(before)) {
            facts.push({ label: 'Fim', value: d.dateStr + timeStr, icon: 'event_busy' });
            endFound = true;
        }
    }
    // fallback: if 2+ dates and neither classified, use first=start last=end
    if (!startFound && !endFound && dates.length >= 2) {
        const s = dates[0]; const e = dates[dates.length - 1];
        facts.push({ label: 'Início', value: s.dateStr + (s.timeStr ? ` às ${s.timeStr}` : ''), icon: 'event' });
        facts.push({ label: 'Fim',    value: e.dateStr + (e.timeStr ? ` às ${e.timeStr}` : ''), icon: 'event_busy' });
    } else if (!startFound && !endFound && dates.length === 1) {
        const d = dates[0];
        facts.push({ label: 'Data', value: d.dateStr + (d.timeStr ? ` às ${d.timeStr}` : ''), icon: 'event' });
    }

    // ── Bonus cap ─────────────────────────────────────────────────────────
    const capRe = /(?:limite|máximo|teto|cap)\s*(?:de\s*)?(?:bônus\s*)?(?:de\s*)?(\d[\d.,]*)\s*(?:mil\b)?\s*(?:milhas?|pontos?|pts?)/gi;
    const capM = capRe.exec(t);
    if (capM) {
        const raw = normalizeNum(capM[1]);
        const inMil = /\bmil\b/i.test(capM[0]);
        const num = isNaN(raw) ? 0 : (inMil ? raw * 1000 : raw);
        if (num > 0) facts.push({ label: 'Teto de bônus', value: `${fmtNum(num)} milhas`, icon: 'trending_flat', fieldKey: 'teto', rawValue: num / 1000 });
    }

    // ── Bonus tiers ────────────────────────────────────────────────────────
    // "ConnectMiles recebem 55% de Bônus"
    const tierRe = /([A-ZÀ-Ÿa-zà-ÿ][^\n.;]{2,60?}?)\s+recebem?\s+(\d+)\s*%\s*(?:de\s*)?bônus/gi;
    let tierM: RegExpExecArray | null;
    let firstBonusPct: number | null = null;
    while ((tierM = tierRe.exec(t)) !== null) {
        const label = tierM[1].trim().slice(0, 40);
        const pct = parseInt(tierM[2]);
        if (firstBonusPct === null) firstBonusPct = pct;
        facts.push({ label: `Bônus — ${label}`, value: `${pct}%`, icon: 'percent', fieldKey: 'bonus', rawValue: pct });
    }
    // Fallback: bare "X% de bônus"
    if (firstBonusPct === null) {
        const simpleRe = /(\d+)\s*%\s*(?:de\s*)?bônus/gi;
        let sm: RegExpExecArray | null;
        const seen = new Set<number>();
        while ((sm = simpleRe.exec(t)) !== null) {
            const pct = parseInt(sm[1]);
            if (!seen.has(pct)) {
                seen.add(pct);
                if (firstBonusPct === null) firstBonusPct = pct;
                facts.push({ label: 'Bônus', value: `${pct}%`, icon: 'percent', fieldKey: 'bonus', rawValue: pct });
            }
        }
    }

    // ── Conversion rate ────────────────────────────────────────────────────
    const convRe  = /(\d+(?:[.,]\d+)?)\s*pontos?\s*(?:\w+\s*)?equivalem?\s*a\s*(\d+(?:[.,]\d+)?)\s*milhas?/gi;
    const convRe2 = /(\d+(?:[.,]\d+)?)\s*(?:pontos?|pts?)\s*[=:]\s*(\d+(?:[.,]\d+)?)\s*milhas?/gi;
    const convM = convRe.exec(t) ?? convRe2.exec(t);
    if (convM) {
        const pts = normalizeNum(convM[1]);
        const mls = normalizeNum(convM[2]);
        const rate = pts / mls; // pontos por milha
        facts.push({ label: 'Conversão', value: `${convM[1]} pts = ${convM[2]} milha`, icon: 'swap_horiz', fieldKey: 'conversao', rawValue: rate });
    }

    // ── Minimum points without club ────────────────────────────────────────
    const minSemRe = /mínimo\s*(?:somente\s*com\s*pontos?\s*)?(?:para\s*clientes?\s*sem\s*clube\s*\w+\s*|sem\s*clube\s*\w+\s*)?[:\s]*(\d[\d.,]*)\s*(?:mil\b)?\s*(?:pontos?|pts?|milhas?)/gi;
    const minSemM = minSemRe.exec(t);
    if (minSemM) {
        const raw = normalizeNum(minSemM[1]);
        const inMil = /\bmil\b/i.test(minSemM[0]);
        const num = isNaN(raw) ? 0 : (inMil ? raw * 1000 : raw);
        if (num > 0) facts.push({ label: 'Mínimo sem clube', value: `${fmtNum(num)} pontos`, icon: 'remove_circle' });
    }

    // ── Minimum points with cash ───────────────────────────────────────────
    const minDinhRe = /mínimo\s*com\s*(?:pontos?\s*(?:e|&|e\s*dinheiro|&\s*dinheiro)|dinheiro)\s*[:\s]*(\d[\d.,]*)\s*(?:mil\b)?\s*(?:pontos?|pts?|milhas?)/gi;
    const minDinhM = minDinhRe.exec(t);
    if (minDinhM) {
        const raw = normalizeNum(minDinhM[1]);
        const inMil = /\bmil\b/i.test(minDinhM[0]);
        const num = isNaN(raw) ? 0 : (inMil ? raw * 1000 : raw);
        if (num > 0) facts.push({ label: 'Mínimo Pontos+Dinheiro', value: `${fmtNum(num)} pontos`, icon: 'payments' });
    }

    // ── Processing time ────────────────────────────────────────────────────
    const procRe = /(?:prazo|disponibilizar?|creditad[ao]s?|crédito)[^\n]{0,50?}?(?:até|em|de)?\s*(\d+)\s*(dias?\s*úteis?|dias?\s*corridos?|horas?)/gi;
    const procM = procRe.exec(t);
    if (procM) facts.push({ label: 'Prazo de crédito', value: `até ${procM[1]} ${procM[2]}`, icon: 'schedule' });

    // ── Club period requirement ────────────────────────────────────────────
    const clubRe = /clube\s*\w*\s*(?:precisa?\s*(?:estar|ficar)\s*)?ativo\s*durante\s*(?:todo\s*(?:o\s*)?)?período/gi;
    if (clubRe.test(t)) facts.push({ label: 'Clube obrigatório', value: 'Ativo durante todo o período', icon: 'warning' });

    return facts;
}
