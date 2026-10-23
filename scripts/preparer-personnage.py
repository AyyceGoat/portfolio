"""
Prépare les calques du personnage de l'atelier à partir de l'illustration
détourée sources/personnage.webp (1024 × 1536, fond transparent).

    python3 scripts/preparer-personnage.py

Produit, dans public/atelier/ :
  - haut.webp          le buste, au-dessus du plateau (respire, tourne la tête)
  - haut-eclaire.webp  le même, éclairé par l'écran (fondu d'opacité)
  - bas.webp           jambes et fauteuil, sous le plateau (immobile)

Le plateau en bois et les pieds métalliques d'origine sont retirés : le
bureau noir mat est dessiné en SVG entre les deux calques, à la même
échelle. Un liseré bleu (contre-jour de l'horizon) est cuit dans les
images, ce qui évite tout filtre CSS au moment de l'affichage.

Les coordonnées citées ici sont celles de l'image source ; la feuille de
style (.perso) reprend les mêmes, en pourcentages.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / 'sources' / 'personnage.webp'
SORTIE = RACINE / 'public' / 'atelier'
ECHELLE = 0.8  # 1024 → 819 px de large : net jusqu'à 2x sur l'écran
COUPE = 712  # bas du plateau d'origine : frontière haut / bas
PLATEAU = (655, 714)  # bande du plateau en bois

im = Image.open(SOURCE).convert('RGBA')
a = np.asarray(im).astype(np.float32) / 255.0
h, w = a.shape[:2]
rgb, al = a[..., :3], a[..., 3]
ys, xs = np.mgrid[0:h, 0:w]

# 1. Nettoyage des bords : pas de voile résiduel, pas de frange claire.
al = np.where(al < 0.03, 0.0, al)
lum = rgb.mean(-1)
frange = (al < 0.9) & (lum > 0.55)
al = np.where(frange, al * 0.35, al)

# 2. Plateau en bois : les pixels bruns de la bande disparaissent, sauf la
#    main posée sur l'ordinateur (peau brune elle aussi).
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
brun = (r > g) & (g >= b * 0.9) & ((r - b) > 0.08)
main = (xs > 500) & (xs < 672) & (ys < 678)
bois = (brun & (ys >= PLATEAU[0]) & (ys <= PLATEAU[1]) & ~main) | ((ys >= 680) & (ys <= PLATEAU[1]))
al = np.where(bois, 0.0, al)
# Ceinture du bureau (sous le plateau) et pieds métalliques d'origine.
ceinture = (ys > PLATEAU[1]) & (ys < 752) & (xs > 20) & (xs < 1000)
pieds = (ys > 640) & ((xs < 200) | (xs > 862))
al = np.where(ceinture | pieds, 0.0, al)


def assombrir(c):
    """Étalonnage d'ambiance : plus froid, un peu plus sombre."""
    c = c * np.array([0.86, 0.9, 1.0], dtype=np.float32)
    return c * 0.92 + np.array([0.0, 0.006, 0.02], dtype=np.float32)


base = assombrir(rgb)


def tache(cx, cy, rx, ry):
    return np.exp(-(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2))


# 3. Lumière froide de l'écran : visage, cou, plastron, mains.
lumiere = (
    tache(505, 262, 105, 95) * 0.62
    + tache(565, 628, 80, 45) * 0.45
    + tache(520, 430, 170, 140) * 0.22
    + tache(340, 560, 160, 110) * 0.18
)
couleur = np.array([0.42, 0.62, 1.0], dtype=np.float32)
eclaire = 1.0 - (1.0 - base) * (1.0 - np.clip(lumiere, 0, 1)[..., None] * couleur * 0.85)
base_lum = 1.0 - (1.0 - base) * (1.0 - np.clip(lumiere, 0, 1)[..., None] * couleur * 0.28)

# 4. Liseré : un bord intérieur clair et un halo extérieur, cuits dans
#    l'image (le contre-jour vient de l'horizon, derrière le personnage).
masque = Image.fromarray((al * 255).astype(np.uint8))
erode = np.asarray(masque.filter(ImageFilter.MinFilter(5))).astype(np.float32) / 255.0
bord = np.clip(al - erode, 0, 1)
haut_du_corps = np.clip(1.2 - ys / 1100.0, 0.25, 1.0)
lisere = bord * haut_du_corps * 0.55
halo = np.asarray(masque.filter(ImageFilter.GaussianBlur(9))).astype(np.float32) / 255.0
halo = np.clip(halo - al, 0, 1) * 0.55 * haut_du_corps
teinte_lisere = np.array([0.72, 0.84, 1.0], dtype=np.float32)
teinte_halo = np.array([0.36, 0.58, 1.0], dtype=np.float32)


def composer(c):
    c = c * (1 - lisere[..., None]) + teinte_lisere * lisere[..., None]
    # Halo sous la figure : composition « par-dessous » en alpha prémultiplié.
    a_tot = al + halo * (1 - al)
    c_tot = (c * al[..., None] + teinte_halo * (halo * (1 - al))[..., None]) / np.maximum(a_tot, 1e-4)[..., None]
    return np.dstack([np.clip(c_tot, 0, 1), a_tot])


def exporter(arr, y0, y1, nom):
    img = Image.fromarray((arr[y0:y1] * 255).round().astype(np.uint8), 'RGBA')
    img = img.resize((round(w * ECHELLE), round((y1 - y0) * ECHELLE)), Image.LANCZOS)
    img.save(SORTIE / nom, 'WEBP', quality=84, method=6, alpha_quality=90)
    print(nom, img.size, (SORTIE / nom).stat().st_size // 1024, 'Ko')


SORTIE.mkdir(parents=True, exist_ok=True)
calque = composer(base_lum)
calque_eclaire = composer(eclaire)
exporter(calque, 0, COUPE, 'haut.webp')
exporter(calque_eclaire, 0, COUPE, 'haut-eclaire.webp')
exporter(calque, COUPE, h, 'bas.webp')
