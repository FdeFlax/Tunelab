import test from 'node:test';
import assert from 'node:assert/strict';
import { leerCampo as decodificar, cortarCampo, limitesPlano, ORIENTACIONES } from '../src/aerodinamica/campo.js';
import { pixelesPlano, colorRapidez } from '../src/aerodinamica/mapas.js';

const config = { malla: [101, 71, 71], origenCm: [-50, -35, -35], pasoCm: 1 };
const leerCampo = volumen => decodificar(volumen, config);

function volumeFixture() {
  const data = Buffer.alloc(101 * 71 * 71 * 4);
  for (let x = 0; x < 101; x++) for (let y = 0; y < 71; y++) for (let z = 0; z < 71; z++) {
    // Asymmetric, separable coordinates expose transposed/reversed axes.
    data.writeFloatLE(x / 100 + y / 1000 + z / 10000, ((x * 71 + y) * 71 + z) * 4);
  }
  data.writeFloatLE(-1, ((53 * 71 + 37) * 71 + 40) * 4);
  return { formato: 'rapidez-f32le-xyz-v1', malla: [101, 71, 71], origen_cm: [-50, -35, -35], paso_cm: 1, datos: data.toString('base64') };
}
const encoded = volumeFixture();
const field = leerCampo(encoded);
const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('los cortes desplazados corresponden al mismo punto 3D en los tres ejes', () => {
  const xy = cortarCampo(field, 'vertical', 5), xz = cortarCampo(field, 'horizontal', 2), zy = cortarCampo(field, 'transversal', 3);
  assert.equal(xy.speed_ratio[37][53], null);
  assert.equal(xz.speed_ratio[40][53], null);
  assert.equal(zy.speed_ratio[37][40], null);
  approx(xy.speed_ratio[12][23], .23 + .012 + .004);
  approx(xz.speed_ratio[12][23], .23 + .037 + .0012);
  approx(zy.speed_ratio[12][23], .53 + .012 + .0023);
  assert.deepEqual([zy.width, zy.height, zy.widthCm, zy.heightCm], [71, 71, 70, 70]);
  assert.equal(field.values[(53 * 71 + 37) * 71 + 40], -1);
});

test('los extremos, la escala y el sentido de los mapas se conservan al mover los planos', () => {
  for (const orientation of Object.keys(ORIENTACIONES)) {
    const { min, max } = limitesPlano(field, orientation);
    for (const position of [min, 0, max]) {
      const slice = cortarCampo(field, orientation, position);
      const pixels = pixelesPlano(slice);
      assert.deepEqual([...pixels.subarray(0, 4)], colorRapidez(slice.speed_ratio[slice.height - 1][0]));
    }
    assert.throws(() => cortarCampo(field, orientation, max + 1));
    assert.throws(() => cortarCampo(field, orientation, .5));
  }
  assert.throws(() => cortarCampo(field, 'inclinada', 0));
});

test('se rechazan campos truncados, ejes alterados y valores numéricos inválidos', () => {
  for (const patch of [{ datos: 'AAAA' }, { malla: [71,101,71] }, { origen_cm: [0,0,0] }, { paso_cm: 2 }, { formato: 'otro' }]) assert.throws(() => leerCampo({ ...encoded, ...patch }));
  for (const value of [NaN, Infinity, -2, 16]) {
    const data = Buffer.from(encoded.datos, 'base64'); data.writeFloatLE(value, 0);
    assert.throws(() => leerCampo({ ...encoded, datos: data.toString('base64') }));
  }
});
