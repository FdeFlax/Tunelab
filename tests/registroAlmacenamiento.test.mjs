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

test("distingue ensayos con igual nombre por su ID y agrupa un ensayo renombrado", () => {
  const grupos = agruparArchivosPorEnsayo([
    { ensayo: { id: 1, nombre: "Prueba" } },
    { ensayo: { id: 2, nombre: "Prueba" } },
    { ensayo: { id: 1, nombre: "Renombrado" } },
  ]);
  assert.equal(grupos.length, 2);
  assert.equal(grupos[0].archivos.length, 2);
  assert.equal(grupos[1].archivos.length, 1);
});
