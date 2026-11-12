import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conectarPlanos } from '../src/aerodinamica/planos.js';
import { cortarCampo } from '../src/aerodinamica/campo.js';
import { pixelesPlano } from '../src/aerodinamica/mapas.js';

class Element extends EventTarget {
  attributes = new Map();
  style = { setProperty() {} };
  draws = [];
  setAttribute(name, value) { this.attributes.set(name, value); }
  getContext() { return {
    putImageData: image => this.draws.push(image.data),
    clearRect: () => { this.draws = []; },
  }; }
}

test('cada deslizador mueve solo su corte, conserva los otros y se limpia al salir', t => {
  const html = readFileSync(new URL('../src/aerodinamica/contenido.html', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const root = { querySelector: selector => elements.get(selector.slice(1)) };
  const frames = new Map();
  let frameId = 0;
  let views;
  t.after(() => views?.dispose());
  const globals = {
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    ImageData: class { constructor(data) { this.data = data; } },
  };
  for (const [name, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  const field = { shape: [101, 71, 71], origin: [-50, -35, -35], step: 1, values: new Float32Array(101 * 71 * 71) };
  for (let x = 0; x < 101; x++) for (let y = 0; y < 71; y++) for (let z = 0; z < 71; z++) {
    field.values[(x * 71 + y) * 71 + z] = x / 100 + y / 1000 + z / 10000;
  }
  views = conectarPlanos(root);
  views.mostrar(field);
  const positions = { vertical: 0, horizontal: 0, transversal: 0 };
  const move = (orientation, value) => {
    const slider = elements.get(`posicion-${orientation}`);
    slider.value = value;
    slider.dispatchEvent(new Event('input'));
  };
  for (const [orientation, value] of [['horizontal', 9], ['vertical', -7], ['transversal', 16]]) {
    const before = Object.fromEntries(Object.keys(positions).map(key => [key, elements.get(`mapa-${key}`).draws.length]));
    move(orientation, value - 1);
    move(orientation, value);
    assert.equal(frames.size, 1, 'agrupa los eventos en un único repintado');
    flush();
    positions[orientation] = value;
    for (const [key, position] of Object.entries(positions)) {
      const canvas = elements.get(`mapa-${key}`);
      assert.equal(Number(elements.get(`posicion-${key}`).value), position);
      assert.equal(canvas.draws.length, before[key] + Number(key === orientation));
      assert.deepEqual(canvas.draws.at(-1), pixelesPlano(cortarCampo(field, key, position)));
    }
  }
  move('horizontal', 10);
  views.clear();
  assert.equal(frames.size, 0);
  assert.equal(elements.get('mapas-flujo').hidden, true);
  assert.equal(elements.get('vacio').hidden, false);
  views.mostrar(field);
  assert.equal(elements.get('valor-horizontal').textContent, '+10 cm');
  assert.equal(elements.get('valor-vertical').textContent, '-7 cm');
  assert.equal(elements.get('valor-transversal').textContent, '+16 cm');
  views.dispose();
  move('horizontal', 11);
  assert.equal(frames.size, 0);
});
