// Serviços do app que precisam de um servidor: mensagens ao administrador, registro de acessos e de erros,
// e a entrada do administrador.
// Hoje (demonstração no GitHub Pages, sem servidor): tudo fica guardado SÓ NESTE APARELHO (localStorage),
// para mostrar como as telas funcionam. A senha da demonstração é "cbic2026".
// Fase 2 (com a TI, no Supabase): tabelas painel_mensagens, painel_acessos e painel_erros; a senha passa a ser o
// login do administrador no Supabase; cada mensagem nova dispara uma notificação no celular do administrador
// (Telegram ou OneSignal, configurados no servidor — nenhuma chave fica no app).
window.Servidor = (() => {
  const K = 'painel-cbic-srv:';
  const ler = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(K + k)); return v == null ? padrao : v; } catch (e) { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const agora = () => new Date().toISOString();
  const SENHA_DEMO_SHA256 = '1c771d8bac96bdf93fe852ef405e954801a33610bcfc2bfeb524bb66bd60f9b7';

  async function sha256(t) {
    if (!crypto?.subtle) return '';
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  return {
    modo: 'demo',
    // contador de acessos e telas visitadas
    acesso(area, sub) {
      const e = ler('estat', { aberturas: 0, primeira: agora(), telas: {}, dias: {} });
      if (area === '_abertura') { e.aberturas += 1; const d = agora().slice(0, 10); e.dias[d] = (e.dias[d] || 0) + 1; }
      else { const k = area + '/' + sub; e.telas[k] = (e.telas[k] || 0) + 1; }
      e.ultima = agora(); gravar('estat', e);
    },
    estatisticas() { return ler('estat', { aberturas: 0, telas: {}, dias: {} }); },
    // mensagens ao administrador
    async enviarMensagem({ nome, contato, texto }) {
      const l = ler('msgs', []); l.unshift({ id: Date.now(), quando: agora(), nome, contato, texto, lida: false }); gravar('msgs', l.slice(0, 200));
      return { ok: true, aviso: 'Na demonstração a mensagem fica guardada neste aparelho; com o servidor, o administrador recebe uma notificação no celular.' };
    },
    mensagens() { return ler('msgs', []); },
    marcarLida(id) { gravar('msgs', ler('msgs', []).map((m) => (m.id === id ? { ...m, lida: true } : m))); },
    // erros do app
    erro(msg, onde) { const l = ler('erros', []); l.unshift({ quando: agora(), msg: String(msg).slice(0, 500), onde: String(onde || '').slice(0, 200) }); gravar('erros', l.slice(0, 100)); },
    erros() { return ler('erros', []); },
    limparErros() { gravar('erros', []); },
    // entrada do administrador (na demonstração, conferida no próprio aparelho)
    async entrar(senha) { const h = await sha256(senha); const ok = h === SENHA_DEMO_SHA256 || (!h && senha === 'cbic2026'); if (ok) sessionStorage.setItem(K + 'adm', '1'); return ok; },
    admin() { try { return sessionStorage.getItem(K + 'adm') === '1'; } catch (e) { return false; } },
    sair() { try { sessionStorage.removeItem(K + 'adm'); } catch (e) { /* */ } },
  };
})();
