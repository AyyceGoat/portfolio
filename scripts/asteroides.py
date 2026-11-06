"""
Détoure les astéroïdes de l'image de référence : un masque par astéroïde,
dans une ellipse relevée à la main (la roche est sombre ou peu saturée,
le ciel autour est vif). Les masques servent à scripts/plans.py.

    python3 scripts/asteroides.py sources/reference.webp sources/masques
"""
import sys, cv2, numpy as np
ref = cv2.imread(sys.argv[1]); out = sys.argv[2]
hsv = cv2.cvtColor(ref, cv2.COLOR_BGR2HSV).astype(np.float32) / 255.0
S, V = hsv[..., 1], hsv[..., 2]
# centre, demi-axes : relevés sur l'image
ellipses = {
  'a1': ((62, 360), (48, 41)), 'a2': ((1213, 500), (65, 57)), 'a3': ((309, 434), (22, 17)),
  'a4': ((402, 399), (13, 12)), 'a5': ((163, 465), (21, 20)), 'a6': ((733, 376), (9, 9)),
  'a7': ((1217, 405), (17, 14)), 'a8': ((1026, 473), (14, 12)),
}
H, W = ref.shape[:2]
total = np.zeros((H, W), np.uint8)
for nom, ((cx, cy), (ax, ay)) in ellipses.items():
    zone = np.zeros((H, W), np.uint8)
    cv2.ellipse(zone, (cx, cy), (int(ax * 1.12), int(ay * 1.12)), 0, 0, 360, 255, -1)
    m = ((((V < 0.26) | (S < 0.3)) & (zone > 0)) * 255).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = np.where(lab == k, 255, 0).astype(np.uint8)
    ff = m.copy(); msk = np.zeros((H + 2, W + 2), np.uint8); cv2.floodFill(ff, msk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    m = cv2.dilate(m, np.ones((3, 3), np.uint8)) & zone
    cv2.imwrite(f'{out}/m-{nom}.png', m)
    total |= m
cv2.imwrite(f'{out}/masque-asteroides.png', total)
