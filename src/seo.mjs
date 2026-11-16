// Títulos e descrições para o Google (≤ 60 e ≤ 160 caracteres, mais ou menos). As categorias levam um título que
// diz o que se procura («Tábuas de servir personalizadas…»), não só o nome do separador.
const CATEGORIAS = {
  'tabuas-de-servir': 'Tábuas de servir personalizadas, por medida',
  'ferro-fundido': 'Tábuas com ferro fundido para servir quente',
  'pratos-e-bases': 'Pratos e bases de madeira personalizados',
  'mesa-e-sala': 'Porta-menus, porta-contas e cubos de mesa',
  caixas: 'Caixas de madeira personalizadas',
  'placas-e-letreiros': 'Placas de madeira gravadas e letreiros néon',
  'catering-e-eventos': 'Bancadas e carrinhos de catering em madeira',
};

const corta = (s, max) => ([...s].length <= max ? s : `${[...s].slice(0, max - 1).join('').replace(/[\s,;.:—-]+\S*$/, '')}…`);

export function tituloCategoria(cat, site) {
  return `${CATEGORIAS[cat.slug] ?? cat.nome} | ${site.marca}`;
}
export function descricaoCategoria(cat, site) {
  return corta(`${cat.frase} Por medida e com o seu logótipo, feitos em ${site.localidade}. Encomende pelo WhatsApp.`, 160);
}
export function tituloProduto(p, cat, site) {
  const base = p.nome.length < 34 ? `${p.nome} personalizada` : p.nome;
  // «personalizada» só quando o nome é feminino e curto; nos outros fica o nome e a categoria
  const nome = /^(Tábua|Placa|Caixa|Base|Prancha|Lembrança)/.test(p.nome) && p.nome.length < 34 ? base : p.nome;
  return `${corta(nome, 52)} | ${site.marca}`;
}
export function descricaoProduto(p, site) {
  return corta(`${p.resumo} ${p.desde ? 'Desde' : 'Por'} ${String(p.preco).replace('.', ',')} €. Feita por medida em ${site.localidade}; encomende pelo WhatsApp.`, 160);
}
