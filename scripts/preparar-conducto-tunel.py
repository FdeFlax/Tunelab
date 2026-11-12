"""Extrae perfiles del CAD y prepara un conducto revisable, sin activar CFD.

Solo para el GLB del proyecto: no es un importador general de conductos. Las
paredes de la sección de ensayo se idealizan explícitamente con la cota nominal.
No se reparan huecos del CAD ni se suavizan cambios de sección automáticamente.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import numpy as np
import trimesh
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[1]
ANGULOS = 96


def malla_mundial(scene, nombre):
    transform, key = scene.graph[nombre]
    mesh = scene.geometry[key].copy()
    mesh.apply_transform(transform)
    return mesh


def radios_interiores(segmentos, centro, angulos=ANGULOS):
    """Primera intersección positiva desde el eje en cada dirección Y/Z.

    Presupone un conducto estrellado respecto al eje. Un rayo sin pared es un
    error explícito; no se sustituye por la envolvente ni por el radio anterior.
    """
    lines = np.asarray(segmentos, dtype=float)
    if lines.ndim != 3 or lines.shape[1:] != (2, 3) or not np.isfinite(lines).all():
        raise ValueError("Corte sin segmentos válidos.")
    theta = np.arange(angulos) * (2 * np.pi / angulos)
    directions = np.column_stack((np.cos(theta), np.sin(theta)))
    starts = lines[:, 0, 1:] - np.asarray(centro)
    edges = lines[:, 1, 1:] - lines[:, 0, 1:]
    cross = lambda a, b: a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]
    radii = []
    for d in directions:
        denominator = cross(d, edges)
        valid = np.abs(denominator) > 1e-12
        t = np.divide(cross(starts, edges), denominator, out=np.full(len(edges), np.nan), where=valid)
        u = np.divide(cross(starts, d), denominator, out=np.full(len(edges), np.nan), where=valid)
        hits = t[valid & (t > 1e-8) & (u >= -1e-7) & (u <= 1 + 1e-7)]
        if not len(hits):
            raise ValueError("El corte tiene una abertura o el eje queda fuera del conducto.")
        radii.append(float(hits.min()))
    return np.asarray(radii)


def area_perfil(radios):
    r = np.asarray(radios)
    return float(0.5 * np.sin(2 * np.pi / len(r)) * np.sum(r * np.roll(r, -1)))


def extraer_tramo(mesh, centro, paso_m=0.01):
    lo, hi = mesh.bounds[:, 0]
    xs = np.linspace(lo, hi, round((hi - lo) / paso_m) + 1)
    profiles = []
    for x in xs:
        # Cortar exactamente sobre una tapa/arista no define el interior.
        sample = float(np.clip(x, lo + 1e-5, hi - 1e-5))
        lines = trimesh.intersections.mesh_plane(mesh, [1, 0, 0], [sample, 0, 0])
        r = radios_interiores(lines, centro[1:]) * 100
        profiles.append({"x_cm": round(float((x - centro[0]) * 100), 5),
                         "radios_cm": np.round(r, 5).tolist()})
    return profiles


def malla_volumen(perfiles):
    """Volumen cerrado. Las tapas son puertos de cálculo, no paredes físicas."""
    theta = np.arange(ANGULOS) * (2 * np.pi / ANGULOS)
    points = [[p["x_cm"], r * np.cos(t), r * np.sin(t)]
              for p in perfiles for r, t in zip(p["radios_cm"], theta)]
    faces = []
    for i in range(len(perfiles) - 1):
        for j in range(ANGULOS):
            a, b = i * ANGULOS + j, i * ANGULOS + (j + 1) % ANGULOS
            faces.extend([[a, b, a + ANGULOS], [b, b + ANGULOS, a + ANGULOS]])
    points.extend([[perfiles[0]["x_cm"], 0, 0], [perfiles[-1]["x_cm"], 0, 0]])
    first_center, last_center = len(points) - 2, len(points) - 1
    end = (len(perfiles) - 1) * ANGULOS
    for j in range(ANGULOS):
        k = (j + 1) % ANGULOS
        faces.extend([[first_center, k, j], [last_center, end + j, end + k]])
    mesh = trimesh.Trimesh(vertices=points, faces=faces, process=False)
    if mesh.volume < 0:
        mesh.invert()
    if not mesh.is_watertight or not mesh.is_winding_consistent or mesh.volume <= 0:
        raise ValueError("La propuesta no forma un volumen cerrado y orientado.")
    return mesh


def comprobar_malla(perfiles, paso_cm=2):
    """Conectividad del aire y coste geométrico; no ejecuta ni valida el flujo."""
    xs = np.array([p["x_cm"] for p in perfiles])
    radii = np.array([p["radios_cm"] for p in perfiles])
    theta = np.arange(ANGULOS) * 2 * np.pi / ANGULOS
    lo = np.array([xs.min(), (radii * np.cos(theta)).min(), (radii * np.sin(theta)).min()])
    hi = np.array([xs.max(), (radii * np.cos(theta)).max(), (radii * np.sin(theta)).max()])
    origin = np.floor(lo / paso_cm) * paso_cm
    shape = (np.ceil(hi / paso_cm) - np.floor(lo / paso_cm)).astype(int) + 1
    if math.prod(shape) > 10_000_000:
        raise ValueError("La revisión supera diez millones de nodos.")
    y, z = np.meshgrid(origin[1] + np.arange(shape[1]) * paso_cm,
                       origin[2] + np.arange(shape[2]) * paso_cm, indexing="ij")
    angle = np.mod(np.arctan2(z, y), 2 * np.pi)
    radius = np.hypot(y, z)
    fluid = np.zeros(shape, dtype=bool)
    for i in range(shape[0]):
        x = np.clip(origin[0] + i * paso_cm, xs[0], xs[-1])
        r = np.array([np.interp(x, xs, radii[:, j]) for j in range(ANGULOS)])
        limit = np.interp(angle, np.append(theta, 2 * np.pi), np.append(r, r[0]))
        fluid[i] = radius < limit
    _, components = label(fluid)
    if components != 1 or not fluid.any(axis=(1, 2)).all():
        raise ValueError("El conducto discretizado contiene bolsas de aire o tramos bloqueados.")
    nodes = int(math.prod(shape))
    return {"paso_cm": paso_cm, "malla": shape.tolist(), "nodos_caja": nodes,
            "nodos_aire": int(fluid.sum()), "componentes_aire": int(components),
            "memoria_minima_dos_campos_D3Q27_MiB": round(nodes * 27 * 4 * 2 / 1024**2, 1),
            "nota": "Estimación solo de dos campos de poblaciones. Excluye máscaras, campos auxiliares, compilación y otros recursos; no estima tiempo de cálculo. La caja se redondea hacia fuera al paso de malla; en esos extremos se prolonga el perfil de entrada/salida como máximo un paso."}


def preparar(source):
    scene = trimesh.load_scene(source)
    contraction = malla_mundial(scene, "Cube.012")
    chamber = malla_mundial(scene, "Caja.002")
    transition = malla_mundial(scene, "Circle.005")
    center = (chamber.bounds[0] + chamber.bounds[1]) / 2
    # Contraste de escala con cotas documentadas. No acredita medidas físicas.
    if not np.allclose([contraction.extents[0], chamber.extents[0], transition.extents[0]], [1.68, 1, 1.15], atol=.001):
        raise ValueError("El CAD ha cambiado de escala o de piezas; revisar la extracción.")
    if abs(contraction.bounds[1, 0] - chamber.bounds[0, 0]) > .001 or abs(chamber.bounds[1, 0] - transition.bounds[0, 0]) > .001:
        raise ValueError("Hay un hueco longitudinal entre las piezas principales.")
    before = extraer_tramo(contraction, center)
    after = extraer_tramo(transition, center)
    theta = np.arange(ANGULOS) * 2 * np.pi / ANGULOS
    nominal = 35 / np.maximum(np.abs(np.cos(theta)), np.abs(np.sin(theta)))
    middle = [{"x_cm": float(x), "radios_cm": np.round(nominal, 5).tolist()} for x in range(-50, 51)]
    joint_errors = [float(np.max(np.abs(np.asarray(before[-1]["radios_cm"]) - nominal))),
                    float(np.max(np.abs(np.asarray(after[0]["radios_cm"]) - nominal)))]
    if max(joint_errors) > .2:
        raise ValueError("Los puertos del CAD no encajan con la sección nominal a menos de 2 mm.")
    # Las dos juntas adoptan la sección nominal; la variación real se registra.
    profiles = before[:-1] + middle + after[1:]
    areas = [area_perfil(p["radios_cm"]) / 10000 for p in profiles]
    exit_radii = np.array([p["radios_cm"] for p in after])
    changes = np.max(np.abs(np.diff(exit_radii, axis=0)), axis=1)
    abrupt = [{"desde_x_cm": after[i]["x_cm"], "hasta_x_cm": after[i+1]["x_cm"], "salto_radial_cm": round(float(value), 3)}
              for i, value in enumerate(changes) if value > 2]
    windows = []
    for name in scene.graph.nodes_geometry:
        transform, key = scene.graph[name]
        geometry = scene.geometry[key]
        if getattr(getattr(geometry.visual, "material", None), "name", None) == "VIDRIO":
            glass = geometry.copy(); glass.apply_transform(transform)
            windows.append({"limites_cm": np.round((glass.bounds - center) * 100, 3).tolist()})
    data = {"version": "conducto-cad-revision-v1", "apto_para_calculo": False,
            "fuente": {"archivo": "public/models/tfg.glb", "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "unidad_CAD_asumida": "metro, coherente con cotas nominales; pendiente de confirmación física",
                       "centro_ensayo_CAD": center.tolist()},
            "convencion": "cm; X longitudinal, Y altura, Z ancho; origen en el centro de la sección nominal",
            "metodo": "Primera superficie radial en 96 direcciones por corte, a intervalos de aproximadamente 1 cm. Se presupone conducto estrellado respecto a su eje.",
            "tramos": [{"nombre": "Contracción", "desde_cm": -218, "hasta_cm": -50, "origen": "CAD: Cube.012"},
                       {"nombre": "Sección de ensayo", "desde_cm": -50, "hasta_cm": 50, "origen": "Idealización rectangular nominal 70 × 70 cm; no extracción completa de ventanas y marcos"},
                       {"nombre": "Transición de salida", "desde_cm": 50, "hasta_cm": 165, "origen": "CAD: Circle.005; no se presupone que sea un difusor expansivo"}],
            "no_incluye": ["boca y cámara de estabilización", "honeycomb y rejillas", "soporte y objetos", "ventilador y carcasa posterior"],
            "pendientes": ["Confirmar dimensiones interiores de la sección; la documentación discrepa entre 60 y 70 cm y los marcos/ventanas no coinciden con un conducto liso de 70 cm.",
                           "Confirmar el interior y la salida de la transición; el CAD incluye saltos cerca de su brida. No rellenar ni suavizar sin justificación.",
                           "Definir entrada, salida y condiciones del aire antes de calcular. El GLB no proporciona condiciones de funcionamiento."],
            "comprobaciones": {"desajuste_juntas_cm": joint_errors, "saltos_salida_mayores_2cm": abrupt,
                               "ventanas_CAD": windows, "area_entrada_m2": round(areas[0], 5),
                               "area_ensayo_nominal_m2": .49, "area_transicion_antes_brida_m2": round(area_perfil(after[-4]["radios_cm"]) / 10000, 5),
                               "area_ultimo_corte_m2": round(areas[-1], 5)},
            "perfiles": profiles}
    mesh = malla_volumen(profiles)
    wall_faces = (len(profiles) - 1) * ANGULOS * 2
    data["superficies"] = {"paredes": {"caras_desde": 0, "caras_hasta_exclusiva": wall_faces},
                           "entrada": {"caras_desde": wall_faces, "numero": ANGULOS, "paso": 2},
                           "salida": {"caras_desde": wall_faces + 1, "numero": ANGULOS, "paso": 2},
                           "nota": "Índices de triángulos, base cero. Las tapas cierran el volumen geométrico y representan puertos abiertos; no son paredes ni definen condiciones de contorno."}
    mesh.metadata.update({"revision": data["version"], "apto_para_calculo": False,
                          "superficies": data["superficies"]})
    data["comprobaciones"].update({"volumen_cerrado": bool(mesh.is_watertight), "volumen_m3": round(float(mesh.volume / 1e6), 5),
                                    "discretizaciones": [comprobar_malla(profiles, d) for d in [2, 1]]})
    return data, mesh


def dibujar(data, destination):
    cache = ROOT / "tmp/evaluacion-xlb/matplotlib"
    cache.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("MPLCONFIGDIR", str(cache))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    p = data["perfiles"]; x = np.array([s["x_cm"] for s in p]); r = np.array([s["radios_cm"] for s in p])
    theta = np.arange(ANGULOS) * 2 * np.pi / ANGULOS
    fig = plt.figure(figsize=(13, 8), facecolor="#f5f8fb")
    fig.suptitle("Conducto interior · propuesta para revisar", fontsize=19, y=.96, color="#17354d")
    fig.text(.5, .915, "3,83 m de tramo principal · geometría provisional, todavía sin cálculo de flujo", ha="center", fontsize=11, color="#526475")
    ax = fig.add_axes([.10, .44, .80, .46], projection="3d", facecolor="#f5f8fb")
    colors = [("#4c83ab", -219, -50), ("#d8973b", -50, 50), ("#479b91", 50, 166)]
    for color, lo, hi in colors:
        selected = np.where((x >= lo) & (x <= hi))[0]
        ix = np.unique(np.append(selected[::9], selected[-1]))
        ax.plot_wireframe(np.broadcast_to(x[ix, None], (len(ix), ANGULOS)), r[ix] * np.sin(theta), r[ix] * np.cos(theta),
                          rstride=1, cstride=12, color=color, linewidth=.8, alpha=.9)
    ax.set_box_aspect((3.83, 1.4, 1.4), zoom=1.08); ax.view_init(elev=19, azim=-67)
    ax.set_axis_off()
    a = fig.add_axes([.08, .13, .88, .32], facecolor="white")
    areas = [area_perfil(v) / 10000 for v in r]
    a.plot(x, areas, color="#244c68", linewidth=2)
    for (color, lo, hi), name in zip(colors, ["Contracción · 168 cm", "Ensayo · 100 cm", "Salida · 115 cm"]):
        a.axvspan(max(x[0], lo), min(x[-1], hi), color=color, alpha=.12, label=name)
    for jump in data["comprobaciones"]["saltos_salida_mayores_2cm"]:
        a.axvline(jump["hasta_x_cm"], color="#ba4949", linewidth=1)
    a.annotate("Brida pendiente de revisar", xy=(164, .47), xytext=(72, 1.1), color="#a23c3c", fontsize=9,
               arrowprops={"arrowstyle": "-", "color": "#a23c3c"})
    a.set(xlabel="Posición desde el centro de la sección de ensayo (cm)", ylabel="Área interior propuesta (m²)", ylim=(0, 2.12))
    a.grid(alpha=.15); a.legend(loc="upper right", fontsize=9)
    fig.text(.5, .04, "Ensayo idealizado: 70 × 70 cm. No incluye cámara de estabilización ni ventilador.", ha="center", fontsize=10, color="#526475")
    fig.text(.5, .018, "La curva muestra la geometría del conducto; no representa velocidades ni un resultado de simulación.", ha="center", fontsize=9, color="#526475")
    fig.savefig(destination, dpi=150); plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "output/revision-conducto")
    args = parser.parse_args()
    data, mesh = preparar(ROOT / "public/models/tfg.glb")
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "conducto.json").write_text(json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(",", ":")), encoding="utf-8")
    # GLB expresado en metros; su eje coincide con el centro del ensayo.
    mesh.apply_scale(.01)
    mesh.export(args.output / "conducto-provisional.glb")
    dibujar(data, args.output / "revision-conducto.png")
    print(json.dumps({"apto_para_calculo": data["apto_para_calculo"], "perfiles": len(data["perfiles"]), **data["comprobaciones"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
