import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, SphereGeometry, Vector3 } from 'three';
import { readFile } from 'node:fs/promises';
import { glbFixture } from './helpers/glbFixture.mjs';
import { CargadorGLB, prepararGLB, LIMITES_GLB, importarGLB, analizarTriangulos, geometriaAjustada } from '../src/servicios/modelos3d.js';

const cube = new BoxGeometry(4, 2, 1);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} != ${expected}`);

test('el cargador visual conserva materiales y posiciones; preparar para calcular no altera el original', async () => {
  const buffer = glbFixture(cube, json => {
    json.nodes[0].name = 'Pieza del túnel';
    json.nodes[0].translation = [8, -2, 4];
    json.materials = [{ name: 'VIDRIO', alphaMode: 'BLEND', pbrMetallicRoughness: { baseColorFactor: [0.25, 0.5, 0.75, 0.4] } }];
    json.meshes[0].primitives[0].material = 0;
  });
  const leerVisual = () => new CargadorGLB().parseAsync(buffer, '');
  const antes = await leerVisual();
  const calculo = await importarGLB(buffer);
  const despues = await leerVisual();
  for (const { scene } of [antes, despues]) {
    const pieza = scene.children[0];
    assert.deepEqual(pieza.position.toArray(), [8, -2, 4]);
    assert.equal(pieza.material.name, 'VIDRIO');
    assert.equal(pieza.material.transparent, true);
    assert.equal(pieza.material.opacity, 0.4);
    assert.deepEqual(pieza.material.color.toArray(), [0.25, 0.5, 0.75]);
    pieza.geometry.dispose();
    pieza.material.dispose();
  }
  assert.equal(calculo.basicClosed, true);
  assert.deepEqual(calculo.dimensions, [4, 2, 1]);
  assert.equal(Math.max(...calculo.positions), 0.5);
  assert.equal(Math.min(...calculo.positions), -0.5);
});

test('el cargador visual rechaza GLB truncados o de otra versión antes de leer la escena', async () => {
  const buffer = glbFixture(cube);
  await assert.rejects(new CargadorGLB().parseAsync(buffer.slice(0, -4), ''), /longitud/);
  const versionIncorrecta = buffer.slice(0);
  new DataView(versionIncorrecta).setUint32(4, 1, true);
  await assert.rejects(new CargadorGLB().parseAsync(versionIncorrecta, ''), /versión 2/);
});

test('un GLB cerrado conserva proporciones, se centra y permite tamaño y orientación físicos', async () => {
  const result = await importarGLB(glbFixture(cube, json => { json.nodes[0].translation = [8, -2, 4]; }));
  assert.equal(result.basicClosed, true); assert.equal(result.triangles, 12);
  assert.deepEqual(result.dimensions, [4, 2, 1]);
  const adjusted = geometriaAjustada(result.positions, 20, [0, 0, 90]);
  adjusted.dimensions.forEach((value, i) => close(value, [10, 20, 5][i]));
  close(adjusted.geometry.boundingBox.getCenter(new Vector3()).length(), 0);
  adjusted.geometry.dispose();
  const tooBig = geometriaAjustada(result.positions, 150, [0, 0, 0]);
  close(tooBig.dimensions[0], 150); tooBig.geometry.dispose();
  assert.throws(() => geometriaAjustada(result.positions, 0, [0, 0, 0]), /intervalo/);
});

test('se aplican las transformaciones de padres y piezas reflejadas, conservando orientación', async () => {
  const result = await importarGLB(glbFixture(cube, json => {
    json.nodes = [{ children: [1], translation: [20, 0, 0], scale: [2, 2, 2] }, { mesh: 0, scale: [-1, 1, 1], translation: [1, 2, 3] }];
  }));
  assert.equal(result.basicClosed, true); assert.deepEqual(result.dimensions, [8, 4, 2]);
  let volume6 = 0;
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  for (let i = 0; i < result.positions.length; i += 9) volume6 += a.fromArray(result.positions, i).dot(b.fromArray(result.positions, i + 3).cross(c.fromArray(result.positions, i + 6)));
  assert.ok(volume6 > 0, 'una reflexión no debe invertir el sentido de todas las caras');
});

test('se detectan superficies abiertas, caras duplicadas y triángulos degenerados', async () => {
  const result = await importarGLB(glbFixture(cube));
  const open = analizarTriangulos(result.positions.slice(9));
  assert.equal(open.basicClosed, false); assert.equal(open.open, 3);
  const duplicate = analizarTriangulos(new Float32Array([...result.positions, ...result.positions.slice(0, 9)]));
  assert.equal(duplicate.duplicate, 1); assert.ok(duplicate.nonManifold > 0);
  const degenerate = analizarTriangulos(new Float32Array([...result.positions, ...Array(9).fill(0)]));
  assert.equal(degenerate.degenerate, 1);
  const reversed = result.positions.slice();
  reversed.set(result.positions.slice(6, 9), 3); reversed.set(result.positions.slice(3, 6), 6);
  assert.ok(analizarTriangulos(reversed).inconsistent > 0);
});

test('se omiten texturas externas y animaciones sin pedir recursos de red', async () => {
  const result = await importarGLB(glbFixture(cube, json => {
    json.images = [{ uri: 'https://example.invalid/textura.png' }]; json.textures = [{ source: 0 }];
    json.materials = [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }];
    json.meshes[0].primitives[0].material = 0; json.animations = [{ channels: [], samplers: [] }];
  }));
  assert.equal(result.basicClosed, true); assert.equal(result.animationsIgnored, true);
});

test('los límites se comprueban antes de decodificar: tamaño, superficies, jerarquía y rangos', () => {
  assert.throws(() => prepararGLB(new ArrayBuffer(LIMITES_GLB.bytes + 1)), /20 MB/);
  assert.throws(() => prepararGLB(glbFixture(cube).slice(0, 40)), /longitud/);
  for (const [change, expected] of [
    [json => { json.buffers[0].uri = 'modelo.bin'; }, /autónomo/],
    [json => { json.nodes[0].children = [0]; }, /ciclos/],
    [json => { json.accessors[0].byteOffset = 100000; }, /exceden/],
    [json => { json.accessors[0].count = 600001; }, /tamaño/],
    [json => { json.extensionsUsed = ['KHR_draco_mesh_compression']; }, /compresión/],
    [json => { json.extensionsRequired = ['EXT_unknown_geometry']; }, /extensión/],
    [json => { json.skins = [{}]; }, /esqueleto/],
    [json => { json.nodes[0].rotation = [0, 0, 0, 0]; }, /rotación/],
    [json => { json.meshes[0].primitives[0].mode = 1; }, /trianguladas/],
  ]) assert.throws(() => prepararGLB(glbFixture(cube, change)), expected);
  assert.throws(() => prepararGLB(glbFixture(cube, json => {
    json.accessors[0].count = 600000;
    json.bufferViews[0].byteStride = 0;
  })), /exceden/);
});

test('se rechazan piezas singulares y coordenadas no finitas', async () => {
  await assert.rejects(importarGLB(glbFixture(cube, json => { json.nodes[0].scale = [0, 1, 1]; })), /singular/);
  await assert.rejects(importarGLB(glbFixture(cube, (_json, positions) => { positions[0] = NaN; })), /coordenadas/);
});

test('se admiten mallas sin índice y se rechazan índices fuera de la lista de vértices', async () => {
  const unindexed = cube.toNonIndexed();
  assert.equal((await importarGLB(glbFixture(unindexed))).basicClosed, true); unindexed.dispose();
  await assert.rejects(importarGLB(glbFixture(cube, (json, _positions, bin) => {
    new Uint32Array(bin, json.bufferViews[1].byteOffset)[0] = 999999;
  })), /índice de vértice/);
});

test('el límite de triángulos cuenta todas las instancias visibles de una misma malla', () => {
  const sphere = new SphereGeometry(1, 48, 24);
  assert.throws(() => prepararGLB(glbFixture(sphere, json => {
    json.nodes = Array.from({ length: 100 }, () => ({ mesh: 0 }));
    json.scenes[0].nodes = json.nodes.map((_node, i) => i);
  })), /200.000 triángulos/);
  sphere.dispose();
});

test('el GLB de ejemplo entregado pasa por el importador completo', async () => {
  const bytes = await readFile(new URL('../public/models/aerodinamica/ejemplo.glb', import.meta.url));
  const result = await importarGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(result.basicClosed, true); assert.ok(result.triangles > 1000);
  close(result.dimensions[0] / result.dimensions[1], 1.8 / 0.7);
});
