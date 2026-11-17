const REGRAS = [
  [/AROMATIZ|AREON|LITTLE|AIR TRUCK|NATUAR/i, "Aromatizantes"],
  [/ESCOVA|PINCEL|BOINA|APLICADOR|ESPUMA APLIC|CANHÃO|PISTOLA|CALOTA|SNOW PUMP|GLACO|SNOW FOAM|TORNADOR/i, "Acessórios e Aplicadores"],
  [/MICROFIBRA|TOALHA|FLANELA|LUVA|PANOS/i, "Microfibras e Toalhas"],
  [/PNEU|BORRACHA|PARA-CHOQUES|PLÁSTICO|REVITALIZ/i, "Pneus e Plásticos"],
  [/COURO|HIDRACOURO|LEATHER|INTERIOR|APC|ESTOFADOS|OXXY/i, "Couro e Interior"],
  [/LAVA AUTO|HIGH SHINE|NEVASCA|PRE WASH|DEMOLIDOR/i, "Lavagem"],
  [/CERA|WAX|POLID|POLIMENTO|CORTE|CLAY|ATOMIC|CARNAÚBA|CRISTALIZANTE|FINALE|BLEND|GLOSS|LUSTRO|REFINO|V10|V20|V30|V40/i, "Ceras e Polimento"],
];
const REGRA_PROFISSIONAL = /\b(1,5|5)\s?(L|LITROS?)\b/i;
const PROFISSIONAL_EXCLUSIVA = true;
const categorias = n => {
  const pro = REGRA_PROFISSIONAL.test(n);
  if (pro && PROFISSIONAL_EXCLUSIVA) return ["Categoria Profissional"];
  const a = REGRAS.filter(r => r[0].test(n)).map(r => r[1]);
  if (pro) a.push("Categoria Profissional");
  return a.length ? a : ["Limpeza Geral"];
};
// Descrição por categoria (edite livremente ou crie DESCRICOES[id] em produtos.js para textos específicos)
const DESC = {
  "Lavagem": "Linha de lavagem automotiva para remover sujeira e contaminantes com segurança, preservando a pintura e realçando o brilho.",
  "Ceras e Polimento": "Proteção e acabamento para a pintura: corta, nivela ou protege, entregando brilho profundo e efeito hidrofóbico.",
  "Pneus e Plásticos": "Revitaliza pneus, borrachas e plásticos externos, devolvendo cor e acabamento de zero km com proteção duradoura.",
  "Couro e Interior": "Limpeza e hidratação para bancos, painéis e estofados, eliminando manchas e mantendo o interior macio e conservado.",
  "Microfibras e Toalhas": "Microfibras de alta absorção e toque macio para secagem, acabamento e limpeza sem riscar a superfície.",
  "Acessórios e Aplicadores": "Ferramentas e aplicadores para detalhamento profissional, com mais precisão, rendimento e produtividade na estética.",
  "Aromatizantes": "Fragrância marcante e duradoura para deixar o interior do veículo com cheiro de novo.",
  "Categoria Profissional": "Embalagem econômica (galão) para uso intensivo em lava-rápidos e estéticas, com excelente custo por aplicação.",
  "Limpeza Geral": "Produto de limpeza automotiva de uso versátil, indicado para rotina de lavagem e manutenção do veículo.",
};
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1677ff" stroke-width="3"><rect x="10" y="10" width="44" height="44" rx="6"/><circle cx="24" cy="26" r="5"/><path d="M10 46l14-12 10 8 8-6 12 10"/></svg>');

const itens = PRODUTOS.map(([nome, preco], i) => ({ id: i + 1, nome, preco, cats: categorias(nome) }));
let filtro = "Todos", termo = "", ordem = "";
const $ = id => document.getElementById(id);
const fonteImagem = p => IMAGENS[p.id] || `img/produtos/${p.id}.jpg`;
const imgTag = p => `<img src="${fonteImagem(p)}" alt="${esc(p.nome)}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER}';this.classList.add('vazia')">`;

// ----- Animação de entrada (scroll reveal) -----
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in"); io.unobserve(e.target);
  if (e.target.dataset.count !== undefined) contar(e.target);
}), { threshold: .12 });
const observar = (sel, raiz = document) => raiz.querySelectorAll(sel).forEach(el => io.observe(el));

function contar(el) {
  const alvo = +el.dataset.count, suf = el.dataset.suf || "", t0 = performance.now();
  const passo = t => { const k = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}

// ----- Catálogo -----
function render() {
  let lista = itens.filter(p => (filtro === "Todos" || p.cats.includes(filtro)) && norm(p.nome).includes(termo));
  if (ordem === "menor") lista.sort((a, b) => a.preco - b.preco);
  if (ordem === "maior") lista.sort((a, b) => b.preco - a.preco);
  if (ordem === "az") lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  $("contador").textContent = `${lista.length} produto(s)`;
  $("grade").innerHTML = lista.map(p => `
    <article class="card" data-id="${p.id}" tabindex="0" role="button" aria-label="Ver detalhes de ${esc(p.nome)}">
      <div class="foto">${imgTag(p)}</div>
      <div class="info">
        ${p.cats.map(c => `<span class="cat">${c}</span>`).join("")}
        <h3 class="nome">${esc(p.nome)}</h3>
        <span class="cod">Cód. ${p.id}</span>
        ${CONFIG.mostrarPreco ? `<div class="preco">${fmt(p.preco)}</div>` : ""}
        <div class="acao" data-acao="${p.id}">${Carrinho.acaoHTML(p.id)}</div>
      </div>
    </article>`).join("");
  document.querySelectorAll("#grade .card").forEach((c, i) => { c.style.transitionDelay = (i % 8) * 45 + "ms"; io.observe(c); });
}

function filtros() {
  const cats = ["Todos", ...new Set(itens.flatMap(p => p.cats))];
  $("filtros").innerHTML = cats.map(c => `<button class="${c === filtro ? "ativo" : ""}">${c}</button>`).join("");
  return cats.length - 1;
}
$("filtros").onclick = e => { if (e.target.tagName === "BUTTON") { filtro = e.target.textContent; filtros(); render(); } };
// Ao buscar, leva a página até o catálogo (a barra de busca fica visível no cabeçalho fixo)
const irParaCatalogo = (comportamento = "smooth") => document.getElementById("filtros").scrollIntoView({ behavior: comportamento, block: "start" });
const campoBusca = document.getElementById("busca");
campoBusca.oninput = e => { termo = e.target.value.toLowerCase(); render(); irParaCatalogo("instant"); };
campoBusca.onfocus = () => { if (document.getElementById("filtros").getBoundingClientRect().top > 100) irParaCatalogo(); };
$("ordem").onchange = e => { ordem = e.target.value; render(); };

// ----- Modal de detalhes do produto -----
const modal = new bootstrap.Modal($("pm"));
function abrirProduto(id) {
  const p = itens.find(x => x.id === id); if (!p) return;
  const vol = (p.nome.match(/\d+(?:,\d+)?\s?(?:ml|l|kg|g)\b/i) || ["—"])[0];
  const texto = (typeof DESCRICOES !== "undefined" && DESCRICOES[p.id]) || DESC[p.cats[0]] || DESC["Limpeza Geral"];
  $("pm-img").src = fonteImagem(p); $("pm-img").alt = p.nome;
  $("pm-img").onerror = function () { this.onerror = null; this.src = PLACEHOLDER; };
  $("pm-cats").innerHTML = p.cats.map(c => `<span class="cat">${c}</span>`).join("");
  //$("pm-nome").textContent = p.nome; $("pm-cod").textContent = "Cód. " + p.id;
  $("pm-desc").textContent = texto;
  //$("pm-specs").innerHTML = `<li><b>CATEGORIA</b>${esc(p.cats[0])}</li><li><b>EMBALAGEM</b>${esc(vol)}</li><li><b>CÓDIGO</b>${p.id}</li><li><b>CONDIÇÃO</b>Orçamento via WhatsApp</li>`;
  $("pm-specs").innerHTML = `<li><b>CATEGORIA</b>${esc(p.cats[0])}</li><li><b>CONDIÇÃO</b>Orçamento via WhatsApp</li>`;
  $("pm-preco").textContent = CONFIG.mostrarPreco ? fmt(p.preco) : "";
  const a = $("pm-acao"); a.dataset.acao = p.id; a.innerHTML = Carrinho.acaoHTML(p.id);
  modal.show();
}
$("grade").addEventListener("click", e => { if (e.target.closest(".acao")) return; const c = e.target.closest(".card"); if (c) abrirProduto(+c.dataset.id); });
$("grade").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) { e.preventDefault(); abrirProduto(+e.target.dataset.id); } });

Carrinho.iniciar(itens, fmt);
const nCats = filtros(); render();
$("st-prod").dataset.count = itens.length; $("st-cat").dataset.count = nCats;
observar("[data-rv]"); observar("[data-count]");
