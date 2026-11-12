import test from 'node:test';
import assert from 'node:assert/strict';
import { colorRapidez, pixelesPlano } from '../src/aerodinamica/mapas.js';

test('los planos comparten una escala fija y diferencian sólido de velocidad cero', () => {
  assert.notDeepEqual(colorRapidez(null), colorRapidez(0));
  assert.deepEqual(colorRapidez(1.6), colorRapidez(4));
  assert.throws(() => colorRapidez(NaN));
  assert.throws(() => colorRapidez(-1));
});

test('el mapa respeta filas, sentido vertical y máscara, sin inventar interpolación', () => {
  const values = Array.from({length:71}, () => Array(101).fill(0));
  values[0][3] = 1; values[70][5] = null;
  const pixels = pixelesPlano({width:101,height:71,speed_ratio:values});
  assert.deepEqual([...pixels.slice((70*101+3)*4,(70*101+3)*4+4)],colorRapidez(1));
  assert.deepEqual([...pixels.slice(5*4,5*4+4)],colorRapidez(null));
  assert.throws(() => pixelesPlano({width:101,height:71,speed_ratio:[]}));
});
