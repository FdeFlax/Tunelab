import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as query from "@tanstack/react-query";

const pendiente = () => {
  let resolver;
  const promesa = new Promise(resolve => { resolver = resolve; });
  return { promesa, resolver };
};

async function montar(t, opciones) {
  const slots = [];
  let cursor = 0, cambios = false, resultado;
  const efectos = [];
  const iguales = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(inicial) {
      const indice = cursor++;
      if (!slots[indice]) slots[indice] = {
        valor: typeof inicial === "function" ? inicial() : inicial,
        set: siguiente => {
          const slot = slots[indice];
          const valor = typeof siguiente === "function" ? siguiente(slot.valor) : siguiente;
          if (!Object.is(slot.valor, valor)) { slot.valor = valor; cambios = true; }
        },
      };
      return [slots[indice].valor, slots[indice].set];
    },
    useRef(inicial) {
      const indice = cursor++;
      return slots[indice] ||= { current: inicial };
    },
    useMemo(calcular, deps) {
      const indice = cursor++;
      if (!iguales(slots[indice]?.deps, deps)) slots[indice] = { valor: calcular(), deps };
      return slots[indice].valor;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(efecto, deps) {
      const indice = cursor++;
      if (!iguales(slots[indice]?.deps, deps)) {
        efectos.push(() => {
          slots[indice]?.limpiar?.();
          slots[indice] = { deps, limpiar: efecto() };
        });
      }
    },
  };
  const contexto = vm.createContext({ window: new EventTarget(), document: new EventTarget(), console });
  const react = new vm.SyntheticModule(Object.keys(hooks), function () {
    for (const [nombre, fn] of Object.entries(hooks)) this.setExport(nombre, fn);
  }, { context: contexto });
  const nombresServicios = ["asegurarUsuarioApi", "listarEnsayosApi", "listarMedicionesEnsayoApi",
    "cargarMedicionApiCompleta", "crearEnsayoDesdeApi", "leerIdentidadApi"];
  const servicios = new vm.SyntheticModule(nombresServicios, function () {
    for (const nombre of nombresServicios) this.setExport(nombre, () => {
      throw new Error(`El catálogo debe usar las funciones recibidas: ${nombre}`);
    });
  }, { context: contexto });
  const modulo = new vm.SourceTextModule(fs.readFileSync(new URL("../src/logicaPantallas/useEnsayos.js", import.meta.url), "utf8"), { context: contexto });
  const queryModule = new vm.SyntheticModule(Object.keys(query), function () {
    for (const [nombre, valor] of Object.entries(query)) this.setExport(nombre, valor);
  }, { context: contexto });
  await modulo.link(nombre => {
    if (nombre === "@tanstack/react-query") return queryModule;
    if (nombre === "../servicios/api/clienteApi") return servicios;
    if (nombre === "react") return react;
    if (["../servicios/api/registroApi", "../servicios/mediciones/adaptarRegistros"].includes(nombre)) return servicios;
    throw new Error(`Importación no prevista: ${nombre}`);
  });
  await modulo.evaluate();
  function render() {
    cursor = 0; cambios = false;
    resultado = modulo.namespace.useCatalogoEnsayos(opciones);
    efectos.splice(0).forEach(efecto => efecto());
  }
  async function actualizar() {
    for (let i = 0; i < 12; i++) { await Promise.resolve(); if (cambios) render(); }
  }
  const desmontar = () => slots.forEach(slot => slot?.limpiar?.());
  t.after(desmontar);
  render();
  await actualizar();
  return { leer: () => resultado, actualizar, desmontar };
}

test("Docente precarga una vez por ensayo y reutiliza la lista al seleccionarlo", async t => {
  const llamadas = [];
  const vista = await montar(t, {
    listarEnsayos: async () => [{ id: 1 }, { id: 2 }],
    listarMediciones: async id => { llamadas.push(id); return [{ id: id * 10 }]; },
    precargar: true, mensajeError: "Error",
  });
  assert.deepEqual(llamadas, [1, 2]);
  vista.leer().setEnsayoId(2);
  await vista.actualizar();
  assert.equal(vista.leer().mediciones[0].id, 20);
  assert.deepEqual(llamadas, [1, 2]);
});

test("una respuesta tardía no sustituye las mediciones del ensayo seleccionado", async t => {
  const primera = pendiente();
  const vista = await montar(t, {
    listarEnsayos: async () => [{ id: 1 }, { id: 2 }],
    listarMediciones: id => id === 1 ? primera.promesa : Promise.resolve([{ id: 20 }]),
    mensajeError: "Error",
  });
  vista.leer().setEnsayoId(2);
  await vista.actualizar();
  primera.resolver([{ id: 10 }]);
  await vista.actualizar();
  assert.equal(vista.leer().ensayo.id, 2);
  assert.equal(vista.leer().mediciones[0].id, 20);
});

test("la recarga retira un ensayo eliminado y descarta la respuesta anterior", async t => {
  const antigua = pendiente();
  let numero = 0;
  const vista = await montar(t, {
    listarEnsayos: () => ++numero === 1 ? antigua.promesa : Promise.resolve([{ id: 2, total_mediciones: 0 }]),
    listarMediciones: async () => [], mensajeError: "Error",
  });
  await vista.leer().recargar();
  await vista.actualizar();
  antigua.resolver([{ id: 1 }]);
  await vista.actualizar();
  assert.equal(vista.leer().ensayos.length, 1);
  assert.equal(vista.leer().ensayo.id, 2);
});

test("recargar actualiza los contadores de ensayos visitados anteriormente", async t => {
  let total = 2;
  const vista = await montar(t, {
    listarEnsayos: async () => [{ id: 1, total_mediciones: total }, { id: 2, total_mediciones: 0 }],
    listarMediciones: async id => id === 1 ? [{ id: 10 }, { id: 11 }] : [],
    mensajeError: "Error",
  });
  assert.equal(vista.leer().conteos[1], 2);
  vista.leer().setEnsayoId(2);
  await vista.actualizar();
  total = 1;
  await vista.leer().recargar();
  await vista.actualizar();
  assert.equal(vista.leer().conteos[1], 1);
});
