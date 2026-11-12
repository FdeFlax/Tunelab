import assert from "node:assert/strict";
import test from "node:test";
import { consultarDisponibilidadApi, interpretarDisponibilidad } from "../src/servicios/api/disponibilidadApi.js";

const preparado = () => ({
  protocolo: "tunelab-local-v1", estado: "listo", controlador: "listo",
  base_datos: { estado: "ok", esquema: "actualizado" },
  acceso_local: true, origen_local: true,
});

test("habilita el acceso solo cuando API, base de datos, esquema y acceso estan listos", () => {
  assert.equal(interpretarDisponibilidad(preparado(), true).estado, "listo");
  for (const [cambios, esperado] of [
    [{ protocolo: undefined }, "incompatible"],
    [{ base_datos: { estado: "error" } }, "base_datos"],
    [{ base_datos: { estado: "ok", esquema: "pendiente" } }, "esquema"],
    [{ acceso_local: false }, "acceso"], [{ origen_local: false }, "acceso"],
    [{ controlador: "no_disponible" }, "preparando"], [{ estado: "no_disponible" }, "preparando"],
  ]) assert.equal(interpretarDisponibilidad({ ...preparado(), ...cambios }, true).estado, esperado);
  assert.notEqual(interpretarDisponibilidad(preparado(), false).estado, "listo");
  assert.notEqual(interpretarDisponibilidad(null, true).estado, "listo");
});

test("consulta la disponibilidad sin autenticar ni usar respuestas cacheadas", async t => {
  t.mock.method(globalThis, "fetch", async (url, opciones) => {
    assert.equal(url, "http://127.0.0.1:8010/api/listo");
    assert.equal(opciones.cache, "no-store");
    assert.equal(opciones.headers, undefined);
    assert.ok(opciones.signal instanceof AbortSignal);
    return { ok: true, json: async () => preparado() };
  });
  assert.equal((await consultarDisponibilidadApi("http://127.0.0.1:8010/api")).estado, "listo");
});

test("lee el diagnostico 503 y no confunde MySQL caido con un fallo de usuario", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false,
    json: async () => ({ ...preparado(), base_datos: { estado: "error" } }),
  }));
  assert.equal((await consultarDisponibilidadApi("http://127.0.0.1:8010/api")).estado, "base_datos");
});

test("un fallo de red o una respuesta ajena indica como arrancar; despues se recupera", async t => {
  let disponible = false;
  t.mock.method(globalThis, "fetch", async () => {
    if (!disponible) throw new TypeError("Failed to fetch");
    return { ok: true, json: async () => preparado() };
  });
  const fallo = await consultarDisponibilidadApi("http://127.0.0.1:8010/api");
  assert.equal(fallo.estado, "desconectado");
  assert.match(fallo.detalle, /iniciar-tunelab.cmd/);
  disponible = true;
  assert.equal((await consultarDisponibilidadApi("http://127.0.0.1:8010/api")).estado, "listo");
});

test("cancelar la pantalla cancela la peticion pendiente", async t => {
  t.mock.method(globalThis, "fetch", (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("cancelado")), { once: true });
  }));
  const controller = new AbortController();
  const consulta = consultarDisponibilidadApi("http://127.0.0.1:8010/api", controller.signal);
  controller.abort();
  assert.equal((await consulta).estado, "desconectado");
});
