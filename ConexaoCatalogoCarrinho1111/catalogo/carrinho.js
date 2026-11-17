// Carrinho de compras + solicitação de orçamento pelo WhatsApp.
// Configuração (número do WhatsApp etc.) fica em produtos.js, dentro de CONFIG.
const Carrinho = (() => {
  const CHAVE = "conexaoautos:carrinho:v1";
  const CHAVE_CLIENTE = "conexaoautos:cliente:v1";
  const MAX_QTD = 999;
  const MAX_URL = 3500; // acima disso o celular costuma cortar o link; usamos a cópia da mensagem

  let produtos = [];          // lista de itens do catálogo
  let porId = new Map();      // código -> produto
  let porNome = new Map();    // nome -> produto (o carrinho salvo usa o NOME como chave)
  let fmt = v => String(v);
  let qtds = {};              // código -> quantidade
  let ultimoFoco = null;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const centavos = p => Math.round(p.preco * 100);
  const brl = c => fmt(c / 100).replace(/\u00a0/g, " ");

  // ---------- Armazenamento (LocalStorage) Ao entrar novamente no site o carrinho atualiza ----------
  //const lerJSON = (chave, padrao) => {
    //try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; } catch { return padrao; }
  //};
  //const gravarJSON = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado/cheio: segue sem salvar */ } };

  // Carrinho some os produtos após acessar o link novamente
  const lerJSON = (chave, padrao, tipo = "local") => {
    try { const v = JSON.parse(window[tipo + "Storage"].getItem(chave)); return v ?? padrao; } catch { return padrao; }
  };
  const gravarJSON = (chave, valor, tipo = "local") => {
    try { window[tipo + "Storage"].setItem(chave, JSON.stringify(valor)); } catch { /* segue sem salvar */ }
  };


  // Guardamos por NOME do produto (não pelo código), pois o código é a posição na lista:
  // se a lista for editada, o carrinho salvo continua apontando para o produto certo.
  function carregar() {
    //const salvo = lerJSON(CHAVE, {}); não salva a ultima sessão, tira os produtos do carrinho
    const salvo = lerJSON(CHAVE, {}, "session");
    qtds = {};
    for (const [nome, q] of Object.entries(salvo)) {
      const p = porNome.get(nome);
      const n = Number(q);
      if (p && Number.isInteger(n) && n > 0) qtds[p.id] = Math.min(n, MAX_QTD);
    }
  }
  function salvar() {
    const obj = {};
    for (const [id, q] of Object.entries(qtds)) obj[porId.get(Number(id)).nome] = q;
    //gravarJSON(CHAVE, obj); Mudança carrinho que salva os produtos mesmo acessando a pagina dnv, se apertar F5, o carrinho não some
    gravarJSON(CHAVE, obj, "session");
  }

  // ---------- Regras do carrinho ----------
  const totalItens = () => Object.values(qtds).reduce((a, b) => a + b, 0);
  function linhas() {
    return Object.entries(qtds).map(([id, q]) => {
      const p = porId.get(Number(id));
      return { p, q, sub: centavos(p) * q };
    });
  }
  const totalCentavos = () => linhas().reduce((a, l) => a + l.sub, 0);

  function definir(id, q) {
    q = Math.max(0, Math.min(MAX_QTD, Math.floor(Number(q)) || 0));
    if (q === 0) delete qtds[id]; else qtds[id] = q;
    salvar();
    atualizarCards(id);
    atualizarBadge();
    renderCarrinho();
  }

  // ---------- HTML dos controles ----------
  function stepperHTML(id, q) {
    return `<div class="stepper" role="group" aria-label="Quantidade">
      <button type="button" data-cart="menos" data-id="${id}" aria-label="Diminuir quantidade">−</button>
      <input type="number" inputmode="numeric" min="1" max="${MAX_QTD}" value="${q}" data-cart="qtd" data-id="${id}" aria-label="Quantidade">
      <button type="button" data-cart="mais" data-id="${id}" aria-label="Aumentar quantidade">+</button>
    </div>`;
  }
  function acaoHTML(id) {
    const q = qtds[id] || 0;
    return q ? stepperHTML(id, q)
             : `<button type="button" class="btn-add" data-cart="add" data-id="${id}">Adicionar ao carrinho</button>`;
  }
  function atualizarCards(id) {
    document.querySelectorAll(`[data-acao="${id}"]`).forEach(el => { el.innerHTML = acaoHTML(id); });
  }

  // ---------- Contador do cabeçalho ----------
  function atualizarBadge() {
    const n = totalItens();
    const b = $("cart-badge");
    b.textContent = n > 99 ? "99+" : n;
    b.hidden = n === 0;
    atualizarFlutuante();
    $("cart-abrir").setAttribute("aria-label", n ? `Abrir carrinho, ${n} ${n === 1 ? "item" : "itens"}` : "Abrir carrinho, vazio");
  }

  // ---------- Painel do carrinho ----------
  function renderCarrinho() {
    const ls = linhas();
    const vazio = ls.length === 0;
    $("cart-vazio").hidden = !vazio;
    $("cart-conteudo").hidden = vazio;
    $("cart-enviar").disabled = vazio;
    $("cart-limpar").hidden = vazio;

    $("cart-lista").innerHTML = ls.map(({ p, q, sub }) => `
      <li class="linha">
        <div class="linha-info">
          <span class="linha-cod">CÓD. ${p.id}</span>
          <strong class="linha-nome">${esc(p.nome)}</strong>
          <span class="linha-unit">${brl(centavos(p))} cada</span>
        </div>
        <div class="linha-acoes">
          ${stepperHTML(p.id, q)}
          <span class="linha-total">${brl(sub)}</span>
          <button type="button" class="linha-remover" data-cart="remover" data-id="${p.id}" aria-label="Remover ${esc(p.nome)} do carrinho">Remover</button>
        </div>
      </li>`).join("");

    $("res-itens").textContent = totalItens();
    $("res-produtos").textContent = ls.length;
    $("res-total").textContent = brl(totalCentavos());
    $("rod-total").textContent = brl(totalCentavos());
    atualizarFlutuante();
  }

  // Barra fixa no rodapé do celular: aparece quando há itens e o carrinho está fechado.
  function atualizarFlutuante() {
    const n = totalItens(), f = $("cart-flutuante");
    f.hidden = n === 0 || aberto();
    $("flu-itens").textContent = n;
    $("flu-total").textContent = brl(totalCentavos());
  }

  function abrir() {
    ultimoFoco = document.activeElement;
    renderCarrinho();
    $("cart-overlay").hidden = false;
    const el = $("cart");
    el.classList.add("aberto");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-aberto");
    atualizarFlutuante();
    $("cart-fechar").focus({ preventScroll: true });
  }
  function fechar() {
    $("cart").classList.remove("aberto");
    $("cart").setAttribute("aria-hidden", "true");
    $("cart-overlay").hidden = true;
    document.body.classList.remove("cart-aberto");
    atualizarFlutuante();
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true });
  }
  const aberto = () => $("cart").classList.contains("aberto");

  // ---------- Formulário do cliente ----------
  const CAMPOS = ["nome", "empresa", "documento", "cidade", "telefone"];
  const campo = n => $("c-" + n);

  function erro(n, msg) {
    const el = campo(n), out = $("erro-" + n);
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    out.textContent = msg || "";
  }

  function lerFormulario() {
    const v = n => campo(n).value.trim().replace(/\s+/g, " ");
    return { nome: v("nome"), empresa: v("empresa"), documento: v("documento"), cidade: v("cidade"), telefone: v("telefone") };
  }

  function validar() {
    const d = lerFormulario();
    const e = {};
    if (d.nome.length < 3) e.nome = "Informe o nome do comprador.";
    //if (d.empresa.length < 2) e.empresa = "Informe o nome da empresa ou estabelecimento.";
    if (!d.documento) {
      if (CONFIG.documentoObrigatorio !== false) e.documento = "Informe o CPF ou CNPJ.";
    } else if (!Validacao.documento(d.documento).ok) {
      e.documento = "CPF ou CNPJ inválido. Confira os números.";
    }
    if (d.cidade.length < 2) e.cidade = "Informe a cidade.";
    if (d.telefone && !Validacao.telefoneValido(d.telefone)) e.telefone = "Telefone inválido. Use DDD + número.";

    CAMPOS.forEach(n => erro(n, e[n]));
    const primeiro = CAMPOS.find(n => e[n]);
    if (primeiro) {
      aviso("Preencha os campos marcados em vermelho para enviar.");
      const el = campo(primeiro);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus({ preventScroll: true });
    }
    return { ok: !primeiro, dados: d };
  }

  function carregarCliente() {
    const c = lerJSON(CHAVE_CLIENTE, {});
    CAMPOS.forEach(n => { if (typeof c[n] === "string") campo(n).value = c[n]; });
  }
  function salvarCliente(d) { gravarJSON(CHAVE_CLIENTE, d); }

  // ---------- Mensagem do WhatsApp ----------
  function montarMensagem(d) {
    const ls = linhas();
    const itens = ls.map(({ p, q, sub }) =>
      `Cód. ${p.id} - ${p.nome}\n    ${q} un. x ${brl(centavos(p))} = ${brl(sub)}`).join("\n");
    const total = totalItens();
    const l = [
      "*SOLICITAÇÃO DE ORÇAMENTO*",
      "_Conexão Autos - Catálogo Digital_",
      "",
      "⚠️ *Atenção:* esta mensagem é apenas uma solicitação de orçamento. O envio *não* significa compra confirmada nem reserva de estoque. Disponibilidade, preços e condições serão confirmados pela equipe comercial.",
      "",
      "*DADOS DO CLIENTE*",
      `Nome: ${d.nome}`,
      `Empresa: ${d.empresa}`,
      `CPF/CNPJ: ${d.documento}`,
      `Cidade: ${d.cidade}`,
    ];
    if (d.telefone) l.push(`Telefone: ${d.telefone}`);
    l.push(
      "",
      "*ITENS SOLICITADOS*",
      itens,
      "",
      `*Total de itens:* ${total} (${ls.length} ${ls.length === 1 ? "produto" : "produtos"})`,
      `*Valor geral estimado:* ${brl(totalCentavos())}`,
      "_Valores de referência, sujeitos a confirmação._"
    );
    return l.join("\n");
  }

  function aviso(msg) {
    if (msg) $("cart-fallback").hidden = true;
    const el = $("cart-aviso");
    el.textContent = msg;
    el.hidden = !msg;
  }

  function enviar() {
    aviso("");
    if (!linhas().length) return;

    const numero = String(CONFIG.whatsapp || "").replace(/\D/g, "");
    if (numero.length < 12 || numero.length > 13) {
      aviso("O número de WhatsApp da loja ainda não foi configurado (CONFIG.whatsapp em produtos.js).");
      return;
    }
    const { ok, dados } = validar();
    if (!ok) return;
    if (dados.documento) dados.documento = Validacao.mascaraDoc(dados.documento);

    const mensagem = montarMensagem(dados);
    let url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    salvarCliente(dados);

    // Pedido grande: o link com texto pode ser cortado no celular. Copia a mensagem e abre só a conversa.
    if (url.length > MAX_URL) {
      url = `https://wa.me/${numero}`;
      copiarTexto(mensagem).then(copiou => {
        aviso(copiou
          ? "Pedido grande: a mensagem foi COPIADA. No WhatsApp, cole na conversa e envie."
          : "Pedido grande demais para o link. Divida em dois pedidos menores.");
        if (copiou) abrirWhats(url);
      });
      return;
    }
    abrirWhats(url);
  }

  // No celular, navegar na mesma aba é o jeito mais confiável (window.open é bloqueado em vários navegadores,
  // principalmente dentro do Instagram/Facebook). Também deixamos um link manual de reserva.
  function abrirWhats(url) {
    const a = $("cart-link");
    a.href = url;
    $("cart-fallback").hidden = false;
    window.location.href = url;
  }

  function copiarTexto(t) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(t).then(() => true, () => copiarAntigo(t));
    }
    return Promise.resolve(copiarAntigo(t));
  }
  function copiarAntigo(t) {
    try {
      const ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }

  // ---------- Eventos ----------
  function aoClicar(e) {
    const el = e.target.closest("[data-cart]");
    if (!el) return;
    const id = Number(el.dataset.id), q = qtds[id] || 0, tipo = el.dataset.cart;
    if (tipo === "qtd") return; // tratado no evento "change"

    // Guarda onde estava o foco para devolvê-lo depois de redesenhar (acessibilidade por teclado).
    const noPainel = !!el.closest("#cart");
    let foco = tipo;
    if (tipo === "add") foco = "mais";
    if (tipo === "menos" && q <= 1) foco = "add";

    if (tipo === "add") definir(id, 1);
    else if (tipo === "mais") definir(id, q + 1);
    else if (tipo === "menos") definir(id, q - 1);
    else if (tipo === "remover") definir(id, 0);

    const raiz = noPainel ? $("cart") : $("grade");
    const alvo = raiz.querySelector(`[data-id="${id}"][data-cart="${foco}"]`);
    if (alvo) alvo.focus();
  }
  function aoMudar(e) {
    const el = e.target;
    if (el.dataset && el.dataset.cart === "qtd") definir(Number(el.dataset.id), el.value);
  }

  function iniciar(listaProdutos, formatador) {
    produtos = listaProdutos;
    fmt = formatador;
    porId = new Map(produtos.map(p => [p.id, p]));
    porNome = new Map(produtos.map(p => [p.nome, p]));
    carregar();
    carregarCliente();
    atualizarBadge();
    renderCarrinho();

    document.addEventListener("click", aoClicar);
    document.addEventListener("change", aoMudar);
    $("cart-abrir").addEventListener("click", abrir);
    $("cart-flutuante").addEventListener("click", abrir);
    $("cart-fechar").addEventListener("click", fechar);
    $("cart-overlay").addEventListener("click", fechar);
    $("cart-enviar").addEventListener("click", enviar);
    $("cart-limpar").addEventListener("click", () => {
      if (confirm("Remover todos os produtos do carrinho?")) {
        const ids = Object.keys(qtds);
        qtds = {}; salvar();
        ids.forEach(i => atualizarCards(i));
        atualizarBadge(); renderCarrinho();
      }
    });
    $("cart-form").addEventListener("submit", e => { e.preventDefault(); enviar(); });

    // Máscaras e limpeza do erro enquanto digita
    campo("documento").addEventListener("input", e => { e.target.value = Validacao.mascaraDoc(e.target.value); });
    campo("telefone").addEventListener("input", e => { e.target.value = Validacao.mascaraTel(e.target.value); });
    CAMPOS.forEach(n => campo(n).addEventListener("input", () => { erro(n, ""); aviso(""); }));

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && aberto()) { fechar(); return; }
      // Mantém o Tab dentro do painel enquanto ele está aberto
      if (e.key === "Tab" && aberto()) {
        const foc = [...$("cart").querySelectorAll("button, input, a[href]")].filter(x => !x.disabled && !x.closest("[hidden]"));
        if (!foc.length) return;
        const a = foc[0], z = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });

    // Se o carrinho for alterado em outra aba do mesmo navegador, acompanha.
    window.addEventListener("storage", ev => {
      if (ev.key !== CHAVE) return;
      const antes = Object.keys(qtds);
      carregar();
      new Set([...antes, ...Object.keys(qtds)]).forEach(i => atualizarCards(i));
      atualizarBadge(); renderCarrinho();
    });
  }

  return { iniciar, acaoHTML, abrir, fechar };
})();
