import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { transformWithOxc } from 'vite';
import { validarMedicion } from '../src/servicios/tunel/estadoTunel.js';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
after(() => window.happyDOM.close());

async function montar(t, seleccionInicial = 'uno') {
  const ensayos = [{ id: 'uno', apiId: 1, nombre: 'Perfil' }, { id: 'dos', apiId: 2, nombre: 'Esfera' }];
  const cambios = [], solicitudes = [];
  let activo = seleccionInicial, estado = {}, comprobacionPendiente = false, paradas = 0;
  const acciones = {
    activarEnsayo: id => { cambios.push(id); activo = id; render(); },
    detenerMedicion: async () => { paradas++; },
  };
  const contexto = vm.createContext({ console });
  const ruta = new URL('../src/components/control/RegistroMedicion.jsx', import.meta.url);
  const { code } = await transformWithOxc(readFileSync(ruta, 'utf8'), ruta.pathname, { jsx: { runtime: 'automatic' } });
  const modulo = new vm.SourceTextModule(code, { context: contexto });
  const dependencias = {
    react: React, 'react/jsx-runtime': jsx,
    '../../servicios/tunel/estadoTunel': { formatearTiempoFuncionamiento: String, motivoBloqueoMedicion: () => '', validarMedicion },
  };
  await modulo.link(nombre => new vm.SyntheticModule(Object.keys(dependencias[nombre]), function () {
    for (const [clave, valor] of Object.entries(dependencias[nombre])) this.setExport(clave, valor);
  }, { context: contexto }));
  await modulo.evaluate();
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const raiz = createRoot(contenedor);
  const render = () => raiz.render(React.createElement(modulo.namespace.default, {
    ensayo: ensayos.find(e => e.id === activo), tunel: { ensayos, ...estado }, acciones,
    puedeOperar: true, comprobacionPendiente, onSolicitarInicio: datos => solicitudes.push(datos),
  }));
  t.after(async () => { await React.act(async () => raiz.unmount()); contenedor.remove(); });
  await React.act(async () => render());
  return {
    contenedor, cambios, solicitudes, paradas: () => paradas,
    validar: validarMedicion,
    selector: () => contenedor.querySelector('select'),
    elegir: valor => React.act(async () => {
      const select = contenedor.querySelector('select');
      select.value = valor;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    }),
    actualizar: (nuevoEstado, pendiente = false) => React.act(async () => {
      estado = nuevoEstado; comprobacionPendiente = pendiente; render();
    }),
  };
}

test('muestra una sola consigna y duración, sin secuencias ni autoguardado', async t => {
  const vista = await montar(t);
  assert.deepEqual([...vista.selector().options].map(o => o.textContent), ['Perfil', 'Esfera']);
  assert.equal(vista.contenedor.querySelectorAll('input[type="number"]').length, 2);
  assert.equal(vista.contenedor.querySelector('table'), null);
  assert.ok(!vista.contenedor.textContent.includes('etapa'));
  assert.ok(!vista.contenedor.textContent.includes('Guardar'));
  assert.equal(vista.contenedor.querySelector('button').disabled, true);
  await vista.elegir('dos');
  assert.deepEqual(vista.cambios, ['dos']);
  assert.equal(vista.contenedor.querySelector('input[placeholder]').value, '');
});

test('no cambia el ensayo durante una captura o comprobación previa', async t => {
  const vista = await montar(t);
  for (const [estado, pendiente] of [[{ medActiva: true }, false], [{}, true]]) {
    await vista.actualizar(estado, pendiente);
    assert.equal(vista.selector().disabled, true);
    await vista.elegir('dos');
    assert.deepEqual(vista.cambios, []);
  }
});

test('permite seleccionar un ensayo aunque no hubiera ninguno activo', async t => {
  const vista = await montar(t, null);
  assert.equal(vista.selector().value, '');
  await vista.elegir('dos');
  assert.equal(vista.selector().value, 'dos');
  assert.equal(vista.contenedor.querySelector('input[placeholder]').disabled, false);
});

test('recupera los datos de la captura, muestra su progreso y permite detenerla', async t => {
  const vista = await montar(t);
  const capturaApi = { id: 7, ensayo_id: 1, nombre: 'Primera', potencia_objetivo: 75, duracion_prevista_segundos: 20 };
  await vista.actualizar({ capturaApi, medActiva: true, medSeg: 6, flujoEstable: false });
  assert.equal(vista.contenedor.querySelector('input[placeholder]').value, 'Primera');
  assert.equal(vista.contenedor.querySelector('input[type="number"]').value, '75');
  assert.equal(vista.contenedor.querySelector('progress').value, 6);
  assert.equal(vista.contenedor.querySelector('progress').max, 20);
  await React.act(async () => vista.contenedor.querySelector('button').click());
  assert.equal(vista.paradas(), 1);
  await vista.actualizar({ capturaApi, medActiva: true, medSeg: 9, flujoEstable: true });
  assert.equal(vista.contenedor.querySelector('progress').value, 9);
  await vista.actualizar({ medActiva: false });
  assert.equal(vista.contenedor.querySelector('progress'), null);
  assert.equal(vista.contenedor.querySelector('button').textContent, 'Iniciar medición');
});

test('valida el nombre, la consigna y una duración limitada', async t => {
  const vista = await montar(t);
  const datos = { nombre: 'Prueba', consigna: 25, duracion_segundos: 20 };
  assert.equal(vista.validar(datos), '');
  assert.equal(vista.validar({ ...datos, duracion_segundos: 300 }), '');
  for (const cambio of [{ nombre: ' ' }, { consigna: '' }, { consigna: 101 }, { duracion_segundos: 0 }, { duracion_segundos: 1.5 }, { duracion_segundos: 301 }]) {
    assert.ok(vista.validar({ ...datos, ...cambio }));
  }
});
