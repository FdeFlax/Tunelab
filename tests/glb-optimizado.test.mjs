import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BoxGeometry, SphereGeometry } from 'three';
import { empaquetarGLB, LIMITES_GLB, optimizarGLB, importarGLB } from '../src/servicios/modelos3d.js';
import { glbFixture } from './helpers/glbFixture.mjs';

function abrir(buffer) {
  const n = new DataView(buffer).getUint32(12, true);
  return { json: JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, n))), bin: new Uint8Array(buffer, 28 + n) };
}

function conTextura(buffer, cantidad) {
  const { json, bin } = abrir(buffer), datos = new Uint8Array(bin.length + cantidad);
  datos.set(bin);
  datos.fill(173, bin.length); // Datos deliberadamente no decodificables: el lector debe omitirlos.
  json.buffers[0].byteLength = datos.length;
  json.images = [{ bufferView: json.bufferViews.length, mimeType: 'image/webp' }];
  json.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: cantidad });
  json.textures = [{ extensions: { EXT_texture_webp: { source: 0 } } }];
  json.materials = [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }];
  json.meshes[0].primitives[0].material = 0;
  json.extensionsUsed = json.extensionsRequired = ['EXT_texture_webp'];
  return empaquetarGLB(json, datos);
}

test('un GLB de más de 20 MB conserva exactamente las piezas y triángulos sin cargar texturas', async () => {
  const cube = new BoxGeometry(4, 2, 1);
  const base = glbFixture(cube, json => {
    json.nodes = [{ children: [1, 2], translation: [10, -2, 1] }, { mesh: 0, scale: [-1, 1, 1] }, { mesh: 0, translation: [8, 0, 0] }];
  });
  cube.dispose();
  const grande = conTextura(base, 24 * 1024 * 1024);
  const firma = () => createHash('sha256').update(new Uint8Array(grande)).digest('hex');
  const antes = firma(), limpio = optimizarGLB(grande);
  assert.ok(grande.byteLength > LIMITES_GLB.bytes);
  assert.ok(limpio.buffer.byteLength < 4096);
  assert.equal(limpio.bytesOriginales, grande.byteLength);
  assert.equal(limpio.bytesPreparados, limpio.buffer.byteLength);
  assert.equal(firma(), antes, 'el archivo de origen permanece intacto');
  const { json } = abrir(limpio.buffer);
  for (const key of ['images', 'textures', 'materials', 'animations']) assert.equal(json[key], undefined);
  const original = await importarGLB(base), preparado = await importarGLB(grande), reimportado = await importarGLB(limpio.buffer);
  for (const result of [preparado, reimportado]) {
    assert.deepEqual(result.positions, original.positions);
    assert.deepEqual(result.dimensions, original.dimensions);
    assert.equal(result.pieces, 2);
    assert.equal(result.triangles, 24);
    assert.equal(result.basicClosed, true);
  }
});

test('extrae posiciones intercaladas sin copiar normales ni cambiar sus valores', async () => {
  const cube = new BoxGeometry(4, 2, 1), base = glbFixture(cube);
  cube.dispose();
  const { json, bin } = abrir(base), posiciones = json.accessors[0], indices = json.accessors[1];
  const origen = new Float32Array(bin.buffer, bin.byteOffset, posiciones.count * 3);
  const datos = new Uint8Array(posiciones.count * 24 + indices.count * 4);
  const combinado = new Float32Array(datos.buffer, 0, posiciones.count * 6);
  for (let i = 0; i < posiciones.count; i++) {
    combinado.set(origen.subarray(i * 3, i * 3 + 3), i * 6);
    combinado.set([0.25, 0.5, 0.75], i * 6 + 3);
  }
  datos.set(bin.subarray(json.bufferViews[1].byteOffset), posiciones.count * 24);
  json.buffers[0].byteLength = datos.length;
  Object.assign(json.bufferViews[0], { byteLength: posiciones.count * 24, byteStride: 24 });
  json.bufferViews[1].byteOffset = posiciones.count * 24;
  json.accessors.push({ bufferView: 0, byteOffset: 12, componentType: 5126, count: posiciones.count, type: 'VEC3' });
  json.meshes[0].primitives[0].attributes.NORMAL = 2;
  const entrelazado = empaquetarGLB(json, datos), limpio = optimizarGLB(entrelazado);
  assert.ok(limpio.buffer.byteLength < entrelazado.byteLength);
  assert.deepEqual((await importarGLB(limpio.buffer)).positions, (await importarGLB(base)).positions);
});

test('conserva la alineación y los valores de posiciones cuantizadas de tres bytes', async () => {
  const bin = new Uint8Array([0, 0, 0, 0, 127, 0, 0, 0, 0, 127, 0, 0, 0, 1, 2]);
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12, byteStride: 4 }, { buffer: 0, byteOffset: 12, byteLength: 3 }],
    accessors: [
      { bufferView: 0, componentType: 5120, normalized: true, count: 3, type: 'VEC3', min: [0, 0, 0], max: [127, 127, 0] },
      { bufferView: 1, componentType: 5121, count: 3, type: 'SCALAR' }
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }]
  };
  const limpio = optimizarGLB(empaquetarGLB(json, bin));
  assert.equal(abrir(limpio.buffer).json.bufferViews[0].byteStride, 4);
  const resultado = await importarGLB(limpio.buffer);
  assert.deepEqual(resultado.dimensions, [1, 1, 0]);
  assert.equal(resultado.basicClosed, false);
  assert.equal(resultado.open, 3);
});

test('optimizar no evita los límites de entrada, triángulos ni las validaciones geométricas', async () => {
  assert.throws(() => optimizarGLB(new ArrayBuffer(LIMITES_GLB.bytesEntrada + 1)), /100 MB/);
  const sphere = new SphereGeometry(1, 48, 24);
  assert.throws(() => optimizarGLB(glbFixture(sphere, json => {
    json.nodes = Array.from({ length: 100 }, () => ({ mesh: 0 }));
    json.scenes[0].nodes = json.nodes.map((_, i) => i);
  })), /200.000 triángulos/);
  sphere.dispose();
  const cube = new BoxGeometry(4, 2, 1);
  const datos = glbFixture(cube, (json, _, bin) => { new Uint32Array(bin, json.bufferViews[1].byteOffset)[0] = 999999; });
  cube.dispose();
  await assert.rejects(importarGLB(optimizarGLB(datos).buffer), /índice de vértice/);
});
