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


# ---------- 5. alignement, bords, étalonnage ----------
# La ligne du sol de l'image : celle du pied le plus proche (le plus bas).
sols = axes.max(axis=1)
SOL = int(round(np.median(sols)))
images = []
for im, a, m, (ag, ad), yc in zip(imgs, alphas, milieux, axes, sols):
    a = coupe(a, m, ag, ad)
    a = np.where(a < 0.03, 0, a)
    # Bords : la couleur de l'intérieur tout proche, prolongée sous le bord
    # (rien du décor d'origine ne reste dans le liseré).
    coeur = (a > 0.96).astype(np.uint8)
    coeur = cv2.erode(coeur, np.ones((3, 3), np.uint8))
    poids = cv2.GaussianBlur(coeur.astype(np.float32), (0, 0), 3)
    voisin = cv2.GaussianBlur(im * coeur[..., None], (0, 0), 3) / np.maximum(poids, 1e-4)[..., None]
    bord = (a > 0) & (a < 0.96) & (poids > 0.02)
    im = np.where(bord[..., None], voisin, im)
    # Étalonnage : un peu plus sobre, accordé au ciel de la scène.
    im = im * np.array([0.98, 0.95, 0.93])
    # Pas de recalage image par image : la caméra de la vidéo suit
    # l'astronaute, son balancement est celui de la marche.
    images.append(np.dstack([np.clip(im, 0, 255), a * 255]))

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
raccord = np.abs(images[-1][..., 3] - images[0][..., 3]).mean() / 255
figure = SOL - (np.where((images[0][..., 3] > 128).any(axis=1))[0].min())
print('cadre', cadre[0].shape, 'figure', figure, 'px ; écart de raccord', round(float(raccord), 4))

for taille, k, q in (('l', 900 / figure, 86), ('s', 450 / figure, 80)):
    os.makedirs(f'{args.sortie}/{taille}', exist_ok=True)
    for n, x in enumerate(cadre):
        h, w = x.shape[:2]
        r = cv2.resize(x, (int(round(w * k / 2) * 2), int(round(h * k))), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f'{args.sortie}/{taille}/{n:02d}.webp', np.clip(r, 0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, q])

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

h, w = cadre[0].shape[:2]
info = {
    'images': len(cadre),
    'cycle': round(len(cadre) / fps, 4),
    'largeur': int(w),
    'hauteur': int(h),
    'pieds': int(SOL - haut),
    'figure': int(figure),
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
