import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry } from 'three';
import { glbFixture } from './helpers/glbFixture.mjs';
import { importarGLB, geometriaAjustada, evaluarObjeto as evaluar, maximoTamano as maximo } from '../src/servicios/modelos3d.js';

const config = { minimoObjetoCm: 2, maximosObjetoCm: [60, 60, 60], pasoCm: 1 };
const evaluarObjeto = objeto => evaluar(objeto, config);
const maximoTamano = (medidas, tamano) => maximo(medidas, tamano, config);

test('un GLB cerrado demasiado pequeño recibe un tamaño aplicable sin deformarlo', async () => {
  const cube = new BoxGeometry(4, 2, 1);
  const imported = await importarGLB(glbFixture(cube)); cube.dispose();
  for (const angles of [[0, 0, 0], [35, -20, 90]]) {
    const small = geometriaAjustada(imported.positions, 2, angles);
    const review = evaluarObjeto({ cerrado: imported.basicClosed, medidas: small.dimensions, tamano: 2 });
    assert.ok(review.ajuste > 2);
    const adjusted = geometriaAjustada(imported.positions, review.ajuste, angles);
    assert.equal(evaluarObjeto({ cerrado: true, medidas: adjusted.dimensions, tamano: review.ajuste }).motivo, '');
    adjusted.dimensions.forEach((d, i) => assert.ok(Math.abs(d / small.dimensions[i] - review.ajuste / 2) < 1e-5));
    small.geometry.dispose(); adjusted.geometry.dispose();
  }
  const defaultSize = geometriaAjustada(imported.positions, 5, [0, 0, 0]);
  const result = evaluarObjeto({ cerrado: true, medidas: defaultSize.dimensions, tamano: 5 });
  assert.match(result.detalles, /ancho: 1,25 cm/);
  assert.equal(result.ajuste, 8.5);
  defaultSize.geometry.dispose();
});

test('una malla abierta explica sus fallos y no ofrece arreglarla cambiando la escala', () => {
  const review = evaluarObjeto({ cerrado: false, revision: { open: 3, duplicate: 2 }, medidas: [20, 10, 5], tamano: 20 });
  assert.match(review.motivo, /3 bordes abiertos/);
  assert.match(review.motivo, /2 caras duplicadas/);
  assert.equal(review.ajuste, undefined);
});

test('el ajuste no promete resolver proporciones incompatibles ni acepta dimensiones inválidas', () => {
  assert.equal(evaluarObjeto({ cerrado: true, medidas: [20, 2, 0.5], tamano: 20 }).ajuste, null);
  for (const medidas of [[20, 0, 5], [20, NaN, 5], [20, 6]]) {
    assert.match(evaluarObjeto({ cerrado: true, medidas, tamano: 20 }).motivo, /tres dimensiones/);
  }
  assert.equal(evaluarObjeto({ cerrado: true, medidas: [60, 2, 2], tamano: 60 }).motivo, '');
  assert.match(evaluarObjeto(null).motivo, /Importa/);
});

test('el nuevo mínimo de 2 cm se aplica a cada eje sin ampliar el máximo de 60 cm', () => {
  for (let axis = 0; axis < 3; axis++) {
    const medidas = [10, 10, 10];
    medidas[axis] = 2;
    assert.equal(evaluarObjeto({ cerrado: true, medidas, tamano: 10 }).motivo, '');
    medidas[axis] = 1.99;
    assert.match(evaluarObjeto({ cerrado: true, medidas, tamano: 10 }).detalles, /mínimo 2 cm/);
    medidas[axis] = 60.01;
    assert.match(evaluarObjeto({ cerrado: true, medidas, tamano: 60.01 }).detalles, /máximo 60 cm/);
  }
});

test('el tamaño máximo respeta la sección y el motor con objetos y giros distintos', async () => {
  for (const proportions of [[1, 1, 1], [4, 2, 1]]) {
    const box = new BoxGeometry(...proportions);
    const imported = await importarGLB(glbFixture(box)); box.dispose();
    for (const angles of [[0, 0, 0], [0, 0, 45], [35, -20, 90]]) {
      const initial = geometriaAjustada(imported.positions, 20, angles);
      const maximum = maximoTamano(initial.dimensions, 20);
      const adjusted = geometriaAjustada(imported.positions, maximum, angles);
      assert.equal(evaluarObjeto({ cerrado: true, medidas: adjusted.dimensions, tamano: maximum }).motivo, '');
      assert.ok(adjusted.dimensions.every(d => d <= 60));
      // El siguiente paso ya agota el espacio admitido por el motor, sin deformar el objeto.
      const next = geometriaAjustada(imported.positions, maximum + 0.5, angles);
      assert.ok(next.dimensions.some(d => d > 59.99));
      initial.geometry.dispose(); adjusted.geometry.dispose(); next.geometry.dispose();
    }
  }
});

test('girar un cubo reduce el tamaño máximo, sin confundir el lado con su diagonal', async () => {
  const box = new BoxGeometry(1, 1, 1);
  const imported = await importarGLB(glbFixture(box)); box.dispose();
  const straight = geometriaAjustada(imported.positions, 20, [0, 0, 0]);
  const rotated = geometriaAjustada(imported.positions, 20, [0, 0, 45]);
  const straightLimit = maximoTamano(straight.dimensions, 20);
  const rotatedLimit = maximoTamano(rotated.dimensions, 20);
  assert.ok(rotatedLimit < straightLimit);
  const adjusted = geometriaAjustada(imported.positions, rotatedLimit, [0, 0, 45]);
  assert.equal(evaluarObjeto({ cerrado: true, medidas: adjusted.dimensions, tamano: rotatedLimit }).motivo, '');
  straight.geometry.dispose(); rotated.geometry.dispose(); adjusted.geometry.dispose();
});

test('el límite de escala no convierte una superficie sin volumen en un objeto calculable', () => {
  const medidas = [20, 10, 0];
  assert.ok(maximoTamano(medidas, 20) > 20);
  assert.match(evaluarObjeto({ cerrado: true, medidas, tamano: 20 }).motivo, /tres dimensiones/);
  assert.equal(maximoTamano([0, 0, 0], 20), null);
  assert.equal(maximoTamano([NaN, 10, 20], 20), null);
});

test('sin configuración del servidor no se autoriza el cálculo del objeto', () => {
  assert.match(evaluar({ cerrado: true, medidas: [20, 10, 5] }).motivo, /Esperando/);
});
