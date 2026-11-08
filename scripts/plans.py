"""
Découpe l'image de référence agrandie par IA (sources/reference-x4.webp,
5504 × 3072, produite par scripts/agrandir.py) en plans :
  - public/espace/ciel-4096.webp et ciel-2048.webp : nébuleuses et étoiles,
    sans planète, sans astéroïdes, sans passerelle ni astronaute ;
  - public/espace/planete-2048.webp et planete-1024.webp : la planète
    détourée, avec son atmosphère (la passerelle qui passait devant est
    effacée) ;
  - public/espace/asteroides.webp : un atlas (2048 × 512) des astéroïdes.

    python3 scripts/asteroides.py sources/reference.webp sources/masques
    python3 scripts/plans.py sources/reference-x4.webp sources/masques public/espace

Les relevés (planète, passerelle, astronaute) sont faits dans le repère
de sources/reference.webp (1280 × 720) ; l'image agrandie y est recalée
puis traitée à 4,3 fois cette taille. Toutes les textures ont des côtés en
puissances de deux (mipmaps) et ne sont jamais agrandies au-delà de leur
source. Les rectangles de l'atlas, imprimés à la fin, sont repris dans
src/scene/monde.js (ATLAS).

Nécessite opencv-python-headless et numpy.
"""
import json
import sys

import cv2
import numpy as np

source, dos, sortie = sys.argv[1], sys.argv[2], sys.argv[3]
S = 4.3  # échelle de travail par rapport au repère 1280 × 720
W, H = int(1280 * S), int(720 * S)

# Recalage : repère 1280 × 720 → image agrandie (mesuré par appariement de
# points entre les deux versions de la référence).
A = np.float64([[4.29951, 0.00003, 0.435], [0.00112, 4.30092, -13.5]])
M = A.copy()
M[:, :2] /= S
ref = cv2.warpAffine(cv2.imread(source), M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)


def p(*v):
    return tuple(int(round(x * S)) for x in v)


def pts(liste):
    return np.array([p(x, y) for x, y in liste], np.int32)


def combler(img, masque, rayon=7, r=4):
    """Inpainting fait à 1/r de la taille (les comblements sont lisses),
    recollé dans le masque seulement."""
    h, w = masque.shape
    petit = cv2.resize(img, (w // r, h // r), interpolation=cv2.INTER_AREA)
    pm = (cv2.resize(masque, (w // r, h // r), interpolation=cv2.INTER_AREA) > 0).astype(np.uint8) * 255
    rempli = cv2.resize(cv2.inpaint(petit, pm, rayon, cv2.INPAINT_TELEA), (w, h), interpolation=cv2.INTER_CUBIC)
    f = cv2.GaussianBlur(masque.astype(np.float32) / 255, (0, 0), 2 * r)[..., None]
    f = np.maximum(f, (masque > 0)[..., None])
    return (img * (1 - f) + rempli * f).astype(np.uint8)


def grain(img, masque, decalage, propre):
    """Reporte dans le masque le détail fin (étoiles, grain) d'une zone
    voisine propre (hors de tout ce qui a été effacé) : un comblement lisse
    ne se remarque plus."""
    detail = img.astype(np.float32) - cv2.GaussianBlur(img, (0, 0), 4 * S).astype(np.float32)
    d1, v1 = np.roll(detail, decalage, axis=1), np.roll(propre, decalage, axis=1)
    d2, v2 = np.roll(detail, -decalage, axis=1), np.roll(propre, -decalage, axis=1)
    report = np.where(v1[..., None], d1, d2 * v2[..., None])
    f = cv2.GaussianBlur(masque.astype(np.float32) / 255, (0, 0), 3 * S)[..., None]
    return np.clip(img + report * f, 0, 255).astype(np.uint8)


def masque_hd(nom):
    m = cv2.imread(f'{dos}/{nom}', 0)
    m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)
    return (cv2.GaussianBlur(m, (0, 0), S * 0.6) > 127).astype(np.uint8) * 255


ast = masque_hd('masque-asteroides.png')

# ---------- planète ----------
PX, PY, RX, RY = 1013 * S, 268 * S, 183 * S, 177.5 * S
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rho = np.sqrt(((xx - PX) / RX) ** 2 + ((yy - PY) / RY) ** 2)
pont = np.zeros((H, W), np.uint8)
cv2.fillPoly(pont, [pts([(780, 292), (860, 296), (930, 318), (988, 342), (998, 362), (985, 388), (935, 410), (862, 434), (800, 452), (760, 452), (760, 292)])], 255)
cv2.circle(pont, p(852, 305), int(26 * S), 255, -1)
disque = (rho < 1.12).astype(np.uint8) * 255
a_reparer = cv2.dilate(pont & disque, np.ones((int(9 * S),) * 2, np.uint8))
# La passerelle passe devant la planète, en bas à gauche : on y reporte la
# même planète tournée autour de son centre (océan et nuages du limbe
# gauche), ce qui garde l'assombrissement du bord.
tour = cv2.getRotationMatrix2D((PX, PY), 62, 1.0)
tournee = cv2.warpAffine(ref, tour, (W, H), flags=cv2.INTER_CUBIC)
fr = cv2.GaussianBlur(a_reparer.astype(np.float32) / 255, (0, 0), 5 * S)[..., None]
planete = (ref * (1 - fr) + tournee * fr).astype(np.uint8)
alpha_p = np.clip((1.09 - rho) / 0.09, 0, 1)
alpha_p = alpha_p * alpha_p * (3 - 2 * alpha_p)
x0, y0, x1, y1 = p(1013 - 210, 268 - 205, 1013 + 210, 268 + 205)
crop = planete[y0:min(y1, H), x0:min(x1, W)]
ca = (alpha_p[y0:min(y1, H), x0:min(x1, W)] * 255).astype(np.uint8)
rgba = np.dstack([crop, ca])
# complète à droite (la planète touche presque le bord) par du transparent
plein = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
plein[: rgba.shape[0], : rgba.shape[1]] = rgba
for cote in (2048, 1024):
    img = cv2.resize(plein, (cote, cote), interpolation=cv2.INTER_AREA if cote < plein.shape[1] else cv2.INTER_LANCZOS4)
    cv2.imwrite(f'{sortie}/planete-{cote}.webp', img, [cv2.IMWRITE_WEBP_QUALITY, 90])
info = {'planete': {'boite': [x0 / W, y0 / H, x1 / W, y1 / H], 'taille': [x1 - x0, y1 - y0]}}

# ---------- ciel vide ----------
masque = cv2.dilate(ast, np.ones((int(7 * S),) * 2, np.uint8))
# chaque astéroïde, aussi dans une ellipse un peu plus large que lui (leurs
# bords éclairés échappent au seuil des masques)
ellipses = [((62, 360), (60, 52)), ((1213, 500), (78, 70)), ((309, 434), (28, 23)), ((402, 399), (18, 17)), ((163, 465), (27, 26)), ((733, 376), (14, 14)), ((1217, 405), (23, 20)), ((1026, 473), (20, 18)), ((1110, 458), (13, 12))]
for c, ax in ellipses:
    cv2.ellipse(masque, p(*c), p(*ax), 0, 0, 360, 255, -1)
cv2.circle(masque, p(852, 305), int(30 * S), 255, -1)
cv2.line(masque, p(740, 299), p(860, 308), 255, int(16 * S))
cv2.ellipse(masque, p(727, 368), p(22, 16), 0, 0, 360, 255, -1)
cv2.ellipse(masque, p(1128, 442), p(28, 9), 0, 0, 360, 255, -1)
for r in [(15, 420, 75, 450), (100, 455, 135, 482), (252, 428, 292, 452), (1088, 444, 1152, 476)]:
    cv2.rectangle(masque, p(*r[:2]), p(*r[2:]), 255, -1)
# Les débris : de petites roches sombres semées autour des astéroïdes, au
# ras de la passerelle. Repérés à l'échelle 1280 × 720 dans deux bandes.
petit = cv2.resize(ref, (1280, 720), interpolation=cv2.INTER_AREA)
V = cv2.cvtColor(petit, cv2.COLOR_BGR2HSV)[..., 2].astype(np.float32)
sombre = ((V < cv2.GaussianBlur(V, (0, 0), 6) * 0.6) & (V < 80)).astype(np.uint8)
bandes = np.zeros((720, 1280), np.uint8)
cv2.fillPoly(bandes, [np.array([(0, 405), (330, 405), (330, 455), (140, 490), (0, 500)], np.int32), np.array([(1000, 430), (1200, 430), (1280, 470), (1280, 560), (1150, 548), (1000, 510)], np.int32)], 1)
n, lab, st, _ = cv2.connectedComponentsWithStats(sombre & bandes)
debris = np.isin(lab, [k for k in range(1, n) if 2 <= st[k, cv2.CC_STAT_AREA] <= 150]).astype(np.uint8) * 255
debris = cv2.dilate(debris, np.ones((5, 5), np.uint8))
masque |= cv2.resize(debris, (W, H), interpolation=cv2.INTER_NEAREST)
# ce qui reste propre : la source du grain
propre = cv2.dilate(masque, np.ones((int(6 * S),) * 2, np.uint8)) == 0
propre &= rho > 1.3
# ni la passerelle (le bas de l'image, remplacé plus loin), ni l'astronaute
exclu = np.zeros((H, W), np.uint8)
cv2.fillPoly(exclu, [pts([(0, 440), (240, 414), (470, 386), (640, 360), (760, 300), (1000, 300), (1040, 400), (1100, 430), (1280, 505), (1280, 720), (0, 720)])], 255)
cv2.ellipse(exclu, p(582, 372), p(90, 110), 0, 0, 360, 255, -1)
propre &= exclu == 0
ciel = combler(ref, masque, 7)
ciel = grain(ciel, masque, int(140 * S), propre)
# Le disque de la planète : comblé d'une teinte douce (il reste toujours
# sous la planète, seul son pourtour transparaît).
disque_p = ((rho < 1.14) * 255).astype(np.uint8)
comble = combler(ciel, disque_p, 5, 8)
comble = cv2.GaussianBlur(comble, (0, 0), 30 * S)
fd = cv2.GaussianBlur(disque_p.astype(np.float32) / 255, (0, 0), 6 * S)[..., None]
ciel = (ciel * (1 - fd) + comble * fd).astype(np.uint8)
# Le haut de l'astronaute, au-dessus de la passerelle : comblé, puis
# parsemé des étoiles d'une zone voisine.
corps = np.zeros((H, W), np.uint8)
cv2.ellipse(corps, p(582, 372), p(66, 82), 0, 0, 360, 255, -1)
lisse_c = cv2.GaussianBlur(combler(ciel, corps, 9), (0, 0), 6 * S)
fc = cv2.GaussianBlur(corps.astype(np.float32) / 255, (0, 0), 6 * S)[..., None]
ciel = (ciel * (1 - fc) + lisse_c * fc).astype(np.uint8)
ciel = grain(ciel, corps, int(170 * S), propre & (corps == 0))

# Le bas (sous la passerelle) : le ciel du haut, tourné d'un demi-tour,
# plus sombre (on regarde sous la passerelle, loin de la lumière).
bas = np.zeros((H, W), np.uint8)
cv2.fillPoly(bas, [pts([(0, 478), (240, 452), (470, 424), (640, 398), (760, 372), (850, 350), (995, 348), (1002, 420), (1100, 470), (1280, 545), (1280, 720), (0, 720)])], 255)
haut = ciel[0 : int(300 * S)]
g = cv2.resize(cv2.rotate(haut[:, 0 : int(560 * S)], cv2.ROTATE_180), p(880, 440), interpolation=cv2.INTER_AREA)
d = cv2.resize(cv2.rotate(haut[:, int(240 * S) : int(820 * S)], cv2.ROTATE_180), p(580, 440), interpolation=cv2.INTER_AREA)
zone = np.zeros((g.shape[0], W, 3), np.float32)
zone[:, : g.shape[1]] = g
zone_d = np.zeros_like(zone)
zone_d[:, W - d.shape[1] :] = d
rampe = np.clip((np.arange(W) / S - 700) / 180, 0, 1)[None, :, None]
zone = zone * (1 - rampe) + zone_d * rampe
rempli = ciel.copy().astype(np.float32)
rempli[H - zone.shape[0] :] = zone * 0.72
fondu = cv2.GaussianBlur(bas.astype(np.float32) / 255, (0, 0), 12 * S)[..., None]
ciel = (ciel * (1 - fondu) + rempli * fondu).astype(np.uint8)

# Le ciel est enregistré sans canal alpha : le moteur repère lui-même les
# étoiles (ce qui dépasse nettement son voisinage) pour les faire scintiller.
for l, h in [(4096, 2048), (2048, 1024)]:
    img = cv2.resize(ciel, (l, h), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{sortie}/ciel-{l}.webp', img, [cv2.IMWRITE_WEBP_QUALITY, 88])

# ---------- astéroïdes : un atlas ----------
# Chaque roche est détourée à pleine définition par GrabCut, amorcé par
# l'ellipse relevée sur l'image (scripts/asteroides.py) : sûrement de la
# roche au cœur, sûrement du ciel au-delà d'une marge. a2 touche le bord
# de l'image : il est écarté.
roches = {'a1': ((62, 360), (48, 41)), 'a3': ((309, 434), (22, 17)), 'a7': ((1217, 405), (17, 14)), 'a8': ((1026, 473), (14, 12)), 'a4': ((402, 399), (13, 12)), 'a6': ((733, 376), (9, 9))}
morceaux = []
for nom, (centre, axes) in roches.items():
    cx, cy = p(*centre)
    ax, ay = p(*axes)
    bx0, by0 = max(0, int(cx - ax * 1.5)), max(0, int(cy - ay * 1.5))
    bx1, by1 = min(W, int(cx + ax * 1.5)), min(H, int(cy + ay * 1.5))
    bloc = ref[by0:by1, bx0:bx1].copy()
    h, w = bloc.shape[:2]
    gc = np.full((h, w), cv2.GC_BGD, np.uint8)
    c0 = (cx - bx0, cy - by0)
    cv2.ellipse(gc, c0, (int(ax * 1.3), int(ay * 1.3)), 0, 0, 360, cv2.GC_PR_BGD, -1)
    cv2.ellipse(gc, c0, (int(ax * 0.95), int(ay * 0.95)), 0, 0, 360, cv2.GC_PR_FGD, -1)
    cv2.ellipse(gc, c0, (int(ax * 0.45), int(ay * 0.45)), 0, 0, 360, cv2.GC_FGD, -1)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bloc, gc, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    noyau = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, int(1.5 * S)),) * 2)
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_OPEN, noyau), cv2.MORPH_CLOSE, noyau)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    ff = m.copy()
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255)
    m |= cv2.bitwise_not(ff)
    # Bord légèrement resserré et adouci ; sous le bord, les couleurs de
    # la roche prolongées : rien du ciel ne reste autour.
    serre = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=max(1, int(0.6 * S)))
    alpha = cv2.GaussianBlur(serre, (0, 0), 0.7 * S)
    coeur = cv2.erode(serre, np.ones((3, 3), np.uint8), iterations=max(1, int(0.8 * S)))
    couleur = cv2.inpaint(bloc, cv2.bitwise_not(coeur), 3, cv2.INPAINT_TELEA)
    ys, xs = np.nonzero(alpha > 4)
    marge = int(2 * S)
    y0, y1 = max(0, ys.min() - marge), min(h, ys.max() + marge)
    x0, x1 = max(0, xs.min() - marge), min(w, xs.max() + marge)
    morceaux.append((nom, np.dstack([couleur, alpha])[y0:y1, x0:x1]))
LA, HA = 2048, 512
largeur = sum(m.shape[1] + 8 for _, m in morceaux)
hauteur = max(m.shape[0] for _, m in morceaux)
k = min(1.0, (LA - 8 * len(morceaux)) / (largeur - 8 * len(morceaux)), HA / hauteur)
atlas = np.zeros((HA, LA, 4), np.uint8)
x = 0
rects = []
for nom, m in morceaux:
    if k < 1:
        m = cv2.resize(m, (int(m.shape[1] * k), int(m.shape[0] * k)), interpolation=cv2.INTER_AREA)
    atlas[: m.shape[0], x : x + m.shape[1]] = m
    rects.append([round(x / LA, 5), 0, round(m.shape[1] / LA, 5), round(m.shape[0] / HA, 5)])
    x += m.shape[1] + 8
cv2.imwrite(f'{sortie}/asteroides.webp', atlas, [cv2.IMWRITE_WEBP_QUALITY, 90])
info['asteroides'] = rects
info['echelle_atlas'] = k
print(json.dumps(info))
