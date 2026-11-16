# AL Art Craft — o site

Montra da **AL Art Craft** (Alberto Lopes, Fafe; Instagram @al.artcraft): peças em madeira por medida, quase sempre
com o logótipo do cliente, para restaurantes, catering, quintas de eventos e casas.

**Não há pagamentos no site.** Na ficha de cada produto escolhe-se a quantidade (e as escolhas, quando há) e escreve-se
as medidas ou a gravação; «Encomendar pelo WhatsApp» abre a conversa com o Alberto com a encomenda já escrita.

- **Desenho:** a proposta A «Bancada», escolhida pelo Renato a 16 nov 2026, e depois (no mesmo dia) a capa ao centro
  com um carrossel de 6 vídeos e o rodapé ao centro, a pedido dele, à maneira da BE!Creative (mas com as letras e as
  cores da AL: Playfair Display + DM Sans; areia #D4B093, traço #141313).
- **As peças recortadas:** quase todos os produtos têm como 1.ª fotografia um recorte (`media/fotos/<slug>-recorte.png`,
  a peça sem o fundo, feito com o Vision do Mac: `~/Websites/_ferramentas/recortar-motivo`), pousado no mesmo fundo
  de areia — as fotografias do Instagram tinham fundos de todas as cores. Sem recorte, a fotografia entra emoldurada
  no mesmo fundo.
- **Pré-visualização:** GitHub Pages (`.github/workflows/publicar.yml`), com noindex em todas as páginas.
- **Painel (backoffice):** `~/Websites/al-art-craft-painel`.

## Correr

```bash
python3 scripts/imagens.py     # as versões web das imagens e as miniaturas do painel (Pillow), para .cache/imagens
node scripts/build.mjs         # o site em _site/ (python3 -m http.server 8991 --directory _site)
node scripts/testar.mjs        # os testes (o CI corre-os antes de publicar)
node scripts/build.mjs --producao --url=https://<domínio>   # no domínio: pára se faltar um dado que a lei pede
```

## Onde está cada coisa

| | |
|---|---|
| `content/site.json` | marca, contactos, dados legais (por confirmar), encomendas (prazo, entrega, pagamento, IVA) |
| `content/categorias.json` | as 7 categorias (fixas): nome, frase, fotografia, ordem |
| `content/produtos/*.json` | um ficheiro por produto (o nome do ficheiro é o endereço `/produto/<nome>/`) |
| `content/trabalhos/*.json` | o portefólio: um ficheiro por trabalho (`/trabalhos/<nome>/`) |
| `content/inicio.json` | a capa (1 a 3 vídeos), «Como trabalho» e o convite |
| `content/paginas/*.md` | Sobre (com as duas fotografias na cabeça: `foto`, `fotoPequena`), perguntas frequentes e as páginas legais, com marcadores `{{…}}` |
| `content/fotos.json` | a descrição (alt) de cada fotografia e de onde veio |
| `media/fotos/`, `media/videos/` | as fotografias (até 2048 px) e os vídeos sem som (os reels têm música) |
| `media/marca/logo.png` | o logótipo do Alberto, só sem o fundo branco |
| `src/lib/regras.mjs` | as regras dos dados: as mesmas no gerador e no painel (cópia byte a byte) |
| `legal-comum/` | as peças legais comuns aos sites do Renato |
| `propostas/` | as três propostas da página inicial e as capturas (16 nov 2026) |

O material do Instagram (196 publicações, 27 destaques, legendas) está em `_cliente/`, fora do git.
