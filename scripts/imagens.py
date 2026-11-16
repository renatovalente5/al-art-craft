#!/usr/bin/env python3
"""As versões web das imagens do site.

Lê:
  media/fotos/*.jpg      as fotografias (cada uma tem de estar em content/fotos.json)
  media/fotos/*.png      os recortes (a peça sem o fundo, com transparência): AVIF e WebP guardam o alfa; o JPEG
                         e o cartão de partilha pousam-na no fundo de areia do site
  media/videos/*.jpg     a imagem de capa de cada vídeo
  media/marca/logo.png   o logótipo do Alberto, com o fundo branco tirado (sem redesenhar); dele saem os ícones e o
                         cartão de partilha da marca (o que o WhatsApp mostra quando se partilha o site)

Escreve em .cache/imagens/ (fica entre publicações; o nome de cada ficheiro leva um resumo do original, por isso
só se refaz o que mudou) e o manifesto .cache/imagens/manifesto.json, que o scripts/build.mjs lê para escrever os
<picture> e copiar para _site/assets/img/ só o que as páginas usam.

    python3 scripts/imagens.py              # faz o que falta
    python3 scripts/imagens.py --verificar  # só confere que content/fotos.json e media/fotos batem certo
"""
import glob, hashlib, json, os, sys
from PIL import Image, ImageOps, features

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FOTOS = os.path.join(RAIZ, 'media', 'fotos')
VIDEOS = os.path.join(RAIZ, 'media', 'videos')
MARCA = os.path.join(RAIZ, 'media', 'marca')
INDICE = os.path.join(RAIZ, 'content', 'fotos.json')
CACHE = os.path.join(RAIZ, '.cache', 'imagens')

LARGURAS = [360, 540, 720, 960, 1280, 1600]
FORMATOS = ('avif', 'webp') if features.check('avif') else ('webp',)
QUALIDADE = {'avif': 52, 'webp': 78}
PARTILHA = (1200, 630)
AREIA = (243, 236, 227)          # --areia-clara do site: o fundo dos cartões, onde pousam os recortes
FUNDO = (251, 249, 246)          # --fundo do site: o fundo do cartão de partilha da marca
VERSAO = f'v1-{LARGURAS}-{QUALIDADE}-{PARTILHA}'   # as fotografias não mudaram de tratamento: o mesmo resumo


def resumo(caminho, extra=''):
    h = hashlib.sha256((VERSAO + extra).encode())
    with open(caminho, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:10]


def guardar(im, destino, formato):
    if os.path.exists(destino):
        return
    tmp = destino + '.tmp'
    if formato == 'avif':
        im.save(tmp, 'AVIF', quality=QUALIDADE['avif'], speed=6)
    elif formato == 'webp':
        im.save(tmp, 'WEBP', quality=QUALIDADE['webp'], method=6)
    elif formato == 'png':
        im.save(tmp, 'PNG', optimize=True)
    else:
        im.save(tmp, 'JPEG', quality=82, optimize=True, progressive=True)
    os.replace(tmp, destino)


def versoes(nome, origem):
    """AVIF + WebP nas larguras que a imagem aguenta (nunca se aumenta), um JPEG para partilhas e o painel."""
    h = resumo(origem)
    with Image.open(origem) as cab:
        W, H = cab.size
        if (cab.getexif() or {}).get(0x0112, 1) in (5, 6, 7, 8):
            W, H = H, W
    larguras = sorted(set([w for w in LARGURAS if w < W] + [min(W, LARGURAS[-1])]))
    jw = min(W, 960)
    feito = [os.path.join(CACHE, f'{nome}-{h}-{w}.{fmt}') for w in larguras for fmt in FORMATOS]
    feito += [os.path.join(CACHE, f'{nome}-{h}-{jw}.jpg'), os.path.join(CACHE, f'{nome}-{h}-partilha.jpg')]
    if all(os.path.exists(f) for f in feito):
        return {'w': W, 'h': H, 'resumo': h, 'larguras': larguras, 'formatos': list(FORMATOS), 'jpg': jw, 'alfa': origem.endswith('.png')}
    im = ImageOps.exif_transpose(Image.open(origem))
    alfa = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if alfa else 'RGB')
    def pousado(i):
        if not alfa: return i
        f = Image.new('RGB', i.size, AREIA); f.paste(i, (0, 0), i); return f
    for w in larguras:
        r = im if w == W else im.resize((w, round(H * w / W)), Image.LANCZOS)
        for fmt in FORMATOS:
            guardar(r, os.path.join(CACHE, f'{nome}-{h}-{w}.{fmt}'), fmt)
    guardar(pousado(im if jw == W else im.resize((jw, round(H * jw / W)), Image.LANCZOS)),
            os.path.join(CACHE, f'{nome}-{h}-{jw}.jpg'), 'jpg')
    pw, ph = PARTILHA
    if alfa:
        # o recorte inteiro, ao centro de um cartão de areia (cortar ao centro cortava a peça)
        caixa = im.getchannel('A').getbbox() or (0, 0, W, H)
        peca = im.crop(caixa)
        esc = min(pw * 0.8 / peca.width, ph * 0.82 / peca.height)
        peca = peca.resize((round(peca.width * esc), round(peca.height * esc)), Image.LANCZOS)
        cartao = Image.new('RGB', PARTILHA, AREIA)
        cartao.paste(peca, ((pw - peca.width) // 2, (ph - peca.height) // 2), peca)
        guardar(cartao, os.path.join(CACHE, f'{nome}-{h}-partilha.jpg'), 'jpg')
    else:
        # cartão de partilha 1200×630 (recorte ao centro)
        esc = max(pw / W, ph / H)
        r = im.resize((round(W * esc), round(H * esc)), Image.LANCZOS)
        x, y = (r.width - pw) // 2, (r.height - ph) // 2
        guardar(r.crop((x, y, x + pw, y + ph)), os.path.join(CACHE, f'{nome}-{h}-partilha.jpg'), 'jpg')
    return {'w': W, 'h': H, 'resumo': h, 'larguras': larguras, 'formatos': list(FORMATOS), 'jpg': jw, 'alfa': alfa}


def logotipo():
    """O logótipo em PNG e WebP a 1×, 2× e 3× das alturas em que aparece (sem mexer no desenho)."""
    origem = os.path.join(MARCA, 'logo.png')
    im = Image.open(origem).convert('RGBA')
    h = resumo(origem)
    out = {'w': im.width, 'h': im.height, 'resumo': h, 'alturas': []}
    for alt in (64, 96, 128, 192, 288):
        if alt > im.height:
            continue
        w = round(im.width * alt / im.height)
        r = im.resize((w, alt), Image.LANCZOS)
        guardar(r, os.path.join(CACHE, f'logo-{h}-{alt}.png'), 'png')
        guardar(r, os.path.join(CACHE, f'logo-{h}-{alt}.webp'), 'webp')
        out['alturas'].append(alt)
    # ícones: o desenho inteiro num quadrado branco (o fundo do logótipo é branco)
    for lado in (32, 180, 192, 512):
        q = Image.new('RGBA', (lado, lado), (255, 255, 255, 255))
        m = round(lado * 0.06)
        r = im.copy()
        r.thumbnail((lado - 2 * m, lado - 2 * m), Image.LANCZOS)
        q.alpha_composite(r, ((lado - r.width) // 2, (lado - r.height) // 2))
        guardar(q.convert('RGB'), os.path.join(CACHE, f'icone-{h}-{lado}.png'), 'png')
    out['icones'] = [32, 180, 192, 512]
    # o cartão de partilha da marca (og:image do início e das páginas sem fotografia própria): o logótipo inteiro, ao
    # centro, no fundo do site, ao tamanho dele (nunca aumentado: ficava desfocado). JPEG sem subamostragem da cor,
    # para o traço fino do artesão e o areia das letras não borrarem.
    hc = resumo(origem, extra=f'cartao-{FUNDO}-{PARTILHA}')
    out['partilha'] = f'al-art-craft-{hc}-partilha.jpg'
    destino = os.path.join(CACHE, out['partilha'])
    if not os.path.exists(destino):
        desenho = im.crop(im.getchannel('A').getbbox())
        desenho.thumbnail((round(PARTILHA[0] * 0.8), round(PARTILHA[1] * 0.7)), Image.LANCZOS)
        cartao = Image.new('RGBA', PARTILHA, FUNDO + (255,))
        cartao.alpha_composite(desenho, ((PARTILHA[0] - desenho.width) // 2, (PARTILHA[1] - desenho.height) // 2))
        tmp = destino + '.tmp'
        cartao.convert('RGB').save(tmp, 'JPEG', quality=92, subsampling=0, optimize=True, progressive=True)
        os.replace(tmp, destino)
    return out


def main():
    indice = json.load(open(INDICE))
    fotos = {}
    for f in sorted(glob.glob(os.path.join(FOTOS, '*.jpg')) + glob.glob(os.path.join(FOTOS, '*.png'))):
        nome = os.path.splitext(os.path.basename(f))[0]
        if nome in fotos:
            print(f'Duas fotografias com o mesmo nome: {nome} (.jpg e .png)'); sys.exit(1)
        fotos[nome] = f
    sem_indice = sorted(set(fotos) - set(indice))
    sem_ficheiro = sorted(set(indice) - set(fotos))
    if sem_indice or sem_ficheiro:
        if sem_indice:
            print('Fotografias sem entrada em content/fotos.json:', ', '.join(sem_indice))
        if sem_ficheiro:
            print('Entradas de content/fotos.json sem fotografia:', ', '.join(sem_ficheiro))
        sys.exit(1)
    if '--verificar' in sys.argv:
        print(f'{len(fotos)} fotografias, todas com descrição.')
        return
    os.makedirs(CACHE, exist_ok=True)
    manifesto = {'fotos': {}, 'videos': {}, 'logo': None}
    for i, (nome, f) in enumerate(sorted(fotos.items()), 1):
        manifesto['fotos'][nome] = versoes(nome, f)
        if i % 25 == 0:
            print(f'  {i}/{len(fotos)}', flush=True)
    for f in sorted(glob.glob(os.path.join(VIDEOS, '*.jpg'))):
        nome = os.path.splitext(os.path.basename(f))[0]
        manifesto['videos'][nome] = versoes('video-' + nome, f)
    manifesto['logo'] = logotipo()
    with open(os.path.join(CACHE, 'manifesto.json'), 'w') as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=1)
    print(f"{len(manifesto['fotos'])} fotografias, {len(manifesto['videos'])} capas de vídeo, logótipo.")


if __name__ == '__main__':
    main()
