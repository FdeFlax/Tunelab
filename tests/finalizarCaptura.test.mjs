import assert from "node:assert/strict";
import test from "node:test";
import { finalizarCaptura } from "../src/servicios/tunel/finalizarCaptura.js";

function preparar(t, captura) {
  const eventos = [];
  const anterior = globalThis.window;
  globalThis.window = { dispatchEvent: evento => eventos.push(evento.type) };
  t.after(() => { globalThis.window = anterior; });
  return {
    eventos,
    acciones: {
      apagarTunel: t.mock.fn(async () => ({ captura })),
      detenerMedicion: t.mock.fn(async () => ({ captura })),
    },
  };
}

for (const apagar of [true, false]) {
  test(`${apagar ? "apagar" : "detener"} confirma el guardado del servidor`, async t => {
    const { acciones, eventos } = preparar(t, { id: 7, estado: "finalizada" });
    const fin = await finalizarCaptura(acciones, { apagar });
    assert.equal(fin.guardada, true);
    assert.equal(fin.errorGuardado, null);
    assert.equal(acciones.apagarTunel.mock.callCount(), Number(apagar));
    assert.equal(acciones.detenerMedicion.mock.callCount(), Number(!apagar));
    assert.deepEqual(eventos, ["tunelab:registro-actualizado"]);
  });
}

test("apagar sin captura no anuncia una medición guardada", async t => {
  const { acciones, eventos } = preparar(t, null);
  const fin = await finalizarCaptura(acciones, { apagar: true });
  assert.equal(fin.guardada, false);
  assert.equal(fin.errorGuardado, null);
  assert.deepEqual(eventos, []);
});

test("una captura interrumpida conserva el error y no anuncia guardado completo", async t => {
  const { acciones, eventos } = preparar(t, { id: 7, estado: "error" });
  const fin = await finalizarCaptura(acciones);
  assert.equal(fin.guardada, false);
  assert.match(fin.errorGuardado.message, /interrumpida/);
  assert.deepEqual(eventos, []);
});

test("una orden fallida se propaga sin fingir que el túnel está apagado", async t => {
  const { acciones, eventos } = preparar(t, null);
  acciones.apagarTunel = async () => { throw new Error("Sin conexión"); };
  await assert.rejects(finalizarCaptura(acciones, { apagar: true }), /Sin conexión/);
  assert.deepEqual(eventos, []);
});
