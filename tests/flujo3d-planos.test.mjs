import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { transformWithOxc } from 'vite';
import * as campo from '../src/aerodinamica/campo.js';
import { pixelesPlano } from '../src/aerodinamica/mapas.js';

const ventana = new Window();
for (const nombre of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event']) globalThis[nombre] = nombre === 'window' ? ventana : ventana[nombre];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');

function modulo(datos, contexto) {
  return new vm.SyntheticModule(Object.keys(datos), function () {
    for (const [nombre, valor] of Object.entries(datos)) this.setExport(nombre, valor);
  }, { context: contexto });
}

test('los tres controles React mueven cortes independientes y cancelan el dibujo al desmontarse', async () => {
  const frames = new Map(), dibujos = new Map();
  let contador = 0;
  const contexto = vm.createContext({ Intl, requestAnimationFrame: fn => { frames.set(++contador, fn); return contador; }, cancelAnimationFrame: id => frames.delete(id) });
  const ruta = new URL('../src/aerodinamica/Laboratorio.jsx', import.meta.url);
  const { code } = await transformWithOxc(readFileSync(ruta, 'utf8') + '\nexport { Plano };', ruta.pathname, { jsx: { runtime: 'automatic' } });
  const programa = new vm.SourceTextModule(code, { context: contexto });
  const dependencias = {
    react: React, 'react/jsx-runtime': jsx,
    './campo.js': campo,
    './mapas.js': { pintarPlano: (canvas, plano) => dibujos.set(canvas.id, pixelesPlano(plano)) },
    './vistaObjeto.jsx': { default: () => null },
    './flujo.js': { useFlujo: () => { throw new Error('No se utiliza en estos cortes'); } },
    '../servicios/modelos3d.js': Object.fromEntries(['LIMITES_GLB', 'geometriaAjustada', 'maximoTamano', 'evaluarObjeto'].map(k => [k, null])),
    './estilo.css': {},
  };
  await programa.link(nombre => modulo(dependencias[nombre], contexto));
  await programa.evaluate();
  const Plano = programa.namespace.Plano;
  const field = { shape: [21, 15, 15], origin: [-10, -7, -7], step: 1, values: new Float32Array(21 * 15 * 15) };
  for (let x = 0; x < 21; x++) for (let y = 0; y < 15; y++) for (let z = 0; z < 15; z++) field.values[(x * 15 + y) * 15 + z] = x / 10 + y / 100 + z / 1000;
  const contenedor = document.createElement('div'); document.body.append(contenedor);
  const root = createRoot(contenedor);
  const flush = () => { const pendientes = [...frames.values()]; frames.clear(); pendientes.forEach(fn => fn()); };
  try {
    await React.act(async () => root.render(React.createElement(React.Fragment, null,
      ...Object.keys(campo.ORIENTACIONES).map(orientacion => React.createElement(Plano, { key: orientacion, campo: field, orientacion })))));
    flush();
    const posiciones = { vertical: 0, horizontal: 0, transversal: 0 };
    for (const [orientacion, valor] of [['horizontal', 3], ['vertical', -4], ['transversal', 8]]) {
      const input = contenedor.querySelector(`#posicion-${orientacion}`);
      await React.act(async () => {
        Object.getOwnPropertyDescriptor(ventana.HTMLInputElement.prototype, 'value').set.call(input, String(valor));
        input.dispatchEvent(new ventana.Event('input', { bubbles: true }));
      });
      assert.equal(frames.size, 1, 'solo se repinta el plano modificado');
      flush(); posiciones[orientacion] = valor;
      for (const [key, posicion] of Object.entries(posiciones)) {
        assert.equal(Number(contenedor.querySelector(`#posicion-${key}`).value), posicion);
        assert.deepEqual(dibujos.get(`mapa-${key}`), pixelesPlano(campo.cortarCampo(field, key, posicion)));
      }
    }
    await React.act(async () => root.unmount());
    assert.equal(frames.size, 0);
  } finally { contenedor.remove(); await ventana.happyDOM.close(); }
});
