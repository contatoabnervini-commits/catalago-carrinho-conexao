// Validações e máscaras usadas no formulário do carrinho.
// Funções puras (sem acesso ao DOM), por isso fáceis de testar.
const Validacao = (() => {
  // Mantém só letras e números, em maiúsculas (o CNPJ passou a aceitar letras em 2026).
  const limparDoc = v => String(v || "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14);
  const soDigitos = v => String(v || "").replace(/\D/g, "");

  function cpfValido(c) {
    if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
    }
    return true;
  }

  // CNPJ numérico e alfanumérico: cada caractere vale (código ASCII - 48); os 2 últimos são dígitos.
  function cnpjValido(c) {
    if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false;
    const valor = ch => ch.charCodeAt(0) - 48;
    const dv = n => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < n; i++) soma += valor(c[i]) * pesos[i];
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
  }

  // Retorna { ok, tipo: "CPF"|"CNPJ"|null }
  function documento(v) {
    const c = limparDoc(v);
    if (c.length === 11 && cpfValido(c)) return { ok: true, tipo: "CPF" };
    if (c.length === 14 && cnpjValido(c)) return { ok: true, tipo: "CNPJ" };
    return { ok: false, tipo: null };
  }

  // Aplica um molde ("#" = próximo caractere) e para quando o texto acaba.
  function aplicarMolde(texto, molde) {
    let saida = "", i = 0;
    for (const m of molde) {
      if (i >= texto.length) break;
      if (m === "#") saida += texto[i++];
      else saida += m;
    }
    return saida;
  }

  // Máscara progressiva: até 11 dígitos = CPF; acima disso (ou com letras) = CNPJ.
  function mascaraDoc(v) {
    const c = limparDoc(v);
    if (c.length <= 11 && /^\d*$/.test(c)) return aplicarMolde(c, "###.###.###-##");
    return aplicarMolde(c, "##.###.###/####-##");
  }

  // Telefone brasileiro: DDD (11–99) + 8 ou 9 dígitos.
  function telefoneValido(v) {
    const d = soDigitos(v);
    return /^[1-9]\d(9\d{8}|[2-9]\d{7})$/.test(d);
  }

  function mascaraTel(v) {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  return { limparDoc, soDigitos, cpfValido, cnpjValido, documento, mascaraDoc, telefoneValido, mascaraTel };
})();

if (typeof module !== "undefined") module.exports = Validacao;
