"""Preparación de un sólido para XLB. No repara ni sustituye la geometría recibida."""
import numpy as np
import trimesh
from app.flujo3d_datos import MALLA, PASO_CM, FLUJO


def preparar_solido(datos, shape=MALLA, paso_cm=PASO_CM):
    points = np.frombuffer(datos, dtype="<f4").astype(np.float64).reshape(-1, 3) / paso_cm
    mesh = trimesh.Trimesh(vertices=points, faces=np.arange(len(points)).reshape(-1, 3), process=True)
    if not mesh.is_watertight or not mesh.is_winding_consistent:
        raise ValueError("La malla tiene bordes abiertos o caras con orientación incoherente. Corrígela antes de calcular.")
    if not mesh.nondegenerate_faces().all() or len(mesh.unique_faces().nonzero()[0]) != len(mesh.faces):
        raise ValueError("La malla contiene caras degeneradas o duplicadas.")
    components = mesh.split(only_watertight=False)
    if len(components) > 64 or any(not part.is_volume for part in components):
        raise ValueError("Las piezas deben ser volúmenes cerrados con sus caras orientadas hacia fuera (máximo 64 piezas).")
    # Trimesh subdivides long triangles before voxelization. Bound that work too.
    longest = np.linalg.norm(mesh.triangles - np.roll(mesh.triangles, 1, axis=1), axis=2).max(axis=1)
    subdivisions = np.maximum(0, np.ceil(np.log2(np.maximum(longest, 0.5) / 0.5)))
    if np.sum(4.0 ** subdivisions) > 2_000_000:
        raise ValueError("La superficie exige demasiada preparación para esta prueba. Reduce el tamaño o simplifica la malla.")
    mesh.apply_translation((np.asarray(shape) - 1) / 2)
    solid = np.rint(mesh.voxelized(pitch=1.0, max_iter=8).fill().points).astype(int)
    margen = FLUJO['separacionParedCeldas']
    if not len(solid) or (solid < margen).any() or (solid >= np.asarray(shape) - margen).any():
        raise ValueError("El objeto no deja espacio suficiente dentro de la sección.")
    projection = len(np.unique(solid[:, 1:], axis=0)) / ((shape[1] - 2) * (shape[2] - 2))
    if projection > FLUJO['bloqueoMaximo'] or len(solid) > 50000:
        raise ValueError(f"El objeto bloquea demasiado la sección para esta prueba rápida. Reduce su tamaño (máximo {FLUJO['bloqueoMaximo'] * 100:g} % de área frontal en la malla y 50.000 vóxeles sólidos).")
    return solid, {"triangulos": len(mesh.faces), "piezas": len(components), "voxeles_solidos": len(solid), "bloqueo": round(projection, 5)}
