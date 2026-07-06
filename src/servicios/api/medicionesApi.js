import { pedirApi } from "./clienteApi";

export async function crearMedApi({ ensayoId, nombre, objetivos = {}, resumen = {} }) {
  return pedirApi(`/ensayos/${ensayoId}/mediciones`, {
    method: "POST",
    body: JSON.stringify({
      nombre,
      velocidad_objetivo: objetivos.velocidad,
      potencia_objetivo: objetivos.potencia,
      temperatura_objetivo: objetivos.temperatura,
      duracion_segundos: resumen.durSeg,
      velocidad_media: resumen.velocidadMedia,
      velocidad_maxima: resumen.velocidadMaxima,
      velocidad_minima: resumen.velocidadMinima,
      temperatura_media: resumen.temperaturaMedia,
      potencia_media: resumen.potenciaMedia,
    }),
  });
}

export async function guardarMuestrasApi({ medicionId, muestras }) {
  return pedirApi(`/mediciones/${medicionId}/muestras`, {
    method: "POST",
    body: JSON.stringify(muestras),
  });
}

export async function listarMuestrasMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}/muestras`);
}

export async function listarEventosMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}/eventos`);
}

export async function guardarEventoApi(evento) {
  return pedirApi("/eventos", {
    method: "POST",
    body: JSON.stringify(evento),
  });
}

export async function borrarMedicionApi(medicionId) {
  return pedirApi(`/mediciones/${medicionId}`, {
    method: "DELETE",
  });
}
