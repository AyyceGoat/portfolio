"""
Découpe l'image de référence (sources/reference.webp) en plans :
  - public/espace/ciel-1920.webp et ciel-1280.webp : nébuleuses et étoiles,
    sans planète, sans astéroïdes, sans passerelle ni astronaute ;
  - public/espace/planete.webp : la planète détourée, avec son atmosphère
    (la passerelle qui passait devant est effacée) ;
  - public/espace/asteroides.webp : un atlas des astéroïdes détourés.

    python3 scripts/asteroides.py sources/reference.webp sources/masques
    python3 scripts/plans.py sources/reference.webp sources/masques public/espace

Nécessite opencv-python-headless et numpy. Les rectangles de l'atlas,
imprimés à la fin, sont repris dans src/scene/monde.js (ATLAS).
"""
import sys, json, cv2, numpy as np
ref = cv2.imread(sys.argv[1]); dos = sys.argv[2]; sortie = sys.argv[3]
H, W = ref.shape[:2]
ast = cv2.imread(f'{dos}/masque-asteroides.png', 0)

# ---------- planète ----------
PX, PY, RX, RY = 1013, 268, 183, 177.5
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rho = np.sqrt(((xx - PX) / RX) ** 2 + ((yy - PY) / RY) ** 2)
pont = np.zeros((H, W), np.uint8)
cv2.fillPoly(pont, [np.array([(780, 292), (860, 296), (930, 318), (988, 342), (998, 362), (985, 388), (935, 410), (862, 434), (800, 452), (760, 452), (760, 292)], np.int32)], 255)
cv2.circle(pont, (852, 305), 26, 255, -1)
disque = (rho < 1.12).astype(np.uint8) * 255
a_reparer = cv2.dilate(pont & disque, np.ones((9, 9), np.uint8))
# La passerelle passe devant la planète, en bas à gauche : on y reporte la
# même planète tournée autour de son centre (océan et nuages du limbe
# gauche), ce qui garde l'assombrissement du bord.
tour = cv2.getRotationMatrix2D((PX, PY), 62, 1.0)
tournee = cv2.warpAffine(ref, tour, (W, H), flags=cv2.INTER_LINEAR)
fr = cv2.GaussianBlur(a_reparer.astype(np.float32) / 255, (0, 0), 5)[..., None]
planete = (ref * (1 - fr) + tournee * fr).astype(np.uint8)
alpha_p = np.clip((1.09 - rho) / 0.09, 0, 1)
alpha_p = alpha_p * alpha_p * (3 - 2 * alpha_p)
x0, y0, x1, y1 = PX - 210, PY - 205, PX + 210, PY + 205
crop = planete[y0:min(y1, H), x0:min(x1, W)]
ca = (alpha_p[y0:min(y1, H), x0:min(x1, W)] * 255).astype(np.uint8)
rgba = np.dstack([crop, ca])
# complète à droite (la planète touche presque le bord) par du transparent
plein = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); plein[:rgba.shape[0], :rgba.shape[1]] = rgba
plein = cv2.resize(plein, ((x1 - x0) * 2, (y1 - y0) * 2), interpolation=cv2.INTER_LANCZOS4)
cv2.imwrite(f'{sortie}/planete.webp', plein, [cv2.IMWRITE_WEBP_QUALITY, 86])
info = {'planete': {'cx': PX, 'cy': PY, 'rx': RX, 'ry': RY, 'boite': [x0, y0, x1, y1]}}

# ---------- ciel vide ----------
masque = cv2.dilate(ast, np.ones((7, 7), np.uint8))
cv2.circle(masque, (852, 305), 30, 255, -1)
cv2.line(masque, (740, 298), (860, 307), 255, 9)
for r in [(15, 420, 75, 450), (100, 455, 135, 482), (252, 428, 292, 452), (1088, 444, 1152, 476)]:
    cv2.rectangle(masque, r[:2], r[2:], 255, -1)
ciel = cv2.inpaint(ref, masque, 7, cv2.INPAINT_TELEA)
# Le disque de la planète : comblé d'une teinte douce (il reste toujours
# sous la planète, seul son pourtour transparaît).
disque_p = ((rho < 1.14) * 255).astype(np.uint8)
comble = cv2.inpaint(ciel, disque_p, 5, cv2.INPAINT_TELEA)
comble = cv2.GaussianBlur(comble, (0, 0), 30)
fd = cv2.GaussianBlur(disque_p.astype(np.float32) / 255, (0, 0), 6)[..., None]
ciel = (ciel * (1 - fd) + comble * fd).astype(np.uint8)
# Le haut de l'astronaute, au-dessus de la passerelle : comblé, puis
# parsemé des étoiles d'une zone voisine.
corps = np.zeros((H, W), np.uint8)
cv2.ellipse(corps, (582, 372), (66, 82), 0, 0, 360, 255, -1)
lisse_c = cv2.inpaint(ciel, corps, 9, cv2.INPAINT_TELEA)
lisse_c = cv2.GaussianBlur(lisse_c, (0, 0), 6)
voisin = np.roll(ciel, 170, axis=1).astype(np.float32)
detail = voisin - cv2.GaussianBlur(voisin, (0, 0), 4)
fc = cv2.GaussianBlur(corps.astype(np.float32) / 255, (0, 0), 6)[..., None]
ciel = np.clip(ciel * (1 - fc) + (lisse_c + detail) * fc, 0, 255).astype(np.uint8)

# Le bas (sous la passerelle) : le ciel du haut, tourné d'un demi-tour,
# plus sombre (on regarde sous la passerelle, loin de la lumière).
bas = np.zeros((H, W), np.uint8)
cv2.fillPoly(bas, [np.array([(0, 478), (240, 452), (470, 424), (640, 398), (760, 372), (850, 350), (995, 348), (1002, 420), (1100, 470), (1280, 545), (1280, 720), (0, 720)], np.int32)], 255)
haut = ciel[0:300]
g = cv2.resize(cv2.rotate(haut[:, 0:560], cv2.ROTATE_180), (880, 440))
d = cv2.resize(cv2.rotate(haut[:, 300:820], cv2.ROTATE_180), (520, 440))
rempli = ciel.copy().astype(np.float32)
zone = np.zeros((440, 1280, 3), np.float32)
zone[:, 0:880] = g
rampe = np.clip((np.arange(1280) - 700) / 180, 0, 1)[None, :, None]
zone_d = np.zeros_like(zone); zone_d[:, 760:1280] = d; zone_d[:, 700:760] = d[:, :1][:, [0] * 60] if False else cv2.resize(d[:, :60], (60, 440))
zone = zone * (1 - rampe) + zone_d * rampe
rempli[280:720] = zone * 0.72
fondu = cv2.GaussianBlur(bas.astype(np.float32) / 255, (0, 0), 12)[..., None]
ciel = (ciel * (1 - fondu) + rempli * fondu).astype(np.uint8)

grand = cv2.resize(ciel, (W * 2, H * 2), interpolation=cv2.INTER_LANCZOS4)
flou = cv2.GaussianBlur(grand, (0, 0), 1.2)
grand = cv2.addWeighted(grand, 1.35, flou, -0.35, 0)
# Le ciel est enregistré sans canal alpha : le moteur repère lui-même les
# étoiles (ce qui dépasse nettement son voisinage) pour les faire scintiller.
for nom, l in [('ciel-1920', 1), ('ciel-1280', 1.5)]:
    img = cv2.resize(grand, (int(1920 / l), int(1080 / l)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{sortie}/{nom}.webp', img, [cv2.IMWRITE_WEBP_QUALITY, 80])

# ---------- astéroïdes : un atlas ----------
noms = ['a2', 'a3', 'a7', 'a8', 'a4', 'a6']
morceaux = []
for nom in noms:
    m = cv2.imread(f'{dos}/m-{nom}.png', 0)
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = xs.min() - 3, ys.min() - 3, xs.max() + 4, ys.max() + 4
    # Bord resserré, et couleurs de la roche prolongées sous le bord : rien
    # du ciel d'origine ne reste autour.
    serre = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=2 if m.sum() / 255 < 2000 else 1)
    a = cv2.GaussianBlur(serre, (0, 0), 0.8)[by0:by1, bx0:bx1]
    coeur = cv2.erode(serre, np.ones((3, 3), np.uint8))
    roche = cv2.inpaint(ref, cv2.bitwise_not(coeur), 3, cv2.INPAINT_TELEA)
    c = roche[by0:by1, bx0:bx1]
    morceau = np.dstack([c, a])
    morceau = cv2.resize(morceau, (morceau.shape[1] * 2, morceau.shape[0] * 2), interpolation=cv2.INTER_LANCZOS4)
    morceaux.append((nom, morceau))
largeur = sum(m.shape[1] + 4 for _, m in morceaux); hauteur = max(m.shape[0] for _, m in morceaux)
atlas = np.zeros((hauteur, largeur, 4), np.uint8); x = 0; rects = []
for nom, m in morceaux:
    atlas[:m.shape[0], x:x + m.shape[1]] = m
    rects.append([round(x / largeur, 5), 0, round(m.shape[1] / largeur, 5), round(m.shape[0] / hauteur, 5), m.shape[1], m.shape[0]])
    x += m.shape[1] + 4
cv2.imwrite(f'{sortie}/asteroides.webp', atlas, [cv2.IMWRITE_WEBP_QUALITY, 86])
info['asteroides'] = rects
print(json.dumps(info))
