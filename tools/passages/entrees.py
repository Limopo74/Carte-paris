# Passages couverts : (id, nom, lat, lng du repère, entrée A, entrée B) — entrées géocodées par l'IGN le 18 nov. 2026
P = [
 ('vero-dodat', 'Galerie Véro-Dodat', 48.86290, 2.34005, (48.862715, 2.340788), (48.863049, 2.339821)),
 ('vivienne', 'Galerie Vivienne', 48.86667, 2.33972, (48.866215, 2.339481), (48.867136, 2.339191)),
 ('colbert', 'Galerie Colbert', 48.86683, 2.33936, (48.866325, 2.338931), (48.866499, 2.338842)),
 ('panoramas', 'Passage des Panoramas', 48.87154, 2.34179, (48.871506, 2.34192), (48.870907, 2.34128)),
 ('choiseul', 'Passage Choiseul', 48.86810, 2.33550, (48.867235, 2.335139), (48.868824, 2.335949)),
 ('jouffroy', 'Passage Jouffroy', 48.87255, 2.34214, (48.871839, 2.341972), (48.872998, 2.342217)),
 ('verdeau', 'Passage Verdeau', 48.87353, 2.34232, (48.873131, 2.342156), (48.873744, 2.342509)),
 ('grand-cerf', 'Passage du Grand-Cerf', 48.86481, 2.34925, (48.864667, 2.350108), (48.864996, 2.348618)),
 ('bourg-labbe', 'Passage du Bourg-l\'Abbé', 48.86453, 2.35056, (48.864601, 2.350298), (48.864515, 2.350924)),
 ('caire', 'Passage du Caire', 48.86833, 2.34972, None, None),
 ('brady', 'Passage Brady', 48.87113, 2.35528, (48.871601, 2.353784), (48.871223, 2.355091)),
 ('prado', 'Passage du Prado', 48.87003, 2.35383, None, None),
]
if __name__ == '__main__':
    for pid, n, a, g, A, B in P:
        if A: print(pid, f'https://routing.openstreetmap.de/routed-foot/route/v1/driving/{A[1]},{A[0]};{B[1]},{B[0]}?overview=full&geometries=polyline')
