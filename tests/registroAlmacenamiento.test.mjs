import assert from "node:assert/strict";
import test from "node:test";
import {
  agruparArchivosPorEnsayo,
  crearClaveEnsayoImportado,
} from "../src/servicios/archivos/registroAlmacenamiento.js";

test("agrupa las mediciones importadas por ensayo y acumula sus muestras", () => {
  const ensayo = { codigo: "E-1", nombre: "Prueba" };
  const grupos = agruparArchivosPorEnsayo([
    { id: "m1", ensayo, medicion: { totalMuestras: 4 } },
    { id: "m2", ensayo, medicion: { totalMuestras: 6 } },
  ]);

  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].id, crearClaveEnsayoImportado(ensayo));
  assert.equal(grupos[0].totalMuestras, 10);
  assert.equal(grupos[0].archivos.length, 2);
});
