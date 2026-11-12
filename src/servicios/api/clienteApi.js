export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8010/api";
const CLAVE_IDENTIDAD_API = "tunelab_identidad_api";

function guardarIdentidadApi(identidad) {
  const datos = JSON.stringify(identidad);
  window.sessionStorage.setItem(CLAVE_IDENTIDAD_API, datos);
  window.localStorage.removeItem(CLAVE_IDENTIDAD_API);
}

function cargarIdentidadApi() {
  const datos = window.sessionStorage.getItem(CLAVE_IDENTIDAD_API);

  if (!datos) {
    return null;
  }

  return JSON.parse(datos);
}

export class ErrorApi extends Error {
  constructor(mensaje, respuesta, detalle = "") {
    super(mensaje);
    this.name = "ErrorApi";
    this.respuesta = respuesta;
    this.detalle = detalle;
  }
}

export function configurarIdentidadApi(usuarioActual = {}) {
  const identidad = {
    identificador: usuarioActual.usuario || usuarioActual.id || "usuario-local",
    nombre: usuarioActual.nombre || "Usuario UACloud",
    email: usuarioActual.email || "",
    rol: usuarioActual.rol || "alumno",
  };

  guardarIdentidadApi(identidad);
}

function obtenerCabecerasIdentidad() {
  try {
    const identidad = cargarIdentidadApi() || {};

    return {
      ...(identidad.identificador ? { "X-Usuario-Uacloud": identidad.identificador } : {}),
    };
  } catch {
    return {};
  }
}

export async function pedirApi(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    signal: opciones.signal ?? globalThis.AbortSignal?.timeout?.(10000),
    headers: {
      "Content-Type": "application/json",
      ...obtenerCabecerasIdentidad(),
      ...(opciones.headers || {}),
    },
  });

  if (!respuesta.ok) {
    let detalle = "";
    try {
      const datosError = await respuesta.json();
      detalle = datosError.detail || datosError.mensaje || "";
    } catch {
      detalle = "";
    }
    throw new ErrorApi(`Error API ${respuesta.status}`, respuesta, detalle);
  }

  if (respuesta.status === 204) {
    return null;
  }

  return respuesta.json();
}

export function leerIdentidadApi() {
  try {
    return cargarIdentidadApi();
  } catch {
    return null;
  }
}

export function borrarIdentidadApi() {
  window.localStorage.removeItem(CLAVE_IDENTIDAD_API);
  window.sessionStorage.removeItem(CLAVE_IDENTIDAD_API);
}
