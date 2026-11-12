import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import CONFIGURACION_TUNEL from '../shared/tunel.json' with { type: 'json' };
import { VISUAL, VISTAS_TUNEL, parametrosVisor } from '../src/components/visor/ajustesTunel.js';
import { crearFichaTunel, calcularMagnitudesDerivadas, calcularCaudalMaximoM3s } from '../src/servicios/tunel/fichaTunel.js';
import { leerCampo, cortarCampo, limitesPlano } from '../src/aerodinamica/campo.js';
import { pixelesPlano } from '../src/aerodinamica/mapas.js';
import { evaluarObjeto, maximoTamano } from '../src/servicios/modelos3d.js';

const raiz = fileURLToPath(new URL('../', import.meta.url));

function backend(config) {
  const python = process.env.PYTHON_PRUEBAS || (process.platform === 'win32' ? 'backend/.venv/Scripts/python.exe' : 'backend/.venv/bin/python');
  const result = spawnSync(python, ['-c', 'import json,sys; from app.configuracion_tunel import parametros_flujo; print(json.dumps(parametros_flujo(json.load(sys.stdin))))'], {
    cwd: raiz, input: JSON.stringify(config), encoding: 'utf8', timeout: 15000,
    env: { ...process.env, PYTHONPATH: 'backend', PYTHONUTF8: '1' }, windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return JSON.parse(result.stdout);
}

test('la web usa los límites y la malla calculados por Python al cambiar el JSON', () => {
  const c = structuredClone(CONFIGURACION_TUNEL);
  Object.assign(c.geometria.seccionEnsayo, { longitudM: 0.82, altoM: 0.56, anchoM: 0.44 });
  Object.assign(c.aerodinamica, { pasoCm: 2, pasos: 100 });
  const calculo = backend(c);
  assert.deepEqual(calculo.malla, [42, 29, 23]);
  assert.deepEqual(calculo.maximosObjetoCm, [60, 44, 32]);
  assert.equal(calculo.minimoObjetoCm, 4);
});

test('sección, ambiente y calibración actualizan caudal, Reynolds y las uniones del túnel', () => {
  const c = structuredClone(CONFIGURACION_TUNEL);
  Object.assign(c.geometria.seccionEnsayo, { anchoM: 0.5, altoM: 0.4 });
  Object.assign(c.ambiente, { temperaturaC: 30, presionAtmosfericaPa: 90000, viscosidadDinamicaPaS: 2e-5 });
  c.calibracion.velocidad.puntos.at(-1).velocidadMs = 12;
  const ficha = crearFichaTunel(c), magnitudes = calcularMagnitudesDerivadas({ velocidadMs: 5, ficha });
  assert.equal(magnitudes.caudalM3s, 1);
  assert.ok(Math.abs(calcularCaudalMaximoM3s(ficha) - 2.4) < 1e-10);
  assert.deepEqual(ficha.geometria.contraccion.salida, { anchoM: 0.5, altoM: 0.4 });
  assert.equal(ficha.geometria.difusor.entrada.anchoM, 0.5);
  const rho = 90000 / (287.05 * 303.15), diametro = 4 * 0.2 / 1.8;
  assert.equal(magnitudes.densidadKgM3, Number(rho.toFixed(4)));
  assert.equal(magnitudes.reynolds, Math.round(rho * 5 * diametro / 2e-5));
});

test('una sección distinta genera los tres mapas y límites independientes del tamaño antiguo', () => {
  const c = structuredClone(CONFIGURACION_TUNEL);
  Object.assign(c.geometria.seccionEnsayo, { longitudM: 0.255, altoM: 0.205, anchoM: 0.155 });
  c.aerodinamica.pasoCm = 0.5;
  const config = backend(c), [nx, ny, nz] = config.malla;
  const raw = Buffer.alloc(nx * ny * nz * 4);
  for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) {
    raw.writeFloatLE(x / 100 + y / 1000 + z / 10000, ((x * ny + y) * nz + z) * 4);
  }
  const encoded = { formato: 'rapidez-f32le-xyz-v1', malla: config.malla, origen_cm: config.origenCm, paso_cm: config.pasoCm, datos: raw.toString('base64') };
  assert.throws(() => leerCampo(encoded));
  const field = leerCampo(encoded, config);
  for (const orientation of ['vertical', 'horizontal', 'transversal']) {
    const { min, step } = limitesPlano(field, orientation);
    const plane = cortarCampo(field, orientation, min + 7 * step);
    assert.equal(pixelesPlano(plane).length, plane.width * plane.height * 4);
    assert.ok(plane.speed_ratio.flat().every(Number.isFinite));
  }
  assert.equal(evaluarObjeto({ cerrado: true, medidas: [10, 10, 13], tamano: 13 }, config).titulo, 'Revisa el tamaño');
  assert.ok(maximoTamano([10, 10, 13], 13, config) < 13);
});

test('el visor conserva las cámaras sin depender de las condiciones de Aerodinámica', () => {
  assert.equal(VISTAS_TUNEL.dashboard.escalaModelo, 1.28);
  assert.deepEqual(VISTAS_TUNEL.inspeccion.posicionCamaraInicial, [6, 1.8, 8.75]);
  const visual = structuredClone(VISUAL);
  visual.visor.rotacionModeloY = 0.2;
  visual.inspeccion.giroAdicionalModelo = 0.4;
  assert.ok(Math.abs(parametrosVisor(visual, 'inspeccion').rotacionModeloY - 0.6) < 1e-10);
  const c = structuredClone(CONFIGURACION_TUNEL);
  c.aerodinamica.medicionActiva = 'pendiente';
  assert.doesNotThrow(() => crearFichaTunel(c));
});
