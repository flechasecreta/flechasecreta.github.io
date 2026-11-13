// Fonte de dados do Painel CBIC.
// O aplicativo só conversa com Fonte.carregar(), que devolve sempre o mesmo formato:
//   { demo, atualizacao: {pagamentos, receitas},
//     pagamentos: [{m:'2026-01', g:grupo, c:centro de custo, p:conta, f:credor, k:classificação do fluxo, dg:departamento, v:líquido, n:lançamentos}],
//     receitas:   [{m, g, c, p, f:cliente, k, v, n}],
//     planejado:  linhas da planilha de fluxo (tipo META/R/D, m1..m12),
//     orcamento:  [{tipo:'Receita'|'Despesa', grupo, anual}] }
// Hoje: modo "demo" (arquivo dados-demo.json, valores fictícios).
// Fase 2 (com a TI): modo "supabase" — login por e-mail @cbic.org.br (Supabase Auth) e leitura de visões
// com esses mesmos campos, protegidas por RLS. Só este arquivo muda; o resto do app continua igual.
window.Fonte = (() => {
  const cfg = Object.assign({ modo: 'demo', arquivo: 'dados-demo.json' }, window.PAINEL_CFG || {});

  async function demo() {
    const r = await fetch(cfg.arquivo, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Não foi possível ler ' + cfg.arquivo);
    return r.json();
  }

  async function supabase() {
    // Esboço para a fase 2. Visões esperadas (a TI cria no Supabase): painel_pagamentos, painel_receitas,
    // painel_planejado, painel_orcamento e painel_atualizacao, cada uma já no formato acima.
    if (!cfg.url || !cfg.chave || !cfg.token) throw new Error('Faça login para ver os dados.');
    const get = async (visao) => {
      const r = await fetch(`${cfg.url}/rest/v1/${visao}?select=*`, { headers: { apikey: cfg.chave, Authorization: `Bearer ${cfg.token}` } });
      if (!r.ok) throw new Error(`Falha ao ler ${visao} (${r.status})`);
      return r.json();
    };
    const [pagamentos, receitas, planejado, orcamento, atu] = await Promise.all(
      ['painel_pagamentos', 'painel_receitas', 'painel_planejado', 'painel_orcamento', 'painel_atualizacao'].map(get));
    return { demo: false, atualizacao: atu[0] || {}, pagamentos, receitas, planejado, orcamento };
  }

  return { modo: cfg.modo, carregar: () => (cfg.modo === 'supabase' ? supabase() : demo()) };
})();
