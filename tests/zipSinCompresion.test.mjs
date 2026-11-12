import assert from "node:assert/strict";
import test from "node:test";
import { crearZipSinCompresion } from "../src/servicios/archivos/zipSinCompresion.js";

test("crea un ZIP sin compresión con todas las entradas", async () => {
  const zip = crearZipSinCompresion([
    { nombre: "ficha.json", contenido: "{}" },
    { nombre: "medicion.json", contenido: "{\"id\":1}" },
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const texto = new TextDecoder().decode(bytes);

  assert.equal(zip.type, "application/zip");
  assert.deepEqual([...bytes.slice(0, 4)], [80, 75, 3, 4]);
  assert.ok(texto.includes("ficha.json"));
  assert.ok(texto.includes("medicion.json"));
  assert.deepEqual([...bytes.slice(-22, -18)], [80, 75, 5, 6]);
});
