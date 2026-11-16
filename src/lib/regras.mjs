// As regras dos dados do site da AL Art Craft — as mesmas no gerador (scripts/build.mjs) e no painel (cópia byte a
// byte em estatico/js/regras.js). Sem dependências e sem Node: corre no browser.
//
// Cada função recebe os dados e devolve uma lista de problemas { campo, msg } (vazia = tudo certo). O gerador pára a
// publicação com qualquer problema; o painel mostra-os ao lado do campo e recusa gravar os NOVOS.

export const LIMITES = {
  marca: 40, frase: 90, descricaoSite: 170, mensagemWhatsapp: 200, textoEncomendas: 400,
  nomeCategoria: 40, fraseCategoria: 120,
  nomeProduto: 70, resumo: 140, descricao: 420, rotulo: 30, valor: 90, caracteristicas: 8, fotosProduto: 12,
  opcoes: 3, valoresOpcao: 8, nomeOpcao: 30, nomeValor: 40,
  cliente: 60, tituloTrabalho: 90, local: 60, fotosTrabalho: 16,
  etiquetaCapa: 40, tituloCapa: 50, destaqueCapa: 40, textoCapa: 230, videosCapaMin: 3, videosCapaMax: 6,
  tituloPasso: 40, textoPasso: 140, tituloConvite: 60, textoConvite: 200,
  destaquesProdutos: 4, destaquesTrabalhos: 3,
  alt: 150, precoMax: 100000,
};

export const CATEGORIAS_FIXAS = ['tabuas-de-servir', 'ferro-fundido', 'pratos-e-bases', 'mesa-e-sala', 'caixas', 'placas-e-letreiros', 'catering-e-eventos'];
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const NOME_FOTO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const texto = (v) => typeof v === 'string';
const vazio = (v) => v == null || (texto(v) && v.trim() === '');
// caracteres que não se veem e partem pesquisas e comparações (o trim() não os tira)
const INVISIVEIS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u2028\u2029\u2060\uFEFF]/;

function campoTexto(problemas, campo, v, { max, obrigatorio = true, linhas = false } = {}) {
  if (vazio(v)) { if (obrigatorio) problemas.push({ campo, msg: 'Falta preencher.' }); return; }
  if (!texto(v)) { problemas.push({ campo, msg: 'Tem de ser texto.' }); return; }
  if (v !== v.trim()) problemas.push({ campo, msg: 'Tem espaços a mais no início ou no fim.' });
  if (INVISIVEIS.test(v)) problemas.push({ campo, msg: 'Tem caracteres invisíveis (copiados de outro sítio). Escreva-o outra vez.' });
  if (!linhas && /\n/.test(v)) problemas.push({ campo, msg: 'Tem de ficar numa linha só.' });
  if (/<\/?[a-z][^>]*>/i.test(v)) problemas.push({ campo, msg: 'Não pode ter código (< >).' });
  if (max && [...v].length > max) problemas.push({ campo, msg: `Tem ${[...v].length} caracteres; o máximo é ${max}.` });
}

export function nifValido(nif) {
  const s = String(nif ?? '').replace(/\s/g, '');
  if (!/^[0-9]{9}$/.test(s) || !/^[125689]|^45|^7[0-9]/.test(s)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(s[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(s[8]);
}

export function regrasSite(s) {
  const p = [];
  if (!s || typeof s !== 'object') return [{ campo: 'site', msg: 'Os dados da loja não se leram.' }];
  campoTexto(p, 'marca', s.marca, { max: LIMITES.marca });
  campoTexto(p, 'dono', s.dono, { max: 60 });
  campoTexto(p, 'frase', s.frase, { max: LIMITES.frase });
  campoTexto(p, 'descricao', s.descricao, { max: LIMITES.descricaoSite });
  if (!/^351[29][0-9]{8}$/.test(String(s.whatsapp ?? ''))) p.push({ campo: 'whatsapp', msg: 'O número do WhatsApp tem de ser português, com 9 algarismos (ex.: 917 443 823).' });
  if (!/^[29][0-9]{2} [0-9]{3} [0-9]{3}$/.test(String(s.telefone ?? ''))) p.push({ campo: 'telefone', msg: 'Escreva o telefone com 9 algarismos, em grupos de três (ex.: 917 443 823).' });
  if (!vazio(s.email) && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s.email)) p.push({ campo: 'email', msg: 'O email não parece certo.' });
  if (!vazio(s.instagram) && !/^[a-z0-9._]{1,30}$/.test(s.instagram)) p.push({ campo: 'instagram', msg: 'Escreva só o nome da conta (ex.: al.artcraft), sem @ nem ligação.' });
  campoTexto(p, 'localidade', s.localidade, { max: 40 });
  if (!/^[0-9]{4}-[0-9]{3}$/.test(String(s.codigoPostal ?? ''))) p.push({ campo: 'codigoPostal', msg: 'O código postal escreve-se 0000-000.' });
  const e = s.empresa ?? {};
  campoTexto(p, 'empresa.nome', e.nome, { max: 90, obrigatorio: false });
  if (!vazio(e.nif) && !nifValido(e.nif)) p.push({ campo: 'empresa.nif', msg: 'Este NIF não é válido (confira os 9 algarismos).' });
  campoTexto(p, 'empresa.morada', e.morada, { max: 160, obrigatorio: false });
  const enc = s.encomendas ?? {};
  for (const k of ['prazo', 'entrega', 'pagamento', 'iva']) campoTexto(p, `encomendas.${k}`, enc[k], { max: LIMITES.textoEncomendas, obrigatorio: false, linhas: true });
  campoTexto(p, 'mensagemWhatsapp', s.mensagemWhatsapp, { max: LIMITES.mensagemWhatsapp });
  return p;
}

/** O que a lei pede para vender e ainda falta (o gerador em produção pára; a pré-visualização mostra «[por confirmar]»). */
export function emFaltaParaProducao(s) {
  const f = [];
  if (vazio(s?.empresa?.nome)) f.push('o nome ou a firma de quem vende');
  if (vazio(s?.empresa?.nif)) f.push('o NIF');
  if (vazio(s?.empresa?.morada)) f.push('a morada');
  if (vazio(s?.email)) f.push('o email');
  if (vazio(s?.encomendas?.entrega)) f.push('a entrega e os portes');
  if (vazio(s?.encomendas?.pagamento)) f.push('as formas de pagamento');
  if (vazio(s?.encomendas?.iva)) f.push('se os preços incluem IVA');
  return f;
}

export function regrasCategorias(lista, fotos = null) {
  const p = [];
  if (!Array.isArray(lista)) return [{ campo: 'categorias', msg: 'A lista de categorias não se leu.' }];
  const slugs = lista.map((c) => c.slug);
  for (const s of CATEGORIAS_FIXAS) if (!slugs.includes(s)) p.push({ campo: 'categorias', msg: `Falta a categoria «${s}».` });
  lista.forEach((c, i) => {
    const pre = `categorias.${c.slug ?? i}`;
    if (!CATEGORIAS_FIXAS.includes(c.slug)) p.push({ campo: pre, msg: 'Categoria desconhecida.' });
    campoTexto(p, pre + '.nome', c.nome, { max: LIMITES.nomeCategoria });
    campoTexto(p, pre + '.frase', c.frase, { max: LIMITES.fraseCategoria });
    if (fotos && !fotos[c.foto]) p.push({ campo: pre + '.foto', msg: 'A fotografia não está na biblioteca.' });
    if (!Number.isInteger(c.ordem)) p.push({ campo: pre + '.ordem', msg: 'A ordem tem de ser um número inteiro.' });
  });
  const nomes = lista.map((c) => (c.nome ?? '').trim().toLowerCase());
  nomes.forEach((n, i) => { if (n && nomes.indexOf(n) !== i) p.push({ campo: `categorias.${lista[i].slug}.nome`, msg: 'Há outra categoria com este nome.' }); });
  return p;
}

export function precoValido(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= LIMITES.precoMax && Math.round(v * 100) === v * 100;
}

export function regrasProduto(slug, d, { fotos = null, videos = null, trabalhos = null } = {}) {
  const p = [];
  if (!SLUG.test(slug)) p.push({ campo: 'slug', msg: 'O endereço só pode ter letras minúsculas sem acentos, algarismos e hífenes.' });
  campoTexto(p, 'nome', d.nome, { max: LIMITES.nomeProduto });
  if (!CATEGORIAS_FIXAS.includes(d.categoria)) p.push({ campo: 'categoria', msg: 'Escolha a categoria.' });
  if (!precoValido(d.preco)) p.push({ campo: 'preco', msg: 'O preço tem de ser maior do que zero, com duas casas decimais no máximo.' });
  if (typeof d.desde !== 'boolean') p.push({ campo: 'desde', msg: 'Diga se o preço é «desde».' });
  campoTexto(p, 'unidade', d.unidade, { max: 20, obrigatorio: false });
  campoTexto(p, 'resumo', d.resumo, { max: LIMITES.resumo });
  campoTexto(p, 'descricao', d.descricao, { max: LIMITES.descricao, obrigatorio: false, linhas: true });
  if (!Array.isArray(d.caracteristicas)) p.push({ campo: 'caracteristicas', msg: 'As características não se leram.' });
  else {
    if (d.caracteristicas.length > LIMITES.caracteristicas) p.push({ campo: 'caracteristicas', msg: `No máximo ${LIMITES.caracteristicas} linhas.` });
    d.caracteristicas.forEach((par, i) => {
      if (!Array.isArray(par) || par.length !== 2) { p.push({ campo: `caracteristicas.${i}`, msg: 'Cada linha tem um nome e um valor.' }); return; }
      campoTexto(p, `caracteristicas.${i}.0`, par[0], { max: LIMITES.rotulo });
      campoTexto(p, `caracteristicas.${i}.1`, par[1], { max: LIMITES.valor });
    });
  }
  const opcoes = d.opcoes ?? [];
  if (!Array.isArray(opcoes) || opcoes.length > LIMITES.opcoes) p.push({ campo: 'opcoes', msg: `No máximo ${LIMITES.opcoes} escolhas.` });
  else opcoes.forEach((o, i) => {
    campoTexto(p, `opcoes.${i}.nome`, o.nome, { max: LIMITES.nomeOpcao });
    if (!Array.isArray(o.valores) || o.valores.length < 2 || o.valores.length > LIMITES.valoresOpcao) { p.push({ campo: `opcoes.${i}.valores`, msg: `Uma escolha tem de 2 a ${LIMITES.valoresOpcao} valores.` }); return; }
    o.valores.forEach((v, j) => {
      campoTexto(p, `opcoes.${i}.valores.${j}.nome`, v.nome, { max: LIMITES.nomeValor });
      if (typeof v.mais !== 'number' || v.mais < 0 || Math.round(v.mais * 100) !== v.mais * 100) p.push({ campo: `opcoes.${i}.valores.${j}.mais`, msg: 'O acréscimo é um valor em euros (0 se não muda o preço).' });
    });
    // o preço anunciado tem de se poder pagar: cada escolha tem um valor sem acréscimo
    if (o.valores.every((v) => (v.mais ?? 0) > 0)) p.push({ campo: `opcoes.${i}.valores`, msg: 'Pelo menos um valor tem de ficar a 0 €: é o preço que o site anuncia.' });
  });
  const temAcrescimo = opcoes.some((o) => (o.valores ?? []).some((v) => v.mais > 0));
  if (temAcrescimo && d.desde !== true) p.push({ campo: 'desde', msg: 'Com escolhas que sobem o preço, o preço tem de aparecer como «desde».' });
  if (!Array.isArray(d.fotos) || d.fotos.length === 0) p.push({ campo: 'fotos', msg: 'Ponha pelo menos uma fotografia.' });
  else {
    if (d.fotos.length > LIMITES.fotosProduto) p.push({ campo: 'fotos', msg: `No máximo ${LIMITES.fotosProduto} fotografias.` });
    if (new Set(d.fotos).size !== d.fotos.length) p.push({ campo: 'fotos', msg: 'Há fotografias repetidas.' });
    if (fotos) d.fotos.forEach((f) => { if (!fotos[f]) p.push({ campo: 'fotos', msg: `A fotografia «${f}» não está na biblioteca.` }); });
  }
  if (d.video != null && videos && !videos.includes(d.video)) p.push({ campo: 'video', msg: `O vídeo «${d.video}» não existe.` });
  if (d.feitaPara != null && trabalhos && !trabalhos[d.feitaPara]) p.push({ campo: 'feitaPara', msg: 'Esse trabalho não existe no portefólio.' });
  for (const k of ['destaque', 'publicado']) if (typeof d[k] !== 'boolean') p.push({ campo: k, msg: 'Tem de ser sim ou não.' });
  if (!Number.isInteger(d.ordem) || d.ordem < 1) p.push({ campo: 'ordem', msg: 'A ordem tem de ser um número inteiro positivo.' });
  return p;
}

export function regrasTrabalho(slug, d, { fotos = null, videos = null, produtos = null } = {}) {
  const p = [];
  if (!SLUG.test(slug)) p.push({ campo: 'slug', msg: 'O endereço só pode ter letras minúsculas sem acentos, algarismos e hífenes.' });
  campoTexto(p, 'cliente', d.cliente, { max: LIMITES.cliente });
  campoTexto(p, 'titulo', d.titulo, { max: LIMITES.tituloTrabalho });
  campoTexto(p, 'local', d.local, { max: LIMITES.local, obrigatorio: false });
  if (d.ano != null && (!Number.isInteger(d.ano) || d.ano < 2000 || d.ano > 2100)) p.push({ campo: 'ano', msg: 'O ano tem quatro algarismos.' });
  if (!Array.isArray(d.fotos) || d.fotos.length === 0) p.push({ campo: 'fotos', msg: 'Ponha pelo menos uma fotografia.' });
  else {
    if (d.fotos.length > LIMITES.fotosTrabalho) p.push({ campo: 'fotos', msg: `No máximo ${LIMITES.fotosTrabalho} fotografias.` });
    if (new Set(d.fotos).size !== d.fotos.length) p.push({ campo: 'fotos', msg: 'Há fotografias repetidas.' });
    if (fotos) d.fotos.forEach((f) => { if (!fotos[f]) p.push({ campo: 'fotos', msg: `A fotografia «${f}» não está na biblioteca.` }); });
  }
  if (d.video != null && videos && !videos.includes(d.video)) p.push({ campo: 'video', msg: `O vídeo «${d.video}» não existe.` });
  if (!Array.isArray(d.produtos)) p.push({ campo: 'produtos', msg: 'A lista de produtos não se leu.' });
  else if (produtos) d.produtos.forEach((s) => { if (!produtos[s]) p.push({ campo: 'produtos', msg: `O produto «${s}» não existe.` }); });
  for (const k of ['destaque', 'publicado']) if (typeof d[k] !== 'boolean') p.push({ campo: k, msg: 'Tem de ser sim ou não.' });
  if (!Number.isInteger(d.ordem) || d.ordem < 1) p.push({ campo: 'ordem', msg: 'A ordem tem de ser um número inteiro positivo.' });
  return p;
}

export function regrasInicio(d, { videos = null } = {}) {
  const p = [];
  const c = d?.capa ?? {};
  campoTexto(p, 'capa.etiqueta', c.etiqueta, { max: LIMITES.etiquetaCapa, obrigatorio: false });
  campoTexto(p, 'capa.titulo', c.titulo, { max: LIMITES.tituloCapa });
  campoTexto(p, 'capa.tituloDestaque', c.tituloDestaque, { max: LIMITES.destaqueCapa, obrigatorio: false });
  campoTexto(p, 'capa.texto', c.texto, { max: LIMITES.textoCapa });
  const vs = c.videos;
  if (!Array.isArray(vs) || vs.length < LIMITES.videosCapaMin || vs.length > LIMITES.videosCapaMax) p.push({ campo: 'capa.videos', msg: `A capa tem de ${LIMITES.videosCapaMin} a ${LIMITES.videosCapaMax} vídeos.` });
  else {
    if (new Set(vs).size !== vs.length) p.push({ campo: 'capa.videos', msg: 'Há vídeos repetidos na capa.' });
    if (videos) vs.forEach((v) => { if (!videos.includes(v)) p.push({ campo: 'capa.videos', msg: `O vídeo «${v}» não existe.` }); });
  }
  const passos = d?.processo ?? [];
  if (!Array.isArray(passos) || passos.length !== 3) p.push({ campo: 'processo', msg: 'São três passos.' });
  else passos.forEach((s, i) => {
    campoTexto(p, `processo.${i}.titulo`, s.titulo, { max: LIMITES.tituloPasso });
    campoTexto(p, `processo.${i}.texto`, s.texto, { max: LIMITES.textoPasso });
  });
  campoTexto(p, 'convite.titulo', d?.convite?.titulo, { max: LIMITES.tituloConvite });
  campoTexto(p, 'convite.texto', d?.convite?.texto, { max: LIMITES.textoConvite });
  return p;
}

/** A página inicial mostra no máximo 4 produtos e 3 trabalhos em destaque. */
export function regrasDestaques(produtos, trabalhos) {
  const p = [];
  const np = Object.values(produtos ?? {}).filter((x) => x.destaque && x.publicado).length;
  const nt = Object.values(trabalhos ?? {}).filter((x) => x.destaque && x.publicado).length;
  if (np > LIMITES.destaquesProdutos) p.push({ campo: 'destaque', msg: `Há ${np} produtos em destaque; a página inicial mostra ${LIMITES.destaquesProdutos}.` });
  if (nt > LIMITES.destaquesTrabalhos) p.push({ campo: 'destaque', msg: `Há ${nt} trabalhos em destaque; a página inicial mostra ${LIMITES.destaquesTrabalhos}.` });
  return p;
}

export function regrasFotos(indice) {
  const p = [];
  for (const [nome, f] of Object.entries(indice ?? {})) {
    if (!NOME_FOTO.test(nome)) p.push({ campo: `fotos.${nome}`, msg: 'Nome de fotografia inválido.' });
    campoTexto(p, `fotos.${nome}.alt`, f?.alt, { max: LIMITES.alt });
  }
  return p;
}

// ── O preço como aparece em todo o lado (cartão, ficha, mensagem do WhatsApp, JSON-LD) ─────────────
export function euros(v) {
  const inteiro = Math.round(v * 100) % 100 === 0;
  const n = inteiro ? String(Math.round(v)) : v.toFixed(2).replace('.', ',');
  // pt-PT: espaço fino inseparável a partir dos 5 algarismos (10 000), como o Intl
  return n.replace(/^(\d+)(\d{3})(?=,|$)/, (m, a, b) => (a.length + b.length >= 5 ? a + '\u00A0' + b : m)) + '\u00A0€';
}
export function precoTexto(prod) {
  const u = prod.unidade ? ` / ${prod.unidade}` : '';
  return `${prod.desde ? 'desde ' : ''}${euros(prod.preco)}${u}`;
}

// ── A mensagem do WhatsApp de uma encomenda ───────────────────────────────────────────────────────────
export function mensagemEncomenda({ abertura, nome, quantidade, escolhas = [], preco, unidade, notas, endereco }) {
  const linhas = [abertura];
  const esc = escolhas.length ? ` (${escolhas.join(', ')})` : '';
  linhas.push(`• ${quantidade} × ${nome}${esc} — ${euros(preco)}${unidade ? ` / ${unidade}` : ' cada'}`);
  if (notas && notas.trim()) linhas.push(`Medidas ou gravação: ${notas.trim()}`);
  if (endereco) linhas.push(endereco);
  return linhas.join('\n');
}
