const arrancar = "Abre iniciar-tunelab.cmd para iniciar la aplicación completa. El acceso se habilitará automáticamente cuando esté lista.";
export const COMPROBANDO_SERVIDOR = {
  estado: "comprobando",
  titulo: "Comprobando disponibilidad…",
  detalle: "Un momento mientras conectamos con el servidor."
};
export function interpretarDisponibilidad(datos, httpOk) {
  if (datos?.protocolo !== "tunelab-local-v1") {
    return {
      estado: "incompatible",
      titulo: "El servidor no corresponde a esta versión",
      detalle: "Cierra la instancia anterior de Tunelab cuando terminen los ensayos y vuelve a abrir iniciar-tunelab.cmd."
    };
  }
  if (datos.base_datos?.estado !== "ok") {
    return {
      estado: "base_datos",
      titulo: "La base de datos no está disponible",
      detalle: arrancar
    };
  }
  if (datos.base_datos.esquema !== "actualizado") {
    return {
      estado: "esquema",
      titulo: "Hay una actualización pendiente",
      detalle: "Termina los ensayos, cierra el servidor y abre iniciar-tunelab.cmd para actualizar la base de datos."
    };
  }
  if (datos.acceso_local !== true || datos.origen_local !== true) {
    return {
      estado: "acceso",
      titulo: "El acceso de pruebas no está habilitado",
      detalle: "Revisa la configuración local del servidor. Esta pantalla requiere el modo de desarrollo con perfiles de prueba."
    };
  }
  if (!httpOk || datos.estado !== "listo" || datos.controlador !== "listo") {
    return {
      estado: "preparando",
      titulo: "El servidor todavía no está listo",
      detalle: "Esperando al controlador. Si el aviso persiste, ejecuta npm run diagnostico desde la carpeta del proyecto y revisa el registro del servidor."
    };
  }
  return {
    estado: "listo",
    titulo: "Servidor listo",
    detalle: "Puedes elegir tu perfil."
  };
}
export async function consultarDisponibilidadApi(url, signal) {
  const limite = new AbortController();
  const cancelar = () => limite.abort();
  if (signal?.aborted) cancelar();
  signal?.addEventListener("abort", cancelar, {
    once: true
  });
  const temporizador = setTimeout(cancelar, 5000);
  try {
    const respuesta = await fetch(`${url}/listo`, {
      signal: limite.signal,
      cache: "no-store"
    });
    const datos = await respuesta.json();
    return interpretarDisponibilidad(datos, respuesta.ok);
  } catch {
    return {
      estado: "desconectado",
      titulo: "El servidor no está disponible",
      detalle: arrancar
    };
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener("abort", cancelar);
  }
}
