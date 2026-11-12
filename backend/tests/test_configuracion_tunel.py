import copy
import importlib
import math
import unittest
from datetime import timedelta
from unittest.mock import patch

from app.configuracion_tunel import TUNEL, parametros_flujo, propiedades_aire, validar_configuracion
from app.flujo3d_datos import identificar_modelo, MODELO, FLUJO, validar_geometria
from test_flujo3d import cube_bytes


class ConfiguracionTunelTests(unittest.TestCase):
    def test_la_firma_cambia_al_variar_las_condiciones_de_calculo(self):
        for cambiar in (
            lambda c: c['geometria']['seccionEnsayo'].update(anchoM=0.5),
            lambda c: c['aerodinamica'].update(pasoCm=2),
            lambda c: c['aerodinamica'].update(pasos=100),
            lambda c: c['aerodinamica']['mediciones'][0].update(temperaturaC=25),
            lambda c: c['aerodinamica']['mediciones'][0].update(presionAbsolutaPa=99000),
            lambda c: c['aerodinamica']['mediciones'][0].update(humedadRelativaPct=40),
            lambda c: c['aerodinamica']['mediciones'][0].update(velocidadMs=18),
            lambda c: c['aerodinamica'].update(medicionActiva='foto-2'),
        ):
            c = copy.deepcopy(TUNEL)
            cambiar(c)
            self.assertNotEqual(identificar_modelo(parametros_flujo(c)), MODELO)
        self.assertEqual(identificar_modelo(dict(reversed(list(FLUJO.items())))), MODELO)

    def test_los_limites_de_geometria_siguen_la_seccion(self):
        c = copy.deepcopy(TUNEL)
        c['geometria']['seccionEnsayo']['anchoM'] = 0.18
        with patch('app.flujo3d_datos.FLUJO', parametros_flujo(c)):
            with self.assertRaisesRegex(ValueError, 'ancho: entre 2 y 12 cm'):
                validar_geometria(cube_bytes())

    def test_simulador_y_presion_estimada_usan_el_json(self):
        import app.control_tunel as control
        original = copy.deepcopy(TUNEL)
        c = copy.deepcopy(TUNEL)
        c['geometria']['seccionEnsayo'].update(anchoM=0.5, altoM=0.4)
        c['calibracion']['velocidad']['puntos'] = [dict(consignaPct=25, velocidadMs=2), dict(consignaPct=75, velocidadMs=8)]
        c['ambiente'].update(temperaturaC=30, presionAtmosfericaPa=90000)
        c['simulador'].update(temperaturaInicialC=24, consignaInicialPct=25,
                              frecuenciaMaximaHz=60, corrienteMaximaA=8, rpmMaximas=1500,
                              rampaPctPorSegundo=10)
        try:
            with patch.dict(TUNEL, c, clear=True):
                importlib.reload(control)
                self.assertAlmostEqual(control.AREA_SECCION_ENSAYO_M2, 0.2)
                self.assertEqual(control.calcular_velocidad_por_potencia(0), 2)
                self.assertEqual(control.calcular_velocidad_por_potencia(50), 5)
                self.assertEqual(control.calcular_velocidad_por_potencia(100), 8)
                self.assertAlmostEqual(control.DENSIDAD_AIRE, 90000 / (287.05 * 303.15))
                simulador = control.ControladorTunelSimulado()
                inicial = simulador.leer_estado()
                self.assertEqual(inicial['temperatura_c'], 24)
                self.assertEqual(inicial['potencia_objetivo'], 25)
                simulador.encender(50)
                simulador._estado.actualizado_en -= timedelta(seconds=2)
                self.assertAlmostEqual(simulador.leer_estado()['potencia_aplicada'], 20, places=2)
                simulador._estado.actualizado_en -= timedelta(seconds=10)
                estado = simulador.leer_estado()
                self.assertEqual(estado['frecuencia_hz'], 30)
                self.assertEqual(estado['corriente_a'], 4)
                self.assertEqual(estado['rpm'], 750)
        finally:
            TUNEL.clear()
            TUNEL.update(original)
            importlib.reload(control)

    def test_el_capturador_usa_el_intervalo_configurado(self):
        from app.capturas import CapturadorTunel
        with patch.dict(TUNEL['sensor'], intervaloCapturaSegundos=2.5):
            self.assertEqual(CapturadorTunel(None, None).intervalo, 2.5)
            self.assertEqual(CapturadorTunel(None, None, intervalo=0.05).intervalo, 0.05)

    def test_rechaza_consignas_y_tiempos_invalidos(self):
        for cambiar in (
            lambda c: c['sensor'].update(intervaloCapturaSegundos=0),
            lambda c: c['simulador'].update(consignaInicialPct=101),
            lambda c: c['simulador'].update(consignasRapidasPct=[25, 25]),
            lambda c: c['simulador'].update(consignasRapidasPct=[True]),
            lambda c: c['aerodinamica'].update(medicionActiva='foto-5'),
            lambda c: c['aerodinamica'].update(medicionActiva='inexistente'),
            lambda c: c['aerodinamica']['mediciones'][0].update(presionAbsolutaPa=1007.6),
            lambda c: c['aerodinamica']['mediciones'][0].update(humedadRelativaPct=101),
            lambda c: c['aerodinamica']['mediciones'][0].update(temperaturaC=-1),
            lambda c: c['aerodinamica']['mediciones'][0].update(id='foto-2'),
        ):
            c = copy.deepcopy(TUNEL)
            cambiar(c)
            with self.assertRaisesRegex(ValueError, 'tunel.json'):
                parametros_flujo(c)

    def test_rechaza_configuracion_invalida(self):
        for valor in (0, -1, math.inf, True, '1'):
            c = copy.deepcopy(TUNEL)
            c['aerodinamica']['pasoCm'] = valor
            with self.assertRaisesRegex(ValueError, 'tunel.json'):
                parametros_flujo(c)
        c = copy.deepcopy(TUNEL)
        c['aerodinamica']['pasoCm'] = 0.1
        with self.assertRaisesRegex(ValueError, 'nodos'):
            parametros_flujo(c)

    def test_conversion_fisica_conserva_velocidad_y_reynolds(self):
        for lectura in TUNEL['aerodinamica']['mediciones']:
            if lectura['velocidadMs'] == 0:
                continue
            c = copy.deepcopy(TUNEL)
            c['aerodinamica']['medicionActiva'] = lectura['id']
            f = parametros_flujo(c)
            dx, aire = f['pasoCm'] / 100, f['aire']
            self.assertAlmostEqual(f['velocidadRedBase'] * dx / aire['segundosPorPaso'], lectura['velocidadMs'])
            re_fisico = lectura['velocidadMs'] * 0.2 / aire['viscosidadCinematicaM2s']
            re_red = f['velocidadRedBase'] * (0.2 / dx) / f['viscosidadRed']
            self.assertAlmostEqual(re_fisico, re_red)
        self.assertAlmostEqual(FLUJO['aire']['densidadKgM3'], 1.18178753594, places=10)
        self.assertAlmostEqual(FLUJO['aire']['viscosidadCinematicaM2s'], 1.54335222725e-5, places=14)
        self.assertEqual(len(TUNEL['aerodinamica']['mediciones']), 5)

    def test_propiedades_del_aire_seco_humedo_y_caliente(self):
        lectura = dict(temperaturaC=0, presionAbsolutaPa=101325, humedadRelativaPct=0)
        seco = propiedades_aire(lectura)
        self.assertAlmostEqual(seco['densidadKgM3'], 1.2923, delta=5e-5)
        self.assertAlmostEqual(seco['viscosidadDinamicaPaS'], 1.716e-5, delta=1e-8)
        humedo = propiedades_aire(dict(lectura, humedadRelativaPct=100))
        caliente = propiedades_aire(dict(lectura, temperaturaC=40))
        self.assertLess(humedo['densidadKgM3'], seco['densidadKgM3'])
        self.assertLess(caliente['densidadKgM3'], seco['densidadKgM3'])
        self.assertGreater(caliente['viscosidadDinamicaPaS'], seco['viscosidadDinamicaPaS'])

    def test_control_no_prepara_el_calculo_aerodinamico(self):
        c = copy.deepcopy(TUNEL)
        c['aerodinamica']['medicionActiva'] = 'pendiente'
        validar_configuracion(c)
        with self.assertRaises(ValueError):
            parametros_flujo(c)
