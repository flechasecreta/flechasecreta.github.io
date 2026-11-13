// Painel CBIC — aplicativo web (protótipo de 13/11/2026).
// Barra de baixo com 4 áreas; em cada área, sub-abas que cabem numa tela (deslize para trocar).
// Só a área central rola. Tabelas: tela própria, toque para tela cheia, sugestão de girar o celular.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const brl2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Filtros com vários itens (13/11/2026, igual ao painel oficial): vazio = todos; um nome = só ele;
  // '{"fora":[...]}' = todos menos estes; '{"so":[...]}' = só estes.
  const F = (() => {
    const cache = new Map();
    const ler = (v) => {
      if (v == null || v === '') return null; if (cache.has(v)) return cache.get(v);
      let f = { so: new Set([v]) };
      if (typeof v === 'string' && v[0] === '{') { try { const o = JSON.parse(v); if (Array.isArray(o.fora)) f = { fora: new Set(o.fora) }; else if (Array.isArray(o.so)) f = { so: new Set(o.so) }; } catch (e) { /* */ } }
      if (cache.size > 50) cache.clear(); cache.set(v, f); return f;
    };
    return {
      ler,
      casa(v, x) { const f = ler(v); return !f || (f.so ? f.so.has(x) : !f.fora.has(x)); },
      gravar(marcados, todos) {
        const m = new Set(marcados); if (m.size === todos.length) return null; if (!m.size) return JSON.stringify({ so: [] }); if (m.size === 1) return [...m][0];
        const fora = todos.filter((t) => !m.has(t)); return fora.length < m.size ? JSON.stringify({ fora }) : JSON.stringify({ so: [...m] });
      },
      texto(v, curto) {
        const f = ler(v); if (!f) return null; curto = curto || ((s) => s);
        if (f.so) { const l = [...f.so]; return !l.length ? 'nenhum' : l.length === 1 ? curto(l[0]) : l.length === 2 ? l.map(curto).join(' e ') : `${l.length} marcados`; }
        const l = [...f.fora]; return l.length === 1 ? 'todos menos ' + curto(l[0]) : `todos menos ${l.length}`;
      },
    };
  })();
  const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
  const int = new Intl.NumberFormat('pt-BR');
  const compact = (v) => {
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
    if (a >= 1e4) return s + 'R$ ' + (a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
    return s + brl.format(a);
  };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesCurto = (m) => MESES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4);
  const mesLongo = (m) => MESES[+m.slice(5, 7) - 1] + '/' + m.slice(0, 4);
  const addM = (m, k) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1)); return d.toISOString().slice(0, 7); };
  const ccNome = (c) => String(c).trim().replace(/^\d+\s-\s/, '');
  const contaNome = (c) => String(c).replace(/^[\d.]+\s-\s/, '');
  const codigo = (c) => (String(c).match(/^[\d.]+/) || [''])[0];
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const tira = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const GRUPOS = ['CBIC Institucional', 'Convênio SESI', 'Convênio SENAI', 'Convênio ENBPar'];
  const corG = (g) => ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)'][Math.max(0, GRUPOS.indexOf(g))];
  const grupoOk = (g, sel) => sel === 'Todos' || (sel === 'Convênios' ? g !== 'CBIC Institucional' : g === sel);
  const DEPS = ['Diretoria', 'Administrativo / Financeiro', 'Projetos Convênios', 'Projetos CBIC', 'Relações Institucionais', 'Parcerias / Eventos', 'Comunicação', 'Transitório'];
  const guarda = { get: (k) => { try { return JSON.parse(localStorage.getItem('painel-cbic:' + k)); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem('painel-cbic:' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } } };

  // ---------- estado ----------
  const AREAS = {
    fluxo: { titulo: 'Fluxo de caixa', cor: 'var(--flx)', subs: [['resumo', 'Resumo'], ['saldo', 'Saldo mês a mês'], ['mes', 'Mês'], ['tabela', 'Tabela']] },
    desp: { titulo: 'Despesas', cor: 'var(--cbic)', subs: [['resumo', 'Resumo'], ['mensal', 'Mês a mês'], ['dep', 'Departamentos'], ['cc', 'Centros'], ['conta', 'Contas'], ['cred', 'Credores'], ['tabela', 'Tabela']] },
    rec: { titulo: 'Receitas', cor: 'var(--rec)', subs: [['resumo', 'Resumo'], ['mensal', 'Mês a mês'], ['conta', 'Contas'], ['cli', 'Clientes'], ['tabela', 'Tabela']] },
    orc: { titulo: 'Orçamento', cor: 'var(--orc)', subs: [['resumo', 'Resumo'], ['rec', 'Receitas'], ['desp', 'Despesas'], ['tabela', 'Tabela']] },
    ajuda: { titulo: 'Ajuda', cor: 'var(--aju)', subs: [['uso', 'Como usar'], ['abas', 'As abas'], ['faq', 'Perguntas frequentes'], ['fale', 'Fale com o administrador']] },
    admin: { titulo: 'Administrador', cor: 'var(--adm)', subs: [['resumo', 'Resumo'], ['msgs', 'Mensagens'], ['uso', 'Acessos'], ['erros', 'Erros']] },
  };
  const S = Object.assign({ area: 'fluxo', sub: { fluxo: 'resumo', desp: 'resumo', rec: 'resumo', orc: 'resumo', ajuda: 'uso', admin: 'resumo' },
    f: { grupo: 'Todos', de: null, ate: null, cc: null, conta: null, dep: null }, fx: { ano: null, corte: null, mes: null }, piv: 'dg', giroOk: false }, guarda.get('estado') || {});
  S.sub = Object.assign({ fluxo: 'resumo', desp: 'resumo', rec: 'resumo', orc: 'resumo', ajuda: 'uso', admin: 'resumo' }, S.sub);
  if (!AREAS[S.area]) S.area = 'fluxo';
  S.f = Object.assign({ grupo: 'Todos', de: null, ate: null, cc: null, conta: null, dep: null }, S.f);
  let D = null, MESES_DADOS = [];
  const salva = () => guarda.set('estado', { area: S.area, sub: S.sub, f: S.f, piv: S.piv });

  // ---------- moldura ----------
  const main = $('main');
  function moldura() {
    const A = AREAS[S.area];
    document.documentElement.style.setProperty('--tc', A.cor);
    $('titulo').textContent = A.titulo;
    $('subtabs').replaceChildren(...A.subs.map(([id, nome]) => {
      const b = el('button', null, nome); b.type = 'button';
      if (S.sub[S.area] === id) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => irSub(id));
      return b;
    }));
    const on = $('subtabs').querySelector('[aria-current]');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    const naBarra = S.area === 'admin' ? 'ajuda' : S.area;
    [...$('tabbar').children].forEach((b) => { if (b.dataset.area === naBarra) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('b-filtros').hidden = S.area === 'ajuda' || S.area === 'admin';
    escopo(); chips();
  }
  function periodoTxt() { return S.f.de === S.f.ate ? mesLongo(S.f.de) : `${mesCurto(S.f.de)} a ${mesCurto(S.f.ate)}`; }
  function escopo() {
    if (S.area === 'ajuda') { $('escopo').textContent = 'Como usar o Painel CBIC'; return; }
    if (S.area === 'admin') { $('escopo').textContent = Servidor.admin() ? 'Área restrita · conectado' : 'Área restrita'; return; }
    if (!D) return;
    const g = S.f.grupo === 'Todos' ? 'todos os grupos' : S.f.grupo;
    $('escopo').textContent = S.area === 'fluxo' ? `Ano ${S.fx.ano || ''} · ${S.f.grupo === 'Todos' ? 'CBIC Institucional' : S.f.grupo} ▾` : `${periodoTxt()} · ${g} ▾`;
    const n = ['cc', 'conta', 'dep', 'rconta'].filter((k) => S.f[k]).length + (S.f.grupo !== 'Todos' ? 1 : 0);
    $('f-cnt').hidden = !n; $('f-cnt').textContent = n;
  }
  function chips() {
    const box = $('chips'); box.replaceChildren();
    const add = (txt, k) => { const c = el('button', 'chip'); c.type = 'button'; c.append(el('span', null, txt), el('b', null, '×')); c.addEventListener('click', () => { S.f[k] = k === 'grupo' ? 'Todos' : null; mudou(); }); box.append(c); };
    if (S.f.grupo !== 'Todos') add(S.f.grupo, 'grupo');
    if (S.f.cc && S.area !== 'orc') add('Centro: ' + F.texto(S.f.cc, ccNome), 'cc');
    if (S.f.conta && S.area === 'desp') add('Conta: ' + F.texto(S.f.conta, contaNome), 'conta');
    if (S.f.dep && S.area === 'desp') add('Depto: ' + F.texto(S.f.dep), 'dep');
    if (S.f.rconta && S.area === 'rec') add('Conta: ' + F.texto(S.f.rconta, contaNome), 'rconta');
  }
  function irArea(a) { if (a === S.area) { irSub(AREAS[a].subs[0][0]); return; } if ($('app').classList.contains('full')) { $('app').classList.remove('full'); main.classList.remove('cheia'); } S.area = a; salva(); moldura(); render(true); Servidor.acesso(S.area, S.sub[S.area]); }
  function irSub(s) { S.sub[S.area] = s; salva(); moldura(); render(true); Servidor.acesso(S.area, s); }
  function mudou() { salva(); escopo(); chips(); render(false); }
  [...$('tabbar').children].forEach((b) => b.addEventListener('click', () => irArea(b.dataset.area)));

  // deslizar o dedo na área central troca de sub-aba (exceto dentro de tabelas, gráficos e listas horizontais)
  (() => {
    let x0 = 0, y0 = 0, t0 = 0, ok = false;
    main.addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); ok = !e.target.closest('.tbox, .hs, .graf, input, select'); }, { passive: true });
    main.addEventListener('touchend', (e) => {
      if (!ok || $('app').classList.contains('full')) return;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 70 || Math.abs(dy) > 45 || Date.now() - t0 > 600) return;
      const subs = AREAS[S.area].subs.map((s) => s[0]); const i = subs.indexOf(S.sub[S.area]);
      const j = dx < 0 ? i + 1 : i - 1;
      if (j >= 0 && j < subs.length) irSub(subs[j]);
    }, { passive: true });
  })();

  // ---------- filtros (folha de baixo) ----------
  const veu = $('veu');
  function abre(sh) { veu.hidden = false; sh.hidden = false; }
  function fecha() { veu.hidden = true; document.querySelectorAll('.sheet').forEach((s) => { s.hidden = true; }); }
  veu.addEventListener('click', fecha);
  document.querySelectorAll('[data-fecha]').forEach((b) => b.addEventListener('click', fecha));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fecha(); $('app').classList.remove('full'); } });
  const abreFiltros = () => { montaFiltros(); abre($('sh-filtros')); };
  $('b-filtros').addEventListener('click', abreFiltros);
  $('escopo').addEventListener('click', abreFiltros);
  $('f-limpar').addEventListener('click', () => { S.f = { grupo: 'Todos', de: S.f.de, ate: S.f.ate, cc: null, conta: null, dep: null, rconta: null }; padraoPeriodo(true); montaFiltros(); mudou(); });

  function padraoPeriodo(forca) {
    const ult = MESES_DADOS[MESES_DADOS.length - 1];
    if (forca || !S.f.de || !MESES_DADOS.includes(S.f.de) || !MESES_DADOS.includes(S.f.ate)) { S.f.ate = ult; S.f.de = ult.slice(0, 4) + '-01'; if (!MESES_DADOS.includes(S.f.de)) S.f.de = MESES_DADOS[0]; }
  }
  function seg(box, ops, atual, fn) {
    box.replaceChildren(...ops.map(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(v === atual)); b.addEventListener('click', () => fn(v)); return b; }));
  }
  function montaFiltros() {
    seg($('f-grupo'), [['Todos', 'Todos'], ['CBIC Institucional', 'Institucional'], ['Convênios', 'Convênios'], ['Convênio SESI', 'SESI'], ['Convênio SENAI', 'SENAI'], ['Convênio ENBPar', 'ENBPar']], S.f.grupo, (v) => { S.f.grupo = v; S.f.cc = null; montaFiltros(); mudou(); });
    const ult = MESES_DADOS[MESES_DADOS.length - 1], ano = ult.slice(0, 4);
    const rap = { ano: [ano + '-01', ult], m12: [addM(ult, -11), ult], ant: [(+ano - 1) + '-01', (+ano - 1) + '-12'], tudo: [MESES_DADOS[0], ult] };
    const atualR = Object.keys(rap).find((k) => rap[k][0] === S.f.de && rap[k][1] === S.f.ate) || '';
    seg($('f-rapido'), [['ano', 'Ano atual'], ['m12', '12 meses'], ['ant', 'Ano anterior'], ['tudo', 'Tudo']], atualR, (k) => { [S.f.de, S.f.ate] = rap[k].map((m) => (MESES_DADOS.includes(m) ? m : (m < MESES_DADOS[0] ? MESES_DADOS[0] : ult))); montaFiltros(); mudou(); });
    const opsM = MESES_DADOS.slice().reverse().map((m) => new Option(mesLongo(m), m));
    $('f-de').replaceChildren(...opsM.map((o) => o.cloneNode(true))); $('f-de').value = S.f.de;
    $('f-ate').replaceChildren(...opsM); $('f-ate').value = S.f.ate;
    document.querySelectorAll('#sh-filtros [data-so]').forEach((b) => { b.hidden = !b.dataset.so.split(' ').includes(S.area); });
    const base = D.pagamentos.filter((r) => grupoOk(r.g, S.f.grupo));
    const conjunto = {
      cc: [...new Set([...base, ...D.receitas.filter((r) => grupoOk(r.g, S.f.grupo))].map((r) => r.c))].sort((a, b) => ccNome(a).localeCompare(ccNome(b), 'pt')),
      conta: [...new Set(base.map((r) => r.p))].sort(),
      dep: DEPS.filter((d) => base.some((r) => r.dg === d)),
      rconta: [...new Set(D.receitas.filter((r) => grupoOk(r.g, S.f.grupo)).map((r) => r.p))].sort(),
    };
    const rot = { cc: ccNome, conta: (c) => c, dep: (d) => d, rconta: (c) => c };
    // caixas de marcar: todos marcados de início; desmarque o que não quer ver (mesma regra do painel oficial)
    document.querySelectorAll('#sh-filtros .busca').forEach((box) => {
      const k = box.dataset.campo, todos = conjunto[k];
      const marcados = () => { const f = F.ler(S.f[k]); return new Set(todos.filter((v) => !f || (f.so ? f.so.has(v) : !f.fora.has(v)))); };
      const grava = (m) => { S.f[k] = F.gravar([...m], todos); mudou(); };
      const inp = el('input'); inp.type = 'search'; inp.placeholder = k === 'dep' ? 'Buscar departamento' : 'Buscar (ex.: ' + (k === 'cc' ? 'ENIC' : k === 'rconta' ? 'emprést' : 'passag') + ')';
      const acoes = el('div', 'acoes'); const bT = el('button'); bT.type = 'button'; const bN = el('button'); bN.type = 'button'; const cont = el('span', 'cont'); acoes.append(bT, bN, cont);
      const ops = el('div', 'ops'); let achados = [];
      const lista = () => {
        const t = tira(inp.value), m = marcados();
        achados = todos.filter((v) => !t || tira(rot[k](v)).includes(t));
        const busca = !!t;
        bT.textContent = busca ? `Marcar os ${achados.length}` : 'Marcar todos'; bN.textContent = busca ? `Desmarcar os ${achados.length}` : 'Desmarcar todos';
        cont.textContent = `${m.size} de ${todos.length} marcados`; cont.classList.toggle('alerta', !m.size);
        ops.replaceChildren(...achados.slice(0, 400).map((v) => {
          const lin = el('div', 'op' + (m.has(v) ? ' on' : '')); lin.setAttribute('role', 'checkbox'); lin.setAttribute('aria-checked', String(m.has(v))); lin.tabIndex = 0;
          const so = el('button', 'so', 'só este'); so.type = 'button';
          so.addEventListener('click', (e) => { e.stopPropagation(); grava(new Set([v])); lista(); });
          lin.append(el('i', 'cx'), el('span', 'nm', rot[k](v)), so);
          const troca = () => { const mm = marcados(); if (mm.has(v)) mm.delete(v); else mm.add(v); grava(mm); lista(); };
          lin.addEventListener('click', troca); lin.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); troca(); } });
          return lin;
        }));
        if (!achados.length) ops.append(el('div', 'vazio', 'Nada encontrado.'));
      };
      bT.addEventListener('click', () => { const m = marcados(); achados.forEach((v) => m.add(v)); grava(m); lista(); });
      bN.addEventListener('click', () => { const m = marcados(); achados.forEach((v) => m.delete(v)); grava(m); lista(); });
      inp.addEventListener('input', lista); box.replaceChildren(inp, acoes, ops); lista();
    });
  }
  $('f-de').addEventListener('change', (e) => { S.f.de = e.target.value; if (S.f.ate < S.f.de) S.f.ate = S.f.de; montaFiltros(); mudou(); });
  $('f-ate').addEventListener('change', (e) => { S.f.ate = e.target.value; if (S.f.de > S.f.ate) S.f.de = S.f.ate; montaFiltros(); mudou(); });

  function detalhe(titulo, corpo) { $('sh-det-t').textContent = titulo; $('sh-det-b').replaceChildren(...corpo); abre($('sh-det')); }

  // ---------- recortes ----------
  const noPeriodo = (r) => r.m >= S.f.de && r.m <= S.f.ate;
  const pagBase = (semDep) => D.pagamentos.filter((r) => grupoOk(r.g, S.f.grupo) && F.casa(S.f.cc, r.c) && F.casa(S.f.conta, r.p) && (semDep || F.casa(S.f.dep, r.dg)));
  const recBase = (semConta) => D.receitas.filter((r) => grupoOk(r.g, S.f.grupo) && F.casa(S.f.cc, r.c) && (semConta || F.casa(S.f.rconta, r.p)));  // Conta de receita vale só para Receitas
  const mesesSel = () => MESES_DADOS.filter((m) => m >= S.f.de && m <= S.f.ate);

  // ---------- componentes ----------
  function kpi(k, v, s, cls, vcls) { const d = el('div', 'kpi' + (cls ? ' ' + cls : '')); d.append(el('div', 'k', k), el('div', 'v' + (vcls ? ' ' + vcls : ''), v), el('div', 's', s || '')); return d; }
  function grade(...k) { const g = el('div', 'kgrid'); g.append(...k); return g; }
  function card(titulo, nota, ...filhos) { const c = el('section', 'card'); if (titulo) c.append(el('h3', null, titulo)); if (nota) c.append(el('p', 'nota', nota)); c.append(...filhos); return c; }
  function lista(itens, total, { onClick, busca, max = 200, cor } = {}) {
    const frag = []; let q = '';
    const box = el('div', 'lista'); const mais = el('div', 'mais');
    const desenha = () => {
      const t = tira(q);
      const it = itens.filter((i) => !t || tira(i.label + ' ' + (i.sub || '')).includes(t));
      const maxV = d3.max(itens, (i) => Math.abs(i.v)) || 1;
      box.replaceChildren(...it.slice(0, max).map((i) => {
        const b = el('button', 'item'); b.type = 'button';
        const n = el('div', 'n', i.label); if (i.sub) n.append(el('small', null, i.sub));
        const v = el('div', 'val', compact(i.v)); v.append(el('small', null, i.extra || (total ? pct.format(i.v / total) : '')));
        const bar = el('div', 'bar'); const f = el('i'); f.style.width = (100 * Math.abs(i.v) / maxV).toFixed(1) + '%'; if (cor) f.style.background = cor; bar.append(f);
        b.append(n, v, bar);
        if (onClick) b.addEventListener('click', () => onClick(i)); else b.style.cursor = 'default';
        return b;
      }));
      if (!it.length) box.replaceChildren(el('div', 'vazio', 'Nada encontrado.'));
      mais.textContent = it.length > max ? `Mostrando ${max} de ${int.format(it.length)}. Use a busca para achar os demais.` : '';
    };
    if (busca) {
      const w = el('div', 'busca-lista'); const inp = el('input'); inp.type = 'search'; inp.placeholder = busca;
      inp.addEventListener('input', () => { q = inp.value; desenha(); }); w.append(inp); frag.push(w);
    }
    desenha(); frag.push(box, mais);
    return frag;
  }

  // gráfico de barras empilhadas por grupo, mês a mês
  function grafMensal(rows, meses, onPick) {
    const box = el('div', 'graf'); const leg = el('div', 'legenda');
    const grupos = GRUPOS.filter((g) => rows.some((r) => r.g === g));
    leg.append(...grupos.map((g) => { const s = el('span'); const i = el('i'); i.style.background = corG(g); s.append(i, g); return s; }));
    const por = d3.rollup(rows, (v) => d3.sum(v, (r) => r.v), (r) => r.m, (r) => r.g);
    const desenha = () => {
      const W = box.clientWidth; if (!W) return;
      const H = Math.max(200, Math.min(main.clientHeight - 140, W * 0.75, 420));
      const mg = { t: 10, r: 6, b: 24, l: 46 };
      const tot = meses.map((m) => d3.sum(grupos, (g) => por.get(m)?.get(g) || 0));
      const y = d3.scaleLinear([0, d3.max(tot) || 1], [H - mg.b, mg.t]).nice(4);
      const x = d3.scaleBand(meses, [mg.l, W - mg.r]).paddingInner(meses.length > 18 ? 0.15 : 0.3);
      const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H);
      const fy = (v) => v >= 1e6 ? (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
      svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--line)');
      svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', mg.l - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--mut)').attr('stroke', 'none').text((t) => (t ? fy(t) : '0'));
      const passo = Math.ceil(meses.length / Math.max(1, Math.floor((W - mg.l) / 44)));
      svg.append('g').selectAll('text').data(meses.filter((m, i) => i % passo === 0)).join('text').attr('x', (m) => x(m) + x.bandwidth() / 2).attr('y', H - 7).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--mut)').attr('stroke', 'none').text((m) => (meses.length > 12 ? mesCurto(m) : MESES[+m.slice(5, 7) - 1]));
      meses.forEach((m) => {
        let acc = 0;
        grupos.forEach((g) => { const v = por.get(m)?.get(g) || 0; if (v <= 0) return;
          svg.append('rect').attr('x', x(m)).attr('width', x.bandwidth()).attr('y', y(acc + v)).attr('height', Math.max(0.5, y(acc) - y(acc + v))).attr('fill', corG(g)).attr('stroke', 'none'); acc += v; });
      });
      svg.append('g').selectAll('rect').data(meses).join('rect').attr('x', (m) => x(m) - x.step() * 0.1).attr('width', x.step()).attr('y', 0).attr('height', H).attr('fill', 'transparent').attr('stroke', 'none').style('cursor', 'pointer')
        .on('click', (ev, m) => onPick && onPick(m));
      box.replaceChildren(svg.node());
    };
    requestAnimationFrame(desenha);
    box._redesenha = desenha;
    return [box, leg];
  }

  // tabela dinâmica: linhas × meses
  function pivot(rows, chave, rotulo, cab, meses, q) {
    const t = el('table');
    const por = d3.rollup(rows, (v) => d3.sum(v, (r) => r.v), chave, (r) => r.m);
    const tot = (k) => d3.sum(por.get(k).values());
    const t0 = tira(q || '');
    const ks = [...por.keys()].filter((k) => !t0 || tira(rotulo(k)).includes(t0)).sort((a, b) => tot(b) - tot(a));
    const f = (v) => (v ? num2.format(v) : '');
    const th = el('thead'); const hr = el('tr'); hr.append(el('th', null, cab)); meses.forEach((m) => hr.append(el('th', null, mesCurto(m)))); hr.append(el('th', 'tot', 'Total')); th.append(hr);
    const tb = el('tbody');
    ks.forEach((k) => { const tr = el('tr'); tr.append(el('td', null, rotulo(k))); meses.forEach((m) => tr.append(el('td', null, f(por.get(k).get(m) || 0)))); tr.append(el('td', 'tot', f(tot(k)))); tb.append(tr); });
    const tf = el('tfoot'); const fr = el('tr'); fr.append(el('td', null, 'Total'));
    const col = meses.map((m) => d3.sum(ks, (k) => por.get(k).get(m) || 0)); col.forEach((v) => fr.append(el('td', null, f(v)))); fr.append(el('td', null, f(d3.sum(col)))); tf.append(fr);
    t.append(th, tb, tf);
    return t;
  }

  // tela de tabela: sugestão de girar + caixa com rolagem; toque simples alterna a tela cheia
  function telaTabela(topo, tabela) {
    const frag = [];
    if (!S.giroOk) {
      const g = el('div', 'giro on');
      g.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="17" rx="2"/><path d="M3 15a9 9 0 0 0 7 7"/><path d="M3 19v-4h4"/></svg>';
      g.append(el('span', null, 'Gire o celular para ver mais meses. Toque na tabela para ampliar.'));
      const x = el('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Dispensar'); x.addEventListener('click', () => { S.giroOk = true; g.remove(); });
      g.append(x); frag.push(g);
    }
    const linha = el('div', 'tabtop');
    if (topo) linha.append(topo);
    const bf = el('button', 'btn'); bf.type = 'button';
    bf.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
    bf.append(document.createTextNode($('app').classList.contains('full') ? 'Sair' : 'Tela cheia'));
    bf.addEventListener('click', () => telaCheia());
    linha.append(bf); frag.push(linha);
    const box = el('div', 'tbox'); box.append(tabela);
    let x0 = 0, y0 = 0, t0 = 0, mexeu = false;
    box.addEventListener('touchstart', (e) => { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); mexeu = false; }, { passive: true });
    box.addEventListener('touchmove', (e) => { const p = e.touches[0]; if (Math.abs(p.clientX - x0) > 8 || Math.abs(p.clientY - y0) > 8) mexeu = true; }, { passive: true });
    box.addEventListener('touchend', () => { if (!mexeu && Date.now() - t0 < 350) telaCheia(); });
    frag.push(box);
    return frag;
  }
  function telaCheia(forcar) {
    const app = $('app'); const vai = forcar !== undefined ? forcar : !app.classList.contains('full');
    app.classList.toggle('full', vai); main.classList.toggle('cheia', vai);
    if (vai) S.giroOk = true;
    render(false);
  }

  // ================= FLUXO DE CAIXA =================
  const REC_FLUXO = (r) => {
    const c = codigo(r.p);
    if (c === '1.01.01.01') return 'Contribuições associativas';
    if (c === '1.01.05.02') return 'Contribuição extra';
    if (c === '1.01.02.01') return 'Convênio CNI';
    if (c === '1.01.02.02' || c === '1.01.02.03') return 'Convênios SESI / SENAI';
    if (c === '1.01.02.04') return 'Convênio ENBPar';
    if (c.startsWith('1.01.04')) return 'Patrocínios';
    if (c === '1.01.05.04') return 'Receita com cursos';
    if (c.startsWith('1.01.06')) return 'Receita com inscrições';
    if (c.startsWith('1.01.10')) return 'Reforma Tributária';
    if (c.startsWith('1.01.07')) return 'Vícios Construtivos';
    if (c.startsWith('1.01.08')) return 'Empréstimos bancários (entrada)';
    if (c.startsWith('1.01.03')) return 'Rendimentos de aplicações';
    if (c === '1.01.05.06') return 'Receitas de pequena monta';
    if (c.startsWith('1.01')) return 'Outras receitas';
    return 'Reembolsos e devoluções (transitórias)';
  };
  const SIGLAS = { cni: 'CNI', sesi: 'SESI', senai: 'SENAI', enbpar: 'ENBPar', iof: 'IOF', enic: 'ENIC', cbic: 'CBIC' };
  const ROTULO = (s) => { const t = String(s || '').trim(); if (t !== t.toUpperCase()) return t; const l = t.charAt(0) + t.slice(1).toLowerCase(); return l.replace(/[\p{L}]+/gu, (w) => SIGLAS[w.toLowerCase()] || w); };
  function calcFluxo() {
    const linhasPl = D.planejado || [];
    const meta = linhasPl.find((r) => r.tipo === 'META') || {};
    const plan = meta.ano ? { ano: String(meta.ano), saldo: Number(meta.saldo_inicial) || 0, arquivo: meta.arquivo,
      linhas: linhasPl.filter((r) => r.tipo === 'R' || r.tipo === 'D').map((r) => ({ tipo: r.tipo, rotulo: r.rotulo, classe: r.classe, meses: Array.from({ length: 12 }, (_, i) => Number(r['m' + (i + 1)]) || 0) })) } : null;
    const hoje = new Date(); const anoAtual = String(hoje.getFullYear());
    const anos = [...new Set([...MESES_DADOS.map((m) => m.slice(0, 4)), ...(plan ? [plan.ano] : [])])].sort();
    if (!S.fx.ano || !anos.includes(S.fx.ano)) S.fx.ano = anos.includes(anoAtual) ? anoAtual : anos[anos.length - 1];
    const ano = S.fx.ano;
    const mesesAno = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
    if (!S.fx.corte || !S.fx.corte.startsWith(ano)) S.fx.corte = ano < anoAtual ? `${ano}-12` : `${ano}-${String(hoje.getMonth()).padStart(2, '0')}`;
    const corte = S.fx.corte; const isReal = (m) => m <= corte;
    const grp = S.f.grupo === 'Todos' ? 'CBIC Institucional' : S.f.grupo;
    const temPlano = plan && plan.ano === ano && grp === 'CBIC Institucional';
    const noAno = (r) => r.m.startsWith(ano) && grupoOk(r.g, grp) && F.casa(S.f.cc, r.c);
    const agg = (rows, fn) => { const mp = new Map(); rows.forEach((r) => { const g = fn(r); if (!mp.has(g)) mp.set(g, new Map()); mp.get(g).set(r.m, (mp.get(g).get(r.m) || 0) + r.v); }); return mp; };
    const R = agg(D.receitas.filter(noAno), REC_FLUXO), Dp = agg(D.pagamentos.filter(noAno), (r) => r.k || 'Ajustar');
    const pl = temPlano ? plan.linhas : [];
    const linhas = (tipo, mapa) => {
      const out = [], vistos = new Set();
      pl.filter((l) => l.tipo === tipo).forEach((l) => { vistos.add(l.classe); out.push({ label: l.rotulo, classe: l.classe, plan: l.meses }); });
      [...mapa.keys()].filter((k) => !vistos.has(k)).sort().forEach((k) => out.push({ label: k, classe: k, plan: null }));
      return out.map((l) => ({ ...l, vals: mesesAno.map((m, i) => (isReal(m) ? (mapa.get(l.classe)?.get(m) || 0) : (l.plan ? l.plan[i] : 0))) }));
    };
    const LR = linhas('R', R), LD = linhas('D', Dp);
    const soma = (L) => mesesAno.map((_, i) => d3.sum(L, (l) => l.vals[i]));
    const rec = soma(LR), desp = soma(LD), res = rec.map((v, i) => v - desp[i]);
    const saldoIni = temPlano ? plan.saldo : 0;
    const fim = []; let s = saldoIni; res.forEach((v) => { s += v; fim.push(s); });
    const ini = mesesAno.map((_, i) => (i === 0 ? saldoIni : fim[i - 1]));
    if (!S.fx.mes || !S.fx.mes.startsWith(ano)) S.fx.mes = ano === anoAtual ? `${ano}-${String(hoje.getMonth() + 1).padStart(2, '0')}` : `${ano}-12`;
    return { ano, anos, mesesAno, corte, isReal, grp, temPlano, plan, LR, LD, rec, desp, res, fim, ini, saldoIni, nReal: mesesAno.filter(isReal).length };
  }
  function seletoresFluxo(F) {
    const w = el('div', 'linha-sel');
    const la = el('label', null, 'Ano'); const sa = el('select'); F.anos.forEach((a) => sa.append(new Option(a, a))); sa.value = F.ano; sa.addEventListener('change', () => { S.fx.ano = sa.value; S.fx.corte = null; S.fx.mes = null; escopo(); render(false); }); la.append(sa);
    const lc = el('label', null, 'Realizado até'); const sc = el('select'); sc.append(new Option('Nenhum (só planejado)', `${F.ano}-00`)); F.mesesAno.forEach((m) => sc.append(new Option(mesLongo(m), m))); sc.value = F.corte; sc.addEventListener('change', () => { S.fx.corte = sc.value; render(false); }); lc.append(sc);
    w.append(la, lc); return w;
  }
  const telas = {};
  telas.fluxo = {
    resumo() {
      const F = calcFluxo(); const sf = F.fim[11], tr = d3.sum(F.rec), td = d3.sum(F.desp), r = tr - td; const ate = F.nReal ? MESES[F.nReal - 1] : '—';
      return [seletoresFluxo(F), grade(
        kpi('Saldo final previsto em dezembro', compact(sf), F.temPlano ? `Começou o ano com ${compact(F.saldoIni)}` : 'Sem saldo inicial informado', 'hero', sf >= 0 ? 'pos' : 'neg'),
        kpi('Receitas no ano', compact(tr), `${compact(d3.sum(F.rec.slice(0, F.nReal)))} realizado até ${ate} · ${compact(d3.sum(F.rec.slice(F.nReal)))} planejado`),
        kpi('Despesas no ano', compact(td), `${compact(d3.sum(F.desp.slice(0, F.nReal)))} realizado até ${ate} · ${compact(d3.sum(F.desp.slice(F.nReal)))} planejado`),
        kpi('Resultado do ano', compact(r), 'Receitas − despesas', 'wide', r >= 0 ? 'pos' : 'neg')),
      el('p', 'nota', `Realizado do Sienge até o mês de corte; depois, o planejado. Grupo ${F.grp}, sem Conta Capital, transferências e aplicações.${F.temPlano ? '' : ' Sem planejado para este ano/grupo.'}`)];
    },
    saldo() {
      const F = calcFluxo();
      const box = el('div', 'graf');
      const desenha = () => {
        const W = box.clientWidth; if (!W) return;
        const H = Math.max(220, Math.min(main.clientHeight - 150, 440));
        const mg = { t: 14, r: 8, b: 24, l: 50 };
        const lo = Math.min(0, d3.min(F.res), d3.min(F.fim)), hi = Math.max(0, d3.max(F.res), d3.max(F.fim));
        const y = d3.scaleLinear([lo, hi], [H - mg.b, mg.t]).nice(4);
        const x = d3.scaleBand(F.mesesAno, [mg.l, W - mg.r]).paddingInner(0.3);
        const fy = (v) => { const a = Math.abs(v); return (v < 0 ? '−' : '') + (a >= 1e6 ? (a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : (a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil'); };
        const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H);
        svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', (t) => (t === 0 ? 'var(--mut)' : 'var(--line)'));
        svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', mg.l - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--mut)').attr('stroke', 'none').text((t) => (t ? fy(t) : '0'));
        svg.append('g').selectAll('text').data(F.mesesAno).join('text').attr('x', (m) => x(m) + x.bandwidth() / 2).attr('y', H - 7).attr('text-anchor', 'middle').attr('font-size', 11).attr('stroke', 'none')
          .attr('fill', (m) => (m === S.fx.mes ? 'var(--fg)' : 'var(--mut)')).attr('font-weight', (m) => (m === S.fx.mes ? 700 : 400)).text((m) => MESES[+m.slice(5, 7) - 1]);
        F.res.forEach((v, i) => { const m = F.mesesAno[i]; svg.append('rect').attr('x', x(m)).attr('width', x.bandwidth()).attr('y', y(Math.max(0, v))).attr('height', Math.max(1, Math.abs(y(v) - y(0)))).attr('rx', 2).attr('stroke', 'none')
          .attr('fill', v >= 0 ? 'var(--ok)' : 'var(--bad)').attr('fill-opacity', F.isReal(m) ? 0.85 : 0.35); });
        const pts = F.fim.map((v, i) => [x(F.mesesAno[i]) + x.bandwidth() / 2, y(v)]);
        const ln = d3.line();
        if (F.nReal) svg.append('path').attr('d', ln(pts.slice(0, F.nReal))).attr('stroke', 'var(--g1)').attr('stroke-width', 2.5);
        if (F.nReal < 12) svg.append('path').attr('d', ln(pts.slice(Math.max(0, F.nReal - 1)))).attr('stroke', 'var(--g1)').attr('stroke-width', 2.5).attr('stroke-dasharray', '5 4');
        pts.forEach((p, i) => svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 3.5).attr('fill', i < F.nReal ? 'var(--g1)' : 'var(--panel)').attr('stroke', 'var(--g1)'));
        svg.append('g').selectAll('rect').data(F.mesesAno).join('rect').attr('x', (m) => x(m) - x.step() * 0.15).attr('width', x.step()).attr('y', 0).attr('height', H).attr('fill', 'transparent').attr('stroke', 'none').style('cursor', 'pointer')
          .on('click', (ev, m) => { S.fx.mes = m; irSub('mes'); });
        box.replaceChildren(svg.node());
      };
      requestAnimationFrame(desenha); box._redesenha = desenha;
      const leg = el('div', 'legenda'); leg.innerHTML = '<span><i style="background:var(--ok)"></i>Resultado positivo</span><span><i style="background:var(--bad)"></i>Negativo</span><span><i style="background:var(--g1)"></i>Saldo no fim do mês</span><span>Tons claros e tracejado = planejado</span>';
      return [card(`Saldo mês a mês · ${F.ano}`, 'Toque num mês para ver o detalhe.', box, leg)];
    },
    mes() {
      const F = calcFluxo(); const i = F.mesesAno.indexOf(S.fx.mes);
      const ch = el('div', 'mchips hs');
      F.mesesAno.forEach((m, k) => { const b = el('button', 'mchip' + (F.isReal(m) ? '' : ' plan')); b.type = 'button'; b.setAttribute('aria-pressed', String(m === S.fx.mes)); b.append(MESES[k], el('small', null, F.isReal(m) ? 'real' : 'plan')); b.addEventListener('click', () => { S.fx.mes = m; render(false); }); ch.append(b); });
      requestAnimationFrame(() => { const on = ch.querySelector('[aria-pressed="true"]'); if (on) ch.scrollLeft = on.offsetLeft - ch.clientWidth / 2 + on.offsetWidth / 2; });
      const linha = (t, v, cls) => { const d = el('div', 'mline' + (cls ? ' ' + cls : '')); d.append(el('span', null, t), el('span', v < -0.005 ? 'neg' : '', brl2.format(v))); return d; };
      const grupo = (t, L, tot) => { const det = el('details', 'mgrp'); const s = el('summary'); s.append(el('span', null, t), el('span', null, brl2.format(tot))); det.append(s);
        const sub = el('div', 'msub'); L.map((l) => ({ l, v: l.vals[i] })).filter((x) => Math.abs(x.v) >= 0.005).sort((a, b) => b.v - a.v).forEach(({ l, v }) => { const r = el('div'); r.append(el('span', null, ROTULO(l.label)), el('span', null, brl2.format(v))); sub.append(r); });
        if (!sub.children.length) sub.append(el('div', null, 'Nenhum valor neste mês.')); det.append(sub); return det; };
      const res = linha('Resultado do mês', F.res[i], 'big'); res.lastChild.className = F.res[i] >= 0 ? 'pos' : 'neg';
      const c = card(null, null, el('span', 'tag' + (F.isReal(S.fx.mes) ? '' : ' plan'), `${mesLongo(S.fx.mes)} · ${F.isReal(S.fx.mes) ? 'realizado' : 'planejado'}`),
        linha('Saldo inicial', F.ini[i]), grupo('Receitas', F.LR, F.rec[i]), grupo('Despesas', F.LD, F.desp[i]), res, linha('Saldo final', F.fim[i], 'saldo'));
      return [ch, c];
    },
    tabela() {
      const F = calcFluxo(); const t = el('table');
      const f = (v) => (Math.abs(v) >= 0.005 ? (v < 0 ? '(' + num2.format(-v) + ')' : num2.format(v)) : '');
      const cel = (v, m, cls) => el('td', [m && !F.isReal(m) ? 'plan' : '', cls || '', v < -0.005 ? 'neg' : ''].join(' ').trim() || null, f(v));
      const th = el('thead'); const hr = el('tr'); hr.append(el('th', null, `Fluxo ${F.ano}`));
      F.mesesAno.forEach((m) => { const h = el('th', F.isReal(m) ? null : 'plan', mesCurto(m)); h.append(el('small', null, F.isReal(m) ? 'realizado' : 'planejado')); hr.append(h); }); hr.append(el('th', 'tot', 'Total')); th.append(hr);
      const tb = el('tbody');
      const row = (lab, vals, cls, sub) => { const tr = el('tr', cls || null); tr.append(el('td', sub ? 'sub' : null, lab)); vals.forEach((v, i) => tr.append(cel(v, F.mesesAno[i]))); tr.append(cel(d3.sum(vals), null, 'tot')); tb.append(tr); };
      const sec = (lab) => { const tr = el('tr', 'sec'); const td2 = el('td'); td2.colSpan = 13; tr.append(el('td', null, lab), td2); tb.append(tr); };
      { const tr = el('tr', 'saldo'); tr.append(el('td', null, 'Saldo inicial')); F.ini.forEach((v, i) => tr.append(cel(v, F.mesesAno[i]))); tr.append(el('td')); tb.append(tr); }
      sec('RECEITAS'); F.LR.forEach((l) => { if (d3.sum(l.vals.map(Math.abs)) || l.plan) row(ROTULO(l.label), l.vals, '', true); }); row('Total das receitas', F.rec, 'tot');
      sec('DESPESAS'); F.LD.forEach((l) => { if (d3.sum(l.vals.map(Math.abs)) || l.plan) row(ROTULO(l.label), l.vals, '', true); }); row('Total das despesas', F.desp, 'tot');
      row('Resultado do mês', F.res, 'res');
      { const tr = el('tr', 'saldo'); tr.append(el('td', null, 'Saldo final')); F.fim.forEach((v, i) => tr.append(cel(v, F.mesesAno[i]))); tr.append(cel(F.fim[11], null, 'tot')); tb.append(tr); }
      t.append(th, tb);
      return telaTabela(null, t);
    },
  };

  // ================= DESPESAS =================
  function resumoDespesas() {
    const base = pagBase(); const rows = base.filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
    const n = mesesSel().length || 1; const de0 = addM(S.f.de, -12), ate0 = addM(S.f.ate, -12);
    const ant = d3.sum(base.filter((r) => r.m >= de0 && r.m <= ate0), (r) => r.v);
    const inst = d3.sum(rows.filter((r) => r.g === 'CBIC Institucional'), (r) => r.v);
    const dv = ant ? tot / ant - 1 : null;
    const top = d3.rollups(rows, (v) => d3.sum(v, (r) => r.v), (r) => r.dg).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ key: k, label: k, v }));
    return [grade(
      kpi('Total pago', compact(tot), `${periodoTxt()} · ${int.format(d3.sum(rows, (r) => r.n))} lançamentos`, 'hero'),
      kpi('Média mensal', compact(tot / n), `${n} ${n === 1 ? 'mês' : 'meses'}`),
      kpi('Mesmo período do ano anterior', ant ? compact(ant) : '—', dv === null ? 'Sem dados' : `${dv >= 0 ? '+' : ''}${pct.format(dv)} agora`, null, null),
      kpi('Institucional × Convênios', tot ? `${pct.format(inst / tot)} · ${pct.format(1 - inst / tot)}` : '—', `${compact(inst)} · ${compact(tot - inst)}`, 'wide')),
    card('Maiores departamentos', 'Toque para ver todos.', ...lista(top, tot, { onClick: () => irSub('dep') }))];
  }
  function credorDetalhe(cred) {
    const rows = pagBase().filter((r) => noPeriodo(r) && r.f === cred.key); const tot = d3.sum(rows, (r) => r.v);
    const porMes = d3.rollups(rows, (v) => d3.sum(v, (r) => r.v), (r) => r.m).sort((a, b) => b[0].localeCompare(a[0]));
    const porConta = d3.rollups(rows, (v) => d3.sum(v, (r) => r.v), (r) => r.p).sort((a, b) => b[1] - a[1]);
    const l1 = el('div', 'lista'); porMes.forEach(([m, v]) => { const d = el('div', 'item'); d.append(el('div', 'n', mesLongo(m)), el('div', 'val', brl2.format(v))); l1.append(d); });
    const l2 = el('div', 'lista'); porConta.forEach(([c, v]) => { const d = el('div', 'item'); const n = el('div', 'n', contaNome(c)); n.append(el('small', null, codigo(c))); d.append(n, el('div', 'val', brl2.format(v))); l2.append(d); });
    detalhe(cred.label, [kpi('Pago no período', brl2.format(tot), periodoTxt(), 'hero'), el('h3', null, 'Por mês'), l1, el('h3', null, 'Por conta'), l2]);
  }
  telas.desp = {
    resumo: resumoDespesas,
    mensal() {
      const rows = pagBase().filter(noPeriodo); const ms = mesesSel();
      const [g, leg] = grafMensal(rows, ms, (m) => {
        const r2 = rows.filter((r) => r.m === m); const t2 = d3.sum(r2, (r) => r.v);
        const it = d3.rollups(r2, (v) => d3.sum(v, (r) => r.v), (r) => r.dg).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, v }));
        detalhe(`Despesas de ${mesLongo(m)}`, [kpi('Total pago', brl2.format(t2), 'por departamento', 'hero'), ...lista(it, t2)]);
      });
      return [card('Pagamentos por mês', 'Barras por grupo. Toque num mês para ver por departamento.', g, leg)];
    },
    dep() {
      const rows = pagBase(true).filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
      const it = d3.rollups(rows, (v) => ({ v: d3.sum(v, (r) => r.v), ccs: d3.rollups(v, (w) => d3.sum(w, (r) => r.v), (r) => ccNome(r.c)).sort((a, b) => b[1] - a[1]) }), (r) => r.dg)
        .map(([k, o]) => ({ key: k, label: k, sub: o.ccs.slice(0, 2).map((c) => c[0]).join(', ') + (o.ccs.length > 2 ? '…' : ''), v: o.v })).sort((a, b) => b.v - a.v);
      return [el('p', 'nota', 'Departamento gerencial (reclassificação aprovada em 12/11/2026). Toque para filtrar todas as telas de Despesas.'), ...lista(it, tot, { onClick: (i) => { S.f.dep = S.f.dep === i.key ? null : i.key; mudou(); irSub('resumo'); } })];
    },
    cc() {
      const rows = pagBase().filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
      const it = d3.rollups(rows, (v) => ({ v: d3.sum(v, (r) => r.v), n: d3.sum(v, (r) => r.n) }), (r) => r.c).map(([k, o]) => ({ key: k, label: ccNome(k), sub: (String(k).match(/^\d+/) || [''])[0] + ' · ' + int.format(o.n) + ' lanç.', v: o.v })).sort((a, b) => b.v - a.v);
      return lista(it, tot, { busca: 'Buscar centro de custo', onClick: (i) => { S.f.cc = i.key; mudou(); irSub('resumo'); } });
    },
    conta() {
      const rows = pagBase().filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
      const it = d3.rollups(rows, (v) => ({ v: d3.sum(v, (r) => r.v), n: d3.sum(v, (r) => r.n) }), (r) => r.p).map(([k, o]) => ({ key: k, label: contaNome(k), sub: codigo(k) + ' · ' + int.format(o.n) + ' lanç.', v: o.v })).sort((a, b) => b.v - a.v);
      return lista(it, tot, { busca: 'Buscar conta (ex.: passagens)', onClick: (i) => { S.f.conta = i.key; mudou(); irSub('resumo'); } });
    },
    cred() {
      const rows = pagBase().filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
      const it = d3.rollups(rows, (v) => ({ v: d3.sum(v, (r) => r.v), ps: [...new Set(v.map((r) => contaNome(r.p)))] }), (r) => r.f).map(([k, o]) => ({ key: k, label: k, sub: o.ps.slice(0, 2).join(', ') + (o.ps.length > 2 ? '…' : ''), v: o.v })).sort((a, b) => b.v - a.v);
      return lista(it, tot, { busca: 'Buscar credor', onClick: credorDetalhe, max: 150 });
    },
    tabela() {
      const rows = pagBase().filter(noPeriodo); const ms = mesesSel();
      const ops = { dg: ['Departamento', (r) => r.dg, (k) => k], cc: ['Centro de custo', (r) => r.c, ccNome], conta: ['Conta', (r) => r.p, (k) => k], k: ['Classificação', (r) => r.k || 'Ajustar', ROTULO] };
      const sg = el('div', 'seg hs'); seg(sg, [['dg', 'Departamento'], ['cc', 'Centro'], ['conta', 'Conta'], ['k', 'Classificação']], S.piv, (v) => { S.piv = v; salva(); render(false); });
      const [cab, ch, rot] = ops[S.piv] || ops.dg;
      return telaTabela(sg, pivot(rows, ch, rot, cab, ms));
    },
  };

  // ================= RECEITAS =================
  telas.rec = {
    resumo() {
      const base = recBase(); const rows = base.filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v); const n = mesesSel().length || 1;
      const de0 = addM(S.f.de, -12), ate0 = addM(S.f.ate, -12); const ant = d3.sum(base.filter((r) => r.m >= de0 && r.m <= ate0), (r) => r.v);
      const pag = d3.sum(D.pagamentos.filter((r) => grupoOk(r.g, S.f.grupo) && F.casa(S.f.cc, r.c) && noPeriodo(r)), (r) => r.v);
      const saldo = tot - pag; const dv = ant ? tot / ant - 1 : null;
      return [grade(
        kpi('Total recebido', compact(tot), `${periodoTxt()} · ${int.format(d3.sum(rows, (r) => r.n))} lançamentos`, 'hero'),
        kpi('Média mensal', compact(tot / n), `${n} ${n === 1 ? 'mês' : 'meses'}`),
        kpi('Mesmo período do ano anterior', ant ? compact(ant) : '—', dv === null ? 'Sem dados' : `${dv >= 0 ? '+' : ''}${pct.format(dv)} agora`),
        kpi('Recebido − pago', compact(saldo), `Pagamentos ${compact(pag)} no período`, 'wide', saldo >= 0 ? 'pos' : 'neg'))];
    },
    mensal() {
      const rows = recBase().filter(noPeriodo); const ms = mesesSel();
      const [g, leg] = grafMensal(rows, ms, (m) => {
        const r2 = rows.filter((r) => r.m === m); const t2 = d3.sum(r2, (r) => r.v);
        const it = d3.rollups(r2, (v) => d3.sum(v, (r) => r.v), (r) => r.p).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: contaNome(k), sub: codigo(k), v }));
        detalhe(`Receitas de ${mesLongo(m)}`, [kpi('Total recebido', brl2.format(t2), 'por conta', 'hero'), ...lista(it, t2, { cor: 'var(--rec)' })]);
      });
      return [card('Recebimentos por mês', 'Barras por grupo. Toque num mês para ver por conta.', g, leg)];
    },
    conta() {
      const rows = recBase().filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
      const it = d3.rollups(rows, (v) => ({ v: d3.sum(v, (r) => r.v), n: d3.sum(v, (r) => r.n) }), (r) => r.p).map(([k, o]) => ({ key: k, label: contaNome(k), sub: codigo(k) + ' · ' + int.format(o.n) + ' lanç.', v: o.v })).sort((a, b) => b.v - a.v);
      return [el('p', 'nota', 'Toque numa conta para ver só ela.'), ...lista(it, tot, { busca: 'Buscar conta de receita', onClick: (i) => { S.f.rconta = i.key; mudou(); irSub('resumo'); } })];
    },
    cli() {
      const rows = recBase().filter(noPeriodo); const tot = d3.sum(rows, (r) => r.v);
      const it = d3.rollups(rows, (v) => ({ v: d3.sum(v, (r) => r.v), ps: [...new Set(v.map((r) => contaNome(r.p)))] }), (r) => r.f).map(([k, o]) => ({ key: k, label: k, sub: o.ps.slice(0, 2).join(', '), v: o.v })).sort((a, b) => b.v - a.v);
      return lista(it, tot, { busca: 'Buscar cliente', max: 150 });
    },
    tabela() { return telaTabela(null, pivot(recBase().filter(noPeriodo), (r) => r.p, (k) => k, 'Conta de receita', mesesSel())); },
  };

  // ================= ORÇADO × REALIZADO =================
  const REC_G = ['Receita social (contribuições associativas)', 'Protocolo de intenção (Convênio CNI)', 'Convênios SESI / SENAI', 'Convênio ENBPar', 'Receita patrimonial (aplicações)', 'Patrocínios', 'Outras receitas', 'Inscrições', 'Vícios Construtivos', 'Reforma Tributária', 'Reembolsos e devoluções', 'Empréstimos bancários (entrada)'];
  const DESP_G = ['Despesas com pessoal', 'Serviços de terceiros e assessorias', 'Meios de comunicação', 'Transporte urbano', 'Material de consumo', 'Manutenção e software', 'Despesas gerais', 'Despesas especiais', 'Despesas com viagens', 'Contribuições associativas', 'Despesas com eventos', 'Despesas e tributos financeiros', 'Empréstimos (amortização e juros)', 'Investimentos patrimoniais', 'Convênios SESI / SENAI', 'Convênio ENBPar', 'Vícios Construtivos', 'Reforma Tributária', 'Adiantamentos e reembolsos'];
  const gRec = (r) => { const c = codigo(r.p);
    if (c.startsWith('1.01.01')) return REC_G[0]; if (c === '1.01.02.01') return REC_G[1]; if (c === '1.01.02.02' || c === '1.01.02.03') return REC_G[2]; if (c === '1.01.02.04') return REC_G[3];
    if (c.startsWith('1.01.03')) return REC_G[4]; if (c.startsWith('1.01.04')) return REC_G[5]; if (c.startsWith('1.01.06')) return REC_G[7]; if (c.startsWith('1.01.07')) return REC_G[8];
    if (c.startsWith('1.01.08')) return REC_G[11]; if (c.startsWith('1.01.10')) return REC_G[9]; if (c.startsWith('1.01')) return REC_G[6]; return REC_G[10]; };
  const gDesp = (r) => { const cc = String(r.c), c = codigo(r.p);
    if (r.g === 'Convênio SESI' || r.g === 'Convênio SENAI') return 'Convênios SESI / SENAI'; if (r.g === 'Convênio ENBPar') return 'Convênio ENBPar';
    if (cc.startsWith('904 ')) return 'Vícios Construtivos'; if (cc.startsWith('910 ')) return 'Reforma Tributária';
    const pref = [['2.01.01', 0], ['2.01.02', 1], ['2.01.03', 1], ['2.01.04', 2], ['2.01.05', 3], ['2.01.06', 4], ['2.01.07', 5], ['2.01.13', 5], ['2.01.08', 6], ['2.01.09', 7], ['2.01.10', 8], ['2.01.11', 9], ['2.01.12', 10]];
    for (const [p, i] of pref) if (c.startsWith(p)) return DESP_G[i];
    if (c === '2.02.01.06' || c === '2.02.01.07') return DESP_G[12]; if (c.startsWith('2.02')) return DESP_G[11]; if (c.startsWith('2.03')) return DESP_G[13];
    if (c.startsWith('2.04') || c.startsWith('2.05')) return 'Convênios SESI / SENAI'; return DESP_G[18]; };
  function calcOrc() {
    const ms = mesesSel(); const rr = recBase(true).filter(noPeriodo), pr = D.pagamentos.filter((r) => grupoOk(r.g, S.f.grupo) && F.casa(S.f.cc, r.c) && noPeriodo(r));
    const R = d3.rollup(rr, (v) => d3.sum(v, (r) => r.v), gRec), Dd = d3.rollup(pr, (v) => d3.sum(v, (r) => r.v), gDesp);
    const Rm = d3.rollup(rr, (v) => d3.sum(v, (r) => r.v), gRec, (r) => r.m), Dm = d3.rollup(pr, (v) => d3.sum(v, (r) => r.v), gDesp, (r) => r.m);
    const ano = S.f.de.slice(0, 4); const ok = (D.orcamento || []).length && !S.f.cc && S.f.ate.slice(0, 4) === ano && ano === '2026';
    const om = new Map((D.orcamento || []).map((o) => [o.tipo + '|' + o.grupo, Number(o.anual)]));
    const g = S.f.grupo;
    const orc = (tipo, gr) => { if (!ok) return 0; const conv = gr.startsWith('Convênio');
      if (g === 'CBIC Institucional' && conv) return 0; if (g === 'Convênios' && !conv) return 0;
      if (g === 'Convênio SESI' || g === 'Convênio SENAI') return gr === 'Convênios SESI / SENAI' ? (om.get(tipo + '|' + gr) || 0) * (g === 'Convênio SESI' ? 0.6875 : 0.3125) : 0;
      if (g === 'Convênio ENBPar') return gr === 'Convênio ENBPar' ? (om.get(tipo + '|' + gr) || 0) : 0;
      return om.get(tipo + '|' + gr) || 0; };
    return { ms, R, Dd, Rm, Dm, ok, orc, frac: ms.length / 12, totR: d3.sum(rr, (r) => r.v), totD: d3.sum(pr, (r) => r.v), oR: d3.sum(REC_G, (x) => orc('Receita', x)), oD: d3.sum(DESP_G, (x) => orc('Despesa', x)) };
  }
  function listaOrc(O, tipo) {
    const G = tipo === 'Receita' ? REC_G : DESP_G, M = tipo === 'Receita' ? O.R : O.Dd;
    const it = G.map((g) => ({ g, v: M.get(g) || 0, o: O.orc(tipo, g) })).filter((x) => x.v || x.o).sort((a, b) => b.o - a.o || b.v - a.v);
    const box = el('div', 'lista'); const maxV = d3.max(it, (x) => Math.max(x.v, x.o)) || 1;
    it.forEach((x) => { const d = el('div', 'item'); const n = el('div', 'n', x.g); n.append(el('small', null, x.o ? `Orçado ${compact(x.o)} · proporcional ${compact(x.o * O.frac)}` : 'Sem orçamento'));
      const v = el('div', 'val', compact(x.v)); v.append(el('small', null, x.o ? pct.format(x.v / x.o) + ' do ano' : ''));
      const bar = el('div', 'bar'); bar.style.position = 'relative'; const o = el('i', 'orc'); o.style.width = (100 * x.o / maxV) + '%'; o.style.position = 'absolute';
      const r = el('i'); r.style.width = (100 * x.v / maxV) + '%'; r.style.position = 'relative'; bar.append(o, r); d.append(n, v, bar); box.append(d); });
    return box;
  }
  telas.orc = {
    resumo() {
      const O = calcOrc(); const res = O.totR - O.totD;
      const s = O.ok ? null : 'O orçamento aprovado é de 2026: escolha um período dentro de 2026, sem filtro de centro de custo.';
      return [grade(
        kpi('Receitas realizadas', compact(O.totR), O.ok ? `${pct.format(O.totR / O.oR)} de ${compact(O.oR)} orçados` : periodoTxt(), 'hero'),
        kpi('Despesas realizadas', compact(O.totD), O.ok ? `${pct.format(O.totD / O.oD)} de ${compact(O.oD)}` : periodoTxt()),
        kpi('Proporcional do período', O.ok ? pct.format(O.frac) : '—', O.ok ? `${O.ms.length} de 12 meses` : ''),
        kpi('Resultado', compact(res), 'Receitas − despesas', 'wide', res >= 0 ? 'pos' : 'neg')), ...(s ? [el('p', 'nota', s)] : [])];
    },
    rec() { const O = calcOrc(); return [el('p', 'nota', 'Barra escura: realizado. Barra clara: orçado no ano.'), listaOrc(O, 'Receita')]; },
    desp() { const O = calcOrc(); return [el('p', 'nota', 'Barra escura: realizado. Barra clara: orçado no ano.'), listaOrc(O, 'Despesa')]; },
    tabela() {
      const O = calcOrc(); const t = el('table'); const f = (v) => (v ? (v < 0 ? '(' + num2.format(-v) + ')' : num2.format(v)) : '');
      const th = el('thead'); const hr = el('tr'); hr.append(el('th', null, 'Realizado')); O.ms.forEach((m) => hr.append(el('th', null, mesCurto(m)))); hr.append(el('th', 'tot', 'Total'));
      if (O.ok) ['Orçado 2026', '% do ano'].forEach((x) => hr.append(el('th', null, x))); th.append(hr);
      const tb = el('tbody');
      const bloco = (rot, G, M, tipo) => {
        const s = el('tr', 'sec'); const td2 = el('td'); td2.colSpan = O.ms.length + 3; s.append(el('td', null, rot), td2); tb.append(s);
        const col = O.ms.map(() => 0); let oT = 0;
        G.forEach((g) => { const v = O.ms.map((m) => M.get(g)?.get(m) || 0); const o = O.orc(tipo, g); if (!d3.sum(v) && !o) return;
          const tr = el('tr'); tr.append(el('td', 'sub', g)); v.forEach((x, i) => { col[i] += x; tr.append(el('td', null, f(x))); }); tr.append(el('td', 'tot', f(d3.sum(v))));
          if (O.ok) { tr.append(el('td', null, f(o))); tr.append(el('td', null, o ? pct.format(d3.sum(v) / o) : '')); } oT += o; tb.append(tr); });
        const tr = el('tr', 'tot'); tr.append(el('td', null, 'Total ' + rot.toLowerCase())); col.forEach((x) => tr.append(el('td', null, f(x)))); tr.append(el('td', null, f(d3.sum(col))));
        if (O.ok) { tr.append(el('td', null, f(oT))); tr.append(el('td', null, oT ? pct.format(d3.sum(col) / oT) : '')); } tb.append(tr); return col;
      };
      const cr = bloco('Receitas', REC_G, O.Rm, 'Receita'), cd = bloco('Despesas', DESP_G, O.Dm, 'Despesa');
      const tr = el('tr', 'res'); tr.append(el('td', null, 'Resultado')); cr.forEach((v, i) => { const x = v - cd[i]; tr.append(el('td', x < 0 ? 'neg' : null, f(x))); }); tr.append(el('td', 'tot', f(d3.sum(cr) - d3.sum(cd)))); tb.append(tr);
      t.append(th, tb); return telaTabela(null, t);
    },
  };

  // ================= AJUDA =================
  const html = (cls, s) => { const d = el('div', cls); d.innerHTML = s; return d; };
  const secaoAba = (cor, titulo, texto, subs) => { const c = el('section', 'card secao'); const t = el('div', 'tit'); const i = el('i'); i.style.background = cor; t.append(i, titulo); c.append(t, html('texto', texto));
    if (subs) { const u = el('ul', 'texto'); subs.forEach(([n, d]) => { const li = el('li'); li.innerHTML = `<b>${n}</b> — ${d}`; u.append(li); }); c.append(u); } return c; };
  telas.ajuda = {
    uso() {
      return [card('Bem-vindo ao Painel CBIC', null, html('texto', `
        <p>O Painel mostra as finanças da CBIC a partir do Sienge: o que foi pago, o que foi recebido, o fluxo de caixa do ano e a comparação com o orçamento.</p>
        <h4>1. Escolha a área na barra de baixo</h4>
        <p><b>Fluxo</b>, <b>Despesas</b>, <b>Receitas</b> e <b>Orçamento</b>. O botão colorido é a área aberta. <b>Ajuda</b> traz este guia.</p>
        <h4>2. Escolha o assunto nos botões do alto</h4>
        <p>Cada área tem sub-abas (Resumo, Mês a mês, Tabela…). Toque numa delas ou deslize o dedo para o lado, fora das tabelas e gráficos, para passar para a próxima.</p>
        <h4>3. Use os Filtros</h4>
        <p>O botão <b>Filtros</b>, no canto de cima, escolhe o período, o grupo (Institucional ou convênios), o centro de custo, a conta e o departamento (em Despesas) e a conta de receita (em Receitas). Centro de custo, conta e departamento vêm com todos os itens marcados: toque nos que não quer ver para desmarcá-los, use <b>Marcar todos</b> / <b>Desmarcar todos</b> (valem para o que a busca encontrou) ou <b>só este</b> para ficar com um só. Os filtros ativos aparecem como etiquetas logo abaixo do título; toque no × para tirar um.</p>
        <h4>4. Toque para ver o detalhe</h4>
        <p>Nas listas, tocar num departamento, centro de custo ou conta filtra todas as telas por ele. Tocar num credor ou num mês do gráfico abre o detalhe.</p>
        <h4>5. Tabelas</h4>
        <p>Gire o celular para ver mais meses. Toque na tabela (ou em <b>Tela cheia</b>) para ela ocupar a tela toda; toque de novo ou em <b>Sair</b> para voltar. Os nomes das linhas e os meses ficam fixos enquanto você rola.</p>
        <h4>6. Instale na tela inicial</h4>
        <p>No iPhone: abra no Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. No Android: menu do Chrome › <b>Instalar app</b>.</p>`))];
    },
    abas() {
      return [
        secaoAba('var(--flx)', 'Fluxo de caixa', '<p>O ano inteiro: realizado do Sienge até o mês de corte e, depois, o planejado da planilha de fluxo. Grupo CBIC Institucional.</p>',
          [['Resumo', 'saldo previsto para dezembro, receitas, despesas e resultado do ano; escolha o ano e até que mês vale o realizado'], ['Saldo mês a mês', 'gráfico com o resultado de cada mês (barras) e o saldo no fim do mês (linha); tons claros = planejado'], ['Mês', 'saldo inicial, receitas e despesas abertas por linha, resultado e saldo final do mês escolhido'], ['Tabela', 'todas as linhas do fluxo, mês a mês']]),
        secaoAba('var(--cbic)', 'Despesas', '<p>Tudo o que foi pago no período e nos filtros escolhidos.</p>',
          [['Resumo', 'total, média por mês, comparação com o mesmo período do ano anterior e os maiores departamentos'], ['Mês a mês', 'pagamentos por mês e por grupo; toque num mês para ver por departamento'], ['Departamentos', 'os 7 departamentos gerenciais (mais o Transitório); toque para filtrar'], ['Centros', 'centros de custo com busca; toque para filtrar'], ['Contas', 'contas do plano financeiro com busca; toque para filtrar'], ['Credores', 'a quem foi pago; toque para ver por mês e por conta'], ['Tabela', 'valores mês a mês por departamento, centro, conta ou classificação']]),
        secaoAba('var(--rec)', 'Receitas', '<p>Tudo o que foi recebido no período e nos filtros escolhidos.</p>',
          [['Resumo', 'total, média, comparação com o ano anterior e recebido menos pago'], ['Mês a mês', 'recebimentos por mês e por grupo; toque num mês para ver por conta'], ['Contas', 'contas de receita com busca'], ['Clientes', 'de quem foi recebido'], ['Tabela', 'contas de receita mês a mês']]),
        secaoAba('var(--orc)', 'Orçamento (orçado × realizado)', '<p>Compara o realizado com o orçamento aprovado de 2026 (escolha um período dentro de 2026, sem filtro de centro de custo).</p>',
          [['Resumo', 'quanto das receitas e despesas orçadas já foi realizado e o proporcional do período'], ['Receitas / Despesas', 'cada grupo do orçamento: barra escura = realizado, barra clara = orçado no ano'], ['Tabela', 'realizado mês a mês, orçamento e % do ano']]),
      ];
    },
    faq() {
      const P = [
        ['De onde vêm os números?', 'Dos lançamentos do Sienge (baixas de contas a pagar e a receber), atualizados de hora em hora. O planejado vem da planilha de fluxo do Superintendente e o orçamento é o aprovado para 2026.'],
        ['O que é o departamento gerencial?', 'A classificação aprovada em 12/11/2026 em 7 departamentos (Diretoria, Administrativo / Financeiro, Projetos Convênios, Projetos CBIC, Relações Institucionais, Parcerias / Eventos e Comunicação), mais o Transitório. Vem do centro de custo e, nos centros 3, 6 e dos convênios, também do credor.'],
        ['Por que o total das Despesas é diferente do Fluxo?', 'O Fluxo mostra só o grupo CBIC Institucional e tira transferências e aplicações; Despesas mostra todos os grupos escolhidos no filtro.'],
        ['Como vejo as receitas sem os empréstimos?', 'Na área Receitas, abra Filtros e, em “Conta de receita”, toque em Empréstimos para desmarcar (ou busque “emprést” e toque em “Desmarcar os …”). A etiqueta mostra “Conta: todos menos Empréstimos…”. Esse filtro vale só para Receitas.'],
        ['Como tiro só alguns centros de custo (ou contas)?', 'Abra Filtros: a lista vem com todos marcados. Toque nos que quer tirar, ou busque parte do nome (ex.: ENIC) e toque em “Desmarcar os …”. A etiqueta mostra, por exemplo, “Centro: todos menos 3”.'],
        ['Como volto a ver tudo, sem filtros?', 'Abra Filtros e toque em Limpar, ou toque no × de cada etiqueta abaixo do título.'],
        ['A tabela está cortada. Como vejo os outros meses?', 'Deslize a tabela para o lado, gire o celular ou toque nela para abrir em tela cheia.'],
        ['Os valores desta versão são reais?', 'Não. Esta é uma demonstração com valores fictícios e nomes de credores e clientes inventados. A versão com dados reais terá login com o e-mail da CBIC.'],
        ['Encontrei um erro ou tenho uma sugestão.', 'Use “Fale com o administrador”, na aba Ajuda.'],
      ];
      const c = el('section', 'card faq'); P.forEach(([q, r]) => { const d = el('details'); d.append(el('summary', null, q), el('p', null, r)); c.append(d); });
      return [c];
    },
    fale() {
      const f = el('form', 'form'); f.noValidate = true;
      const campo = (rot, tag, attrs) => { const l = el('label', null, rot); const i = el(tag); Object.assign(i, attrs || {}); l.append(i); f.append(l); return i; };
      const nome = campo('Seu nome', 'input', { className: 'inp', autocomplete: 'name', id: 'fale-nome' });
      const cont = campo('E-mail ou telefone para resposta (opcional)', 'input', { className: 'inp', id: 'fale-contato' });
      const txt = campo('Mensagem', 'textarea', { id: 'fale-texto', placeholder: 'Escreva sua dúvida, sugestão ou o erro que encontrou.' });
      const b = el('button', 'prim', 'Enviar ao administrador'); b.type = 'submit'; f.append(b);
      const res = el('div');
      f.addEventListener('submit', async (e) => { e.preventDefault(); if (!txt.value.trim()) { res.replaceChildren(el('div', 'aviso', 'Escreva a mensagem antes de enviar.')); return; }
        const r = await Servidor.enviarMensagem({ nome: nome.value.trim(), contato: cont.value.trim(), texto: txt.value.trim() });
        txt.value = ''; res.replaceChildren(el('div', 'ok', 'Mensagem enviada.'), ...(Servidor.modo === 'demo' ? [el('p', 'nota', r.aviso)] : [])); });
      const adm = el('button', 'link-adm'); adm.type = 'button'; adm.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Área do administrador';
      adm.addEventListener('click', () => irArea('admin'));
      return [card('Fale com o administrador', 'O administrador recebe sua mensagem e responde pelo contato informado.', f, res), adm];
    },
  };

  // ================= ADMINISTRADOR =================
  function loginAdmin() {
    const f = el('form', 'form'); const l = el('label', null, 'Senha do administrador'); const i = el('input'); i.type = 'password'; i.className = 'inp'; i.id = 'adm-senha'; i.autocomplete = 'current-password'; l.append(i);
    const b = el('button', 'prim', 'Entrar'); b.type = 'submit'; const res = el('div'); f.append(l, b, res);
    f.addEventListener('submit', async (e) => { e.preventDefault(); if (await Servidor.entrar(i.value)) { escopo(); render(true); } else res.replaceChildren(el('div', 'aviso', 'Senha incorreta.')); });
    return [card('Área restrita', 'Leitura das mensagens, acessos e erros do app.', f), ...(Servidor.modo === 'demo' ? [el('p', 'nota', 'Demonstração: a senha é cbic2026 e os dados mostrados são só os deste aparelho.')] : [])];
  }
  const restrito = (fn) => () => (Servidor.admin() ? fn() : loginAdmin());
  const quando = (iso) => { const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const NOME_TELA = (k) => { const [a, s] = k.split('/'); const A = AREAS[a]; return A ? `${A.titulo} › ${(A.subs.find((x) => x[0] === s) || [s, s])[1]}` : k; };
  telas.admin = {
    resumo: restrito(() => {
      const e = Servidor.estatisticas(), m = Servidor.mensagens(), er = Servidor.erros(); const novas = m.filter((x) => !x.lida).length;
      const sair = el('button', 'btn', 'Sair da área restrita'); sair.type = 'button'; sair.addEventListener('click', () => { Servidor.sair(); escopo(); render(true); });
      return [grade(kpi('Aberturas do app', int.format(e.aberturas || 0), e.primeira ? `desde ${quando(e.primeira)}` : '', 'hero'),
        kpi('Mensagens novas', int.format(novas), `${int.format(m.length)} no total`), kpi('Erros registrados', int.format(er.length), er[0] ? `último em ${quando(er[0].quando)}` : 'nenhum'),
        kpi('Telas visitadas', int.format(d3.sum(Object.values(e.telas || {}))), 'toques em abas e sub-abas', 'wide')),
        ...(Servidor.modo === 'demo' ? [el('p', 'aviso', 'Demonstração sem servidor: os números são só deste aparelho. Com o servidor (fase 2, com a TI), mostram todos os usuários, e cada mensagem nova avisa o administrador no celular.')] : []), sair];
    }),
    msgs: restrito(() => {
      const m = Servidor.mensagens(); if (!m.length) return [el('div', 'vazio', 'Nenhuma mensagem.')];
      const box = el('div', 'lista');
      m.forEach((x) => { const d = el('div', 'msg' + (x.lida ? '' : ' nova')); d.append(el('div', 'q', `${quando(x.quando)} · ${x.nome || 'sem nome'}${x.contato ? ' · ' + x.contato : ''}`), el('div', null, x.texto));
        if (!x.lida) { const b = el('button', 'btn', 'Marcar como lida'); b.type = 'button'; b.addEventListener('click', () => { Servidor.marcarLida(x.id); render(false); }); d.append(b); } box.append(d); });
      return [box];
    }),
    uso: restrito(() => {
      const e = Servidor.estatisticas(); const t = Object.entries(e.telas || {}).sort((a, b) => b[1] - a[1]); const tot = d3.sum(t, (x) => x[1]);
      const dias = Object.entries(e.dias || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
      const maxV = d3.max(t, (x) => x[1]) || 1; const lt = el('div', 'lista');
      t.forEach(([k, v]) => { const x = el('div', 'item'); const vv = el('div', 'val', int.format(v)); vv.append(el('small', null, pct.format(v / tot)));
        const bar = el('div', 'bar'); const f = el('i'); f.style.width = (100 * v / maxV).toFixed(1) + '%'; bar.append(f); x.append(el('div', 'n', NOME_TELA(k)), vv, bar); lt.append(x); });
      const ld = el('div', 'lista'); dias.forEach(([d, v]) => { const x = el('div', 'item'); x.append(el('div', 'n', d.split('-').reverse().join('/')), el('div', 'val', int.format(v) + ' aberturas')); ld.append(x); });
      return [card('Telas mais visitadas', 'Toques em cada aba e sub-aba.', t.length ? lt : el('div', 'vazio', 'Sem registros.')), card('Aberturas por dia', null, dias.length ? ld : el('div', 'vazio', 'Sem registros.'))];
    }),
    erros: restrito(() => {
      const er = Servidor.erros(); if (!er.length) return [el('div', 'vazio', 'Nenhum erro registrado.')];
      const box = el('div', 'lista'); er.forEach((x) => { const d = el('div', 'msg'); d.append(el('div', 'q', `${quando(x.quando)} · ${x.onde}`), el('div', null, x.msg)); box.append(d); });
      const b = el('button', 'btn', 'Limpar a lista'); b.type = 'button'; b.addEventListener('click', () => { Servidor.limparErros(); render(false); });
      return [box, b];
    }),
  };

  // ---------- desenho ----------
  function render(topo) {
    const semDados = S.area === 'ajuda' || S.area === 'admin';
    if (!D && !semDados) return;
    const fn = telas[S.area][S.sub[S.area]] || telas[S.area].resumo;
    let nodes;
    try { nodes = fn(); } catch (e) { console.error(e); nodes = [el('div', 'vazio', 'Algo deu errado nesta tela.')]; }
    const rodape = el('div', 'demo');
    if (D) { rodape.innerHTML = D.demo ? '<b>Demonstração com valores fictícios.</b> ' : ''; rodape.append(`Dados de ${D.atualizacao?.pagamentos || '—'}`); }
    main.replaceChildren(...nodes, ...($('app').classList.contains('full') ? [] : [rodape]));
    if (topo) main.scrollTop = 0;
  }
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => main.querySelectorAll('.graf').forEach((g) => g._redesenha && g._redesenha()), 120); });
  window.addEventListener('orientationchange', () => setTimeout(() => render(false), 250));

  Fonte.carregar().then((dados) => {
    D = dados;
    D.pagamentos.forEach((r) => { if (!r.dg) r.dg = '(não reclassificado)'; });
    MESES_DADOS = [...new Set([...D.pagamentos, ...D.receitas].map((r) => r.m))].sort();
    padraoPeriodo(false);
    moldura(); render(true);
  }).catch((e) => { Servidor.erro(e.message, 'carregar dados'); main.replaceChildren(el('div', 'vazio', 'Não foi possível carregar os dados: ' + e.message)); });
  window.addEventListener('error', (e) => Servidor.erro(e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', (e) => Servidor.erro(e.reason?.message || e.reason, 'promessa'));
  Servidor.acesso('_abertura');
  moldura();
  if (S.area === 'ajuda' || S.area === 'admin') render(true);
})();
