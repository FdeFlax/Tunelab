import { empaquetarGLB } from '../../src/servicios/modelos3d.js';

// Own triangle meshes, without textures, to exercise the complete import path.
export function glbFixture(geometry, change = () => {}) {
  geometry.computeBoundingBox();
  const positions = geometry.attributes.position.array;
  const indices = geometry.index ? new Uint32Array(geometry.index.array) : null;
  const bin = new ArrayBuffer(positions.byteLength + (indices?.byteLength || 0));
  new Float32Array(bin, 0, positions.length).set(positions);
  if (indices) new Uint32Array(bin, positions.byteLength, indices.length).set(indices);
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: bin.byteLength }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
    accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() }],
  };
  if (indices) {
    json.meshes[0].primitives[0].indices = 1;
    json.bufferViews.push({ buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength });
    json.accessors.push({ bufferView: 1, componentType: 5125, count: indices.length, type: 'SCALAR' });
  }
  change(json, new Float32Array(bin, 0, positions.length), bin);
  return empaquetarGLB(json, bin);
}
