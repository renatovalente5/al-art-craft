// Peças comuns das páginas: escapar texto, imagens (<picture> AVIF/WebP), vídeos, o logótipo, os desenhos e o
// Markdown curto das páginas de texto. O contexto (ctx) vem do scripts/build.mjs: { base, manifesto, fotos, url }.
import { euros } from '../lib/regras.mjs';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Uma ligação interna, com o caminho base do GitHub Pages (/al-art-craft) quando há. */
export const href = (ctx, caminho) => `${ctx.base}${caminho}`;
export const asset = (ctx, caminho) => `${ctx.base}/assets/${caminho}`;

/** <picture> com AVIF e WebP em várias larguras; `sizes` diz a largura no ecrã. */
export function foto(ctx, nome, { sizes = '100vw', classe = '', alt, eager = false, prioridade = false } = {}) {
  const m = ctx.manifesto.fotos[nome] ?? ctx.manifesto.videos[nome.replace(/^video:/, '')];
  if (!m) throw new Error(`Fotografia sem versões web: ${nome} (correr scripts/imagens.py)`);
  const base = nome.startsWith('video:') ? `video-${nome.slice(6)}` : nome;
  ctx.usadas.add(base);
  const src = (fmt) => m.larguras.map((w) => `${asset(ctx, `img/${base}-${m.resumo}-${w}.${fmt}`)} ${w}w`).join(', ');
  const fontes = m.formatos.map((fmt) => `<source type="image/${fmt}" srcset="${src(fmt)}" sizes="${sizes}">`).join('');
  const texto = alt ?? (nome.startsWith('video:') ? '' : ctx.fotos[nome]?.alt ?? '');
  const carregar = eager ? (prioridade ? ' fetchpriority="high"' : '') : ' loading="lazy"';
  return `<picture${classe ? ` class="${classe}"` : ''}>${fontes}<img src="${asset(ctx, `img/${base}-${m.resumo}-${m.jpg}.jpg`)}" width="${m.w}" height="${m.h}" alt="${esc(texto)}"${carregar} decoding="async"></picture>`;
}

/** O endereço de uma imagem (JPEG) — partilhas, JSON-LD e o painel. */
export function fotoUrl(ctx, nome, { partilha = false } = {}) {
  const m = ctx.manifesto.fotos[nome];
  if (!m) return null;
  ctx.usadas.add(nome);
  return asset(ctx, `img/${nome}-${m.resumo}-${partilha ? 'partilha' : m.jpg}.jpg`);
}

/** Um vídeo sem som, em ciclo; `capa` = o primeiro da capa (começa logo). Os outros só tocam à vista (site.js). */
export function video(ctx, nome, { classe = '', capa = false, rotulo = '' } = {}) {
  const m = ctx.manifesto.videos[nome];
  const ficheiro = ctx.videos[nome];
  if (!m || !ficheiro) throw new Error(`Vídeo sem ficheiro ou sem capa: ${nome}`);
  ctx.usadas.add(`video-${nome}`);
  const poster = asset(ctx, `img/video-${nome}-${m.resumo}-${m.jpg}.jpg`);
  const aria = rotulo ? ` aria-label="${esc(rotulo)}"` : ' aria-hidden="true"';
  return `<video class="${classe}" muted loop playsinline${capa ? ' autoplay preload="auto"' : ' preload="none"'} poster="${poster}" width="${m.w}" height="${m.h}" data-video${aria}><source src="${asset(ctx, `video/${ficheiro}`)}" type="video/mp4"></video>`;
}

/** O logótipo do Alberto (o desenho dele, só sem o fundo branco), à altura pedida, com 2× e 3×. */
export function logo(ctx, altura, classe = 'logo') {
  const m = ctx.manifesto.logo;
  const escolher = (alvo) => m.alturas.find((a) => a >= alvo) ?? m.alturas.at(-1);
  const p = (a, ext) => asset(ctx, `img/logo-${m.resumo}-${a}.${ext}`);
  ctx.usadas.add('logo');
  const w = Math.round((m.w * altura) / m.h);
  return `<picture class="${classe}"><source type="image/webp" srcset="${p(escolher(altura), 'webp')} 1x, ${p(escolher(altura * 2), 'webp')} 2x, ${p(escolher(altura * 3), 'webp')} 3x"><img src="${p(escolher(altura * 2), 'png')}" width="${w}" height="${altura}" alt="AL Art Craft"></picture>`;
}

export const I = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.25-1.38A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 1 1 6.97 3.86Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-1.98-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.31 2.75 2.75 0 0 0-.86 2.04 4.8 4.8 0 0 0 1 2.53 10.9 10.9 0 0 0 4.2 3.7c.58.26 1.04.41 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.17-.47-.29Z"/></svg>',
  seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  voltar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m5 5-5-5 5-5"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 8h16M4 16h16"/></svg>',
  fechar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>',
  menos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 12h12"/></svg>',
  mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 6v12M6 12h12"/></svg>',
  tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m4 7 8 6 8-6"/></svg>',
  local: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
};

/** O preço como aparece num cartão ou na ficha (HTML). */
export function precoHtml(p) {
  return `${p.desde ? '<span class="preco__desde">desde</span> ' : ''}${esc(euros(p.preco))}${p.unidade ? `<span class="preco__un"> / ${esc(p.unidade)}</span>` : ''}`;
}

/** A ligação do WhatsApp com uma mensagem escrita. */
export const whatsapp = (site, texto) => `https://wa.me/${site.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

/** Markdown curto das páginas de texto: ## e ### títulos, parágrafos, listas (- e 1.), **negrito**, [ligações](/x/).
 *  Os marcadores {{…}} já vêm substituídos por HTML (guardado à parte e reposto no fim). */
export function markdown(ctx, texto) {
  const guardados = [];
  const t = texto;
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
      const externo = /^https?:/.test(url);
      const destino = externo ? url : url.startsWith('/') ? href(ctx, url) : url;
      return `<a href="${destino}"${externo ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`;
    })
    .replace(/§§(\d+)§§/g, (m, i) => ctx.marcas[Number(i)] ?? '');
  const linhas = t.replace(/\r/g, '').split('\n');
  const out = [];
  let lista = null;
  let para = [];
  const fecharPara = () => { if (para.length) { const p = para.join(' ').trim(); out.push(/^§§\d+§§$/.test(p) ? inline(p) : `<p>${inline(p)}</p>`); para = []; } };
  const fecharLista = () => { if (lista) { out.push(`<${lista.tipo}>${lista.itens.map((i) => `<li>${inline(i)}</li>`).join('')}</${lista.tipo}>`); lista = null; } };
  for (const l of linhas) {
    let m;
    if (!l.trim()) { fecharPara(); fecharLista(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)$/))) {
      fecharPara(); fecharLista();
      const nivel = m[1].length;
      const id = m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${nivel} id="${id}">${inline(m[2])}</h${nivel}>`);
      continue;
    }
    if ((m = l.match(/^\s*[-•]\s+(.*)$/)) || (m = l.match(/^\s*\d+\.\s+(.*)$/))) {
      fecharPara();
      const tipo = /^\s*\d+\./.test(l) ? 'ol' : 'ul';
      if (lista && lista.tipo !== tipo) fecharLista();
      if (!lista) lista = { tipo, itens: [] };
      lista.itens.push(m[1]);
      continue;
    }
    fecharLista();
    para.push(l.trim());
  }
  fecharPara(); fecharLista();
  return out.join('\n');
}

/** Lê uma página de texto: cabeça «chave: valor», «---», corpo em Markdown. */
export function lerPagina(texto) {
  const [cabeca, ...resto] = texto.split(/^---$/m);
  const meta = {};
  for (const l of cabeca.split('\n')) { const m = l.match(/^([a-zA-Z]+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim(); }
  return { meta, corpo: resto.join('---').trim() };
}
