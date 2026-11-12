"""Calcula con XLB el flujo usando una lectura de la sección de ensayo.
Las unidades físicas se convierten a red; el resultado requiere validación experimental.
"""
import argparse
import base64
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import tempfile
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.flujo3d_datos import (
    MODELO, MALLA, PASOS, VISCOSIDAD, FORMATO_CAMPO,
    VELOCIDAD_RED_BASE, PASO_CM, SECCION_CM, ORIGEN_CM,
    AIRE, validar_geometria,
)


def evento(**datos):
    mensaje = json.dumps(datos, ensure_ascii=True, allow_nan=False)
    print("TUNELAB_FLOW " + mensaje, flush=True)


def calcular(ruta_entrada, ruta_salida):
    inicio = perf_counter()
    evento(fase="preparando", paso=0, mensaje="Preparando el motor 3D…")
    cache = preparar_entorno()
    from flujo3d_geometria import preparar_solido

    datos = ruta_entrada.read_bytes()
    medidas = validar_geometria(datos)
    evento(fase="geometria", paso=0,
           mensaje="Convirtiendo el objeto en un sólido para el cálculo…")
    puntos, geometria = preparar_solido(datos, MALLA)
    velocidad_entrada = VELOCIDAD_RED_BASE

    motor, id_objeto = preparar_simulacion(cache, puntos, velocidad_entrada)
    resultado = ejecutar_simulacion(motor, id_objeto, puntos, velocidad_entrada, inicio)
    guardar_resultado(ruta_salida, medidas, geometria, resultado, inicio)
    evento(fase="completado", paso=PASOS, mensaje="Mapas calculados.")


def preparar_entorno():
    cache = ROOT / "tmp/evaluacion-xlb"
    (cache / "temp").mkdir(parents=True, exist_ok=True)
    tempfile.tempdir = str(cache / "temp")
    os.environ.setdefault("MPLCONFIGDIR", str(cache / "matplotlib"))
    for paquete, version in (("xlb", "0.3.1"), ("warp-lang", "1.10.0")):
        if importlib.metadata.version(paquete) != version:
            raise ValueError(
                "El servidor necesita las versiones de XLB y Warp verificadas para esta prueba."
            )
    return cache


def crear_contorno(malla, puntos_solidos, velocidad_entrada):
    import numpy as np
    from xlb.operator.boundary_condition import (
        FullwayBounceBackBC, HalfwayBounceBackBC, RegularizedBC, ExtrapolationOutflowBC,
    )

    bordes = malla.bounding_box_indices()
    caras = malla.bounding_box_indices(remove_edges=True)
    # Se unen las cuatro paredes y se eliminan los puntos repetidos en las aristas.
    paredes = [bordes[nombre] for nombre in ("bottom", "top", "front", "back")]
    indices_paredes = np.unique(np.concatenate(paredes, axis=1), axis=1).tolist()
    objeto = HalfwayBounceBackBC(indices=puntos_solidos.T.tolist())
    condiciones = [
        FullwayBounceBackBC(indices=indices_paredes),
        RegularizedBC(
            "velocity", prescribed_value=(velocidad_entrada, 0.0, 0.0),
            indices=caras["left"],
        ),
        ExtrapolationOutflowBC(indices=caras["right"]),
        objeto,
    ]
    return condiciones, objeto.id


def preparar_simulacion(cache, puntos_solidos, velocidad_entrada):
    import warp as wp
    import xlb
    from xlb.compute_backend import ComputeBackend
    from xlb.precision_policy import PrecisionPolicy
    from xlb.grid import grid_factory
    from xlb.operator.stepper import IncompressibleNavierStokesStepper

    wp.config.kernel_cache_dir = str(cache / "warp-cache")
    wp.init()
    if not wp.is_cuda_available():
        raise ValueError(
            "El servidor no dispone de una GPU CUDA. "
            "El cálculo no se ejecutará en el ordenador del alumno."
        )
    wp.set_device("cuda:0")

    backend = ComputeBackend.WARP
    precision = PrecisionPolicy.FP32FP32
    velocidades = xlb.velocity_set.D3Q27(precision_policy=precision, compute_backend=backend)
    xlb.init(
        velocity_set=velocidades, default_backend=backend,
        default_precision_policy=precision,
    )
    malla = grid_factory(MALLA, compute_backend=backend)
    condiciones, id_objeto = crear_contorno(malla, puntos_solidos, velocidad_entrada)
    motor = IncompressibleNavierStokesStepper(
        grid=malla, boundary_conditions=condiciones, collision_type="SmagorinskyLESBGK",
    )
    return motor, id_objeto


def ejecutar_simulacion(motor, id_objeto, puntos_solidos, velocidad_entrada, inicio):
    import numpy as np
    import warp as wp

    # f0 y f1 guardan las distribuciones internas de XLB entre pasos.
    f0, f1, mascara_contorno, mascara_faltantes = motor.prepare_fields()
    densidad = wp.zeros((1, *MALLA), dtype=wp.float32)
    velocidad = wp.zeros((3, *MALLA), dtype=wp.float32)
    if not (mascara_contorno.numpy()[0] == id_objeto).any():
        raise ValueError("No se ha podido introducir la superficie del objeto en el cálculo.")

    solidos = np.zeros(MALLA, dtype=bool)
    solidos[tuple(puntos_solidos.T)] = True
    solidos[:, [0, -1], :] = True
    solidos[:, :, [0, -1]] = True
    fluido = ~solidos
    # Relajación LBM: tau = 0.5 + 3ν y omega = 1/tau. Véase docs/FLUJO_3D.md.
    omega = 1.0 / (0.5 + 3.0 * VISCOSIDAD)
    comprobaciones = []
    segundos_preparacion = perf_counter() - inicio
    inicio_calculo = perf_counter()

    # Se comprueban los resultados y se informa del progreso cada 200 pasos.
    for primer_paso in range(0, PASOS, 200):
        fin_bloque = min(primer_paso + 200, PASOS)
        for paso in range(primer_paso, fin_bloque):
            f0, f1 = motor(f0, f1, mascara_contorno, mascara_faltantes, omega, paso)
            f0, f1 = f1, f0

        motor.macroscopic(f0, densidad, velocidad)
        wp.synchronize()
        densidad_fluido = densidad.numpy()[0][fluido]
        velocidad_cpu = velocidad.numpy()
        rapidez = np.linalg.norm(velocidad_cpu, axis=0)
        densidad_min = densidad_fluido.min()
        densidad_max = densidad_fluido.max()
        rapidez_max = rapidez[fluido].max()
        flujo_valido = (
            np.isfinite(velocidad_cpu[:, fluido]).all()
            and np.isfinite(densidad_fluido).all()
            and densidad_min > 0.7
            and densidad_max < 1.3
            and rapidez_max < 0.3
        )
        if not flujo_valido:
            raise ValueError(
                "El flujo ha salido de los límites numéricos de esta prueba. "
                "Prueba menor tamaño o velocidad; no se mostrará un mapa inestable."
            )
        comprobaciones.append({
            "paso": fin_bloque,
            "densidad_min": float(densidad_min),
            "densidad_max": float(densidad_max),
            "rapidez_max": float(rapidez_max),
        })
        evento(fase="calculando", paso=fin_bloque,
               mensaje=f"Calculando flujo: {fin_bloque} de {PASOS} pasos…")

    segundos_calculo = perf_counter() - inicio_calculo
    return {
        "volumen": crear_volumen(rapidez, solidos, velocidad_entrada),
        "comprobaciones": comprobaciones,
        "velocidad_red": velocidad_entrada,
        "preparacion_s": round(segundos_preparacion, 2),
        "calculo_s": round(segundos_calculo, 2),
    }


def crear_volumen(rapidez, solidos, velocidad_entrada):
    # Rapidez relativa a la entrada; -1 marca el sólido. Orden C: Z, después Y y X.
    rapidez /= velocidad_entrada
    rapidez[solidos] = -1
    return {
        "formato": FORMATO_CAMPO,
        "malla": list(MALLA),
        "origen_cm": ORIGEN_CM,
        "paso_cm": PASO_CM,
        "datos": base64.b64encode(rapidez.astype("<f4").tobytes(order="C")).decode("ascii"),
    }


def guardar_resultado(ruta, medidas, geometria, resultado, inicio):
    resultado.update({
        "modelo": MODELO,
        "pasos": PASOS,
        "malla": MALLA,
        "seccion_cm": SECCION_CM,
        "medidas_objeto_cm": medidas,
        "viscosidad_red": VISCOSIDAD,
        "modelo_turbulencia": "SmagorinskyLESBGK",
        "coeficiente_smagorinsky": 0.17,
        "condiciones_aire": dict(AIRE, velocidadEntradaMs=AIRE['velocidadMs']),
        "tiempo_simulado_s": PASOS * AIRE['segundosPorPaso'],
        "reynolds_lado_mayor": round(
            resultado["velocidad_red"] * (max(medidas) / PASO_CM) / VISCOSIDAD, 1
        ),
        "total_s": round(perf_counter() - inicio, 2),
        "geometria": geometria,
        "aviso": (
            "Flujo 3D transitorio con condiciones medidas en la sección. "
            "La entrada uniforme usa la lectura GUST; no reproduce las rachas en el tiempo. "
            "Sin validación experimental ni estudio de convergencia. La malla de "
            f"{PASO_CM:g} cm no resuelve todos los detalles ni las escalas de turbulencia."
        ),
    })
    ruta.write_text(json.dumps(resultado, ensure_ascii=True, allow_nan=False), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--modelo-esperado")
    args = parser.parse_args()
    os.environ.setdefault("OMP_NUM_THREADS", "2")

    try:
        if args.modelo_esperado and args.modelo_esperado != MODELO:
            raise ValueError(
                "La configuración del túnel ha cambiado. Reinicia el servidor antes de calcular."
            )
        calcular(args.input, args.output)
    except ValueError as error:
        evento(fase="error", mensaje=str(error))
        raise SystemExit(2)
    except Exception:
        import traceback

        traceback.print_exc()
        evento(fase="error",
               mensaje="El motor 3D no ha podido terminar. Consulta el registro del servidor.")
        raise SystemExit(1)
