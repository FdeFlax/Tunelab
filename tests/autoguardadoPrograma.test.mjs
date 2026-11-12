import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import vm from "node:vm";
import { crearAutoguardadoPrograma, validarPrograma } from "../src/servicios/tunel/autoguardadoPrograma.js";

const programa = nombre => ({ nombre, etapas: [{ consigna: 25, duracion_segundos: 20 }] });
const pausa = () => new Promise(resolve => setTimeout(resolve, 20));
const diferida = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};

test("agrupa la escritura rápida y guarda solo el último borrador", async () => {
  const enviados = [], guardados = [];
  const auto = crearAutoguardadoPrograma({ espera: 1,
    guardar: async datos => { enviados.push(datos); return datos; },
    onGuardado: datos => guardados.push(datos), onError: assert.fail,
  });
  auto.programar(programa("M"));
  auto.programar(programa("Medición"));
  await pausa();
  assert.deepEqual(enviados, [programa("Medición")]);
  assert.deepEqual(guardados, enviados);
  await auto.cerrar();
});

test("serializa las peticiones y conserva la edición hecha durante un guardado", async () => {
  const primero = diferida();
  const enviados = [], guardados = [], ocupado = [];
  const auto = crearAutoguardadoPrograma({ espera: 1,
    guardar: datos => { enviados.push(datos); return enviados.length === 1 ? primero.promise : Promise.resolve(datos); },
    onGuardado: datos => guardados.push(datos), onError: assert.fail, onGuardando: valor => ocupado.push(valor),
  });
  auto.programar(programa("Primera"));
  const guardando = auto.guardarAhora();
  auto.programar(programa("Intermedia"));
  auto.programar(programa("Última"));
  await pausa();
  assert.equal(enviados.length, 1);
  assert.deepEqual(ocupado, [true]);
  primero.resolve(programa("Primera"));
  await guardando;
  assert.deepEqual(enviados, [programa("Primera"), programa("Última")]);
  assert.deepEqual(guardados, enviados);
  assert.equal(ocupado.at(-1), false);
  await auto.cerrar();
});

test("un campo incompleto cancela el envío pendiente, pero no da por terminada una petición en curso", async () => {
  const peticion = diferida(), ocupado = [], enviados = [];
  const auto = crearAutoguardadoPrograma({ espera: 1,
    guardar: datos => { enviados.push(datos); return peticion.promise; },
    onGuardado: () => {}, onError: assert.fail, onGuardando: valor => ocupado.push(valor),
  });
  auto.programar(programa("Pendiente"));
  auto.programar(null);
  await pausa();
  assert.equal(enviados.length, 0);
  auto.programar(programa("Enviada"));
  const guardando = auto.guardarAhora();
  auto.programar(null);
  assert.deepEqual(ocupado, [true]);
  peticion.resolve(programa("Enviada"));
  await guardando;
  assert.deepEqual(ocupado, [true, false]);
  await auto.cerrar();
});

test("al salir de la pantalla envía los cambios pendientes sin actualizar el componente desmontado", async () => {
  const enviados = [], guardados = [];
  const auto = crearAutoguardadoPrograma({ espera: 1000,
    guardar: async datos => { enviados.push(datos); return datos; },
    onGuardado: datos => guardados.push(datos), onError: assert.fail,
  });
  auto.programar(programa("Al salir"));
  await auto.cerrar();
  assert.deepEqual(enviados, [programa("Al salir")]);
  assert.deepEqual(guardados, []);
});

test("un error se informa una vez y permite reintentar sin perder el borrador", async () => {
  const errores = [], guardados = [];
  let intentos = 0;
  const auto = crearAutoguardadoPrograma({ espera: 1,
    guardar: async datos => { if (++intentos === 1) throw new Error("Sin conexión"); return datos; },
    onGuardado: datos => guardados.push(datos), onError: error => errores.push(error.message),
  });
  auto.programar(programa("Prueba"));
  await auto.guardarAhora();
  await pausa();
  assert.equal(intentos, 1);
  assert.deepEqual(errores, ["Sin conexión"]);
  assert.deepEqual(guardados, []);
  auto.programar(programa("Prueba"));
  await auto.guardarAhora();
  assert.deepEqual(guardados, [programa("Prueba")]);
  await auto.cerrar();
});

test("no acepta vacíos, cero, límites excedidos ni tiempos fraccionarios", () => {
  assert.equal(validarPrograma(programa("Válida")), "");
  assert.ok(validarPrograma(programa("   ")));
  assert.ok(validarPrograma({ ...programa("X"), etapas: [] }));
  for (const consigna of ["", 0, 101, NaN]) {
    assert.ok(validarPrograma({ nombre: "X", etapas: [{ consigna, duracion_segundos: 20 }] }));
  }
  for (const duracion_segundos of ["", 0, 3601, 2.5]) {
    assert.ok(validarPrograma({ nombre: "X", etapas: [{ consigna: 25, duracion_segundos }] }));
  }
});

test("volver al ensayo espera a los guardados anteriores de ese ensayo", async () => {
  const peticion = diferida(), llamadas = [];
  const contexto = vm.createContext({});
  const cliente = new vm.SyntheticModule(["pedirApi", "API_URL", "leerIdentidadApi"], function () {
    this.setExport("API_URL", "http://localhost/api");
    this.setExport("leerIdentidadApi", () => null);
    this.setExport("pedirApi", (ruta, opciones) => {
      llamadas.push([ruta, opciones?.method || "GET"]);
      return llamadas.length === 1 ? peticion.promise : Promise.resolve({ nombre: "Última" });
    });
  }, { context: contexto });
  const modulo = new vm.SourceTextModule(await fs.readFile(new URL("../src/servicios/api/controlApi.js", import.meta.url), "utf8"), { context: contexto });
  await modulo.link(() => cliente);
  await modulo.evaluate();
  const api = modulo.namespace;
  const auto = crearAutoguardadoPrograma({
    guardar: datos => api.guardarProgramaEtapasApi(1, datos),
    onGuardado: () => {}, onError: assert.fail,
  });
  auto.programar(programa("Primera"));
  const primero = auto.guardarAhora();
  auto.programar(programa("Última"));
  const ultimo = auto.cerrar();
  const lectura = api.leerProgramaEtapasApi(1);
  await pausa();
  assert.deepEqual(llamadas, [["/tunel/programas/1", "PUT"]]);
  peticion.resolve({});
  await Promise.all([primero, ultimo, lectura]);
  assert.deepEqual(llamadas.map(l => l[1]), ["PUT", "PUT", "GET"]);
});
