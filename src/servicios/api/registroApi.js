import { configurarIdentidadApi, pedirApi } from "./clienteApi";
import { crearDetalleMedicionDocente, crearMedicionDesdeApi } from "../mediciones/adaptarRegistros.js";

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

export async function crearEnsayoApi({ nombre, objetivo, descripcion }) {
  return pedirApi("/ensayos", {
    method: "POST",
    body: JSON.stringify({
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
export async function listarMuestrasMedicionDocenteApi(medicionId, signal) {
  return pedirApi(`/docente/mediciones/${medicionId}/muestras`, { signal });
}

export async function listarEventosMedicionDocenteApi(medicionId, signal) {
  return pedirApi(`/docente/mediciones/${medicionId}/eventos`, { signal });
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

export async function listarMuestrasMedicionApi(medicionId, signal) {
  return pedirApi(`/mediciones/${medicionId}/muestras`, { signal });
}

export async function listarEventosMedicionApi(medicionId, signal) {
  return pedirApi(`/mediciones/${medicionId}/eventos`, { signal });
}

export async function borrarMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}`, {
    method: "DELETE",
  });
}

export async function cargarMedicionDocenteCompleta(medicion, signal) {
  const [muestras, eventos] = await Promise.all([
    listarMuestrasMedicionDocenteApi(medicion.id, signal),
    listarEventosMedicionDocenteApi(medicion.id, signal),
  ]);
  return crearDetalleMedicionDocente(medicion, muestras, eventos);
}

export async function cargarMedicionApiCompleta(medicion, signal) {
  const [muestras, eventos] = await Promise.all([
    listarMuestrasMedicionApi(medicion.id, signal),
    listarEventosMedicionApi(medicion.id, signal),
  ]);
  return crearMedicionDesdeApi(medicion, muestras, eventos);
}
