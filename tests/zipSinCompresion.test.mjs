import { unzipSync, strFromU8 } from 'fflate';
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
test("el ZIP conserva nombres y contenido UTF-8 al descomprimir", async () => {
  const zip = crearZipSinCompresion([
    { nombre: "ficha del túnel.json", contenido: "Temperatura: 22 °C · sección de ensayo" },
    { nombre: "medición.json", contenido: "{\"id\":1}" },
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const archivos = unzipSync(bytes);
  assert.equal(strFromU8(archivos["ficha del túnel.json"]), "Temperatura: 22 °C · sección de ensayo");
  const texto = new TextDecoder().decode(bytes);

  assert.equal(zip.type, "application/zip");
  assert.deepEqual([...bytes.slice(0, 4)], [80, 75, 3, 4]);
  assert.ok(texto.includes("ficha del túnel.json"));
  assert.ok(texto.includes("medición.json"));
  assert.deepEqual([...bytes.slice(-22, -18)], [80, 75, 5, 6]);
});
