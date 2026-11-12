import { configurarIdentidadApi, leerIdentidadApi, pedirApi } from "./clienteApi";
import { crearDetalleMedicionDocente, crearMedicionDesdeApi } from "../mediciones/adaptarRegistros.js";

const CLAVE_MAPA_ENSAYOS_API = "tunelab_mapa_ensayos_api";

// Cada usuario guarda su propio mapa. Asi un ensayo de Alumno Demo nunca se
// confunde con otro que tenga el mismo codigo pero pertenezca a Profesor Demo.
function claveMapaEnsayosApi() {
  const identidad = leerIdentidadApi();
  const usuario = identidad?.identificador || "sin-usuario";
  return `${CLAVE_MAPA_ENSAYOS_API}_${usuario}`;
}

function leerMapaEnsayosApi() {
  try {
    return JSON.parse(window.localStorage.getItem(claveMapaEnsayosApi()) || "{}");
  } catch {
    return {};
  }
}

function guardarMapaEnsayosApi(mapa) {
  window.localStorage.setItem(claveMapaEnsayosApi(), JSON.stringify(mapa));
}

export function vincularEnsayoApi(codigoEnsayo, ensayoApi) {
  if (!codigoEnsayo || !ensayoApi?.id) {
    return;
  }

  const mapa = leerMapaEnsayosApi();
  mapa[codigoEnsayo] = ensayoApi.id;
  guardarMapaEnsayosApi(mapa);
}

export function obtenerIdEnsayoApi(codigoEnsayo) {
  if (!codigoEnsayo) {
    return null;
  }

  return leerMapaEnsayosApi()[codigoEnsayo] || null;
}

export async function asegurarUsuarioApi(usuarioActual) {
  configurarIdentidadApi(usuarioActual);

  return pedirApi("/usuarios/asegurar", {
    method: "POST",
    body: JSON.stringify({
      identificador_uacloud: usuarioActual?.usuario || usuarioActual?.id || "usuario-local",
      nombre: usuarioActual?.nombre || "Usuario UACloud",
      email: usuarioActual?.email || null,
      rol: usuarioActual?.rol || "alumno",
    }),
  });
}

export async function listarEnsayosApi() {
  return pedirApi("/ensayos");
}

export async function crearEnsayoApi({ usuarioId, codigo, nombre, objetivo, descripcion }) {
  return pedirApi("/ensayos", {
    method: "POST",
    body: JSON.stringify({
      usuario_id: usuarioId,
      codigo,
      nombre,
      objetivo,
      descripcion,
    }),
  });
}


export async function actualizarEnsayoApi(ensayoId, { nombre, objetivo, descripcion }) {
  return pedirApi(`/ensayos/${ensayoId}`, {
    method: "PUT",
    body: JSON.stringify({
      nombre,
      objetivo,
      descripcion,
    }),
  });
}
export async function borrarEnsayoApi(ensayoId) {
  return pedirApi(`/ensayos/${ensayoId}`, {
    method: "DELETE",
  });
}

export async function listarMedicionesEnsayoApi(ensayoId) {
  return pedirApi(`/ensayos/${ensayoId}/mediciones`);
}

export async function listarEnsayosDocenteApi() {
  return pedirApi("/docente/ensayos");
}

export async function listarMedicionesDocenteApi(ensayoId) {
  return pedirApi(`/docente/ensayos/${ensayoId}/mediciones`);
}
export async function listarMuestrasMedicionDocenteApi(medicionId) {
  return pedirApi(`/docente/mediciones/${medicionId}/muestras`);
}

export async function listarEventosMedicionDocenteApi(medicionId) {
  return pedirApi(`/docente/mediciones/${medicionId}/eventos`);
}

export async function listarEventosDocenteApi() {
  return pedirApi("/docente/eventos");
}
export async function borrarMedicionDocenteApi(medicionId) {
  return pedirApi(`/docente/mediciones/${medicionId}`, {
    method: "DELETE",
  });
}

export async function borrarEnsayoDocenteApi(ensayoId) {
  return pedirApi(`/docente/ensayos/${ensayoId}`, {
    method: "DELETE",
  });
}

export async function obtenerUltimaMedicionUsuarioApi() {
  return pedirApi("/mediciones/ultima");
}

export async function listarMuestrasMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}/muestras`);
}

export async function listarEventosMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}/eventos`);
}

export async function borrarMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}`, {
    method: "DELETE",
  });
}

export async function cargarMedicionDocenteCompleta(medicion) {
  const [muestras, eventos] = await Promise.all([
    listarMuestrasMedicionDocenteApi(medicion.id),
    listarEventosMedicionDocenteApi(medicion.id),
  ]);
  return crearDetalleMedicionDocente(medicion, muestras, eventos);
}

export async function cargarMedicionApiCompleta(medicion) {
  const [muestras, eventos] = await Promise.all([
    listarMuestrasMedicionApi(medicion.id),
    listarEventosMedicionApi(medicion.id),
  ]);
  return crearMedicionDesdeApi(medicion, muestras, eventos);
}
