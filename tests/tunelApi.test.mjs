import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
async function preparar() {
  const timers = new Map();
  const llamadas = [];
  const eventos = [];
  const storage = () => { const map = new Map(); return {
    getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k),
  }; };
  const servidor = { fallo: false, perderInicio: false, esperaEstado: null, encendido: true, potencia: 75, tiempoMarcha: 10, instante: "2026-09-13T12:00:10",
    captura: { id: 7, ensayo_id: 3, nombre: "Captura del servidor", estado: "en_curso",
      fecha_inicio: "2026-09-13T12:00:00", creado_en: "2026-09-13T12:00:00", duracion_segundos: 10,
      velocidad_objetivo: 8.18, potencia_objetivo: 75, fuente: "simulado" },
    muestras: [0, 10].map((seg, i) => ({ id: 101 + i, medicion_id: 7,
      instante: `2026-09-13T12:00:${String(seg).padStart(2, "0")}`, velocidad_ms: 8.18,
      temperatura_c: 23.8, potencia_porcentaje: 75, frecuencia_hz: 37.5, corriente_a: 9, rpm: 2250,
      presion_pa: 40.28, caudal_m3s: 4.0082 })),
  };
  const respuestaEstado = () => ({ encendido: servidor.encendido, tiempo_funcionamiento_segundos: servidor.tiempoMarcha,
    conectado_fisico: true, midiendo: servidor.captura?.estado === "en_curso",
    potencia_objetivo: servidor.potencia, potencia_aplicada: 75, velocidad_objetivo_ms: 8.18, velocidad_ms: 8.18,
    temperatura_c: 23.8, frecuencia_hz: 37.5, corriente_a: 9, rpm: 2250,
    estabilidad_segundos: 5, flujo_estable: true, fuente: "simulado", actualizado_en: servidor.instante,
    captura: servidor.captura ? { ...servidor.captura } : null, total_muestras: servidor.muestras.length });
  const contexto = vm.createContext({ console, Date, Math, Map, Set, URL, crypto: { randomUUID },
    CustomEvent: class { constructor(type) { this.type = type; } },
    window: { sessionStorage: storage(), localStorage: storage(), dispatchEvent(e) { eventos.push(e.type); },
      setInterval: fn => { const id = randomUUID(); timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id) },
    fetch: async (url, opciones) => {
      const ruta = new URL(url).pathname;
      llamadas.push({ ruta, body: opciones.body ? JSON.parse(opciones.body) : null });
      if (servidor.fallo) throw new Error("Sin enlace");
      let datos;
      if (ruta.endsWith("/muestras")) {
        const cursor = Number(new URL(url).searchParams.get("despues_de"));
        datos = servidor.muestras.filter(m => m.id > cursor);
      } else if (ruta.endsWith("/capturas")) {
        servidor.captura = { id: 7, ...JSON.parse(opciones.body), estado: "en_curso" };
        servidor.encendido = true;
        servidor.tiempoMarcha = 0;
        if (servidor.perderInicio) { servidor.perderInicio = false; throw new Error("Respuesta perdida"); }
        datos = respuestaEstado();
      } else if (ruta.endsWith("/detener")) {
        if (servidor.captura) servidor.captura.estado = "cancelada";
        servidor.encendido = false;
        datos = respuestaEstado();
      } else if (ruta.endsWith("/apagar")) {
        if (servidor.captura) servidor.captura.estado = "cancelada";
        if (ruta.endsWith("/apagar")) servidor.encendido = false;
        datos = respuestaEstado();
      } else {
        datos = respuestaEstado();
        if (servidor.esperaEstado) await servidor.esperaEstado;
      }
      return { ok: true, status: 200, json: async () => datos };
    },
  });
  const modulos = new Map();
  const query = new vm.SyntheticModule(["QueryClient"], function () { this.setExport("QueryClient", QueryClient); }, { context: contexto });
  function moduloPara(archivo) {
    if (!modulos.has(archivo)) {
      const texto = fs.readFileSync(archivo, "utf8");
      const opciones = { context: contexto, identifier: archivo };
      modulos.set(archivo, archivo.endsWith(".json")
        ? new vm.SyntheticModule(["default"], function () { this.setExport("default", JSON.parse(texto)); }, opciones)
        : new vm.SourceTextModule(texto, { ...opciones, initializeImportMeta: meta => { meta.env = {}; } }));
    }
    return modulos.get(archivo);
  }
  async function cargar(ruta) {
    const modulo = moduloPara(path.join(root, ruta));
    if (modulo.status === "unlinked") await modulo.link((specifier, desde) => specifier === "@tanstack/react-query" ? query : moduloPara(
      path.resolve(path.dirname(desde.identifier), path.extname(specifier) ? specifier : specifier + ".js")));
    if (modulo.status === "linked") await modulo.evaluate();
    return modulo.namespace;
  }
  const identidad = await cargar("src/servicios/api/clienteApi.js");
  identidad.configurarIdentidadApi({ usuario: "alu_demo" });
  const { crearTunelApi } = await cargar("src/servicios/tunel/tunelApi.js");
  return { crearTunelApi, servidor, timers, llamadas, identidad, eventos };
}
const ensayos = () => [{ id: "api-ensayo-3", apiId: 3, nombre: "Prueba", mediciones: [] }];

test("la gráfica en directo conserva 300 lecturas como máximo y no inventa datos al desconectarse", async () => {
  const t = await preparar(), tunel = t.crearTunelApi();
  t.servidor.captura = null;
  t.servidor.muestras = [];
  for (let i = 0; i < 310; i++) {
    t.servidor.instante = new Date(Date.UTC(2026,8,13,12,0,i)).toISOString();
    await tunel.sincronizar();
  }
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.length, 300);
  const ultima = tunel.obtenerEstado().lecturasEnVivo.at(-1);
  await tunel.sincronizar();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.at(-1), ultima);
  t.servidor.fallo = true;
  await tunel.sincronizar();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.at(-1), ultima);
  tunel.reiniciar();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.length, 0);
});

test("apagar borra la gráfica en directo y el siguiente encendido comienza sin lecturas anteriores", async () => {
  const t = await preparar(), tunel = t.crearTunelApi();
  t.servidor.captura = null;
  t.servidor.muestras = [];
  await tunel.sincronizar();
  t.servidor.instante = "2026-09-13T12:00:12";
  await tunel.sincronizar();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.length, 2);
  await tunel.apagarTunel();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.length, 0);
  t.servidor.instante = "2026-09-13T12:00:30";
  await tunel.sincronizar();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.length, 0);
  await tunel.iniciarMedicion({ ensayo_id: 3, nombre: "Prueba", consigna: 25, duracion_segundos: 20 });
  const nuevas = tunel.obtenerEstado().lecturasEnVivo;
  assert.equal(nuevas.length, 1);
  assert.equal(nuevas[0].instante, Date.parse("2026-09-13T12:00:30Z"));
});

test("reinicia la gráfica si al recuperar conexión el servidor ha empezado otra marcha", async () => {
  const t = await preparar(), tunel = t.crearTunelApi();
  await tunel.sincronizar();
  t.servidor.fallo = true;
  await tunel.sincronizar();
  t.servidor.fallo = false;
  t.servidor.instante = "2026-09-13T12:00:30";
  t.servidor.tiempoMarcha = 0;
  await tunel.sincronizar();
  assert.equal(tunel.obtenerEstado().lecturasEnVivo.length, 1);
  assert.equal(tunel.obtenerEstado().lecturasEnVivo[0].instante, Date.parse("2026-09-13T12:00:30Z"));
  assert.equal(tunel.obtenerEstado().muestrasMedicion.length, 2);
});

test("el inicio de una medición conserva su clave tras perder la respuesta y la parada usa esa ejecución", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  t.servidor.perderInicio = true;
  await assert.rejects(real.iniciarMedicion({ ensayo_id: 3, nombre: "Prueba", consigna: 25, duracion_segundos: 20 }), /Respuesta perdida/);
  await real.iniciarMedicion({ ensayo_id: 3, nombre: "Prueba", consigna: 25, duracion_segundos: 20 });
  const inicios = t.llamadas.filter(l => l.ruta.endsWith("/capturas"));
  assert.equal(inicios.length, 2);
  assert.equal(inicios[0].body.clave, inicios[1].body.clave);
  assert.ok(inicios.every(l => l.body.consigna === 25 && l.body.duracion_segundos === 20));
  assert.equal(t.llamadas.filter(l => l.ruta.endsWith("/encender")).length, 0);
  await real.detenerMedicion();
  const parada = t.llamadas.find(l => l.ruta.endsWith("/detener"));
  assert.equal(parada.ruta, "/api/tunel/capturas/7/detener");
  assert.equal(real.obtenerEstado().medActiva, false);
});

test("avisa a Registro cuando entre sondeos cambia la captura activa", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  await real.sincronizar();
  t.eventos.length = 0;
  t.servidor.captura = { ...t.servidor.captura, id: 8 };
  await real.sincronizar();
  assert.equal(real.obtenerEstado().capturaApi.id, 8);
  assert.ok(t.eventos.includes("tunelab:registro-actualizado"));
});

test("suscribirse consulta la API y recupera captura, ensayo, tiempos y objetivos tras recargar", async () => {
  const t = await preparar();
  for (const cargaAntes of [true, false]) {
    const real = t.crearTunelApi();
    if (cargaAntes) real.cargarEnsayosPersistidos(ensayos());
    const salir = real.suscribirse(() => {});
    await real.sincronizar();
    if (!cargaAntes) real.cargarEnsayosPersistidos(ensayos());
    const estado = real.obtenerEstado();
    assert.equal(estado.capturaApi.id, 7);
    assert.equal(estado.medActiva, true);
    assert.equal(estado.ensayoActivoId, "api-ensayo-3");
    assert.equal(estado.muestrasMedicion.length, 2);
    assert.equal(estado.muestrasMedicion[1].segundo, 10);
    assert.equal(estado.objVelMs, 8.18);
    assert.equal(estado.consignaObjetivoPct, 75);
    assert.equal(estado.flujoEstable, true);
    assert.equal(t.timers.size, 1);
    salir();
    assert.equal(t.timers.size, 0);
  }
  assert.ok(t.llamadas.every(l => !l.ruta.endsWith("/muestra") && !l.body));
});

test("apagar usa la captura persistida sin reenviar las muestras", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  real.cargarEnsayosPersistidos(ensayos());
  await real.sincronizar();
  await real.apagarTunel();
  assert.equal(real.obtenerEstado().medActiva, false);
  assert.equal(real.obtenerEstado().resumenUltMed.totalMuestras, 2);
  assert.equal(real.obtenerEstado().resumenUltMed.ensayoNombre, "Prueba");
  await real.apagarTunel();
  assert.equal(t.llamadas.filter(l => l.ruta.endsWith("/mediciones/finalizar")).length, 0);
  assert.equal(real.obtenerEstado().ensayos[0].mediciones.length, 1);
});

test("la perdida de enlace conserva la captura y al reconectar incorpora solo las nuevas muestras", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  await real.sincronizar();
  t.servidor.fallo = true;
  await real.sincronizar();
  assert.equal(real.obtenerEstado().medActiva, true);
  assert.equal(real.obtenerEstado().muestrasMedicion.length, 2);
  assert.equal(real.obtenerEstado().permiteCtrl, false);
  t.servidor.fallo = false;
  t.servidor.muestras.push({ ...t.servidor.muestras[1], id: 103, instante: "2026-09-13T12:00:11" });
  await real.sincronizar();
  assert.equal(real.obtenerEstado().muestrasMedicion.length, 3);
  assert.equal(real.obtenerEstado().errorCaptura, null);
});

test("una respuesta de sondeo antigua no reabre una captura ya detenida", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  await real.sincronizar();
  let liberar;
  t.servidor.esperaEstado = new Promise(resolve => { liberar = resolve; });
  const lecturaAntigua = real.sincronizar();
  await real.detenerMedicion();
  liberar();
  await lecturaAntigua;
  assert.equal(real.obtenerEstado().capturaApi.estado, "cancelada");
});

test("un fallo de parada no muestra guardado correcto", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  await real.sincronizar();
  t.servidor.fallo = true;
  await assert.rejects(real.detenerMedicion(), /Sin enlace/);
  assert.equal(real.obtenerEstado().medActiva, true);
});

test("cerrar la sesion invalida las respuestas anteriores", async () => {
  const t = await preparar();
  const real = t.crearTunelApi();
  let liberar;
  t.servidor.esperaEstado = new Promise(resolve => { liberar = resolve; });
  const pendiente = real.sincronizar();
  t.identidad.borrarIdentidadApi();
  real.reiniciar();
  liberar();
  await pendiente;
  assert.equal(real.obtenerEstado().capturaApi, null);
  assert.equal(real.obtenerEstado().medActiva, false);
});
