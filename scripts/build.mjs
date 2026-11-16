#!/usr/bin/env node
// O site da AL Art Craft em _site/.
//   node scripts/build.mjs                                   local (python3 -m http.server 8991 --directory _site)
//   node scripts/build.mjs --base=/al-art-craft --url=https://renatovalente5.github.io/al-art-craft   pré-visualização
//   node scripts/build.mjs --producao --url=https://<domínio>  no domínio: pára se faltar um dado que a lei pede
//   --saida=<pasta> escreve noutro sítio (o ensaio do painel usa-o)
// Antes: python3 scripts/imagens.py (as versões web das imagens, em .cache/imagens).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as R from '../src/lib/regras.mjs';
import { pagina } from '../src/templates/layout.mjs';
import * as P from '../src/templates/paginas.mjs';
import { esc, href, asset, lerPagina, whatsapp, fotoUrl } from '../src/templates/util.mjs';
import { ralHtml, destinatariosHtml, telefoneHtml } from '../legal-comum/index.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nome) => { const a = process.argv.find((x) => x.startsWith(`--${nome}=`)); return a ? a.slice(nome.length + 3) : null; };
const PRODUCAO = process.argv.includes('--producao');
const BASE = (arg('base') ?? '').replace(/\/$/, '');
const URL_SITE = (arg('url') ?? '').replace(/\/$/, '') || null;
const SAIDA = path.resolve(arg('saida') ?? path.join(RAIZ, '_site'));
const CACHE = path.join(RAIZ, '.cache', 'imagens');

function parar(titulo, linhas) {
  console.error(`\n✗ ${titulo}`);
  for (const l of linhas) console.error(`  • ${l}`);
  process.exit(1);
}

// ── Ler o conteúdo ─────────────────────────────────────────────────────────────────────────────────
const lerJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8')); }
  catch (e) { parar('A publicação parou: um ficheiro de conteúdo não se lê.', [`${rel}: ${e.message}`]); }
};
const lerPasta = (rel) => Object.fromEntries(fs.readdirSync(path.join(RAIZ, rel)).filter((f) => f.endsWith('.json')).sort().map((f) => [f.slice(0, -5), lerJson(`${rel}/${f}`)]));
const site = lerJson('content/site.json');
const categoriasBrutas = lerJson('content/categorias.json');
const inicio = lerJson('content/inicio.json');
const fotos = lerJson('content/fotos.json');
const produtosBrutos = lerPasta('content/produtos');
const trabalhosBrutos = lerPasta('content/trabalhos');
const paginas = Object.fromEntries(fs.readdirSync(path.join(RAIZ, 'content/paginas')).filter((f) => f.endsWith('.md')).map((f) => [f.slice(0, -3), lerPagina(fs.readFileSync(path.join(RAIZ, 'content/paginas', f), 'utf8'))]));
const videosLista = fs.readdirSync(path.join(RAIZ, 'media/videos')).filter((f) => f.endsWith('.mp4')).map((f) => f.slice(0, -4));
let manifesto;
try { manifesto = JSON.parse(fs.readFileSync(path.join(CACHE, 'manifesto.json'), 'utf8')); }
catch { parar('Faltam as versões web das imagens.', ['Correr primeiro: python3 scripts/imagens.py']); }

// ── As regras (as mesmas do painel) ────────────────────────────────────────────────────────────────
const problemas = [];
const juntar = (onde, lista) => lista.forEach((p) => problemas.push(`${onde} › ${p.campo}: ${p.msg}`));
juntar('Dados da loja', R.regrasSite(site));
juntar('Categorias', R.regrasCategorias(categoriasBrutas, fotos));
for (const [s, d] of Object.entries(produtosBrutos)) juntar(`Produto «${d.nome ?? s}»`, R.regrasProduto(s, d, { fotos, videos: videosLista, trabalhos: trabalhosBrutos }));
for (const [s, d] of Object.entries(trabalhosBrutos)) juntar(`Trabalho «${d.titulo ?? s}»`, R.regrasTrabalho(s, d, { fotos, videos: videosLista, produtos: produtosBrutos }));
juntar('Página inicial', R.regrasInicio(inicio, { fotos, videos: videosLista }));
juntar('Fotografias', R.regrasFotos(fotos));
for (const s of Object.keys(produtosBrutos)) if (R.CATEGORIAS_FIXAS.includes(s)) problemas.push(`Produto «${s}»: o endereço não pode ser o de uma categoria.`);
for (const nome of Object.keys(fotos)) if (!manifesto.fotos[nome]) problemas.push(`Fotografia «${nome}»: falta a versão web (correr scripts/imagens.py).`);
if (problemas.length) parar('A publicação parou: há dados por corrigir.', problemas);
if (PRODUCAO) {
  const falta = R.emFaltaParaProducao(site);
  if (falta.length) parar('A publicação no domínio parou: falta o que a lei pede para vender.', falta.map((f) => `Dados da loja: ${f}`));
  if (!URL_SITE) parar('A publicação no domínio parou.', ['Falta --url=https://<domínio>']);
}

// ── O que se publica ───────────────────────────────────────────────────────────────────────────────
const categorias = categoriasBrutas.slice().sort((a, b) => a.ordem - b.ordem);
const ordemCat = Object.fromEntries(categorias.map((c, i) => [c.slug, i]));
const produtos = Object.entries(produtosBrutos).filter(([, d]) => d.publicado).map(([slug, d]) => ({ slug, ...d }))
  .sort((a, b) => ordemCat[a.categoria] - ordemCat[b.categoria] || a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt'));
const trabalhos = Object.entries(trabalhosBrutos).filter(([, d]) => d.publicado).map(([slug, d]) => ({ slug, ...d }))
  .sort((a, b) => a.ordem - b.ordem);
for (const c of categorias) c.n = produtos.filter((p) => p.categoria === c.slug).length;
const categoriasVisiveis = categorias.filter((c) => c.n > 0);

// ── Saída e ficheiros com resumo no nome (a cache de um ano nunca serve um antigo) ─────────────────
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, 'assets', 'img'), { recursive: true });
const resumo = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const escrever = (rel, conteudo) => { const f = path.join(SAIDA, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, conteudo); };
const copiar = (de, rel) => { const f = path.join(SAIDA, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(de, f); };

// letras: só as duas da proposta A (Playfair Display e DM Sans)
const FONTES = ['playfair-display', 'dm-sans'];
const fontesCss = fs.readFileSync(path.join(RAIZ, 'src/fontes/fontes.css'), 'utf8').split('\n')
  .filter((l) => FONTES.some((f) => l.includes(`url(../fontes/${f}-`)))
  .join('\n').replace(/url\(\.\.\/fontes\//g, 'url(fontes/');
for (const f of fs.readdirSync(path.join(RAIZ, 'src/fontes'))) if (FONTES.some((x) => f.startsWith(x)) && f.endsWith('.woff2')) copiar(path.join(RAIZ, 'src/fontes', f), `assets/fontes/${f}`);
const css = `${fontesCss}\n${fs.readFileSync(path.join(RAIZ, 'src/estilos/site.css'), 'utf8')}`;
const cssNome = `site-${resumo(css)}.css`;
escrever(`assets/${cssNome}`, css);
const js = fs.readFileSync(path.join(RAIZ, 'src/scripts/site.js'), 'utf8');
const jsNome = `site-${resumo(js)}.js`;
escrever(`assets/${jsNome}`, js);

const videos = {};
for (const v of videosLista) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/videos', `${v}.mp4`));
  videos[v] = `${v}-${resumo(buf)}.mp4`;
}

// o aviso oficial da garantia: byte a byte o da Comissão (media/legal/LEIA.md)
const AVISO_SHA = {
  'aviso-garantia-legal-pt.svg': '9069bb0bc5e9f3cf655579038be5646181cc5447a25f3f8ccf2d018eacba0ac1',
  'aviso-garantia-legal-pt.pdf': 'b145a3014984f474d9bb81c60b5a492a376e64e55695eb089f0554adaa752877',
};
for (const [f, sha] of Object.entries(AVISO_SHA)) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/legal', f));
  if (crypto.createHash('sha256').update(buf).digest('hex') !== sha) parar('A publicação parou: o aviso da garantia foi alterado.', [`media/legal/${f} não se pode editar`]);
  copiar(path.join(RAIZ, 'media/legal', f), `assets/legal/${f}`);
}
const AVISO_ALT = 'GARANTIA LEGAL. Proteção da garantia legal mínima de dois anos para os bens vendidos na União Europeia. Os consumidores podem invocar os seus direitos ao abrigo da garantia legal de conformidade, por exemplo, se os bens: não corresponderem à descrição; não funcionarem como previsto. Os vendedores são responsáveis por qualquer falta de conformidade que exista no momento em que os bens forem entregues e se manifeste no período de garantia legal. Os vendedores nessa situação estão obrigados a oferecer: reparação gratuita ou substituição gratuita; em alguns casos, redução do preço ou reembolso integral. Alguns países têm um período de garantia legal mais longo. Para os bens em segunda mão, pode aplicar-se um período mais curto, mas não inferior a um ano. Para mais informações sobre os seus direitos num determinado país, digitalize o código QR abaixo ou consulte o vendedor. europa.eu/youreurope/garantias. O que fazer se receber bens não conformes: 1. Contactar o vendedor o mais rapidamente possível para expor o problema; 2. Apresentar uma prova de compra, como um recibo, uma fatura ou um extrato bancário. Os vendedores e os produtores também podem oferecer garantias comerciais, que se aplicam independentemente da garantia legal. Por exemplo, pode ver este rótulo GARAN, que representa uma garantia comercial de durabilidade oferecida pelo produtor sem custos adicionais e cobrindo a totalidade do bem.';

// ── O contexto das páginas ─────────────────────────────────────────────────────────────────────────
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const vazio = (v) => v == null || String(v).trim() === '';
const ctx = {
  base: BASE, url: URL_SITE, producao: PRODUCAO, ano: new Date().getFullYear(),
  site, conteudo: { inicio }, manifesto, fotos, videos, usadas: new Set(), marcas: [],
  categorias: categoriasVisiveis, categoriasPorSlug: Object.fromEntries(categorias.map((c) => [c.slug, c])),
  produtos, produtosPorSlug: Object.fromEntries(produtos.map((p) => [p.slug, p])),
  trabalhos, trabalhosPorSlug: Object.fromEntries(trabalhos.map((t) => [t.slug, t])),
  css: asset({ base: BASE }, cssNome), js: asset({ base: BASE }, jsNome),
  fontesPreload: ['playfair-display-normal-400-900-latin.woff2', 'dm-sans-normal-100-1000-latin.woff2'].map((f) => asset({ base: BASE }, `fontes/${f}`)),
  dataLonga: (iso) => { const [a, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; },
  porConfirmar: (o) => `<mark class="por-confirmar">[por confirmar: ${esc(o)}]</mark>`,
};
ctx.icone = (lado) => { ctx.usadas.add(`icone-${lado}`); return asset(ctx, `img/icone-${manifesto.logo.resumo}-${lado}.png`); };
ctx.logoUrl = URL_SITE ? `${URL_SITE}/assets/img/logo-${manifesto.logo.resumo}-${manifesto.logo.alturas.at(-1)}.png` : null;
ctx.imagemPartilha = fotoUrl(ctx, 'tabua-madeira-africana-1', { partilha: true });
const e = site.empresa ?? {};
const temIdent = !vazio(e.nome) && !vazio(e.nif) && !vazio(e.morada);
ctx.identificacaoCurta = temIdent ? `${esc(e.nome)} · NIF ${esc(e.nif)} · ${esc(e.morada)}` : ctx.porConfirmar('o nome ou a firma, o NIF e a morada de quem vende');
const emailHtml = vazio(site.email) ? ctx.porConfirmar('o email') : `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`;
const waHtml = `<a href="${whatsapp(site, 'Olá Alberto!')}" target="_blank" rel="noopener">WhatsApp</a>`;
const MARCADORES = {
  marca: () => esc(site.marca),
  'empresa.identificacao': () => (temIdent ? `${esc(e.nome)}, NIF ${esc(e.nif)}, ${esc(e.morada)}.` : ctx.porConfirmar('o nome ou a firma, o NIF e a morada de quem vende')),
  contactos: () => `${waHtml}, telefone ${telefoneHtml(site.telefone.replace(/\s/g, ''), { comIndicativo: false, frase: 'com-a', classeNota: 'chamada' })} e ${emailHtml}`,
  email: () => emailHtml,
  whatsapp: () => waHtml,
  iva: () => (vazio(site.encomendas?.iva) ? ctx.porConfirmar('se os preços incluem IVA') : esc(site.encomendas.iva)),
  pagamento: () => (vazio(site.encomendas?.pagamento) ? ctx.porConfirmar('as formas de pagamento') : esc(site.encomendas.pagamento)),
  entrega: () => (vazio(site.encomendas?.entrega) ? ctx.porConfirmar('como se entrega e quanto custam os portes') : esc(site.encomendas.entrega)),
  prazo: () => (vazio(site.encomendas?.prazo) ? 'O prazo de cada encomenda fica escrito no resumo que confirma.' : esc(site.encomendas.prazo)),
  ral: () => ralHtml({ ambito: 'local', concelhos: ['Fafe'] }),
  avisoGarantia: () => `<figure class="aviso-garantia"><img src="${asset(ctx, 'legal/aviso-garantia-legal-pt.svg')}" width="600" height="848" alt="${esc(AVISO_ALT)}" loading="lazy" decoding="async"><figcaption><a href="${asset(ctx, 'legal/aviso-garantia-legal-pt.pdf')}">Descarregar o aviso oficial (PDF)</a> · <a href="https://europa.eu/youreurope/garantias" target="_blank" rel="noopener">europa.eu/youreurope/garantias</a></figcaption></figure>`,
  'privacidade.destinatarios': () => destinatariosHtml(PRODUCAO ? { alojamento: 'cloudflare', dns: 'cloudflare' } : { alojamento: 'github' }, { formato: 'lista' }),
};
function comMarcadores(pag) {
  const corpo = pag.corpo.replace(/\{\{([a-zA-Z.]+)\}\}/g, (m, nome) => {
    if (!MARCADORES[nome]) parar('A publicação parou: marcador desconhecido.', [`{{${nome}}} na página «${pag.meta.titulo}»`]);
    ctx.marcas.push(MARCADORES[nome]());
    return `§§${ctx.marcas.length - 1}§§`;
  });
  return { ...pag, corpo };
}

// ── As páginas ─────────────────────────────────────────────────────────────────────────────────────
const LEGAIS = ['termos-e-condicoes', 'politica-de-privacidade', 'resolucao-de-litigios', 'garantia', 'desistir'];
const feitas = [];
const fazer = (p) => {
  const html = pagina(ctx, p);
  const rel = p.caminho.endsWith('.html') ? p.caminho : `${p.caminho}index.html`;
  escrever(rel.replace(/^\//, ''), html);
  feitas.push(p);
};
fazer(P.inicio(ctx));
fazer(P.produtos(ctx));
for (const c of categoriasVisiveis) fazer(P.produtos(ctx, c));
for (const p of produtos) fazer(P.produto(ctx, p));
fazer(P.trabalhos(ctx));
for (const t of trabalhos) fazer(P.trabalho(ctx, t));
fazer(P.sobre(ctx, comMarcadores(paginas.sobre)));
fazer(P.contactos(ctx));
fazer(P.texto(ctx, 'perguntas-frequentes', comMarcadores(paginas['perguntas-frequentes'])));
for (const nome of LEGAIS) fazer(P.texto(ctx, nome, comMarcadores(paginas[nome]), { indexar: false }));
fazer(P.naoEncontrada(ctx));

// ── As imagens e os vídeos que as páginas usam ──────────────────────────────────────────────────────
const naCache = fs.readdirSync(CACHE);
let nImg = 0;
for (const f of naCache) {
  if (f === 'manifesto.json' || f.endsWith('.tmp')) continue;
  const base = f.replace(/-[0-9a-f]{10}-.*$/, '');
  if (ctx.usadas.has(base)) { copiar(path.join(CACHE, f), `assets/img/${f}`); nImg++; }
}
for (const [v, nome] of Object.entries(videos)) if (ctx.usadas.has(`video-${v}`)) copiar(path.join(RAIZ, 'media/videos', `${v}.mp4`), `assets/video/${nome}`);

// ── Manifesto da app, robots e sitemap ──────────────────────────────────────────────────────────────
escrever('site.webmanifest', JSON.stringify({ name: site.marca, short_name: 'AL Art Craft', lang: 'pt-PT', start_url: `${BASE}/`, display: 'browser', background_color: '#FBF9F6', theme_color: '#FBF9F6', icons: [192, 512].map((l) => ({ src: ctx.icone(l), sizes: `${l}x${l}`, type: 'image/png' })) }, null, 1));
for (const l of [192, 512]) ctx.usadas.add(`icone-${l}`);
for (const f of naCache) if (/^icone-/.test(f)) copiar(path.join(CACHE, f), `assets/img/${f}`);
// a pré-visualização fica fora do Google pelo noindex de cada página (o robots tem de deixar ler o noindex)
const indexaveis = feitas.filter((p) => p.indexar !== false && !p.caminho.endsWith('.html'));
escrever('robots.txt', `User-agent: *\nAllow: /\n${URL_SITE ? `\nSitemap: ${URL_SITE}/sitemap.xml\n` : ''}`);
if (URL_SITE) {
  const dataDe = (rels) => {
    try {
      const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...rels], { cwd: RAIZ, encoding: 'utf8' }).trim();
      return d || new Date().toISOString().slice(0, 10);
    } catch { return new Date().toISOString().slice(0, 10); }
  };
  const fonteDe = (c) => {
    if (c.startsWith('/produto/')) return [`content/produtos/${c.split('/')[2]}.json`];
    if (/^\/trabalhos\/.+\//.test(c)) return [`content/trabalhos/${c.split('/')[2]}.json`];
    if (c === '/') return ['content/inicio.json', 'content/site.json'];
    if (c.startsWith('/produtos/')) return ['content/produtos', 'content/categorias.json'];
    if (c === '/trabalhos/') return ['content/trabalhos'];
    return [`content/paginas${c.replace(/\/$/, '')}.md`, 'content/site.json'];
  };
  const urls = indexaveis.map((p) => `  <url><loc>${esc(`${URL_SITE}${p.caminho}`)}</loc><lastmod>${dataDe(fonteDe(p.caminho))}</lastmod></url>`).join('\n');
  escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
// GitHub Pages: sem Jekyll
escrever('.nojekyll', '');

console.log(`✓ ${feitas.length} páginas (${indexaveis.length} para o Google${PRODUCAO ? '' : ', todas com noindex na pré-visualização'}), ${nImg} imagens, ${Object.keys(videos).filter((v) => ctx.usadas.has(`video-${v}`)).length} vídeos → ${path.relative(process.cwd(), SAIDA) || '.'}`);
if (!PRODUCAO) { const f = R.emFaltaParaProducao(site); if (f.length) console.log(`  Para o domínio ainda falta: ${f.join('; ')}.`); }
