export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8010/api";
const CLAVE_IDENTIDAD_API = "tunelab_identidad_api";

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

  window.sessionStorage.setItem(CLAVE_IDENTIDAD_API, JSON.stringify(identidad));
}

function obtenerCabecerasIdentidad() {
  try {
    const identidad = JSON.parse(window.sessionStorage.getItem(CLAVE_IDENTIDAD_API) || "{}");

    return {
      "X-Usuario-Uacloud": identidad.identificador || "usuario-local",
      "X-Usuario-Nombre": identidad.nombre || "Usuario UACloud",
      "X-Usuario-Email": identidad.email || "",
      "X-Usuario-Rol": identidad.rol || "alumno",
    };
  } catch {
    return {
      "X-Usuario-Uacloud": "usuario-local",
      "X-Usuario-Nombre": "Usuario UACloud",
      "X-Usuario-Email": "",
      "X-Usuario-Rol": "alumno",
    };
  }
}

export async function pedirApi(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: {
      "Content-Type": "application/json",
      ...obtenerCabecerasIdentidad(),
      ...(opciones.headers || {}),
    },
    ...opciones,
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

export function apiDisponible() {
  return pedirApi("/salud")
    .then(() => true)
    .catch(() => false);
}

export function leerIdentidadApi() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CLAVE_IDENTIDAD_API) || "null");
  } catch {
    return null;
  }
}

export function borrarIdentidadApi() {
  window.sessionStorage.removeItem(CLAVE_IDENTIDAD_API);
}

