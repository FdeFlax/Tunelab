import test from 'node:test';
import assert from 'node:assert/strict';
import { colorRapidez as colorear, pixelesPlano } from '../src/aerodinamica/mapas.js';
const colorRapidez = valor => colorear(valor, 20);

test('los planos comparten una escala fija y diferencian sólido de velocidad cero', () => {
  assert.notDeepEqual(colorRapidez(null), colorRapidez(0));
  assert.deepEqual(colorRapidez(20), [178, 59, 69, 255]);
  assert.deepEqual(colorRapidez(20), colorRapidez(40));
  assert.notDeepEqual(colorRapidez(17), colorRapidez(20));
  assert.notDeepEqual(colorRapidez(0.16), colorRapidez(19.8));
  assert.throws(() => colorRapidez(NaN));
  assert.throws(() => colorRapidez(-1));
  for (const escala of [undefined, 0, -1, Infinity]) assert.throws(() => colorear(1, escala));
});

test('el mapa respeta filas, sentido vertical y máscara, sin inventar interpolación', () => {
  const values = Array.from({length:71}, () => Array(101).fill(0));
  values[0][3] = 1; values[70][5] = null;
  const pixels = pixelesPlano({width:101,height:71,speed_ms:values,escalaMaxMs:20});
  assert.deepEqual([...pixels.slice((70*101+3)*4,(70*101+3)*4+4)],colorRapidez(1));
  assert.deepEqual([...pixels.slice(5*4,5*4+4)],colorRapidez(null));
  assert.throws(() => pixelesPlano({width:101,height:71,speed_ms:[],escalaMaxMs:20}));
});
