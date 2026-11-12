import matplotlib.pyplot as plt
from skimage.feature import peak_local_max

FID = 55839

poligono = validos.loc[validos["fid"] == FID].iloc[0].geometry
mascara, _ = rasterizar_poligono(poligono, PIXEL_LENGTH)

m = np.pad(mascara.astype(bool), 1)
dist = ndi.distance_transform_edt(m)
centros = peak_local_max(dist, min_distance=MIN_PIXELS,labels=m.astype(np.uint8), exclude_border=False) - 1
regiones = separar_lechugas(mascara, min_distance=MIN_PIXELS)
fig, ax = plt.subplots(1, 3, figsize=(12, 4))

for a, imagen, titulo in zip(ax, [mascara, dist[1:-1, 1:-1], regiones],["Máscara", f"Centros: {len(centros)}", "Watershed"]):
    a.imshow(imagen, cmap="magma" if titulo.startswith("Centros") else "nipy_spectral")
    a.axis("off")
    a.set_title(titulo)

for a in ax[1:]:
    a.scatter(centros[:, 1], centros[:, 0], c="cyan", marker="x", s=80)

plt.tight_layout()
plt.show()