"""
Prépare la marche de l'astronaute à partir de la vidéo
(sources/videos/astronaute-b.mp4 : vu de dos, sur la passerelle).

    python3 scripts/marche.py VIDEO TRAVAIL public/espace/marche \\
        --poids RealESRGAN_x4plus.pth --detourage BiRefNet-general-epoch_244.onnx

  1. Le cycle : 36 images (1,5 s), de l'image 65 à la 100, relevées par
     auto-similarité des jambes : la 101 retrouve la 65, la boucle ne
     saute pas. L'image 65 et l'image 83 (un demi-cycle plus loin) sont
     les deux appuis où l'astronaute s'arrête entre deux étapes.
  2. Agrandissement ×4 (Real-ESRGAN, scripts/agrandir.py) d'un cadre de
     208 × 368 px autour de l'astronaute (la caméra le suit : il bouge à
     peine dans l'image).
  3. Détourage par BiRefNet (modèle de rembg, onnxruntime), sur l'image
     agrandie.
  4. Le reflet de la vidéo, sous les semelles, est retiré : sous chaque
     pied, la ligne du sol est l'axe de symétrie entre le pied et son
     reflet, cherchée image par image puis lissée.
  5. Couleurs du bord « démêlées » du décor d'origine, étalonnage accordé
     à la scène ; un cadre commun à toutes les images.
  6. Sortie : public/espace/marche/l/NN.webp (figure d'environ 900 px) et
     s/NN.webp (moitié), et src/scene/marche.js (dimensions, durée du
     cycle, avance du sol image par image).
  7. La longueur des pas : la ligne où le pied d'appui touche son reflet,
     suivie image par image ; le décor avance exactement comme elle.

Les étapes 2 et 3 sont longues (une demi-minute par image chacune, sur
processeur) ; leurs résultats sont gardés dans TRAVAIL et réutilisés.
Nécessite numpy, opencv-python-headless, onnx, onnxruntime et pillow.
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('video')
ap.add_argument('travail')
ap.add_argument('sortie')
ap.add_argument('--poids')
ap.add_argument('--detourage')
ap.add_argument('--debut', type=int, default=65)
ap.add_argument('--images', type=int, default=36)
ap.add_argument('--cadre', default='516,300,208,368', help='x, y, largeur, hauteur dans la vidéo')
ap.add_argument('--module', default='src/scene/marche.js')
ap.add_argument('--depart', type=int, default=13, help='image du cycle où l\'astronaute part et s\'arrête')
args = ap.parse_args()

T = args.travail
for d in ('crops', 'up', 'alpha'):
    os.makedirs(f'{T}/{d}', exist_ok=True)
indices = list(range(args.debut, args.debut + args.images + 1))  # + l'image de raccord
cx, cy, cl, ch = map(int, args.cadre.split(','))

# ---------- 1. les images du cycle ----------
cap = cv2.VideoCapture(args.video)
fps = cap.get(cv2.CAP_PROP_FPS) or 24
k = 0
while True:
    ok, im = cap.read()
    if not ok or k > indices[-1]:
        break
    if k in indices and not os.path.exists(f'{T}/crops/{k:03d}.png'):
        cv2.imwrite(f'{T}/crops/{k:03d}.png', im[cy:cy + ch, cx:cx + cl])
    k += 1

# ---------- 2. agrandissement ----------
manque = [i for i in indices if not os.path.exists(f'{T}/up/{i:03d}.png')]
if manque:
    import onnxruntime as ort
    from PIL import Image
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from agrandir import agrandir_image, construire_graphe, lire_poids
    s = ort.InferenceSession(construire_graphe(lire_poids(args.poids)).SerializeToString(), providers=['CPUExecutionProvider'])
    for i in manque:
        img = np.asarray(Image.open(f'{T}/crops/{i:03d}.png').convert('RGB')).astype(np.float32) / 255
        r = agrandir_image(s, img, 208)
        Image.fromarray((np.clip(r, 0, 1) * 255).round().astype(np.uint8)).save(f'{T}/up/{i:03d}.png')

# ---------- 3. détourage ----------
manque = [i for i in indices if not os.path.exists(f'{T}/alpha/{i:03d}.png')]
if manque:
    import onnxruntime as ort
    s = ort.InferenceSession(args.detourage, providers=['CPUExecutionProvider'])
    nom = s.get_inputs()[0].name
    for i in manque:
        im = cv2.imread(f'{T}/up/{i:03d}.png')
        h, w = im.shape[:2]
        x = cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2RGB), (1024, 1024), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        o = s.run(None, {nom: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
        o = 1 / (1 + np.exp(-o))
        cv2.imwrite(f'{T}/alpha/{i:03d}.png', (cv2.resize(o, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1) * 255).astype(np.uint8))

imgs = [cv2.imread(f'{T}/up/{i:03d}.png').astype(np.float32) for i in indices]
alphas = [cv2.imread(f'{T}/alpha/{i:03d}.png', 0).astype(np.float32) / 255 for i in indices]
H, W = alphas[0].shape


# ---------- 4. la ligne du sol : l'axe du reflet ----------
# Le sol est un plan vu en perspective : sous chaque pied, sa ligne dépend
# de la profondeur du pied. Pour chaque pied (moitié gauche, moitié droite
# de la silhouette), elle est l'axe de symétrie entre le pied et son
# reflet : la ligne où le bas de l'image se lit le mieux en miroir.
def axes_pieds(img, a):
    g = cv2.GaussianBlur(cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
    tronc = np.where((a[int(H * 0.3):int(H * 0.55)] > 0.5).any(axis=0))[0]
    milieu = int((tronc.min() + tronc.max()) / 2)
    cols = np.where((a[int(H * 0.68):int(H * 0.8)] > 0.5).any(axis=0))[0]
    res = []
    for xa, xb in ((cols.min(), milieu), (milieu, cols.max() + 1)):
        meilleur, score = None, -2
        for yc in range(int(H * 0.78), int(H * 0.91)):
            d = np.arange(4, int(H * 0.04), 2)
            haut = g[yc - d, xa:xb].ravel()
            dess = g[yc + d, xa:xb].ravel()
            haut = haut - haut.mean()
            dess = dess - dess.mean()
            ncc = float((haut * dess).sum() / (np.linalg.norm(haut) * np.linalg.norm(dess) + 1e-6))
            if ncc > score:
                meilleur, score = yc, ncc
        res.append((meilleur, score))
    return milieu, res


releves = [axes_pieds(im, a) for im, a in zip(imgs, alphas)]
milieux = np.array([r[0] for r in releves], np.float32)
axes = np.array([[r[1][0][0], r[1][1][0]] for r in releves], np.float32)
scores = np.array([[r[1][0][1], r[1][1][1]] for r in releves], np.float32)
# Un relevé douteux (score faible ou saut brusque) est remplacé par la
# moyenne de ses voisins ; puis un léger lissage, cycle bouclé.
for c in range(2):
    v = axes[:, c].copy()
    med = np.array([np.median(np.take(v, range(k - 2, k + 3), mode='wrap')) for k in range(len(v))])
    faux = (scores[:, c] < 0.6) | (np.abs(v - med) > H * 0.012)
    v[faux] = med[faux]
    axes[:, c] = np.convolve(np.pad(v, 1, mode='wrap'), [0.25, 0.5, 0.25], mode='valid')
print('sol sous les pieds : gauche', axes[:, 0].min(), '–', axes[:, 0].max(), '; droite', axes[:, 1].min(), '–', axes[:, 1].max())


def coupe(a, milieu, ag, ad):
    """Plus rien sous le sol : la ligne passe d'un pied à l'autre entre les
    jambes ; fondu de 3 px."""
    x = np.arange(W)[None, :]
    t = np.clip((x - (milieu - 30)) / 60.0, 0, 1)
    ligne = ag * (1 - t) + ad * t
    y = np.arange(H)[:, None]
    return a * np.clip((ligne + 1 - y) / 3.0, 0, 1)


# ---------- 5. bords, nettoyage, aplomb, étalonnage ----------
# La ligne du sol de l'image : celle du pied le plus proche (le plus bas).
sols = axes.max(axis=1)
SOL = int(round(np.median(sols)))
ELLIPSE = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))


def nettoyer(im, a):
    """Un bord net, sans rien du décor d'origine : le masque est ouvert
    (les fibres claires plus fines que lui disparaissent), resserré d'un
    demi-pixel à l'affichage, privé de ses îlots ; dans le liseré, la
    couleur est celle de l'intérieur tout proche ; enfin un débruitage
    léger efface les points clairs laissés par l'agrandissement."""
    dur = (a > 0.5).astype(np.uint8)
    dur = cv2.morphologyEx(dur, cv2.MORPH_OPEN, ELLIPSE(7))
    dur = cv2.erode(dur, ELLIPSE(5))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dur)
    if n > 1:
        plus = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        garde = [k for k in range(1, n) if k == plus or st[k, cv2.CC_STAT_AREA] > 4000]
        dur = np.isin(lab, garde).astype(np.uint8)
    ff = dur.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 1)
    trous = (ff == 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(trous)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] < 600:
            dur[lab == k] = 1
    a = np.minimum(cv2.GaussianBlur(dur.astype(np.float32), (0, 0), 1.0), np.clip(a * 1.3, 0, 1))
    a = np.where(a < 0.04, 0, a)
    coeur = cv2.erode(dur, ELLIPSE(9))
    poids = cv2.GaussianBlur(coeur.astype(np.float32), (0, 0), 3)
    voisin = cv2.GaussianBlur(im * coeur[..., None], (0, 0), 3) / np.maximum(poids, 1e-4)[..., None]
    bord = (a > 0) & (coeur == 0) & (poids > 0.02)
    im = np.where(bord[..., None], voisin, im)
    # Les points et fibres clairs (reflets éclatés par l'agrandissement) :
    # tout ce qui dépasse nettement son voisinage, en petites taches, prend
    # la couleur médiane de ses alentours.
    im8 = np.clip(im, 0, 255).astype(np.uint8)
    med = cv2.medianBlur(im8, 11)
    lum = im8.astype(np.int16).mean(axis=2) - med.astype(np.int16).mean(axis=2)
    taches = ((lum > 22) & (dur > 0)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(taches)
    petites = np.isin(lab, [k for k in range(1, n) if st[k, cv2.CC_STAT_AREA] < 90])
    petites = cv2.dilate(petites.astype(np.uint8), ELLIPSE(3)) > 0
    im = np.where(petites[..., None], med.astype(np.float32), im)
    im = cv2.fastNlMeansDenoisingColored(np.clip(im, 0, 255).astype(np.uint8), None, 3, 3, 5, 15).astype(np.float32)
    return im, a


def axe_corps(a):
    """Le casque et le bassin : leur alignement donne l'aplomb du corps."""
    ys = np.where((a > 0.5).any(axis=1))[0]
    top = ys.min()
    fig = SOL - top

    def centre(r0, r1, demi=None, autour=None):
        bande = a[top + int(fig * r0):top + int(fig * r1)].copy()
        if demi is not None:
            x = np.arange(W)[None, :]
            bande = bande * (np.abs(x - autour) < fig * demi)
        w = bande.sum(axis=0)
        return float((w * np.arange(W)).sum() / max(w.sum(), 1e-6)), top + fig * (r0 + r1) / 2

    hx, hy = centre(0.0, 0.09)
    px, py = centre(0.5, 0.57, 0.14, hx)
    return hx, hy, px, py


nets = [nettoyer(im, coupe(a, m, ag, ad)) for im, a, m, (ag, ad) in zip(imgs, alphas, milieux, axes)]
# L'aplomb : chaque image est tournée, autour du bassin au niveau du sol,
# pour que le casque soit exactement au-dessus du bassin.
mesures = [axe_corps(a) for _, a in nets]
angles = np.array([np.degrees(np.arctan2(hx - px, py - hy)) for hx, hy, px, py in mesures])
angles_l = angles  # chaque image exactement d'aplomb
print('inclinaison du corps : %.2f° à %.2f° → redressée' % (angles.min(), angles.max()))
def tourner(im, a, ang, px):
    M = cv2.getRotationMatrix2D((px, float(SOL)), float(ang), 1.0)
    return (cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=0),
            np.clip(cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=0), 0, 1))


images = []
for (im, a), (hx, hy, px, py), ang in zip(nets, mesures, angles_l):
    # La mesure dépend de la silhouette : on tourne, on remesure, on
    # corrige, jusqu'à l'aplomb (quelques passes suffisent).
    total = float(ang)
    for _ in range(5):
        _, a2 = tourner(im, a, total, px)
        hx2, hy2, px2, py2 = axe_corps(a2)
        reste = np.degrees(np.arctan2(hx2 - px2, py2 - hy2))
        if abs(reste) < 0.05:
            break
        total += reste
    im, a = tourner(im, a, total, px)
    # Étalonnage : un peu plus sobre, accordé au ciel de la scène.
    im = im * np.array([0.98, 0.95, 0.93])
    images.append(np.dstack([np.clip(im, 0, 255), a * 255]))
verif = [axe_corps(x[..., 3] / 255) for x in images]
print('après redressement : %.2f° au plus' % max(abs(np.degrees(np.arctan2(hx - px, py - hy))) for hx, hy, px, py in verif))
print('avant', ' '.join(f'{v:+.1f}' for v in angles))
print('après', ' '.join(f'{np.degrees(np.arctan2(hx - px, py - hy)):+.1f}' for hx, hy, px, py in verif))

# ---------- 6. la pose d'attente ----------
# La vidéo ne montre jamais l'astronaute immobile. On part de l'image où
# ses jambes se croisent (le pied libre passe à côté du pied d'appui) ; la
# jambe d'appui, droite, est reportée en miroir de l'autre côté de l'axe du
# corps : debout, d'aplomb, les deux pieds au sol, côte à côte.
DEPART = args.depart
hx, hy, px, py = verif[DEPART]
# La jambe levée montre sa semelle, sombre : la jambe d'appui est l'autre.
_top = np.where((images[DEPART][..., 3] > 128).any(axis=1))[0].min()
_bas = images[DEPART][int(_top + (SOL - _top) * 0.86):SOL + 4]
_sombre = (_bas[..., :3].max(axis=2) < 70) & (_bas[..., 3] > 128)
_cols = np.arange(W)[None, :]
appui_gauche = (_sombre & (_cols > px)).sum() > (_sombre & (_cols < px)).sum()
print('pose d\'attente : jambe d\'appui', 'gauche' if appui_gauche else 'droite')
base = images[DEPART].copy()
top = np.where((base[..., 3] > 128).any(axis=1))[0].min()
fig = SOL - top
y = np.arange(H)[:, None]
x = np.arange(W)[None, :]
hanche = top + fig * 0.6  # sous l'entrejambe
# La jambe d'appui seule : de son côté de l'axe du corps, sous la hanche.
cote = -1 if appui_gauche else 1
debut_j = hanche - fig * 0.035
# la largeur du pantalon à la hanche (les gants, plus loin, n'en sont pas)
ligne = base[int(hanche + fig * 0.03), :, 3] > 128
g_, d_ = int(px), int(px)
while g_ > 0 and ligne[g_ - 1]:
    g_ -= 1
while d_ < W - 1 and ligne[d_ + 1]:
    d_ += 1
demi_hanche = min(max(px - g_, d_ - px) + 4, fig * 0.12)
zone = np.abs(x - px) < demi_hanche
jambe_m = ((x - px) * -cote < 2) & (y > debut_j) & zone
jambe = base * jambe_m[..., None]
# Les pieds un peu écartés : la jambe s'éloigne de l'axe en descendant
# (rien à la hanche, quelques pixels aux pieds).
ecart = fig * 0.022
dxs = np.clip((np.arange(H) - hanche) / max(1.0, SOL - hanche), 0, 1) * ecart * cote
cartes_x = (np.arange(W)[None, :] - dxs[:, None]).astype(np.float32)
cartes_y = np.repeat(np.arange(H, dtype=np.float32)[:, None], W, axis=1)
jambe = cv2.remap(jambe.astype(np.float32), cartes_x, cartes_y, cv2.INTER_LINEAR, borderValue=0)
# sa réplique en miroir, de l'autre côté de l'axe du corps
autre = cv2.remap(jambe, (2 * px - np.arange(W)[None, :].repeat(H, 0)).astype(np.float32), cartes_y, cv2.INTER_LINEAR, borderValue=0)
jambes = jambe.copy()
aa = autre[..., 3:] / 255
jambes[..., :3] = jambe[..., :3] * (1 - aa) + autre[..., :3] * aa
jambes[..., 3] = np.maximum(jambe[..., 3], autre[..., 3])
# Le haut du corps, de l'image d'origine ; sous la hanche, les deux jambes
# (la jambe libre de l'image d'origine disparaît).
f_bas = np.clip((y - (debut_j + fig * 0.01)) / (fig * 0.05), 0, 1)
haut_corps = base.copy()
# hors des hanches (là où pendent les gants), la jambe libre de l'image
# d'origine s'efface un peu plus bas
f_cote = np.clip((y - (hanche + fig * 0.02)) / (fig * 0.03), 0, 1)
haut_corps[..., 3] *= 1 - np.where(zone, f_bas, f_cote)
pose = haut_corps.copy()
aj = jambes[..., 3:] / 255
pose[..., :3] = haut_corps[..., :3] * (1 - aj) + jambes[..., :3] * aj
pose[..., 3] = np.maximum(haut_corps[..., 3], jambes[..., 3])
images_pose = np.clip(pose, 0, 255)

# Le cadre commun : la place de toutes les positions, plus une marge.
union = np.max([x[..., 3] for x in images], axis=0) > 8
ys, xs = np.where(union)
haut, gauche, droite = max(0, ys.min() - 12), max(0, xs.min() - 12), min(W, xs.max() + 13)
bas = min(H, SOL + 24)
# Centré sur l'axe du corps (le sac dorsal), largeur paire.
centre = (gauche + droite) / 2
demi = int(np.ceil(max(centre - gauche, droite - centre) / 2) * 2)
gauche, droite = int(centre - demi), int(centre + demi)
cadre = [x[haut:bas, gauche:droite] for x in images[:-1]]  # la dernière = la première
cadre_pose = images_pose[haut:bas, gauche:droite]
raccord = np.abs(images[-1][..., 3] - images[0][..., 3]).mean() / 255
figure = SOL - (np.where((images[0][..., 3] > 128).any(axis=1))[0].min())
print('cadre', cadre[0].shape, 'figure', figure, 'px ; écart de raccord', round(float(raccord), 4))

for taille, k, q in (('l', 900 / figure, 86), ('s', 450 / figure, 80)):
    os.makedirs(f'{args.sortie}/{taille}', exist_ok=True)
    for n, x in list(enumerate(cadre)) + [('pose', cadre_pose)]:
        h, w = x.shape[:2]
        r = cv2.resize(x, (int(round(w * k / 2) * 2), int(round(h * k))), interpolation=cv2.INTER_AREA)
        nom = n if isinstance(n, str) else f'{n:02d}'
        cv2.imwrite(f'{args.sortie}/{taille}/{nom}.webp', np.clip(r, 0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, q])

# ---------- 7. la longueur des pas : le pied d'appui ----------
# Tant qu'un pied touche le sol, il doit y rester immobile : le décor
# avance donc exactement comme recule, vers la caméra, le pied d'appui. On
# suit, image par image, la ligne où chaque pied touche son reflet (l'axe
# de symétrie, au ras de la semelle), lissée dans le temps (programmation
# dynamique : une ligne qui ne saute pas). Le pied d'appui est celui dont
# la ligne descend ; sa descente, en fraction de la hauteur de la figure,
# donne l'avance du décor. (Le sol de la vidéo, lui, défile plus vite que
# les pieds : la vidéo glisse ; on ne le suit pas.)
def profil_miroir(g, xa, xb, ys):
    d = np.arange(3, int(H * 0.027), 2)
    out = []
    for yc in ys:
        a_ = g[yc - d, xa:xb].ravel()
        b_ = g[yc + d, xa:xb].ravel()
        a_ = a_ - a_.mean()
        b_ = b_ - b_.mean()
        out.append(float((a_ * b_).sum() / (np.linalg.norm(a_) * np.linalg.norm(b_) + 1e-6)))
    return np.array(out)


ys = np.arange(int(H * 0.795), int(H * 0.885))
profils = []
for im, a in zip(imgs, alphas):
    g = cv2.GaussianBlur(cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.2)
    prof = a[int(H * 0.76):int(H * 0.815)].mean(axis=0)
    cols = np.where(prof > 0.25)[0]
    x0, x1 = cols.min(), cols.max()
    lisse = np.convolve(prof[x0 + 25:x1 - 25], np.ones(9) / 9, mode='same')
    mil = x0 + 25 + int(np.argmin(lisse))
    profils.append([profil_miroir(g, x0, mil, ys), profil_miroir(g, mil, x1 + 1, ys)])


def suivre(S):
    T, n = S.shape
    cout = -S.copy()
    arr = np.zeros((T, n), int)
    for t in range(1, T):
        for j in range(n):
            lo, hi = max(0, j - 8), min(n, j + 9)
            pen = cout[t - 1, lo:hi] + 0.004 * (np.arange(lo, hi) - j) ** 2
            k = int(np.argmin(pen))
            cout[t, j] += pen[k]
            arr[t, j] = lo + k
    j = int(np.argmin(cout[-1]))
    chemin = [j]
    for t in range(T - 1, 0, -1):
        j = arr[t, j]
        chemin.append(j)
    return ys[np.array(chemin[::-1])].astype(np.float32)


lignes = np.stack([suivre(np.array([p[c] for p in profils])) for c in range(2)], axis=1)
vitesses = np.diff(lignes, axis=0)  # descente de chaque ligne, image par image
pas_images = []
for v in vitesses:
    appui = v[v > 0]
    pas_images.append(float(appui.mean()) if len(appui) else 0.0)
pas_images = np.array(pas_images)
avance = np.concatenate([[0], np.cumsum(pas_images)]) / figure
print('pied d\'appui : %.2f px par image (×4), %.4f figure par pas' % (pas_images.mean(), avance[-1] / 2))
# (pour les vérifications : les lignes de contact, dans le repère du cadre de sortie)
json.dump({'lignes': lignes.tolist(), 'haut': int(haut), 'sol': SOL}, open(f'{T}/lignes.json', 'w'))

# Le bas des semelles de chaque image (dans le cadre de référence) : le
# reflet et l'ombre s'y accrochent.
def semelle(x):
    rangs = np.where((x[..., 3] > 100).any(axis=1))[0]
    return int(rangs.max()) if len(rangs) else int(SOL - haut)


semelles = [semelle(x) for x in cadre]
semelle_pose = semelle(cadre_pose)

h, w = cadre[0].shape[:2]
info = {
    'images': len(cadre),
    'cycle': round(len(cadre) / fps, 4),
    'largeur': int(w),
    'hauteur': int(h),
    'pieds': int(SOL - haut),
    'figure': int(figure),
    # l'image où il part et s'arrête ; la pose d'attente en dérive (pose.webp)
    'depart': DEPART,
    # le bas des semelles, image par image, et dans la pose d'attente
    'semelles': semelles,
    'semellePose': semelle_pose,
    # avance du pied d'appui, cumulée image par image sur le cycle, en figures
    'avance': [round(float(v), 5) for v in avance],
}
with open(args.module, 'w') as f:
    f.write('/* Produit par scripts/marche.py : la marche de l\'astronaute, un cycle\n'
            '   de deux pas tiré de la vidéo. Dimensions du cadre de référence, en\n'
            '   pixels ; durée du cycle, en secondes ; `pieds` : la ligne du sol ;\n'
            '   `figure` : du casque aux semelles ; `avance` : de combien le sol\n'
            '   avance sous le pied d\'appui, image par image, en hauteurs de figure. */\n')
    f.write(f'export const MARCHE = {json.dumps(info)};\n')
print(info)
