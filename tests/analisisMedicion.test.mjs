import assert from "node:assert/strict";
import test from "node:test";
import {
  analizarEtapas,
  crearTrazas,
  prepararSerie,
  resumirValores,
  cambiosConsigna,
  tramosEstables,
  prepararGrafica,
} from "../src/servicios/mediciones/analisisMedicion.js";
import { crearDocumentoMedicionTunelab, normalizarDocumentoMedicionTunelab, leerArchivoMedicionTunelab, comprobarCapacidadImportacion } from "../src/servicios/archivos/medicionArchivo.js";
import { crearMedicionDesdeApi, crearDetalleMedicionDocente } from "../src/servicios/mediciones/adaptarRegistros.js";
import { fechaApi } from "../src/servicios/formato.js";

const programa = { nombre: "Barrido", version: 1, etapas: [
  {consigna: 25, duracion_segundos: 2, inicio_segundo: 0, fin_segundo: 2, estado: "completada"},
  {consigna: 75, duracion_segundos: 3, inicio_segundo: 10, fin_segundo: 13, estado: "completada"},
]};
function captura(convertir = crearMedicionDesdeApi) {
  return convertir({id: 7, nombre: "Barrido", estado: "finalizada", fuente: "real", calibracion_version: 3,
    fecha_inicio: "2026-09-30T08:00:00", fecha_fin: "2026-09-30T08:00:13", creado_en: "2026-09-30T08:00:00",
    duracion_segundos: 13, programa}, [0, 1, 2, 10, 11, 12, 13].map((s, i) => ({
      instante: `2026-09-30T08:00:${String(s).padStart(2,"0")}`, velocidad_ms: i < 3 ? 2.561 : 8.180,
      caudal_m3s: 1.25489, temperatura_c: 23.845, potencia_porcentaje: i < 3 ? 25 : 75,
      frecuencia_hz: 12.345, corriente_a: 1.789, rpm: 752.333, presion_pa: 3.90567,
    })), [{id: 2, creado_en: "2026-09-30T08:00:10", tipo: "info", mensaje: "Etapa 2/2 iniciada"}]);
}
const ensayo = {codigo: "A-1", nombre: "Prueba"};

function capturaContinua() {
  const original = captura();
  return {...original, programa: {nombre: "Barrido", version: 2,
    criterio_estabilidad: {tolerancia_ms: 0.03, segundos: 4}, etapas: [
      {consigna:25,duracion_segundos:2,cambio_segundo:0,inicio_segundo:3,fin_segundo:5,estado:"completada",tramos_estables:[{inicio:3,fin:5}]},
      {consigna:75,duracion_segundos:2,cambio_segundo:5,inicio_segundo:8,fin_segundo:10,estado:"completada",tramos_estables:[{inicio:8,fin:10}]},
    ]}, muestras: Array.from({length:11}, (_, segundo) => ({...original.muestras[0],segundo,
      velMs: segundo <= 5 ? Math.min(segundo, 2) : Math.min(segundo, 8),
      flujoEstable: (segundo >= 3 && segundo <= 5) || segundo >= 8, consignaObjetivoPct: segundo <= 5 ? 25 : 75,
    }))};
}

test("la captura continua dibuja transiciones y calcula medias solo con muestras estables", () => {
  const m = capturaContinua(), etapas = analizarEtapas(m);
  assert.deepEqual(etapas.map(e => e.muestras.length), [6, 5]);
  assert.deepEqual(etapas.map(e => e.muestrasEstables.length), [3, 3]);
  assert.deepEqual(etapas.map(e => e.velocidad.media), [2, 8]);
  assert.deepEqual(etapas.map(e => e.registroSeg), [2, 2]);
  assert.equal(prepararSerie(crearTrazas(m.muestras, m.programa.etapas).velocidad).length, 1);
  assert.deepEqual(tramosEstables(m.muestras), [{inicio:3,fin:5},{inicio:8,fin:10}]);
  assert.deepEqual(cambiosConsigna(m.muestras), [{segundo:0,texto:"25 %"},{segundo:6,texto:"75 %"}]);
});

test("la primera muestra estable cuenta aunque el programador marque el tramo unos milisegundos después", () => {
  const m = capturaContinua();
  m.programa.etapas[0].tramos_estables[0].inicio = 3.005;
  m.programa.etapas[0].inicio_segundo = 3.005;
  assert.equal(analizarEtapas(m)[0].muestrasEstables.length, 3);
});

test("la exportación conserva transiciones, criterio y tramos sin alterar los archivos antiguos", () => {
  const original = capturaContinua();
  const doc = crearDocumentoMedicionTunelab({ensayo,medicion:original});
  const recuperada = normalizarDocumentoMedicionTunelab(JSON.parse(JSON.stringify(doc))).medicion;
  assert.deepEqual(recuperada.programa, original.programa);
  assert.deepEqual(recuperada.muestras, original.muestras);
  doc.medicion.programa.etapas[1].tramos_estables[0].inicio = 4;
  assert.throws(() => normalizarDocumentoMedicionTunelab(doc), /Intervalos/);
});

test("parar antes de estabilizar conserva la transición sin inventar una media estable", () => {
  const m = capturaContinua();
  m.programa.etapas = [{...m.programa.etapas[0],estado:"parcial",inicio_segundo:null,fin_segundo:1,tramos_estables:[]}];
  m.muestras = m.muestras.slice(0,2);
  const doc = crearDocumentoMedicionTunelab({ensayo,medicion:m});
  const e = analizarEtapas(normalizarDocumentoMedicionTunelab(doc).medicion)[0];
  assert.equal(e.muestras.length, 2);
  assert.equal(e.velocidad.media, null);
  assert.equal(e.registroSeg, 0);
  assert.deepEqual(tramosEstables([{segundo:0,velMs:1,flujoEstable:true},{segundo:1,velMs:1,flujoEstable:true},
    {segundo:20,velMs:1,flujoEstable:true},{segundo:21,velMs:1,flujoEstable:true}]), [{inicio:0,fin:1},{inicio:20,fin:21}]);
});

test("exportar e importar conserva muestras, origen, fechas, calibración y etapas también desde Docente", () => {
  for (const convertir of [crearMedicionDesdeApi, crearDetalleMedicionDocente]) {
    const original = captura(convertir);
    const documento = crearDocumentoMedicionTunelab({ensayo, medicion: original, fuenteTunel: "mysql"});
    const recuperada = normalizarDocumentoMedicionTunelab(JSON.parse(JSON.stringify(documento))).medicion;
    assert.equal(documento.version, "1.2");
    for (const campo of ["fuente", "estado", "fechaInicio", "fechaFin", "calibracionVersion", "programa", "durSeg", "trazas", "muestras", "tecnicos"]) {
      assert.deepEqual(recuperada[campo], original[campo], campo);
    }
    assert.equal(recuperada.muestras[0].corrA, 1.789);
    assert.equal(recuperada.muestras[0].segundo, 0);
    assert.equal(recuperada.eventos[0].instante, original.eventos[0].instante);
  }
});

test("los archivos 1.0 siguen cargando sin atribuir a simulación un origen desconocido", () => {
  const documento = crearDocumentoMedicionTunelab({ensayo, medicion: captura()});
  documento.version = "1.0";
  documento.fuenteTunel = "mysql";
  delete documento.medicion.programa;
  delete documento.medicion.calibracionVersion;
  documento.muestras.forEach(m => { delete m.caudalM3s; delete m.presionPa; });
  const m = normalizarDocumentoMedicionTunelab(documento).medicion;
  assert.equal(m.fuente, "desconocida");
  assert.equal(m.programa, null);
  assert.equal(m.muestras[0].caudalM3s, null);
  assert.equal(m.muestras[0].presionPa, null);
});

test("las etapas separan registro, pausas y estados parciales sin inventar muestras", () => {
  const medicion = captura();
  const etapas = analizarEtapas(medicion);
  assert.deepEqual(etapas.map(e => e.muestras.length), [3, 4]);
  assert.deepEqual(etapas.map(e => e.registroSeg), [2, 3]);
  assert.equal(etapas[0].velocidad.media, 2.561);
  assert.equal(etapas[1].velocidad.media, 8.18);
  assert.equal(etapas[1].velocidad.desviacion, 0);
  const pendiente = analizarEtapas({...medicion, programa: {etapas: [{estado: "pendiente", inicio_segundo: null, fin_segundo: null}]}})[0];
  assert.equal(pendiente.muestras.length, 0);
  assert.equal(pendiente.velocidad.media, null);
  const parcial = analizarEtapas({...medicion, programa: {etapas: [{estado: "parcial", inicio_segundo: 10, fin_segundo: 11}]}})[0];
  assert.equal(parcial.muestras.length, 2);
  assert.equal(parcial.registroSeg, 1);
});

test("la media y la desviación ignoran ausencias pero conservan ceros reales", () => {
  assert.deepEqual(resumirValores([0, 2, 4, null, undefined, NaN]), {n: 3, media: 2, minima: 0, maxima: 4, desviacion: 2});
  assert.equal(resumirValores([]).media, null);
  assert.equal(resumirValores([2]).desviacion, null);
});

test("Chart.js recibe tiempos reales y segmentos separados para comparar en una escala común", () => {
  const datos = crearTrazas(captura().muestras, programa.etapas).velocidad;
  const grafica = prepararGrafica([{nombre: 'a', datos}, {nombre: 'b', datos: [{segundo: 0, valor: 10}, {segundo: 30, valor: 12}]}]);
  assert.equal(grafica.datasets.length, 3);
  assert.deepEqual(grafica.datasets[0].data[0], {x: 0, y: 2.561});
  assert.deepEqual(grafica.datasets[1].data[0], {x: 10, y: 8.18});
  assert.deepEqual(grafica.datasets[2].data.at(-1), {x: 30, y: 12});
  assert.equal(grafica.resumenes[0].minima, 2.561);
  assert.equal(prepararSerie([{segundo: 0, valor: 1}, {segundo: 1, valor: null}, {segundo: 2, valor: 3}]).length, 2);
  assert.equal(prepararSerie([{segundo: 0, valor: 1}, {segundo: 1, valor: 2}, {segundo: 15, valor: 3}]).length, 2);
});

test("la consulta por teclado apunta a las mismas muestras originales enviadas a Chart.js", () => {
  const puntos = [{segundo:0,valor:0}, {segundo:1,valor:3.42}, {segundo:8,valor:6.31}];
  const grafica = prepararGrafica([{nombre: 'a', datos: puntos}]);
  assert.equal(grafica.consultas.length, 3);
  for (const [i, p] of grafica.consultas.entries()) {
    assert.deepEqual(grafica.datasets[p.datasetIndex].data[p.index], {x: puntos[i].segundo, y: puntos[i].valor});
  }
});

test("registros de 15 horas llegan completos a Chart.js, sin perder extremos ni muestras consultables", async () => {
  const documento = crearDocumentoMedicionTunelab({ensayo, medicion: captura()});
  documento.medicion.programa = null;
  documento.medicion.durSeg = 54000;
  documento.muestras = Array.from({length: 54001}, (_, i) => ({segundo:i,velMs:i === 31000 ? 59 : i === 7000 ? 0 : 5,tempC:null,potPct:50}));
  const texto = JSON.stringify(documento);
  const importada = await leerArchivoMedicionTunelab({name:"larga.json",size:Buffer.byteLength(texto),text:async()=>texto});
  const grafica = prepararGrafica([{nombre: 'larga', datos: importada.medicion.trazas.velocidad}]);
  assert.equal(grafica.datasets[0].data.length, 54001);
  assert.equal(grafica.resumenes[0].minima, 0);
  assert.equal(grafica.resumenes[0].maxima, 59);
  assert.equal(grafica.consultas.at(-1).x, 54000);
});

test("valida intervalos malformados y tamaño del archivo", async () => {
  const documento = crearDocumentoMedicionTunelab({ensayo, medicion: captura()});
  const copia = structuredClone(documento);
  copia.medicion.programa.etapas[1].inicio_segundo = 1;
  assert.throws(() => normalizarDocumentoMedicionTunelab(copia), /Intervalos/);
  await assert.rejects(leerArchivoMedicionTunelab({size:33*1024*1024,text:()=>assert.fail("No debe leerlo")}), /grande/);
});

test("las fechas sin zona del servidor se interpretan como UTC", () => {
  assert.equal(fechaApi("2026-09-30T08:00:00").toISOString(), "2026-09-30T08:00:00.000Z");
  assert.equal(fechaApi("2026-09-30T10:00:00+02:00").toISOString(), "2026-09-30T08:00:00.000Z");
});

test("los errores de fecha y estabilidad importadas explican el campo en español", () => {
  const documento = crearDocumentoMedicionTunelab({ ensayo, medicion: captura() });
  documento.medicion.fechaInicio = 'ayer';
  assert.throws(() => normalizarDocumentoMedicionTunelab(documento), /fechaInicio.*no es una fecha ISO válida/);
  documento.medicion.fechaInicio = null;
  documento.muestras[0].flujoEstable = 'sí';
  assert.throws(() => normalizarDocumentoMedicionTunelab(documento), /flujoEstable.*verdadero o falso/);
});

test("el límite acumulado impide saturar el visor con varios archivos grandes", () => {
  const archivos = [{medicion:{muestras:Array(100000)}}, {medicion:{muestras:Array(100000)}}];
  assert.doesNotThrow(() => comprobarCapacidadImportacion(archivos, 50000));
  assert.throws(() => comprobarCapacidadImportacion(archivos, 50001), /muestras importadas en total/);
});
