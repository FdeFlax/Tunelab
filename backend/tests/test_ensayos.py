"""Creación concurrente y límites, usando una base SQLite temporal."""
import os
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

os.environ['DATABASE_URL'] = 'sqlite://'

from fastapi import HTTPException
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from app.base_datos import Base
from app.configuracion import configuracion
from app.datos_api import EnsayoCrear
from app.ensayos import crear_ensayo_guardado, generar_codigo_ensayo
from app.tablas import Ensayo, EventoMedicion, Usuario


class EnsayosTests(unittest.TestCase):
    def setUp(self):
        carpeta = Path(__file__).resolve().parents[2] / 'tmp'
        carpeta.mkdir(exist_ok=True)
        self.directorio = tempfile.TemporaryDirectory(prefix='test-ensayos-', dir=carpeta)
        ruta = Path(self.directorio.name) / 'ensayos.db'
        self.engine = create_engine(f'sqlite:///{ruta.as_posix()}', connect_args={'timeout': 10})
        Base.metadata.create_all(self.engine)
        self.sesiones = sessionmaker(self.engine)
        with self.sesiones() as sesion:
            sesion.add_all([Usuario(id=i, nombre=f'Alumno {i}', identificador_uacloud=f'alu_{i}') for i in (1, 2)])
            sesion.commit()

    def tearDown(self):
        self.engine.dispose()
        self.directorio.cleanup()

    def crear(self, usuario_id=1):
        with self.sesiones() as sesion:
            usuario = sesion.get(Usuario, usuario_id)
            ensayo = crear_ensayo_guardado(EnsayoCrear(nombre='Prueba'), sesion, usuario)
            return ensayo.codigo

    def test_dos_creaciones_que_leen_el_mismo_codigo_se_recuperan(self):
        barrera = threading.Barrier(2)
        hilo = threading.local()

        def leer_a_la_vez(sesion):
            codigo = generar_codigo_ensayo(sesion)
            if not getattr(hilo, 'primera_lectura', False):
                hilo.primera_lectura = True
                barrera.wait(timeout=5)
            return codigo

        with patch('app.ensayos.generar_codigo_ensayo', side_effect=leer_a_la_vez):
            with ThreadPoolExecutor(max_workers=2) as ejecutor:
                codigos = list(ejecutor.map(self.crear, (1, 2)))

        self.assertEqual(set(codigos), {'A-001', 'A-002'})
        with self.sesiones() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(Ensayo.id))), 2)
            self.assertEqual(sesion.scalar(select(func.count(EventoMedicion.id))), 2)
            self.assertEqual(set(sesion.scalars(select(Ensayo.usuario_id))), {1, 2})

    def test_respeta_el_cupo_y_no_deja_eventos_de_intentos_fallidos(self):
        with patch.object(configuracion, 'limite_ensayos_por_usuario', 1):
            self.crear()
            with self.assertRaises(HTTPException) as error:
                self.crear()
        self.assertEqual(error.exception.status_code, 409)
        with self.sesiones() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(EventoMedicion.id))), 1)

    def test_no_oculta_un_error_de_integridad_distinto(self):
        with self.sesiones() as sesion:
            usuario = sesion.get(Usuario, 1)
            error = IntegrityError('INSERT', {}, ValueError('Fallo de una clave ajena'))
            with patch.object(sesion, 'flush', side_effect=error):
                with self.assertRaises(IntegrityError):
                    crear_ensayo_guardado(EnsayoCrear(nombre='Prueba'), sesion, usuario)
        with self.sesiones() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(Ensayo.id))), 0)

    def test_el_reintento_tiene_un_limite(self):
        self.crear()
        with patch('app.ensayos.generar_codigo_ensayo', return_value='A-001') as generar:
            with self.assertRaises(HTTPException) as error:
                self.crear(2)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(generar.call_count, 5)
        with self.sesiones() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(EventoMedicion.id))), 1)

    def test_conserva_los_codigos_existentes_y_omite_otros_formatos(self):
        with self.sesiones() as sesion:
            sesion.add_all([Ensayo(codigo=codigo, nombre='Anterior', usuario_id=1) for codigo in ('A-009', 'importado')])
            sesion.commit()
        self.assertEqual(self.crear(), 'A-010')
