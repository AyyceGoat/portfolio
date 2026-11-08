"""
Prépare la marche de l'astronaute à partir de la planche agrandie
(sources/astronaute-marche-x4.webp : 8 positions vues de dos, fond blanc).

    python3 scripts/astronaute.py sources/astronaute-marche-x4.webp public/espace

  1. Détourage : le fond blanc est pris par remplissage depuis les bords
     (plus tolérant au niveau du sol, pour l'ombre portée) ; sur le
     contour, l'alpha suit l'écart au blanc et la couleur est « démêlée »
     du blanc, ce qui ne laisse aucun halo clair.
  2. Découpe des 8 positions, puis alignement : même hauteur (du casque au
     sol), pieds sur la même ligne, sac dorsal centré.
  3. Harmonisation : même luminosité moyenne d'une position à l'autre,
     puis un étalonnage pour la scène (un peu plus sombre et froid, la
     lumière chaude de la passerelle au bas des jambes, un liseré froid du
     côté de la planète).
  4. Sortie : une bande de 8 cadres de 640 × 1280, pieds à 1240
     (astronaute-1280.webp, et sa moitié astronaute-640.webp).

Nécessite opencv-python-headless et numpy.
"""
import sys

import cv2
import numpy as np

source, sortie = sys.argv[1], sys.argv[2]
img = cv2.imread(source).astype(np.float32)
H, W = img.shape[:2]
blanc = img.min(axis=2)
ecart = 255.0 - blanc  # 0 sur le fond blanc

# ---------- 1. fond : remplissage depuis les bords ----------
sol = int(H * 0.78)  # au-dessous : l'ombre portée au sol (le bas des bottes)
# L'ombre est un dégradé doux ; les bottes ont des contours nets. Au sol,
# le fond gagne donc tout pixel clair et peu contrasté avec ses voisins.
lum = cv2.GaussianBlur(img.mean(axis=2), (0, 0), 1.5)
pente = cv2.magnitude(cv2.Sobel(lum, cv2.CV_32F, 1, 0), cv2.Sobel(lum, cv2.CV_32F, 0, 1))
pente = cv2.dilate(pente, np.ones((5, 5), np.uint8))
saturation = img.max(axis=2) - blanc
fond_strict = (ecart < 12).astype(np.uint8)
# Entre les jambes, le fond peut être isolé du reste : on le reprend.
fond_sol = ((ecart < 105) & (pente < 28) & (saturation < 18) & (np.arange(H)[:, None] > sol)).astype(np.uint8)
candidat = fond_strict | fond_sol
n, lab = cv2.connectedComponents(candidat, connectivity=4)
bords = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
bords.discard(0)
fond = np.isin(lab, list(bords))
figure = (~fond).astype(np.uint8)
figure = cv2.morphologyEx(figure, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
# les reflets presque blancs du bord de la combinaison ne font pas d'encoche
figure = cv2.morphologyEx(figure, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
# Pose 6 : un reflet blanc du mollet droit touche le fond par un passage
# étroit ; il est rendu à la figure (relevé sur la planche agrandie).
cv2.fillPoly(figure, [np.array([(3878, 2206), (3936, 2212), (3966, 2238), (3963, 2263), (3940, 2252), (3900, 2242), (3878, 2226)], np.int32)], 1)
# Le fond enclavé (entre les jambes, loin des bords) : de grandes plages
# presque blanches à l'intérieur de la silhouette.
n, lab, st, _ = cv2.connectedComponentsWithStats(((figure > 0) & (ecart < 16)).astype(np.uint8))
for k in range(1, n):
    # seulement ce qui descend jusqu'au sol : les reflets de la combinaison,
    # plus haut, restent
    bas_zone = st[k, cv2.CC_STAT_TOP] + st[k, cv2.CC_STAT_HEIGHT]
    if st[k, cv2.CC_STAT_AREA] > 2500 and bas_zone > H * 0.77:
        figure[lab == k] = 0
# Trous dans la figure : les petits sont bouchés ; les grands et clairs
# (le fond vu entre les jambes) restent du fond.
ff = figure.copy()
m = np.zeros((H + 2, W + 2), np.uint8)
cv2.floodFill(ff, m, (0, 0), 1)
trous = (1 - ff).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(trous)
for k in range(1, n):
    zone = lab == k
    if st[k, cv2.CC_STAT_AREA] < 400 or np.median(ecart[zone]) > 30:
        figure[zone] = 1

# ---------- alpha et couleurs démêlées sur le contour ----------
interieur = cv2.erode(figure, np.ones((7, 7), np.uint8))
contour = cv2.dilate(figure, np.ones((3, 3), np.uint8)) - interieur
alpha = figure.astype(np.float32)
a_contour = np.clip((ecart - 10.0) / 55.0, 0, 1)
alpha = np.where(contour > 0, np.minimum(a_contour, cv2.dilate(figure, np.ones((3, 3), np.uint8))), alpha)
alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7) * (cv2.dilate(figure, np.ones((3, 3), np.uint8)) > 0)
a3 = np.maximum(alpha, 1e-3)[..., None]
couleur = np.clip((img - (1 - alpha[..., None]) * 255.0) / a3, 0, 255)
# au bord, on reprend la couleur moyenne de l'intérieur tout proche
poids = cv2.GaussianBlur(interieur.astype(np.float32), (0, 0), 3)
voisin = cv2.GaussianBlur(couleur * interieur[..., None], (0, 0), 3) / np.maximum(poids, 1e-4)[..., None]
couleur = np.where(((contour > 0) & (poids > 0.02))[..., None], voisin, couleur)

# ---------- 2. découpe des 8 positions ----------
colonnes = (figure.sum(axis=0) > 0).astype(np.int8)
debuts = list(np.where(np.diff(np.concatenate([[0], colonnes])) == 1)[0])
fins = list(np.where(np.diff(np.concatenate([colonnes, [0]])) == -1)[0])
morceaux = [(a, b) for a, b in zip(debuts, fins) if b - a > W * 0.04]
assert len(morceaux) == 8, f'{len(morceaux)} silhouettes trouvées'

poses = []
sombre = (blanc < 75) & (figure > 0)
for a, b in morceaux:
    f = figure[:, a : b + 1]
    lignes = np.where(f.sum(axis=1) > 0)[0]
    haut = lignes[0]
    # le sol : le bas de la semelle sombre la plus basse ; l'ombre portée,
    # claire, qui déborde autour des semelles, est retirée
    bas = np.where(sombre[:, a : b + 1].sum(axis=1) > 6)[0][-1]
    # au ras du sol, l'ombre portée ne laisse que de fines lamelles
    # horizontales : une ouverture verticale les efface, les bottes restent
    ras = slice(bas - 90, bas + 3)
    garde = cv2.morphologyEx((alpha[ras, a : b + 1] > 0.5).astype(np.uint8), cv2.MORPH_OPEN, np.ones((31, 1), np.uint8))
    garde = cv2.dilate(garde, np.ones((3, 3), np.uint8))
    alpha[ras, a : b + 1] *= garde
    # sous les semelles, le dernier liseré clair de l'ombre
    bloc = alpha[ras, a : b + 1]
    present = bloc > 0.5
    fond_col = np.where(present.any(axis=0), present.shape[0] - 1 - np.argmax(present[::-1], axis=0), -1)
    yy = np.arange(present.shape[0])[:, None]
    clair = (blanc[ras, a : b + 1] > 150) & ((img[ras, a : b + 1].max(axis=2) - blanc[ras, a : b + 1]) < 22)
    bloc[(yy > fond_col[None, :] - 16) & clair] = 0
    # Dernières lamelles d'ombre : sous le liseré sombre de chaque semelle,
    # plus rien ; puis les petits îlots détachés de la silhouette.
    bande = slice(bas - 120, bas + 3)
    bl_b = blanc[bande, a : b + 1]
    al_b = alpha[bande, a : b + 1]
    yy = np.arange(al_b.shape[0])[:, None]
    noir = (bl_b < 95) & (al_b > 0.5)
    dernier = np.where(noir.any(axis=0), al_b.shape[0] - 1 - np.argmax(noir[::-1], axis=0), -1)
    sous = (yy > dernier[None, :] + 3) & (dernier[None, :] >= 0)
    al_b[sous & (bl_b > 110)] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats((al_b > 0.05).astype(np.uint8))
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] < 900:
            al_b[lab == k] = 0
    alpha[bas + 3 :, a : b + 1] = 0
    figure[bas + 3 :, a : b + 1] = 0
    # centre : le sac dorsal, entre 15 % et 40 % de la hauteur
    y0 = int(haut + (bas - haut) * 0.15)
    y1 = int(haut + (bas - haut) * 0.4)
    xs = np.where(f[y0:y1].sum(axis=0) > 0)[0]
    centre = a + (xs[0] + xs[-1]) / 2
    poses.append({'a': a, 'b': b, 'haut': haut, 'bas': bas, 'centre': centre})

hauteur = np.median([p['bas'] - p['haut'] for p in poses])
lum_ref = []
for p in poses:
    zone = (slice(int(p['haut'] + (p['bas'] - p['haut']) * 0.45), int(p['haut'] + (p['bas'] - p['haut']) * 0.7)), slice(p['a'], p['b']))
    msk = figure[zone] > 0
    lum_ref.append(couleur[zone][msk].mean())
lum_med = float(np.median(lum_ref))

# ---------- 3. alignement, harmonisation, étalonnage ----------
CADRE_L, CADRE_H = 640, 1280
MARGE_BAS = 40
cible_h = CADRE_H - MARGE_BAS - 30
images = []
for p, lum in zip(poses, lum_ref):
    k = cible_h / (p['bas'] - p['haut'])
    seule = np.zeros_like(alpha)
    seule[:, p['a'] : p['b'] + 1] = alpha[:, p['a'] : p['b'] + 1]
    rgba = np.dstack([couleur * (lum_med / lum), seule * 255])
    # place la pose dans le cadre : pieds sur la ligne, sac au centre
    M = np.float32([[k, 0, CADRE_L / 2 - p['centre'] * k], [0, k, (CADRE_H - MARGE_BAS) - p['bas'] * k]])
    cadre = cv2.warpAffine(rgba, M, (CADRE_L, CADRE_H), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    c, al = cadre[..., :3] / 255.0, cadre[..., 3] / 255.0
    y = np.linspace(0, 1, CADRE_H)[:, None, None]
    # plus sombre et plus froid ; lumière chaude de la passerelle en bas
    c = c * np.array([0.92, 0.86, 0.8])  # (BGR)
    c = c + np.array([0.02, 0.06, 0.12]) * np.clip((y - 0.62) / 0.38, 0, 1) * c * 2.2
    # liseré froid du côté de la planète (à droite) : la distance au bord
    dedans = (al > 0.5).astype(np.uint8)
    dist = cv2.distanceTransform(dedans, cv2.DIST_L2, 3)
    xs = np.linspace(0, 1, CADRE_L)[None, :]
    lisere = np.exp(-dist / 3.0) * np.clip((xs - 0.45) * 3, 0, 1) * dedans
    c = c + np.array([0.16, 0.08, 0.03])[None, None, :] * lisere[..., None]
    c = np.clip(c, 0, 1)
    images.append(np.dstack([c * 255, al * 255]).astype(np.uint8))

bande = np.concatenate(images, axis=1)
cv2.imwrite(f'{sortie}/astronaute-1280.webp', bande, [cv2.IMWRITE_WEBP_QUALITY, 90])
petite = cv2.resize(bande, (bande.shape[1] // 2, bande.shape[0] // 2), interpolation=cv2.INTER_AREA)
cv2.imwrite(f'{sortie}/astronaute-640.webp', petite, [cv2.IMWRITE_WEBP_QUALITY, 90])
print('poses', len(images), 'bande', bande.shape, 'hauteur médiane', hauteur)
