// As páginas do site. Cada função devolve { caminho, titulo, descricao, corpo, … } para o layout.
import { esc, href, foto, fotoUrl, video, I, precoHtml, whatsapp, markdown } from './util.mjs';
import { euros, precoTexto } from '../lib/regras.mjs';
import { tituloCategoria, descricaoCategoria, tituloProduto, descricaoProduto } from '../seo.mjs';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** O cartão de um produto: o cartão inteiro leva à ficha; a mesma seta em todos (não compra). */
export function cartao(ctx, p, { sizes = '(min-width: 1024px) 290px, (min-width: 720px) 23vw, 46vw' } = {}) {
  return `<li class="cartao"><a class="cartao__ligacao" href="${href(ctx, `/produto/${p.slug}/`)}">${foto(ctx, p.fotos[0], { sizes, classe: 'cartao__foto', alt: '' })}<span class="cartao__corpo"><span class="cartao__nome">${esc(p.nome)}</span><span class="cartao__linha"><span class="cartao__preco">${precoHtml(p)}</span><span class="cartao__seta">${I.seta}</span></span></span></a></li>`;
}

function trabalhoCartao(ctx, t, sizes = '(min-width: 1024px) 400px, (min-width: 720px) 46vw, 92vw') {
  return `<li><a class="trabalho-cartao" href="${href(ctx, `/trabalhos/${t.slug}/`)}">${foto(ctx, t.fotos[0], { sizes, classe: 'trabalho-cartao__foto', alt: '' })}<span class="trabalho-cartao__cliente">${esc(t.cliente)}</span><span class="trabalho-cartao__titulo">${esc(t.titulo)}</span></a></li>`;
}

function migalhas(ctx, itens) {
  const lista = itens.map(([nome, caminho], i) => i === itens.length - 1
    ? `<li aria-current="page">${esc(nome)}</li>`
    : `<li><a href="${href(ctx, caminho)}">${esc(nome)}</a></li>`).join('');
  return `<nav class="migalhas" aria-label="Estou em"><ol>${lista}</ol></nav>`;
}

export function jsonMigalhas(ctx, itens) {
  if (!ctx.url) return null;
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: itens.map(([nome, caminho], i) => ({ '@type': 'ListItem', position: i + 1, name: nome, item: `${ctx.url}${caminho}` })) };
}

// ── Início ─────────────────────────────────────────────────────────────────────────────────────────
export function inicio(ctx) {
  const { site, conteudo: c } = ctx;
  const capa = c.inicio.capa;
  const destaques = ctx.produtos.filter((p) => p.destaque).slice(0, 8);
  const trabalhos = ctx.trabalhos.filter((t) => t.destaque).slice(0, 6);
  const videos = capa.videos.map((v, i) => video(ctx, v, { classe: 'capa__video', capa: i === 0 })).join('');
  const corpo = `
<section class="capa capa--${capa.videos.length}">
  <div class="capa__videos">${videos}</div>
  <div class="capa__texto">
    <h1 class="capa__titulo">${esc(capa.titulo)}</h1>
    <p class="capa__sub">${esc(capa.texto)}</p>
    <div class="capa__botoes">
      <a class="botao botao--claro" href="${href(ctx, '/produtos/')}">Ver produtos</a>
      <a class="botao botao--vidro" href="${whatsapp(site, 'Olá Alberto! Gostava de pedir um orçamento.')}" target="_blank" rel="noopener">${I.wa}<span>Pedir orçamento</span></a>
    </div>
  </div>
</section>

<section class="secao" aria-labelledby="t-produtos">
  <div class="secao__cabeca"><h2 id="t-produtos">Produtos</h2><a class="mais" href="${href(ctx, '/produtos/')}">Ver todos ${I.seta}</a></div>
  <ul class="categorias">${ctx.categorias.map((k) => `<li><a class="categoria" href="${href(ctx, `/produtos/${k.slug}/`)}">${foto(ctx, k.foto, { sizes: '(min-width: 1024px) 170px, (min-width: 720px) 23vw, 46vw', classe: 'categoria__foto', alt: '' })}<span class="categoria__nome">${esc(k.nome)}</span><span class="categoria__n">${plural(k.n, 'produto', 'produtos')}</span></a></li>`).join('')}</ul>
</section>

${destaques.length ? `<section class="secao" aria-labelledby="t-destaques">
  <div class="secao__cabeca"><h2 id="t-destaques">Os mais pedidos</h2></div>
  <ul class="grelha">${destaques.map((p) => cartao(ctx, p)).join('')}</ul>
</section>` : ''}

<section class="secao processo" aria-labelledby="t-processo">
  <div class="secao__cabeca"><h2 id="t-processo">Como trabalho</h2><a class="mais" href="${href(ctx, '/sobre/')}">Sobre ${I.seta}</a></div>
  <ol class="processo__lista">${c.inicio.processo.map((s, i) => `<li class="processo__passo">${s.video ? `<div class="processo__foto">${video(ctx, s.video, { classe: 'processo__video' })}</div>` : foto(ctx, s.foto, { sizes: '(min-width: 1024px) 390px, (min-width: 720px) 31vw, 92vw', classe: 'processo__foto' })}<span class="processo__n" aria-hidden="true">${i + 1}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></li>`).join('')}</ol>
</section>

${trabalhos.length ? `<section class="secao" aria-labelledby="t-trabalhos">
  <div class="secao__cabeca"><h2 id="t-trabalhos">Trabalhos recentes</h2><a class="mais" href="${href(ctx, '/trabalhos/')}">Ver todos ${I.seta}</a></div>
  <ul class="trabalhos">${trabalhos.map((t) => trabalhoCartao(ctx, t)).join('')}</ul>
</section>` : ''}

<section class="convite" aria-labelledby="t-convite">
  <h2 id="t-convite">${esc(c.inicio.convite.titulo)}</h2>
  <p>${esc(c.inicio.convite.texto)}</p>
  <a class="botao botao--escuro botao--grande" href="${whatsapp(site, 'Olá Alberto! Tenho uma ideia:')}" target="_blank" rel="noopener">${I.wa}<span>Falar com o Alberto</span></a>
</section>`;
  const jsonld = ctx.url ? [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site.marca, alternateName: 'AL Art Craft Fafe', url: `${ctx.url}/`, inLanguage: 'pt-PT' },
    {
      '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': `${ctx.url}/#negocio`, name: site.marca,
      description: site.descricao, url: `${ctx.url}/`, image: ctx.logoUrl, logo: ctx.logoUrl, telephone: `+351${site.telefone.replace(/\s/g, '')}`,
      ...(site.email ? { email: site.email } : {}),
      address: { '@type': 'PostalAddress', addressLocality: site.localidade, postalCode: site.codigoPostal, addressCountry: 'PT' },
      founder: { '@type': 'Person', name: site.dono },
      sameAs: [`https://www.instagram.com/${site.instagram}/`],
    },
  ] : [];
  return { caminho: '/', seccao: 'inicio', titulo: `${site.marca} — peças em madeira por medida, em ${site.localidade}`, descricao: site.descricao, corpo, jsonld, classe: 'pagina-inicio' };
}

// ── Produtos (todos) e cada categoria: separadores que são páginas ─────────────────────────────────────
export function produtos(ctx, categoria = null) {
  const lista = categoria ? ctx.produtos.filter((p) => p.categoria === categoria.slug) : ctx.produtos;
  const sep = (nome, caminho, ativo) => `<li><a href="${href(ctx, caminho)}"${ativo ? ' aria-current="page"' : ''}>${esc(nome)}</a></li>`;
  const caminho = categoria ? `/produtos/${categoria.slug}/` : '/produtos/';
  const corpo = `
<div class="pagina pagina--loja">
  <nav class="separadores" aria-label="Categorias" data-separadores>
    <ul>${sep('Todos', '/produtos/', !categoria)}${ctx.categorias.map((k) => sep(k.nome, `/produtos/${k.slug}/`, categoria?.slug === k.slug)).join('')}</ul>
  </nav>
  <header class="cabeca">
    <h1>${esc(categoria ? categoria.nome : 'Produtos')}</h1>
    <p>${esc(categoria ? categoria.frase : 'Peças em madeira por medida, quase todas com o seu logótipo gravado. Escolha uma para ver os pormenores e encomendar pelo WhatsApp.')}</p>
  </header>
  <ul class="grelha">${lista.map((p) => cartao(ctx, p)).join('')}</ul>
  <p class="loja__pe">Não encontra o que procura? <a href="${whatsapp(ctx.site, 'Olá Alberto! Procuro uma peça que não vi no site:')}" target="_blank" rel="noopener">Fale com o Alberto</a>: quase tudo se faz por medida.</p>
</div>`;
  const itens = categoria ? [['Produtos', '/produtos/'], [categoria.nome, caminho]] : [['Produtos', '/produtos/']];
  const lista_ld = ctx.url ? { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: lista.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ctx.url}/produto/${p.slug}/` })) } : null;
  return {
    caminho, seccao: 'produtos', corpo, classe: 'pagina-loja',
    titulo: categoria ? tituloCategoria(categoria, ctx.site) : `Produtos em madeira por medida | ${ctx.site.marca}`,
    descricao: categoria ? descricaoCategoria(categoria, ctx.site) : `Tábuas de servir, ferro fundido, pratos, porta-menus, caixas, placas e bancadas de catering, por medida e com o seu logótipo. Feitas em ${ctx.site.localidade}.`,
    imagem: fotoUrl(ctx, categoria ? categoria.foto : ctx.categorias[0].foto, { partilha: true }),
    jsonld: [jsonMigalhas(ctx, itens), lista_ld],
  };
}

// ── A ficha do produto ─────────────────────────────────────────────────────────────────────────────
export function produto(ctx, p) {
  const { site } = ctx;
  const cat = ctx.categoriasPorSlug[p.categoria];
  const feita = p.feitaPara ? ctx.trabalhosPorSlug[p.feitaPara] : null;
  const slides = p.fotos.map((f, i) => `<li class="galeria__slide" id="${p.slug}-${i + 1}">${foto(ctx, f, { sizes: '(min-width: 1024px) 640px, (min-width: 720px) 52vw, 100vw', eager: i === 0, prioridade: i === 0 })}</li>`);
  if (p.video) slides.splice(Math.min(1, slides.length), 0, `<li class="galeria__slide galeria__slide--video" id="${p.slug}-video">${video(ctx, p.video, { classe: 'galeria__video', rotulo: `Vídeo: ${p.nome}` })}</li>`);
  const miniaturas = p.fotos.map((f, i) => ({ alvo: `${p.slug}-${i + 1}`, html: foto(ctx, f, { sizes: '72px', alt: '' }) }));
  if (p.video) miniaturas.splice(Math.min(1, miniaturas.length), 0, { alvo: `${p.slug}-video`, html: `${foto(ctx, `video:${p.video}`, { sizes: '72px', alt: '' })}<span class="galeria__play">${I.play}</span>`, rotulo: 'Ver o vídeo' });
  const galeria = `<div class="galeria" data-galeria>
    <ul class="galeria__slides" tabindex="0" aria-label="Fotografias de ${esc(p.nome)}">${slides.join('')}</ul>
    ${miniaturas.length > 1 ? `<ul class="galeria__miniaturas">${miniaturas.map((m, i) => `<li><a href="#${m.alvo}" data-alvo="${m.alvo}" aria-label="${esc(m.rotulo ?? `Fotografia ${i + 1}`)}"${i === 0 ? ' aria-current="true"' : ''}>${m.html}</a></li>`).join('')}</ul>` : ''}
  </div>`;
  const opcoes = (p.opcoes ?? []).map((o, i) => `<fieldset class="escolha">
      <legend>${esc(o.nome)}</legend>
      <div class="escolha__valores">${o.valores.map((v, j) => {
        const mais = v.mais > 0 ? ` <span class="escolha__mais">+ ${esc(euros(v.mais))}</span>` : '';
        const marcado = v.mais === Math.min(...o.valores.map((x) => x.mais)) && o.valores.findIndex((x) => x.mais === Math.min(...o.valores.map((y) => y.mais))) === j;
        return `<label class="escolha__valor"><input type="radio" name="opcao-${i}" value="${esc(v.nome)}" data-mais="${v.mais}"${marcado ? ' checked' : ''}><span>${esc(v.nome)}${mais}</span></label>`;
      }).join('')}</div>
    </fieldset>`).join('');
  const carac = p.caracteristicas.length ? `<dl class="caracteristicas">${p.caracteristicas.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  const mensagemBase = `${site.mensagemWhatsapp}\n• 1 × ${p.nome} — ${precoTexto(p)}`;
  const relacionados = ctx.produtos.filter((x) => x.categoria === p.categoria && x.slug !== p.slug).slice(0, 4);
  const corpo = `
<div class="pagina pagina--produto">
  ${migalhas(ctx, [['Produtos', '/produtos/'], [cat.nome, `/produtos/${cat.slug}/`], [p.nome, `/produto/${p.slug}/`]])}
  <article class="ficha">
    ${galeria}
    <div class="ficha__info">
      <a class="ficha__categoria" href="${href(ctx, `/produtos/${cat.slug}/`)}">${esc(cat.nome)}</a>
      <h1 class="ficha__nome">${esc(p.nome)}</h1>
      <p class="ficha__preco" data-preco-base="${p.preco}">${precoHtml(p)}</p>
      <p class="ficha__resumo">${esc(p.resumo)}</p>
      ${p.descricao ? `<p class="ficha__descricao">${esc(p.descricao)}</p>` : ''}
      ${carac}
      <form class="encomenda" data-encomenda data-nome="${esc(p.nome)}" data-preco="${p.preco}" data-desde="${p.desde ? 1 : 0}" data-unidade="${esc(p.unidade ?? '')}" data-abertura="${esc(site.mensagemWhatsapp)}" data-whatsapp="${site.whatsapp}" data-endereco="${ctx.url ? esc(`${ctx.url}/produto/${p.slug}/`) : ''}">
        ${opcoes}
        <div class="encomenda__linha">
          <label class="encomenda__rotulo" for="qtd-${p.slug}">Quantidade</label>
          <div class="quantidade">
            <button type="button" class="quantidade__botao" data-passo="-1" aria-label="Menos um">${I.menos}</button>
            <input id="qtd-${p.slug}" name="quantidade" type="number" inputmode="numeric" min="1" max="999" value="1">
            <button type="button" class="quantidade__botao" data-passo="1" aria-label="Mais um">${I.mais}</button>
          </div>
        </div>
        <label class="encomenda__rotulo" for="notas-${p.slug}">Medidas ou gravação <span class="opcional">(opcional)</span></label>
        <textarea id="notas-${p.slug}" name="notas" rows="2" maxlength="300" placeholder="Ex.: o logótipo, 40 × 30 cm"></textarea>
        <p class="encomenda__total" data-total hidden></p>
        <a class="botao botao--wa-cheio botao--largo" data-enviar href="${whatsapp(site, mensagemBase)}" target="_blank" rel="noopener">${I.wa}<span>Encomendar pelo WhatsApp</span></a>
        <ul class="encomenda__notas">
          <li>Feita por medida em ${esc(site.localidade)}. O prazo e a entrega combinam-se na conversa, antes de confirmar.</li>
          <li>Garantia legal de 3 anos. <a href="${href(ctx, '/termos-e-condicoes/')}">Condições de encomenda</a></li>
        </ul>
      </form>
      ${feita ? `<a class="ficha__feita" href="${href(ctx, `/trabalhos/${feita.slug}/`)}">${foto(ctx, feita.fotos[0], { sizes: '56px', alt: '' })}<span><span class="ficha__feita-rotulo">Na fotografia: feita para</span> ${esc(feita.cliente)}</span>${I.seta}</a>` : ''}
    </div>
  </article>
  ${relacionados.length ? `<section class="secao secao--relacionados" aria-labelledby="t-mais">
    <div class="secao__cabeca"><h2 id="t-mais">Mais ${esc(cat.nome.toLowerCase())}</h2><a class="mais" href="${href(ctx, `/produtos/${cat.slug}/`)}">Ver todos ${I.seta}</a></div>
    <ul class="grelha">${relacionados.map((x) => cartao(ctx, x)).join('')}</ul>
  </section>` : ''}
</div>`;
  const imagens = p.fotos.slice(0, 4).map((f) => fotoUrl(ctx, f)).map((u) => (ctx.url ? `${ctx.url}${u.slice(ctx.base.length)}` : u));
  const ld = ctx.url ? {
    '@context': 'https://schema.org', '@type': 'Product', name: p.nome, description: [p.resumo, p.descricao].filter(Boolean).join(' '),
    image: imagens, sku: p.slug, category: cat.nome, brand: { '@type': 'Brand', name: site.marca },
    offers: { '@type': 'Offer', url: `${ctx.url}/produto/${p.slug}/`, priceCurrency: 'EUR', price: p.preco.toFixed(2), availability: 'https://schema.org/MadeToOrder', itemCondition: 'https://schema.org/NewCondition', seller: { '@id': `${ctx.url}/#negocio` } },
  } : null;
  return {
    caminho: `/produto/${p.slug}/`, seccao: 'produtos', corpo, classe: 'pagina-produto', ogTipo: 'product',
    titulo: tituloProduto(p, cat, site), descricao: descricaoProduto(p, site),
    imagem: fotoUrl(ctx, p.fotos[0], { partilha: true }),
    jsonld: [ld, jsonMigalhas(ctx, [['Produtos', '/produtos/'], [cat.nome, `/produtos/${cat.slug}/`], [p.nome, `/produto/${p.slug}/`]])],
  };
}

// ── Trabalhos (portefólio) ─────────────────────────────────────────────────────────────────────────
export function trabalhos(ctx) {
  const corpo = `
<div class="pagina pagina--trabalhos">
  <header class="cabeca">
    <h1>Trabalhos</h1>
    <p>Algumas das peças que fiz para restaurantes, catering, quintas e alojamento rural.</p>
  </header>
  <ul class="trabalhos trabalhos--todos">${ctx.trabalhos.map((t) => trabalhoCartao(ctx, t)).join('')}</ul>
</div>`;
  return {
    caminho: '/trabalhos/', seccao: 'trabalhos', corpo, classe: 'pagina-trabalhos',
    titulo: `Trabalhos: peças em madeira para restaurantes e quintas | ${ctx.site.marca}`,
    descricao: `O portefólio da ${ctx.site.marca}: placas gravadas, tábuas, porta-menus e bancadas de catering feitas por medida para ${ctx.trabalhos.slice(0, 3).map((t) => t.cliente).join(', ')} e outros.`,
    imagem: fotoUrl(ctx, ctx.trabalhos[0].fotos[0], { partilha: true }),
    jsonld: [jsonMigalhas(ctx, [['Trabalhos', '/trabalhos/']])],
  };
}

export function trabalho(ctx, t) {
  const prods = t.produtos.map((s) => ctx.produtosPorSlug[s]).filter(Boolean);
  const meta = [t.local, t.ano].filter(Boolean).join(' · ');
  const fotos = t.fotos.map((f, i) => `<li class="mosaico__item${i === 0 ? ' mosaico__item--grande' : ''}">${foto(ctx, f, { sizes: i === 0 ? '(min-width: 1024px) 820px, 100vw' : '(min-width: 1024px) 400px, 50vw', eager: i === 0, prioridade: i === 0 })}</li>`);
  if (t.video) fotos.splice(1, 0, `<li class="mosaico__item mosaico__item--video">${video(ctx, t.video, { classe: 'mosaico__video', rotulo: `Vídeo: ${t.titulo}` })}</li>`);
  const outros = ctx.trabalhos.filter((x) => x.slug !== t.slug).slice(0, 3);
  const corpo = `
<div class="pagina pagina--trabalho">
  <header class="cabeca cabeca--trabalho">
    <a class="cabeca__voltar" href="${href(ctx, '/trabalhos/')}">${I.voltar}<span>Trabalhos</span></a>
    <p class="cabeca__cliente">${esc(t.cliente)}</p>
    <h1>${esc(t.titulo)}</h1>
    ${meta ? `<p class="cabeca__meta">${esc(meta)}</p>` : ''}
  </header>
  <ul class="mosaico">${fotos.join('')}</ul>
  ${prods.length ? `<section class="secao secao--estreita" aria-labelledby="t-pecas">
    <div class="secao__cabeca"><h2 id="t-pecas">${prods.length === 1 ? 'A peça' : 'As peças'}</h2></div>
    <ul class="grelha">${prods.map((p) => cartao(ctx, p)).join('')}</ul>
  </section>` : ''}
  <section class="convite convite--pequeno">
    <h2>Quer algo parecido?</h2>
    <p>Diga-me o que precisa e mando-lhe uma proposta, com o projeto em 3D.</p>
    <a class="botao botao--escuro botao--grande" href="${whatsapp(ctx.site, `Olá Alberto! Vi o trabalho «${t.titulo}» e queria algo parecido.`)}" target="_blank" rel="noopener">${I.wa}<span>Falar com o Alberto</span></a>
  </section>
  ${outros.length ? `<section class="secao" aria-labelledby="t-outros">
    <div class="secao__cabeca"><h2 id="t-outros">Outros trabalhos</h2><a class="mais" href="${href(ctx, '/trabalhos/')}">Ver todos ${I.seta}</a></div>
    <ul class="trabalhos">${outros.map((x) => trabalhoCartao(ctx, x)).join('')}</ul>
  </section>` : ''}
</div>`;
  return {
    caminho: `/trabalhos/${t.slug}/`, seccao: 'trabalhos', corpo, classe: 'pagina-trabalho',
    titulo: `${t.titulo} — ${t.cliente} | ${ctx.site.marca}`,
    descricao: `${t.titulo}, para ${t.cliente}${t.local ? ` (${t.local})` : ''}. Feito por medida pela ${ctx.site.marca}, em ${ctx.site.localidade}.`,
    imagem: fotoUrl(ctx, t.fotos[0], { partilha: true }),
    jsonld: [jsonMigalhas(ctx, [['Trabalhos', '/trabalhos/'], [t.cliente, `/trabalhos/${t.slug}/`]])],
  };
}

// ── Sobre e Contactos ──────────────────────────────────────────────────────────────────────────────
export function sobre(ctx, pag) {
  const corpo = `
<div class="pagina pagina--sobre">
  <div class="sobre">
    <div class="sobre__texto">
      <h1>${esc(pag.meta.titulo)}</h1>
      <div class="texto">${markdown(ctx, pag.corpo)}</div>
      <a class="botao botao--escuro" href="${whatsapp(ctx.site, 'Olá Alberto!')}" target="_blank" rel="noopener">${I.wa}<span>Falar com o Alberto</span></a>
    </div>
    <div class="sobre__fotos">
      ${foto(ctx, 'processo-corte', { sizes: '(min-width: 1024px) 460px, 92vw', classe: 'sobre__foto', eager: true })}
      ${foto(ctx, 'tabua-de-cumaru-1', { sizes: '(min-width: 1024px) 220px, 45vw', classe: 'sobre__foto sobre__foto--pequena' })}
    </div>
  </div>
</div>`;
  return { caminho: '/sobre/', seccao: 'sobre', corpo, classe: 'pagina-sobre', titulo: `Sobre a ${ctx.site.marca}: a oficina do Alberto Lopes, em ${ctx.site.localidade}`, descricao: pag.meta.descricao, jsonld: [jsonMigalhas(ctx, [['Sobre', '/sobre/']])] };
}

export function contactos(ctx) {
  const { site } = ctx;
  const ident = ctx.identificacaoCurta;
  const corpo = `
<div class="pagina pagina--contactos">
  <header class="cabeca">
    <h1>Contactos</h1>
    <p>A forma mais rápida é o WhatsApp: mande uma fotografia, um desenho ou as medidas, e respondo com a proposta.</p>
  </header>
  <ul class="contactos">
    <li><a class="contacto contacto--wa" href="${whatsapp(site, 'Olá Alberto!')}" target="_blank" rel="noopener"><span class="contacto__icone">${I.wa}</span><span class="contacto__nome">WhatsApp</span><span class="contacto__valor">Enviar uma mensagem</span></a></li>
    <li><a class="contacto" href="tel:+351${site.telefone.replace(/\s/g, '')}"><span class="contacto__icone">${I.tel}</span><span class="contacto__nome">Telefone</span><span class="contacto__valor">${esc(site.telefone)} <span class="chamada">(Chamada para a rede móvel nacional)</span></span></a></li>
    <li><a class="contacto" href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener"><span class="contacto__icone">${I.ig}</span><span class="contacto__nome">Instagram</span><span class="contacto__valor">@${esc(site.instagram)}</span></a></li>
    <li>${site.email ? `<a class="contacto" href="mailto:${esc(site.email)}"><span class="contacto__icone">${I.email}</span><span class="contacto__nome">Email</span><span class="contacto__valor">${esc(site.email)}</span></a>` : `<div class="contacto"><span class="contacto__icone">${I.email}</span><span class="contacto__nome">Email</span><span class="contacto__valor">${ctx.porConfirmar('o email')}</span></div>`}</li>
    <li><div class="contacto"><span class="contacto__icone">${I.local}</span><span class="contacto__nome">Oficina</span><span class="contacto__valor">${esc(site.localidade)}</span></div></li>
  </ul>
  <p class="contactos__identificacao">${ident}</p>
</div>`;
  return { caminho: '/contactos/', seccao: 'contactos', corpo, classe: 'pagina-contactos', titulo: `Contactos | ${site.marca}, ${site.localidade}`, descricao: `Fale com o Alberto pelo WhatsApp, pelo telefone ${site.telefone} ou pelo Instagram @${site.instagram}. Peças em madeira por medida, em ${site.localidade}.`, jsonld: [jsonMigalhas(ctx, [['Contactos', '/contactos/']])] };
}

// ── Páginas de texto (perguntas frequentes e legais) ───────────────────────────────────────────────────
export function texto(ctx, nome, pag, { indexar = true } = {}) {
  const atualizado = pag.meta.atualizado ? `<p class="texto__data">Atualizado a ${ctx.dataLonga(pag.meta.atualizado)}</p>` : '';
  const corpo = `
<div class="pagina pagina--texto">
  <article class="leitura">
    <h1>${esc(pag.meta.titulo)}</h1>
    ${atualizado}
    <div class="texto">${markdown(ctx, pag.corpo)}</div>
  </article>
</div>`;
  return { caminho: `/${nome}/`, seccao: null, corpo, classe: 'pagina-texto', indexar, titulo: `${pag.meta.tituloSeo ?? pag.meta.titulo} | ${ctx.site.marca}`, descricao: pag.meta.descricao };
}

export function naoEncontrada(ctx) {
  const corpo = `
<div class="pagina pagina--404">
  <header class="cabeca cabeca--centro">
    <h1>Esta página não existe</h1>
    <p>Pode ter mudado de sítio. Veja os produtos ou fale comigo.</p>
    <div class="cabeca__botoes"><a class="botao botao--escuro" href="${href(ctx, '/produtos/')}">Ver produtos</a><a class="botao botao--suave" href="${whatsapp(ctx.site, 'Olá Alberto!')}" target="_blank" rel="noopener">${I.wa}<span>WhatsApp</span></a></div>
  </header>
</div>`;
  return { caminho: '/404.html', seccao: null, corpo, classe: 'pagina-404', indexar: false, titulo: `Página não encontrada | ${ctx.site.marca}`, descricao: 'Esta página não existe.' };
}
