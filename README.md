# AL Art Craft — o site

Montra da **AL Art Craft** (Alberto Lopes, Fafe; Instagram @al.artcraft): peças em madeira por medida, quase sempre
com o logótipo do cliente, para restaurantes, catering, quintas de eventos e casas.

**Não há pagamentos no site.** Na ficha de cada produto escolhe-se a quantidade (e as escolhas, quando há) e escreve-se
as medidas ou a gravação; «Encomendar pelo WhatsApp» abre a conversa com o Alberto com a encomenda já escrita.

- **Desenho:** a proposta A «Bancada», escolhida pelo Renato a 16 nov 2026 (capa com três vídeos lado a lado no
  computador e um no telemóvel; categorias com o nome por baixo). Letras Playfair Display + DM Sans; cores do
  logótipo (areia #D4B093, traço #141313).
- **Pré-visualização:** GitHub Pages (`.github/workflows/publicar.yml`), com noindex em todas as páginas.
- **Painel (backoffice):** `~/Websites/al-art-craft-painel`.

## Correr

```bash
python3 scripts/imagens.py     # as versões web das imagens (Pillow), para .cache/imagens
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
| `content/paginas/*.md` | Sobre, perguntas frequentes e as páginas legais, com marcadores `{{…}}` |
| `content/fotos.json` | a descrição (alt) de cada fotografia e de onde veio |
| `media/fotos/`, `media/videos/` | as fotografias (até 2048 px) e os vídeos sem som (os reels têm música) |
| `media/marca/logo.png` | o logótipo do Alberto, só sem o fundo branco |
| `src/lib/regras.mjs` | as regras dos dados: as mesmas no gerador e no painel (cópia byte a byte) |
| `legal-comum/` | as peças legais comuns aos sites do Renato |
| `propostas/` | as três propostas da página inicial e as capturas (16 nov 2026) |

O material do Instagram (196 publicações, 27 destaques, legendas) está em `_cliente/`, fora do git.
