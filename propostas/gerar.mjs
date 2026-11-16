// Três propostas da página inicial da AL Art Craft, com o conteúdo e as fotografias verdadeiras (16 nov 2026).
// node propostas/gerar.mjs   →   propostas/saida/{a,b,c}/index.html  (servir propostas/saida/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const SAIDA = path.join(AQUI, 'saida');
const CACHE = path.join(RAIZ, '.cache', 'imagens');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));

const site = ler('content/site.json');
const inicio = ler('content/inicio.json');
const categorias = ler('content/categorias.json').sort((a, b) => a.ordem - b.ordem);
const manifesto = JSON.parse(fs.readFileSync(path.join(CACHE, 'manifesto.json'), 'utf8'));
const fotosIdx = ler('content/fotos.json');
const produtos = Object.fromEntries(fs.readdirSync(path.join(RAIZ, 'content/produtos')).map((f) => [f.slice(0, -5), ler('content/produtos/' + f)]));
const trabalhos = Object.fromEntries(fs.readdirSync(path.join(RAIZ, 'content/trabalhos')).map((f) => [f.slice(0, -5), ler('content/trabalhos/' + f)]));

fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, 'assets', 'img'), { recursive: true });
fs.mkdirSync(path.join(SAIDA, 'assets', 'video'), { recursive: true });
fs.cpSync(path.join(RAIZ, 'src', 'fontes'), path.join(SAIDA, 'assets', 'fontes'), { recursive: true });

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const copiados = new Set();
const copiar = (f) => { if (!copiados.has(f)) { fs.copyFileSync(path.join(CACHE, f), path.join(SAIDA, 'assets', 'img', f)); copiados.add(f); } return '../assets/img/' + f; };

// <picture> com AVIF e WebP; sizes diz a largura no ecrã
function foto(nome, { sizes = '100vw', classe = '', alt, eager = false, video = false } = {}) {
  const m = video ? manifesto.videos[nome] : manifesto.fotos[nome];
  if (!m) throw new Error('sem imagem: ' + nome);
  const base = (video ? 'video-' : '') + nome;
  const src = (fmt) => m.larguras.map((w) => `${copiar(`${base}-${m.resumo}-${w}.${fmt}`)} ${w}w`).join(', ');
  const fontes = m.formatos.map((fmt) => `<source type="image/${fmt}" srcset="${src(fmt)}" sizes="${sizes}">`).join('');
  const jpg = copiar(`${base}-${m.resumo}-${m.jpg}.jpg`);
  const texto = alt ?? (video ? '' : fotosIdx[nome]?.alt ?? '');
  return `<picture${classe ? ` class="${classe}"` : ''}>${fontes}<img src="${jpg}" width="${m.w}" height="${m.h}" alt="${esc(texto)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}
function video(nome, { classe = '', capa = true } = {}) {
  const f = `${nome}.mp4`;
  fs.copyFileSync(path.join(RAIZ, 'media', 'videos', f), path.join(SAIDA, 'assets', 'video', f));
  const m = manifesto.videos[nome];
  const poster = copiar(`video-${nome}-${m.resumo}-${m.jpg}.jpg`);
  return `<video class="${classe}" autoplay muted loop playsinline preload="${capa ? 'auto' : 'metadata'}" poster="${poster}" aria-hidden="true"><source src="../assets/video/${f}" type="video/mp4"></video>`;
}
function logo(altura, classe = 'logo') {
  const m = manifesto.logo;
  const alturas = m.alturas;
  const a1 = alturas.find((a) => a >= altura) ?? alturas.at(-1);
  const a2 = alturas.find((a) => a >= altura * 2) ?? alturas.at(-1);
  const a3 = alturas.find((a) => a >= altura * 3) ?? alturas.at(-1);
  const w = Math.round((m.w * altura) / m.h);
  const p = (a, ext) => copiar(`logo-${m.resumo}-${a}.${ext}`);
  return `<picture class="${classe}"><source type="image/webp" srcset="${p(a1, 'webp')} 1x, ${p(a2, 'webp')} 2x, ${p(a3, 'webp')} 3x"><img src="${p(a2, 'png')}" width="${w}" height="${altura}" alt="AL Art Craft"></picture>`;
}

const euro = (v) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v) + ' €';
const preco = (p) => `${p.desde ? '<span class="preco__desde">desde</span> ' : ''}${euro(p.preco)}${p.unidade ? `<span class="preco__un"> / ${esc(p.unidade)}</span>` : ''}`;
const wa = (texto) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(texto)}`;
const nCat = (slug) => Object.values(produtos).filter((p) => p.categoria === slug && p.publicado).length;

const I = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.25-1.38A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 1 1 6.97 3.86Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-1.98-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.31 2.75 2.75 0 0 0-.86 2.04 4.8 4.8 0 0 0 1 2.53 10.9 10.9 0 0 0 4.2 3.7c.58.26 1.04.41 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.17-.47-.29Z"/></svg>',
  seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 8h16M4 16h16"/></svg>',
};

const DESTAQUES = ['tabua-madeira-africana', 'tabua-acacia-macica', 'tabua-ferro-fundido-redonda', 'porta-espetadas', 'porta-menus', 'cubo-de-mesa', 'caixa-para-pao', 'placa-gravada'];
const TRABALHOS = ['uima-river-house', 'lili-catering', 'lido-grill', 'sal-e-brasa', 'mercearia-lounge-bar', 'sweet-dreams'];
const NAV = [['Produtos', '#produtos'], ['Trabalhos', '#trabalhos'], ['Sobre', '#sobre'], ['Contactos', '#contactos']];
const ano = 2026;

function pagina(letra, nome, corpo) {
  const html = `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Proposta ${letra.toUpperCase()} · ${nome} — AL Art Craft</title>
<link rel="stylesheet" href="../assets/fontes/fontes.css">
<link rel="stylesheet" href="estilo.css">
</head>
<body>
${corpo}
<script>
if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
</script>
</body>
</html>
`;
  fs.mkdirSync(path.join(SAIDA, letra), { recursive: true });
  fs.writeFileSync(path.join(SAIDA, letra, 'index.html'), html);
  fs.copyFileSync(path.join(AQUI, letra, 'estilo.css'), path.join(SAIDA, letra, 'estilo.css'));
}

const cartao = (slug, sizes) => {
  const p = produtos[slug];
  return `<li class="cartao"><a class="cartao__ligacao" href="#">${foto(p.fotos[0], { sizes, classe: 'cartao__foto' })}<span class="cartao__corpo"><span class="cartao__nome">${esc(p.nome)}</span><span class="cartao__linha"><span class="cartao__preco">${preco(p)}</span><span class="cartao__seta">${I.seta}</span></span></span></a></li>`;
};
const rodape = (variante) => `
<footer class="rodape" id="contactos">
  <div class="rodape__marca">
    ${logo(variante === 'c' ? 72 : 64, 'rodape__logo')}
    <p class="rodape__frase">${esc(site.frase)}</p>
    <div class="rodape__redes"><a class="redondo" href="https://www.instagram.com/${site.instagram}/" aria-label="Instagram">${I.ig}</a><a class="redondo" href="${wa('Olá Alberto!')}" aria-label="WhatsApp">${I.wa}</a></div>
  </div>
  <nav class="rodape__nav" aria-label="Rodapé"><a href="#produtos">Produtos</a><a href="#trabalhos">Trabalhos</a><a href="#sobre">Sobre</a><a href="#contactos">Contactos</a></nav>
  <div class="rodape__fim"><span>© ${ano} ${esc(site.marca)}</span><span class="rodape__legais"><a href="#">Termos</a><a href="#">Privacidade</a><a href="#">Livro de Reclamações</a></span></div>
</footer>`;

// ── A · Bancada ────────────────────────────────────────────────────────────────────────────────
{
  const c = inicio.capa;
  const corpo = `
<header class="topo">
  <a class="topo__marca" href="#" aria-label="AL Art Craft, início">${logo(56)}</a>
  <nav class="topo__nav" aria-label="Principal">${NAV.map(([t, h], i) => `<a href="${h}"${i === 0 ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <a class="botao botao--wa topo__wa" href="${wa('Olá Alberto!')}">${I.wa}<span>WhatsApp</span></a>
  <button class="topo__menu" aria-label="Menu">${I.menu}</button>
</header>
<main>
  <section class="capa">
    <div class="capa__texto">
      <p class="capa__local">Fafe · Peças por medida</p>
      <h1 class="capa__titulo">Peças em madeira com a <em>marca</em> da sua casa</h1>
      <p class="capa__sub">${esc(c.texto)}</p>
      <div class="capa__botoes"><a class="botao botao--cheio" href="#produtos">Ver produtos</a><a class="botao botao--wa" href="${wa('Olá Alberto! Gostava de pedir um orçamento.')}">${I.wa}<span>Pedir orçamento</span></a></div>
    </div>
    <div class="capa__media">
      ${video(c.video, { classe: 'capa__video' })}
      <div class="capa__peca">${foto('tabua-madeira-africana-1', { sizes: '200px' })}<span><strong>Tábua de madeira Africana</strong>${euro(65)}</span></div>
    </div>
  </section>

  <section class="secao" id="produtos">
    <div class="secao__cabeca"><h2>Produtos</h2><a class="mais" href="#">Ver todos ${I.seta}</a></div>
    <ul class="categorias">${categorias.map((k) => `<li><a href="#">${foto(k.foto, { sizes: '(min-width: 1024px) 300px, 45vw', classe: 'categorias__foto' })}<span class="categorias__nome">${esc(k.nome)}</span><span class="categorias__n">${nCat(k.slug)}</span></a></li>`).join('')}</ul>
  </section>

  <section class="secao">
    <div class="secao__cabeca"><h2>Os mais pedidos</h2></div>
    <ul class="grelha">${DESTAQUES.map((s) => cartao(s, '(min-width: 1024px) 300px, 45vw')).join('')}</ul>
  </section>

  <section class="secao processo" id="sobre">
    <div class="secao__cabeca"><h2>Como trabalho</h2></div>
    <ol class="processo__lista">${inicio.processo.map((p, i) => `<li class="processo__passo"><div class="processo__media">${p.video ? video(p.video, { capa: false }) : foto(p.foto, { sizes: '400px' })}</div><span class="processo__n">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join('')}</ol>
  </section>

  <section class="secao" id="trabalhos">
    <div class="secao__cabeca"><h2>Trabalhos recentes</h2><a class="mais" href="#">Ver todos ${I.seta}</a></div>
    <ul class="trabalhos">${TRABALHOS.map((s) => { const t = trabalhos[s]; return `<li><a href="#">${foto(t.fotos[0], { sizes: '(min-width: 1024px) 420px, 92vw', classe: 'trabalhos__foto' })}<span class="trabalhos__cliente">${esc(t.cliente)}</span><span class="trabalhos__titulo">${esc(t.titulo)}</span></a></li>`; }).join('')}</ul>
  </section>

  <section class="convite">
    <h2>${esc(inicio.convite.titulo)}</h2>
    <p>${esc(inicio.convite.texto)}</p>
    <a class="botao botao--wa botao--grande" href="${wa('Olá Alberto! Tenho uma ideia:')}">${I.wa}<span>Falar com o Alberto</span></a>
  </section>
</main>
${rodape('a')}`;
  pagina('a', 'Bancada', corpo);
}

// ── B · Nogueira ───────────────────────────────────────────────────────────────────────────────
{
  const c = inicio.capa;
  const corpo = `
<header class="topo">
  <button class="topo__menu" aria-label="Menu">${I.menu}</button>
  <a class="topo__marca" href="#" aria-label="AL Art Craft, início">${logo(60)}</a>
  <nav class="topo__nav" aria-label="Principal">${NAV.map(([t, h], i) => `<a href="${h}"${i === 0 ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <a class="topo__wa" href="${wa('Olá Alberto!')}" aria-label="WhatsApp">${I.wa}</a>
</header>
<main>
  <section class="capa">
    <div class="capa__media">${video(c.video, { classe: 'capa__video' })}</div>
    <div class="capa__texto">
      <h1 class="capa__titulo">${esc(c.titulo)}</h1>
      <p class="capa__sub">${esc(c.texto)}</p>
      <div class="capa__botoes"><a class="botao botao--claro" href="#produtos">Ver produtos</a><a class="botao botao--contorno" href="${wa('Olá Alberto! Gostava de pedir um orçamento.')}">${I.wa}<span>Pedir orçamento</span></a></div>
    </div>
  </section>

  <section class="secao" id="produtos">
    <div class="secao__cabeca"><h2>Escolha por categoria</h2></div>
    <ul class="faixa">${categorias.map((k) => `<li><a href="#">${foto(k.foto, { sizes: '(min-width: 1024px) 280px, 62vw', classe: 'faixa__foto' })}<span class="faixa__nome">${esc(k.nome)}</span></a></li>`).join('')}</ul>
  </section>

  <section class="secao">
    <div class="secao__cabeca"><h2>Os mais pedidos</h2><a class="mais" href="#">Todos os produtos ${I.seta}</a></div>
    <ul class="grelha">${DESTAQUES.map((s) => cartao(s, '(min-width: 1024px) 300px, 45vw')).join('')}</ul>
  </section>

  <section class="processo" id="sobre">
    <div class="processo__dentro">
      <h2>Do desenho à mesa</h2>
      <ol class="processo__lista">${inicio.processo.map((p, i) => `<li><div class="processo__media">${p.video ? video(p.video, { capa: false }) : foto(p.foto, { sizes: '400px' })}</div><span class="processo__n">0${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join('')}</ol>
    </div>
  </section>

  <section class="secao" id="trabalhos">
    <div class="secao__cabeca"><h2>Trabalhos</h2><a class="mais" href="#">Ver o portefólio ${I.seta}</a></div>
    <div class="projetos">${TRABALHOS.slice(0, 3).map((s, i) => { const t = trabalhos[s]; return `<article class="projeto${i % 2 ? ' projeto--inv' : ''}"><a href="#" class="projeto__fotos">${foto(t.fotos[0], { sizes: '(min-width: 1024px) 640px, 92vw', classe: 'projeto__f1' })}${foto(t.fotos[1], { sizes: '(min-width: 1024px) 320px, 45vw', classe: 'projeto__f2' })}</a><div class="projeto__texto"><p class="projeto__cliente">${esc(t.cliente)}${t.local ? ` · ${esc(t.local)}` : ''}</p><h3>${esc(t.titulo)}</h3><a class="mais" href="#">Ver trabalho ${I.seta}</a></div></article>`; }).join('')}</div>
  </section>

  <section class="convite">
    <h2>${esc(inicio.convite.titulo)}</h2>
    <p>${esc(inicio.convite.texto)}</p>
    <a class="botao botao--escuro" href="${wa('Olá Alberto! Tenho uma ideia:')}">${I.wa}<span>Falar com o Alberto</span></a>
  </section>
</main>
${rodape('b')}`;
  pagina('b', 'Nogueira', corpo);
}

// ── C · Atelier ────────────────────────────────────────────────────────────────────────────────
{
  const c = inicio.capa;
  const clientes = ['Lido Grill', 'Uíma River House', 'Sal & Brasa', 'Lili Catering', 'Mezze', 'Bandita', 'O Retiro', 'Castelo', 'Dom Barril', 'Café Estrela'];
  const corpo = `
<header class="topo">
  <a class="topo__marca" href="#" aria-label="AL Art Craft, início">${logo(58)}</a>
  <nav class="topo__nav" aria-label="Principal">${NAV.map(([t, h], i) => `<a href="${h}"${i === 0 ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <a class="topo__wa" href="${wa('Olá Alberto!')}">${I.wa}<span>Falar no WhatsApp</span></a>
  <button class="topo__menu" aria-label="Menu">${I.menu}</button>
</header>
<main>
  <section class="capa">
    <p class="capa__local">Art Craft · Fafe</p>
    <h1 class="capa__titulo">Madeira trabalhada à medida da sua casa</h1>
    <p class="capa__sub">${esc(c.texto)}</p>
    <div class="capa__botoes"><a class="botao botao--cheio" href="#produtos">Ver produtos</a><a class="botao botao--linha" href="${wa('Olá Alberto! Gostava de pedir um orçamento.')}">${I.wa}<span>Pedir orçamento</span></a></div>
    <div class="mosaico">
      <div class="mosaico__a">${video(c.video, { classe: 'mosaico__video' })}</div>
      ${foto('tabua-ferro-fundido-redonda-1', { sizes: '(min-width: 1024px) 360px, 45vw', classe: 'mosaico__b' })}
      ${foto('placa-gravada-1', { sizes: '(min-width: 1024px) 360px, 45vw', classe: 'mosaico__c' })}
      ${foto('porta-espetadas-1', { sizes: '(min-width: 1024px) 300px, 45vw', classe: 'mosaico__d' })}
    </div>
  </section>

  <section class="clientes" aria-label="Alguns clientes"><p>${[...clientes, ...clientes].map((n, i) => `<span${i >= clientes.length ? ' aria-hidden="true"' : ''}>${esc(n)}</span>`).join('<i aria-hidden="true">·</i>')}<i aria-hidden="true">·</i></p></section>

  <section class="secao" id="produtos">
    <div class="secao__cabeca"><h2>Produtos</h2><p>Sete famílias de peças, todas por medida e com o seu logótipo.</p></div>
    <ol class="lista">${categorias.map((k, i) => `<li><a href="#">${foto(k.foto, { sizes: '120px', classe: 'lista__foto' })}<span class="lista__n">0${i + 1}</span><span class="lista__nome">${esc(k.nome)}</span><span class="lista__frase">${esc(k.frase)}</span><span class="lista__conta">${nCat(k.slug)} produtos</span><span class="lista__seta">${I.seta}</span></a></li>`).join('')}</ol>
  </section>

  <section class="secao">
    <div class="secao__cabeca"><h2>Os mais pedidos</h2></div>
    <ul class="carrossel">${DESTAQUES.map((s) => cartao(s, '(min-width: 1024px) 300px, 70vw')).join('')}</ul>
  </section>

  <section class="secao processo" id="sobre">
    <div class="secao__cabeca"><h2>Como trabalho</h2></div>
    <ol class="processo__lista">${inicio.processo.map((p, i) => `<li><span class="processo__n">0${i + 1}</span><div class="processo__media">${p.video ? video(p.video, { capa: false }) : foto(p.foto, { sizes: '400px' })}</div><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join('')}</ol>
  </section>

  <section class="secao" id="trabalhos">
    <div class="secao__cabeca"><h2>Trabalhos</h2><a class="mais" href="#">Ver todos ${I.seta}</a></div>
    <ul class="parede">${TRABALHOS.map((s) => { const t = trabalhos[s]; return `<li><a href="#">${foto(t.fotos[0], { sizes: '(min-width: 1024px) 420px, 46vw', classe: 'parede__foto' })}<span class="parede__texto"><span class="parede__cliente">${esc(t.cliente)}</span><span class="parede__titulo">${esc(t.titulo)}</span></span></a></li>`; }).join('')}</ul>
  </section>

  <section class="convite">
    <p class="capa__local">Por medida</p>
    <h2>${esc(inicio.convite.titulo)}</h2>
    <p>${esc(inicio.convite.texto)}</p>
    <a class="botao botao--cheio" href="${wa('Olá Alberto! Tenho uma ideia:')}">${I.wa}<span>Falar com o Alberto</span></a>
  </section>
</main>
${rodape('c')}`;
  pagina('c', 'Atelier', corpo);
}

fs.writeFileSync(path.join(SAIDA, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Propostas — AL Art Craft</title><ul><li><a href="a/">A · Bancada</a><li><a href="b/">B · Nogueira</a><li><a href="c/">C · Atelier</a></ul>`);
console.log('propostas em', SAIDA, '·', copiados.size, 'imagens');
