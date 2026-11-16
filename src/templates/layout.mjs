// O esqueleto de todas as páginas: <head>, cabeçalho (um só, igual em todas), menu do telemóvel e rodapé.
import { esc, href, asset, logo, I, whatsapp } from './util.mjs';
import { livroReclamacoes } from '../../legal-comum/index.mjs';

const NAV = [
  ['produtos', 'Produtos', '/produtos/'],
  ['trabalhos', 'Trabalhos', '/trabalhos/'],
  ['sobre', 'Sobre', '/sobre/'],
  ['contactos', 'Contactos', '/contactos/'],
];

const LEGAIS = [
  ['Termos', '/termos-e-condicoes/'],
  ['Privacidade', '/politica-de-privacidade/'],
  ['Garantia', '/garantia/'],
  ['Litígios', '/resolucao-de-litigios/'],
  ['Desistir', '/desistir/'],
];

/**
 * @param {object} ctx  o contexto do build
 * @param {object} p    { titulo, descricao, caminho, seccao, corpo, indexar, imagem, jsonld[], classe }
 */
export function pagina(ctx, p) {
  const { site } = ctx;
  const url = ctx.url ? `${ctx.url}${p.caminho}` : null;
  const indexar = ctx.producao && p.indexar !== false;
  const imagem = p.imagem ?? ctx.imagemPartilha;
  const imagemAbs = imagem && ctx.url ? `${ctx.url}${imagem.slice(ctx.base.length)}` : imagem;
  const jsonld = (p.jsonld ?? []).filter(Boolean).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  const atual = (s) => (p.seccao === s ? ' aria-current="page"' : '');
  const navegacao = NAV.map(([s, t, c]) => `<a href="${href(ctx, c)}"${atual(s)}>${t}</a>`).join('');
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } }</style>
<title>${esc(p.titulo)}</title>
<meta name="description" content="${esc(p.descricao)}">
${indexar ? '' : '<meta name="robots" content="noindex, follow">\n'}${url && indexar ? `<link rel="canonical" href="${esc(url)}">\n` : ''}<meta name="theme-color" content="#FBF9F6">
<meta property="og:type" content="${p.ogTipo ?? 'website'}">
<meta property="og:site_name" content="${esc(site.marca)}">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(p.tituloPartilha ?? p.titulo)}">
<meta property="og:description" content="${esc(p.descricao)}">
${url ? `<meta property="og:url" content="${esc(url)}">\n` : ''}${imagemAbs ? `<meta property="og:image" content="${esc(imagemAbs)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="icon" href="${ctx.icone(32)}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${ctx.icone(180)}">
<link rel="manifest" href="${href(ctx, '/site.webmanifest')}">
${ctx.fontesPreload.map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${ctx.css}">
<script>document.documentElement.classList.add('js')</script>
<script src="${ctx.js}" defer></script>
${jsonld}
</head>
<body class="${p.classe ?? ''}">
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
<header class="topo">
  <div class="topo__barra">
    <nav class="topo__nav" aria-label="Principal">${navegacao}</nav>
    <button class="topo__menu" type="button" aria-expanded="false" aria-controls="menu"><span class="topo__menu-abrir">${I.menu}</span><span class="topo__menu-fechar">${I.fechar}</span><span class="sr">Menu</span></button>
    <a class="topo__marca" href="${href(ctx, '/')}" aria-label="AL Art Craft — início">${logo(ctx, 66, 'topo__logo')}</a>
    <div class="topo__acoes">
      <a class="topo__icone topo__wa" href="${whatsapp(site, 'Olá Alberto!')}" target="_blank" rel="noopener" aria-label="WhatsApp (abre o WhatsApp)">${I.wa}</a>
    </div>
  </div>
</header>
<nav class="menu" id="menu" aria-label="Menu" hidden>
  <div class="menu__dentro">
    <ul class="menu__lista">
      <li><a href="${href(ctx, '/')}"${p.seccao === 'inicio' ? ' aria-current="page"' : ''}>Início</a></li>
      ${NAV.map(([s, t, c]) => `<li><a href="${href(ctx, c)}"${atual(s)}>${t}</a></li>`).join('\n      ')}
    </ul>
    <div class="menu__pe">
      <a class="botao botao--escuro botao--largo" href="${whatsapp(site, 'Olá Alberto!')}" target="_blank" rel="noopener">${I.wa}<span>Falar no WhatsApp</span></a>
      ${site.instagram ? `<a class="menu__ig" href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener">${I.ig}<span>@${esc(site.instagram)}</span></a>` : ''}
    </div>
  </div>
</nav>
<main id="conteudo">
${p.corpo}
</main>
<footer class="rodape">
  <a class="rodape__logo" href="${href(ctx, '/')}" aria-label="AL Art Craft — início">${logo(ctx, 72, 'rodape__marca')}</a>
  <nav class="rodape__nav" aria-label="Rodapé">${NAV.map(([, t, c]) => `<a href="${href(ctx, c)}">${t}</a>`).join('')}<a href="${href(ctx, '/perguntas-frequentes/')}">Perguntas</a></nav>
  <div class="rodape__redes">
    ${site.instagram ? `<a class="redondo" href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a>` : ''}
    <a class="redondo" href="${whatsapp(site, 'Olá Alberto!')}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>
  </div>
  <div class="rodape__fim">
    <span class="rodape__copia">© ${ctx.ano} ${esc(site.marca)}</span>
    <span class="rodape__legais">${LEGAIS.map(([t, c]) => `<a href="${href(ctx, c)}">${t}</a>`).join('')}${livroReclamacoes({ classe: 'lr-discreto' })}</span>
  </div>
</footer>
</body>
</html>
`;
}
