import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function cargarGestorEnsayos() {
  const contexto = vm.createContext({ Date, Math });
  const modulos = new Map();
  const moduloPara = (archivo) => {
    if (archivo.endsWith(".json") && !modulos.has(archivo)) {
      const datos = JSON.parse(fs.readFileSync(archivo, "utf8"));
      modulos.set(archivo, new vm.SyntheticModule(["default"], function () { this.setExport("default", datos); }, { context: contexto, identifier: archivo }));
    }
    if (!modulos.has(archivo)) {
      modulos.set(archivo, new vm.SourceTextModule(fs.readFileSync(archivo, "utf8"), {
        context: contexto,
        identifier: archivo,
      }));
    }

    return modulos.get(archivo);
  };
  const gestor = moduloPara(path.join(root, "src/servicios/tunel/gestorEnsayos.js"));
  await gestor.link((specifier, desde) => moduloPara(
    path.resolve(path.dirname(desde.identifier), path.extname(specifier) ? specifier : `${specifier}.js`)
  ));
  await gestor.evaluate();
  return gestor.namespace.crearGestorEnsayos;
}

const crearGestorEnsayos = await cargarGestorEnsayos();

function crearMedicion(id, nombre) {
  return {
    id,
    nombre,
    hora: "12:00",
    durSeg: 10,
    totalMuestras: 1,
    velocidad: {},
    temperatura: {},
    potencia: {},
    tecnicos: {},
    trazas: {},
  };
}

function crearGestor() {
  let estado = {
    ensayos: [
      {
        id: "ensayo-1",
        codigo: "A-001",
        nombre: "Base",
        objetivo: "Objetivo",
        mediciones: [crearMedicion("medicion-1", "Medicion inicial")],
      },
    ],
    ensayoActivoId: "ensayo-1",
    etiquetaEnsayo: "A-001",
    resumenUltMed: { durSeg: 10 },
  };
  const operaciones = [];
  const gestor = crearGestorEnsayos({
    obtenerEstado: () => estado,
    registrarEvento: (orden, cambios) => {
      operaciones.push(orden);
      estado = { ...estado, ...cambios };
    },
  });

  return { gestor, operaciones, obtenerEstado: () => estado, establecerEstado: (cambios) => { estado = { ...estado, ...cambios }; } };
}

test("el gestor conserva el ensayo activo y actualiza su resumen al borrar la medición visible", () => {
  const { gestor, obtenerEstado } = crearGestor();

  gestor.eliminarMedicion("ensayo-1", "medicion-1");
  assert.equal(obtenerEstado().ensayos[0].mediciones.length, 0);
  assert.equal(obtenerEstado().resumenUltMed, null);

  const nuevo = gestor.crearNuevoEnsayo({ codigo: "A-002" });
  assert.equal(nuevo.codigo, "A-002");
  assert.equal(obtenerEstado().ensayoActivoId, nuevo.id);
  assert.equal(obtenerEstado().etiquetaEnsayo, "A-002");
});

test("la recuperación no selecciona otro ensayo cuando desaparece el activo", () => {
  const { gestor, establecerEstado, obtenerEstado } = crearGestor();
  establecerEstado({ ensayoActivoId: "eliminado" });
  gestor.cargarEnsayosPersistidos([{ id: "guardado", codigo: "A-010", mediciones: [] }]);
  assert.equal(obtenerEstado().ensayoActivoId, null);
});

test("sin selección previa se carga el primer ensayo guardado", () => {
  const { gestor, establecerEstado, obtenerEstado } = crearGestor();
  establecerEstado({ ensayoActivoId: null });
  gestor.cargarEnsayosPersistidos([{ id: "guardado", codigo: "A-010", mediciones: [] }]);
  assert.equal(obtenerEstado().ensayoActivoId, "guardado");
});
