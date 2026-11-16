#!/usr/bin/env python3
"""As versões web das imagens do site.

Lê:
  media/fotos/*.jpg      as fotografias (cada uma tem de estar em content/fotos.json)
  media/videos/*.jpg     a imagem de capa de cada vídeo
  media/marca/logo.png   o logótipo do Alberto, com o fundo branco tirado (sem redesenhar)

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
VERSAO = f'v1-{LARGURAS}-{QUALIDADE}-{PARTILHA}'


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
        return {'w': W, 'h': H, 'resumo': h, 'larguras': larguras, 'formatos': list(FORMATOS), 'jpg': jw}
    im = ImageOps.exif_transpose(Image.open(origem)).convert('RGB')
    for w in larguras:
        r = im if w == W else im.resize((w, round(H * w / W)), Image.LANCZOS)
        for fmt in FORMATOS:
            guardar(r, os.path.join(CACHE, f'{nome}-{h}-{w}.{fmt}'), fmt)
    guardar(im if jw == W else im.resize((jw, round(H * jw / W)), Image.LANCZOS),
            os.path.join(CACHE, f'{nome}-{h}-{jw}.jpg'), 'jpg')
    # cartão de partilha 1200×630 (recorte ao centro)
    pw, ph = PARTILHA
    esc = max(pw / W, ph / H)
    r = im.resize((round(W * esc), round(H * esc)), Image.LANCZOS)
    x, y = (r.width - pw) // 2, (r.height - ph) // 2
    guardar(r.crop((x, y, x + pw, y + ph)), os.path.join(CACHE, f'{nome}-{h}-partilha.jpg'), 'jpg')
    return {'w': W, 'h': H, 'resumo': h, 'larguras': larguras, 'formatos': list(FORMATOS), 'jpg': jw}


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
    return out


def main():
    indice = json.load(open(INDICE))
    fotos = {os.path.splitext(os.path.basename(f))[0]: f for f in glob.glob(os.path.join(FOTOS, '*.jpg'))}
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
