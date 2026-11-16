#!/usr/bin/env node
// Os testes do site: as regras do conteúdo e o que as páginas construídas (_site/) têm de cumprir.
// node scripts/testar.mjs            (depois de node scripts/build.mjs, com ou sem --base)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../src/lib/regras.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(RAIZ, '_site');
let ok = 0;
const falhas = [];
const teste = (nome, fn) => { try { fn(); ok++; } catch (e) { falhas.push(`${nome}: ${e.message}`); } };
const igual = (a, b, msg) => { if (a !== b) throw new Error(`${msg ?? ''} esperava ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); };
const sim = (v, msg) => { if (!v) throw new Error(msg); };
const ler = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
const pasta = (rel) => Object.fromEntries(fs.readdirSync(path.join(RAIZ, rel)).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), ler(`${rel}/${f}`)]));

// ── O conteúdo ─────────────────────────────────────────────────────────────────────────────────────
const site = ler('content/site.json');
const categorias = ler('content/categorias.json');
const produtos = pasta('content/produtos');
const trabalhos = pasta('content/trabalhos');
const inicio = ler('content/inicio.json');
const fotos = ler('content/fotos.json');
const videos = fs.readdirSync(path.join(RAIZ, 'media/videos')).filter((f) => f.endsWith('.mp4')).map((f) => f.slice(0, -4));
teste('regras: dados da loja', () => igual(R.regrasSite(site).length, 0));
teste('regras: categorias', () => igual(R.regrasCategorias(categorias, fotos).length, 0));
for (const [s, d] of Object.entries(produtos)) teste(`regras: produto ${s}`, () => igual(JSON.stringify(R.regrasProduto(s, d, { fotos, videos, trabalhos })), '[]'));
for (const [s, d] of Object.entries(trabalhos)) teste(`regras: trabalho ${s}`, () => igual(JSON.stringify(R.regrasTrabalho(s, d, { fotos, videos, produtos })), '[]'));
teste('regras: página inicial', () => igual(JSON.stringify(R.regrasInicio(inicio, { fotos, videos })), '[]'));
teste('cada fotografia está em uso ou na biblioteca com descrição', () => igual(R.regrasFotos(fotos).length, 0));
teste('no máximo 8 produtos em destaque (a página inicial mostra 8)', () => sim(Object.values(produtos).filter((p) => p.destaque && p.publicado).length <= 8, 'mais de 8'));

// as regras recusam o que devem recusar
teste('regras: preço anunciado obtenível (uma escolha tem de ter um valor a 0 €)', () => {
  const p = { ...Object.values(produtos)[0], desde: true, opcoes: [{ nome: 'Medida', valores: [{ nome: 'A', mais: 5 }, { nome: 'B', mais: 9 }] }] };
  sim(R.regrasProduto('x', p).some((e) => e.campo === 'opcoes.0.valores'), 'não recusou');
});
teste('regras: escolhas que sobem o preço obrigam a «desde»', () => {
  const p = { ...Object.values(produtos)[0], desde: false, opcoes: [{ nome: 'Copos', valores: [{ nome: '3', mais: 0 }, { nome: '4', mais: 6 }] }] };
  sim(R.regrasProduto('x', p).some((e) => e.campo === 'desde'), 'não recusou');
});
teste('regras: caracteres invisíveis', () => sim(R.regrasSite({ ...site, frase: `Peças${String.fromCharCode(0x200b)} em madeira` }).some((e) => e.campo === 'frase'), 'não recusou'));
teste('regras: NIF', () => { sim(R.nifValido('248679880'), 'válido recusado'); sim(!R.nifValido('248679881'), 'inválido aceite'); });
teste('euros: pt-PT', () => { igual(R.euros(4.5), '4,50\u00A0€'); igual(R.euros(1450), '1450\u00A0€'); igual(R.euros(12000), '12\u00A0000\u00A0€'); });
teste('mensagem do WhatsApp', () => igual(R.mensagemEncomenda({ abertura: 'Olá!', nome: 'Tábua', quantidade: 2, preco: 45, notas: ' logo ', endereco: 'https://x/' }), 'Olá!\n• 2 × Tábua — 45\u00A0€ cada\nMedidas ou gravação: logo\nhttps://x/'));

// ── As páginas construídas ─────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error('Falta o _site: correr node scripts/build.mjs'); process.exit(1); }
const html = (rel) => fs.readFileSync(path.join(SITE, rel), 'utf8');
const inicioHtml = html('index.html');
const BASE = (inicioHtml.match(/<link rel="stylesheet" href="([^"]*)\/assets\//) ?? [, ''])[1];
const todas = [];
(function andar(dir) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (f.name !== 'assets') andar(p); } else if (f.name.endsWith('.html')) todas.push(path.relative(SITE, p)); } })(SITE);
const publicados = Object.entries(produtos).filter(([, d]) => d.publicado);
const caminhos = ['index.html', 'produtos/index.html', ...categorias.map((c) => `produtos/${c.slug}/index.html`), ...publicados.map(([s]) => `produto/${s}/index.html`), 'trabalhos/index.html', ...Object.entries(trabalhos).filter(([, d]) => d.publicado).map(([s]) => `trabalhos/${s}/index.html`), 'sobre/index.html', 'contactos/index.html', 'perguntas-frequentes/index.html', 'termos-e-condicoes/index.html', 'politica-de-privacidade/index.html', 'resolucao-de-litigios/index.html', 'garantia/index.html', 'desistir/index.html', '404.html'];
for (const c of caminhos) teste(`existe ${c}`, () => sim(fs.existsSync(path.join(SITE, c)), 'não existe'));
teste('não há páginas a mais', () => igual(todas.length, caminhos.length));

const titulos = new Map();
const LEGAIS = ['termos-e-condicoes', 'politica-de-privacidade', 'resolucao-de-litigios', 'garantia', 'desistir'];
const producao = !/<meta name="robots" content="noindex/.test(inicioHtml);
for (const rel of todas) {
  const h = html(rel);
  teste(`${rel}: um só h1`, () => igual((h.match(/<h1[\s>]/g) ?? []).length, 1));
  teste(`${rel}: título e descrição`, () => { sim(/<title>[^<]{10,}<\/title>/.test(h), 'título'); sim(/<meta name="description" content="[^"]{20,}">/.test(h), 'descrição'); });
  const t = h.match(/<title>([^<]*)<\/title>/)[1];
  teste(`${rel}: título único`, () => { sim(!titulos.has(t), `igual ao de ${titulos.get(t)}`); titulos.set(t, rel); });
  teste(`${rel}: lang pt-PT`, () => sim(h.includes('<html lang="pt-PT">'), 'lang'));
  teste(`${rel}: o cabeçalho é o mesmo em todas`, () => { for (const l of ['/produtos/', '/trabalhos/', '/sobre/', '/contactos/']) sim(h.includes(`href="${BASE}${l}"`), l); });
  teste(`${rel}: rodapé sem dados da empresa e com o Livro de Reclamações`, () => {
    const rod = h.slice(h.indexOf('<footer'));
    sim(/© \d{4} AL Art Craft/.test(rod), '©');
    sim(!/NIF|\d{4}-\d{3}/.test(rod), 'NIF ou código postal no rodapé');
    sim(rod.includes('livroreclamacoes.pt'), 'Livro de Reclamações');
  });
  teste(`${rel}: sem «obrigação de pagar»`, () => sim(!/obriga[çc][ãa]o de pagar/i.test(h), 'frase'));
  teste(`${rel}: WhatsApp sempre para o número do Alberto`, () => { for (const m of h.matchAll(/https:\/\/wa\.me\/(\d+)/g)) igual(m[1], site.whatsapp); });
  teste(`${rel}: nada de outros clientes`, () => sim(!/Mimices|Dream Art|Franja|LF Mobile|Pokóto|ithos/i.test(h), 'nome de outro cliente'));
  if (LEGAIS.some((l) => rel.startsWith(l)) || rel === '404.html' || !producao) teste(`${rel}: noindex`, () => sim(/<meta name="robots" content="noindex/.test(h), 'falta o noindex'));
  // as ligações internas levam a páginas que existem
  teste(`${rel}: ligações internas`, () => {
    for (const m of h.matchAll(/href="([^"#?]+)(#[^"]*)?"/g)) {
      const u = m[1];
      if (!u.startsWith('/') || u.startsWith('//')) continue;
      const rel2 = decodeURI(u.slice(BASE.length)).replace(/^\//, '');
      const alvo = rel2 === '' ? 'index.html' : rel2.endsWith('/') ? `${rel2}index.html` : rel2;
      sim(fs.existsSync(path.join(SITE, alvo)), `não existe ${u}`);
    }
  });
  teste(`${rel}: imagens e vídeos existem`, () => {
    for (const m of h.matchAll(/(?:src|srcset|poster)="([^"]+)"/g)) for (const parte of m[1].split(',')) {
      const u = parte.trim().split(/\s+/)[0];
      if (!u.startsWith(`${BASE}/assets/`)) continue;
      sim(fs.existsSync(path.join(SITE, u.slice(BASE.length + 1))), `falta ${u}`);
    }
  });
}

// a ficha: o preço do cartão = o da ficha = o do JSON-LD = o da mensagem; a escolha mais barata vem marcada
for (const [s, d] of publicados) {
  const h = html(`produto/${s}/index.html`);
  teste(`produto ${s}: preço na ficha`, () => sim(h.includes(`data-preco="${d.preco}"`), 'data-preco'));
  teste(`produto ${s}: mensagem base do WhatsApp com o nome e o preço`, () => {
    const m = h.match(/data-enviar href="https:\/\/wa\.me\/\d+\?text=([^"]+)"/);
    sim(m, 'sem botão');
    const txt = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
    sim(txt.includes(d.nome) && txt.includes(R.precoTexto(d)), `mensagem: ${txt}`);
  });
  if (producao) teste(`produto ${s}: JSON-LD com o preço`, () => sim(h.includes(`"price":"${d.preco.toFixed(2)}"`), 'preço no JSON-LD'));
  for (const [i, o] of (d.opcoes ?? []).entries()) teste(`produto ${s}: escolha ${o.nome} com o mais barato marcado`, () => {
    const min = Math.min(...o.valores.map((v) => v.mais));
    const marcado = h.match(new RegExp(`name="opcao-${i}" value="([^"]+)" data-mais="(\\d+(?:\\.\\d+)?)" checked`));
    sim(marcado && Number(marcado[2]) === min, 'o marcado não é o mais barato');
  });
  const cat = categorias.find((c) => c.slug === d.categoria);
  teste(`produto ${s}: no separador da categoria`, () => sim(html(`produtos/${cat.slug}/index.html`).includes(`href="${BASE}/produto/${s}/"`), 'não aparece'));
}
teste('contactos: telefone com a nota da chamada', () => sim(/917 443 823 <span class="chamada">\(Chamada para a rede móvel nacional\)<\/span>/.test(html('contactos/index.html')), 'nota'));
teste('termos: TRIAVE e livre resolução', () => { const h = html('termos-e-condicoes/index.html'); sim(h.includes('TRIAVE'), 'TRIAVE'); sim(h.includes('17.º'), 'art. 17.º'); });
teste('litígios: o centro de Fafe', () => sim(html('resolucao-de-litigios/index.html').includes('TRIAVE'), 'TRIAVE'));
teste('garantia: o aviso oficial', () => sim(html('garantia/index.html').includes('aviso-garantia-legal-pt.svg'), 'aviso'));
teste('robots deixa ler o noindex', () => sim(fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8').includes('Allow: /'), 'robots'));
if (fs.existsSync(path.join(SITE, 'sitemap.xml'))) teste('sitemap sem as páginas legais', () => { const sm = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8'); for (const l of LEGAIS) sim(!sm.includes(`/${l}/`), l); });

console.log(`${falhas.length ? '✗' : '✓'} ${ok} testes passaram${falhas.length ? `, ${falhas.length} falharam:` : ''}`);
for (const f of falhas) console.log(`  • ${f}`);
process.exit(falhas.length ? 1 : 0);
