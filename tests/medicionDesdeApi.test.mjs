import assert from "node:assert/strict";
import test from "node:test";
import {
  crearMedicionDesdeApi,
  crearDetalleMedicionDocente,
} from "../src/servicios/mediciones/adaptarRegistros.js";
import { calcularMedia } from "../src/servicios/formato.js";

const medicion = Object.freeze({
  id: 7, nombre: "Captura", creado_en: "2026-09-11T10:05:00Z",
  velocidad_objetivo: 5, potencia_objetivo: 50, duracion_segundos: 30,
});
const muestras = Object.freeze([
  Object.freeze({velocidad_ms: 4, temperatura_c: 20, potencia_porcentaje: 40,
    caudal_m3s: 1, presion_pa: 8, frecuencia_hz: 20, corriente_a: 4, rpm: 1200}),
  Object.freeze({velocidad_ms: 6, temperatura_c: 22, potencia_porcentaje: 60,
    caudal_m3s: 3, presion_pa: 12, frecuencia_hz: 30, corriente_a: 6, rpm: 1800}),
]);
const eventos = Object.freeze([Object.freeze({
  id: 9, mensaje: "Incidencia", tipo: "error", creado_en: medicion.creado_en,
})]);

test("Registro conserva muestras técnicas, estadísticas y cinco trazas", () => {
  const detalle = crearMedicionDesdeApi(medicion, muestras, eventos);
  assert.equal(detalle.id, "api-medicion-7");
  assert.equal(detalle.nombre, "Captura");
  assert.equal(detalle.durSeg, 30);
  assert.equal(detalle.totalMuestras, 2);
  assert.deepEqual(detalle.velocidad, {media: 5, maxima: 6, minima: 4, estabilidad: 2});
  assert.deepEqual(detalle.temperatura, {media: 21, maxima: 22, minima: 20});
  assert.deepEqual(detalle.potencia, {media: 50, maxima: 60, minima: 40});
  assert.deepEqual(detalle.tecnicos, {frecuenciaMedia: 25, corrienteMedia: 5,
    rpmMedia: 1500, presionMediaPa: 10, caudalMedioM3s: 2});
  assert.equal(detalle.muestras[1].frecHz, 30);
  assert.equal(detalle.muestras[1].corrA, 6);
  assert.equal(detalle.muestras[1].rpm, 1800);
  assert.equal(detalle.muestras[1].fuente, "api");
  assert.deepEqual(Object.keys(detalle.trazas), ["velocidad", "caudal", "temperatura", "potencia", "presion"]);
  assert.deepEqual(detalle.trazas.presion, [{segundo: 1, valor: 8}, {segundo: 2, valor: 12}]);
});

test("Docente mantiene su identificador, sus campos y su representación de eventos", () => {
  const registro = crearMedicionDesdeApi(medicion, muestras, eventos);
  const docente = crearDetalleMedicionDocente(medicion, muestras, eventos);
  assert.equal(docente.id, 7);
  assert.equal(Object.hasOwn(docente, "hora"), false);
  assert.deepEqual(docente.velocidad, registro.velocidad);
  assert.deepEqual(docente.trazas, registro.trazas);
  assert.deepEqual(docente.tecnicos, registro.tecnicos);
  assert.deepEqual(docente.muestras, registro.muestras);
  assert.equal(docente.eventos[0].tipo, "error");
  assert.equal(Object.hasOwn(docente.eventos[0], "nivel"), false);
  assert.equal(registro.eventos[0].nivel, "critica");
  assert.equal(registro.eventos[0].etiqueta, "error");
  assert.match(registro.hora, /^\d{2}:\d{2}$/);
  assert.ok(docente.fecha.includes(registro.hora));
});

test("los agregados guardados con valor cero prevalecen sobre los calculados", () => {
  for (const convertir of [crearMedicionDesdeApi, crearDetalleMedicionDocente]) {
    const detalle = convertir({...medicion, velocidad_media: 0, velocidad_maxima: 0,
      velocidad_minima: 0, temperatura_media: 0, potencia_media: 0}, muestras);
    assert.deepEqual(detalle.velocidad, {media: 0, maxima: 0, minima: 0, estabilidad: 2});
    assert.equal(detalle.temperatura.media, 0);
    assert.equal(detalle.potencia.media, 0);
  }
});

test("un resumen sin muestras mantiene agregados del servidor y no inventa trazas", () => {
  const detalle = crearMedicionDesdeApi({...medicion, creado_en: null, velocidad_media: 7.2});
  assert.equal(detalle.velocidad.media, 7.2);
  assert.equal(detalle.totalMuestras, 0);
  assert.equal(detalle.fecha, "--");
  assert.equal(detalle.hora, "--");
  assert.deepEqual(detalle.trazas.velocidad, []);
  assert.equal(detalle.tecnicos.rpmMedia, null);
  assert.equal(crearMedicionDesdeApi(null), null);
});

test("la media comun conserva el resultado y el caso vacio", () => {
  assert.equal(calcularMedia([]), 0);
  assert.equal(calcularMedia([2, 4, 9]), 5);
});

test("los campos ausentes se derivan, pero un cero explícito se conserva", () => {
  const detalle = crearMedicionDesdeApi({...medicion, duracion_segundos: 0}, [
    {velocidad_ms: 5, temperatura_c: 20, potencia_porcentaje: 50},
    {velocidad_ms: 5, temperatura_c: 20, potencia_porcentaje: 50, caudal_m3s: 0, presion_pa: 0},
  ]);
  assert.ok(detalle.muestras[0].caudalM3s > 0);
  assert.ok(detalle.muestras[0].presionPa > 0);
  assert.equal(detalle.muestras[0].frecHz, null);
  assert.equal(detalle.muestras[0].corrA, null);
  assert.equal(detalle.muestras[0].rpm, null);
  assert.equal(detalle.muestras[1].caudalM3s, 0);
  assert.equal(detalle.muestras[1].presionPa, 0);
  assert.equal(detalle.durSeg, 0);
});
