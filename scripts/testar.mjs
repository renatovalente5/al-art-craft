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
const lerCabeca = (rel) => Object.fromEntries(fs.readFileSync(path.join(RAIZ, rel), 'utf8').split(/^---$/m)[0].split('\n').map((l) => l.match(/^([a-zA-Z]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
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
teste('regras: página inicial', () => igual(JSON.stringify(R.regrasInicio(inicio, { videos })), '[]'));
teste('regras: destaques', () => igual(JSON.stringify(R.regrasDestaques(produtos, trabalhos)), '[]'));
teste('cada fotografia está em uso ou na biblioteca com descrição', () => igual(R.regrasFotos(fotos).length, 0));
teste('no máximo 4 produtos e 3 trabalhos em destaque', () => { sim(Object.values(produtos).filter((p) => p.destaque && p.publicado).length <= 4, 'produtos'); sim(Object.values(trabalhos).filter((t) => t.destaque && t.publicado).length <= 3, 'trabalhos'); });

// as regras recusam o que devem recusar
teste('regras: preço anunciado obtenível (uma escolha tem de ter um valor a 0 €)', () => {
  const p = { ...Object.values(produtos)[0], desde: true, opcoes: [{ nome: 'Medida', valores: [{ nome: 'A', mais: 5 }, { nome: 'B', mais: 9 }] }] };
  sim(R.regrasProduto('x', p).some((e) => e.campo === 'opcoes.0.valores'), 'não recusou');
});
teste('regras: escolhas que sobem o preço obrigam a «desde»', () => {
  const p = { ...Object.values(produtos)[0], desde: false, opcoes: [{ nome: 'Copos', valores: [{ nome: '3', mais: 0 }, { nome: '4', mais: 6 }] }] };
  sim(R.regrasProduto('x', p).some((e) => e.campo === 'desde'), 'não recusou');
});
teste('regras: caracteres invisíveis', () => sim(R.regrasSite({ ...site, dono: `Alberto${String.fromCharCode(0x200b)} Lopes` }).some((e) => e.campo === 'dono'), 'não recusou'));
teste('regras: páginas de texto', () => { for (const f of fs.readdirSync(path.join(RAIZ, 'content/paginas')).filter((x) => x.endsWith('.md'))) igual(JSON.stringify(R.regrasPagina(f.slice(0, -3), lerCabeca(`content/paginas/${f}`), { fotos })), '[]', f); });
teste('regras: nomes repetidos', () => igual(JSON.stringify(R.regrasNomes(produtos, trabalhos)), '[]'));
teste('regras: recusam dois produtos publicados com o mesmo nome (sem ligar a acentos)', () => {
  const r = R.regrasNomes({ a: { publicado: true, nome: 'Tábua rústica' }, b: { publicado: true, nome: 'tabua  RUSTICA' }, c: { publicado: false, nome: 'Tábua rústica' } }, {});
  igual(r.map((x) => x.campo).join(), 'produtos.a.nome,produtos.b.nome');
});
teste('regras: recusam dois trabalhos com o mesmo título e o mesmo cliente', () => igual(R.regrasNomes({}, { a: { publicado: true, titulo: 'Placas', cliente: 'X' }, b: { publicado: true, titulo: 'placas', cliente: 'x' }, c: { publicado: true, titulo: 'Placas', cliente: 'Y' } }).length, 2));
teste('regras: a descrição do Google com 20 caracteres pelo menos', () => {
  sim(R.regrasSite({ ...site, descricao: 'Curta demais.' }).some((e) => e.campo === 'descricao'), 'site');
  sim(R.regrasPagina('perguntas-frequentes', { titulo: 'Perguntas', descricao: 'Curta.' }).some((e) => e.campo === 'descricao'), 'página');
});
teste('regras: a «Sobre» tem as duas fotografias da biblioteca', () => {
  const r = R.regrasPagina('sobre', { titulo: 'Sobre', descricao: 'Uma frase com mais de vinte caracteres.', foto: 'nao-existe' }, { fotos });
  sim(r.some((e) => e.campo === 'foto') && r.some((e) => e.campo === 'fotoPequena'), JSON.stringify(r));
});
teste('regras: o Instagram pode ficar vazio', () => igual(R.regrasSite({ ...site, instagram: null }).length, 0));
teste('regras: a «frase» saiu dos dados da loja', () => sim(!('frase' in site) && !('frase' in R.LIMITES), 'ainda lá está'));
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
// uma categoria sem produtos publicados não tem página (o gerador esconde-a)
const comProdutos = categorias.filter((c) => publicados.some(([, d]) => d.categoria === c.slug));
const caminhos = ['index.html', 'produtos/index.html', ...comProdutos.map((c) => `produtos/${c.slug}/index.html`), ...publicados.map(([s]) => `produto/${s}/index.html`), 'trabalhos/index.html', ...Object.entries(trabalhos).filter(([, d]) => d.publicado).map(([s]) => `trabalhos/${s}/index.html`), 'sobre/index.html', 'contactos/index.html', 'perguntas-frequentes/index.html', 'termos-e-condicoes/index.html', 'politica-de-privacidade/index.html', 'resolucao-de-litigios/index.html', 'garantia/index.html', 'desistir/index.html', '404.html'];
for (const c of caminhos) teste(`existe ${c}`, () => sim(fs.existsSync(path.join(SITE, c)), 'não existe'));
teste('não há páginas a mais', () => igual(todas.length, caminhos.length));

const titulos = new Map();
const LEGAIS = ['termos-e-condicoes', 'politica-de-privacidade', 'resolucao-de-litigios', 'garantia', 'desistir'];
const producao = !/<meta name="robots" content="noindex/.test(inicioHtml);
// a largura e a altura de um JPEG (o primeiro marcador SOF)
const medidaJpeg = (f) => {
  const b = fs.readFileSync(f);
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) throw new Error('não é JPEG');
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('sem medidas');
};
const ogDe = (h) => (h.match(/<meta property="og:image" content="([^"]+)">/) ?? [])[1] ?? '';
for (const rel of todas) {
  const h = html(rel);
  teste(`${rel}: cartão de partilha existe, 1200×630`, () => {
    const og = ogDe(h);
    sim(og.includes('/assets/'), 'sem og:image');
    const f = path.join(SITE, 'assets', og.split('/assets/')[1]);
    sim(fs.existsSync(f), `falta ${og}`);
    igual(medidaJpeg(f), '1200x630');
  });
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

// ao partilhar: o início e as páginas gerais mostram o logótipo da AL Art Craft (não uma peça com a marca de um
// cliente); a ficha, o trabalho e a categoria mostram a fotografia deles
const CARTAO_MARCA = /\/assets\/img\/al-art-craft-[0-9a-f]{10}-partilha\.jpg$/;
for (const rel of ['index.html', 'produtos/index.html', 'trabalhos/index.html', 'sobre/index.html', 'contactos/index.html', 'perguntas-frequentes/index.html', '404.html', ...LEGAIS.map((l) => `${l}/index.html`)]) {
  teste(`${rel}: partilha com o logótipo da marca`, () => sim(CARTAO_MARCA.test(ogDe(html(rel))), ogDe(html(rel))));
}
for (const [s, d] of publicados) teste(`produto ${s}: partilha com a fotografia dele`, () => sim(ogDe(html(`produto/${s}/index.html`)).includes(`/assets/img/${d.fotos[0]}-`), 'outra imagem'));
for (const [s, d] of Object.entries(trabalhos).filter(([, t]) => t.publicado)) teste(`trabalho ${s}: partilha com a fotografia dele`, () => sim(ogDe(html(`trabalhos/${s}/index.html`)).includes(`/assets/img/${d.fotos[0]}-`), 'outra imagem'));
for (const c of comProdutos) teste(`categoria ${c.slug}: partilha com a fotografia dela`, () => sim(ogDe(html(`produtos/${c.slug}/index.html`)).includes(`/assets/img/${c.foto}-`), 'outra imagem'));

// as miniaturas do painel: cada fotografia da biblioteca e a capa de cada vídeo, pelo nome, em WebP, sem aumentar
teste('miniaturas do painel: todas as fotografias e capas de vídeo', () => {
  const pasta = path.join(SITE, 'assets/img');
  for (const n of Object.keys(fotos)) for (const t of ['miniatura', 'grande']) sim(fs.existsSync(path.join(pasta, `${t}-${n}.webp`)), `falta ${t}-${n}.webp`);
  for (const v of fs.readdirSync(path.join(RAIZ, 'media/videos')).filter((f) => f.endsWith('.jpg'))) sim(fs.existsSync(path.join(pasta, `miniatura-video-${v.slice(0, -4)}.webp`)), `falta miniatura-video-${v}`);
});
teste('miniaturas do painel: 320 e 1024 px de largura, no máximo', () => {
  const largura = (f) => { const b = fs.readFileSync(f); const tipo = b.toString('ascii', 12, 16); if (tipo === 'VP8X') return 1 + b.readUIntLE(24, 3); if (tipo === 'VP8 ') return b.readUInt16LE(26) & 0x3fff; if (tipo === 'VP8L') return 1 + ((b.readUInt32LE(21)) & 0x3fff); throw new Error(`WebP ${tipo}`); };
  const n = Object.keys(fotos)[0];
  sim(largura(path.join(SITE, 'assets/img', `miniatura-${n}.webp`)) <= 320, 'miniatura');
  sim(largura(path.join(SITE, 'assets/img', `grande-${n}.webp`)) <= 1024, 'grande');
});

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
