import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import * as React from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three-stdlib';
import { VISTAS_TUNEL } from '../src/components/visor/ajustesTunel.js';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
after(() => window.happyDOM.close());

async function preparar(t) {
  let estado;
  const movimientos = [];
  const bounds = {
    refresh() { return this; },
    moveTo(posicion) { movimientos.push({ posicion }); return this; },
    lookAt(vista) { Object.assign(movimientos.at(-1), vista); return this; },
  };
  const contexto = vm.createContext({});
  const modulo = new vm.SourceTextModule(readFileSync(new URL('../src/components/visor/ControladorCamara.jsx', import.meta.url), 'utf8'), { context: contexto });
  const dependencias = { react: React, three: { Vector3 },
    '@react-three/fiber': { useThree: () => estado }, '@react-three/drei': { useBounds: () => bounds } };
  await modulo.link(nombre => new vm.SyntheticModule(Object.keys(dependencias[nombre]), function () {
    for (const [clave, valor] of Object.entries(dependencias[nombre])) this.setExport(clave, valor);
  }, { context: contexto }));
  await modulo.evaluate();
  const contenedor = document.createElement('div');
  const raiz = createRoot(contenedor);
  t.after(async () => React.act(async () => raiz.unmount()));
  const controlesRef = { current: null };
  return {
    movimientos,
    salir: () => React.act(async () => raiz.render(null)),
    render: (camera, controls, opciones = {}) => React.act(async () => {
      estado = { camera, controls, invalidate: () => {} };
      controlesRef.current = controls;
      raiz.render(React.createElement(modulo.namespace.default, {
        ...VISTAS_TUNEL.dashboard, controlesRef, ...opciones,
      }));
    }),
  };
}

test('Dashboard recupera la misma cámara y objetivo en cada entrada, incluso si los controles llegan después', async t => {
  const vista = await preparar(t);
  const posicion = new Vector3(...VISTAS_TUNEL.dashboard.posicionCamaraInicial);
  const objetivo = new Vector3(...VISTAS_TUNEL.dashboard.objetivoCamaraInicial);
  const esperada = new PerspectiveCamera();
  esperada.position.copy(posicion);
  esperada.lookAt(objetivo);
  for (let entrada = 0; entrada < 3; entrada++) {
    const camera = new PerspectiveCamera();
    camera.position.copy(posicion);
    await vista.render(camera, undefined);
    const controls = new OrbitControls(camera);
    await vista.render(camera, controls);
    assert.ok(controls.target.distanceTo(objetivo) < 1e-10);
    assert.ok(camera.position.distanceTo(posicion) < 1e-10);
    assert.ok(camera.up.distanceTo(new Vector3(0, 1, 0)) < 1e-10);
    assert.ok(camera.quaternion.angleTo(esperada.quaternion) < 1e-7);
    assert.equal(vista.movimientos.length, 0);
    controls.setAzimuthalAngle(controls.getAzimuthalAngle() + 0.5);
    await vista.salir();
    controls.dispose();
  }
});

test('los cambios de vista y el reinicio siguen animándose con Drei y una vertical fija', async t => {
  const vista = await preparar(t);
  const camera = new PerspectiveCamera();
  const controls = new OrbitControls(camera);
  await vista.render(camera, controls);
  camera.up.set(0.1, 0.98, 0.15);
  const destino = { camara: [4.4, 0.9, 5.7], objetivo: [0.82, 0, -0.02] };
  await vista.render(camera, controls, { vistaActiva: destino });
  assert.deepEqual(Array.from(vista.movimientos.at(-1).up), [0, 1, 0]);
  assert.equal(vista.movimientos.at(-1).target, destino.objetivo);
  await vista.render(camera, controls, { solicitudReinicio: 1 });
  assert.equal(vista.movimientos.at(-1).target, VISTAS_TUNEL.dashboard.objetivoCamaraInicial);
  assert.deepEqual(Array.from(vista.movimientos.at(-1).up), [0, 1, 0]);
  controls.dispose();
});
