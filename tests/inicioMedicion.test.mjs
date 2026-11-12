import assert from "node:assert/strict";
import test from "node:test";
import { motivoBloqueoMedicion } from "../src/servicios/tunel/estadoTunel.js";

const ensayo = { mediciones: [] };
const preparado = {
  permiteCtrl: true, bloqSeg: false, estadoTunel: "RUNNING", flujoEstable: true,
  medActiva: false, programa: null, limitesUso: { medicionesPorEnsayo: 3 },
};

test("permite iniciar desde apagado o registrar la transición con el túnel encendido", () => {
  assert.equal(motivoBloqueoMedicion(preparado, ensayo, true), "");
  assert.equal(motivoBloqueoMedicion({ ...preparado, estadoTunel: "READY" }, ensayo, true), "");
  assert.equal(motivoBloqueoMedicion({ ...preparado, flujoEstable: false }, ensayo, true), "");
  assert.ok(motivoBloqueoMedicion(preparado, null, true));
  assert.ok(motivoBloqueoMedicion(preparado, ensayo, false));
  for (const cambio of [
    { permiteCtrl: false }, { bloqSeg: true }, { estadoTunel: "PARANDO" },
    { estadoTunel: "ERROR" }, { estadoTunel: "DESCONECTADO" },
    { medActiva: true }, { programa: { activo: true, estado: "estabilizando" } },
  ]) {
    assert.ok(motivoBloqueoMedicion({ ...preparado, ...cambio }, ensayo, true), JSON.stringify(cambio));
  }
});

test("respeta el límite del ensayo y vuelve a permitir medir tras liberar espacio", () => {
  const lleno = { mediciones: [{ id: 1 }, { id: 2 }, { id: 3 }] };
  assert.ok(motivoBloqueoMedicion(preparado, lleno, true));
  assert.equal(motivoBloqueoMedicion(preparado, { mediciones: lleno.mediciones.slice(1) }, true), "");
});

test("una ejecución terminada o un error histórico no bloquean una nueva medición", () => {
  const tunel = { ...preparado, programa: { activo: false, estado: "completado" },
    errorCaptura: "Captura anterior interrumpida" };
  assert.equal(motivoBloqueoMedicion(tunel, ensayo, true), "");
});
