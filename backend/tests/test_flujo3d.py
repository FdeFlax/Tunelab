import asyncio
import base64
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "sqlite://")
from app.flujo3d_datos import MAX_BYTES, MODELO, PASOS, BYTES_CAMPO, FORMATO_CAMPO, validar_geometria, validar_resultado
from app.flujo3d_trabajos import FlujoOcupado, GestorFlujo3D


def cube_bytes():
    vertices = [(-7, -7, -7), (7, -7, -7), (7, 7, -7), (-7, 7, -7), (-7, -7, 7), (7, -7, 7), (7, 7, 7), (-7, 7, 7)]
    faces = [(0, 2, 1), (0, 3, 2), (4, 5, 6), (4, 6, 7), (0, 1, 5), (0, 5, 4), (3, 7, 6), (3, 6, 2), (0, 4, 7), (0, 7, 3), (1, 2, 6), (1, 6, 5)]
    coords = [v for face in faces for i in face for v in vertices[i]]
    return struct.pack('<' + 'f' * len(coords), *coords)


def result_fixture():
    volume = {"formato": FORMATO_CAMPO, "malla": [101, 71, 71], "origen_cm": [-50, -35, -35], "paso_cm": 1,
              "datos": base64.b64encode(struct.pack('<f', 1) * (BYTES_CAMPO // 4)).decode('ascii')}
    return {"modelo": MODELO, "pasos": PASOS, "volumen": volume}


class ContratoTests(unittest.TestCase):
    def test_script_arranca_sin_importar_el_motor_para_mostrar_ayuda(self):
        script = Path(__file__).resolve().parents[2] / "scripts/calcular-flujo3d.py"
        resultado = subprocess.run([sys.executable, str(script), "--help"],
                                   capture_output=True, text=True, timeout=15)
        self.assertEqual(resultado.returncode, 0, resultado.stderr)
        self.assertIn("--modelo-esperado", resultado.stdout)

    def test_limites_y_coordenadas(self):
        self.assertEqual(validar_geometria(cube_bytes()), [14, 14, 14])
        for data in (b"", cube_bytes()[:-1], b"0" * (MAX_BYTES + 1), struct.pack('<f', float('nan')) + cube_bytes()[4:]):
            with self.assertRaises(ValueError):
                validar_geometria(data)
        values = list(struct.unpack('<108f', cube_bytes()))
        values[0] = -20
        with self.assertRaisesRegex(ValueError, 'centrado'):
            validar_geometria(struct.pack('<108f', *values))
        with self.assertRaisesRegex(ValueError, '2 y 60'):
            validar_geometria(struct.pack('<108f', *(v * 0.1 for v in struct.unpack('<108f', cube_bytes()))))

    def test_minimo_de_dos_centimetros_en_cada_eje(self):
        points = struct.unpack('<108f', cube_bytes())
        for axis in range(3):
            dimensions = [10, 10, 10]
            dimensions[axis] = 2
            data = struct.pack('<108f', *(v * dimensions[i % 3] / 14 for i, v in enumerate(points)))
            self.assertEqual(validar_geometria(data), dimensions)
            for invalid in (1.99, 60.01):
                dimensions[axis] = invalid
                data = struct.pack('<108f', *(v * dimensions[i % 3] / 14 for i, v in enumerate(points)))
                with self.assertRaisesRegex(ValueError, '2 y 60'):
                    validar_geometria(data)

    def test_no_publica_volumenes_incompletos_o_no_finitos(self):
        self.assertEqual(validar_resultado(result_fixture())["pasos"], 6000)
        result = result_fixture()
        result["volumen"]["datos"] = base64.b64encode(struct.pack('<f', float('nan')) + b'\0' * (BYTES_CAMPO - 4)).decode('ascii')
        with self.assertRaises(ValueError):
            validar_resultado(result)
        for value in (-2, 16, float('inf')):
            result = result_fixture()
            result['volumen']['datos'] = base64.b64encode(struct.pack('<f', value) + b'\0' * (BYTES_CAMPO - 4)).decode('ascii')
            with self.assertRaises(ValueError):
                validar_resultado(result)
        for key, value in [('malla', [71, 101, 71]), ('origen_cm', [0, 0, 0]), ('paso_cm', 2), ('datos', 'AAAA')]:
            result = result_fixture(); result['volumen'][key] = value
            with self.assertRaises(ValueError):
                validar_resultado(result)
        result = result_fixture()
        result['volumen']['datos'] = base64.b64encode(struct.pack('<f', -1) + b'\0' * (BYTES_CAMPO - 4)).decode('ascii')
        self.assertEqual(validar_resultado(result)['modelo'], MODELO)
        result = result_fixture()
        result["pasos"] = 200
        with self.assertRaises(ValueError):
            validar_resultado(result)


FAKE_WORKER = '''import argparse, json, time, base64, struct
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--input'); p.add_argument('--output'); p.add_argument('--modelo-esperado'); a=p.parse_args()
mode=Path(a.input).read_bytes()
print('TUNELAB_FLOW '+json.dumps({'fase':'calculando','paso':200,'mensaje':'Calculando'}),flush=True)
if mode == b'slow': time.sleep(20)
if mode == b'error':
 print('TUNELAB_FLOW '+json.dumps({'fase':'error','mensaje':'Objeto no cerrado'}),flush=True)
 raise SystemExit(2)
volume={'formato':'rapidez-f32le-xyz-v1','malla':[101,71,71],'origen_cm':[-50,-35,-35],'paso_cm':1,'datos':base64.b64encode(struct.pack('<f',1)*101*71*71).decode('ascii')}
Path(a.output).write_text(json.dumps({'modelo':a.modelo_esperado,'pasos':6000,'volumen':volume}))
'''


class TrabajosTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        (root / 'scripts').mkdir()
        (root / 'scripts/calcular-flujo3d.py').write_text(FAKE_WORKER, encoding='utf-8')
        self.manager = GestorFlujo3D(root, max_seconds=8)

    def tearDown(self):
        self.manager.cerrar()
        self.tmp.cleanup()

    def wait(self, id):
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            result = self.manager.consultar(id, 7)
            if result['estado'] in ('completado', 'error', 'cancelado'):
                return result
            time.sleep(0.02)
        self.fail('el trabajo no terminó dentro del plazo de prueba')

    def submit(self, data, user=7):
        id = self.manager.reservar(user)
        return self.manager.enviar(id, data, sys.executable)

    def test_reserva_unica_tambien_durante_subida_y_control_de_propietario(self):
        id = self.manager.reservar(7)
        with self.assertRaises(FlujoOcupado):
            self.manager.reservar(8)
        with self.assertRaises(KeyError):
            self.manager.consultar(id, 8)
        with self.assertRaises(KeyError):
            self.manager.cancelar(id, 8)
        self.manager.abandonar(id)
        self.assertFalse(self.manager.ocupado())

    def test_resultado_cache_acotada_por_usuario_y_limpieza_del_archivo(self):
        job = self.submit(b'ok')
        result = self.wait(job['id'])
        self.assertEqual(result['estado'], 'completado')
        cached = self.submit(b'ok')
        self.assertTrue(cached['cache'])
        self.assertEqual(cached['id'], job['id'])
        self.assertEqual(cached['resultado']['volumen'], result['resultado']['volumen'])
        self.assertEqual(list(self.manager.temporales.iterdir()), [])
        self.assertFalse(self.submit(b'ok', user=8)['cache'])

    def test_cancelar_libera_el_proceso_y_no_publica_mapas(self):
        job = self.submit(b'slow')
        self.manager.cancelar(job['id'], 7)
        result = self.wait(job['id'])
        self.assertEqual(result['estado'], 'cancelado')
        self.assertIsNone(result['resultado'])
        self.assertFalse(self.manager.ocupado())

    def test_timeout_y_error_explicito_no_se_confunden_con_exito(self):
        self.manager.max_seconds = 0.3
        result = self.wait(self.submit(b'slow')['id'])
        self.assertEqual(result['estado'], 'error')
        self.assertIsNone(result['resultado'])
        self.manager.max_seconds = 8
        result = self.wait(self.submit(b'error')['id'])
        self.assertEqual(result['mensaje'], 'Objeto no cerrado')


class RutasTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        from app.main import app
        from app.configuracion import configuracion
        from app.usuario_actual import obtener_usuario_actual
        self.app, self.dep = app, obtener_usuario_actual
        self.tmp = tempfile.TemporaryDirectory()
        self.manager = GestorFlujo3D(self.tmp.name)
        app.state.flujo3d = self.manager
        self.config = patch.multiple(configuracion, flujo3d_habilitado=True, flujo3d_python=sys.executable)
        self.config.start()
        app.dependency_overrides[obtener_usuario_actual] = lambda: SimpleNamespace(id=7)

    def tearDown(self):
        self.app.dependency_overrides.pop(self.dep, None)
        self.manager.cerrar(); self.tmp.cleanup(); self.config.stop()

    async def request(self, method, path, raw=b'', headers=None, chunks=None):
        path, _, query = path.partition('?')
        incoming = iter(chunks if chunks is not None else [raw])
        messages = []
        async def receive():
            try:
                data = next(incoming)
                return {'type':'http.request', 'body':data, 'more_body':chunks is not None and bool(data)}
            except StopIteration:
                return {'type':'http.request', 'body':b'', 'more_body':False}
        async def send(message):
            messages.append(message)
        scope = {'type':'http','asgi':{'version':'3.0'},'http_version':'1.1','method':method,'scheme':'http',
                 'path':path,'raw_path':path.encode(),'query_string':query.encode(),'root_path':'','server':('localhost',8010),
                 'client':('127.0.0.1',1234),'headers':[(k.lower().encode(),v.encode()) for k,v in (headers or {}).items()]}
        await self.app(scope, receive, send)
        return next(m['status'] for m in messages if m['type']=='http.response.start')

    async def test_tipo_tamano_y_recepcion_invalida_no_ocupan_motor(self):
        self.assertEqual(await self.request('POST','/api/flujo3d/calculos',b'{}',{'Content-Type':'application/json'}),415)
        self.assertEqual(await self.request('POST','/api/flujo3d/calculos',b'',{'Content-Type':'application/octet-stream','Content-Length':str(MAX_BYTES+1)}),413)
        self.assertEqual(await self.request('POST','/api/flujo3d/calculos',b'1234',{'Content-Type':'application/octet-stream'}),422)
        self.assertFalse(self.manager.ocupado())
        self.assertEqual(await self.request('POST','/api/flujo3d/calculos',headers={'Content-Type':'application/octet-stream'},chunks=[b'0'*MAX_BYTES,b'0']),413)
        self.assertFalse(self.manager.ocupado())

    async def test_las_rutas_exigen_autenticacion(self):
        from app.configuracion import configuracion
        self.app.dependency_overrides.pop(self.dep)
        with patch.multiple(configuracion, entorno='produccion', autenticacion_modo='bloqueada'):
            for method,path in [('GET','/api/flujo3d/capacidad'),('POST','/api/flujo3d/calculos'),('GET','/api/flujo3d/calculos/ajeno'),('DELETE','/api/flujo3d/calculos/ajeno')]:
                self.assertEqual(await self.request(method,path),401)

    async def test_no_calcula_con_una_configuracion_anterior_de_la_web(self):
        self.assertEqual(await self.request('POST', '/api/flujo3d/calculos?modelo=antiguo', cube_bytes(), {'Content-Type':'application/octet-stream'}), 409)
        self.assertFalse(self.manager.ocupado())
