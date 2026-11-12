"""Pruebas de geometría; ejecutar con el entorno de cálculo, no el de la API."""
import importlib.util
import io
import json
from pathlib import Path
import unittest

import numpy as np
import trimesh

spec = importlib.util.spec_from_file_location("conducto", Path(__file__).resolve().parents[1] / "scripts/preparar-conducto-tunel.py")
conducto = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conducto)


def cuadrado(radio):
    points = [[0, -radio, -radio], [0, radio, -radio], [0, radio, radio], [0, -radio, radio]]
    return np.array([[points[i], points[(i+1) % 4]] for i in range(4)], dtype=float)


class ConductoTests(unittest.TestCase):
    def test_se_elige_la_cara_interior_y_no_la_envolvente(self):
        segments = np.concatenate((cuadrado(.4), cuadrado(.35)))
        radii = conducto.radios_interiores(segments, [0, 0])
        self.assertAlmostEqual(radii[0], .35)
        self.assertAlmostEqual(radii[12], .35 * 2 ** .5)
        self.assertAlmostEqual(conducto.area_perfil(radii), .49)

    def test_un_hueco_no_se_rellena_automaticamente(self):
        with self.assertRaisesRegex(ValueError, "abertura"):
            conducto.radios_interiores(cuadrado(.35)[:-1], [0, 0])
        with self.assertRaises(ValueError):
            conducto.radios_interiores(np.full((1, 2, 3), np.nan), [0, 0])

    def test_el_volumen_cerrado_tiene_la_escala_y_orientacion_correctas(self):
        radii = conducto.radios_interiores(cuadrado(35), [0, 0]).tolist()
        profiles = [{"x_cm": x, "radios_cm": radii} for x in [-50, 0, 50]]
        mesh = conducto.malla_volumen(profiles)
        self.assertTrue(mesh.is_watertight)
        self.assertTrue(mesh.is_winding_consistent)
        self.assertAlmostEqual(mesh.volume / 1e6, .49)
        np.testing.assert_allclose(mesh.extents, [100, 70, 70])

    def test_la_estimacion_cuenta_toda_la_caja_no_solo_el_aire(self):
        r = conducto.radios_interiores(cuadrado(10), [0, 0]).tolist()
        profiles = [{"x_cm": x, "radios_cm": r} for x in [-10, 10]]
        result = conducto.comprobar_malla(profiles, 2)
        self.assertEqual(result["componentes_aire"], 1)
        self.assertGreater(result["nodos_caja"], result["nodos_aire"])
        self.assertAlmostEqual(result["memoria_minima_dos_campos_D3Q27_MiB"], round(result["nodos_caja"] * 216 / 1024**2, 1))
        self.assertEqual(json.loads(json.dumps(result, allow_nan=False)), result)

    def test_cad_real_se_exporta_con_escala_y_pendientes_explicitos(self):
        data, mesh = conducto.preparar(conducto.ROOT / "public/models/tfg.glb")
        self.assertFalse(data["apto_para_calculo"])
        self.assertTrue(data["pendientes"])
        self.assertTrue(data["comprobaciones"]["saltos_salida_mayores_2cm"])
        self.assertLess(max(data["comprobaciones"]["desajuste_juntas_cm"]), .2)
        self.assertEqual(json.loads(json.dumps(data, allow_nan=False)), data)
        surfaces = data["superficies"]
        inlet = surfaces["entrada"]
        outlet = surfaces["salida"]
        self.assertAlmostEqual(mesh.face_normals[inlet["caras_desde"]][0], -1)
        self.assertAlmostEqual(mesh.face_normals[outlet["caras_desde"]][0], 1)
        mesh.apply_scale(.01)
        loaded = trimesh.load(io.BytesIO(mesh.export(file_type="glb")), file_type="glb", force="mesh", process=False)
        self.assertTrue(loaded.is_watertight)
        np.testing.assert_allclose(loaded.extents, mesh.extents, atol=1e-6)
        self.assertAlmostEqual(loaded.extents[0], 3.83, places=4)
        self.assertAlmostEqual(loaded.volume, mesh.volume, places=5)


if __name__ == "__main__":
    unittest.main()
