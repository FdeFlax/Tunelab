import { pedirApi } from "./clienteApi";

function enviarPost(ruta, datos) {
  return pedirApi(ruta, {
    method: "POST",
    body: JSON.stringify(datos || {}),
  });
}

export function verEstadoTunelApi() {
  return pedirApi("/tunel/estado");
}

export function aplicarConsignaTunelApi(potenciaPorcentaje) {
  return enviarPost("/tunel/consigna", {
    potencia_porcentaje: potenciaPorcentaje,
  });
}

export function encenderTunelApi(potenciaPorcentaje) {
  return enviarPost("/tunel/encender", {
    potencia_porcentaje: potenciaPorcentaje,
  });
}

export function apagarTunelApi() {
  return enviarPost("/tunel/apagar");
}

export function iniciarMedicionTunelApi() {
  return enviarPost("/tunel/medicion/iniciar");
}

export function detenerMedicionTunelApi() {
  return enviarPost("/tunel/medicion/detener");
}

export function leerMuestraTunelApi() {
  return pedirApi("/tunel/muestra");
}