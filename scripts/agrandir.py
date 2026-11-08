"""
Real-ESRGAN (RealESRGAN_x4plus) sans PyTorch : les poids du fichier .pth
sont lus directement (archive zip + pickle), le réseau RRDBNet est réécrit
en graphe ONNX, puis exécuté par onnxruntime, tuile par tuile.

    python3 scripts/agrandir.py RealESRGAN_x4plus.pth entree.png sortie.png [tuile]

Les poids (RealESRGAN_x4plus.pth) se téléchargent depuis les publications
du dépôt xinntao/Real-ESRGAN. Nécessite numpy, onnx, onnxruntime et pillow.
Ainsi ont été agrandies la référence (sources/reference-x4.webp) et la
planche de marche de l'astronaute (sources/astronaute-marche-x4.webp).
"""
import io
import pickle
import sys
import zipfile
from collections import OrderedDict

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper
from PIL import Image


def lire_poids(chemin):
    z = zipfile.ZipFile(chemin)
    racine = z.namelist()[0].split('/')[0]
    stockages = {}

    class Stockage:
        def __init__(self, nom):
            self.nom = nom

    def stockage(cle):
        if cle not in stockages:
            stockages[cle] = np.frombuffer(z.read(f'{racine}/data/{cle}'), dtype=np.float32)
        return stockages[cle]

    def reconstruire(st, decalage, taille, pas, *args):
        a = st[decalage:]
        return np.lib.stride_tricks.as_strided(a, shape=tuple(taille), strides=tuple(s * 4 for s in pas)).copy()

    class Lecteur(pickle.Unpickler):
        def find_class(self, module, nom):
            if module == 'torch._utils' and nom == '_rebuild_tensor_v2':
                return reconstruire
            if module == 'collections' and nom == 'OrderedDict':
                return OrderedDict
            if module == 'torch':
                return Stockage
            return super().find_class(module, nom)

        def persistent_load(self, pid):
            return stockage(pid[2])

    d = Lecteur(io.BytesIO(z.read(f'{racine}/data.pkl'))).load()
    return d.get('params_ema', d.get('params', d))


def construire_graphe(p):
    noeuds, inits = [], []
    compteur = [0]

    def nom(prefixe):
        compteur[0] += 1
        return f'{prefixe}_{compteur[0]}'

    def conv(x, cle):
        w, b = p[cle + '.weight'], p[cle + '.bias']
        wn, bn = nom('w'), nom('b')
        inits.extend([numpy_helper.from_array(w, wn), numpy_helper.from_array(b, bn)])
        y = nom('conv')
        noeuds.append(helper.make_node('Conv', [x, wn, bn], [y], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
        return y

    def lrelu(x):
        y = nom('lr')
        noeuds.append(helper.make_node('LeakyRelu', [x], [y], alpha=0.2))
        return y

    def concat(xs):
        y = nom('cat')
        noeuds.append(helper.make_node('Concat', xs, [y], axis=1))
        return y

    k02 = 'k02'
    inits.append(numpy_helper.from_array(np.array(0.2, dtype=np.float32), k02))

    def residu(x, r):
        m = nom('mul')
        noeuds.append(helper.make_node('Mul', [r, k02], [m]))
        y = nom('add')
        noeuds.append(helper.make_node('Add', [m, x], [y]))
        return y

    def rdb(x, pre):
        x1 = lrelu(conv(x, pre + '.conv1'))
        x2 = lrelu(conv(concat([x, x1]), pre + '.conv2'))
        x3 = lrelu(conv(concat([x, x1, x2]), pre + '.conv3'))
        x4 = lrelu(conv(concat([x, x1, x2, x3]), pre + '.conv4'))
        x5 = conv(concat([x, x1, x2, x3, x4]), pre + '.conv5')
        return residu(x, x5)

    echelle = 'echelle'
    inits.append(numpy_helper.from_array(np.array([1, 1, 2, 2], dtype=np.float32), echelle))

    def agrandir(x):
        y = nom('up')
        noeuds.append(helper.make_node('Resize', [x, '', echelle], [y], mode='nearest'))
        return y

    feat = conv('entree', 'conv_first')
    corps = feat
    i = 0
    while f'body.{i}.rdb1.conv1.weight' in p:
        pre = f'body.{i}'
        out = rdb(rdb(rdb(corps, pre + '.rdb1'), pre + '.rdb2'), pre + '.rdb3')
        corps = residu(corps, out)
        i += 1
    corps = conv(corps, 'conv_body')
    s = nom('add')
    noeuds.append(helper.make_node('Add', [feat, corps], [s]))
    f = lrelu(conv(agrandir(s), 'conv_up1'))
    f = lrelu(conv(agrandir(f), 'conv_up2'))
    out = conv(lrelu(conv(f, 'conv_hr')), 'conv_last')
    noeuds.append(helper.make_node('Identity', [out], ['sortie']))
    g = helper.make_graph(
        noeuds,
        'rrdbnet',
        [helper.make_tensor_value_info('entree', TensorProto.FLOAT, [1, 3, None, None])],
        [helper.make_tensor_value_info('sortie', TensorProto.FLOAT, [1, 3, None, None])],
        inits,
    )
    m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 13)])
    m.ir_version = 8
    return m


def agrandir_image(session, img, tuile=192, marge=12):
    h, w = img.shape[:2]
    sortie = np.zeros((h * 4, w * 4, 3), np.float32)
    for y0 in range(0, h, tuile):
        for x0 in range(0, w, tuile):
            ya, xa = max(y0 - marge, 0), max(x0 - marge, 0)
            yb, xb = min(y0 + tuile + marge, h), min(x0 + tuile + marge, w)
            morceau = img[ya:yb, xa:xb].transpose(2, 0, 1)[None]
            r = session.run(None, {'entree': morceau})[0][0].transpose(1, 2, 0)
            oy, ox = (y0 - ya) * 4, (x0 - xa) * 4
            th, tw = (min(y0 + tuile, h) - y0) * 4, (min(x0 + tuile, w) - x0) * 4
            sortie[y0 * 4 : y0 * 4 + th, x0 * 4 : x0 * 4 + tw] = r[oy : oy + th, ox : ox + tw]
            print(f'  tuile {y0},{x0}', flush=True)
    return sortie


if __name__ == '__main__':
    poids, entree, sortie = sys.argv[1:4]
    tuile = int(sys.argv[4]) if len(sys.argv) > 4 else 192
    modele = construire_graphe(lire_poids(poids))
    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session = ort.InferenceSession(modele.SerializeToString(), opts, providers=['CPUExecutionProvider'])
    img = np.asarray(Image.open(entree).convert('RGB')).astype(np.float32) / 255.0
    res = agrandir_image(session, img, tuile)
    Image.fromarray((np.clip(res, 0, 1) * 255).round().astype(np.uint8)).save(sortie)
    print('fait', res.shape)
