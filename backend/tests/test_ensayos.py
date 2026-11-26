"""Creación concurrente y límites, usando una base SQLite temporal."""
import os
import importlib.util
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

os.environ['DATABASE_URL'] = 'sqlite://'

from fastapi import HTTPException
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from app.base_datos import Base
from app.configuracion import configuracion
from app.datos_api import EnsayoCrear
from app.ensayos import crear_ensayo_guardado
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
            return ensayo.id

    def test_creaciones_concurrentes_con_igual_nombre_tienen_ids_distintos(self):
        with ThreadPoolExecutor(max_workers=2) as ejecutor:
            ids = list(ejecutor.map(self.crear, (1, 2)))

        self.assertEqual(len(set(ids)), 2)
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

    def test_el_nombre_no_es_la_clave_y_se_puede_editar(self):
        primero, segundo = self.crear(), self.crear()
        self.assertNotEqual(primero, segundo)
        with self.sesiones() as sesion:
            ensayo = sesion.get(Ensayo, primero)
            ensayo.nombre = 'Otro nombre'
            sesion.commit()
            self.assertEqual(ensayo.id, primero)
            self.assertEqual(sesion.get(Ensayo, segundo).nombre, 'Prueba')


class MigracionCodigoTests(unittest.TestCase):
    def test_retirar_programas_conserva_las_mediciones_historicas(self):
        ruta = Path(__file__).resolve().parents[1] / 'alembic/versions/0a63de149258_medicion_consigna_unica.py'
        spec = importlib.util.spec_from_file_location('migracion_medicion', ruta)
        migracion = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migracion)
        engine = create_engine('sqlite://')
        try:
            with engine.begin() as conexion:
                conexion.execute(text('CREATE TABLE ensayos (id INTEGER PRIMARY KEY)'))
                conexion.execute(text('CREATE TABLE mediciones (id INTEGER PRIMARY KEY, ensayo_id INTEGER REFERENCES ensayos(id), programa JSON)'))
                conexion.execute(text('CREATE TABLE programas_etapas (id INTEGER PRIMARY KEY)'))
                conexion.execute(text('INSERT INTO ensayos VALUES (3)'))
                conexion.execute(text('INSERT INTO mediciones VALUES (8, 3, :programa)'), {'programa':'{"version":3,"etapas":[]}'})
                with Operations.context(MigrationContext.configure(conexion)):
                    migracion.upgrade()
                    self.assertNotIn('programas_etapas', inspect(conexion).get_table_names())
                    fila = conexion.execute(text('SELECT id, ensayo_id, programa, duracion_prevista_segundos FROM mediciones')).one()
                    self.assertEqual(tuple(fila), (8, 3, '{"version":3,"etapas":[]}', None))
                    self.assertEqual(conexion.execute(text('PRAGMA foreign_key_check')).all(), [])
        finally:
            engine.dispose()

    def test_elimina_codigo_sin_cambiar_ids_ni_relaciones(self):
        ruta = Path(__file__).resolve().parents[1] / 'alembic/versions/f952cd038147_eliminar_codigo_ensayo.py'
        spec = importlib.util.spec_from_file_location('migracion_codigo', ruta)
        migracion = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migracion)
        engine = create_engine('sqlite://')
        try:
            with engine.begin() as conexion:
                conexion.execute(text('CREATE TABLE ensayos (id INTEGER PRIMARY KEY, codigo VARCHAR(30) NOT NULL UNIQUE, nombre VARCHAR(80) NOT NULL)'))
                conexion.execute(text('CREATE TABLE mediciones (id INTEGER PRIMARY KEY, ensayo_id INTEGER REFERENCES ensayos(id))'))
                conexion.execute(text("INSERT INTO ensayos VALUES (3, 'A-015', 'Prueba')"))
                conexion.execute(text('INSERT INTO mediciones VALUES (8, 3)'))
                with Operations.context(MigrationContext.configure(conexion)):
                    migracion.upgrade()
                    self.assertNotIn('codigo', [c['name'] for c in inspect(conexion).get_columns('ensayos')])
                    self.assertEqual(conexion.execute(text('SELECT id, nombre FROM ensayos')).one(), (3, 'Prueba'))
                    self.assertEqual(conexion.execute(text('SELECT ensayo_id FROM mediciones')).scalar(), 3)
                    self.assertEqual(conexion.execute(text('PRAGMA foreign_key_check')).all(), [])
                    migracion.downgrade()
                    self.assertEqual(conexion.execute(text('SELECT codigo FROM ensayos')).scalar(), 'A-003')
                    migracion.upgrade()
                    self.assertNotIn('codigo', [c['name'] for c in inspect(conexion).get_columns('ensayos')])
        finally:
            engine.dispose()
