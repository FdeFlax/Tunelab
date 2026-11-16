import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import * as React from 'react';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const query = await import('@tanstack/react-query');
after(() => window.happyDOM.close());

async function montar(t, cargar) {
  let usuario = 'alumno';
  let resultado;
  const contexto = vm.createContext({ console });
  const servicios = {
    leerIdentidadApi: () => ({ identificador: usuario }),
    cargarMedicionApiCompleta: cargar,
    asegurarUsuarioApi() {}, listarEnsayosApi() {}, listarMedicionesEnsayoApi() {},
    vincularEnsayoApi() {}, crearEnsayoDesdeApi() {},
  };
  const dependencias = { react: React, '@tanstack/react-query': query };
  const modulo = new vm.SourceTextModule(readFileSync(new URL('../src/logicaPantallas/useEnsayos.js', import.meta.url), 'utf8'), { context: contexto });
  await modulo.link(nombre => {
    const exports = dependencias[nombre] || servicios;
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context: contexto });
  });
  await modulo.evaluate();
  const cliente = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const raiz = createRoot(contenedor);
  function Prueba({ seleccion, usaApi }) {
    resultado = modulo.namespace.useDetalleMedicion(seleccion, usaApi);
    return null;
  }
  async function render(id, usaApi = true) {
    await React.act(async () => raiz.render(React.createElement(query.QueryClientProvider, { client: cliente },
      React.createElement(Prueba, { seleccion: id == null ? null : { id }, usaApi }))));
    await React.act(async () => { await new Promise(r => setTimeout(r, 20)); });
  }
  t.after(async () => { await React.act(async () => raiz.unmount()); cliente.clear(); contenedor.remove(); });
  return { render, leer: () => resultado, cliente, cambiarUsuario: nombre => { usuario = nombre; } };
}

test('cambiar de medición aborta la consulta anterior y descarta su respuesta tardía', async t => {
  let signalAnterior, resolver;
  const vista = await montar(t, (medicion, signal) => medicion.id === 1
    ? new Promise(r => { resolver = r; signalAnterior = signal; }) : Promise.resolve(medicion));
  await vista.render(1);
  await vista.render(2);
  assert.equal(signalAnterior.aborted, true);
  await React.act(async () => resolver({ id: 1 }));
  assert.equal(vista.leer().medicionApiDetalle.id, 2);
});

test('un error del servidor no queda visible al pasar a una medición importada', async t => {
  const vista = await montar(t, async () => { throw new Error('Sin conexión'); });
  await vista.render(1);
  assert.match(vista.leer().errorDetalle, /cargar las muestras/);
  await vista.render(1, false);
  assert.equal(vista.leer().errorDetalle, '');
  assert.equal(vista.leer().medicionApiDetalle, null);
});

test('la misma id de otro usuario no reutiliza el detalle anterior', async t => {
  let llamadas = 0;
  const vista = await montar(t, async medicion => ({ ...medicion, llamada: ++llamadas }));
  await vista.render(1);
  vista.cambiarUsuario('profesor');
  await vista.render(1);
  assert.equal(vista.leer().medicionApiDetalle.llamada, 2);
  assert.equal(vista.cliente.getQueryCache().findAll().some(q => q.queryKey[1] === 'profesor'), true);
});

test('limpiar la caché al salir aborta una consulta de detalle pendiente', async t => {
  let signal;
  const vista = await montar(t, (_medicion, recibido) => { signal = recibido; return new Promise(() => {}); });
  await vista.render(1);
  await React.act(async () => vista.cliente.clear());
  assert.equal(signal.aborted, true);
});
