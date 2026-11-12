import assert from 'node:assert/strict';
import test from 'node:test';
import { crearEnsayoDesdeApi, crearMedicionDesdeApi } from "../src/servicios/mediciones/adaptarRegistros.js";

test('la carga inicial y Registro representan igual una medición sin muestras', () => {
  const medicion = { id: 4, nombre: 'Captura', velocidad_media: 3, velocidad_minima: 2,
    velocidad_maxima: 5, temperatura_media: 20, potencia_media: 0 };
  const ensayo = crearEnsayoDesdeApi({ id: 2, codigo: 'A-002', nombre: 'Prueba' }, [medicion]);
  assert.equal(ensayo.id, 'api-ensayo-2');
  assert.equal(ensayo.apiId, 2);
  assert.equal(ensayo.estado, 'Con mediciones');
  assert.deepEqual(ensayo.mediciones[0], crearMedicionDesdeApi(medicion));
  assert.equal(ensayo.mediciones[0].velocidad.estabilidad, 3);
  assert.deepEqual(ensayo.mediciones[0].temperatura, { media: 20, maxima: null, minima: null });
  assert.deepEqual(ensayo.mediciones[0].potencia, { media: 0, maxima: null, minima: null });
  assert.equal(ensayo.mediciones[0].objVelMs, null);
});

test('un ensayo sin mediciones conserva su identificador y no inventa resultados', () => {
  const ensayo = crearEnsayoDesdeApi({ id: 9, nombre: 'Vacío', objetivo: '', descripcion: null });
  assert.equal(ensayo.estado, 'Preparado');
  assert.equal(ensayo.objetivo, 'Sin objetivo definido');
  assert.equal(ensayo.descripcion, '');
  assert.deepEqual(ensayo.mediciones, []);
});
